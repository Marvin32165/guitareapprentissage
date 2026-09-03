import type { Metadata } from "next";
import { PorteeDemo } from "@/components/notation/PorteeDemo";

export const metadata: Metadata = { title: "Portée" };

export default function PorteePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Lire sur le manche</h1>
        <p className="mt-2 text-neutral-400">
          La portée ne sert à rien seule. Ici elle est toujours accompagnée du
          manche et du son : une note lue, c&apos;est une case à trouver et un
          son à reconnaître.
        </p>
      </header>
      <PorteeDemo />
    </div>
  );
}
