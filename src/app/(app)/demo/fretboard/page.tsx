import type { Metadata } from "next";
import { FretboardDemo } from "@/components/fretboard/FretboardDemo";

export const metadata: Metadata = { title: "Démo manche" };

export default function FretboardDemoPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Manche interactif</h1>
        <p className="mt-1 text-neutral-400">
          Gammes, arpèges, accords et boîtes pentatoniques sur le manche. Touche une
          note pour l&apos;entendre et voir son degré. Bac à sable du composant qui
          servira dans les leçons.
        </p>
      </header>
      <FretboardDemo />
    </div>
  );
}
