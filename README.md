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

### Variable optionnelle

| Variable | Rôle |
| --- | --- |
| `ANTHROPIC_API_KEY` | Active le **retour rédigé** sur une séance. Sans elle, la fonction est indisponible et le dit ; tout le reste fonctionne. La clé reste côté serveur, jamais exposée au client. |

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

- File d'écritures hors-ligne (outbox IndexedDB) : **faite**, voir plus bas.
- Corpus de progressions : embarqué dans le code, chargé à la demande puis gardé
  par le service worker — voir plus bas.

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

## Son de guitare — sources, licences, décision

Le son de l'application est en cours de refonte (chantier A). La synthèse
actuelle (Tone.js `PluckSynth`, Karplus-Strong) s'écrase dans les aigus et n'a
aucun corps de caisse dans les médiums ; elle est conservée comme **repli** —
un clic ne doit jamais produire de silence — mais pas comme son principal.

Six sources sont comparables à l'oreille sur **`/demo/audio`** : mêmes notes,
même grille corde par corde, niveau réglable pour comparer honnêtement. Le
détail des licences, des provenances et des retouches est dans
[`CREDITS.md`](CREDITS.md).

| # | Source | Étendue échantillonnée | Licence | Poids |
| --- | --- | --- | --- | --- |
| 1 | Synthèse actuelle | — | — | 0 |
| 2 | University of Iowa | Ré2 → Ré5 | CC-BY 3.0 | 2,1 Mo (extrait de 16 notes) |
| 3 | FluidR3 acier | tout le manche | CC-BY 3.0 | 412 ko (21 notes) |
| 4 | FluidR3 nylon | tout le manche | CC-BY 3.0 | 380 ko (21 notes) |
| 5 | Hybride Iowa + FluidR3 | Ré2 → Do8, raccord à Ré5 | CC-BY 3.0 | — |
| 6 | **Martin HD28** | **Mi2 → Si5, un échantillon / 3 demi-tons** | **CC0 1.0** | **345 ko opus / 428 ko mp3** |

### Comment le choix se fait

`/demo/audio` propose deux modes. Par défaut, la **comparaison guidée** :
cinq manches, deux extraits par manche, une seule question — lequel tu
préfères. Les noms sont **cachés** jusqu'au verdict (sinon c'est l'étiquette
qu'on juge : « captations réelles » gagne d'avance), et le gagnant de chaque
manche affronte le suivant. Aucune habitude d'écoute comparative n'est
nécessaire. L'**exploration libre** garde la grille corde par corde et les
tests ciblés, pour vérifier un point précis quand on sait ce qu'on cherche.

**Les niveaux sont égalisés automatiquement.** Mesurés à l'EBU R128, les jeux
s'écartaient de plus de **12 dB** (FluidR3 acier à −33,1 LUFS, Iowa à
−20,8) : une source 12 dB plus forte est jugée meilleure quelle que soit sa
qualité. C'est le biais le plus grossier d'une comparaison à l'oreille, et le
seul que l'auditeur ne peut pas corriger sans matériel de mesure — le laisser
à un curseur manuel revenait à demander une compétence d'ingénieur du son.
La correction est appliquée **par dossier d'échantillons**, et non par source :
l'hybride mélange deux captations, et son « raccord » aurait sinon été un saut
de volume de 12 dB plutôt qu'une différence de timbre. Les fichiers ne sont pas
modifiés, la correction est un gain à la lecture.

La comparaison passe par le **même moteur** que le reste de l'application
(`guitar.ts`) : ce qu'on juge est exactement ce qu'on obtiendra.

**Recommandation, à confirmer à l'oreille : la 6.** Elle est arrivée après la
construction de la page, en fouillant les dépôts SFZ ouverts sur GitHub. C'est
une vraie Martin HD28, un seul instrument sur toute l'étendue utile — donc ni
raccord entre deux captations, ni transposition longue — en **domaine public**,
et six fois plus légère que le jeu Iowa pour une couverture bien plus large.
Si elle convainc, la question du raccord de la 5 et celle du trou de tessiture
d'Iowa disparaissent toutes les deux.

### Ce qui a été retouché sur la source 6

Les fichiers d'origine sonnent **bas** : de −5 cents dans le grave à −13,5 cents
dans l'aigu. `scripts/build-samples.mjs` mesure la hauteur réelle de chaque
fichier (autocorrélation normalisée avec interpolation parabolique du pic),
rééchantillonne pour la poser sur la hauteur tempérée exacte, puis encode en
Opus et en MP3. Vérification après encodage : **écart maximal 0,1 cent**.

```bash
npm i -D ffmpeg-static   # ou définir FFMPEG_PATH
node scripts/build-samples.mjs <dossier-wav> public/audio/compare/martin --slug=martin
```

Le script écrit un `manifest.json` à côté des fichiers (écart mesuré,
correction appliquée, durée, poids note par note). Les chiffres de cette
documentation en sont tirés.

### ⚠️ Aucune source n'est échantillonnée corde par corde

C'est une limite réelle du projet, pas un détail d'implémentation : **aucune
des six sources n'est échantillonnée corde par corde.** Toutes donnent *une
captation par hauteur*. Concrètement, Mi4 joué corde 1 case 0 et Mi4 joué corde
4 case 14 déclenchent le **même fichier**, alors que sur une vraie guitare ces
deux notes n'ont ni le même timbre, ni la même attaque, ni la même durée.

