// Logique du parcours de lecture, séparée du composant pour être vérifiable.
//
// Le point à ne pas rater : une même hauteur existe à plusieurs endroits du
// manche, et TOUTES ces positions sont de bonnes réponses. C'est même ce que
// l'exercice doit apprendre. Un tirage qui proposerait une hauteur injouable
// dans la fenêtre affichée poserait une question sans réponse.

import { midiAtFret, spellPitchClass, fretboardPositions, type FretPosition, type Tuning, TUNINGS } from "@/lib/music/fretboard";

export interface ReadingWindow {
  positions: FretPosition[];
  /** Hauteurs distinctes atteignables, triées : la réserve de questions. */
  pitches: number[];
}

/** Toutes les notes de la fenêtre de frettes, sans filtrage par gamme. */
export function readingWindow(
  { fromFret = 0, toFret = 5, tuning = TUNINGS.standard }: {
    fromFret?: number;
    toFret?: number;
    tuning?: Tuning;
  } = {},
): ReadingWindow {
  const chromatique = Array.from({ length: 12 }, (_, pc) => spellPitchClass(pc, false));
  const positions = fretboardPositions(chromatique, 0, { fromFret, toFret, tuning });
  const pitches = [
    ...new Set(positions.map((p) => midiAtFret(p.stringIndex, p.fret, tuning))),
  ].sort((a, b) => a - b);
  return { positions, pitches };
}

/** Positions qui donnent exactement cette hauteur — toutes acceptées. */
export function positionsForPitch(
  window: ReadingWindow,
  pitch: number,
  tuning: Tuning = TUNINGS.standard,
): FretPosition[] {
  return window.positions.filter(
    (p) => midiAtFret(p.stringIndex, p.fret, tuning) === pitch,
  );
}

/** Une réponse est juste si elle produit la hauteur demandée, où qu'elle soit. */
export function isCorrectAnswer(
  played: FretPosition,
  target: number,
  tuning: Tuning = TUNINGS.standard,
): boolean {
  return midiAtFret(played.stringIndex, played.fret, tuning) === target;
}
