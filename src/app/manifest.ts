import type { MetadataRoute } from "next";

// Servi automatiquement sur /manifest.webmanifest (convention Next 16).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guitare — Apprentissage",
    short_name: "Guitare",
    description:
      "Théorie musicale et pratique de la guitare, ancrées sur le manche.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "fr",
    dir: "ltr",
    categories: ["education", "music"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
