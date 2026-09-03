"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { startAudio } from "@/lib/audio/engine";
import { applyStoredSource } from "@/lib/audio/preference";

type AudioContextValue = {
  ready: boolean;
  unlock: () => Promise<void>;
};

const Ctx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  const unlock = useCallback(async () => {
    // La source choisie sur /demo/audio n'est lue qu'ici : avant le premier
    // geste utilisateur, aucun son n'est produit de toute façon.
    applyStoredSource();
    await startAudio();
    setReady(true);
  }, []);

  const value = useMemo(() => ({ ready, unlock }), [ready, unlock]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudio doit être utilisé dans <AudioProvider>.");
  return ctx;
}

/** Bouton « Activer le son » — geste utilisateur requis (iOS/Web Audio). */
export function AudioUnlockButton({ className }: { className?: string }) {
  const { ready, unlock } = useAudio();
  const [busy, setBusy] = useState(false);

  if (ready) {
    return (
      <span
        className={
          "inline-flex items-center gap-2 text-sm text-emerald-400 " +
          (className ?? "")
        }
      >
        <span aria-hidden>♪</span> Son activé
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await unlock();
        } finally {
          setBusy(false);
        }
      }}
      className={
        "inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 " +
        "text-sm font-medium text-white active:bg-emerald-700 disabled:opacity-60 " +
        (className ?? "")
      }
    >
      <span aria-hidden>♪</span> {busy ? "Activation…" : "Activer le son"}
    </button>
  );
}
