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

## Déploiement (Vercel + Turso) — runbook

`main` est la branche de production : c'est elle que Vercel construit. Le code
y est fusionné et le build est vérifié.

L'app démarre **sans base de données** : tu peux déployer en deux minutes avec
deux variables, puis brancher Turso quand tu veux pour mémoriser la progression.

### Option A — mettre en ligne tout de suite (2 variables, ~2 min)

Tu obtiens les leçons, le manche interactif et les exercices. La progression
n'est pas encore mémorisée (un bandeau te le rappelle dans l'app).

1. Générer un secret :
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Sur GitHub → dépôt → **Settings → General → Default branch** → basculer sur
   **`main`**. (Sans ça, Vercel suivrait la branche de travail et tes futurs
   déploiements ne partiraient pas de `main`.)
3. vercel.com → **Add New… → Project** → importer `guitareapprentissage`.
   Framework Next.js détecté, aucun réglage de build à changer.
   Vérifier ensuite Settings → Git → **Production Branch : `main`**.
4. Environment Variables (*Production*) — renseignables dès l'import :

   | Variable | Valeur |
   | --- | --- |
   | `APP_PASSWORD` | le mot de passe pour entrer dans l'app |
   | `SESSION_SECRET` | la chaîne générée à l'étape 1 |

5. **Deploy**. Ouvre l'URL : elle redirige vers `/login`. Sur le téléphone,
   « Ajouter à l'écran d'accueil » installe la PWA.

### Option B — activer la persistance (Turso)

À faire quand tu veux que les leçons terminées et le journal d'exercices soient
conservés.

1. Créer la base :
   ```bash
   curl -sSfL https://tur.so/install.sh | bash   # une fois
   turso auth login
   turso db create guitare
   turso db show guitare --url        # -> TURSO_DATABASE_URL (libsql://…)
   turso db tokens create guitare     # -> TURSO_AUTH_TOKEN
   ```
2. Appliquer le schéma. Le fichier **`prisma/schema.sql`** réunit toutes les
   migrations : une seule commande (ou un seul copier-coller dans la console
   SQL du tableau de bord Turso).
   ```bash
   turso db shell guitare < prisma/schema.sql
   turso db shell guitare ".tables"   # vérification : 9 tables
   ```
3. Ajouter sur Vercel `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`, puis
   **redéployer**. (`DATABASE_URL` n'est pas utilisé en production : dès que
   `TURSO_DATABASE_URL` existe, le client Prisma bascule sur Turso.)

### Vérifier que la persistance marche

Va dans **Théorie**, termine une leçon, reviens au parcours et recharge : le
badge « Terminée » doit rester, et le bandeau d'avertissement doit avoir disparu.

### Mise en place depuis un PC partagé ou emprunté

Rien d'important ne reste sur la machine : le code est sur GitHub, l'hébergement
sur Vercel, la base sur Turso. Le PC ne sert que de navigateur.

- **Option A : aucune trace.** Tout se fait sur vercel.com. Rien à installer,
  pas besoin de cloner le dépôt. Fais-le dans une **fenêtre de navigation
  privée** : en la fermant, sessions et cookies disparaissent.
- **Option B sans rien installer :** le tableau de bord Turso permet de créer la
  base, de récupérer l'URL et un jeton, et d'exécuter du SQL. Colle alors le
  contenu de **`prisma/schema.sql`** (toutes les migrations réunies en un seul
  fichier, lisible directement sur GitHub) — une seule opération.
- **Option B avec la CLI :** si tu installes `turso`, pense ensuite à
  `turso auth logout`, puis supprime son dossier de configuration
  (`~/.turso` ou `~/.config/turso`) et le binaire.

Avant de rendre la machine :

1. Se déconnecter de GitHub, Vercel et Turso (ou fermer la fenêtre privée).
2. Ne pas enregistrer les mots de passe dans le navigateur.
3. Si tu as cloné le dépôt, supprimer le dossier — il peut contenir un `.env`.
4. Ne laisser aucun jeton dans un fichier texte ou le presse-papiers.

Tes secrets (`APP_PASSWORD`, `SESSION_SECRET`, jeton Turso) vivent dans les
variables d'environnement Vercel, c'est-à-dire au bon endroit : sur ton compte,
pas sur la machine.

### Pourquoi pas d'hébergement dans l'environnement Claude

