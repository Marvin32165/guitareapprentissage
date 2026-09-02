import { describe, it, expect } from "vitest";
import { note } from "./pitch";
import {
  scaleNoteNames,
  MAJOR,
  NATURAL_MINOR,
  majorPentatonic,
  minorPentatonic,
  relativeMinorTonic,
  relativeMajorTonic,
} from "./scales";
import { formatNote } from "./pitch";

describe("scales — gammes majeures (orthographe par tonalité)", () => {
  it("Do majeur = notes naturelles", () => {
    expect(scaleNoteNames(note("C"), MAJOR)).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });
  it("Sol majeur a un Fa#", () => {
    expect(scaleNoteNames(note("G"), MAJOR)).toEqual(["G", "A", "B", "C", "D", "E", "F#"]);
  });
  it("Fa majeur a un Sib (pas La#)", () => {
    expect(scaleNoteNames(note("F"), MAJOR)).toEqual(["F", "G", "A", "Bb", "C", "D", "E"]);
  });
  it("Ré majeur : deux dièses", () => {
    expect(scaleNoteNames(note("D"), MAJOR)).toEqual(["D", "E", "F#", "G", "A", "B", "C#"]);
  });
});

describe("scales — mineure et pentatoniques", () => {
  it("La mineur naturelle = notes naturelles", () => {
    expect(scaleNoteNames(note("A"), NATURAL_MINOR)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]);
  });
  it("pentatonique majeure de Do", () => {
    expect(majorPentatonic(note("C")).map(formatNote)).toEqual(["C", "D", "E", "G", "A"]);
  });
  it("pentatonique mineure de La", () => {
    expect(minorPentatonic(note("A")).map(formatNote)).toEqual(["A", "C", "D", "E", "G"]);
  });
});

describe("scales — relatives", () => {
  it("relative mineure de Do = La ; relative majeure de La = Do", () => {
    expect(formatNote(relativeMinorTonic(note("C")))).toBe("A");
    expect(formatNote(relativeMajorTonic(note("A")))).toBe("C");
  });
});
