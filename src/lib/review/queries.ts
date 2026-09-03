// Lectures côté serveur pour la page Progression.
//
// Le journal `PracticeEvent` est la source de vérité ; tout ce qui suit en est
// dérivé. Aucune de ces fonctions ne doit lever si la base est absente : le
// parcours reste consultable sans persistance.

import { prisma } from "@/lib/db/prisma";
import { CONCEPT_IDS, type ConceptId } from "@/content/concepts";
import { LESSONS } from "@/content/lessons";

export interface DueConcept {
  conceptId: ConceptId;
  dueDate: Date;
  repetitions: number;
  /** Jamais révisée : elle est due, mais ce n'est pas un retard. */
  neuve: boolean;
}

/** Notions à revoir, les plus en retard d'abord. Les neuves ferment la marche. */
export async function loadDue(limit = 8): Promise<DueConcept[]> {
  // Une notion n'est proposée que si la leçon qui l'introduit est terminée :
  // réviser ce qu'on n'a pas encore vu n'a pas de sens.
  const progres = await prisma.lessonProgress.findMany({ where: { status: "completed" } });
  const vues = new Set(progres.map((p) => p.lessonId));
  const disponibles = new Set<ConceptId>();
  for (const lecon of LESSONS) {
    if (vues.has(lecon.slug)) for (const c of lecon.concepts) disponibles.add(c);
  }
  if (disponibles.size === 0) return [];

  const items = await prisma.reviewItem.findMany({
    where: { conceptId: { in: [...disponibles] } },
  });
  const parId = new Map(items.map((i) => [i.conceptId, i]));
  const now = Date.now();

  const echues: DueConcept[] = [];
  for (const conceptId of disponibles) {
    const item = parId.get(conceptId);
    if (!item) {
      echues.push({ conceptId, dueDate: new Date(now), repetitions: 0, neuve: true });
    } else if (item.dueDate.getTime() <= now) {
      echues.push({
        conceptId: conceptId,
        dueDate: item.dueDate,
        repetitions: item.repetitions,
        neuve: false,
      });
    }
  }

  echues.sort((a, b) => {
    if (a.neuve !== b.neuve) return a.neuve ? 1 : -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
  return echues.slice(0, limit);
}

export interface Stats {
  /** Jours consécutifs avec au moins un événement. */
  serie: number;
  eventsSemaine: number;
  leconsTerminees: number;
  leconsTotal: number;
  notionsSuivies: number;
  notionsTotal: number;
  oreille: { attempts: number; correct: number };
  /** Sept derniers jours, du plus ancien au plus récent. */
  parJour: { date: string; count: number }[];
}

function jourLocal(d: Date): string {
  // Date locale, pas UTC : une session de 23 h ne doit pas compter pour demain.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function loadStats(): Promise<Stats> {
  const depuis = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const [events, progres, items] = await Promise.all([
    prisma.practiceEvent.findMany({
      where: { createdAt: { gte: depuis } },
      select: { type: true, correct: true, createdAt: true },
    }),
    prisma.lessonProgress.findMany(),
    prisma.reviewItem.findMany({ select: { conceptId: true } }),
  ]);

  const parJourMap = new Map<string, number>();
  for (const e of events) {
    const j = jourLocal(e.createdAt);
    parJourMap.set(j, (parJourMap.get(j) ?? 0) + 1);
  }

  // Série : on remonte jour par jour tant qu'il y a de l'activité. On tolère
  // que le jour même soit vide — une série ne se casse pas avant le coucher.
  let serie = 0;
  const curseur = new Date();
  if (!parJourMap.has(jourLocal(curseur))) curseur.setDate(curseur.getDate() - 1);
  while (parJourMap.has(jourLocal(curseur))) {
    serie += 1;
    curseur.setDate(curseur.getDate() - 1);
  }

  const septJours: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const j = jourLocal(d);
    septJours.push({ date: j, count: parJourMap.get(j) ?? 0 });
  }

  const semaine = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oreilleEvents = events.filter((e) => e.type.startsWith("ear_"));

  return {
    serie,
    eventsSemaine: events.filter((e) => e.createdAt >= semaine).length,
    leconsTerminees: progres.filter((p) => p.status === "completed").length,
    leconsTotal: LESSONS.length,
    notionsSuivies: items.length,
    notionsTotal: CONCEPT_IDS.length,
    oreille: {
      attempts: oreilleEvents.length,
      correct: oreilleEvents.filter((e) => e.correct === true).length,
    },
    parJour: septJours,
  };
}

export const EMPTY_STATS: Stats = {
  serie: 0,
  eventsSemaine: 0,
  leconsTerminees: 0,
  leconsTotal: LESSONS.length,
  notionsSuivies: 0,
  notionsTotal: CONCEPT_IDS.length,
  oreille: { attempts: 0, correct: 0 },
  parJour: [],
};
