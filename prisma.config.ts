import { defineConfig, env } from "@prisma/config";

// Prisma 7 : la config CLI vit ici (le schéma ne porte plus l'URL).
// On charge .env manuellement (Node 22+) pour que env("DATABASE_URL") soit résolu.
try {
  process.loadEnvFile();
} catch {
  // .env absent (ex: CI/prod avec variables déjà injectées) — on continue.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Utilisé par migrate/introspection. En dev : SQLite local (file:./dev.db).
  datasource: {
    url: env("DATABASE_URL"),
  },
});
