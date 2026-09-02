"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// Wake Lock API : empêche l'écran de s'éteindre pendant une session de
// pratique (guitare en main). Se ré-acquiert automatiquement quand l'onglet
// redevient visible (le verrou est relâché par le navigateur au blur).

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

const emptySubscribe = () => () => {};

export function useWakeLock() {
  const [active, setActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const wantRef = useRef(false);

  // Détection de support côté client sans mismatch d'hydratation
  // (false au rendu serveur).
  const supported = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && "wakeLock" in navigator,
    () => false,
  );

  const acquire = useCallback(async () => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    try {
      const sentinel = await nav.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        setActive(false);
        sentinelRef.current = null;
      });
      setActive(true);
    } catch {
      setActive(false);
    }
  }, []);

  const enable = useCallback(async () => {
    wantRef.current = true;
    await acquire();
  }, [acquire]);

  const disable = useCallback(async () => {
    wantRef.current = false;
    try {
      await sentinelRef.current?.release();
    } catch {
      /* ignore */
    }
    sentinelRef.current = null;
    setActive(false);
  }, []);

  const toggle = useCallback(() => {
    return active || wantRef.current ? disable() : enable();
  }, [active, disable, enable]);

  // Ré-acquisition au retour de visibilité.
  useEffect(() => {
    const onVisible = () => {
      if (wantRef.current && document.visibilityState === "visible") {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void sentinelRef.current?.release().catch(() => {});
    };
  }, [acquire]);

  return { active, supported, enable, disable, toggle };
}
