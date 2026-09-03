import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Répertoire : une liste de titres saisie à la main, avec des notes
// personnelles. PAS une base de tablatures — rien n'est récupéré ailleurs,
// rien n'est engendré. C'est une contrainte du projet, pas une limite technique.

const STATUTS = new Set(["learning", "acquired"]);

function texte(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

export async function GET() {
  try {
    const songs = await prisma.repertoireSong.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ ok: true, persisted: true, songs });
  } catch {
    return NextResponse.json({ ok: true, persisted: false, songs: [] });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* corps invalide */
  }

  const title = texte(body.title);
  if (!title) {
    return NextResponse.json({ ok: false, error: "Un titre est requis." }, { status: 400 });
  }
  const statut = typeof body.status === "string" && STATUTS.has(body.status) ? body.status : "learning";
  const bpm = typeof body.targetBpm === "number" && Number.isFinite(body.targetBpm)
    ? Math.min(300, Math.max(30, Math.round(body.targetBpm)))
    : null;

  try {
    const song = await prisma.repertoireSong.create({
      data: {
        title,
        artist: texte(body.artist),
        songKey: texte(body.songKey, 12),
        status: statut,
        targetBpm: bpm,
        notes: texte(body.notes, 2000),
      },
    });
    return NextResponse.json({ ok: true, persisted: true, song });
  } catch {
    return NextResponse.json({ ok: false, persisted: false, reason: "no-database" });
  }
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* corps invalide */
  }
  const id = texte(body.id, 40);
  if (!id) return NextResponse.json({ ok: false, error: "Identifiant manquant." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.status === "string" && STATUTS.has(body.status)) data.status = body.status;
  if (body.notes !== undefined) data.notes = texte(body.notes, 2000);
  if (body.title !== undefined) {
    const t = texte(body.title);
    if (t) data.title = t;
  }

  try {
    const song = await prisma.repertoireSong.update({ where: { id }, data });
    return NextResponse.json({ ok: true, persisted: true, song });
  } catch {
    return NextResponse.json({ ok: false, persisted: false, reason: "no-database" });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Identifiant manquant." }, { status: 400 });
  try {
    await prisma.repertoireSong.delete({ where: { id } });
    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ ok: false, persisted: false, reason: "no-database" });
  }
}
