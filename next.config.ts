import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma et le client libSQL chargent des binaires natifs : on les sort du
  // bundle serveur pour qu'ils soient requis depuis node_modules à l'exécution
  // (évite les erreurs de binding en environnement serverless).
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],

  async headers() {
    return [
      {
        // En-têtes de sécurité globaux.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // Les échantillons sont immuables : leur nom encode la note, et un
        // nouveau jeu s'installe dans un nouveau dossier. On peut donc les
        // mettre en cache agressivement.
        source: "/audio/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Le service worker ne doit jamais être mis en cache par le navigateur,
        // pour que les mises à jour soient prises en compte immédiatement.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
