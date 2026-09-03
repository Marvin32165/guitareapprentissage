import type { Stats } from "@/lib/review/queries";

// Statistiques.
//
// Pas de score global, pas de pourcentage de « maîtrise » : des comptes bruts.
// Un chiffre unique qui résume la progression est flatteur et faux — il mélange
// des choses qui ne se comparent pas, et il se met à guider le travail au lieu
// de le décrire.

function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
      <p className="text-2xl font-semibold tabular-nums text-neutral-100">{valeur}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{libelle}</p>
    </div>
  );
}

export function StatsPanel({ stats }: { stats: Stats }) {
  const max = Math.max(1, ...stats.parJour.map((j) => j.count));
  const oreille = stats.oreille.attempts;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-400">Où tu en es</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Chiffre
          valeur={String(stats.serie)}
          libelle={`jour${stats.serie > 1 ? "s" : ""} d'affilée`}
        />
        <Chiffre
          valeur={`${stats.leconsTerminees}/${stats.leconsTotal}`}
          libelle="leçons terminées"
        />
        <Chiffre
          valeur={`${stats.notionsSuivies}/${stats.notionsTotal}`}
          libelle="notions en révision"
        />
        <Chiffre
          valeur={oreille ? `${stats.oreille.correct}/${oreille}` : "—"}
          libelle="réponses d'oreille"
        />
      </div>

      {stats.parJour.length > 0 && (
        <figure className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex h-20 items-end gap-1.5">
            {stats.parJour.map((j) => (
              <div key={j.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={
                    "w-full rounded-t " + (j.count ? "bg-emerald-600" : "bg-neutral-800")
                  }
                  style={{ height: `${Math.max(3, (j.count / max) * 100)}%` }}
                  title={`${j.count} exercice${j.count > 1 ? "s" : ""}`}
                />
                <span className="text-[10px] text-neutral-600">
                  {new Date(j.date + "T12:00:00").toLocaleDateString("fr-FR", {
                    weekday: "narrow",
                  })}
                </span>
              </div>
            ))}
          </div>
          <figcaption className="mt-2 text-xs text-neutral-500">
            Exercices faits sur les sept derniers jours. Le nombre, pas la
            qualité — celle-ci ne se résume pas.
          </figcaption>
        </figure>
      )}

      <p className="text-xs text-neutral-600">
        Aucun score global : il mélangerait des choses qui ne se comparent pas,
        et finirait par guider le travail au lieu de le décrire.
      </p>
    </section>
  );
}
