// Envoi d'une écriture, avec repli sur la file hors-ligne.
//
// À utiliser pour tout ce qui alimente le journal : une réponse perdue fausse
// la répétition espacée, qui se calcule à partir de lui.
//
// N'est PAS à utiliser pour ce qui doit réussir tout de suite et dont
// l'utilisateur attend le résultat à l'écran (connexion, export) : rejouer plus
// tard n'y aurait aucun sens.

import {
  indexedDbStore,
  memoryStore,
  enqueue,
  flush,
  type OutboxStore,
  type FlushResult,
} from "./outbox";

let store: OutboxStore | null = null;

function getStore(): OutboxStore {
  if (!store) store = indexedDbStore() ?? memoryStore();
  return store;
}

export type PostResult = { sent: true; body: unknown } | { sent: false; queued: boolean };

/** Poste du JSON ; en cas de panne réseau, met en file plutôt que de perdre. */
export async function postJson(url: string, body: unknown): Promise<PostResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { sent: true, body: await res.json().catch(() => null) };
    // Une réponse 4xx est définitive : la rejouer ne servirait à rien.
    if (res.status >= 400 && res.status < 500) return { sent: false, queued: false };
  } catch {
    /* panne réseau : on met en file ci-dessous */
  }

  try {
    await enqueue(getStore(), url, body);
    return { sent: false, queued: true };
  } catch {
    return { sent: false, queued: false };
  }
}

/**
 * Rejoue la file, une seule fois à la fois.
 *
 * Le verrou n'est pas une précaution théorique : au retour de la connexion, le
 * navigateur émet « online » pendant que le rejeu du montage tourne encore.
 * Deux rejeux concurrents lisent la même file et envoient les mêmes écritures —
 * mesuré : trois réponses hors-ligne réapparaissaient six fois en base. Un
 * journal en double fausse les statistiques ET la répétition espacée.
 */
let enCours: Promise<FlushResult> | null = null;

export function flushOutbox(): Promise<FlushResult> {
  if (enCours) return enCours;
  enCours = flush(getStore(), async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return { ok: res.ok, status: res.status };
  }).finally(() => {
    enCours = null;
  });
  return enCours;
}
