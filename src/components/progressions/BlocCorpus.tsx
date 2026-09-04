"use client";

import { useEffect, useState } from "react";
import { CarteProgression } from "./CarteProgression";
import { NoteCorpus, SourceCorpus } from "./NoteCorpus";
import type { Mode } from "@/lib/music/degres";
import type { ProgressionEtMorceaux } from "@/content/progressions/recherche";

// « Qui joue ça ? » — la question qu'on se pose devant un chiffrage romain.
//
// Le corpus est chargé par import() dynamique : rien ne descend tant qu'une
// leçon qui s'en sert n'est pas ouverte.
//
// Quand la suite fait moins de quatre accords, elle n'est pas une progression
// du corpus mais un fragment de plusieurs : on liste alors les progressions qui
// la contiennent, en une ligne chacune, et une seule s'ouvre à la fois. Six
// grilles jouables dépliées transformeraient la leçon en mur.

interface Pretes {
  phase: "prete";
  resultats: ProgressionEtMorceaux[];
  positions: number[];
  total: number;
}

export function BlocCorpus({
  mode,
  degres,
  legende,
}: {
  mode: Mode;
  degres: string[];
  legende?: string;
}) {
  const [etat, setEtat] = useState<
    { phase: "chargement" } | { phase: "erreur" } | Pretes
  >({ phase: "chargement" });
  const [choisi, setChoisi] = useState(0);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const { morceauxDeLaProgression, progressionsContenant } = await import(
        "@/content/progressions/recherche"
      );
      if (degres.length === 4) {
        const r = await morceauxDeLaProgression(mode, degres);
        if (!vivant) return;
        setEtat({
          phase: "prete",
          resultats: r ? [r] : [],
          positions: [0],
          total: r ? 1 : 0,
        });
        return;
      }
      const r = await progressionsContenant(mode, degres, 8);
      if (!vivant) return;
      setEtat({
        phase: "prete",
        resultats: r.resultats,
        positions: r.position,
        total: r.totalProgressions,
      });
    })().catch(() => {
      if (vivant) setEtat({ phase: "erreur" });
    });
    return () => {
      vivant = false;
    };
    // `degres` est un littéral figé dans le contenu de la leçon.
  }, [mode, degres]);

  const fragment = degres.length < 4;
  const courant = etat.phase === "prete" ? etat.resultats[choisi] : undefined;

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-neutral-100">
        {legende ?? `Qui joue ${degres.join(" – ")} ?`}
      </h3>
      <NoteCorpus />

      {etat.phase === "chargement" && (
        <p className="text-sm text-neutral-500">Chargement du corpus…</p>
      )}
      {etat.phase === "erreur" && (
        <p className="text-sm text-neutral-500">
          Corpus indisponible. Il se télécharge à la première consultation en ligne, puis
          reste accessible hors-ligne.
        </p>
      )}

      {etat.phase === "prete" && etat.resultats.length === 0 && (
        <p className="text-sm text-neutral-500">Aucune progression du corpus ne correspond.</p>
      )}

      {etat.phase === "prete" && fragment && etat.resultats.length > 0 && (
        <>
          <p className="text-sm text-neutral-400">
            Le corpus relève des suites de quatre accords. {degres.join(" – ")} apparaît dans{" "}
            <strong className="text-neutral-200">{etat.total}</strong> d&apos;entre elles ; voici
            les plus répandues. Touche-en une pour l&apos;entendre.
          </p>
          <ul className="divide-y divide-neutral-800/70 overflow-hidden rounded-xl border border-neutral-800">
            {etat.resultats.map((r, i) => (
              <li key={r.progression.id}>
                <button
                  type="button"
                  onClick={() => setChoisi(i)}
                  aria-current={i === choisi ? "true" : undefined}
                  className={
                    "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left " +
                    (i === choisi ? "bg-neutral-800/70" : "hover:bg-neutral-900/60")
                  }
                >
                  <span className="flex flex-wrap gap-1.5">
                    {r.progression.degres.map((d, k) => (
                      <span
                        key={k}
                        className={
                          k >= etat.positions[i] && k < etat.positions[i] + degres.length
                            ? "font-semibold text-neutral-100"
                            : "text-neutral-500"
                        }
                      >
                        {d}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {r.progression.total} morceaux
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {courant && (
        <CarteProgression
          key={courant.progression.id}
          progression={courant.progression}
          morceaux={courant.morceaux}
          tronque={courant.tronque}
          surligne={
            fragment && etat.phase === "prete"
              ? [etat.positions[choisi], degres.length]
              : undefined
          }
        />
      )}

      <SourceCorpus />
    </section>
  );
}
