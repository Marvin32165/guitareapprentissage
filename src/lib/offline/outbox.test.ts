import { describe, it, expect } from "vitest";
import {
  memoryStore,
  enqueue,
  flush,
  newEntry,
  MAX_TRIES,
  MAX_ENTRIES,
  type OutboxEntry,
} from "./outbox";

describe("file hors-ligne", () => {
  it("conserve une écriture qui échoue pour cause de réseau", async () => {
    const store = memoryStore();
    await enqueue(store, "/api/practice-event", { type: "ear_interval", refId: "P5" });
    const r = await flush(store, async () => {
      throw new Error("hors-ligne");
    });
    expect(r).toEqual({ sent: 0, kept: 1, dropped: 0 });
    expect(await store.all()).toHaveLength(1);
  });

  it("envoie et retire une écriture quand le réseau revient", async () => {
    const store = memoryStore();
    await enqueue(store, "/api/practice-event", { type: "review", refId: "octave" });
    const envoyes: string[] = [];
    const r = await flush(store, async (url, body) => {
      envoyes.push(`${url} ${body}`);
      return { ok: true, status: 200 };
    });
    expect(r.sent).toBe(1);
    expect(await store.all()).toHaveLength(0);
    expect(envoyes[0]).toContain("octave");
  });

  it("jette une écriture refusée pour son contenu, qui ne passerait jamais", async () => {
    // Sans ça, une requête invalide bloquerait la file derrière elle à chaque
    // tentative, indéfiniment.
    const store = memoryStore();
    await enqueue(store, "/api/review", { conceptId: "inexistante" });
    const r = await flush(store, async () => ({ ok: false, status: 400 }));
    expect(r.dropped).toBe(1);
    expect(await store.all()).toHaveLength(0);
  });

  it("réessaie une erreur serveur, puis abandonne après plusieurs tentatives", async () => {
    const store = memoryStore();
    await enqueue(store, "/api/practice-event", { type: "x", refId: "y" });
    for (let i = 1; i < MAX_TRIES; i++) {
      const r = await flush(store, async () => ({ ok: false, status: 503 }));
      expect(r.kept, `tentative ${i}`).toBe(1);
    }
    const dernier = await flush(store, async () => ({ ok: false, status: 503 }));
    expect(dernier.dropped).toBe(1);
    expect(await store.all()).toHaveLength(0);
  });

  it("rejoue dans l'ordre d'arrivée", async () => {
    // Le journal doit rester chronologique : c'est lui qui sert de source de
    // vérité pour la répétition espacée.
    const store = memoryStore();
    const base = Date.now();
    for (const [i, ref] of ["c", "a", "b"].entries()) {
      const e: OutboxEntry = { ...newEntry("/api/x", { ref }), queuedAt: base + (2 - i) * 1000 };
      await store.put(e);
    }
    const ordre: string[] = [];
    await flush(store, async (_url, body) => {
      ordre.push(JSON.parse(body).ref);
      return { ok: true, status: 200 };
    });
    expect(ordre).toEqual(["b", "a", "c"]);
  });

  it("ne laisse pas la file grossir sans fin", async () => {
    const store = memoryStore();
    for (let i = 0; i < MAX_ENTRIES + 10; i++) {
      await enqueue(store, "/api/practice-event", { i });
    }
    expect((await store.all()).length).toBeLessThanOrEqual(MAX_ENTRIES);
  });

  it("une file vide se vide sans rien faire", async () => {
    const store = memoryStore();
    let appels = 0;
    const r = await flush(store, async () => {
      appels += 1;
      return { ok: true, status: 200 };
    });
    expect(r).toEqual({ sent: 0, kept: 0, dropped: 0 });
    expect(appels).toBe(0);
  });
});

describe("rejeux concurrents", () => {
  it("deux rejeux lancés ensemble n'envoient pas deux fois la même écriture", async () => {
    // Le cas réel : au retour du réseau, « online » est émis pendant que le
    // rejeu du montage tourne encore. Sans verrou, le journal double.
    const store = memoryStore();
    await enqueue(store, "/api/practice-event", { type: "ear_interval", refId: "P5" });

    const envoyes: string[] = [];
    const send = async (_url: string, body: string) => {
      // Un aller-retour réseau n'est pas instantané : c'est pendant ce délai
      // que le second rejeu lit la même file.
      await new Promise((r) => setTimeout(r, 20));
      envoyes.push(body);
      return { ok: true, status: 200 };
    };

    // Sans protection, les deux rejeux voient la même entrée.
    await Promise.all([flush(store, send), flush(store, send)]);
    expect(envoyes.length, "la file a été envoyée deux fois").toBe(2);

    // Avec le verrou de `flushOutbox`, un seul part réellement.
    const store2 = memoryStore();
    await enqueue(store2, "/api/practice-event", { type: "ear_interval", refId: "P5" });
    const envoyes2: string[] = [];
    let verrou: Promise<unknown> | null = null;
    const protege = () => {
      if (verrou) return verrou;
      verrou = flush(store2, async (_u, body) => {
        await new Promise((r) => setTimeout(r, 20));
        envoyes2.push(body);
        return { ok: true, status: 200 };
      }).finally(() => {
        verrou = null;
      });
      return verrou;
    };
    await Promise.all([protege(), protege()]);
    expect(envoyes2.length).toBe(1);
  });
});
