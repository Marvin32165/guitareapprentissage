// Calibration de la latence aller-retour.
//
// POURQUOI C'EST UN PRÉREQUIS, PAS UNE OPTION
//
// Mesurer un placement rythmique contre un métronome suppose de savoir quand le
// clic a RÉELLEMENT atteint l'oreille, et quand le son de la guitare est
// RÉELLEMENT arrivé jusqu'ici. Entre les deux, il y a la mémoire tampon de
// sortie, le haut-parleur, l'air, le micro, et la mémoire tampon d'entrée.
// Le total va d'une vingtaine de millisecondes en filaire à trois cents en
// Bluetooth. À 120 bpm, une double croche dure 125 ms : une latence non
// mesurée peut donc déplacer une note d'un temps entier.
//
// Sans calibration, une métrique de placement rythmique n'est pas imprécise :
// elle est arbitraire. Elle ne doit donc pas être affichée avec un
// avertissement — elle ne doit pas être affichée du tout.
//
// MÉTHODE : boucle acoustique. L'application émet des clics par le
// haut-parleur et les réenregistre par le micro. L'écart entre l'instant
// planifié et l'instant réellement capté est la latence aller-retour complète.
// Aucune participation de l'utilisateur : on ne mesure pas son temps de
// réaction, on mesure la machine.

export interface LatencyMeasurement {
  /** Latence aller-retour, en millisecondes. */
  ms: number;
  /** Dispersion des mesures : au-delà de quelques ms, la mesure est douteuse. */
  spreadMs: number;
  /** Nombre de clics effectivement retrouvés. */
  hits: number;
  /** Nombre de clics émis. */
  emitted: number;
  measuredAt: string;
}

/** Au-delà de cette dispersion, on refuse la mesure plutôt que d'y croire. */
export const MAX_SPREAD_MS = 12;
/** En dessous de ce nombre de clics retrouvés, l'échantillon est trop maigre. */
export const MIN_HITS = 4;

/**
 * Détecte les attaques dans un signal : montées brutales d'énergie.
 *
 * On travaille sur l'enveloppe d'énergie à court terme plutôt que sur
 * l'amplitude brute : un clic capté par un micro de téléphone est bruité, et
 * un simple seuil sur l'échantillon déclencherait sur n'importe quel pic.
 */
export function detectOnsets(
  samples: Float32Array,
  sampleRate: number,
  { windowMs = 4, minGapMs = 60, factor = 4 }: {
    windowMs?: number;
    minGapMs?: number;
    factor?: number;
  } = {},
): number[] {
  const win = Math.max(4, Math.floor((windowMs / 1000) * sampleRate));
  const gap = Math.floor((minGapMs / 1000) * sampleRate);
  const n = Math.floor(samples.length / win);

  const energy = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = k * win; i < (k + 1) * win; i++) sum += samples[i] * samples[i];
    energy[k] = Math.sqrt(sum / win);
  }

  // Seuil relatif au bruit de fond : un plancher fixe ne survit pas au passage
  // d'un environnement calme à un environnement bruyant.
  const tri = [...energy].sort((a, b) => a - b);
  const fond = tri[Math.floor(tri.length * 0.5)] || 1e-6;
  const seuil = Math.max(fond * factor, 1e-4);

  const onsets: number[] = [];
  let dernier = -Infinity;
  for (let k = 1; k < n; k++) {
    const monte = energy[k] > seuil && energy[k] > energy[k - 1] * 1.8;
    const position = k * win;
    if (monte && position - dernier >= gap) {
      onsets.push(position);
      dernier = position;
    }
  }
  return onsets;
}

/**
 * Latence à partir des instants planifiés et des attaques captées.
 * Chaque clic émis est apparié à la première attaque qui le suit.
 */
export function estimateLatency(
  scheduledSec: number[],
  onsetSec: number[],
  { maxMs = 500 }: { maxMs?: number } = {},
): { ms: number; spreadMs: number; hits: number } | null {
  const ecarts: number[] = [];
  let curseur = 0;
  for (const emis of scheduledSec) {
    while (curseur < onsetSec.length && onsetSec[curseur] < emis) curseur++;
    if (curseur >= onsetSec.length) break;
    const delta = (onsetSec[curseur] - emis) * 1000;
    // Un écart absurde signale un clic manqué, pas une latence énorme.
    if (delta >= 0 && delta <= maxMs) ecarts.push(delta);
  }
  if (ecarts.length === 0) return null;

  const tri = [...ecarts].sort((a, b) => a - b);
  const mediane = tri[Math.floor(tri.length / 2)];
  // Dispersion robuste : écart médian absolu, insensible à une mesure isolée.
  const ecartsAbs = tri.map((e) => Math.abs(e - mediane)).sort((a, b) => a - b);
  const spread = ecartsAbs[Math.floor(ecartsAbs.length / 2)] * 2;
  return { ms: mediane, spreadMs: spread, hits: ecarts.length };
}

/** Une mesure est-elle exploitable ? Dans le doute, non. */
export function isUsable(m: { spreadMs: number; hits: number } | null): boolean {
  return m !== null && m.hits >= MIN_HITS && m.spreadMs <= MAX_SPREAD_MS;
}

// -------------------------------------------------------------- stockage

const KEY = "guitare.latence";

export function readLatency(): LatencyMeasurement | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LatencyMeasurement;
    return typeof v?.ms === "number" && Number.isFinite(v.ms) ? v : null;
  } catch {
    return null;
  }
}

export function storeLatency(m: LatencyMeasurement): void {
  try {
    localStorage?.setItem(KEY, JSON.stringify(m));
  } catch {
    /* stockage refusé : la mesure vaut pour la session en cours */
  }
  for (const notify of listeners) notify();
}

export function clearLatency(): void {
  try {
    localStorage?.removeItem(KEY);
  } catch {
    /* rien à faire */
  }
  for (const notify of listeners) notify();
}

const listeners = new Set<() => void>();

export function subscribeLatency(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function latencySnapshot(): string {
  const m = readLatency();
  // Une chaîne : la comparaison par valeur suffit à React.
  return m ? `${m.ms}|${m.spreadMs}|${m.measuredAt}` : "";
}

export function serverLatencySnapshot(): string {
  return "";
}
