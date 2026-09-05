"use client";

import { useEffect, useState } from "react";
import { CarteProgression } from "./CarteProgression";
import { NoteCorpus, SourceCorpus } from "./NoteCorpus";
import { normaliser } from "@/lib/texte";
import type { Suggestion } from "@/content/progressions/suggestions";

// Des morceaux à travailler, déduits du corpus : ceux dont la grille se joue
// entièrement avec les onze formes d'accords ouverts que les leçons enseignent.
//
// La réserve est affichée en toutes lettres, parce qu'elle change tout : le
// corpus ne garde pas la tonalité d'origine, seulement les degrés. La tonalité
// proposée est celle qui évite les barrés, pas celle du disque. On apprend la
// GRILLE du morceau, transposée — pas le morceau.

const SOURCES_LISIBLES: Record<string, string> = {
  I: "Isophonics",
  B: "Billboard",
  R: "ChoCo",
  H: "Hooktheory",
  W: "Wikifonia",
};

export function AApprendre({
  dejaLa,
  onAjout,
}: {
  /** Titres déjà au répertoire, normalisés, pour ne pas proposer un doublon. */
  dejaLa: Set<string>;
  onAjout: (song: unknown) => void;
}) {
  const [etat, setEtat] = useState<
    { phase: "chargement" } | { phase: "erreur" } | { phase: "prete"; liste: Suggestion[] }
  >({ phase: "chargement" });
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [enCours, setEnCours] = useState<number | null>(null);
  const [echec, setEchec] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const { morceauxAApprendre } = await import("@/content/progressions/suggestions");
      const liste = await morceauxAApprendre(30);
      if (vivant) setEtat({ phase: "prete", liste });
    })().catch(() => {
      if (vivant) setEtat({ phase: "erreur" });
    });
    return () => {
      vivant = false;
    };
  }, []);

  async function ajouter(s: Suggestion) {
    setEnCours(s.morceau.id);
    setEchec(null);
    const res = await fetch("/api/repertoire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: s.morceau.titre,
        artist: s.morceau.artiste,
        songKey: s.tonaliteCourte,
        notes:
          `Grille ${s.progression.degres.join(" – ")}, jouable en accords ouverts : ` +
          `${s.accords.join(" ")} (${s.tonalite}).\n` +
          `Tonalité choisie pour éviter les barrés — ce n'est pas forcément celle du morceau. ` +
          `Suggestion tirée du corpus (${SOURCES_LISIBLES[s.morceau.source] ?? s.morceau.source}).`,
      }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setEnCours(null);
    if (json?.ok && json.song) onAjout(json.song);
    else setEchec("Impossible d'enregistrer : pas de base de données configurée.");
  }

  if (etat.phase === "chargement") {
    return <p className="text-sm text-neutral-500">Chargement du corpus…</p>;
  }
  if (etat.phase === "erreur") {
    return (
      <p className="text-sm text-neutral-500">
        Corpus indisponible. Il se télécharge à la première consultation en ligne, puis reste
        accessible hors-ligne.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200/90">
        <p>
          <strong className="font-semibold text-amber-100">
            Tu apprends la grille, pas le morceau.
          </strong>{" "}
          La tonalité indiquée est celle qui rend la grille jouable sans barré — le corpus ne
          garde pas la tonalité d&apos;origine. Joué comme ça, ça ne tombera pas sur le disque.
        </p>
      </div>
      <NoteCorpus court />

      {echec && (
        <p className="rounded-xl border border-amber-700/60 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          {echec}
        </p>
      )}

      <ul className="space-y-2">
        {etat.liste.map((s) => {
          const deja = dejaLa.has(normaliser(s.morceau.titre));
          return (
            <li
              key={s.morceau.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-100">{s.morceau.titre}</p>
                  <p className="text-sm text-neutral-500">
                    {s.morceau.artiste}
                    {s.morceau.credit === "compositeur" ? " · compositeur" : ""} ·{" "}
                    {SOURCES_LISIBLES[s.morceau.source] ?? s.morceau.source}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deja || enCours === s.morceau.id}
                  onClick={() => void ajouter(s)}
                  className={
                    "min-h-11 shrink-0 rounded-lg border px-3 text-xs " +
                    (deja
                      ? "border-neutral-800 text-neutral-600"
                      : "border-emerald-700 text-emerald-300 hover:bg-emerald-950/40")
                  }
                >
                  {deja ? "Déjà au répertoire" : enCours === s.morceau.id ? "…" : "+ Répertoire"}
                </button>
              </div>

              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {s.accords.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-2 py-1 text-neutral-100"
                  >
                    {a}
                  </span>
                ))}
                <span className="text-neutral-500">
                  {s.progression.degres.join(" – ")} · {s.tonalite}
                </span>
              </p>

              <button
                type="button"
                onClick={() => setOuvert((o) => (o === s.morceau.id ? null : s.morceau.id))}
                aria-expanded={ouvert === s.morceau.id}
                className="mt-2 inline-flex min-h-11 items-center text-xs text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
              >
                {ouvert === s.morceau.id ? "Masquer la grille" : "Écouter et voir la grille"}
              </button>

              {ouvert === s.morceau.id && (
                <div className="mt-3">
                  <CarteProgression
                    progression={s.progression}
                    morceaux={[]}
                    tronque={false}
                    toniqueSuggeree={s.grille.tonique}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <SourceCorpus />
    </div>
  );
}
