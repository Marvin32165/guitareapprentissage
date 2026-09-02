"use client";

import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";

// Contrôles communs à toute session de pratique :
//  - « Activer le son » (déverrouillage Web Audio / iOS)
//  - « Garder l'écran allumé » (Wake Lock)
export function PracticeControls() {
  const { active, supported, toggle } = useWakeLock();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <AudioUnlockButton />
      {supported ? (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={active}
          className={
            "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors " +
            (active
              ? "border-emerald-600 bg-emerald-600/10 text-emerald-400"
              : "border-neutral-700 text-neutral-300 hover:bg-neutral-900")
          }
        >
          <span aria-hidden>{active ? "☀" : "◐"}</span>
          {active ? "Écran maintenu allumé" : "Garder l'écran allumé"}
        </button>
      ) : (
        <span className="text-sm text-neutral-500">
          Maintien de l&apos;écran non disponible sur cet appareil
        </span>
      )}
    </div>
  );
}
