import type { Metadata } from "next";
import { ModuleStub } from "@/components/ModuleStub";

export const metadata: Metadata = { title: "Oreille" };

export default function OreillePage() {
  return (
    <ModuleStub
      title="Entraînement de l'oreille"
      intro="Des exercices à difficulté progressive, pondérés vers ce que tu rates le plus."
      phase="phase 5"
      bullets={[
        "Reconnaissance d'intervalles (mélodiques et harmoniques)",
        "Qualité d'accord : majeur, mineur, diminué, 7e",
        "Reconnaissance de progressions courantes",
        "Identification de degré dans une tonalité",
        "Justesse : retrouver une note jouée sur le manche",
      ]}
    />
  );
}
