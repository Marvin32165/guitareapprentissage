import { type Note, formatNote, pitchClass } from "./pitch";

// Accords construits en empilant des tierces DANS une gamme. La qualité se
// déduit des distances en demi-tons entre les notes (jamais codée en dur).

export type TriadQuality = "maj" | "min" | "dim" | "aug";
export type SeventhQuality =
  | "maj7"
  | "7"
  | "min7"
  | "m7b5"
  | "dim7"
  | "minMaj7"
  | "aug7"
  | "augMaj7";

export interface Triad {
  root: Note;
  notes: Note[]; // [fondamentale, tierce, quinte]
  quality: TriadQuality;
  symbol: string;
}

export interface SeventhChord {
  root: Note;
  notes: Note[]; // [fondamentale, tierce, quinte, septième]
  quality: SeventhQuality;
  symbol: string;
}

/** Demi-tons d'une note au-dessus de la fondamentale, dans l'octave. */
function semisAbove(root: Note, other: Note): number {
  return (((pitchClass(other) - pitchClass(root)) % 12) + 12) % 12;
}

export function triadQuality(third: number, fifth: number): TriadQuality {
  if (third === 4 && fifth === 7) return "maj";
  if (third === 3 && fifth === 7) return "min";
  if (third === 3 && fifth === 6) return "dim";
  if (third === 4 && fifth === 8) return "aug";
  throw new Error(`Triade inconnue (tierce ${third}, quinte ${fifth}).`);
}

export function seventhQuality(
  third: number,
  fifth: number,
  seventh: number,
): SeventhQuality {
  const key = `${third}-${fifth}-${seventh}`;
  const table: Record<string, SeventhQuality> = {
    "4-7-11": "maj7",
    "4-7-10": "7",
    "3-7-10": "min7",
    "3-6-10": "m7b5",
    "3-6-9": "dim7",
    "3-7-11": "minMaj7",
    "4-8-10": "aug7",
    "4-8-11": "augMaj7",
  };
  const q = table[key];
  if (!q) throw new Error(`Septième inconnue (${key}).`);
  return q;
}

export function triadSymbol(root: Note, quality: TriadQuality): string {
  const suffix = { maj: "", min: "m", dim: "°", aug: "+" }[quality];
  return formatNote(root) + suffix;
}

export function seventhSymbol(root: Note, quality: SeventhQuality): string {
  const suffix: Record<SeventhQuality, string> = {
    maj7: "maj7",
    "7": "7",
    min7: "m7",
    m7b5: "m7♭5",
    dim7: "°7",
    minMaj7: "mMaj7",
    aug7: "+7",
    augMaj7: "+maj7",
  };
  return formatNote(root) + suffix[quality];
}

/** Triade sur le i-ème degré d'une gamme (empilement de tierces diatoniques). */
export function triadOnScaleDegree(scale: Note[], degreeIndex: number): Triad {
  const n = scale.length;
  const root = scale[degreeIndex % n];
  const third = scale[(degreeIndex + 2) % n];
  const fifth = scale[(degreeIndex + 4) % n];
  const quality = triadQuality(semisAbove(root, third), semisAbove(root, fifth));
  return { root, notes: [root, third, fifth], quality, symbol: triadSymbol(root, quality) };
}

/** Accord de septième sur le i-ème degré d'une gamme. */
export function seventhOnScaleDegree(
  scale: Note[],
  degreeIndex: number,
): SeventhChord {
  const n = scale.length;
  const root = scale[degreeIndex % n];
  const third = scale[(degreeIndex + 2) % n];
  const fifth = scale[(degreeIndex + 4) % n];
  const seventh = scale[(degreeIndex + 6) % n];
  const quality = seventhQuality(
    semisAbove(root, third),
    semisAbove(root, fifth),
    semisAbove(root, seventh),
  );
  return {
    root,
    notes: [root, third, fifth, seventh],
    quality,
    symbol: seventhSymbol(root, quality),
  };
}
