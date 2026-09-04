"use client";

import { useState } from "react";
import type { MorceauCorpus } from "@/content/progressions/recherche";

// Liste de morceaux du corpus. Le lien renvoie à la fiche d'origine : on
// affiche une analyse faite par quelqu'un d'autre, autant pouvoir la vérifier.

const VISIBLES = 8;

export function ListeMorceaux({
  morceaux,
  total,
  tronque,
}: {
  morceaux: MorceauCorpus[];
  total: number;
  tronque: boolean;
}) {
  const [tout, setTout] = useState(false);
  if (morceaux.length === 0) {
    return <p className="text-sm text-neutral-500">Aucun morceau du corpus ne l&apos;emploie.</p>;
  }

  const montres = tout ? morceaux : morceaux.slice(0, VISIBLES);

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-neutral-800/70 rounded-xl border border-neutral-800">
        {montres.map((m) => (
          <li key={m.id}>
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex min-h-11 flex-col justify-center px-3 py-2 hover:bg-neutral-900/60"
            >
              <span className="text-sm text-neutral-200">{m.titre}</span>
              <span className="text-xs text-neutral-500">{m.artiste}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {morceaux.length > VISIBLES && (
          <button
            type="button"
            onClick={() => setTout((v) => !v)}
            className="min-h-11 rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            {tout ? "Réduire" : `Voir les ${morceaux.length}`}
          </button>
        )}
        <p className="text-xs text-neutral-500">
          {total} morceau{total > 1 ? "x" : ""} du corpus
          {tronque && ` · ${morceaux.length} montrés`}
        </p>
      </div>
    </div>
  );
}
