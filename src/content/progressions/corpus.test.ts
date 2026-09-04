import { describe, it, expect } from "vitest";
import * as donnees from "./donnees";
import { SOURCES, chargerCorpus, titrer, normaliser } from "./corpus";
import {
  accordDuDegre,
  accordsDeLaProgression,
  chercherMorceau,
  chercherParAccords,
  morceauxDeLaProgression,
  progressionsContenant,
  tailleCorpus,
} from "./recherche";
import { LESSONS } from "@/content/lessons";
import { QUALITES_DEGRE, lireAccord, nomDegre } from "@/lib/music/degres";

describe("données générées", () => {
  it("le vocabulaire de degrés est exactement celui que le moteur sait produire", () => {
    // Si le générateur et src/lib/music/degres.ts divergeaient, le corpus
    // parlerait une langue que l'app ne comprend plus — et rien ne le dirait.
    const produits = new Set<string>();
    for (const mode of ["major", "minor"] as const) {
      for (let d = 0; d < 12; d++) {
        for (const q of QUALITES_DEGRE) produits.add(nomDegre(mode, d, q));
      }
    }
    for (const degre of donnees.DEGRES.split(" ")) {
      expect(produits.has(degre), `degré inconnu du moteur : ${degre}`).toBe(true);
    }
  });

  it("chaque progression fait exactement quatre degrés", async () => {
    const c = await chargerCorpus();
    const vocabulaire = new Set(donnees.DEGRES.split(" "));
    for (const p of c.progressions) {
      expect(p.degres).toHaveLength(donnees.TAILLE_PROGRESSION);
      for (const d of p.degres) expect(vocabulaire.has(d)).toBe(true);
    }
  });

  it("l'index est cohérent : autant d'entrées que de progressions, aucun morceau hors bornes", async () => {
    const c = await chargerCorpus();
    expect(c.morceauxParProgression).toHaveLength(c.progressions.length);
    for (let i = 0; i < c.progressions.length; i++) {
      const ids = c.morceauxParProgression[i];
      expect(ids.length).toBeLessThanOrEqual(donnees.PLAFOND_MORCEAUX);
      expect(ids.length).toBeLessThanOrEqual(c.progressions[i].total);
      for (const id of ids) {
        expect(id).toBeGreaterThanOrEqual(0);
        expect(id).toBeLessThan(c.nbMorceaux);
      }
      // Écarts strictement croissants : une erreur de décodage se verrait ici.
      for (let k = 1; k < ids.length; k++) expect(ids[k]).toBeGreaterThan(ids[k - 1]);
    }
  });

  it("chaque morceau pointe vers une progression qui le contient", async () => {
    const c = await chargerCorpus();
    for (let id = 0; id < c.nbMorceaux; id += 37) {
      const m = c.morceau(id);
      expect(m.progression).toBeGreaterThanOrEqual(0);
      expect(m.progression).toBeLessThan(c.progressions.length);
      const p = c.progressions[m.progression];
      // Le morceau est dans la liste de sa progression, sauf si le plafond
      // l'a écarté (les listes sont triées, donc c'est vérifiable).
      const liste = c.morceauxParProgression[m.progression];
      const dedans = liste.includes(id);
      expect(dedans || liste.length === donnees.PLAFOND_MORCEAUX).toBe(true);
      expect(p.total).toBeGreaterThan(0);
    }
  });

  it("annonce un corpus de la taille attendue", async () => {
    const { morceaux, progressions } = await tailleCorpus();
    expect(morceaux).toBe(18599);
    expect(progressions).toBe(22614);
  });

  it("les cinq sources sont toutes représentées, et chacune se décode", async () => {
    const c = await chargerCorpus();
    const vus = new Map<string, number>();
    for (let id = 0; id < c.nbMorceaux; id++) {
      const m = c.morceau(id);
      vus.set(m.source, (vus.get(m.source) ?? 0) + 1);
      expect(m.titre.length, `titre vide (${m.source})`).toBeGreaterThan(0);
      // Seul Hooktheory publie une fiche : les autres ne doivent pas inventer
      // un lien qui n'existe pas.
      if (m.source === "H") expect(m.url).toMatch(/^https:\/\/www\.hooktheory\.com\//);
      else expect(m.url).toBeNull();
      expect(SOURCES[m.source].credit).toBe(m.credit);
    }
    expect([...vus.keys()].sort()).toEqual(["B", "H", "I", "R", "W"]);
    // Wikifonia crédite le compositeur : l'app ne doit pas l'annoncer comme
    // l'interprète.
    expect(SOURCES.W.credit).toBe("compositeur");
    expect(SOURCES.B.credit).toBe("interprète");
  });
});

describe("titrer", () => {
  it("rend lisible un identifiant Hooktheory", () => {
    expect(titrer("whataya-want-from-me")).toBe("Whataya Want From Me");
    expect(titrer("razors-in-your-apple-%28on-halloween%29")).toBe(
      "Razors In Your Apple (On Halloween)",
    );
  });

  it("ne prétend pas rendre une ponctuation perdue à la source", () => {
    // L'apostrophe n'existe plus dans l'identifiant : on n'invente pas.
    expect(titrer("when-youre-gone")).toBe("When Youre Gone");
  });
});

describe("normaliser", () => {
  it("efface accents et ponctuation pour que la recherche tombe juste", () => {
    expect(normaliser("Don't Stop Believin'")).toBe("don t stop believin");
    expect(normaliser("Éléphant")).toBe("elephant");
  });
});

describe("des degrés vers les accords", () => {
  it("I V vi IV en do majeur donne C G Am F", () => {
    const p = { id: 0, mode: "major" as const, degres: ["I", "V", "vi", "IV"], total: 0 };
    expect(accordsDeLaProgression(p, 0)).toEqual(["C", "G", "Am", "F"]);
    expect(accordsDeLaProgression(p, 0, "latin")).toEqual(["Do", "Sol", "Lam", "Fa"]);
  });

  it("orthographie le degré d'après son rang, pas d'après l'enharmonie", () => {
    // ♭III de do mineur = Mi♭, jamais Ré♯ : c'est un TROISIÈME degré.
    expect(accordDuDegre("minor", "III", 0)!.anglo).toBe("E♭");
    // ♭VII de do majeur = Si♭.
    expect(accordDuDegre("major", "♭VII", 0)!.anglo).toBe("B♭");
    // vii° de do majeur = B diminué.
    expect(accordDuDegre("major", "vii°", 0)!.anglo).toBe("B°");
  });

  it("aller-retour sur tout le corpus, dans les douze tonalités", { timeout: 120_000 }, async () => {
    // Le test le plus utile du lot : chaque progression du corpus est jouée en
    // accords réels, ces accords sont relus comme si je les avais tapés, puis
    // rechiffrés. Si le générateur, l'orthographe des notes ou le lecteur
    // d'accords divergeaient d'un cheveu, ça sauterait ici.
    const c = await chargerCorpus();
    let rendus = 0;
    for (const p of c.progressions) {
      for (let tonique = 0; tonique < 12; tonique++) {
        const accords = accordsDeLaProgression(p, tonique);
        expect(accords, `${p.mode} ${p.degres.join("-")} en ${tonique}`).not.toBeNull();
        rendus++;
        const relus = accords!.map((a) => lireAccord(a.replace(/♯/g, "#").replace(/♭/g, "b")));
        expect(relus.every(Boolean), `illisible : ${accords!.join(" ")}`).toBe(true);
        const rechiffres = relus.map((a) =>
          nomDegre(p.mode, a!.fondamentale - tonique, a!.qualite!),
        );
        expect(rechiffres, `${p.degres.join("-")} en ${tonique}`).toEqual(p.degres);
      }
    }
    expect(rendus).toBe(c.progressions.length * 12);
  });
});

describe("d'une progression vers les morceaux", () => {
  it("trouve I-V-vi-IV et les morceaux qui l'emploient", async () => {
    const r = await morceauxDeLaProgression("major", ["I", "V", "vi", "IV"]);
    expect(r).not.toBeNull();
    expect(r!.progression.total).toBeGreaterThan(300);
    expect(r!.morceaux.length).toBe(donnees.PLAFOND_MORCEAUX);
    expect(r!.tronque).toBe(true);
    for (const m of r!.morceaux) {
      if (m.url !== null) expect(m.url).toMatch(/^https:\/\/www\.hooktheory\.com\/theorytab\/view\//);
    }
  });

  it("rend null pour une progression que le corpus ne connaît pas", async () => {
    expect(await morceauxDeLaProgression("major", ["I", "I", "I", "I"])).toBeNull();
  });
});

describe("d'un titre vers sa progression", () => {
  it("retrouve un morceau saisi à la main", async () => {
    const r = await chercherMorceau("whataya want from me");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].morceau.titre).toBe("Whataya Want From Me");
    expect(r[0].progression.degres).toHaveLength(4);
  });

  it("tolère la ponctuation et la casse", async () => {
    const r = await chercherMorceau("When You're Gone");
    expect(r.some((t) => t.morceau.titre === "When Youre Gone")).toBe(true);
  });

  it("rend une liste vide plutôt qu'une invention", async () => {
    expect(await chercherMorceau("zzzz qqqq wwww")).toEqual([]);
  });
});

