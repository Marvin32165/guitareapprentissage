"use client";

import { useEffect } from "react";

// Enregistre le service worker en production uniquement : en dev, un SW qui
// met en cache les chunks _next casse le rechargement à chaud (HMR).
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* silencieux : la PWA reste utilisable sans SW */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
