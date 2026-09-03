import type { Metadata } from "next";
import { Metronome } from "@/components/technique/Metronome";
import { LatencyCalibration } from "@/components/technique/LatencyCalibration";
import { RhythmGate } from "@/components/technique/RhythmGate";

export const metadata: Metadata = { title: "Technique" };

export default function TechniquePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Technique</h1>
        <p className="mt-2 text-neutral-400">
          Le métronome fonctionne tout de suite. Les mesures de placement
          rythmique, elles, exigent une calibration — sans quoi elles ne
          mesureraient rien.
        </p>
      </header>

      <Metronome />
      <RhythmGate />
      <LatencyCalibration />
    </div>
  );
}
