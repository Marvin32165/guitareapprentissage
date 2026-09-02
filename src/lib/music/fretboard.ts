import { type Note, type Letter, pitchClass } from "./pitch";
import {
  type ScaleType,
  MINOR_PENTATONIC,
  MAJOR_PENTATONIC,
  buildScale,
} from "./scales";

// Manche de guitare. Les positions se DÉDUISENT des hauteurs réelles ; les
// « boîtes » pentatoniques sont générées par un algorithme (deux notes par
// corde, on relie de proche en proche), jamais lues dans une table de frettes.
//
// L'accordage n'est JAMAIS codé en dur dans la logique : c'est un paramètre
// (Tuning). Un décalage de capodastre (capo) élève toutes les cordes à vide.

/** Accordage : numéros MIDI des cordes à vide, de la 6e (grave) à la 1re. */
export interface Tuning {
  id: string;
  name: string;
  openMidi: number[];
}

export const TUNINGS: Record<string, Tuning> = {
  standard: { id: "standard", name: "Standard (Mi)", openMidi: [40, 45, 50, 55, 59, 64] },
  dropD: { id: "dropD", name: "Drop D", openMidi: [38, 45, 50, 55, 59, 64] },
  dadgad: { id: "dadgad", name: "DADGAD", openMidi: [38, 45, 50, 55, 57, 62] },
  openG: { id: "openG", name: "Open G", openMidi: [38, 43, 50, 55, 59, 62] },
  openD: { id: "openD", name: "Open D", openMidi: [38, 45, 50, 54, 57, 62] },
  ebStandard: { id: "ebStandard", name: "Mi♭ standard", openMidi: [39, 44, 49, 54, 58, 63] },
};

export const STANDARD: Tuning = TUNINGS.standard;

/** Numéro de corde (6 = grave) pour chaque index interne. */
export const STRING_NUMBERS: number[] = [6, 5, 4, 3, 2, 1];

const MAX_FRET = 24;

export function pitchClassAtFret(
  stringIndex: number,
  fret: number,
  tuning: Tuning = STANDARD,
  capo = 0,
): number {
  return (tuning.openMidi[stringIndex] + capo + fret) % 12;
}

export function midiAtFret(
  stringIndex: number,
  fret: number,
  tuning: Tuning = STANDARD,
  capo = 0,
): number {
  return tuning.openMidi[stringIndex] + capo + fret;
}

/** Frettes (0..maxFret) d'une corde où l'on trouve une des classes voulues. */
export function scaleFretsOnString(
  stringIndex: number,
  pcs: Set<number>,
  maxFret = MAX_FRET,
  tuning: Tuning = STANDARD,
  capo = 0,
): number[] {
  const frets: number[] = [];
  for (let f = 0; f <= maxFret; f++) {
    if (pcs.has(pitchClassAtFret(stringIndex, f, tuning, capo))) frets.push(f);
  }
  return frets;
}

// ── Orthographe par défaut d'une classe de hauteur (labels génériques) ──
const SHARP_SPELL: [Letter, number][] = [
  ["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0],
  ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0],
];
const FLAT_SPELL: [Letter, number][] = [
  ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
  ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
];

