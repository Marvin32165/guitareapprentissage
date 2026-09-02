import { parseNote, pitchClass } from "@/lib/music/pitch";
import { transpose } from "@/lib/music/intervals";
import {
  majorScale,
  naturalMinorScale,
  majorPentatonic,
  minorPentatonic,
} from "@/lib/music/scales";
import {
  fretboardPositions,
  pentatonicBoxes,
  type FretPosition,
} from "@/lib/music/fretboard";
import type { FretboardSpec } from "@/content/lessons/types";

export interface ResolvedSpec {
  positions: FretPosition[];
  fromFret: number;
  toFret: number;
  rootPc: number;
}

/** Transforme une spec de leçon (données) en positions réelles sur le manche. */
export function resolveSpec(spec: FretboardSpec): ResolvedSpec {
  const root = parseNote(spec.root);
  const rootPc = pitchClass(root);

  let positions: FretPosition[];
  let fromFret = spec.fromFret ?? 0;
  let toFret = spec.toFret ?? 12;

  if (spec.kind === "box") {
    const boxes = pentatonicBoxes(root, spec.boxQuality ?? "minor");
    const box = boxes[Math.min(Math.max(spec.boxIndex ?? 1, 1), boxes.length) - 1];
    positions = box.positions;
    const frets = box.positions.map((p) => p.fret);
    fromFret = spec.fromFret ?? Math.max(0, Math.min(...frets) - 1);
    toFret = spec.toFret ?? Math.max(...frets) + 1;
  } else {
    const notes =
      spec.kind === "major"
        ? majorScale(root)
        : spec.kind === "naturalMinor"
          ? naturalMinorScale(root)
          : spec.kind === "pentaMajor"
            ? majorPentatonic(root)
            : spec.kind === "pentaMinor"
              ? minorPentatonic(root)
              : spec.kind === "chordMaj"
                ? [root, transpose(root, 2, 4), transpose(root, 4, 7)]
                : [root, transpose(root, 2, 3), transpose(root, 4, 7)];
    positions = fretboardPositions(notes, rootPc, { fromFret, toFret });
  }

  if (spec.onlyStringIndexes?.length) {
    const keep = new Set(spec.onlyStringIndexes);
    positions = positions.filter((p) => keep.has(p.stringIndex));
  }

  return { positions, fromFret, toFret, rootPc };
}
