import { describe, it, expect } from "vitest";
import {
  GENERATORS,
  INTERVALS,
  QUALITIES,
  intervalQuestion,
  chordQualityQuestion,
  degreeQuestion,
  namingQuestion,
  type EarQuestion,
  seededRng,
  seedFrom,
} from "./questions";

// Un générateur aléatoire déterministe : on veut couvrir beaucoup de tirages,
// pas s'en remettre à la chance d'une exécution.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TIRAGES = 400;

function every(fn: (q: EarQuestion) => void) {
  for (const [, gen] of Object.entries(GENERATORS)) {
    for (const level of [1, 2, 3] as const) {
      const rng = seeded(level * 7919 + 13);
      for (let i = 0; i < TIRAGES / 4; i++) fn(gen(level, rng));
    }
  }
}

describe("questions d'oreille — invariants", () => {
  it("la bonne réponse figure toujours parmi les propositions", () => {
    // Sans ça, la question serait impossible et l'utilisateur croirait avoir
    // mal entendu.
    every((q) => {
      expect(q.options.map((o) => o.value), `${q.exercise}/${q.subtype}`).toContain(q.answer);
    });
  });

  it("les propositions sont distinctes et au nombre d'au moins deux", () => {
    every((q) => {
      const vals = q.options.map((o) => o.value);
      expect(new Set(vals).size, `${q.exercise} : doublon`).toBe(vals.length);
      expect(vals.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("il y a toujours quelque chose à jouer, dans une étendue audible", () => {
    every((q) => {
      expect(q.play.length, q.exercise).toBeGreaterThan(0);
      for (const g of q.play) {
        expect(g.midis.length).toBeGreaterThan(0);
        for (const m of g.midis) {
          // Étendue de la guitare, avec une marge : rien d'inaudible ni d'injouable.
          expect(m, `${q.exercise} : MIDI ${m} hors étendue`).toBeGreaterThanOrEqual(40);
          expect(m, `${q.exercise} : MIDI ${m} hors étendue`).toBeLessThanOrEqual(84);
        }
      }
    });
  });

  it("chaque question sait où s'ancrer sur le manche", () => {
    every((q) => {
      expect(q.anchorRoot, q.exercise).toMatch(/^[A-G][#b]?$/);
      expect(q.explain.length, q.exercise).toBeGreaterThan(10);
      // La consigne ne doit pas contenir la réponse.
      const bonne = q.options.find((o) => o.value === q.answer)!;
      if (q.exercise !== "naming") {
        expect(q.prompt.toLowerCase()).not.toContain(bonne.label.toLowerCase());
      }
    });
  });
});

describe("intervalles", () => {
  it("les deux notes jouées sont bien séparées de l'intervalle demandé", () => {
    // C'est LE point : si l'écart joué ne correspond pas à la réponse attendue,
    // l'exercice enseigne le contraire de ce qu'il prétend.
    const rng = seeded(4242);
    for (let i = 0; i < TIRAGES; i++) {
      const q = intervalQuestion(3, rng);
      const def = INTERVALS.find((d) => d.id === q.subtype)!;
      const [a, b] = [q.play[0].midis[0], q.play[1].midis[0]];
      expect(b - a, `${q.subtype}`).toBe(def.semitones);
    }
  });

  it("les niveaux ouvrent progressivement le répertoire", () => {
    const vus = (level: 1 | 2 | 3) => {
      const rng = seeded(99);
      const s = new Set<string>();
      for (let i = 0; i < 600; i++) s.add(intervalQuestion(level, rng).subtype);
      return s;
    };
    expect(vus(1).size).toBeLessThan(vus(2).size);
    expect(vus(2).size).toBeLessThan(vus(3).size);
    // Le niveau 1 ne contient que des intervalles francs.
    for (const id of vus(1)) {
      expect(INTERVALS.find((i) => i.id === id)!.level).toBe(1);
    }
  });
});

describe("qualités d'accord", () => {
  it("les notes jouées forment bien l'accord demandé", () => {
    const rng = seeded(777);
    for (let i = 0; i < TIRAGES; i++) {
      const q = chordQualityQuestion(3, rng);
      const def = QUALITIES.find((d) => d.id === q.subtype)!;
      const midis = q.play[0].midis;
      const base = midis[0];
      expect(midis.map((m) => m - base), q.subtype).toEqual(def.steps);
    }
  });

  it("l'ancrage suit la couleur de l'accord", () => {
    const rng = seeded(31);
    for (let i = 0; i < 200; i++) {
      const q = chordQualityQuestion(3, rng);
      const def = QUALITIES.find((d) => d.id === q.subtype)!;
      expect(q.anchorKind).toBe(def.steps[1] === 3 ? "chordMin" : "chordMaj");
    }
  });
});

describe("degrés", () => {
  it("la note visée appartient à la gamme majeure de la tonique jouée", () => {
    const MAJEURE = [0, 2, 4, 5, 7, 9, 11];
    const rng = seeded(2024);
    for (let i = 0; i < TIRAGES; i++) {
      const q = degreeQuestion(3, rng);
      const tonique = q.play[0].midis[0];
      const cible = q.play[1].midis[0];
      expect(MAJEURE, `degré ${q.subtype}`).toContain(cible - tonique);
      // Et le degré annoncé désigne bien cet écart.
      expect(MAJEURE[Number(q.subtype) - 1]).toBe(cible - tonique);
    }
  });

  it("le premier accord joué est bien la tonique majeure", () => {
    const rng = seeded(5);
    for (let i = 0; i < 200; i++) {
      const q = degreeQuestion(2, rng);
      const [a, b, c] = q.play[0].midis;
      expect([b - a, c - a]).toEqual([4, 7]);
    }
  });
});

describe("conversion latin / anglo", () => {
  it("la réponse correspond toujours à la note demandée", () => {
    const PAIRES: Record<string, string> = {
      Do: "C", Ré: "D", Mi: "E", Fa: "F", Sol: "G", La: "A", Si: "B",
    };
    const rng = seeded(64);
    for (let i = 0; i < TIRAGES; i++) {
      const q = namingQuestion(1, rng);
      const latin = Object.keys(PAIRES).find((l) => q.prompt.includes(`« ${l} »`));
      if (latin) {
        expect(q.answer, q.prompt).toBe(PAIRES[latin]);
      } else {
        const anglo = Object.values(PAIRES).find((a) => q.prompt.includes(`« ${a} »`))!;
        const attendu = Object.entries(PAIRES).find(([, a]) => a === anglo)![0];
        expect(q.answer, q.prompt).toBe(attendu);
      }
    }
  });
});

describe("première question d'une session", () => {
  it("est reproductible à graine égale", () => {
    // Le rendu serveur et le rendu client doivent tomber sur la même question,
    // sinon React signale une erreur d'hydratation (#418) et l'écran clignote.
    for (const ex of ["interval", "chord_quality", "degree", "naming"] as const) {
      for (const level of [1, 2, 3] as const) {
        const graine = seedFrom(`${ex}-${level}`);
        const a = GENERATORS[ex](level, seededRng(graine));
        const b = GENERATORS[ex](level, seededRng(graine));
        expect(a, `${ex}/${level}`).toEqual(b);
      }
    }
  });

  it("diffère d'un exercice ou d'un niveau à l'autre", () => {
    const graines = new Set(
      ["interval", "chord_quality", "degree", "naming"].flatMap((ex) =>
        [1, 2, 3].map((l) => seedFrom(`${ex}-${l}`)),
      ),
    );
    expect(graines.size).toBe(12);
  });
});
