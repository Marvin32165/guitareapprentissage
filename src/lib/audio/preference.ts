// Source sonore retenue, mémorisée localement.
//
// Ce choix se fait à l'oreille sur /demo/audio et n'a de sens que sur
// l'appareil où on écoute : il vit dans localStorage, pas en base.

import { setGuitarSource, getGuitarSource } from "./guitar";
import { isSourceId, type SourceId } from "./source-ids";

const KEY = "guitare.source-audio";

export function readStoredSource(): SourceId | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw && isSourceId(raw) ? raw : null;
  } catch {
    // Stockage refusé (navigation privée stricte) : on garde le défaut.
    return null;
  }
}

/** Applique la préférence enregistrée. À appeler une fois au démarrage. */
export function applyStoredSource(): SourceId {
  const stored = readStoredSource();
  if (stored) setGuitarSource(stored);
  return stored ?? getGuitarSource();
}

export function storeSource(id: SourceId): void {
  setGuitarSource(id);
  try {
    localStorage?.setItem(KEY, id);
  } catch {
    /* non bloquant : la session courante utilise quand même la source */
  }
  for (const notify of listeners) notify();
}

// Petit store externe, pour que React lise la préférence via
// useSyncExternalStore : localStorage n'existe pas au rendu serveur, et la
// remplir depuis un effet déclencherait un rendu supplémentaire.

const listeners = new Set<() => void>();

export function subscribeSource(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Instantané client. Une chaîne : la comparaison par valeur suffit à React. */
export function getSourceSnapshot(): SourceId | null {
  return readStoredSource();
}

/** Au rendu serveur, aucune préférence n'est connue. */
export function getServerSourceSnapshot(): SourceId | null {
  return null;
}
