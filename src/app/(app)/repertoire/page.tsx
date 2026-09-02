import type { Metadata } from "next";
import { ModuleStub } from "@/components/ModuleStub";

export const metadata: Metadata = { title: "Répertoire" };

export default function RepertoirePage() {
  return (
    <ModuleStub
      title="Répertoire"
      intro="Ta liste de morceaux, saisie à la main : titre, tonalité, tempo cible, statut et notes libres. Aucune tablature — uniquement tes propres repères."
      phase="phase 7"
      bullets={[
        "Statut : en cours / acquis",
        "Tonalité et tempo cible",
        "Notes libres personnelles",
      ]}
    />
  );
}
