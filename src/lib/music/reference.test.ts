import { describe, it, expect } from "vitest";
import { note, formatNote } from "./pitch";
import {
  harmonizeMajor,
  harmonizeNaturalMinor,
  harmonizeHarmonicMinor,
} from "./harmony";
import { modesOfMajor } from "./modes";
import { pentatonicBoxes } from "./fretboard";
import { MAJOR, buildScale, scaleNoteNames } from "./scales";

/**
 * TESTS DE RÉFÉRENCE — valeurs écrites en dur, tirées de la théorie musicale
 * établie (manuels d'harmonie et diagrammes de manche standard), et NON
 * produites par ce moteur. Si le moteur diverge de ces tables, c'est le
 * moteur qui a tort. C'est le garde-fou le plus important du projet :
 * un bug ici enseignerait de fausses informations.
 */

describe("référence — harmonisation de Do majeur", () => {
  const h = harmonizeMajor(note("C"));
  it("triades et chiffrage romain", () => {
    expect(h.map((x) => x.triad.symbol)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "B°"]);
    expect(h.map((x) => x.roman)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
  });
  it("accords de septième et chiffrage", () => {
    expect(h.map((x) => x.seventh.symbol)).toEqual([
      "Cmaj7",
      "Dm7",
      "Em7",
      "Fmaj7",
      "G7",
      "Am7",
      "Bm7♭5",
    ]);
    expect(h.map((x) => x.seventhRoman)).toEqual([
      "Imaj7",
      "ii7",
      "iii7",
      "IVmaj7",
      "V7",
      "vi7",
      "viiø7",
    ]);
  });
});

describe("référence — harmonisation de La mineur naturelle", () => {
  const h = harmonizeNaturalMinor(note("A"));
  it("triades et chiffrage : i ii° III iv v VI VII", () => {
    expect(h.map((x) => x.triad.symbol)).toEqual(["Am", "B°", "C", "Dm", "Em", "F", "G"]);
    expect(h.map((x) => x.roman)).toEqual(["i", "ii°", "III", "iv", "v", "VI", "VII"]);
  });
});

describe("référence — harmonisation de La mineur harmonique", () => {
  const h = harmonizeHarmonicMinor(note("A"));
  it("triades : le V devient majeur et le vii° diminué (G#°)", () => {
    expect(h.map((x) => x.triad.symbol)).toEqual([
      "Am",
      "B°",
      "C+",
      "Dm",
      "E",
      "F",
      "G#°",
    ]);
    expect(h.map((x) => x.roman)).toEqual(["i", "ii°", "III+", "iv", "V", "VI", "vii°"]);
  });
  it("le V est bien un accord de Mi majeur et le vii° un Sol# diminué", () => {
    expect(h[4].triad.notes.map(formatNote)).toEqual(["E", "G#", "B"]);
    expect(h[6].triad.notes.map(formatNote)).toEqual(["G#", "B", "D"]);
  });
});

describe("référence — cohérence orthographique (pas de double altération)", () => {
  it("Fa# majeur", () => {
    expect(scaleNoteNames(note("F", 1), MAJOR)).toEqual([
      "F#",
      "G#",
      "A#",
      "B",
      "C#",
      "D#",
      "E#",
    ]);
  });
  it("Solb majeur", () => {
    expect(scaleNoteNames(note("G", -1), MAJOR)).toEqual([
      "Gb",
      "Ab",
      "Bb",
      "Cb",
      "Db",
      "Eb",
      "F",
    ]);
  });
  it("aucune altération double dans Fa# ni Solb majeur", () => {
    for (const tonic of [note("F", 1), note("G", -1)]) {
      for (const n of buildScale(tonic, MAJOR)) {
        expect(Math.abs(n.accidental)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("référence — harmonisation de Sol majeur", () => {
  const h = harmonizeMajor(note("G"));
  it("triades et chiffrage romain", () => {
    expect(h.map((x) => x.triad.symbol)).toEqual(["G", "Am", "Bm", "C", "D", "Em", "F#°"]);
    expect(h.map((x) => x.roman)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
  });
  it("accords de septième", () => {
    expect(h.map((x) => x.seventh.symbol)).toEqual([
      "Gmaj7",
      "Am7",
      "Bm7",
      "Cmaj7",
      "D7",
      "Em7",
      "F#m7♭5",
    ]);
  });
});

describe("référence — 5 boîtes pentatoniques de La mineur", () => {
  // Diagramme standard (frettes [grave, aiguë] par corde, de la 6e à la 1re).
  const EXPECTED: [number, number][][] = [
    [
      [5, 8],
      [5, 7],
      [5, 7],
      [5, 7],
      [5, 8],
      [5, 8],
    ], // boîte 1 (fondamentale, 5e frette)
    [
      [8, 10],
      [7, 10],
      [7, 10],
      [7, 9],
      [8, 10],
      [8, 10],
    ], // boîte 2
    [
      [10, 12],
      [10, 12],
      [10, 12],
      [9, 12],
      [10, 13],
      [10, 12],
    ], // boîte 3
    [
      [12, 15],
      [12, 15],
      [12, 14],
      [12, 14],
      [13, 15],
      [12, 15],
    ], // boîte 4
    [
      [3, 5],
      [3, 5],
      [2, 5],
      [2, 5],
      [3, 5],
      [3, 5],
    ], // boîte 5 (sous la boîte 1)
  ];

  const boxes = pentatonicBoxes(note("A"), "minor");

  it("génère 5 boîtes", () => {
    expect(boxes).toHaveLength(5);
  });

  EXPECTED.forEach((frets, i) => {
    it(`boîte ${i + 1}`, () => {
      expect(boxes[i].fretsByString).toEqual(frets);
    });
  });
});

describe("référence — 7 modes de Do", () => {
  const modes = modesOfMajor(note("C"));
  const EXPECTED: Record<string, string[]> = {
    ionien: ["C", "D", "E", "F", "G", "A", "B"],
    dorien: ["D", "E", "F", "G", "A", "B", "C"],
    phrygien: ["E", "F", "G", "A", "B", "C", "D"],
    lydien: ["F", "G", "A", "B", "C", "D", "E"],
    mixolydien: ["G", "A", "B", "C", "D", "E", "F"],
    éolien: ["A", "B", "C", "D", "E", "F", "G"],
    locrien: ["B", "C", "D", "E", "F", "G", "A"],
  };

  for (const m of modes) {
    it(`mode ${m.name}`, () => {
      expect(m.notes.map(formatNote)).toEqual(EXPECTED[m.name]);
    });
  }
});
