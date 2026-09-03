import { describe, it, expect } from "vitest";
import { PROGRESSIONS, getProgression, buildProgression, KEYS } from "./backing";
import { parseNote, pitchClass } from "@/lib/music/pitch";
import { majorScale, naturalMinorScale } from "@/lib/music/scales";

// Les grilles sont dérivées du moteur d'harmonie, pas saisies à la main. Ces
// tests vérifient que la dérivation tient dans les douze tonalités : un accord
// faux dans un accompagnement s'entend, mais on l'attribue d'abord à son propre
// jeu.

describe("progressions", () => {
  it("identifiants uniques et degrés valides", () => {
    const ids = PROGRESSIONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PROGRESSIONS) {
      expect(p.degrees.length).toBeGreaterThanOrEqual(3);
      for (const d of p.degrees) {
        expect(d, `${p.id} : degré ${d}`).toBeGreaterThanOrEqual(1);
        expect(d, `${p.id} : degré ${d}`).toBeLessThanOrEqual(7);
      }
    }
  });

  it("rejette une progression inconnue", () => {
    expect(() => getProgression("nope")).toThrow();
  });
});

describe("grille développée", () => {
  it("chaque accord appartient à la tonalité, dans toutes les tonalités proposées", () => {
    for (const key of KEYS) {
      for (const p of PROGRESSIONS) {
        const gamme = p.mode === "major" ? majorScale(parseNote(key)) : naturalMinorScale(parseNote(key));
        const pcs = new Set(gamme.map(pitchClass));
        for (const accord of buildProgression(p, key)) {
          for (const midi of accord.midis) {
            expect(pcs, `${key} ${p.id} ${accord.symbol}`).toContain(((midi % 12) + 12) % 12);
          }
          expect(pcs, `${key} ${p.id} basse`).toContain(((accord.bassMidi % 12) + 12) % 12);
        }
      }
    }
  });

  it("la basse est bien la fondamentale de l'accord", () => {
    for (const key of KEYS) {
      for (const p of PROGRESSIONS) {
        for (const accord of buildProgression(p, key)) {
          const fondamentale = accord.midis[0] % 12;
          expect(accord.bassMidi % 12, `${key} ${p.id} ${accord.symbol}`).toBe(fondamentale);
        }
      }
    }
  });

  it("le premier degré d'une grille en majeur donne bien l'accord de tonique", () => {
    const grille = buildProgression(getProgression("I-V-vi-IV"), "G");
    expect(grille[0].symbol).toBe("G");
    expect(grille[1].symbol).toBe("D");
    expect(grille[2].symbol).toBe("Em");
    expect(grille[3].symbol).toBe("C");
    expect(grille.map((c) => c.roman)).toEqual(["I", "V", "vi", "IV"]);
  });

  it("une grille mineure donne bien des degrés mineurs", () => {
    const grille = buildProgression(getProgression("i-iv-v"), "A");
    expect(grille.map((c) => c.symbol)).toEqual(["Am", "Dm", "Em", "Am"]);
    expect(grille.map((c) => c.roman)).toEqual(["i", "iv", "v", "i"]);
  });

  it("les voix montent, sans note doublée ni croisement", () => {
    for (const key of KEYS) {
      for (const p of PROGRESSIONS) {
        for (const accord of buildProgression(p, key)) {
          for (let i = 1; i < accord.midis.length; i++) {
            expect(accord.midis[i], `${key} ${p.id} ${accord.symbol}`)
              .toBeGreaterThan(accord.midis[i - 1]);
          }
          // La basse reste sous l'accord : sinon elle brouille le voicing.
          expect(accord.bassMidi).toBeLessThanOrEqual(accord.midis[0]);
        }
      }
    }
  });

  it("tout reste dans une étendue de guitare", () => {
    for (const key of KEYS) {
      for (const p of PROGRESSIONS) {
        for (const accord of buildProgression(p, key)) {
          expect(accord.bassMidi).toBeGreaterThanOrEqual(40);
          for (const m of accord.midis) {
            expect(m).toBeGreaterThanOrEqual(40);
            expect(m).toBeLessThanOrEqual(84);
          }
        }
      }
    }
  });
});
