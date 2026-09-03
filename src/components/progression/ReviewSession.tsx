"use client";

import { useCallback, useState } from "react";
import { getConcept, type ConceptId } from "@/content/concepts";
import { LESSONS } from "@/content/lessons";

// Session de révision.
//
// SM-2 attend une auto-évaluation, pas un score calculé : c'est la personne qui
// sait si elle a retrouvé la notion tout de suite, péniblement, ou pas du tout.
// Trois boutons suffisent — six degrés demanderaient une précision d'évaluation
// que personne n'a.

const REPONSES = [
  { quality: 5, label: "Tout de suite", hint: "revient dans longtemps", tone: "emerald" },
  { quality: 3, label: "Avec effort", hint: "revient bientôt", tone: "sky" },
  { quality: 1, label: "Pas du tout", hint: "revient demain", tone: "amber" },
] as const;

const TONES: Record<string, string> = {
  emerald: "border-emerald-700 text-emerald-300 hover:bg-emerald-950/30",
  sky: "border-sky-700 text-sky-300 hover:bg-sky-950/30",
  amber: "border-amber-700 text-amber-300 hover:bg-amber-950/30",
};

export interface ReviewSessionProps {
  concepts: ConceptId[];
}

/** Où la notion a été introduite : de quoi y retourner en un geste. */
function leconDe(conceptId: ConceptId) {
  return LESSONS.find((l) => l.concepts.includes(conceptId));
}

export function ReviewSession({ concepts }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [revele, setRevele] = useState(false);
  const [dernier, setDernier] = useState<string | null>(null);

  const repondre = useCallback(
    async (quality: number) => {
      const conceptId = concepts[index];
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conceptId, quality }),
        });
        const json = await res.json();
        setDernier(
          json?.next?.intervalDays
            ? `À revoir dans ${json.next.intervalDays} jour${json.next.intervalDays > 1 ? "s" : ""}.`
            : null,
        );
      } catch {
        setDernier(null);
      }
      setRevele(false);
      setIndex((i) => i + 1);
    },
    [concepts, index],
  );

  if (concepts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-800 p-5 text-center text-neutral-500">
        Rien à réviser aujourd&apos;hui. Termine une leçon pour alimenter les
        révisions.
      </p>
    );
  }

  if (index >= concepts.length) {
    return (
      <div className="space-y-2 rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-5">
        <p className="font-medium text-emerald-300">Révisions terminées.</p>
        <p className="text-sm text-neutral-300">
          {concepts.length} notion{concepts.length > 1 ? "s" : ""} revue
          {concepts.length > 1 ? "s" : ""}. {dernier}
        </p>
        <p className="text-sm text-neutral-500">
          Les intervalles s&apos;allongent quand tu retrouves vite, et se
          raccourcissent quand tu peines. Rien à régler.
        </p>
      </div>
    );
  }

  const conceptId = concepts[index];
  const concept = getConcept(conceptId);
  const lecon = leconDe(conceptId);

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <p className="text-sm text-neutral-500">
        Révision {index + 1} / {concepts.length}
      </p>

      <h3 className="text-lg font-medium text-neutral-100">{concept.label}</h3>

      {!revele ? (
        <>
          <p className="text-sm text-neutral-400">
            Essaie de te la remettre en tête — et si tu as la guitare, joue-la.
            Puis affiche la réponse.
          </p>
          <button
            type="button"
            onClick={() => setRevele(true)}
            className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Afficher
          </button>
        </>
      ) : (
        <>
          <p className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-neutral-200">
            {concept.summary}
          </p>
          {lecon && (
            <a
              href={`/theorie/${lecon.slug}`}
              className="inline-block text-sm text-emerald-400 underline underline-offset-4"
            >
              Revoir la leçon « {lecon.title} »
            </a>
          )}
          <p className="text-sm text-neutral-400">Ça t&apos;est revenu comment ?</p>
          <div className="grid gap-2">
            {REPONSES.map((r) => (
              <button
                key={r.quality}
                type="button"
                onClick={() => void repondre(r.quality)}
                className={
                  "min-h-11 w-full rounded-xl border px-4 text-sm transition-colors " +
                  TONES[r.tone]
                }
              >
                {r.label}
                <span className="ml-2 text-xs text-neutral-500">— {r.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
