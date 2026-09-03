import type { Metadata } from "next";
import { EarTrainer } from "@/components/ear/EarTrainer";

export const metadata: Metadata = { title: "Oreille" };

export default function OreillePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Entraînement de l&apos;oreille</h1>
        <p className="mt-2 text-neutral-400">
          Écoute, réponds, puis regarde où ça tombe sur le manche. Il ne s&apos;agit
          pas de deviner juste : il s&apos;agit de relier un son à un endroit sous
          tes doigts.
        </p>
      </header>
      <EarTrainer />
    </div>
  );
}
