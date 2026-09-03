import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { review, nextDueDate, INITIAL, type Quality } from "@/lib/review/sm2";
import { isConceptId } from "@/content/concepts";

/**
 * Enregistre une révision et calcule la prochaine échéance.
 *
 * Deux écritures : la ligne de journal (source de vérité, append-only) et
 * l'agrégat `ReviewItem` (état courant de la notion). Si l'agrégat se perdait,
 * il serait reconstructible depuis le journal.
 */
export async function POST(request: Request) {
  let conceptId = "";
  let quality: number | null = null;
  try {
    const b = await request.json();
    conceptId = typeof b?.conceptId === "string" ? b.conceptId : "";
    quality = typeof b?.quality === "number" ? b.quality : null;
  } catch {
    /* corps invalide */
  }

  if (!isConceptId(conceptId) || quality === null || quality < 0 || quality > 5) {
    return NextResponse.json(
      { ok: false, error: "Notion inconnue ou qualité hors barème." },
      { status: 400 },
    );
  }

  try {
    const existant = await prisma.reviewItem.findUnique({ where: { conceptId } });
    const etat = existant
      ? {
          easeFactor: existant.easeFactor,
          intervalDays: existant.intervalDays,
          repetitions: existant.repetitions,
        }
      : { ...INITIAL };

    const suivant = review(etat, quality as Quality);
    const due = nextDueDate(suivant);

    await prisma.$transaction([
      prisma.reviewItem.upsert({
        where: { conceptId },
        create: { conceptId, ...suivant, dueDate: due, lastReviewed: new Date() },
        update: { ...suivant, dueDate: due, lastReviewed: new Date() },
      }),
      prisma.practiceEvent.create({
        data: { type: "review", refId: conceptId, quality, correct: quality >= 3 },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      persisted: true,
      next: { intervalDays: suivant.intervalDays, dueDate: due.toISOString() },
    });
  } catch {
    // Sans base, la révision reste utile à l'écran mais n'est pas planifiée.
    return NextResponse.json({ ok: true, persisted: false, reason: "no-database" });
  }
}
