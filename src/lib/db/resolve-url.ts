/**
 * Choix de la base à utiliser, isolé ici pour être testable sans charger Prisma.
 *
 * Règle : Turso d'abord. En production, une URL SQLite locale (`file:`) est
 * IGNORÉE volontairement — sur un hébergement serverless, ce fichier est
 * éphémère et propre à chaque instance : les écritures seraient perdues sans
 * le moindre message. Mieux vaut afficher « progression non mémorisée » que
 * faire croire à une sauvegarde qui n'existe pas.
 */
export function resolveDatabaseUrl(
  env: { TURSO_DATABASE_URL?: string; DATABASE_URL?: string; NODE_ENV?: string },
): string | undefined {
  if (env.TURSO_DATABASE_URL) return env.TURSO_DATABASE_URL;

  const local = env.DATABASE_URL;
  if (!local) return undefined;
  if (env.NODE_ENV === "production" && local.startsWith("file:")) return undefined;

  return local;
}
