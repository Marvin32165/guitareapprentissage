import { describe, it, expect } from "vitest";
import {
  clampBpm,
  beatDuration,
  tickDuration,
  tickKind,
  tickPosition,
  tickTime,
  tempoFromTaps,
  BPM_MIN,
  BPM_MAX,
  DEFAULTS,
} from "./metronome";

describe("tempo", () => {
  it("borne le tempo dans une plage jouable", () => {
    expect(clampBpm(10)).toBe(BPM_MIN);
    expect(clampBpm(9999)).toBe(BPM_MAX);
    expect(clampBpm(120.4)).toBe(120);
    expect(clampBpm(Number.NaN)).toBe(DEFAULTS.bpm);
  });

  it("120 bpm donne une noire d'une demi-seconde", () => {
    expect(beatDuration(120)).toBeCloseTo(0.5, 10);
    expect(beatDuration(60)).toBeCloseTo(1, 10);
  });

  it("les subdivisions divisent la pulsation", () => {
    expect(tickDuration({ bpm: 120, beatsPerBar: 4, subdivision: 1 })).toBeCloseTo(0.5);
    expect(tickDuration({ bpm: 120, beatsPerBar: 4, subdivision: 2 })).toBeCloseTo(0.25);
    expect(tickDuration({ bpm: 120, beatsPerBar: 4, subdivision: 3 })).toBeCloseTo(1 / 6, 6);
  });
});

describe("place des clics dans la mesure", () => {
  const quatreQuatre = { bpm: 100, beatsPerBar: 4, subdivision: 1 };

  it("accentue le premier temps de chaque mesure", () => {
    const kinds = Array.from({ length: 8 }, (_, i) => tickKind(i, quatreQuatre));
    expect(kinds).toEqual([
      "accent", "beat", "beat", "beat",
      "accent", "beat", "beat", "beat",
    ]);
  });

  it("distingue les subdivisions des temps", () => {
    const croches = { bpm: 100, beatsPerBar: 4, subdivision: 2 };
    const kinds = Array.from({ length: 8 }, (_, i) => tickKind(i, croches));
    expect(kinds).toEqual([
      "accent", "subdivision", "beat", "subdivision",
      "beat", "subdivision", "beat", "subdivision",
    ]);
  });

  it("annonce une position de mesure lisible", () => {
    const croches = { bpm: 100, beatsPerBar: 3, subdivision: 2 };
    expect(tickPosition(0, croches)).toEqual({ beat: 1, sub: 0 });
    expect(tickPosition(1, croches)).toEqual({ beat: 1, sub: 1 });
    expect(tickPosition(2, croches)).toEqual({ beat: 2, sub: 0 });
    expect(tickPosition(6, croches)).toEqual({ beat: 1, sub: 0 });
  });

  it("les instants sont régulièrement espacés, sans dérive cumulée", () => {
    const s = { bpm: 137, beatsPerBar: 4, subdivision: 3 };
    const pas = tickDuration(s);
    // Sur mille clics, l'écart au calcul exact doit rester nul : le temps est
    // recalculé depuis l'ancre, jamais accumulé.
    for (const i of [0, 1, 500, 999, 1000]) {
      expect(tickTime(i, 10, s)).toBeCloseTo(10 + i * pas, 9);
    }
  });
});

describe("tap tempo", () => {
  it("déduit le tempo de frappes régulières", () => {
    const t = [0, 0.5, 1.0, 1.5, 2.0];
    expect(tempoFromTaps(t)).toBe(120);
  });

  it("résiste à une frappe ratée grâce à la médiane", () => {
    // Une frappe en retard ne doit pas emporter tout le calcul.
    const t = [0, 0.5, 1.0, 1.9, 2.4, 2.9];
    expect(tempoFromTaps(t)).toBe(120);
  });

  it("ignore les pauses trop longues", () => {
    expect(tempoFromTaps([0, 5, 10])).toBeNull();
  });

  it("refuse de deviner sur une seule frappe", () => {
    expect(tempoFromTaps([])).toBeNull();
    expect(tempoFromTaps([1])).toBeNull();
  });

  it("reste dans la plage jouable même sur des frappes très rapides", () => {
    const rapide = Array.from({ length: 6 }, (_, i) => i * 0.16);
    const bpm = tempoFromTaps(rapide)!;
    expect(bpm).toBeLessThanOrEqual(BPM_MAX);
    expect(bpm).toBeGreaterThanOrEqual(BPM_MIN);
  });
});
