import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LESSONS, getLesson, neighbours } from "@/content/lessons";
import { LessonView } from "@/components/lessons/LessonView";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  return { title: lesson ? lesson.title : "Leçon" };
}

async function loadStatus(slug: string): Promise<string> {
  try {
    const row = await prisma.lessonProgress.findUnique({ where: { lessonId: slug } });
    return row?.status ?? "not_started";
  } catch {
    return "not_started";
  }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const status = await loadStatus(slug);
  const { prev, next } = neighbours(slug);

  return (
    <LessonView
      lesson={lesson}
      initialStatus={status}
      prevSlug={prev?.slug}
      nextSlug={next?.slug}
    />
  );
}
