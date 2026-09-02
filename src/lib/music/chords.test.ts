import { describe, it, expect } from "vitest";
import { note } from "./pitch";
import { majorScale } from "./scales";
import {
  triadOnScaleDegree,
  seventhOnScaleDegree,
  triadQuality,
  seventhQuality,
} from "./chords";

describe("chords — qualités déduites des demi-tons", () => {
  it("triades", () => {
    expect(triadQuality(4, 7)).toBe("maj");
    expect(triadQuality(3, 7)).toBe("min");
    expect(triadQuality(3, 6)).toBe("dim");
    expect(triadQuality(4, 8)).toBe("aug");
  });
  it("septièmes", () => {
    expect(seventhQuality(4, 7, 11)).toBe("maj7");
    expect(seventhQuality(4, 7, 10)).toBe("7");
    expect(seventhQuality(3, 7, 10)).toBe("min7");
    expect(seventhQuality(3, 6, 10)).toBe("m7b5");
    expect(seventhQuality(3, 6, 9)).toBe("dim7");
  });
});

describe("chords — construits sur la gamme de Do majeur", () => {
  const scale = majorScale(note("C"));
  it("triades I, ii, vii°", () => {
    expect(triadOnScaleDegree(scale, 0).symbol).toBe("C");
    expect(triadOnScaleDegree(scale, 1).symbol).toBe("Dm");
    expect(triadOnScaleDegree(scale, 6).symbol).toBe("B°");
  });
  it("septièmes I, V, vii", () => {
    expect(seventhOnScaleDegree(scale, 0).symbol).toBe("Cmaj7");
    expect(seventhOnScaleDegree(scale, 4).symbol).toBe("G7");
    expect(seventhOnScaleDegree(scale, 6).symbol).toBe("Bm7♭5");
  });
});
