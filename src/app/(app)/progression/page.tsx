import type { Metadata } from "next";
import Link from "next/link";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { loadDue, loadStats, EMPTY_STATS } from "@/lib/review/queries";
import { ReviewSession } from "@/components/progression/ReviewSession";
import { StatsPanel } from "@/components/progression/StatsPanel";
import { DataTransfer } from "@/components/progression/DataTransfer";
import type { ConceptId } from "@/content/concepts";

export const metadata: Metadata = { title: "Progression" };
export const dynamic = "force-dynamic";

export default async function ProgressionPage() {
  const persistance = isDatabaseConfigured();

  let dus: ConceptId[] = [];
  let stats = EMPTY_STATS;
  if (persistance) {
    // Une base indisponible ne doit pas rendre la page inaccessible.
    const [d, s] = await Promise.all([
      loadDue().catch(() => []),
      loadStats().catch(() => EMPTY_STATS),
    ]);
    dus = d.map((x) => x.conceptId);
    stats = s;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Progression</h1>
        <p className="mt-2 text-neutral-400">
          Ce qu&apos;il y a à revoir aujourd&apos;hui, et ce que tu as fait.
        </p>
      </header>

      {!persistance && (
        <p className="rounded-xl border border-amber-700/60 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          Aucune base de données configurée : les révisions et les statistiques
          ont besoin de mémoire. Le reste de l&apos;application fonctionne.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-400">Routine du jour</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Etape href="/theorie" titre="Une leçon" detail="ou reprendre la dernière" />
          <Etape href="/oreille" titre="Cinq minutes d'oreille" detail="intervalles ou accords" />
          <Etape href="/technique" titre="Le métronome" detail="sur une grille qui tourne" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-400">
          Révisions {dus.length > 0 && `(${dus.length})`}
        </h2>
        <ReviewSession concepts={dus} />
      </section>

      <StatsPanel stats={stats} />

      <DataTransfer />
    </div>
  );
}

function Etape({ href, titre, detail }: { href: string; titre: string; detail: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
    >
      <span className="block font-medium text-neutral-100">{titre}</span>
      <span className="mt-0.5 block text-sm text-neutral-500">{detail}</span>
    </Link>
  );
}
