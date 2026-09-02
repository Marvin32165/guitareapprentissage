import { type Note, pitchClass } from "./pitch";
import {
  type ScaleType,
  MINOR_PENTATONIC,
  MAJOR_PENTATONIC,
  buildScale,
} from "./scales";

// Manche de guitare. Les positions se DÉDUISENT des hauteurs réelles ; les
// « boîtes » pentatoniques sont générées par un algorithme (deux notes par
// corde, on relie de proche en proche), jamais lues dans une table de frettes.

// Accordage standard, de la corde grave (6e) à l'aiguë (1re) : Mi La Ré Sol Si Mi.
export const STANDARD_TUNING: number[] = [4, 9, 2, 7, 11, 4]; // classes de hauteur
// Numéro de corde (6 = grave) pour chaque index interne.
export const STRING_NUMBERS: number[] = [6, 5, 4, 3, 2, 1];

const MAX_FRET = 24;

export function pitchClassAtFret(stringIndex: number, fret: number): number {
  return (STANDARD_TUNING[stringIndex] + fret) % 12;
}

/** Frettes (0..maxFret) d'une corde où l'on trouve une des classes voulues. */
export function scaleFretsOnString(
  stringIndex: number,
  pcs: Set<number>,
  maxFret = MAX_FRET,
): number[] {
  const frets: number[] = [];
  for (let f = 0; f <= maxFret; f++) {
    if (pcs.has(pitchClassAtFret(stringIndex, f))) frets.push(f);
  }
  return frets;
}

export interface FretPosition {
  stringIndex: number; // 0 = 6e corde (grave)
  stringNumber: number; // 6..1
  fret: number;
  pc: number;
  degreeSemitones: number; // demi-tons depuis la fondamentale
  isRoot: boolean;
  note: Note;
}

export interface PentatonicBox {
  index: number; // 1..5
  anchorFret: number; // frette de départ sur la 6e corde
  /** Frettes [grave, aiguë] par corde, de la 6e à la 1re. */
  fretsByString: [number, number][];
  positions: FretPosition[];
}

function bestConsecutivePair(
  frets: number[],
  prev: [number, number],
): [number, number] {
  let best: [number, number] = [frets[0], frets[1]];
  let bestDist = Infinity;
  for (let i = 0; i + 1 < frets.length; i++) {
    const cand: [number, number] = [frets[i], frets[i + 1]];
    const dist = Math.abs(cand[0] - prev[0]) + Math.abs(cand[1] - prev[1]);
    if (dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  return best;
}

/**
 * Les 5 boîtes pentatoniques (majeure ou mineure) pour une fondamentale.
 * Boîte 1 ancrée sur la fondamentale ; les autres suivent l'ordre des degrés.
 */
export function pentatonicBoxes(
  root: Note,
  quality: "minor" | "major",
): PentatonicBox[] {
  const type: ScaleType = quality === "minor" ? MINOR_PENTATONIC : MAJOR_PENTATONIC;
  const scale = buildScale(root, type);
  const rootPc = pitchClass(root);
  const pcs = new Set(scale.map(pitchClass));
  const degreeOrder = type.degrees.map((deg) => deg.semitones); // [0,3,5,7,10]…

  // Nom orthographié par classe de hauteur (toutes les notes sont dans la gamme).
  const noteByPc = new Map<number, Note>();
  for (const n of scale) noteByPc.set(pitchClass(n), n);

  const open6 = STANDARD_TUNING[0];
  const rootFret6 = ((rootPc - open6) % 12 + 12) % 12;
  const winLow = rootFret6 - 3; // fenêtre de 12 frettes autour de la boîte 1

  const fretsPerString = STANDARD_TUNING.map((_, s) => scaleFretsOnString(s, pcs));

  const boxes: PentatonicBox[] = [];

  degreeOrder.forEach((deg, boxIdx) => {
    // Ancre sur la 6e corde, ramenée dans la fenêtre.
    let anchor = ((rootPc + deg - open6) % 12 + 12) % 12;
    while (anchor < winLow) anchor += 12;
    while (anchor >= winLow + 12) anchor -= 12;

    const frets6 = fretsPerString[0];
    const ai = frets6.indexOf(anchor);
    let prev: [number, number] = [frets6[ai], frets6[ai + 1]];

    const fretsByString: [number, number][] = [prev];
    for (let s = 1; s < STANDARD_TUNING.length; s++) {
      const pair = bestConsecutivePair(fretsPerString[s], prev);
      fretsByString.push(pair);
      prev = pair;
    }

    const positions: FretPosition[] = [];
    fretsByString.forEach(([lo, hi], s) => {
      for (const fret of [lo, hi]) {
        const pc = pitchClassAtFret(s, fret);
        positions.push({
          stringIndex: s,
          stringNumber: STRING_NUMBERS[s],
          fret,
          pc,
          degreeSemitones: ((pc - rootPc) % 12 + 12) % 12,
          isRoot: pc === rootPc,
          note: noteByPc.get(pc)!,
        });
      }
    });

    boxes.push({ index: boxIdx + 1, anchorFret: anchor, fretsByString, positions });
  });

  return boxes;
}
