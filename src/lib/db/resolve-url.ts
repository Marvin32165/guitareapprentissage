/**
 * Choix de la base à utiliser, isolé ici pour être testable sans charger Prisma.
 *
 * Règle : Turso d'abord. Ensuite, une URL SQLite locale (`file:`) est ignorée
 * UNIQUEMENT en environnement serverless (Vercel, Lambda) : là, le fichier est
 * éphémère et propre à chaque instance, donc les écritures disparaîtraient sans
 * le moindre message. Mieux vaut afficher « progression non mémorisée » que
 * faire croire à une sauvegarde inexistante.
 *
 * En revanche, sur une machine normale — y compris `next start` en mode
 * production — un fichier SQLite persiste très bien : on l'utilise.
 */
export function resolveDatabaseUrl(
  env: Record<string, string | undefined>,
): string | undefined {
  if (env.TURSO_DATABASE_URL) return env.TURSO_DATABASE_URL;

  const local = env.DATABASE_URL;
  if (!local) return undefined;

  const serverless = Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME);
  if (serverless && local.startsWith("file:")) return undefined;

  return local;
}
