import type { Metadata } from "next";
import Link from "next/link";
import { LESSONS, exerciseCount } from "@/content/lessons";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Théorie" };
export const dynamic = "force-dynamic";

async function loadProgress(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.lessonProgress.findMany();
    return Object.fromEntries(rows.map((r) => [r.lessonId, r.status]));
  } catch {
    // Base indisponible : le parcours reste consultable.
    return {};
  }
}

const BADGE: Record<string, { label: string; className: string }> = {
  completed: { label: "Terminée", className: "bg-emerald-600/20 text-emerald-300" },
  in_progress: { label: "En cours", className: "bg-amber-600/20 text-amber-300" },
};

export default async function TheoriePage() {
  const progress = await loadProgress();
  const doneCount = LESSONS.filter((l) => progress[l.slug] === "completed").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Théorie &amp; gammes</h1>
        <p className="mt-2 text-neutral-400">
          Des leçons courtes, chaque notion ancrée sur le manche, sur un son et sur un
          exercice. Prends-les dans l&apos;ordre.
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          {doneCount} / {LESSONS.length} leçons terminées
        </p>
      </header>

      <ol className="space-y-3">
        {LESSONS.map((l) => {
          const badge = BADGE[progress[l.slug] ?? ""];
          return (
            <li key={l.slug}>
              <Link
                href={`/theorie/${l.slug}`}
                className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-medium text-emerald-400">
                  {l.order}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-100">{l.title}</span>
                    {badge && (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-500">{l.goal}</span>
                  <span className="mt-1 block text-xs text-neutral-600">
                    {l.minutes} min · {exerciseCount(l)} exercices
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-neutral-500">
        Les leçons 5 à 11 (mineure, accords, harmonisation, progressions, pentatoniques,
        modes, tensions) arrivent en phase 4c.
      </p>
    </div>
  );
}
