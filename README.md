# Guitare — Apprentissage

Plateforme personnelle (mono-utilisateur) d'apprentissage de la guitare et de
la théorie musicale. **Mobile-first** : pensée pour le téléphone posé à côté de
soi, guitare en main. Installable (PWA), sombre par défaut.

> Règle de conception : aucune notion théorique n'est présentée de façon
> abstraite. Chaque concept est ancré sur un diagramme de manche, un son
> jouable et une application concrète.

## Stack

- **Next.js 16** (App Router) + **TypeScript** — Turbopack par défaut
- **Tailwind CSS v4** — thème sombre par défaut
- **Prisma 7** + **SQLite** (dev) / **Turso — libSQL** (prod), via le driver
  adapter `@prisma/adapter-libsql` (même dialecte partout)
- **Tone.js** — synthèse audio et métronome
- **Vitest** — tests de la logique musicale
- Auth minimale : un mot de passe unique + cookie de session httpOnly signé
  (aucun compte, aucun NextAuth/OAuth)
- Déploiement **Vercel** + **Turso**

## Prérequis

- Node.js **≥ 20.9** (développé sous Node 22)

## Installation

```bash
npm install
cp .env.example .env      # puis renseigner APP_PASSWORD et SESSION_SECRET
npm run db:migrate        # crée prisma/dev.db et applique les migrations
npm run dev               # http://localhost:3000
```

Générer un `SESSION_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Variables d'environnement

| Variable             | Rôle                                                        | Dev            | Prod           |
| -------------------- | ----------------------------------------------------------- | -------------- | -------------- |
| `APP_PASSWORD`       | Mot de passe unique de connexion                            | requis         | requis         |
| `SESSION_SECRET`     | Secret HMAC de signature du cookie de session (≥ 16 car.)   | requis         | requis         |
| `DATABASE_URL`       | URL SQLite locale (`file:./prisma/dev.db`)                  | requis         | —              |
| `TURSO_DATABASE_URL` | URL de la base Turso (`libsql://…`)                         | —              | requis         |
| `TURSO_AUTH_TOKEN`   | Jeton d'accès Turso                                         | —              | recommandé     |

En production, dès que `TURSO_DATABASE_URL` est défini, le client Prisma bascule
automatiquement sur Turso ; sinon il utilise `DATABASE_URL`.

## Scripts

| Script                | Action                                          |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Serveur de développement                        |
| `npm run build`       | Build de production                             |
| `npm run start`       | Serveur de production                           |
| `npm run lint`        | ESLint                                          |
| `npm run test`        | Tests Vitest (une passe)                        |
| `npm run test:watch`  | Tests Vitest en watch                           |
| `npm run db:migrate`  | Crée/applique une migration (dev)               |
| `npm run db:push`     | Pousse le schéma sans migration (prototypage)   |
| `npm run db:studio`   | Prisma Studio                                   |

## Base de données (dev → prod)

- **Dev** : SQLite local dans `prisma/dev.db`.
- **Prod** : Turso (libSQL), même dialecte SQLite.
- Prisma 7 déporte l'URL de la CLI dans `prisma.config.ts` et impose un driver
  adapter au runtime (voir `src/lib/db/prisma.ts`).

Workflow de migration vers Turso :

```bash
# 1. Développer/tester les migrations en local (SQLite)
npm run db:migrate --name ma_migration

# 2. Appliquer le SQL généré à Turso
turso db shell <nom-base> < prisma/migrations/<horodatage>_ma_migration/migration.sql
```

## PWA / hors-ligne

- Manifest servi sur `/manifest.webmanifest` (`src/app/manifest.ts`).
- Service worker écrit à la main (`public/sw.js`), enregistré **en production
  uniquement** (évite d'interférer avec le HMR en dev).
- Stratégie : navigations en *network-first* avec repli sur le cache, assets
  statiques en *stale-while-revalidate* → la théorie déjà consultée reste
  disponible hors-ligne.
- Wake Lock (`src/lib/hooks/useWakeLock.ts`) : l'écran reste allumé pendant la
  pratique.
- Déverrouillage audio (`src/components/audio`) : bouton « Activer le son »
  requis avant tout son (politique d'autoplay iOS / Web Audio).

> **À implémenter en phase 7 — file d'écritures hors-ligne (outbox).**
> Les réponses d'oreille et les révisions espacées écrivent dans le journal
> append-only `PracticeEvent`. Hors-ligne, ces écritures devront être mises en
> file dans une **outbox IndexedDB** côté client, puis rejouées vers le serveur
> à la reconnexion (idéalement via Background Sync, avec repli sur un flush au
> retour en ligne). Non codé pour l'instant.

## Déploiement (Vercel + Turso)

1. Créer une base Turso : `turso db create guitare` puis récupérer l'URL
   (`turso db show guitare`) et un jeton (`turso db tokens create guitare`).
2. Appliquer les migrations à Turso (voir ci-dessus).
3. Sur Vercel, définir `APP_PASSWORD`, `SESSION_SECRET`, `TURSO_DATABASE_URL`,
   `TURSO_AUTH_TOKEN`.
4. Déployer (le `postinstall` lance `prisma generate`).

## Sécurité — avertissement d'audit

`npm audit` peut signaler quelques vulnérabilités : elles proviennent
**uniquement de l'outillage de développement de Prisma** (`prisma` CLI →
`@prisma/config` / `@prisma/studio-core` → hono, lodash…). Ces paquets ne font
pas partie du bundle de production déployé sur Vercel. Ne pas lancer
`npm audit fix --force` : cela ferait régresser Prisma vers une pré-version.

## État d'avancement (par phases)

1. ✅ **Fondations** — Next.js, Tailwind, Prisma, auth, layout responsive, PWA
2. ✅ **Moteur musical** — théorie pure en TS (`src/lib/music`) + 42 tests
   Vitest, dont des tests de référence à valeurs codées en dur (harmonisation
   Do/Sol, 5 boîtes pentatoniques La mineur, 7 modes de Do)
3. ✅ **Fretboard + audio** — composant SVG responsive (`src/components/fretboard`)
   avec orientations verticale/horizontale, code couleur par fonction, notes
   cliquables (son via Tone.js + nom/degré), et page démo `/demo/fretboard`
4. ⬜ Module théorie (leçons + exercices)
5. ⬜ Module oreille
6. ⬜ Module métronome & technique
7. ⬜ Module progression (répétition espacée, routine, stats, répertoire)
8. ⬜ Déploiement

## Structure

```
src/
  app/            # routes (App Router)
    (app)/        # pages authentifiées (avec coquille de navigation)
    login/        # page publique de connexion
    api/auth/     # login / logout
    manifest.ts   # manifest PWA
  components/      # UI (navigation, audio, pratique…)
  lib/
    music/        # ★ moteur musical (phase 2, pur + testé)
    auth/         # session (cookie signé HMAC)
    db/           # client Prisma (adapter libSQL)
    hooks/        # useWakeLock…
    audio/        # Tone.js
  content/lessons/ # contenu des leçons « as code » (phase 4)
prisma/           # schéma + migrations
public/           # sw.js, icônes
```
