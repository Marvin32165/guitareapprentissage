import { describe, it, expect } from "vitest";
import { note, formatNote } from "./pitch";
import { modesOfMajor, modeScale, MODE_NAMES } from "./modes";

describe("modes — comme déplacements de tonique", () => {
  it("les 7 modes de Do partagent les notes de Do majeur", () => {
    const modes = modesOfMajor(note("C"));
    expect(modes.map((m) => m.name)).toEqual([...MODE_NAMES]);
    expect(modes[0].notes.map(formatNote)).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(modes[1].tonic).toEqual(note("D"));
    expect(modes[1].notes.map(formatNote)).toEqual(["D", "E", "F", "G", "A", "B", "C"]);
  });

  it("un mode sur une tonique donnée suit sa propre formule", () => {
    // Ré dorien
    expect(modeScale(note("D"), 1).map(formatNote)).toEqual([
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
      "C",
    ]);
    // La éolien = La mineur naturelle
    expect(modeScale(note("A"), 5).map(formatNote)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]);
  });
});
