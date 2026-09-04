// Le cadre à ne jamais laisser implicite : ce corpus décrit des DEGRÉS.
// Il apparaît partout où des morceaux du corpus sont affichés — la nuance
// coûte trois lignes, et sans elle l'app promet ce qu'elle ne tient pas.

export function NoteCorpus({ court = false }: { court?: boolean }) {
  return (
    <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200/90">
      <p>
        <strong className="font-semibold text-amber-100">
          Des progressions en degrés, pas des morceaux.
        </strong>{" "}
        Le corpus dit qu&apos;un morceau enchaîne un I, un V, un vi et un IV. Il ne
        dit pas quels accords exacts il joue, ni sa mélodie, ni comment le jouer.
      </p>
      {!court && (
        <p className="mt-2 text-amber-200/70">
          Deux morceaux qui partagent une progression ne se ressemblent pas
          forcément : le tempo, le rythme, les renversements, l&apos;instrumentation
          font le reste. Et l&apos;analyse est celle d&apos;un contributeur, pas une
          vérité.
        </p>
      )}
    </div>
  );
}

export function SourceCorpus() {
  return (
    <div className="space-y-0.5 text-xs text-neutral-600">
      <p>
        Corpus TheoryTab (Hooktheory), publié par Chris Donahue avec Sheet Sage. Embarqué
        dans l&apos;app : consultable hors-ligne.
      </p>
      {/* Le lien est sur sa propre ligne : dans le fil du texte, il ferait une
          cible tactile de 16 px. */}
      <a
        href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.fr"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex min-h-11 items-center underline decoration-neutral-700 underline-offset-2 hover:text-neutral-400"
      >
        Licence CC BY-NC-SA 3.0
      </a>
    </div>
  );
}
