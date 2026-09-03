import Link from "next/link";
import { PracticeControls } from "@/components/practice/PracticeControls";
import { NAV_ITEMS } from "@/lib/nav";
import { Icon } from "@/components/nav/icons";

const modules = NAV_ITEMS.filter((i) => i.href !== "/");

const pitch: Record<string, string> = {
  "/theorie": "Le parcours de leçons : notes, intervalles, gammes, accords…",
  "/oreille": "Reconnaître intervalles, accords et degrés à l'oreille.",
  "/technique": "Métronome et exercices chronométrés.",
  "/progression": "Ta routine du jour, tes séries et tes statistiques.",
  "/repertoire": "Tes morceaux, leur statut et tes notes.",
};

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Bonjour 👋</h1>
        <p className="mt-1 text-neutral-400">
          Guitare en main ? Active le son et lance-toi.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-400">
          Avant de commencer
        </h2>
        <div className="mt-3">
          <PracticeControls />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-400">
          Routine du jour
        </h2>
        <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-neutral-500">
          <p>La routine quotidienne arrivera en phase 7.</p>
          <p className="mt-1 text-sm">
            (une leçon, deux révisions, un exercice d&apos;oreille, un exercice
            technique)
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Bac à sable</h2>
        <Link
          href="/demo/audio"
          className="mb-3 flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
        >
          <span className="rounded-lg bg-neutral-800 p-2 text-emerald-400">
            <Icon name="ear" className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-medium text-neutral-100">Choisir le son de l&apos;application</span>
            <span className="mt-0.5 block text-sm text-neutral-500">
              Cinq questions, à l&apos;aveugle : tu dis lequel tu préfères.
            </span>
          </span>
        </Link>
        <Link
          href="/demo/fretboard"
          className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
        >
          <span className="rounded-lg bg-neutral-800 p-2 text-emerald-400">
            <Icon name="theory" className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-medium text-neutral-100">Manche interactif</span>
            <span className="mt-0.5 block text-sm text-neutral-500">
              Gammes, accords et boîtes penta — touche une note pour l&apos;entendre.
            </span>
          </span>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
            >
              <span className="mt-0.5 rounded-lg bg-neutral-800 p-2 text-emerald-400">
                <Icon name={m.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-medium text-neutral-100">
                  {m.label}
                </span>
                <span className="mt-0.5 block text-sm text-neutral-500">
                  {pitch[m.href]}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
