"use client";

import { useEffect } from "react";
import { flushOutbox } from "@/lib/offline/post";

// Rejoue la file d'écritures au démarrage et au retour de la connexion.
//
// Silencieux par nature : si tout se passe bien il n'y a rien à annoncer, et
// prévenir l'utilisateur qu'on vient de rattraper une panne réseau ne
// l'aiderait pas.

export function OutboxFlusher() {
  useEffect(() => {
    const rejouer = () => {
      void flushOutbox().catch(() => {});
    };
    rejouer();
    window.addEventListener("online", rejouer);
    return () => window.removeEventListener("online", rejouer);
  }, []);

  return null;
}
