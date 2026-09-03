import { describe, it, expect } from "vitest";
import { CONCEPTS, CONCEPT_IDS, conceptPrerequisites, isConceptId, type ConceptId } from "./concepts";
import { LESSONS } from "./lessons";
import type { Exercise, LessonBlock } from "./lessons/types";

function exercisesOf(blocks: LessonBlock[]): Exercise[] {
  return blocks.flatMap((b) => (b.kind === "exercise" ? [b.exercise] : []));
}

/** Ordre d'introduction : notion -> numéro de la leçon qui l'introduit. */
const introducedIn = new Map<ConceptId, number>();
for (const lesson of LESSONS) {
  for (const c of lesson.concepts) {
    if (!introducedIn.has(c)) introducedIn.set(c, lesson.order);
  }
}

describe("registre des notions", () => {
  it("chaque prérequis référencé existe", () => {
    for (const id of CONCEPT_IDS) {
      for (const parent of CONCEPTS[id].requires) {
        expect(isConceptId(parent), `${id} exige « ${parent} », inconnu`).toBe(true);
      }
    }
  });

  it("le graphe des prérequis est acyclique", () => {
    // conceptPrerequisites boucle indéfiniment sur un cycle : on le borne.
    for (const id of CONCEPT_IDS) {
      const prerequisites = conceptPrerequisites(id);
      expect(prerequisites, `${id} se figure parmi ses propres prérequis`).not.toContain(id);
    }
  });

  it("chaque notion est étiquetée et résumée", () => {
    for (const id of CONCEPT_IDS) {
      expect(CONCEPTS[id].label.trim()).not.toBe("");
      expect(CONCEPTS[id].summary.trim()).not.toBe("");
    }
  });
});

describe("notions et leçons", () => {
  it("chaque exercice déclare une notion connue", () => {
    for (const lesson of LESSONS) {
      for (const ex of exercisesOf(lesson.blocks)) {
        expect(isConceptId(ex.conceptId), `${ex.id} : notion « ${ex.conceptId} » inconnue`).toBe(true);
      }
    }
  });

  it("chaque notion déclarée par une leçon est travaillée par au moins un de ses exercices", () => {
    for (const lesson of LESSONS) {
      const worked = new Set(exercisesOf(lesson.blocks).map((e) => e.conceptId));
      for (const c of lesson.concepts) {
        expect(worked.has(c), `${lesson.slug} annonce « ${c} » sans exercice dessus`).toBe(true);
      }
    }
  });

  it("un exercice ne travaille que des notions déjà introduites", () => {
    for (const lesson of LESSONS) {
      for (const ex of exercisesOf(lesson.blocks)) {
        const at = introducedIn.get(ex.conceptId);
        expect(at, `${ex.id} : « ${ex.conceptId} » n'est introduite par aucune leçon`).toBeDefined();
        expect(at!, `${ex.id} porte sur une notion introduite en leçon ${at}`).toBeLessThanOrEqual(lesson.order);
      }
    }
  });

  it("aucune leçon ne s'appuie sur une notion enseignée plus tard", () => {
    for (const lesson of LESSONS) {
      for (const c of lesson.concepts) {
        for (const parent of conceptPrerequisites(c)) {
          const at = introducedIn.get(parent);
          expect(at, `« ${c} » (leçon ${lesson.order}) exige « ${parent} », introduite nulle part`)
            .toBeDefined();
          expect(
            at!,
            `« ${c} » (leçon ${lesson.order}) exige « ${parent} », enseignée en leçon ${at}`,
          ).toBeLessThanOrEqual(lesson.order);
        }
      }
    }
  });

  it("toute notion du registre est introduite par une leçon, ou reste à écrire", () => {
    // Les notions non encore introduites sont celles des leçons 5 à 11 : il ne
    // doit pas y en avoir tant que ces leçons n'existent pas.
    const orphelines = CONCEPT_IDS.filter((id) => !introducedIn.has(id));
    expect(orphelines).toEqual([]);
  });
});
