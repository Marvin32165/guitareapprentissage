import type { Metadata } from "next";
import { ModuleStub } from "@/components/ModuleStub";

export const metadata: Metadata = { title: "Théorie" };

export default function TheoriePage() {
  return (
    <ModuleStub
      title="Théorie & gammes"
      intro="Un parcours progressif de leçons courtes, chaque notion ancrée sur le manche, sur un son jouable et sur une application concrète."
      phase="phase 4 (après le moteur musical et le manche interactif)"
      bullets={[
        "Notes sur le manche, demi-tons et tons",
        "Intervalles et leur repérage visuel",
        "Gamme majeure, système CAGED, gamme mineure",
        "Accords, harmonisation, degrés et progressions",
        "Pentatoniques, modes, tensions et substitutions",
      ]}
    />
  );
}
