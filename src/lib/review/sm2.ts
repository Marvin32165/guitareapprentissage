// Répétition espacée — algorithme SM-2 (Piotr Woźniak, SuperMemo 2).
//
// Ce qui est révisé, c'est une NOTION (`conceptId`), pas un exercice : réussir
// un QCM ne dit rien de ce qu'on sait si l'on ne sait pas sur quoi il portait.
// Les identifiants viennent du registre `src/content/concepts.ts`.
//
// L'algorithme est implémenté ici tel qu'il est publié, sans « amélioration »
// maison : ses constantes sont le fruit d'observations, et les bricoler à
// l'aveugle donnerait un calendrier qui a l'air savant sans rien valoir.

export interface ReviewState {
  /** Facteur de facilité : plus il est haut, plus les intervalles s'allongent. */
  easeFactor: number;
  /** Intervalle courant, en jours. */
  intervalDays: number;
  /** Répétitions réussies d'affilée. */
  repetitions: number;
}

/**
 * Qualité de la réponse, de 0 à 5, telle que SM-2 l'attend.
 * En dessous de 3, la notion est considérée comme non sue : on repart de zéro.
 */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export const INITIAL: ReviewState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

/** Plancher du facteur de facilité, imposé par l'algorithme. */
export const MIN_EASE = 1.3;

/**
 * Nouveau facteur de facilité après une réponse.
 * Formule d'origine : EF' = EF + (0,1 − (5−q) × (0,08 + (5−q) × 0,02)).
 */
export function nextEase(ease: number, quality: Quality): number {
  const q = quality;
  const next = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return Math.max(MIN_EASE, Number(next.toFixed(4)));
}

/** État suivant d'une notion, après une réponse de qualité `quality`. */
export function review(state: ReviewState, quality: Quality): ReviewState {
  const easeFactor = nextEase(state.easeFactor, quality);

  // Échec : on ne dégrade pas seulement l'intervalle, on repart au lendemain.
  // Une notion qu'on vient de rater ne se revoit pas dans une semaine.
  if (quality < 3) {
    return { easeFactor, intervalDays: 1, repetitions: 0 };
  }

  const repetitions = state.repetitions + 1;
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.intervalDays * easeFactor);

  return { easeFactor, intervalDays, repetitions };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date de la prochaine révision, à partir d'un instant de référence. */
export function nextDueDate(state: ReviewState, from: Date = new Date()): Date {
  return new Date(from.getTime() + state.intervalDays * DAY_MS);
}

export interface DueItem {
  conceptId: string;
  dueDate: Date;
  state: ReviewState;
}

/**
 * Notions à revoir aujourd'hui, les plus en retard d'abord.
 * Le retard prime sur la difficulté : une notion oubliée depuis trois semaines
 * passe avant une notion difficile due ce matin.
 */
export function dueToday(items: DueItem[], now: Date = new Date()): DueItem[] {
  return items
    .filter((i) => i.dueDate.getTime() <= now.getTime())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/**
 * Qualité déduite d'une réponse juste/fausse, faute de mieux.
 *
 * SM-2 attend une auto-évaluation en six degrés ; un exercice à choix multiple
 * ne donne qu'un booléen. On projette donc sur une échelle réduite, et c'est
 * une approximation assumée : 5 = juste du premier coup, 3 = juste après une
 * hésitation, 1 = faux. Sans hésitation mesurée, on s'en tient à 4 et 1 —
 * annoncer 5 sur un simple clic juste ferait grimper les intervalles trop vite.
 */
export function qualityFromAnswer(correct: boolean, hesitated = false): Quality {
  if (!correct) return 1;
  return hesitated ? 3 : 4;
}

/** Une notion jamais vue est due immédiatement. */
export function initialItem(conceptId: string, now: Date = new Date()): DueItem {
  return { conceptId, dueDate: now, state: { ...INITIAL } };
}
