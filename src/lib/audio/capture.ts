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
  /** Échantillons captés depuis le démarrage, concaténés. */
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

/** Ouvre le micro et démarre la capture. À appeler depuis un geste utilisateur. */
export async function startCapture(): Promise<Capture> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new MicUnavailableError("Ce navigateur ne donne pas accès au micro.");
  }

  const Tone = await import("tone");
  await Tone.start();
  const ctx = Tone.getContext().rawContext as unknown as AudioContext;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
  } catch {
    throw new MicUnavailableError("Accès au micro refusé.");
  }

  try {
    await ctx.audioWorklet.addModule("/worklets/recorder.js");
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    throw new MicUnavailableError("L'enregistreur audio n'a pas pu être chargé.");
  }

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "recorder");

  const chunks: Float32Array[] = [];
  let total = 0;
  let t0 = 0;

  node.port.onmessage = (e: MessageEvent) => {
    const data = e.data as { type: string; samples?: Float32Array; time?: number };
    if (data.type === "start" && typeof data.time === "number") t0 = data.time;
    else if (data.type === "chunk" && data.samples) {
      chunks.push(data.samples);
      total += data.samples.length;
    }
  };

  source.connect(node);
  // Le worklet n'émet rien : on ne le branche pas sur la sortie, sinon on
  // renverrait le micro dans les haut-parleurs.
  node.port.postMessage("start");

  return {
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
