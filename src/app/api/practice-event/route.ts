import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/** Journal append-only : chaque réponse d'exercice y écrit une ligne. */
export async function POST(request: Request) {
  let type = "";
  let refId = "";
  let correct: boolean | null = null;
  let quality: number | null = null;
  try {
    const b = await request.json();
    type = typeof b?.type === "string" ? b.type : "";
    refId = typeof b?.refId === "string" ? b.refId : "";
    correct = typeof b?.correct === "boolean" ? b.correct : null;
    quality = typeof b?.quality === "number" ? b.quality : null;
  } catch {
    /* corps invalide */
  }
  if (!type || !refId) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  await prisma.practiceEvent.create({ data: { type, refId, correct, quality } });
  return NextResponse.json({ ok: true });
}
