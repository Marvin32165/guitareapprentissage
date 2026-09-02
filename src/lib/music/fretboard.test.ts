import { describe, it, expect } from "vitest";
import { note } from "./pitch";
import {
  pitchClassAtFret,
  scaleFretsOnString,
  pentatonicBoxes,
} from "./fretboard";
import { minorPentatonic } from "./scales";
import { pitchClass } from "./pitch";

describe("fretboard — hauteurs", () => {
  it("classe de hauteur à une frette", () => {
    expect(pitchClassAtFret(0, 0)).toBe(4); // 6e corde à vide = Mi
    expect(pitchClassAtFret(0, 5)).toBe(9); // 6e corde 5e frette = La
    expect(pitchClassAtFret(4, 0)).toBe(11); // 2e corde à vide = Si
  });

  it("frettes d'une gamme sur une corde", () => {
    const pcs = new Set(minorPentatonic(note("A")).map(pitchClass));
    // 6e corde (Mi) : Mi, Sol, La, Do, Ré, Mi… → 0,3,5,8,10,12
    expect(scaleFretsOnString(0, pcs, 12)).toEqual([0, 3, 5, 8, 10, 12]);
  });
});

describe("fretboard — boîte 1 pentatonique mineure de La", () => {
  it("frettes par corde (6e→1re)", () => {
    const boxes = pentatonicBoxes(note("A"), "minor");
    expect(boxes[0].fretsByString).toEqual([
      [5, 8],
      [5, 7],
      [5, 7],
      [5, 7],
      [5, 8],
      [5, 8],
    ]);
  });
  it("deux notes par corde et fondamentales bien repérées", () => {
    const box1 = pentatonicBoxes(note("A"), "minor")[0];
    expect(box1.positions).toHaveLength(12);
    const roots = box1.positions.filter((p) => p.isRoot);
    // La (frette 5) sur la 6e et la 1re corde
    expect(roots.some((p) => p.stringNumber === 6 && p.fret === 5)).toBe(true);
  });
});