export function spellPitchClass(pc: number, preferFlats = false): Note {
  const [letter, accidental] = (preferFlats ? FLAT_SPELL : SHARP_SPELL)[((pc % 12) + 12) % 12];
  return { letter, accidental };
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

export type NoteRole = "root" | "third" | "fifth" | "other";

/** Rôle harmonique d'un degré (pour le code couleur du manche). */
export function roleOfDegree(semitones: number): NoteRole {
  const s = ((semitones % 12) + 12) % 12;
  if (s === 0) return "root";
  if (s === 3 || s === 4) return "third";
  if (s === 6 || s === 7 || s === 8) return "fifth";
  return "other";
}

const DEGREE_NAMES: Record<number, string> = {
  0: "1", 1: "♭2", 2: "2", 3: "♭3", 4: "3", 5: "4",
  6: "♭5", 7: "5", 8: "♭6", 9: "6", 10: "♭7", 11: "7",
};

/** Libellé de degré depuis les demi-tons depuis la fondamentale ("1","♭3"…). */
export function degreeName(semitones: number): string {
  return DEGREE_NAMES[((semitones % 12) + 12) % 12];
}

/**
 * Positions sur le manche d'un ensemble de notes (gamme, accord ou arpège),
 * dans une fenêtre de frettes. Source unique du composant Fretboard.
 */
export function fretboardPositions(
  notes: Note[],
  rootPc: number,
  {
    fromFret = 0,
    toFret = 15,
    tuning = STANDARD,
    capo = 0,
  }: { fromFret?: number; toFret?: number; tuning?: Tuning; capo?: number } = {},
): FretPosition[] {
  const noteByPc = new Map<number, Note>();
  for (const n of notes) noteByPc.set(pitchClass(n), n);
  const pcs = new Set(noteByPc.keys());

  const out: FretPosition[] = [];
  for (let s = 0; s < tuning.openMidi.length; s++) {
    for (let f = fromFret; f <= toFret; f++) {
      const pc = pitchClassAtFret(s, f, tuning, capo);
      if (!pcs.has(pc)) continue;
      out.push({
        stringIndex: s,
        stringNumber: STRING_NUMBERS[s],
        fret: f,
        pc,
        degreeSemitones: ((pc - rootPc) % 12 + 12) % 12,
        isRoot: pc === rootPc,
        note: noteByPc.get(pc)!,
      });
    }
  }
  return out;
}

// ── Capodastre : nom de forme vs nom réel ──

/** Transpose une note de N demi-tons (orthographe par défaut). */
export function transposeSemitones(n: Note, semitones: number, preferFlats = false): Note {
  return spellPitchClass(pitchClass(n) + semitones, preferFlats);
}

/**
 * Fondamentale réellement entendue quand on joue une forme d'accord avec capo.
 * Ex : forme de Mi (E) + capo 3 → sonne en Sol (G).
 */
export function capoSoundingRoot(shapeRoot: Note, capo: number, preferFlats = false): Note {
  return transposeSemitones(shapeRoot, capo, preferFlats);
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
 * Les formes canoniques supposent l'accordage standard (défaut).
 */
export function pentatonicBoxes(
  root: Note,
  quality: "minor" | "major",
  tuning: Tuning = STANDARD,
): PentatonicBox[] {
  const type: ScaleType = quality === "minor" ? MINOR_PENTATONIC : MAJOR_PENTATONIC;
  const scale = buildScale(root, type);
  const rootPc = pitchClass(root);
  const pcs = new Set(scale.map(pitchClass));
  const degreeOrder = type.degrees.map((deg) => deg.semitones);

  const noteByPc = new Map<number, Note>();
  for (const n of scale) noteByPc.set(pitchClass(n), n);

  const open6 = tuning.openMidi[0] % 12;
  const rootFret6 = ((rootPc - open6) % 12 + 12) % 12;
  const winLow = rootFret6 - 3;

  const fretsPerString = tuning.openMidi.map((_, s) => scaleFretsOnString(s, pcs, MAX_FRET, tuning));

  const boxes: PentatonicBox[] = [];

  degreeOrder.forEach((deg, boxIdx) => {
    let anchor = ((rootPc + deg - open6) % 12 + 12) % 12;
    while (anchor < winLow) anchor += 12;
    while (anchor >= winLow + 12) anchor -= 12;

    const frets6 = fretsPerString[0];
    const ai = frets6.indexOf(anchor);
    let prev: [number, number] = [frets6[ai], frets6[ai + 1]];

    const fretsByString: [number, number][] = [prev];
    for (let s = 1; s < tuning.openMidi.length; s++) {
      const pair = bestConsecutivePair(fretsPerString[s], prev);
      fretsByString.push(pair);
      prev = pair;
    }

    const positions: FretPosition[] = [];
    fretsByString.forEach(([lo, hi], s) => {
      for (const fret of [lo, hi]) {
        const pc = pitchClassAtFret(s, fret, tuning);
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
