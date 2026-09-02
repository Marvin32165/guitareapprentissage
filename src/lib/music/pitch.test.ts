import { describe, it, expect } from "vitest";
import {
  note,
  pitchClass,
  formatNote,
  parseNote,
  letterAt,
  formatNoteLatin,
  formatNoteIn,
  formatNoteBoth,
} from "./pitch";

describe("pitch", () => {
  it("calcule la classe de hauteur", () => {
    expect(pitchClass(note("C"))).toBe(0);
    expect(pitchClass(note("F", 1))).toBe(6); // F#
    expect(pitchClass(note("B", -1))).toBe(10); // Bb
    expect(pitchClass(note("B", 1))).toBe(0); // B# = C
    expect(pitchClass(note("C", -1))).toBe(11); // Cb = B
  });

  it("formate et parse (aller-retour)", () => {
    expect(formatNote(note("F", 1))).toBe("F#");
    expect(formatNote(note("B", -1))).toBe("Bb");
    expect(formatNote(note("G", 2))).toBe("G##");
    expect(parseNote("F#")).toEqual(note("F", 1));
    expect(parseNote("Bb")).toEqual(note("B", -1));
    expect(parseNote("C")).toEqual(note("C"));
  });

  it("boucle les lettres modulo 7", () => {
    expect(letterAt(0)).toBe("C");
    expect(letterAt(7)).toBe("C");
    expect(letterAt(-1)).toBe("B");
  });
});

describe("pitch — double nommage latin / anglo-saxon", () => {
  it("noms latins avec altérations", () => {
    expect(formatNoteLatin(note("C"))).toBe("Do");
    expect(formatNoteLatin(note("E"))).toBe("Mi");
    expect(formatNoteLatin(note("F", 1))).toBe("Fa#");
    expect(formatNoteLatin(note("B", -1))).toBe("Sib");
    expect(formatNoteLatin(note("G"))).toBe("Sol");
  });
  it("formatNoteIn choisit le système", () => {
    expect(formatNoteIn(note("D"), "latin")).toBe("Ré");
    expect(formatNoteIn(note("D"), "anglo")).toBe("D");
  });
  it("formatNoteBoth affiche les deux, principal d'abord", () => {
    expect(formatNoteBoth(note("E"), "anglo")).toBe("E (Mi)");
    expect(formatNoteBoth(note("E"), "latin")).toBe("Mi (E)");
  });
});
