import { defineConfig, env } from "@prisma/config";

// Prisma 7 : la config CLI vit ici (le schéma ne porte plus l'URL).
// On charge .env quand il existe (dev). En CI/production (Vercel), il n'y a ni
// .env ni DATABASE_URL : `prisma generate` doit malgré tout fonctionner, donc
// le bloc `datasource` — utile uniquement aux commandes migrate/introspect —
// n'est ajouté que si l'URL est réellement disponible.
try {
  process.loadEnvFile();
} catch {
  // .env absent : variables déjà injectées par l'environnement, ou build distant.
}

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(databaseUrl ? { datasource: { url: env("DATABASE_URL") } } : {}),
});
