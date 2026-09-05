import { describe, it, expect } from "vitest";
import { grilleOuverte, morceauxAApprendre } from "./suggestions";
import { chargerCorpus } from "./corpus";
import { OPEN_CHORDS } from "@/lib/music/chord-shapes";
import { accordsDesDegres, toniqueDe } from "@/lib/music/degres";
import { formatNote } from "@/lib/music/pitch";

const SYMBOLES = new Set(OPEN_CHORDS.map((f) => f.symbol));

describe("grilleOuverte", () => {
  it("I – V – vi – IV se joue ouvert en sol, pas en do", () => {
    // En do il faudrait un Fa barré ; en sol, c'est Sol Ré Mim Do.
    const p = { id: 0, mode: "major" as const, degres: ["I", "V", "vi", "IV"], total: 0 };
    const g = grilleOuverte(p);
    expect(g).not.toBeNull();
    expect(g!.tonique).toBe(7);
    expect(g!.formes.map((f) => f.symbole)).toEqual(["G", "D", "Em", "C"]);
  });

  it("rend null quand aucune tonalité n'évite le barré", () => {
    // Un accord diminué n'a pas de forme ouverte dans le jeu enseigné.
    const p = { id: 0, mode: "major" as const, degres: ["I", "vii°", "V", "I"], total: 0 };
    expect(grilleOuverte(p)).toBeNull();
  });

  it("les accords annoncés sont ceux que le chiffrage donne dans cette tonalité", () => {
    // Le pire défaut possible : proposer une grille qui n'est pas la
    // progression. On recalcule par l'autre chemin et on compare.
    const p = { id: 0, mode: "minor" as const, degres: ["i", "VII", "VI", "VII"], total: 0 };
    const g = grilleOuverte(p);
    expect(g).not.toBeNull();
    const attendus = accordsDesDegres(p.mode, p.degres, g!.tonique);
    expect(g!.formes.map((f) => f.symbole)).toEqual(attendus);
  });
});

describe("morceauxAApprendre", () => {
  it("ne propose que des grilles réellement jouables en accords ouverts", async () => {
    const suggestions = await morceauxAApprendre(60);
    expect(suggestions.length).toBe(60);
    for (const s of suggestions) {
      expect(s.accords).toHaveLength(4);
      for (const a of s.accords) {
        expect(SYMBOLES.has(a), `${a} n'est pas une forme ouverte enseignée`).toBe(true);
      }
      // Les accords proposés doivent être exactement le chiffrage transposé.
      expect(accordsDesDegres(s.progression.mode, s.progression.degres, s.grille.tonique)).toEqual(
        s.accords,
      );
      expect(s.morceau.artiste.length).toBeGreaterThan(0);
      expect(s.tonalite).toMatch(/(majeur|mineur)/);
    }
  });

  it("ne laisse pas un seul artiste occuper la liste", async () => {
    const suggestions = await morceauxAApprendre(60);
    const parArtiste = new Map<string, number>();
    for (const s of suggestions) {
      parArtiste.set(s.morceau.artiste, (parArtiste.get(s.morceau.artiste) ?? 0) + 1);
    }
    for (const [artiste, n] of parArtiste) expect(n, artiste).toBeLessThanOrEqual(2);
  });

  it("met devant les sources qui garantissent un morceau connu", async () => {
    const suggestions = await morceauxAApprendre(20);
    // Billboard ne liste que des succès classés, Isophonics que Beatles, Queen
    // et Carole King : ce sont les seules garanties dont on dispose.
    const sures = suggestions.filter((s) => s.morceau.source === "B" || s.morceau.source === "I");
    expect(sures.length).toBeGreaterThan(10);
  });

  it("chaque suggestion pointe vers une progression du corpus", async () => {
    const c = await chargerCorpus();
    for (const s of await morceauxAApprendre(30)) {
      expect(c.progressions[s.morceau.progression]).toBe(s.progression);
      expect(s.progression.total).toBeGreaterThan(0);
    }
  });
});

describe("la tonalité enregistrée au répertoire", () => {
  it("est la tonique, pas le premier accord de la grille", async () => {
    // « Don't Stop Me Now » commence sur un V7 : noter « A » pour un morceau
    // en ré majeur serait faux, et c'est ce champ que je relirai dans six mois.
    for (const s of await morceauxAApprendre(40)) {
      const attendu =
        formatNote(toniqueDe(s.grille.tonique, s.progression.mode)) +
        (s.progression.mode === "minor" ? "m" : "");
      expect(s.tonaliteCourte, `${s.morceau.titre}`).toBe(attendu);
      expect(s.tonaliteCourte.length).toBeLessThanOrEqual(12);
      expect(s.tonalite).toContain(formatNote(toniqueDe(s.grille.tonique, s.progression.mode)));
    }
  });
});
