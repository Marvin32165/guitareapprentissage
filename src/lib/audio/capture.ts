// Capture micro, alignée sur l'horloge de l'AudioContext.
//
// Les trois traitements que les navigateurs appliquent par défaut au micro
// doivent être COUPÉS ici :
//   - l'annulation d'écho supprimerait le son du haut-parleur, c'est-à-dire
//     exactement ce que la calibration cherche à réentendre ;
//   - le contrôle automatique de gain écraserait les écarts de niveau ;
//   - la réduction de bruit rognerait les attaques.
// Un micro « amélioré » est inutilisable pour mesurer quoi que ce soit.

export interface Capture {
  /**
   * Contexte audio NATIF de la capture. Exposé exprès : la calibration doit
   * émettre ses clics sur cette horloge-là, sinon la comparaison entre
   * l'instant planifié et l'instant capté n'a aucun sens.
   */
  context: AudioContext;
  /** Échantillons captés, concaténés. Limités par `maxSeconds` s'il est donné. */
  samples: () => Float32Array;
  /** Instant AudioContext du premier échantillon capté. */
  startTime: () => number;
  sampleRate: number;
  stop: () => void;
}

export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

export class MicUnavailableError extends Error {}

export interface CaptureOptions {
  /**
   * Ne garder que les dernières secondes captées. Indispensable pour une
   * analyse continue — un accordeur laissé ouvert dix minutes accumulerait
   * sinon des dizaines de mégaoctets pour ne jamais s'en servir.
   * Omis : tout est conservé (calibration, mesure ponctuelle).
   */
  maxSeconds?: number;
}

/**
 * Contexte natif dédié à la capture.
 *
 * PAS celui de Tone : `Tone.getContext().rawContext` n'est pas un
 * `BaseAudioContext` natif mais un enrobage `standardized-audio-context`, et
 * `new AudioWorkletNode(...)` le refuse — « parameter 1 is not of type
 * BaseAudioContext ». Le micro tombait en panne pour cette seule raison.
 *
 * Un contexte à part n'est pas un pis-aller : tout ce qui touche au micro
 * (capture ET clics de calibration) vit ainsi sur une horloge unique, ce qui
 * est exactement ce qu'exige la mesure de latence.
 */
let captureCtx: AudioContext | null = null;

function nativeContext(): AudioContext {
  if (!captureCtx || captureCtx.state === "closed") {
    captureCtx = new AudioContext();
  }
  return captureCtx;
}

/** Ouvre le micro et démarre la capture. À appeler depuis un geste utilisateur. */
export async function startCapture(options: CaptureOptions = {}): Promise<Capture> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new MicUnavailableError("Ce navigateur ne donne pas accès au micro.");
  }

  const ctx = nativeContext();
  // Le contexte démarre suspendu tant qu'aucun geste utilisateur n'a eu lieu.
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
  } catch {
    throw new MicUnavailableError("Accès au micro refusé.");
  }

  let node: AudioWorkletNode;
  let source: MediaStreamAudioSourceNode;
  try {
    await ctx.audioWorklet.addModule("/worklets/recorder.js");
    source = ctx.createMediaStreamSource(stream);
    node = new AudioWorkletNode(ctx, "recorder");
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    throw new MicUnavailableError(
      "L'enregistreur audio n'a pas pu démarrer sur cet appareil.",
    );
  }

  const chunks: Float32Array[] = [];
  let total = 0;
  let t0 = 0;

  const maxSamples = options.maxSeconds
    ? Math.ceil(options.maxSeconds * ctx.sampleRate)
    : Infinity;

  node.port.onmessage = (e: MessageEvent) => {
    const data = e.data as { type: string; samples?: Float32Array; time?: number };
    if (data.type === "start" && typeof data.time === "number") t0 = data.time;
    else if (data.type === "chunk" && data.samples) {
      chunks.push(data.samples);
      total += data.samples.length;
      // Fenêtre glissante : on jette les blocs devenus inutiles, et on avance
      // l'instant de départ en conséquence pour que l'alignement reste juste.
      while (total - chunks[0].length >= maxSamples) {
        const jete = chunks.shift()!;
        total -= jete.length;
        t0 += jete.length / ctx.sampleRate;
      }
    }
  };

  source.connect(node);
  // Le worklet n'émet rien : on ne le branche pas sur la sortie, sinon on
  // renverrait le micro dans les haut-parleurs.
  node.port.postMessage("start");

  return {
    context: ctx,
    samples() {
      const out = new Float32Array(total);
      let offset = 0;
      for (const c of chunks) {
        out.set(c, offset);
        offset += c.length;
      }
      return out;
    },
    startTime: () => t0,
    sampleRate: ctx.sampleRate,
    stop() {
      node.port.postMessage("stop");
      try {
        source.disconnect();
        node.disconnect();
      } catch {
        /* déjà déconnecté */
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
