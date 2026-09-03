import type { Lesson } from "./types";
import { lesson as l1 } from "./01-notes-sur-le-manche";
import { lesson as l2 } from "./02-intervalles";
import { lesson as l3 } from "./03-gamme-majeure";
import { lesson as l4 } from "./04-caged";
import { lesson as l5 } from "./05-gamme-mineure";
import { lesson as l6 } from "./06-accords";
import { lesson as l7 } from "./07-harmonisation";
import { lesson as l8 } from "./08-progressions";
import { lesson as l9 } from "./09-pentatoniques";
import { lesson as l10 } from "./10-modes";
import { lesson as l11 } from "./11-tensions";

/** Parcours ordonné. Le contenu vit dans le code : consultable hors-ligne. */
export const LESSONS: Lesson[] = [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11].sort(
  (a, b) => a.order - b.order,
);

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}

export function neighbours(slug: string): { prev?: Lesson; next?: Lesson } {
  const i = LESSONS.findIndex((l) => l.slug === slug);
  if (i < 0) return {};
  return { prev: LESSONS[i - 1], next: LESSONS[i + 1] };
}

export function exerciseCount(lesson: Lesson): number {
  return lesson.blocks.filter((b) => b.kind === "exercise").length;
}

export type { Lesson };
