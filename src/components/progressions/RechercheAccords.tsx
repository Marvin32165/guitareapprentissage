"use client";

import { useState } from "react";
import { CarteProgression } from "./CarteProgression";
import { NoteCorpus, SourceCorpus } from "./NoteCorpus";
import type { RechercheAccords as Resultat } from "@/content/progressions/recherche";

// Recherche inverse : je tape ce que mes doigts jouent, l'app dit ce que c'est.
//
// Aucune tonalité n'est demandée, et ce n'est pas un raccourci : les douze
// toniques sont essayées dans les deux modes, et TOUTES les lectures qui
// tombent sur une progression connue sont affichées. « Do Sol La m Fa » est
// I – V – vi – IV en do majeur, et aussi III – VII – i – VI en la mineur.
// Trancher à la place de l'utilisateur serait une invention.

const EXEMPLES = ["C G Am F", "Am F C G", "Dm G7 Cmaj7", "Em C G D", "E5 A5 B5"];

export function RechercheAccords() {
  const [saisi, setSaisi] = useState("");
  const [etat, setEtat] = useState<
    { phase: "vide" } | { phase: "cherche" } | { phase: "erreur" } | ({ phase: "prete" } & Resultat)
  >({ phase: "vide" });

  async function chercher(texte: string) {
    setSaisi(texte);
    if (!texte.trim()) {
      setEtat({ phase: "vide" });
      return;
    }
    setEtat({ phase: "cherche" });
    try {
      const { chercherParAccords } = await import("@/content/progressions/recherche");
      const r = await chercherParAccords(texte);
      setEtat({ phase: "prete", ...r });
    } catch {
      setEtat({ phase: "erreur" });
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void chercher(saisi);
        }}
        className="space-y-3"
      >
        <label htmlFor="accords" className="block text-sm text-neutral-400">
          Les accords, dans l&apos;ordre où tu les joues
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="accords"
            value={saisi}
            onChange={(e) => setSaisi(e.target.value)}
            placeholder="C G Am F"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base text-neutral-100 placeholder:text-neutral-600"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white active:bg-emerald-700"
          >
            Chercher
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Deux accords au minimum. Majeur « C », mineur « Am », septième « G7 »,
          renversement « C/G », accord de quinte « E5 ». Les répétitions
          consécutives comptent pour une.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXEMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => void chercher(ex)}
              className="min-h-11 rounded-lg border border-neutral-800 px-3 text-sm text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      <NoteCorpus />

      {etat.phase === "cherche" && <p className="text-sm text-neutral-500">Recherche…</p>}
      {etat.phase === "erreur" && (
        <p className="text-sm text-neutral-500">
          Corpus indisponible. Il se télécharge à la première consultation en ligne, puis reste
          accessible hors-ligne.
        </p>
      )}

      {etat.phase === "prete" && (
        <div className="space-y-4">
          {etat.refuses.length > 0 && (
            <p className="rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
              Pas lu comme un accord : {etat.refuses.map((r) => `« ${r} »`).join(", ")}.
            </p>
          )}
          {etat.accords.length < 2 ? (
            <p className="text-sm text-neutral-400">
              Il faut au moins deux accords : un accord seul ne fait pas un enchaînement.
            </p>
          ) : etat.resultats.length === 0 ? (
            <div className="space-y-2 text-sm text-neutral-400">
              <p>
                Aucune progression du corpus ne correspond à{" "}
                {etat.accords.map((a) => a.saisi).join(" – ")}.
              </p>
              <p className="text-neutral-500">
                Ça ne veut pas dire que l&apos;enchaînement est faux : le corpus ne relève que des
                suites de quatre accords, sur 10 451 morceaux annotés par des contributeurs.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-400">
                {etat.resultats.length} lecture{etat.resultats.length > 1 ? "s" : ""} possible
                {etat.resultats.length > 1 ? "s" : ""} de{" "}
                <span className="text-neutral-200">
                  {etat.accords.map((a) => a.saisi).join(" – ")}
                </span>
                . La même suite se chiffre différemment selon la tonalité qu&apos;on lui suppose —
                les deux lectures sont justes.
              </p>
              {etat.resultats.map((r) => (
                <CarteProgression
                  key={r.progression.id}
                  progression={r.progression}
                  morceaux={r.morceaux}
                  tronque={r.tronque}
                  toniqueSuggeree={r.tonique}
                  // Inutile de surligner quand la saisie couvre toute la
                  // progression : tout serait surligné.
                  surligne={
                    etat.accords.length < r.progression.degres.length
                      ? [r.position, etat.accords.length]
                      : undefined
                  }
                  entete={
                    <p className="text-sm text-neutral-400">
                      Lu en <span className="text-neutral-100">{r.tonalite}</span>
                    </p>
                  }
                />
              ))}
            </>
          )}
        </div>
      )}

      <SourceCorpus />
    </div>
  );
}
