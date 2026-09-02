import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Client Prisma partagé (singleton en dev pour survivre au HMR).
// Prisma 7 impose un driver adapter au runtime. On utilise libSQL partout :
//   - dev  : SQLite local via une URL `file:` (DATABASE_URL)
//   - prod : Turso via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
// Même dialecte → aucune divergence de comportement entre dev et prod.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Base de données non configurée : définir TURSO_DATABASE_URL (prod) ou DATABASE_URL (dev).",
    );
  }
  const adapter = new PrismaLibSql({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
