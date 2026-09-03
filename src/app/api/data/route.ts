import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Export / import de toutes les données personnelles, en JSON.
//
// C'est une application personnelle hébergée sur un service tiers : pouvoir
// tout récupérer et tout réinstaller ailleurs n'est pas un supplément, c'est ce
// qui rend le reste acceptable.

const VERSION = 1;

export async function GET() {
  try {
    const [lessonProgress, reviewItems, practiceEvents, earStats, repertoire, tempos] =
      await Promise.all([
        prisma.lessonProgress.findMany(),
        prisma.reviewItem.findMany(),
        prisma.practiceEvent.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.earStat.findMany(),
        prisma.repertoireSong.findMany(),
        prisma.tempoRecord.findMany(),
      ]);

    return NextResponse.json(
      {
        version: VERSION,
        exportedAt: new Date().toISOString(),
        lessonProgress,
        reviewItems,
        practiceEvents,
        earStats,
        repertoire,
        tempos,
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="guitare-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Aucune base de données configurée : rien à exporter." },
      { status: 503 },
    );
  }
}

/**
 * Import. Fusion, jamais remplacement : on n'efface pas des données existantes
 * sur la foi d'un fichier. Les événements de journal sont ajoutés tels quels
 * (ils sont immuables), le reste est mis à jour par clé.
 */
export async function POST(request: Request) {
  let data: Record<string, unknown> = {};
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Fichier illisible." }, { status: 400 });
  }

  if (data.version !== VERSION) {
    return NextResponse.json(
      { ok: false, error: `Version d'export inattendue (${String(data.version)}).` },
      { status: 400 },
    );
  }

  const compte = { lessons: 0, reviews: 0, events: 0, songs: 0 };
  try {
    for (const p of (data.lessonProgress as { lessonId: string; status: string }[]) ?? []) {
      if (!p?.lessonId) continue;
      await prisma.lessonProgress.upsert({
        where: { lessonId: p.lessonId },
        create: { lessonId: p.lessonId, status: p.status ?? "in_progress" },
        update: { status: p.status ?? "in_progress" },
      });
      compte.lessons += 1;
    }

    for (const r of (data.reviewItems as Record<string, unknown>[]) ?? []) {
      const conceptId = typeof r?.conceptId === "string" ? r.conceptId : null;
      if (!conceptId) continue;
      const champs = {
        easeFactor: Number(r.easeFactor) || 2.5,
        intervalDays: Number(r.intervalDays) || 0,
        repetitions: Number(r.repetitions) || 0,
        dueDate: new Date(String(r.dueDate ?? new Date().toISOString())),
      };
      await prisma.reviewItem.upsert({
        where: { conceptId },
        create: { conceptId, ...champs },
        update: champs,
      });
      compte.reviews += 1;
    }

    for (const s of (data.repertoire as Record<string, unknown>[]) ?? []) {
      const title = typeof s?.title === "string" ? s.title : null;
      if (!title) continue;
      await prisma.repertoireSong.create({
        data: {
          title,
          artist: typeof s.artist === "string" ? s.artist : null,
          songKey: typeof s.songKey === "string" ? s.songKey : null,
          status: s.status === "acquired" ? "acquired" : "learning",
          targetBpm: typeof s.targetBpm === "number" ? s.targetBpm : null,
          notes: typeof s.notes === "string" ? s.notes : null,
        },
      });
      compte.songs += 1;
    }

    const events = (data.practiceEvents as Record<string, unknown>[]) ?? [];
    if (events.length) {
      await prisma.practiceEvent.createMany({
        data: events.flatMap((e) =>
          typeof e?.type === "string" && typeof e?.refId === "string"
            ? [{
                type: e.type,
                refId: e.refId,
                correct: typeof e.correct === "boolean" ? e.correct : null,
                quality: typeof e.quality === "number" ? e.quality : null,
                createdAt: new Date(String(e.createdAt ?? new Date().toISOString())),
              }]
            : [],
        ),
      });
      compte.events = events.length;
    }

    return NextResponse.json({ ok: true, persisted: true, compte });
  } catch {
    return NextResponse.json({ ok: false, persisted: false, reason: "no-database" });
  }
}