Un **filtrage « filées / nues »** a été implémenté pour atténuer ce défaut :
creux dans le haut médium et extinction plus rapide des partiels sur les cordes
graves, brillance conservée sur les aiguës. Il a été **comparé à l'aveugle sur
le cas même où il devait servir** — ce Mi4 aux deux positions, niveaux égalisés,
côté traité tiré au sort. **Il ne s'entendait pas. Il a donc été retiré.**

C'était le bon test : une approximation qu'on ne distingue pas de son absence
n'améliore rien et reste du code à maintenir. La limite est donc assumée telle
quelle, et seul un jeu réellement échantillonné corde par corde la lèverait.

### Ce qui descend sur le téléphone

Les six jeux d'échantillons restent dans le dépôt pour pouvoir refaire la
comparaison, mais **un seul est joué** et les cinq autres ne doivent jamais
partir sur l'appareil. Trois garde-fous, vérifiés par des tests
(`src/lib/audio/precache.test.ts`) et au navigateur :

- Le **service worker ne précharge rien** et exclut explicitement `/audio/`.
  Son cache contient 0 entrée audio après visite des pages.
- Le **catalogue des sources est chargé dynamiquement** par le moteur, au
  premier son seulement : `/theorie` et `/demo/fretboard` ne le téléchargent
  pas. Les identifiants de source, eux, tiennent dans un module minuscule sans
  aucun chemin de fichier.
- Le **chargement des échantillons est note par note**, dans un cache dédié
  (`guitare-echantillons-v1`) : un appui sur le manche demande un fichier, pas
  quinze.

### Le moteur de jeu (`src/lib/audio/guitar.ts`)

Au-dessus de la source choisie, quatre choses qu'un simple lecteur
d'échantillons ne fait pas :

- **Étouffement par corde.** Une corde ne porte qu'une note à la fois :
  rejouer la corde de Sol coupe ce qu'elle tenait, les autres continuent de
  sonner. C'est pour ça que chaque pincement pilote son propre
  `AudioBufferSourceNode` au lieu de passer par un `Tone.Sampler`, qui
  raisonne par hauteur et non par corde.
- **Balayage.** Un accord s'attaque corde après corde, sur 15 à 30 ms, de la
  grave vers l'aiguë (ou l'inverse en coup montant).
- **Petite pièce.** Une convolution courte sur une réponse impulsionnelle
  **calculée à l'exécution** (bruit filtré à décroissance exponentielle) : rien
  à embarquer, donc aucune licence à vérifier. Ce n'est pas une vraie pièce,
  juste de quoi enlever l'effet « note posée sur du silence ».

Le chargement est **paresseux** : seul l'échantillon le plus proche de la note
demandée est téléchargé, puis conservé dans le **Cache API**
(`guitare-echantillons-v1`), donc conservé d'une session à l'autre. Un premier
appui sur le manche déclenche une requête, pas quinze.

Le repli sur la synthèse reste actif à chaque étage — un appui ne doit jamais
produire de silence — mais il est désormais **signalé en console hors
production**. Ce silence délibéré avait masqué un vrai bug : le moteur se
branchait sur `Tone.getDestination().input`, qui est un nœud Tone et non un
nœud Web Audio natif, et toutes les notes retombaient sur la synthèse sans
que rien ne le dise.

Le choix de source se fait sur `/demo/audio` et vaut pour toute l'application
(manche interactif compris) ; il est mémorisé en `localStorage`, donc **par
appareil** — ce qui est cohérent, puisqu'il se juge au casque ou au haut-parleur
qu'on a sous la main.

### Justesse : ce qui a été mesuré

« La note affichée est-elle exactement la note jouée ? » a été vérifié à trois
niveaux, parce qu'une erreur peut se loger à chacun.

**1. Théorie** (`src/lib/music/accuracy.test.ts`, dans la suite). Le manche
affiche un nom calculé par `fretboardPositions` et joue une hauteur calculée
par `midiAtFret` : deux chemins de code distincts, que rien n'oblige à rester
d'accord. Le test compare les deux sur **tous** les accordages, capos 0 à 7,
six cordes, cases 0 à 15, plus les degrés annoncés et les cordes à vide.

**2. Échantillons** (`npm run audit:pitch`, hors suite car il demande ffmpeg).
Refait le trajet complet — position → nom affiché → MIDI → échantillon choisi →
vitesse de lecture → **fréquence mesurée** — sur les 96 positions du manche, en
important les fonctions réelles du moteur plutôt qu'en recopiant leurs formules.

| Source | Écart maximal sur 96 positions |
| --- | --- |
| Martin HD28 | **0,1 ct** (corrigée au build) |
| FluidR3 nylon | 2,3 ct |
| FluidR3 acier | 4,7 ct |
| Iowa | 5,5 ct |
| Hybride | 5,5 ct |

Toutes sous 6 cents, soit très en deçà du seuil d'audibilité. Le trou de
tessiture d'Iowa est un problème de **timbre**, pas de justesse : une
transposition reste exacte, seul le son s'étire.

**3. Synthèse de repli.** Là, un vrai défaut. Karplus-Strong fait circuler le
signal dans une ligne à retard d'un nombre **entier** d'échantillons : les
hauteurs atteignables sont `cadence / N`, une grille qui s'élargit vers l'aigu
(29 cents entre deux crans à 740 Hz). Tone arrondit cette longueur **vers le
haut**, ce qui rend toutes les notes basses — mesuré au navigateur :
**−23,4 cents sur Fa5**, −22,9 sur Sol5, −21,0 sur Ré5, les valeurs tombant au
dixième de cent sur la grille `44100/N`.

