import { describe, it, expect } from "vitest";
import { note } from "./pitch";
import {
  pitchClassAtFret,
  scaleFretsOnString,
  pentatonicBoxes,
  midiAtFret,
  roleOfDegree,
  degreeName,
  fretboardPositions,
} from "./fretboard";
import { minorPentatonic, majorScale } from "./scales";
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

describe("fretboard — MIDI, rôles et degrés", () => {
  it("numéros MIDI", () => {
    expect(midiAtFret(0, 0)).toBe(40); // Mi2
    expect(midiAtFret(0, 5)).toBe(45); // La2 = 5e corde à vide
    expect(midiAtFret(5, 0)).toBe(64); // Mi4
  });
  it("rôle harmonique par degré", () => {
    expect(roleOfDegree(0)).toBe("root");
    expect(roleOfDegree(3)).toBe("third");
    expect(roleOfDegree(4)).toBe("third");
    expect(roleOfDegree(7)).toBe("fifth");
    expect(roleOfDegree(6)).toBe("fifth"); // quinte diminuée
    expect(roleOfDegree(10)).toBe("other");
  });
  it("libellés de degré", () => {
    expect(degreeName(0)).toBe("1");
    expect(degreeName(3)).toBe("♭3");
    expect(degreeName(7)).toBe("5");
    expect(degreeName(10)).toBe("♭7");
  });
});

describe("fretboard — positions d'une gamme", () => {
  it("Do majeur sur 0..12 : bon nombre de notes et fondamentales", () => {
    const scale = majorScale(note("C"));
    const pos = fretboardPositions(scale, pitchClass(note("C")), {
      fromFret: 0,
      toFret: 12,
    });
    // toutes les positions sont dans la gamme
    expect(pos.every((p) => scale.some((n) => pitchClass(n) === p.pc))).toBe(true);
    // Do (fondamentale) présent sur plusieurs cordes
    expect(pos.filter((p) => p.isRoot).length).toBeGreaterThanOrEqual(3);
  });
});
