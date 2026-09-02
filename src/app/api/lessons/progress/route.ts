import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const ALLOWED = new Set(["not_started", "in_progress", "completed"]);

export async function POST(request: Request) {
  let lessonId = "";
  let status = "";
  try {
    const body = await request.json();
    lessonId = typeof body?.lessonId === "string" ? body.lessonId : "";
    status = typeof body?.status === "string" ? body.status : "";
  } catch {
    /* corps invalide */
  }
  if (!lessonId || !ALLOWED.has(status)) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const completedAt = status === "completed" ? new Date() : null;
  await prisma.lessonProgress.upsert({
    where: { lessonId },
    create: { lessonId, status, completedAt },
    update: { status, completedAt },
  });

  return NextResponse.json({ ok: true });
}