Le conteneur de développement est éphémère (il redémarre seul et coupe tout
serveur lancé), et il n'expose aucun ingress public. Il sert à construire et à
tester, pas à héberger.

## Sécurité — avertissement d'audit

`npm audit` peut signaler quelques vulnérabilités : elles proviennent
**uniquement de l'outillage de développement de Prisma** (`prisma` CLI →
`@prisma/config` / `@prisma/studio-core` → hono, lodash…). Ces paquets ne font
pas partie du bundle de production déployé sur Vercel. Ne pas lancer
`npm audit fix --force` : cela ferait régresser Prisma vers une pré-version.

## État d'avancement (par phases)

1. ✅ **Fondations** — Next.js, Tailwind, Prisma, auth, layout responsive, PWA
2. ✅ **Moteur musical** — théorie pure en TS (`src/lib/music`) + tests Vitest,
   dont des tests de référence à valeurs codées en dur (harmonisation majeure
   Do/Sol **et mineure nat./harm.** La, 5 boîtes pentatoniques La mineur, 7
   modes de Do, cohérence orthographique Fa#/Solb)
3. ✅ **Fretboard + audio** — composant SVG responsive (`src/components/fretboard`) :
   orientations verticale/horizontale, code couleur par fonction, notes
   cliquables (son Tone.js + nom/degré), **accordages paramétrables** (Standard,
   Drop D, DADGAD, Open G, Open D, Mi♭), **capo** (forme vs nom réel), **gaucher/
   droitier**, **double nommage latin/anglo**, page démo `/demo/fretboard`
4. **Module théorie — découpé en trois**
   - 4a ✅ **Parcours + 4 premières leçons + exercices** (notes sur le manche,
     intervalles, gamme majeure, CAGED) **→ déploiement Vercel + Turso**
   - 4b ⬜ Notation sur portée (VexFlow) + parcours de lecture
   - 4c ⬜ Les 7 leçons restantes + formes d'accords ouverts (CAGED)
5. ⬜ Module oreille (+ exercice de conversion latin ↔ anglo)
6. ⬜ Module métronome & technique (+ détection micro, backing tracks échantillonnés)
7. ⬜ Module progression (répétition espacée, routine, stats, répertoire,
   analyse de session, export/import JSON)
8. ⬜ Déploiement final

Le détail des ajouts par phase est dans la **feuille de route** ci-dessous.

## Feuille de route détaillée (ajouts planifiés)

Ces éléments sont **planifiés** et affectés à une phase précise. On ne code que
la phase en cours ; tout le reste est documenté ici.

### Fait — complément moteur (phase 2 bis)
- Harmonisation **mineure** (naturelle, harmonique, mélodique) avec chiffrage
  romain, dérivée du même moteur générique que le majeur.
- Tests de référence : La mineur naturelle (i, ii°, III, iv, v, VI, VII) et La
  mineur harmonique (III+, **V majeur**, **vii° = Sol#°**).
- Test de cohérence orthographique : Fa# et Solb majeur, sans double altération.

### Fait — phase 3 (Fretboard)
- **Accordages en paramètre** (jamais en dur) : Standard, Drop D, DADGAD,
  Open G, Open D, Mi♭ standard.
- **Capodastre** : barre visuelle, transposition du son, et nom **forme vs
  réel** (« forme de Mi mineur, sonne en Sol mineur » avec capo 3).
- **Gaucher / droitier** : inversion de l'ordre des cordes.
- **Double nommage** latin (Do Ré Mi) / anglo-saxon (C D E) : réglage du système
  principal ; le relevé de note affiche les deux (« Mi (E) »).
- *Reporté en phase 4* : bibliothèque de **formes d'accords ouverts** (CAGED)
  rendues sur le manche — utile surtout dans les leçons CAGED.

### Phase 4 — Théorie + notation sur portée
- Parcours de 11 leçons (contenu « as code », blocs prose/manche/audio/exercice).
- **Notation sur portée : VexFlow** (choix justifié ci-dessous). Afficher gammes,
  accords et intervalles en notation classique **à côté** du diagramme de manche ;
  parcours de lecture progressif (clé de sol, valeurs rythmiques, altérations,
  armures) ; **affichage synchronisé portée + manche + son** sur un même élément.
- **Premier déploiement Vercel + Turso à la fin de la phase 4** : théorie et
  gammes suffisent à une pratique quotidienne ; le reste s'ajoute en cours d'usage.

> **VexFlow vs abcjs — décision : VexFlow.** L'app génère la notation
> *programmatiquement* depuis le moteur (notes orthographiées, degrés, accords).
> VexFlow donne le contrôle par tête de note nécessaire pour (a) colorer chaque
> note selon sa fonction, en miroir du code couleur du manche, (b) synchroniser
> finement note de portée ↔ position sur le manche ↔ audio (on possède déjà
> l'ordonnanceur Tone.js), (c) rendre n'importe quelle gamme/accord/intervalle
> sans écrire de texte ABC. abcjs (rendu d'ABC + surbrillance audio intégrée)
> est excellent pour des partitions ABC toutes faites, mais orienté texte et
> moins adapté au coloriage piloté par les données et au partage d'une seule
> couche audio avec le manche. Compromis : la surbrillance rythmique est à
> construire (acceptable, l'ordonnanceur existe). abcjs reste candidat si un
> sous-module « lecture de vrais morceaux » en ABC apparaît plus tard.

### Phase 5 — Oreille
- **Exercice dédié de conversion latin ↔ anglo-saxon** (avec altérations),
  intégré ensuite à la répétition espacée (planification SR en phase 7).

### Phase 6 — Technique et audio
- **Détection de hauteur par le micro** : YIN ou autocorrélation via
  **AudioWorklet** (jamais sur le thread principal). Place réservée dans
  l'architecture (`src/lib/audio/analysis/` + worklet). Usages : vérifier une
  note/gamme jouée, valider un exercice sans auto-évaluation, mesurer la
  précision rythmique face au métronome. **Accordeur chromatique** si trivial
  une fois le moteur en place.
- **Backing tracks (exigence de qualité sonore élevée)** — ceci **annule** la
  décision « synthèse uniquement » pour ce module :
  - `Tone.Sampler` avec des échantillons **batterie et basse** de qualité,
    issus de banques **libres de droits (CC0 / domaine public)** ; licence de
    chaque pack **vérifiée et documentée**.
  - Accords synthétisés si le rendu convainc, sinon échantillons.
  - Génération depuis n'importe quelle grille : tonalité, tempo, style (pop,
    rock, blues, ballade, bossa), mesures, boucle.
  - **Offline** : stratégie explicite (précache d'un pack minimal +
    téléchargement à la demande) et **poids total documenté**.
  - Affichage de la **gamme conseillée** sur le manche pendant la lecture.

### Phase 7 — Progression et répertoire
- **Analyse de session par le micro, SANS stockage audio** : analyse en temps
  réel, aucun enregistrement conservé ; seules les **métriques** et le retour
  rédigé sont sauvegardés (table dédiée `SessionFeedback`, consultable dans
  l'historique). Métriques : justesse (centièmes), avance/retard moyen vs
  métronome + écart-type, régularité du tempo, conformité à la gamme/grille,
  notes propres vs étouffées si détectable de façon fiable. **Honnêteté sur les
  limites** : pas de jugement sur le son/toucher/musicalité, pas de score global
  flatteur — on affiche les métriques réelles.
- **Retour rédigé par l'API Anthropic** : modèle **`claude-sonnet-4-6`** via le
  SDK officiel `@anthropic-ai/sdk`, appelé **côté serveur** (route handler), clé
  dans `ANTHROPIC_API_KEY` (jamais exposée au client). On envoie les métriques
  de la session **et l'historique des sessions précédentes du même exercice**,
  pour des conseils tenant compte de l'évolution.
- **Durée choisie avant chaque session** (5, 15, 30, 45 min, ou libre) : le
  générateur de routine compose en conséquence (5 min → révisions dues
  seulement ; 45 min → leçon + révisions + oreille + technique + jeu libre sur
  backing track).
- **Export / import JSON complet** de la base (progression, révisions,
  statistiques, répertoire, retours de session) : manuel **et** automatique une
  fois par semaine, avec réimportation. (Turso gratuit = base unique : filet de
  sécurité indispensable.)
- **File d'écritures hors-ligne (outbox IndexedDB)** : rejeu des écritures de
  `PracticeEvent` à la reconnexion (Background Sync, repli sur flush).
- **API Hooktheory** : progressions d'accords de morceaux existants (détail à
  fournir). Toujours **aucun scraping**, **aucune tablature générée**.

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
