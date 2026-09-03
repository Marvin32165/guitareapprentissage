import { describe, it, expect } from "vitest";
import { readingWindow, positionsForPitch, isCorrectAnswer } from "./reading";
import { TUNINGS, midiAtFret } from "@/lib/music/fretboard";

describe("fenêtre de lecture", () => {
  it("toute hauteur tirée est jouable dans la fenêtre affichée", () => {
    // Une question sans réponse possible serait un cul-de-sac silencieux.
    for (const toFret of [3, 5, 7, 12]) {
      const w = readingWindow({ toFret });
      expect(w.pitches.length).toBeGreaterThan(0);
      for (const pitch of w.pitches) {
        expect(positionsForPitch(w, pitch).length, `case ≤${toFret}, hauteur ${pitch}`)
          .toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("accepte toutes les positions qui donnent la hauteur, pas seulement une", () => {
    const w = readingWindow({ toFret: 5 });
    // Mi4 (MIDI 64) existe corde 1 case 0 et corde 2 case 5 dans cette fenêtre.
    const mi4 = positionsForPitch(w, 64);
    expect(mi4.length).toBeGreaterThan(1);
    for (const p of mi4) expect(isCorrectAnswer(p, 64)).toBe(true);
  });

  it("refuse une position qui donne une autre hauteur", () => {
    const w = readingWindow({ toFret: 5 });
    const autre = w.positions.find((p) => midiAtFret(p.stringIndex, p.fret) !== 64)!;
    expect(isCorrectAnswer(autre, 64)).toBe(false);
  });

  it("s'étend quand la fenêtre s'élargit", () => {
    const petite = readingWindow({ toFret: 3 }).pitches.length;
    const grande = readingWindow({ toFret: 12 }).pitches.length;
    expect(grande).toBeGreaterThan(petite);
  });

  it("suit l'accordage : en drop D la corde grave descend d'un ton", () => {
    const standard = readingWindow({ toFret: 5 }).pitches[0];
    const dropD = readingWindow({ toFret: 5, tuning: TUNINGS.dropD }).pitches[0];
    expect(standard - dropD).toBe(2);
  });
});
