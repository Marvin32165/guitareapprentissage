import { describe, it, expect } from "vitest";
import { note, pitchClass, formatNote, parseNote, letterAt } from "./pitch";

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
