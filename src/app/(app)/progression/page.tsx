import type { Metadata } from "next";
import { ModuleStub } from "@/components/ModuleStub";

export const metadata: Metadata = { title: "Progrès" };

export default function ProgressionPage() {
  return (
    <ModuleStub
      title="Progression"
      intro="Ta routine quotidienne générée automatiquement, la répétition espacée des notions, et le suivi de ta pratique."
      phase="phase 7"
      bullets={[
        "Routine du jour équilibrée selon ce qui est dû",
        "Répétition espacée (SM-2 simplifié) sur la théorie",
        "Série de jours consécutifs et temps de pratique cumulé",
        "Graphiques de progression",
        "Accès rapide au répertoire",
      ]}
    />
  );
}
