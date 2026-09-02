import type { Metadata } from "next";
import { ModuleStub } from "@/components/ModuleStub";

export const metadata: Metadata = { title: "Technique" };

export default function TechniquePage() {
  return (
    <ModuleStub
      title="Exercices techniques"
      intro="Un métronome précis (ordonnancement par lookahead, jamais setInterval) et une bibliothèque d'exercices chronométrés."
      phase="phase 6"
      bullets={[
        "Métronome : accents, subdivisions, accélération progressive",
        "Chromatismes, changements d'accords, arpèges",
        "Transitions CAGED, patterns de gammes",
        "Tempo cible, tempo actuel, historique des tempos atteints",
        "Minuteur de session avec objectif de durée",
      ]}
    />
  );
}
