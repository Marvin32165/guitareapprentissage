import { describe, it, expect } from "vitest";
import {
  QUALITES_DEGRE,
  accordDuDegre,
  decouperDegre,
  hauteursDuDegre,
  lireDegre,
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

describe("lireDegre est l'exact inverse de nomDegre", () => {
  it("retrouve rang, écart et qualité pour tous les degrés possibles", () => {
    for (const mode of ["major", "minor"] as const) {
      for (let d = 0; d < 12; d++) {
        for (const q of QUALITES_DEGRE) {
          const degre = nomDegre(mode, d, q);
          const lu = lireDegre(mode, degre);
          expect(lu, `illisible : ${degre} (${mode})`).not.toBeNull();
          expect(lu!.demiTons, degre).toBe(d);
          expect(lu!.qualite, degre).toBe(q);
          expect(lu!.rang, degre).toBeGreaterThanOrEqual(1);
          expect(lu!.rang, degre).toBeLessThanOrEqual(7);
        }
      }
    }
  });
});

describe("hauteursDuDegre", () => {
  it("part bien de la hauteur du degré, dans toutes les tonalités", () => {
    for (const mode of ["major", "minor"] as const) {
      for (let tonique = 0; tonique < 12; tonique++) {
        for (let d = 0; d < 12; d++) {
          for (const q of QUALITES_DEGRE) {
            const h = hauteursDuDegre(mode, nomDegre(mode, d, q), tonique)!;
            expect(h[0]).toBe((tonique + d) % 12);
          }
        }
      }
    }
  });

  it("donne les bonnes notes : I majeur en do = Do Mi Sol, ii7 = Ré Fa La Do", () => {
    expect(hauteursDuDegre("major", "I", 0)).toEqual([0, 4, 7]);
    expect(hauteursDuDegre("major", "ii7", 0)).toEqual([2, 5, 9, 0]);
    expect(hauteursDuDegre("major", "V7", 0)).toEqual([7, 11, 2, 5]);
    expect(hauteursDuDegre("major", "viiø7", 0)).toEqual([11, 2, 5, 9]);
  });

  it("l'accord entendu est celui qui est écrit", () => {
    // La fondamentale du symbole affiché et celle des hauteurs jouées ne
    // peuvent pas diverger : ce serait le pire défaut possible ici.
    for (const mode of ["major", "minor"] as const) {
      for (let tonique = 0; tonique < 12; tonique++) {
        for (let d = 0; d < 12; d++) {
          const degre = nomDegre(mode, d, "maj");
          const a = accordDuDegre(mode, degre, tonique);
          if (!a) continue;
          expect(pitchClass(a.note)).toBe(hauteursDuDegre(mode, degre, tonique)![0]);
        }
      }
    }
  });
});
