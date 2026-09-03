import type { Metadata } from "next";
import { CompareTabs } from "@/components/audio/CompareTabs";

export const metadata: Metadata = { title: "Comparaison audio" };

export default function AudioComparePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Choisir le son</h1>
        <p className="mt-2 text-neutral-400">
          Six sons de guitare possibles pour l&apos;application. Le mode guidé te
          les fait comparer deux par deux, à l&apos;aveugle : tu n&apos;as
          qu&apos;à dire lequel tu préfères.
        </p>
      </header>
      <CompareTabs />
    </div>
  );
}
