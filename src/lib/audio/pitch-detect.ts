// Détection de hauteur, monophonique.
//
// CE QUE ÇA FAIT, ET CE QUE ÇA NE FERA PAS
//
// Une note SEULE tenue se mesure de façon fiable : c'est un signal
// quasi-périodique, et l'autocorrélation normalisée le retrouve sans peine.
//
// Un ACCORD GRATTÉ, non. La transcription polyphonique demande bien autre chose
// qu'une autocorrélation sur un micro de téléphone, et prétendre le contraire
// produirait des résultats qui ont l'air de mesures. Rien ici ne tente de le
// faire, et la clarté rendue permet de refuser de répondre plutôt que de
// deviner.
//
// L'interpolation parabolique du pic n'est pas un raffinement : en lag entier,
// la résolution vaut ~32 cents à 830 Hz. Sans elle, un jeu juste paraît faux.

export interface PitchReading {
  hz: number;
  /** 0 à 1 : à quel point le signal est périodique. En dessous de ~0,9, on doute. */
  clarity: number;
  /** Niveau efficace, pour distinguer le silence d'une note. */
  rms: number;
}

/** En dessous, on considère qu'aucune note n'est jouée. */
export const SILENCE_RMS = 0.004;
/** En dessous, le signal n'est pas assez périodique pour être une note seule. */
export const MIN_CLARITY = 0.9;

/**
 * Part du pic maximal qu'un pic antérieur doit atteindre pour lui être préféré.
 * Plus bas, on risque de retenir un bruit ; plus haut, les sous-harmoniques
 * repassent.
 */
const PEAK_RATIO = 0.9;

/** Étendue utile d'une guitare, avec une marge : Mi1 à Do7. */
const F_MIN = 70;
const F_MAX = 1400;

/**
 * Autocorrélation normalisée (NSDF) avec interpolation parabolique du pic.
 * Rend null si le signal est trop faible pour qu'une mesure ait un sens.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  { fMin = F_MIN, fMax = F_MAX }: { fMin?: number; fMax?: number } = {},
): PitchReading | null {
  let energie = 0;
  for (let i = 0; i < samples.length; i++) energie += samples[i] * samples[i];
  const rms = Math.sqrt(energie / samples.length);
  if (rms < SILENCE_RMS) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / fMax));
  const tauMax = Math.min(Math.floor(samples.length / 2), Math.ceil(sampleRate / fMin));
  if (tauMax <= tauMin) return null;

  const r = new Float64Array(tauMax + 2);
  for (let tau = tauMin; tau <= tauMax + 1 && tau < samples.length; tau++) {
    let num = 0, a = 0, b = 0;
    for (let i = 0; i + tau < samples.length; i++) {
      num += samples[i] * samples[i + tau];
      a += samples[i] * samples[i];
      b += samples[i + tau] * samples[i + tau];
    }
    const den = Math.sqrt(a * b);
    r[tau] = den > 0 ? num / den : 0;
  }

  // Choix du pic à la McLeod. Prendre simplement le maximum de la corrélation
  // est FAUX : un signal de période T corrèle presque aussi bien avec 2T ou 3T,
  // et le maximum tombe souvent sur un de ces multiples. Mesuré avec un simple
  // maximum : un Si3 se lisait 1902 cents trop bas, soit un tiers de sa
  // fréquence. Sur un accordeur, une erreur d'octave est fatale.
  //
  // On retient donc, parmi les maxima locaux, le PREMIER qui approche le plus
  // haut — le plus petit retard, donc la plus haute fréquence, ce qui écarte
  // les sous-harmoniques.
  const sommets: number[] = [];
  for (let tau = tauMin + 1; tau < tauMax; tau++) {
    if (r[tau] > r[tau - 1] && r[tau] >= r[tau + 1]) sommets.push(tau);
  }
  if (sommets.length === 0) return null;

  const plusHaut = sommets.reduce((a, t) => (r[t] > r[a] ? t : a), sommets[0]);
  const seuil = r[plusHaut] * PEAK_RATIO;
  const best = sommets.find((t) => r[t] >= seuil) ?? plusHaut;

  const y0 = r[best - 1] ?? r[best];
  const y1 = r[best];
  const y2 = r[best + 1] ?? r[best];
  const den = y0 - 2 * y1 + y2;
  const delta = den !== 0 ? (0.5 * (y0 - y2)) / den : 0;

  return { hz: sampleRate / (best + delta), clarity: y1, rms };
}

/** Une lecture est-elle exploitable ? Dans le doute, non. */
export function isConfident(p: PitchReading | null): boolean {
  return p !== null && p.clarity >= MIN_CLARITY && p.rms >= SILENCE_RMS;
}

// ------------------------------------------------------- rapport à une note

const NAMES = ["Do", "Do♯", "Ré", "Ré♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];

export interface NoteReading {
  midi: number;
  name: string;
  /** Écart à la note tempérée la plus proche, en cents. */
  cents: number;
  hz: number;
}

export function hzToMidiFloat(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Note tempérée la plus proche, et l'écart qui l'en sépare. */
export function nearestNote(hz: number): NoteReading {
  const flottant = hzToMidiFloat(hz);
  const midi = Math.round(flottant);
  return {
    midi,
    name: `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`,
    cents: (flottant - midi) * 100,
    hz,
  };
}

/** Au-delà de cet écart, la note est fausse pour une oreille exercée. */
export const IN_TUNE_CENTS = 5;

export function isInTune(reading: NoteReading, tolerance = IN_TUNE_CENTS): boolean {
  return Math.abs(reading.cents) <= tolerance;
}
