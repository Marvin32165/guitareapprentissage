import type { Metadata } from "next";
import { RechercheAccords } from "@/components/progressions/RechercheAccords";

export const metadata: Metadata = { title: "Enchaînements" };

export default function EnchainementsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Enchaînements</h1>
        <p className="mt-2 text-neutral-400">
          Tu joues quatre accords en boucle sans savoir ce que c&apos;est. Tape-les :
          l&apos;app les chiffre en degrés, dit dans quelle tonalité ça se lit, et montre
          quels morceaux connus enchaînent la même chose.
        </p>
      </header>
      <RechercheAccords />
    </div>
  );
}
