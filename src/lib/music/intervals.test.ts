import { describe, it, expect } from "vitest";
import { note, formatNote } from "./pitch";
import {
  semitonesOf,
  transpose,
  transposeByInterval,
  intervalBetween,
} from "./intervals";

describe("intervals — tailles", () => {
  it("donne le bon nombre de demi-tons", () => {
    expect(semitonesOf({ number: 1, quality: "P" })).toBe(0);
    expect(semitonesOf({ number: 3, quality: "M" })).toBe(4);
    expect(semitonesOf({ number: 3, quality: "m" })).toBe(3);
    expect(semitonesOf({ number: 4, quality: "P" })).toBe(5);
    expect(semitonesOf({ number: 5, quality: "P" })).toBe(7);
    expect(semitonesOf({ number: 7, quality: "M" })).toBe(11);
    expect(semitonesOf({ number: 7, quality: "m" })).toBe(10);
    expect(semitonesOf({ number: 8, quality: "P" })).toBe(12);
    expect(semitonesOf({ number: 4, quality: "A" })).toBe(6); // triton
    expect(semitonesOf({ number: 5, quality: "d" })).toBe(6);
  });
});

describe("intervals — transposition (orthographe)", () => {
  it("respecte les lettres", () => {
    expect(formatNote(transpose(note("C"), 2, 4))).toBe("E"); // tierce M
    expect(formatNote(transpose(note("C"), 2, 3))).toBe("Eb"); // tierce m
    expect(formatNote(transpose(note("C"), 4, 7))).toBe("G"); // quinte
    expect(formatNote(transpose(note("E"), 2, 3))).toBe("G"); // E + m3
    expect(formatNote(transpose(note("B"), 4, 7))).toBe("F#"); // B + P5
    expect(formatNote(transpose(note("F"), 4, 7))).toBe("C"); // F + P5
  });

  it("transpose par intervalle, montant et descendant", () => {
    expect(formatNote(transposeByInterval(note("C"), { number: 5, quality: "P" }))).toBe(
      "G",
    );
    expect(
      formatNote(transposeByInterval(note("C"), { number: 5, quality: "P" }, "down")),
    ).toBe("F");
  });
});

describe("intervals — reconnaissance", () => {
  it("identifie l'intervalle entre deux notes", () => {
    expect(intervalBetween(note("C"), note("E"))).toEqual({ number: 3, quality: "M" });
    expect(intervalBetween(note("C"), note("E", -1))).toEqual({ number: 3, quality: "m" });
    expect(intervalBetween(note("C"), note("G"))).toEqual({ number: 5, quality: "P" });
    expect(intervalBetween(note("C"), note("G", -1))).toEqual({ number: 5, quality: "d" });
    expect(intervalBetween(note("C"), note("F"))).toEqual({ number: 4, quality: "P" });
    expect(intervalBetween(note("C"), note("F", 1))).toEqual({ number: 4, quality: "A" });
  });
});
