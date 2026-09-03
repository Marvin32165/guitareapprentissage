import { describe, it, expect } from "vitest";
import {
  analyseRhythm,
  isInterpretable,
  biasIsMeaningful,
  MIN_SAMPLES,
} from "./rhythm";

/** Temps réguliers à un tempo donné. */
function beats(bpm: number, count: number, start = 1) {
  const p = 60 / bpm;
  return Array.from({ length: count }, (_, i) => start + i * p);
}

describe("analyse de placement", () => {
  it("un jeu parfait, latence comprise, donne un écart nul", () => {
    const b = beats(100, 16);
    const latencyMs = 120;
    // L'attaque est captée avec la latence : c'est ce que voit le micro.
    const onsets = b.map((t) => t + latencyMs / 1000);
    const a = analyseRhythm(onsets, b, { latencyMs });
    expect(a.detected).toBe(16);
    expect(a.medianOffsetMs).toBeCloseTo(0, 6);
    expect(a.spreadMs).toBeCloseTo(0, 6);
  });

  it("retrouve un biais systématique : jouer devant le temps", () => {
    const b = beats(100, 16);
    const latencyMs = 80;
    // 25 ms en avance sur chaque temps.
    const onsets = b.map((t) => t - 0.025 + latencyMs / 1000);
    const a = analyseRhythm(onsets, b, { latencyMs });
    expect(a.medianOffsetMs).toBeCloseTo(-25, 3);
  });

  it("sans correction de latence, le biais mesuré serait la latence elle-même", () => {
    // C'est exactement pourquoi la calibration est un prérequis.
    const b = beats(100, 16);
    const onsets = b.map((t) => t + 0.15);
    const sansCorrection = analyseRhythm(onsets, b, { latencyMs: 0 });
    expect(sansCorrection.medianOffsetMs).toBeCloseTo(150, 3);
    const avecCorrection = analyseRhythm(onsets, b, { latencyMs: 150 });
    expect(avecCorrection.medianOffsetMs).toBeCloseTo(0, 3);
  });

  it("sépare la régularité du placement", () => {
    const b = beats(100, 16);
    // Régulier mais en retard : biais fort, dispersion nulle.
    const enRetard = analyseRhythm(b.map((t) => t + 0.03), b, { latencyMs: 0 });
    expect(Math.abs(enRetard.medianOffsetMs)).toBeGreaterThan(25);
    expect(enRetard.spreadMs).toBeLessThan(2);

    // Centré mais irrégulier : biais faible, dispersion forte.
    const irregulier = analyseRhythm(
      b.map((t, i) => t + (i % 2 ? 0.04 : -0.04)),
      b,
      { latencyMs: 0 },
    );
    expect(Math.abs(irregulier.medianOffsetMs)).toBeLessThan(45);
    expect(irregulier.spreadMs).toBeGreaterThan(50);
  });

  it("ignore une attaque trop loin de tout temps", () => {
    const b = beats(100, 8);
    const p = 60 / 100;
    // Une attaque à mi-chemin entre deux temps n'est pas une tentative de jouer
    // sur le temps : la compter fausserait biais et dispersion.
    const a = analyseRhythm([b[0] + p * 0.5], b, { latencyMs: 0 });
    expect(a.detected).toBe(0);

    // Une double croche d'écart passe encore : c'est un placement, même mauvais.
    const limite = analyseRhythm([b[0] + p * 0.2], b, { latencyMs: 0 });
    expect(limite.detected).toBe(1);
  });

  it("ne retient pas les contretemps comme des temps très en retard", () => {
    // Jeu sur les contretemps : rien ne doit être rattaché, plutôt que de
    // rendre un biais énorme qui ferait croire à un problème de placement.
    const b = beats(100, 16);
    const p = 60 / 100;
    const a = analyseRhythm(b.map((t) => t + p / 2), b, { latencyMs: 0 });
    expect(a.detected).toBe(0);
    expect(isInterpretable(a)).toBe(false);
  });

  it("ne compte pas deux attaques sur le même temps", () => {
    // Un accord gratté produit plusieurs attaques rapprochées : elles ne
    // représentent qu'un seul placement.
    const b = beats(100, 8);
    const a = analyseRhythm([b[0], b[0] + 0.01, b[0] + 0.02], b, { latencyMs: 0 });
    expect(a.detected).toBeLessThanOrEqual(3);
    const surPremier = a.samples.filter((s) => s.expected === b[0]);
    expect(surPremier).toHaveLength(1);
  });

  it("refuse de conclure sur trop peu d'attaques", () => {
    const b = beats(100, 16);
    const a = analyseRhythm(b.slice(0, 3), b, { latencyMs: 0 });
    expect(a.detected).toBeLessThan(MIN_SAMPLES);
    expect(isInterpretable(a)).toBe(false);
  });

  it("un biais plus petit que l'incertitude n'est pas lisible", () => {
    // Calibration à ±10 ms : annoncer « tu joues 6 ms devant » serait du bruit
    // présenté comme une mesure.
    const b = beats(100, 16);
    const a = analyseRhythm(b.map((t) => t + 0.006), b, {
      latencyMs: 0,
      uncertaintyMs: 10,
    });
    expect(isInterpretable(a)).toBe(true);
    expect(biasIsMeaningful(a)).toBe(false);

    const net = analyseRhythm(b.map((t) => t + 0.04), b, {
      latencyMs: 0,
      uncertaintyMs: 10,
    });
    expect(biasIsMeaningful(net)).toBe(true);
  });
});