describe("ce que les leçons citent", () => {
  it("toute progression citée par une leçon existe vraiment dans le corpus", async () => {
    // Sans ce test, une leçon peut afficher « aucune progression ne
    // correspond » sans que rien ne casse : le pire des défauts, celui qui ne
    // se voit qu'en lisant la leçon.
    for (const lecon of LESSONS) {
      for (const bloc of lecon.blocks) {
        if (bloc.kind !== "corpus") continue;
        const ou = `${lecon.slug} : ${bloc.degres.join("-")}`;
        if (bloc.degres.length === 4) {
          expect(await morceauxDeLaProgression(bloc.mode, bloc.degres), ou).not.toBeNull();
        } else {
          const r = await progressionsContenant(bloc.mode, bloc.degres);
          expect(r.resultats.length, ou).toBeGreaterThan(0);
        }
        expect(bloc.degres.length, ou).toBeGreaterThanOrEqual(2);
        expect(bloc.degres.length, ou).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe("recherche inverse", () => {
  it("Do Sol La m Fa se lit I-V-vi-IV en do majeur", async () => {
    const { resultats, refuses } = await chercherParAccords("C G Am F");
    expect(refuses).toEqual([]);
    const premier = resultats[0];
    expect(premier.progression.degres).toEqual(["I", "V", "vi", "IV"]);
    expect(premier.tonalite).toBe("Do majeur (C)");
    expect(premier.morceaux.length).toBeGreaterThan(0);
  });

  it("donne aussi la lecture en mineur relatif, sans trancher à ma place", async () => {
    const { resultats } = await chercherParAccords("C G Am F");
    const mineur = resultats.filter((r) => r.progression.mode === "minor");
    expect(mineur.length).toBeGreaterThan(0);
    expect(mineur[0].tonalite).toContain("mineur");
  });

  it("cherche une suite de trois accords À L'INTÉRIEUR des progressions", async () => {
    const { resultats } = await chercherParAccords("Dm G C");
    expect(resultats.length).toBeGreaterThan(0);
    const p = resultats[0];
    const attendus = ["ii", "V", "I"];
    expect(p.progression.degres.slice(p.position, p.position + 3)).toEqual(attendus);
  });

  it("un accord de quinte ne décide pas du majeur ou du mineur", async () => {
    const { accords, resultats } = await chercherParAccords("E5 A5 B5 E5");
    expect(accords.every((a) => a.qualite === null)).toBe(true);
    expect(resultats.length).toBeGreaterThan(0);
  });

  it("ne rend rien pour un seul accord, plutôt que n'importe quoi", async () => {
    const { resultats } = await chercherParAccords("C");
    expect(resultats).toEqual([]);
  });

  it("signale les accords illisibles", async () => {
    const { refuses } = await chercherParAccords("C G Hm F");
    expect(refuses).toEqual(["Hm"]);
  });
});
