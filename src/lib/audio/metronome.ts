// Métronome.
//
// Le piège : `setInterval` dérive. Son minutage dépend de la boucle
// d'événements du navigateur, qui se fait bousculer par le rendu, le ramasse-
// miettes ou un onglet en arrière-plan. Sur trois minutes, la dérive s'entend.
//
// La solution retenue est celle de « A Tale of Two Clocks » : un `setInterval`
// grossier ne sert QU'À planifier à l'avance des événements datés sur l'horloge
// de l'AudioContext, qui elle ne dérive pas. Le rythme réel ne dépend donc
// jamais du minutage de JavaScript.

export interface MetronomeSettings {
  bpm: number;
  /** Temps par mesure (4 = 4/4). Le premier est accentué. */
  beatsPerBar: number;
  /** Subdivisions par temps : 1 = noires, 2 = croches, 3 = triolets, 4 = doubles. */
  subdivision: number;
}

export const DEFAULTS: MetronomeSettings = { bpm: 90, beatsPerBar: 4, subdivision: 1 };
export const BPM_MIN = 30;
export const BPM_MAX = 300;

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return DEFAULTS.bpm;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

/** Durée d'une pulsation, en secondes. */
export function beatDuration(bpm: number): number {
  return 60 / clampBpm(bpm);
}

/** Durée entre deux clics, subdivisions comprises. */
export function tickDuration(s: MetronomeSettings): number {
  return beatDuration(s.bpm) / Math.max(1, s.subdivision);
}

export type TickKind = "accent" | "beat" | "subdivision";

/**
 * Nature du clic n° `index` depuis le départ. Trois sons distincts : le premier
 * temps de la mesure, les autres temps, et les subdivisions — sans quoi on ne
 * sait pas où l'on est dans la mesure.
 */
export function tickKind(index: number, s: MetronomeSettings): TickKind {
  const sub = Math.max(1, s.subdivision);
  if (index % sub !== 0) return "subdivision";
  const beat = (index / sub) % Math.max(1, s.beatsPerBar);
  return beat === 0 ? "accent" : "beat";
}

/** Position dans la mesure : temps (1-based) et subdivision (0-based). */
export function tickPosition(index: number, s: MetronomeSettings): { beat: number; sub: number } {
  const sub = Math.max(1, s.subdivision);
  return {
    beat: (Math.floor(index / sub) % Math.max(1, s.beatsPerBar)) + 1,
    sub: index % sub,
  };
}

/** Instant du clic n° `index`, depuis l'instant de départ. */
export function tickTime(index: number, startTime: number, s: MetronomeSettings): number {
  return startTime + index * tickDuration(s);
}

const FREQUENCIES: Record<TickKind, number> = {
  accent: 1600,
  beat: 1000,
  subdivision: 800,
};
const GAINS: Record<TickKind, number> = { accent: 0.5, beat: 0.32, subdivision: 0.16 };

/**
 * Clic synthétisé : une sinusoïde très courte avec une enveloppe raide. Aucun
 * échantillon à charger, donc aucune latence de premier démarrage — et le
 * métronome doit pouvoir partir instantanément.
 */
export function scheduleClick(
  ctx: BaseAudioContext,
  destination: AudioNode,
  at: number,
  kind: TickKind,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = FREQUENCIES[kind];
  osc.type = "square";
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(GAINS[kind], at + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(at);
  osc.stop(at + 0.06);
}

/** Fenêtre de planification : on prépare 100 ms d'avance, toutes les 25 ms. */
export const LOOKAHEAD_S = 0.1;
export const SCHEDULER_MS = 25;

export interface MetronomeHandle {
  stop: () => void;
  /** Réglages modifiables à chaud, sans couper le rythme. */
  update: (s: Partial<MetronomeSettings>) => void;
  settings: () => MetronomeSettings;
}

export interface StartOptions extends Partial<MetronomeSettings> {
  /**
   * Appelé à chaque clic PLANIFIÉ — donc en avance sur le son. `time` et `now`
   * sont tous deux sur l'horloge de l'AudioContext : leur différence donne le
   * délai à attendre avant de mettre l'affichage à jour. Comparer `time` à
   * `performance.now()` mélangerait deux horloges qui ne partent pas du même
   * zéro.
   */
  onTick?: (info: { index: number; kind: TickKind; time: number; now: number }) => void;
}

/** Démarre le métronome. À appeler depuis un geste utilisateur (iOS). */
export async function startMetronome(options: StartOptions = {}): Promise<MetronomeHandle> {
  const Tone = await import("tone");
  await Tone.start();
  const ctx = Tone.getContext().rawContext as unknown as BaseAudioContext;

  let settings: MetronomeSettings = {
    bpm: clampBpm(options.bpm ?? DEFAULTS.bpm),
    beatsPerBar: Math.max(1, options.beatsPerBar ?? DEFAULTS.beatsPerBar),
    subdivision: Math.max(1, options.subdivision ?? DEFAULTS.subdivision),
  };

  const out = ctx.createGain();
  out.gain.value = 1;
  out.connect(ctx.destination);

  let index = 0;
  // On repart d'un « instant zéro » mobile : changer le tempo en cours de route
  // ne doit pas décaler les clics déjà planifiés.
  let anchorTime = ctx.currentTime + 0.08;
  let anchorIndex = 0;

  const timer = setInterval(() => {
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    while (tickTime(index - anchorIndex, anchorTime, settings) < horizon) {
      const time = tickTime(index - anchorIndex, anchorTime, settings);
      const kind = tickKind(index, settings);
      scheduleClick(ctx, out, time, kind);
      options.onTick?.({ index, kind, time, now: ctx.currentTime });
      index += 1;
    }
  }, SCHEDULER_MS);

  return {
    stop() {
      clearInterval(timer);
      out.disconnect();
    },
    update(next) {
      // Nouvelle ancre au prochain clic non encore planifié : le changement de
      // tempo prend effet sans trou ni chevauchement.
      anchorTime = tickTime(index - anchorIndex, anchorTime, settings);
      anchorIndex = index;
      settings = {
        bpm: clampBpm(next.bpm ?? settings.bpm),
        beatsPerBar: Math.max(1, next.beatsPerBar ?? settings.beatsPerBar),
        subdivision: Math.max(1, next.subdivision ?? settings.subdivision),
      };
    },
    settings: () => ({ ...settings }),
  };
}

// ------------------------------------------------------------- tap tempo

/** Tempo déduit d'une série de frappes, ou null si la série est inexploitable. */
export function tempoFromTaps(times: number[]): number | null {
  if (times.length < 2) return null;
  const ecarts: number[] = [];
  for (let i = 1; i < times.length; i++) ecarts.push(times[i] - times[i - 1]);
  // On ne garde que les écarts plausibles : au-delà de 2 s, c'est une pause.
  const gardes = ecarts.filter((e) => e > 0.15 && e < 2);
  if (gardes.length === 0) return null;
  // Médiane plutôt que moyenne : une frappe ratée ne doit pas tout fausser.
  const tri = [...gardes].sort((a, b) => a - b);
  const mediane = tri[Math.floor(tri.length / 2)];
  return clampBpm(60 / mediane);
}
