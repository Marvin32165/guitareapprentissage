"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CarteProgression } from "./CarteProgression";
import { NoteCorpus, SourceCorpus } from "./NoteCorpus";
import type { RenvoiLecon } from "@/content/progressions/lecons";
import type { MorceauCorpus, ProgressionCorpus } from "@/content/progressions/recherche";

// Depuis le répertoire : « ce morceau que je travaille, il enchaîne quoi ? »
//
// La recherche se fait sur le titre, dans un corpus de 18 599 morceaux. Quand
// rien ne sort, on le dit sans détour : le corpus est petit devant la musique,
// et un morceau absent n'est pas un morceau sans progression.

interface Trouvaille {
  morceau: MorceauCorpus;
  progression: ProgressionCorpus;
}

export function ProgressionDuMorceau({ titre, artiste }: { titre: string; artiste?: string | null }) {
  const [etat, setEtat] = useState<
    { phase: "chargement" } | { phase: "erreur" } | { phase: "prete"; trouvailles: Trouvaille[] }
  >({ phase: "chargement" });
  const [choisi, setChoisi] = useState(0);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const { chercherMorceau } = await import("@/content/progressions/recherche");
      // L'artiste affine, mais un artiste écrit autrement ferait tout rater :
      // on ne s'en sert que s'il donne un résultat.
      const avec = artiste ? await chercherMorceau(`${artiste} ${titre}`, 8) : [];
      const sans = await chercherMorceau(titre, 8);
      if (!vivant) return;
      setEtat({ phase: "prete", trouvailles: avec.length ? avec : sans });
      setChoisi(0);
    })().catch(() => {
      if (vivant) setEtat({ phase: "erreur" });
    });
    return () => {
      vivant = false;
    };
  }, [titre, artiste]);

  const trouvaille = etat.phase === "prete" ? etat.trouvailles[choisi] : undefined;

  if (etat.phase === "chargement") {
    return <p className="text-sm text-neutral-500">Recherche dans le corpus…</p>;
  }
  if (etat.phase === "erreur") {
    return (
      <p className="text-sm text-neutral-500">
        Corpus indisponible. Il se télécharge à la première consultation en ligne, puis reste
        accessible hors-ligne.
      </p>
    );
  }
  if (etat.trouvailles.length === 0) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-neutral-400">
          « {titre} » n&apos;est pas dans le corpus.
        </p>
        <p className="text-neutral-500">
          Ça n&apos;a rien d&apos;anormal : 18 599 morceaux annotés, c&apos;est peu. Tu peux
          quand même taper ses accords dans{" "}
          <Link href="/enchainements" className="text-emerald-400 underline underline-offset-2">
            Enchaînements
          </Link>{" "}
          pour les chiffrer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <NoteCorpus court />

      {etat.trouvailles.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">
            {etat.trouvailles.length} morceaux du corpus portent ce titre — choisis le bon :
          </p>
          <div className="flex flex-wrap gap-2">
            {etat.trouvailles.map((t, i) => (
              <button
                key={t.morceau.id}
                type="button"
                onClick={() => setChoisi(i)}
                className={
                  "min-h-11 rounded-lg border px-3 text-left text-xs " +
                  (i === choisi
                    ? "border-emerald-600 bg-emerald-950/40 text-emerald-200"
                    : "border-neutral-800 text-neutral-400 hover:bg-neutral-900")
                }
              >
                <span className="block text-neutral-200">{t.morceau.titre}</span>
                <span className="block text-neutral-500">{t.morceau.artiste}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {trouvaille && (
        // Remonté à chaque changement de morceau : le détail se recharge sans
        // qu'un effet ait à remettre l'état à zéro.
        <DetailTrouvaille key={trouvaille.morceau.id} trouvaille={trouvaille} />
      )}

      <SourceCorpus />
    </div>
  );
}

function DetailTrouvaille({ trouvaille }: { trouvaille: Trouvaille }) {
  const [detail, setDetail] = useState<{
    morceaux: MorceauCorpus[];
    tronque: boolean;
    lecons: RenvoiLecon[];
  } | null>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const [{ morceauxDeLaProgression }, { leconsPourProgression }] = await Promise.all([
        import("@/content/progressions/recherche"),
        import("@/content/progressions/lecons"),
      ]);
      const r = await morceauxDeLaProgression(
        trouvaille.progression.mode,
        trouvaille.progression.degres,
      );
      if (!vivant) return;
      setDetail({
        morceaux: r?.morceaux ?? [],
        tronque: r?.tronque ?? false,
        lecons: leconsPourProgression(trouvaille.progression),
      });
    })().catch(() => {});
    return () => {
      vivant = false;
    };
  }, [trouvaille]);

  if (!detail) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-3">
      <CarteProgression
        progression={trouvaille.progression}
        morceaux={detail.morceaux}
        tronque={detail.tronque}
        entete={
          <p className="text-sm text-neutral-400">
            Progression signature de{" "}
            <span className="text-neutral-100">{trouvaille.morceau.titre}</span> —{" "}
            {trouvaille.morceau.artiste}. C&apos;est la plus répandue parmi celles que le
            morceau contient, pas la seule.
          </p>
        }
      />

      {detail.lecons.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-300">Les leçons qui l&apos;expliquent</h4>
          <ul className="space-y-1.5">
            {detail.lecons.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/theorie/${l.slug}`}
                  className="flex min-h-11 flex-col justify-center rounded-lg border border-neutral-800 px-3 py-1.5 hover:bg-neutral-900"
                >
                  <span className="text-sm text-neutral-200">{l.titre}</span>
                  <span className="text-xs text-neutral-500">{l.pourquoi}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
