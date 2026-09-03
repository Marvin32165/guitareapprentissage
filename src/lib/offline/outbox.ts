// File d'écritures hors-ligne.
//
// L'application est faite pour être utilisée guitare en main, souvent sans
// réseau fiable. Une réponse d'exercice perdue parce que le wifi a lâché est
// une petite chose, mais elle fausse la répétition espacée : le journal est la
// source de vérité, et un journal troué produit un calendrier de révisions faux.
//
// Toute écriture rejouable passe donc par ici. En cas d'échec réseau, elle est
// mise en file et repartira au retour de la connexion.
//
// Le stockage est INJECTABLE : la logique de file se teste ainsi sans
// IndexedDB, avec une implémentation en mémoire.

export interface OutboxEntry {
  id: string;
  url: string;
  body: string;
  /** Nombre de tentatives déjà faites. */
  tries: number;
  queuedAt: number;
}

export interface OutboxStore {
  all: () => Promise<OutboxEntry[]>;
  put: (entry: OutboxEntry) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Au-delà, on abandonne : ce n'est plus un problème de réseau. */
export const MAX_TRIES = 5;
/** Plafond de la file, pour ne pas remplir le stockage indéfiniment. */
export const MAX_ENTRIES = 500;

export function newEntry(url: string, body: unknown): OutboxEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    url,
    body: JSON.stringify(body),
    tries: 0,
    queuedAt: Date.now(),
  };
}

export interface FlushResult {
  sent: number;
  kept: number;
  dropped: number;
}

/**
 * Rejoue la file. Une entrée n'est retirée que si le serveur a répondu — un
 * échec réseau la conserve, une réponse 4xx la jette (elle ne passera jamais).
 */
export async function flush(
  store: OutboxStore,
  send: (url: string, body: string) => Promise<{ ok: boolean; status: number }>,
): Promise<FlushResult> {
  const entries = await store.all();
  const result: FlushResult = { sent: 0, kept: 0, dropped: 0 };

  // Ordre d'arrivée : le journal doit rester chronologique.
  for (const entry of [...entries].sort((a, b) => a.queuedAt - b.queuedAt)) {
    let reponse: { ok: boolean; status: number } | null = null;
    try {
      reponse = await send(entry.url, entry.body);
    } catch {
      reponse = null;
    }

    if (reponse?.ok) {
      await store.remove(entry.id);
      result.sent += 1;
      continue;
    }

    // Une requête refusée pour cause de contenu ne passera jamais : la garder
    // bloquerait la file derrière elle à chaque tentative.
    if (reponse && reponse.status >= 400 && reponse.status < 500) {
      await store.remove(entry.id);
      result.dropped += 1;
      continue;
    }

    const tries = entry.tries + 1;
    if (tries >= MAX_TRIES) {
      await store.remove(entry.id);
      result.dropped += 1;
    } else {
      await store.put({ ...entry, tries });
      result.kept += 1;
    }
  }
  return result;
}

/** Ajoute une écriture à la file, en écartant les plus vieilles si besoin. */
export async function enqueue(
  store: OutboxStore,
  url: string,
  body: unknown,
): Promise<void> {
  const entries = await store.all();
  if (entries.length >= MAX_ENTRIES) {
    const trop = entries
      .sort((a, b) => a.queuedAt - b.queuedAt)
      .slice(0, entries.length - MAX_ENTRIES + 1);
    for (const e of trop) await store.remove(e.id);
  }
  await store.put(newEntry(url, body));
}

// ------------------------------------------------------- stockage IndexedDB

const DB_NAME = "guitare-outbox";
const STORE = "entries";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Store IndexedDB, ou null si indisponible (navigation privée stricte). */
export function indexedDbStore(): OutboxStore | null {
  if (typeof indexedDB === "undefined") return null;
  return {
    async all() {
      const db = await openDb();
      return tx<OutboxEntry[]>(db, "readonly", (s) => s.getAll() as IDBRequest<OutboxEntry[]>);
    },
    async put(entry) {
      const db = await openDb();
      await tx(db, "readwrite", (s) => s.put(entry));
    },
    async remove(id) {
      const db = await openDb();
      await tx(db, "readwrite", (s) => s.delete(id));
    },
  };
}

/** Store en mémoire : repli, et support des tests. */
export function memoryStore(): OutboxStore {
  const map = new Map<string, OutboxEntry>();
  return {
    all: async () => [...map.values()],
    put: async (e) => void map.set(e.id, e),
    remove: async (id) => void map.delete(id),
  };
}
