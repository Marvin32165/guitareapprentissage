import { describe, it, expect } from "vitest";
import {
  review,
  nextEase,
  nextDueDate,
  dueToday,
  qualityFromAnswer,
  initialItem,
  INITIAL,
  MIN_EASE,
  type ReviewState,
  type Quality,
} from "./sm2";

// Les valeurs de référence viennent de la description publiée de SM-2, pas de
// cette implémentation : sinon on ne testerait que sa cohérence avec elle-même.

describe("facteur de facilité", () => {
  it("suit la formule publiée", () => {
    // EF' = EF + (0,1 − (5−q)(0,08 + (5−q)·0,02))
    expect(nextEase(2.5, 5)).toBeCloseTo(2.6, 4);
    expect(nextEase(2.5, 4)).toBeCloseTo(2.5, 4);
    expect(nextEase(2.5, 3)).toBeCloseTo(2.36, 4);
    expect(nextEase(2.5, 2)).toBeCloseTo(2.18, 4);
    expect(nextEase(2.5, 0)).toBeCloseTo(1.7, 4);
  });

  it("ne descend jamais sous le plancher de 1,3", () => {
    let ease = 2.5;
    for (let i = 0; i < 20; i++) ease = nextEase(ease, 0);
    expect(ease).toBe(MIN_EASE);
  });

  it("une réponse parfaite fait monter le facteur, une mauvaise le fait baisser", () => {
    expect(nextEase(2.5, 5)).toBeGreaterThan(2.5);
    expect(nextEase(2.5, 2)).toBeLessThan(2.5);
  });
});

describe("intervalles", () => {
  it("suit la progression 1 jour, 6 jours, puis multiplication", () => {
    let s: ReviewState = { ...INITIAL };
    s = review(s, 4);
    expect(s.intervalDays).toBe(1);
    expect(s.repetitions).toBe(1);
    s = review(s, 4);
    expect(s.intervalDays).toBe(6);
    expect(s.repetitions).toBe(2);
    s = review(s, 4);
    // 6 × 2,5 = 15
    expect(s.intervalDays).toBe(15);
    s = review(s, 4);
    // 15 × 2,5 = 37,5 -> 38
    expect(s.intervalDays).toBe(38);
  });

  it("un échec ramène la révision au lendemain, pas seulement en arrière", () => {
    let s: ReviewState = { ...INITIAL };
    for (let i = 0; i < 5; i++) s = review(s, 5);
    expect(s.intervalDays).toBeGreaterThan(30);
    s = review(s, 1);
    expect(s.intervalDays).toBe(1);
    expect(s.repetitions).toBe(0);
  });

  it("un échec conserve la difficulté acquise plutôt que de tout réinitialiser", () => {
    // Le facteur de facilité doit rester bas : la notion était déjà difficile.
    let s: ReviewState = { ...INITIAL };
    s = review(s, 2);
    s = review(s, 2);
    expect(s.easeFactor).toBeLessThan(INITIAL.easeFactor);
    const avant = s.easeFactor;
    s = review(s, 4);
    expect(s.easeFactor).toBeCloseTo(avant, 4);
  });

  it("une notion facile s'espace plus vite qu'une notion difficile", () => {
    let facile: ReviewState = { ...INITIAL };
    let dure: ReviewState = { ...INITIAL };
    for (let i = 0; i < 5; i++) {
      facile = review(facile, 5);
      dure = review(dure, 3);
    }
    expect(facile.intervalDays).toBeGreaterThan(dure.intervalDays * 2);
  });

  it("les intervalles restent des entiers de jours", () => {
    let s: ReviewState = { ...INITIAL };
    for (const q of [4, 5, 3, 4, 5, 4] as Quality[]) {
      s = review(s, q);
      expect(Number.isInteger(s.intervalDays)).toBe(true);
    }
  });
});

describe("échéances", () => {
  const jour = 24 * 60 * 60 * 1000;

  it("place la prochaine révision à l'intervalle calculé", () => {
    const depart = new Date("2026-01-01T10:00:00Z");
    const s = review({ ...INITIAL }, 4);
    const due = nextDueDate(s, depart);
    expect(due.getTime() - depart.getTime()).toBe(jour);
  });

  it("ne retient que les notions échues, les plus en retard d'abord", () => {
    const now = new Date("2026-03-10T08:00:00Z");
    const items = [
      { conceptId: "b", dueDate: new Date("2026-03-09T08:00:00Z"), state: INITIAL },
      { conceptId: "a", dueDate: new Date("2026-02-20T08:00:00Z"), state: INITIAL },
      { conceptId: "futur", dueDate: new Date("2026-03-20T08:00:00Z"), state: INITIAL },
    ];
    expect(dueToday(items, now).map((i) => i.conceptId)).toEqual(["a", "b"]);
  });

  it("une notion jamais vue est due tout de suite", () => {
    const now = new Date("2026-05-05T12:00:00Z");
    const item = initialItem("gamme-mineure", now);
    expect(dueToday([item], now)).toHaveLength(1);
    expect(item.state).toEqual(INITIAL);
  });
});

describe("qualité déduite d'une réponse", () => {
  it("n'accorde jamais 5 à un simple clic juste", () => {
    // Sans hésitation mesurée, annoncer « parfait » ferait grimper les
    // intervalles plus vite que la mémoire ne suit.
    expect(qualityFromAnswer(true)).toBe(4);
    expect(qualityFromAnswer(true, true)).toBe(3);
    expect(qualityFromAnswer(false)).toBe(1);
  });

  it("une réponse fausse repasse toujours sous le seuil de réussite", () => {
    expect(qualityFromAnswer(false)).toBeLessThan(3);
  });
});
