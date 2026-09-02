import { describe, it, expect } from "vitest";
import { LESSONS, getLesson, neighbours } from "./index";
import { resolveSpec } from "@/lib/lessons/spec";
import type { Exercise } from "./types";

const allExercises: Exercise[] = LESSONS.flatMap((l) =>
  l.blocks.flatMap((b) => (b.kind === "exercise" ? [b.exercise] : [])),
);

describe("parcours de leçons — intégrité", () => {
  it("slugs uniques et ordre séquentiel", () => {
    const slugs = LESSONS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(LESSONS.map((l) => l.order)).toEqual(
      Array.from({ length: LESSONS.length }, (_, i) => i + 1),
    );
  });

  it("identifiants d'exercice uniques", () => {
    const ids = allExercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("navigation cohérente", () => {
    expect(getLesson(LESSONS[0].slug)).toBeDefined();
    expect(neighbours(LESSONS[0].slug).prev).toBeUndefined();
    expect(neighbours(LESSONS[0].slug).next?.slug).toBe(LESSONS[1].slug);
  });
});

describe("règle du projet — rien d'abstrait", () => {
  it("chaque leçon est ancrée sur le manche ET sur un exercice", () => {
    for (const l of LESSONS) {
      const kinds = l.blocks.map((b) => b.kind);
      expect(kinds, `leçon ${l.slug} sans diagramme de manche`).toContain("fretboard");
      expect(kinds, `leçon ${l.slug} sans exercice`).toContain("exercise");
    }
  });
});

describe("exercices — validité", () => {
  it("les QCM ont une bonne réponse valide", () => {
    for (const e of allExercises) {
      if (e.kind !== "mcq") continue;
      expect(e.options.length).toBeGreaterThanOrEqual(2);
      expect(e.answer).toBeGreaterThanOrEqual(0);
      expect(e.answer).toBeLessThan(e.options.length);
    }
  });

  it("chaque exercice de manche est RÉSOLUBLE (une bonne réponse existe)", () => {
    for (const e of allExercises) {
      if (e.kind !== "fretFind") continue;
      const { positions } = resolveSpec(e.spec);
      expect(positions.length, `${e.id} : aucune position affichée`).toBeGreaterThan(0);
      const solvable = positions.some((p) => {
        if (e.onlyStringIndex !== undefined && p.stringIndex !== e.onlyStringIndex) return false;
        if (e.targetDegrees?.length) return e.targetDegrees.includes(p.degreeSemitones);
        if (e.targetPcs?.length) return e.targetPcs.includes(p.pc);
        return false;
      });
      expect(solvable, `${e.id} : aucune bonne réponse atteignable`).toBe(true);
    }
  });

  it("les diagrammes de toutes les leçons se résolvent", () => {
    for (const l of LESSONS) {
      for (const b of l.blocks) {
        if (b.kind !== "fretboard") continue;
        const r = resolveSpec(b.spec);
        expect(r.positions.length, `${l.slug} : diagramme vide`).toBeGreaterThan(0);
      }
    }
  });
});
