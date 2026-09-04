import { describe, it, expect } from "vitest";
import {
  QUALITES_DEGRE,
  decouperDegre,
  lireAccord,
  lireSuiteAccords,
  nomDegre,
  nomTonalite,
  toniqueDe,
} from "./degres";
import { pitchClass } from "./pitch";

describe("lireAccord", () => {
  const cas: [string, number, string | null][] = [
    ["C", 0, "maj"],
    ["Am", 9, "min"],
    ["am", 9, "min"],
    ["F#m7", 6, "min7"],
    ["Bbmaj7", 10, "maj7"],
    ["G7", 7, "dom7"],
    ["Dsus4", 2, "sus4"],
    ["Asus2", 9, "sus2"],
    ["Bm7b5", 11, "demiDim7"],
    ["Bdim", 11, "dim"],
    ["C°7", 0, "dim7"],
    ["E+", 4, "aug"],
    ["C/G", 0, "maj"],
    ["Cadd9", 0, "maj"],
    ["C9", 0, "dom7"],
    ["Cm9", 0, "min7"],
    ["E5", 4, null],
  ];
  for (const [saisi, fondamentale, qualite] of cas) {
    it(`lit ${saisi}`, () => {
      const a = lireAccord(saisi);
      expect(a).not.toBeNull();
      expect(a!.fondamentale).toBe(fondamentale);
      expect(a!.qualite).toBe(qualite);
    });
  }

  it("refuse ce qui n'est pas un accord", () => {
    expect(lireAccord("Hm")).toBeNull();
    expect(lireAccord("")).toBeNull();
    expect(lireAccord("Cm7b9")).toBeNull();
  });

  it("garde l'orthographe saisie : Si♭ n'est pas La♯", () => {
    expect(lireAccord("Bb")!.note).toEqual({ letter: "B", accidental: -1 });
    expect(lireAccord("A#")!.note).toEqual({ letter: "A", accidental: 1 });
  });
});

describe("lireSuiteAccords", () => {
  it("accepte espaces, virgules et tirets", () => {
    for (const saisi of ["C G Am F", "C, G, Am, F", "C-G-Am-F", "C – G – Am – F"]) {
      const { accords, refuses } = lireSuiteAccords(saisi);
      expect(refuses).toEqual([]);
      expect(accords.map((a) => a.fondamentale)).toEqual([0, 7, 9, 5]);
    }
  });

  it("ne coupe pas un accord dont le tiret fait partie du chiffrage", () => {
    const { accords } = lireSuiteAccords("C-7 F-7");
    expect(accords.map((a) => a.qualite)).toEqual(["min7", "min7"]);
  });

  it("ne coupe pas un renversement", () => {
    const { accords } = lireSuiteAccords("C/G G");
    expect(accords.map((a) => a.fondamentale)).toEqual([0, 7]);
  });

  it("fusionne les répétitions consécutives, comme le corpus", () => {
    const { accords } = lireSuiteAccords("C C G G Am Am F F");
    expect(accords.map((a) => a.fondamentale)).toEqual([0, 7, 9, 5]);
  });

  it("signale ce qu'il n'a pas su lire, sans casser le reste", () => {
    const { accords, refuses } = lireSuiteAccords("C Zzz G");
    expect(accords.map((a) => a.fondamentale)).toEqual([0, 7]);
    expect(refuses).toEqual(["Zzz"]);
  });
});

describe("nomDegre", () => {
  it("chiffre la gamme majeure comme le moteur d'harmonie", () => {
    // Degrés de Do majeur : I ii iii IV V vi vii°
    const attendu = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
    const qualites = ["maj", "min", "min", "maj", "maj", "min", "dim"] as const;
    const demiTons = [0, 2, 4, 5, 7, 9, 11];
    expect(demiTons.map((d, i) => nomDegre("major", d, qualites[i]))).toEqual(attendu);
  });

  it("chiffre le mineur naturel sans bémols parasites", () => {
    // i ii° III iv v VI VII — les degrés de la gamme n'ont pas d'altération.
    const qualites = ["min", "dim", "maj", "min", "min", "maj", "maj"] as const;
    const demiTons = [0, 2, 3, 5, 7, 8, 10];
    expect(demiTons.map((d, i) => nomDegre("minor", d, qualites[i]))).toEqual([
      "i", "ii°", "III", "iv", "v", "VI", "VII",
    ]);
  });

  it("nomme les emprunts avec l'altération d'usage du mode", () => {
    expect(nomDegre("major", 10, "maj")).toBe("♭VII");
    expect(nomDegre("major", 8, "maj")).toBe("♭VI");
    expect(nomDegre("minor", 11, "maj")).toBe("♯VII");
    expect(nomDegre("minor", 1, "maj")).toBe("♭II");
  });

  it("descend l'octave sans changer de degré", () => {
    expect(nomDegre("major", -5, "maj")).toBe(nomDegre("major", 7, "maj"));
  });
});

describe("decouperDegre", () => {
  it("sépare le chiffre du suffixe", () => {
    expect(decouperDegre("viiø7")).toEqual({ romain: "vii", suffixe: "ø7" });
    expect(decouperDegre("♭VII")).toEqual({ romain: "♭VII", suffixe: "" });
    expect(decouperDegre("Imaj7")).toEqual({ romain: "I", suffixe: "maj7" });
  });

  it("recompose tous les degrés que nomDegre sait produire", () => {
    for (const mode of ["major", "minor"] as const) {
      for (let d = 0; d < 12; d++) {
        for (const q of QUALITES_DEGRE) {
          const degre = nomDegre(mode, d, q);
          const { romain, suffixe } = decouperDegre(degre);
          expect(romain + suffixe).toBe(degre);
        }
      }
    }
  });
});

describe("tonalités", () => {
  it("choisit l'orthographe de l'armure", () => {
    expect(nomTonalite(1, "major")).toBe("Réb majeur (Db)");
    expect(nomTonalite(1, "minor")).toBe("Do# mineur (C#)");
    expect(nomTonalite(0, "major")).toBe("Do majeur (C)");
    expect(nomTonalite(9, "minor")).toBe("La mineur (A)");
  });

  it("la tonique retombe bien sur la hauteur demandée, dans les deux modes", () => {
    for (const mode of ["major", "minor"] as const) {
      for (let pc = 0; pc < 12; pc++) {
        expect(pitchClass(toniqueDe(pc, mode))).toBe(pc);
      }
    }
  });
});
