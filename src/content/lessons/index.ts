import type { Lesson } from "./types";
import { lesson as l1 } from "./01-notes-sur-le-manche";
import { lesson as l2 } from "./02-intervalles";
import { lesson as l3 } from "./03-gamme-majeure";
import { lesson as l4 } from "./04-caged";

/** Parcours ordonné. Le contenu vit dans le code : consultable hors-ligne. */
export const LESSONS: Lesson[] = [l1, l2, l3, l4].sort((a, b) => a.order - b.order);

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
