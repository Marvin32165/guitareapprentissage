import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Client Prisma partagé (singleton en dev pour survivre au HMR).
// Prisma 7 impose un driver adapter au runtime. On utilise libSQL partout :
//   - dev  : SQLite local via une URL `file:` (DATABASE_URL)
//   - prod : Turso via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
//
// Instanciation PARESSEUSE : importer ce module ne doit jamais lever d'erreur,
// même sans base configurée. Cela permet de déployer une première version
// utilisable (leçons, manche, exercices) avec seulement APP_PASSWORD et
// SESSION_SECRET ; la persistance s'active en ajoutant Turso ensuite.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function databaseUrl(): string | undefined {
  return process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(databaseUrl());
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "Base de données non configurée : définir TURSO_DATABASE_URL (prod) ou DATABASE_URL (dev).",
    );
  }
  const adapter = new PrismaLibSql({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const client = new PrismaClient({ adapter });
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Proxy : la connexion n'est créée qu'au premier accès réel. Sans base,
 * l'erreur survient à l'appel (attrapée par les appelants) et non à l'import.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