`pluckFrequency` vise désormais l'entier le **plus proche** au lieu de subir
l'arrondi par excès : le pire écart passe à **−11,7 cents**, ce qui est la
limite de la méthode à cette hauteur (une demi-largeur de cran). Aller plus
loin demanderait une ligne à retard à interpolation, donc un moteur maison —
disproportionné pour un chemin qui ne sert que si les échantillons manquent.

Au passage, la mesure chiffre la plainte d'origine : à Mi4 la synthèse s'éteint
en **0,10 s**, contre 0,53 s sur le Mi grave. Une corde pincée d'une vraie
guitare tient plusieurs secondes.

### Freesound : ce qui a été trouvé, et ce que je ne peux pas faire d'ici

L'environnement de développement **ne peut pas atteindre Freesound** : la
politique réseau sortante refuse la connexion (`connect_rejected`, 403 au
CONNECT). Même chose pour `philharmonia.co.uk`, `theremin.music.uiowa.edu` et
`archive.org`. Je n'ai donc pu ni ouvrir, ni écouter, ni télécharger quoi que
ce soit sur ces sites ; la recherche s'est faite **par moteur de recherche**.

Elle a quand même donné un résultat net : **des jeux de guitare échantillonnés
corde par corde existent bien sur Freesound**, chez
[`Carlos_Vaquero`](https://freesound.org/people/Carlos_Vaquero/) — packs
[9537](https://freesound.org/people/Carlos_Vaquero/packs/9537/) et
[9538](https://freesound.org/people/Carlos_Vaquero/packs/9538/), intitulés
« Classical Guitar: Single notes Non Vibrato **String 1** », 14 à 16 sons
chacun, 440 Hz, mezzoforte. Deux réserves invérifiables d'ici : la licence
paraît être **CC BY-NC** (donc pas CC0, mais compatible avec un usage
personnel), et c'est une guitare **classique nylon**, pas acier.

**Protocole si tu veux creuser** (10 minutes, il faut un compte gratuit) :

1. Ouvre <https://freesound.org/people/Carlos_Vaquero/packs/> et cherche les
   packs « Classical Guitar ». Note **combien de packs** couvrent les 6 cordes
   et l'étendue de chacun.
2. Sur la page d'un son du pack, relève la **licence exacte** affichée
   (« Creative Commons 0 », « Attribution », « Attribution NonCommercial »).
   C'est le seul point qui peut disqualifier le jeu.
3. Pour une recherche plus large : <https://freesound.org/search/>, requête
   `guitar note`, puis dans le filtre de gauche **License → Creative Commons 0**,
   et l'onglet **Packs** plutôt que Sounds — un jeu complet est toujours publié
   comme pack.
4. Si tu trouves mieux, envoie-moi simplement **l'URL du pack et la licence
   affichée**. L'ajout d'une source ne touche ni le moteur ni l'interface :
   c'est une entrée de plus dans `src/lib/audio/sources.ts`.

### Enregistrer toi-même les notes manquantes — protocole

**À ne faire que si la source 6 ne te convainc pas.** Elle couvre déjà
Mi2 → Si5 ; le trou de tessiture d'Iowa (Ré5 → Sol5) n'existe plus si tu la
retiens. Ce protocole ne sert que dans le cas contraire.

*Ce qu'il faut jouer* — 5 notes, toutes sur la **corde de Mi aigu** :

| Note | Corde | Case | Fréquence attendue |
| --- | --- | --- | --- |
| Mi♭5 | Mi aigu (1re) | 11 | 622,25 Hz |
| Mi5 | Mi aigu (1re) | 12 | 659,26 Hz |
| Fa5 | Mi aigu (1re) | 13 | 698,46 Hz |
| Fa♯5 | Mi aigu (1re) | 14 | 739,99 Hz |
| Sol5 | Mi aigu (1re) | 15 | 783,99 Hz |

*Comment* :

- **Accorde au chromatique avant**, à 440 Hz, et revérifie la corde de Mi aigu
  entre chaque prise. C'est le seul point non rattrapable : je peux corriger un
  décalage constant, pas une corde qui dérive.
- Une note **seule**, pincée franchement mais sans forcer (nuance mezzoforte),
  **laissée sonner jusqu'au bout** — n'étouffe pas, ne bouge pas la main.
  Compte 4 secondes après l'attaque avant de t'arrêter.
- **3 prises par note**, je garde la meilleure. Soit 15 attaques en tout.
- **1 seconde de silence** avant l'attaque et après l'extinction.

*Où et avec quoi* :

- Pièce calme et plutôt mate (pas de salle de bain carrelée, pas de grande
  pièce vide). Un tapis, un canapé, des rideaux : tout ça aide.
- Téléphone **posé** sur un support stable (table, coussin) à **30–40 cm**,
  pointé vers la **12e case**, pas vers la rosace — droit dans la rosace, c'est
  boomy et inexploitable.
- **Mode avion**, pour qu'aucune notification ne tombe au milieu d'une prise.

*Sous quel format* :

- Le format natif de ton enregistreur convient (`.m4a` iOS Dictaphone, `.wav`
  ou `.m4a` Android). **Ne réencode rien, ne coupe rien, ne normalise rien** :
  je m'occupe du découpage, du calage de hauteur et du niveau.
- Le plus simple : **un seul fichier** avec les 15 attaques dans l'ordre du
  tableau, en annonçant la note à voix haute avant chaque série (« mi bémol »,
  puis 3 prises, puis « mi »…). Je découpe.
- Dépose-le dans `public/audio/perso/` et commit, ou envoie-le-moi directement.

*Ce que tu dois savoir avant de t'y mettre* : un micro de téléphone dans une
pièce ordinaire ne sonnera pas comme une captation de studio. Coller ces 5
notes au bout d'un jeu enregistré ailleurs risque de produire un raccord **plus
audible** que celui que tu voulais éviter. C'est précisément pour ça que la
source 6, qui supprime le problème au lieu de le rapiécer, est la bonne
réponse si elle te plaît à l'écoute.

## Vérification responsive — 375 / 768 / 1440

Les trois largeurs exigées sont vérifiées au navigateur sur les dix pages :
**aucun débordement horizontal, aucune cible tactile sous 44 px.**

Trois défauts réels trouvés par cette vérification, qu'aucun test unitaire
n'aurait attrapés :

- **Le manche débordait de 436 px** sur `/technique`. Trois appelants sur six
  l'enveloppaient dans un conteneur défilant, trois l'avaient oublié. Le
  défilement appartient désormais au composant lui-même : un appelant ne peut
  plus se tromper.
- **À 768 px, toute la page passait à 1072 px** dès l'apparition de la barre
  latérale. Cause classique : sans `min-w-0`, un enfant flex ne rétrécit pas
  sous la largeur de son contenu, et un SVG à largeur explicite pousse tout le
  reste.
- **Curseurs, cases à cocher et bascules sous 44 px** (16, 20 et 40 px). Les
  curseurs sont rehaussés par une règle globale ; la case à cocher du
  métronome est devenue un vrai bouton bascule, plus sûr au doigt.

Ces corrections sont figées par des tests statiques : le symptôme (une page qui
défile latéralement au téléphone) se relie mal à sa cause, et disparaîtrait
sans bruit au prochain remaniement.

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
   - 4b ✅ **Notation sur portée (VexFlow) + parcours de lecture**
   - 4c ✅ **Les 7 leçons restantes + formes d'accords ouverts**

**Ordre de travail en cours** (priorité : résultat abouti plutôt que mise en
service rapide) : **chantier A — refonte du son** (🔄 en cours : six sources
comparables sur `/demo/audio`, en attente du verdict à l'oreille), puis
**chantier B** — déclaration des `conceptId` dans le typage des leçons, en
prévision de la répétition espacée — puis 4b, 4c, 5, 6, 7.
5. ✅ **Module oreille** — intervalles, qualités d'accord, degrés, conversion latin ↔ anglo
6. ✅ **Module technique** — métronome, calibration de latence, accompagnements engendrés
7. ✅ **Module progression** — répétition espacée SM-2, routine, statistiques,
   répertoire, analyse de séance, export/import JSON, file hors-ligne
8. ✅ Déployé en continu sur `main` (Vercel)

Le détail des ajouts par phase est dans la **feuille de route** ci-dessous.

## Feuille de route détaillée (ajouts planifiés)

Ces éléments sont **planifiés** et affectés à une phase précise. On ne code que
la phase en cours ; tout le reste est documenté ici.

### Fait — notions déclarées (préalable à la répétition espacée)

Chaque exercice déclare la **notion** qu'il travaille (`conceptId`), et chaque
leçon la liste de celles qu'elle introduit. Le registre est dans
`src/content/concepts.ts` : étiquette, résumé, et **prérequis**.

Une notion n'est pas une leçon. Une leçon en introduit plusieurs, et une même
notion est retravaillée plus tard par d'autres exercices. C'est la notion, pas
l'exercice, que la répétition espacée (phase 7) planifiera — sans quoi réussir
un QCM ne dirait rien de ce qu'on sait vraiment.

Le champ est **obligatoire dans le typage** : le rendre facultatif reviendrait
à le voir manquer sur la moitié des exercices. Quatre vérifications
automatiques l'accompagnent, dont celle qui compte : **aucune leçon ne peut
s'appuyer sur une notion enseignée plus tard**. Sur un parcours qu'on suit
seul et dans l'ordre, c'est l'erreur la plus coûteuse, et la plus facile à
commettre en ajoutant une leçon au milieu.

Les notions travaillées sont affichées en tête de chaque leçon.

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

### Retour rédigé sur une séance — fait

Un bouton, après la mesure de placement rythmique, demande un court retour écrit
à partir des chiffres obtenus.

**Aucun son n'est transmis.** Le point de terminaison ne reçoit que des
nombres, déjà calculés dans le navigateur ; le signal du micro n'a jamais quitté
l'appareil et a été jeté dès les mesures extraites. Un garde côté serveur refuse
toute charge inhabituelle plutôt que de faire confiance à l'appelant.

Le prompt interdit explicitement toute note, tout score, tout pourcentage de
progression, et interdit de commenter le son, le toucher ou la musicalité — rien
de tout cela n'est mesurable par un micro de téléphone. Une mesure dont
l'incertitude dépasse la valeur doit être annoncée comme telle plutôt
qu'interprétée.

Seuls **les mesures et le texte** sont enregistrés (`PracticeSession.metrics` et
`.feedback`), conformément à la contrainte posée.

**Le modèle a été changé, et c'est délibéré.** Le cahier des charges indiquait
`claude-sonnet-4-6`. L'application utilise `claude-sonnet-5` : même famille,
plus récent, plus capable, et **moins cher** — 2 $/10 $ par million de jetons
contre 3 $/15 $.

Sans `ANTHROPIC_API_KEY`, la fonction est simplement indisponible et le dit ; les
mesures restent affichées telles quelles.

### Corpus de progressions — fait, sans API

L'API Hooktheory a été abandonnée au profit de **jeux de données publics** : pas
de compte, pas d'identifiant dans Vercel, pas de jeton qui expire, et ça
fonctionne hors-ligne. (`api.hooktheory.com` est de toute façon inaccessible
depuis cet environnement de développement — même politique réseau que celle qui
bloque Freesound.)

**18 599 morceaux**, réunis de deux sources :

| Source | Morceaux | Licence |
| --- | ---: | --- |
| Hooktheory / TheoryTab (Sheet Sage) | 12 776 | CC BY-NC-SA 3.0 |
| ChoCo — Billboard | 785 | CC BY 4.0 |
| ChoCo — Isophonics (Beatles, Queen…) | 169 | CC BY 4.0 |
| ChoCo — Robbie Williams | 16 | CC BY 4.0 |
| ChoCo — Wikifonia | 5 569 | CC BY 4.0 |

**Licences vérifiées avant intégration**, comme demandé, et documentées en
détail dans [`CREDITS.md`](CREDITS.md#corpus-de-progressions-daccords). ChoCo est
en CC BY 4.0 — attribution seule — sauf trois sous-collections en CC BY-NC-SA
4.0 que je ne reprends pas. Hooktheory est en CC BY-NC-SA 3.0. Comme le fichier
produit mélange les deux, **c'est la licence la plus stricte qui s'applique** :
cette application ne peut pas être commercialisée tant que les données
Hooktheory y sont. La contrainte tient dans un seul fichier généré ; retirer la
seule source Hooktheory ferait retomber l'ensemble en CC BY 4.0, au prix de
12 776 morceaux.

Les deux dépôts souvent cités pour « les 5 000 progressions » sont écartés :
licence des données *inconnue* pour l'un, aucune licence et moissonnage pour
l'autre. Sept partitions de ChoCo sont également laissées de côté — licence,
absence de tonalité, notation à retraduire, ou **volume sans identité** (The
Real Book et Band-in-a-Box n'ont aucun nom d'auteur, et des titres comme
« NOTES »). Le tableau complet est dans `CREDITS.md`.

#### Ce qui est extrait — et ce qui ne l'est pas

Des **degrés**. Uniquement. Pas la mélodie, pas les accords réels d'un morceau,
pas de tablature. Un degré est une relation entre deux hauteurs : un fait de
théorie. Le titre et l'artiste sont des faits également.

Quatre règles, toutes destinées à ne rien enseigner de faux :

1. Un morceau n'est retenu que s'il tient dans **une seule tonalité**, majeure
   ou mineure. Les tonalités modales (`G:mixolydian`) sont écartées : leurs
   degrés ne se comptent ni comme en majeur ni comme en mineur.
2. Un accord illisible (accord de quinte sans tierce, accord amputé, marque de
   pédale) **coupe la suite en deux** au lieu d'être sauté. Sauter un accord
   inventerait un enchaînement qui n'existe pas.
3. Un accord enrichi est ramené à son noyau — triade plus septième. `C9` et
   `C13` sont des V7 : les notes en plus ne changent pas le degré.
4. Les répétitions consécutives sont fusionnées : `I I V V` et `I V` sont la
   même progression jouée à deux vitesses.

Le chiffrage est celui du moteur d'harmonie de l'app
(`src/lib/music/degres.ts`), sans quoi le corpus et les leçons parleraient deux
langues. **Un test le prouve de bout en bout** : les 22 614 progressions sont
jouées en accords réels dans les 12 tonalités, ces accords sont relus comme
s'ils étaient tapés à la main, puis rechiffrés — 271 368 aller-retours, zéro
écart.

Une réserve à connaître : **Wikifonia crédite le compositeur**, pas
l'interprète. « Lonesome Town » y est signé Baker Knight, pas Ricky Nelson.
L'interface le dit plutôt que de laisser croire à un interprète. Et sur quelques
morceaux du jeu Billboard, titre et interprète sont intervertis **à la source**.

#### Poids, et comment il est contenu

| Élément | Octets |
| --- | ---: |
| `src/content/progressions/donnees.ts` | 1 196 571 (1 169 ko) |
| dont vocabulaire des degrés (158 distincts) | 1 063 |
| dont table des 22 614 progressions | 203 526 |
| dont 18 599 morceaux (8 826 lignes source + artiste) | 563 529 |
| dont index progression → morceaux | 398 710 |
| **transmis au navigateur (brotli)** | **≈ 465 ko** |

Tout est encodé en chaînes compactes — indices base36, écarts successifs,
regroupement par (source, artiste) — pour que le navigateur lise **quatre
chaînes** au lieu de construire des dizaines de milliers d'objets.

Le fichier n'est **pas** dans le bundle de démarrage : `import()` dynamique,
donc son propre morceau de code, vérifié sur le build (aucun manifeste de page
ne le référence). Une fois chargé, le service worker le garde comme n'importe
quel `/_next/static`. **Vérifié sur le build de production** : service worker
actif, réseau coupé, recherche complète qui répond.

Un test empêche la régression qui le ramènerait dans le bundle de démarrage —
il suffirait d'un `import` statique dans un composant. Un autre vérifie que la
taille annoncée dans l'interface est la vraie.

#### Les trois usages

- **Depuis une leçon** (leçons 5, 8 et 11) : « qui joue ça ? ». Une suite de
  moins de quatre accords (ii – V – I) n'est pas une progression du corpus mais
  un fragment de plusieurs : on liste celles qui la contiennent, une seule
  dépliée à la fois.
- **Depuis le répertoire** : « chercher sa progression » sur un morceau saisi à
  la main. Le corpus rend la progression signature en degrés et renvoie vers les
  leçons concernées, avec la raison du renvoi. Quand le morceau n'y est pas,
  c'est dit sans détour.
- **Recherche inverse** (`/enchainements`) : je tape les accords que je joue.
  **Aucune tonalité n'est demandée** — les douze toniques sont essayées dans les
  deux modes, et toutes les lectures qui tombent sur une progression connue sont
  montrées. « C G Am F » est I – V – vi – IV en do majeur **et**
  III – VII – i – VI en la mineur : trancher à ma place serait une invention.

Chaque progression **s'entend** (grille jouée en boucle, tonalité au choix) et
**se pose sur le manche** (pentatonique de la tonalité). Et l'interface répète
partout ce que ces données sont : des progressions en degrés, pas les accords
exacts, pas des morceaux jouables.

#### Reconstruire `donnees.ts`

```sh
curl -LO https://github.com/chrisdonahue/sheetsage-data/raw/refs/heads/main/hooktheory/Hooktheory.json.gz
sha256sum Hooktheory.json.gz   # 917b7cd5…98e0c, empreinte publiée par l'auteur
gunzip Hooktheory.json.gz

git clone --depth 1 --filter=blob:none --no-checkout https://github.com/smashub/choco.git
cd choco && git sparse-checkout set \
  partitions/billboard/choco/jams partitions/isophonics/choco/jams \
  partitions/robbie-williams/choco/jams partitions/wikifonia/choco/jams && git checkout && cd ..

node --max-old-space-size=6144 scripts/build-progressions.mjs \
     --hooktheory=Hooktheory.json --choco=choco/partitions \
     --sortie=src/content/progressions/donnees.ts
```

Ni le fichier de 309 Mo ni le clone de ChoCo ne sont versionnés : seul le
produit fini l'est.

### Analyse de placement rythmique — faite

Derrière la porte de calibration, et nulle part ailleurs : le composant n'est
pas seulement masqué, il n'est **pas rendu** tant que la latence est inconnue.

Une mesure de décompte, quatre mesures de jeu. Les instants d'attaque sont
extraits du signal, corrigés de la latence mesurée, et rattachés au temps le
plus proche. **Le son est ensuite jeté** : rien n'est enregistré, rien n'est
envoyé — conformément à la contrainte posée pour l'analyse de session.

Deux chiffres, **et pas de note globale** :

- le **placement** (devant ou derrière le temps), qui est un biais systématique ;
- la **régularité** (dispersion autour de son propre placement).

Ils ne se mélangent pas : on peut être parfaitement régulier et
systématiquement en retard, et un chiffre unique effacerait justement la
distinction qui sert à corriger.

**L'incertitude de la calibration est propagée.** Si elle vaut ±10 ms, un écart
mesuré de 6 ms n'est pas affiché comme un résultat : il est annoncé comme non
interprétable. Et en dessous de huit attaques retenues, rien n'est conclu du
tout.

Une fenêtre de rattachement d'**un quart de temps**, et non d'un demi : à la
moitié, toute attaque tombe dans la fenêtre d'un temps ou d'un autre, et une
note jouée sur le contretemps serait comptée comme un temps très en retard —
faussant à la fois le biais et la dispersion.

### Accordeur et détection de hauteur — faits

Une note **seule tenue** est la seule chose qu'un micro de téléphone mesure sans
réserve, et l'accordeur en tire tout ce qu'on peut : nom de note, écart en
cents, corde probable, et dans quel sens tourner la mécanique. Aucune
calibration n'est nécessaire — on mesure une fréquence, pas un instant, et la
latence n'y change rien.

L'interface dit d'emblée qu'un **accord gratté ne donnera rien** : la
transcription polyphonique dépasse ce qu'une autocorrélation permet
honnêtement. Quand le signal n'est pas assez périodique, l'affichage
**s'efface** au lieu de garder une valeur périmée — une note affichée alors
qu'on ne joue plus se lit comme une mesure.

**Une erreur d'octave trouvée par les tests.** Prendre le maximum de
l'autocorrélation est faux : un signal de période T corrèle presque aussi bien
avec 2T ou 3T. Mesuré, un Si3 se lisait **1902 cents trop bas**, soit un tiers
de sa fréquence — sur un accordeur, c'est fatal. Le choix de pic à la McLeod
(retenir le premier maximum local qui approche le plus haut, donc le plus petit
retard) règle le cas, et les tests couvrent les six cordes à vide, toute
l'étendue du manche, un fondamental affaibli comme sur un petit micro, et du
bruit blanc — où le détecteur doit refuser de répondre.

**Deux pannes du micro corrigées, dont une invisible en développement :**

- `/worklets/recorder.js` renvoyait **307** : le garde d'authentification
  l'interceptait, exactement comme il avait intercepté les échantillons audio.
  `addModule` suivait la redirection vers `/login`, recevait du HTML, et le
  micro tombait en panne. Un test fige désormais les deux exclusions.
- `Tone.getContext().rawContext` **n'est pas un `BaseAudioContext` natif** mais
  un enrobage `standardized-audio-context`, et `new AudioWorkletNode(...)` le
  refuse. Tout ce qui touche au micro vit maintenant sur un contexte natif
  dédié — ce qui règle aussi la calibration, dont les clics et la capture
  partagent enfin une seule horloge.

### File d'écritures hors-ligne — faite

Notée depuis la phase 2, elle existe. Toute écriture qui alimente le journal
(`PracticeEvent`, progression de leçon, révision) passe par `postJson` : en cas
de panne réseau, elle est mise en file dans IndexedDB et repartira au retour de
la connexion. L'application se sert guitare en main, souvent sans réseau
fiable — et un journal troué produit un calendrier de révisions faux, puisque
c'est lui la source de vérité.

Une réponse 4xx est jetée plutôt que rejouée : elle ne passerait jamais, et la
garder bloquerait la file derrière elle à chaque tentative.

**Un défaut de concurrence trouvé en le vérifiant pour de bon.** En coupant le
réseau, en répondant à trois questions puis en reconnectant, six événements
apparaissaient en base au lieu de trois : au retour de la connexion, le
navigateur émet `online` pendant que le rejeu du montage tourne encore, et les
deux rejeux lisent la même file. `flushOutbox` porte désormais un verrou, et le
test reproduit le cas — il vérifie qu'un rejeu non protégé envoie bien deux
fois, sans quoi il ne prouverait rien.

### Phase 6 — Métronome, calibration, accompagnements : fait

**Le métronome ne dérive pas.** `setInterval` seul se fait bousculer par le
rendu, le ramasse-miettes ou un onglet en arrière-plan, et la dérive s'entend au
bout de quelques minutes. Un `setInterval` grossier ne sert donc qu'à **planifier
à l'avance** des événements datés sur l'horloge de l'AudioContext, qui elle ne
dérive pas. Le repère visuel est retardé jusqu'à l'instant où le clic sonne
vraiment — comparer un temps AudioContext à `performance.now()` mélangerait deux
horloges qui ne partent pas du même zéro.

**La calibration de latence est un prérequis, pas une option.** L'application
émet huit clics par le haut-parleur et les réenregistre par le micro : l'écart
mesure la chaîne complète — tampon de sortie, haut-parleur, air, micro, tampon
d'entrée — **sans faire intervenir le temps de réaction de l'utilisateur**. On
mesure la machine, pas la personne.

Les trois traitements que les navigateurs appliquent par défaut au micro sont
coupés : l'annulation d'écho supprimerait précisément le son qu'on cherche à
réentendre, le contrôle automatique de gain écraserait les niveaux, la réduction
de bruit rognerait les attaques. Un micro « amélioré » ne mesure rien.

Le détecteur a été vérifié contre des retards **connus** : sur un signal de
synthèse, il retrouve 20, 45, 90, 180 et 300 ms à moins de 3 ms près, y compris
en environnement bruyant. Une mesure trop dispersée (±12 ms) ou fondée sur moins
de quatre clics est **rejetée** plutôt que présentée comme un résultat.

**Sans calibration, aucune métrique de placement rythmique n'est affichée** —
pas assortie d'un avertissement : pas affichée. Un chiffre accompagné d'une
réserve reste un chiffre : on le retient, on le compare, on s'en sert. Sans
latence connue, il ne mesure rien. À 120 bpm une double croche dure 125 ms,
quand la latence va de 20 à 300 : l'écart affiché viendrait autant du téléphone
que du jeu.

La page dit aussi, avant même de commencer, **ce qui ne sera jamais mesuré** :
les notes d'un accord gratté, la dynamique, le son et le toucher.

**Les accompagnements sont engendrés, pas téléchargés.** Le cahier des charges
prévoyait des backing tracks échantillonnés sous licence CC0 vérifiée. Deux
raisons d'avoir fait autrement : les hébergeurs d'échantillons sont
inaccessibles depuis l'environnement de développement, donc leur licence est
invérifiable ; et surtout un accompagnement construit à partir de la guitare
**déjà échantillonnée** n'a aucune licence en jeu, se transpose dans les douze
tonalités, suit n'importe quel tempo et sonne comme le reste de l'application.
Un fichier figé ne fait rien de tout ça.

Six grilles (I–V–vi–IV, I–vi–IV–V, ii–V–I, I–IV–V, et deux mineures) sont
**dérivées du moteur d'harmonie**, pas saisies à la main, et vérifiées dans
huit tonalités : chaque note appartient bien à la tonalité, la basse est la
fondamentale, les voix montent sans croisement. La pentatonique qui tombe sur
la grille est affichée sous le lecteur — c'est là qu'on peut jouer sans fausse
note.

À dire franchement, plutôt que de le laisser découvrir : ni batterie, ni basse
jouée, ni production. Une grille qui tourne, pour travailler par-dessus.

### Phase 5 — Oreille : fait

Quatre exercices sur `/oreille` : intervalles, qualités d'accord, degrés dans
une tonalité, et conversion latin ↔ anglo. Trois niveaux qui ouvrent
progressivement le répertoire.

**Aucune réponse ne s'arrête à « juste / faux »** : ce qui vient d'être entendu
est montré sur le manche et peut être rejoué. Reconnaître une tierce mineure
sans savoir où elle tombe sous les doigts n'apprend rien à quelqu'un qui a
l'instrument en main.

La génération des questions est séparée de l'interface et vérifiée sur
400 tirages par exercice : la bonne réponse figure toujours parmi les
propositions, les notes jouées correspondent réellement à ce qu'on demande
d'identifier (un intervalle annoncé « quinte » DOIT sonner sept demi-tons), et
la consigne ne contient jamais la réponse.

Deux détails qui auraient mordu :

- **L'étouffement par corde** aurait coupé les accords si toutes leurs notes
  partaient sur la même corde. Chaque note d'un groupe reçoit donc une corde
  distincte, et deux groupes successifs ne réutilisent pas la même — sans quoi
  la deuxième note d'un intervalle couperait la première.
- **La première question est déterministe.** Tirée au hasard, elle différait
  entre le rendu serveur et le rendu client, et React signalait une erreur
  d'hydratation (#418). Elle est désormais issue d'une graine stable dérivée de
  l'exercice et du niveau ; les suivantes sont aléatoires.

Chaque réponse écrit une ligne dans le journal `PracticeEvent`
(`ear_interval`, `ear_chord_quality`, `ear_degree`, `ear_naming`), qui servira
de base aux statistiques et à la pondération de la phase 7.

### Phase 4c — Leçons 5 à 11 et accords ouverts : fait

Onze leçons au total. Les sept ajoutées suivent la même règle que les
précédentes : chaque notion est ancrée sur un diagramme, un son et un exercice.

**Les formes d'accords sont les seules données saisies à la main du projet**
— un doigté est un fait, pas une conséquence de formule. Elles sont donc
confrontées au moteur théorique : les hauteurs produites par chaque doigté
doivent former exactement l'accord annoncé (ni note étrangère, ni note
manquante), la basse doit être la fondamentale, et un doigt doit être indiqué là
où une case est pressée et nulle part ailleurs. Une case fausse donnerait sinon
un accord faux, enseigné comme juste.

**Un garde-fou a servi.** L'exercice sur le mode lydien demandait de cliquer une
quarte augmentée dans la gamme de Fa majeur — où elle n'existe pas : Fa majeur
contient un Si♭. Le test « chaque exercice de manche est résoluble » l'a
attrapé. La correction n'est pas cosmétique, elle est la notion elle-même :
`FretboardSpec` sépare désormais la gamme affichée de la note qui sert à
compter les degrés (`degreeRoot`). Fa lydien, ce sont les notes de **Do** majeur
numérotées depuis **Fa** — et c'est ce décalage qui fait apparaître la quarte
augmentée.

### Phase 4b — Notation sur portée : fait, et comment

Page `/demo/portee`, deux onglets : **Explorer** (touche une case, la note
s'allume sur la portée et sonne) et **S'entraîner** (le parcours de lecture).

**Le piège de cette phase, traité explicitement** : la guitare est un instrument
**transpositeur**. Sa musique s'écrit **une octave au-dessus de ce qu'elle
sonne**, en clé de sol avec un 8 sous la clé. Le Mi grave à vide sonne un Mi2
mais s'écrit à la place d'un Mi3 — sous trois lignes supplémentaires. Une portée
qui ignore ça est juste sur le papier et fausse d'une octave pour qui apprend à
lire, et c'est une erreur qu'un débutant ne peut pas détecter seul. Le décalage
vit dans `src/lib/notation/staff.ts` et les six cordes à vide sont vérifiées
contre leurs positions écrites de référence (`e/3 a/3 d/4 g/4 b/4 e/5`).

L'octave écrite se déduit de la **lettre**, pas du numéro MIDI divisé par
douze : Si♯3 et Do4 sonnent pareil sans s'écrire dans la même octave.

**La hauteur de la portée n'est pas fixée à l'avance.** Mesuré : une portée
dimensionnée « à vue » coupait le dessin, qui s'étendait de −12 à 253 pixels
dans un cadre de 160. Le composant dessine d'abord, mesure ensuite, et cadre sur
ce qui a réellement été tracé — ce qui règle du même coup l'adaptation du 375 px
au grand écran.

Pendant une question, **le manche n'affiche aucun nom** (`labelMode="none"`) :
sinon « trouve cette note » se résout en lisant les étiquettes. Elles
réapparaissent après la réponse. Une même hauteur existant à plusieurs endroits,
**toutes ces positions comptent juste** — c'est précisément ce que l'exercice
apprend, et un test vérifie qu'aucune question n'est sans réponse dans la
fenêtre affichée.

En cas d'erreur, la note visée et celle jouée sont montrées **ensemble** sur la
portée, vert contre orange, avec un bouton pour réécouter la bonne : c'est
l'écart qui s'apprend, pas le verdict.

**Aucune vue « portée seule » n'a été nécessaire.**

Contraintes d'origine, rappelées ici parce qu'elles tiennent pour la suite :

- **La portée n'apparaît jamais seule.** Un composant unique porte la portée,
  le manche et le son ensemble ; **la même note s'allume simultanément aux deux
  endroits**.
- Le parcours de lecture demande **« trouve cette note sur ta guitare et
  joue-la »**, jamais « nomme cette note ». Lire une portée sert à jouer, pas à
  réciter.
- **Si une vue portée seule devient nécessaire quelque part, prévenir avant de
  l'implémenter.** C'est le point où la règle centrale du projet (rien
  d'abstrait) est la plus facile à trahir sans s'en apercevoir.

### Phase 6/7 — Micro : ce qui est mesurable, et ce qui ne l'est pas

Cadre imposé par l'utilisateur. **Pas de score global. Métriques brutes, avec
leur incertitude.**

**Mesurable de façon fiable :**
- fréquence fondamentale d'une note seule tenue (monophonique) ;
- instants d'attaque, régularité du tempo ;
- conformité des notes jouées à une gamme attendue.

**Non fiable — à ne pas prétendre mesurer :**
- **transcription polyphonique** : détecter les notes d'un accord gratté dépasse
  ce qu'on peut faire honnêtement avec YIN sur un micro de téléphone ;
- **dynamique et nuances** : le contrôle automatique de gain des micros de
  téléphone écrase les écarts de volume ;
- **son, toucher, musicalité** : aucune métrique ne les capture.

**Obstacle à traiter en premier — calibration de latence.** Mesurer le placement
rythmique contre le métronome exige de connaître la latence aller-retour du
système, qui va de ~20 ms en filaire à ~300 ms en Bluetooth. Sans calibration,
toute métrique de timing est **du bruit présenté comme une mesure**.

Donc : une procédure de calibration est un **prérequis** de tout exercice
rythmique, et les métriques de timing sont **refusées** tant qu'elle n'a pas été
faite. Pas affichées avec un avertissement — **pas affichées du tout**.

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
