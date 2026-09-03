import type { Metadata } from "next";
import { AudioCompare } from "@/components/audio/AudioCompare";

export const metadata: Metadata = { title: "Comparaison audio" };

export default function AudioComparePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Comparaison des sources</h1>
        <p className="mt-2 text-neutral-400">
          Six sources sur les mêmes notes, corde par corde. Égalise les niveaux,
          puis choisis celle que tu veux entendre dans toute l&apos;application.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Mon avis, à vérifier à ton oreille : la <strong className="text-neutral-300">6</strong> (Martin
          HD28) devrait gagner. Elle couvre tout le manche sans raccord et sans
          longue transposition, et elle est en domaine public. Commence par
          l&apos;opposer à la <strong className="text-neutral-300">1</strong>, puis
          vérifie le raccord de la <strong className="text-neutral-300">5</strong>.
        </p>
      </header>
      <AudioCompare />
    </div>
  );
}
