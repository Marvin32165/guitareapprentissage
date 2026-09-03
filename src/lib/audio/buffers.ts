// Chargement paresseux des échantillons, avec cache persistant.
//
// Deux niveaux :
//   1. Cache API (`caches`) — survit à la fermeture de l'onglet, donc les
//      échantillons ne sont retéléchargés qu'au changement de version.
//   2. Map en mémoire — évite de redécoder à chaque note.
//
// Rien ici ne dépend de Tone.js : on manipule des AudioBuffer natifs, ce qui
// laisse le contrôle complet de chaque pincement (indispensable pour étouffer
// une corde qui rejoue).

const CACHE_NAME = "guitare-echantillons-v1";

const decoded = new Map<string, AudioBuffer>();
const inFlight = new Map<string, Promise<AudioBuffer>>();

async function fromCache(url: string): Promise<ArrayBuffer> {
  // Le Cache API n'existe pas partout (contexte non sécurisé, mode privé de
  // certains navigateurs) : on retombe alors sur un simple fetch.
  if (typeof caches === "undefined") {
    return (await fetch(url)).arrayBuffer();
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return hit.arrayBuffer();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} sur ${url}`);
    // `put` consomme la réponse : on la clone avant de la lire.
    await cache.put(url, res.clone());
    return res.arrayBuffer();
  } catch {
    return (await fetch(url)).arrayBuffer();
  }
}

/** Charge et décode un échantillon. Les appels concurrents sont mutualisés. */
export function loadBuffer(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const ready = decoded.get(url);
  if (ready) return Promise.resolve(ready);

  const pending = inFlight.get(url);
  if (pending) return pending;

  const p = (async () => {
    const bytes = await fromCache(url);
    const buffer = await ctx.decodeAudioData(bytes);
    decoded.set(url, buffer);
    inFlight.delete(url);
    return buffer;
  })();

  inFlight.set(url, p);
  p.catch(() => inFlight.delete(url));
  return p;
}

export function isBufferReady(url: string): boolean {
  return decoded.has(url);
}

/** Nombre d'échantillons décodés en mémoire (diagnostic). */
export function decodedCount(): number {
  return decoded.size;
}

/** Purge le cache persistant — utile après un changement de jeu. */
export async function clearSampleCache(): Promise<void> {
  decoded.clear();
  inFlight.clear();
  if (typeof caches !== "undefined") {
    await caches.delete(CACHE_NAME).catch(() => {});
  }
}
