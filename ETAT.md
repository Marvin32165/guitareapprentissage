# Guitare — Apprentissage : état du projet

Document autonome, à jour au 3 septembre 2026. Écrit pour être lu **sans accès
au dépôt** : tout ce qui est nécessaire pour discuter du projet est ici.

---

## 1. Ce qu'est le projet

Une application personnelle d'apprentissage de la guitare et de la théorie
musicale. **Un seul utilisateur**, pas de comptes, pas de SaaS.

**Profil visé** : guitariste autodidacte de niveau intermédiaire, **zéro théorie
formelle**. Il joue déjà ; l'objectif est de mettre des noms et une logique sur
ce que ses doigts font déjà.

**Règle de conception centrale, non négociable :**

> Aucune notion théorique ne doit être présentée de façon abstraite. Chaque
> concept doit être immédiatement ancré (a) sur un diagramme de manche,
> (b) sur un son jouable dans l'app, (c) sur une application concrète.

**Règles de contenu :**
- Tout en français, ton direct, sans jargon présupposé.
- **Aucune tablature ni partition de morceau commercial** — question de droits.
- **Aucun scraping.** Le répertoire est une liste de titres saisie à la main
  avec des notes personnelles, pas une base de tablatures.

**Contraintes matérielles :** mobile d'abord, conçu à 375 px. Le téléphone est
l'usage principal. Cibles de tests manuels : 375 / 768 / 1440. Zones tactiles
≥ 44 px, aucune dépendance au survol ou au clic droit. Manche lisible en
portrait (défilement horizontal à repères ancrés **et** affichage vertical, avec
bascule). Wake Lock pendant la pratique, bouton de déverrouillage audio iOS.

---

## 2. Pile technique (imposée par l'utilisateur)

| Élément | Version | Remarque |
| --- | --- | --- |
| Next.js | 16.3.4 | App Router, Turbopack |
| React | 19.2.8 | |
| TypeScript | 5 | |
| Tailwind | 4 | `@import "tailwindcss"`, sombre par défaut |
| Prisma | 7.10.0 | **épinglé** — `latest` était une RC 8.0 |
| Tone.js | 15.1.22 | |
| Vitest | 4.1.11 | 122 tests, 13 fichiers |
| Hébergement | Vercel + Turso (libSQL) | |

**Pièges de version déjà rencontrés et résolus** (utile si on conseille du code) :

- Next 16 : `middleware.ts` s'appelle désormais **`proxy.ts`** (runtime nodejs,
  pas edge). `cookies()`, `headers()`, `params`, `searchParams` sont **async**.
  `next lint` a disparu. `serverExternalPackages` est au niveau racine.
- Prisma 7 : `url` a été retiré du bloc `datasource` du schéma → il vit dans
  `prisma.config.ts`, et le bloc n'y est ajouté **que si `DATABASE_URL` existe**
  (sinon le `postinstall` de Vercel plante et casse tout le build). Le runtime
  exige un driver adapter (`PrismaLibSql`).
- Tone.js : `PluckSynth` est monophonique et **incompatible avec `PolySynth`**
  → pool de voix manuel.
- Le client Prisma est instancié **paresseusement via un `Proxy`** : importer le
  module ne doit jamais lever, pour qu'un déploiement sans base reste utilisable.

**Authentification volontairement minimale** : un mot de passe dans une variable
d'environnement + cookie de session httpOnly. Pas de comptes, pas de NextAuth,
pas d'OAuth.

**Déploiement** : `guitareapprentissage.vercel.app`. Vercel builde **`main`** —
le travail se fait sur la branche `claude/guitare-apprentissage-app-5jpxbi` puis
est fusionné dans `main`. Deux variables suffisent à démarrer (`APP_PASSWORD`,
`SESSION_SECRET`) ; Turso s'ajoute ensuite pour la persistance, et un bandeau
ambre prévient honnêtement quand elle est absente.

---

## 3. Ce qui est fait

### Phase 1 — Fondations ✅
Next.js, Tailwind, Prisma, authentification, coquille responsive, PWA
(service worker écrit à la main : *network-first* pour les navigations,
*stale-while-revalidate* pour les assets).

### Phase 2 — Moteur musical ✅
`src/lib/music/` : 8 modules de théorie pure, **sans aucune dépendance** à
React, à la base ou à l'audio.

- `pitch` (note = lettre + altération, double nommage latin/anglo),
  `intervals` (transposition garantissant l'orthographe correcte),
  `scales`, `chords`, `harmony` (chiffrage romain dérivé des qualités
  calculées), `modes`, `fretboard`.
- **Rien n'est codé en dur** : tout est dérivé de formules d'intervalles.
- Les boîtes pentatoniques sont générées par un algorithme glouton
  « paire consécutive la plus proche » qui reproduit le schéma canonique de La
  mineur, décalage de la corde de Si compris.
- **Tests de référence à valeurs écrites en dur**, tirées de sources de théorie
  établies et non du moteur lui-même : harmonisation complète de Do et Sol
  majeur, La mineur naturelle et harmonique, les 5 boîtes pentatoniques de La
  mineur avec les frettes exactes, les 7 modes de Do, cohérence orthographique
  Fa♯/Sol♭ sans double altération.

### Phase 2 bis — Complément ✅
Harmonisation mineure (naturelle, harmonique, mélodique), double nommage
latin/anglo.

### Phase 3 — Manche ✅
Composant SVG (`Fretboard`) : orientations verticale et horizontale, code
couleur par fonction (fondamentale / tierce / quinte / autre), notes cliquables
qui sonnent, **accordages paramétrables** (standard, drop D, DADGAD, open G,
open D, mi♭), **capo** (forme affichée vs nom réel), **gaucher/droitier**.

### Phase 4a — Théorie, premières leçons ✅ (déployé)
Parcours + **4 leçons** (notes sur le manche, intervalles, gamme majeure, CAGED),
chacune avec exercices interactifs (QCM et « trouve sur le manche »).
Le contenu est **typé** de façon à imposer la règle centrale.

### Notions déclarées ✅ (préalable à la répétition espacée)
Chaque exercice déclare la **notion** qu'il travaille (`conceptId`), chaque leçon
celles qu'elle introduit. Registre central : étiquette, résumé, **prérequis**.
Le champ est **obligatoire dans le typage** — facultatif, il manquerait sur la
moitié des exercices.

Quatre vérifications automatiques, dont celle qui compte : **aucune leçon ne peut
s'appuyer sur une notion enseignée plus tard**. Testée par mutation (faire
dépendre une notion de la leçon 1 d'une notion de la leçon 4 fait échouer le test
en nommant les deux leçons).

### Chantier A — Refonte du son 🔄 (en grande partie fait)

Point de départ : la synthèse Tone.js `PluckSynth` (Karplus-Strong) était jugée
insuffisante — elle s'écrase dans les aigus, et n'a aucun corps de caisse dans
les médiums.

**Sources comparées, et la décision prise.** Six sources ont été rendues
comparables à l'oreille sur `/demo/audio`. **L'utilisateur a choisi la 3,
FluidR3 cordes acier**, à l'issue d'une comparaison à l'aveugle.

| # | Source | Étendue | Licence | Poids |
| --- | --- | --- | --- | --- |
| 1 | Synthèse Tone.js | toute | — | 0 |
| 2 | University of Iowa | Ré2 → Ré5 | CC-BY 3.0 | 2,1 Mo (16 notes) |
| 3 | **FluidR3 acier (retenue)** | tout le manche | CC-BY 3.0 | 412 ko (21 notes) |
| 4 | FluidR3 nylon | tout le manche | CC-BY 3.0 | 380 ko |
| 5 | Hybride Iowa + FluidR3 | raccord à Ré5 | CC-BY 3.0 | — |
| 6 | Martin HD28 | Mi2 → Si5, un éch. / 3 demi-tons | **CC0** | 848 ko |

**Méthode de choix.** La première version de la page était un banc d'essai
d'ingénieur du son (« juge à l'oreille ») — inutilisable pour quelqu'un qui n'a
jamais fait de comparaison A/B. Remplacée par une **comparaison guidée à
l'aveugle** : cinq manches, deux extraits par manche, une seule question
(« lequel préfères-tu ? »), noms **cachés** jusqu'au verdict — sinon c'est
l'étiquette qu'on juge et « captations réelles » gagne d'avance. Le gagnant de
chaque manche affronte le suivant.

**Égalisation des niveaux, automatique.** Mesurés à l'EBU R128, les jeux
s'écartaient de plus de **12 dB** (FluidR3 acier −33,1 LUFS, Iowa −20,8). À cet
écart, la plus forte est jugée meilleure quelle que soit sa qualité. La
correction est appliquée **par dossier d'échantillons** et non par source, parce
que l'hybride mélange deux captations : son fameux « raccord » était en réalité
un saut de volume de 12 dB, pas une différence de timbre — le test ne prouvait
rien. Les fichiers ne sont pas retouchés, c'est un gain à la lecture.

**Moteur de jeu** (`src/lib/audio/guitar.ts`), ce qui distingue une guitare d'un
clavier :
- **Étouffement par corde** : une corde ne porte qu'une note à la fois. C'est
  pourquoi chaque pincement pilote son propre `AudioBufferSourceNode` plutôt que
  de passer par un `Tone.Sampler`, qui raisonne par hauteur et non par corde.
- **Balayage** de 15 à 30 ms, grave→aiguë ou l'inverse.
- **Traitement filées / nues** (voir limites plus bas).
- **Petite pièce** par convolution, sur une réponse impulsionnelle **calculée à
  l'exécution** : rien à embarquer, donc aucune licence à vérifier.
- **Chargement paresseux + Cache API** : un appui déclenche une requête, pas
  quinze, et les échantillons survivent à la fermeture de l'onglet.
- Repli sur la synthèse à chaque étage (un appui ne doit jamais produire de
  silence), mais **signalé en console hors production** — ce silence délibéré
  avait masqué un vrai bug pendant un temps.

**Audit de justesse** — « la note affichée est-elle exactement la note jouée ? »,
vérifié à trois niveaux :

1. **Théorie** (dans la suite de tests) : le nom affiché est calculé par un
   chemin de code, la hauteur jouée par un autre. Comparés sur tous les
   accordages × capos 0-7 × 6 cordes × cases 0-15. Aucun désaccord.
2. **Échantillons** (`npm run audit:pitch`, hors suite car il demande ffmpeg) :
   refait le trajet complet jusqu'à **mesurer la fréquence produite**, sur les
   96 positions du manche. Écart maximal : Martin 0,1 ct · nylon 2,3 ·
   **acier 4,7** · Iowa 5,5. Très en deçà de l'audible.
3. **Synthèse de repli** : un vrai défaut trouvé et corrigé. Karplus-Strong fait
   circuler le signal dans une ligne à retard d'un nombre **entier**
   d'échantillons ; les hauteurs atteignables sont `cadence / N`, grille qui
   s'élargit vers l'aigu (29 cents entre deux crans à 740 Hz). Tone arrondit
   **vers le haut**, donc toute note sonnait basse — mesuré −23,4 cents sur Fa5.
   Le code vise désormais l'entier le plus proche : pire écart **−11,7 cents**,
   soit la limite de la méthode. Au passage, la mesure chiffre la plainte
   d'origine : à Mi4 la synthèse s'éteint en **0,10 s**, contre 0,53 s sur le Mi
   grave.

---

## 4. Limites connues, à dire franchement

- **Aucune source n'est échantillonnée corde par corde.** Toutes donnent *une
  captation par hauteur*. Mi4 corde 1 case 0 et Mi4 corde 4 case 14 déclenchent
  le **même fichier**, alors que sur une vraie guitare ces deux notes n'ont ni
  le même timbre, ni la même attaque, ni la même durée. Le traitement
  « filées / nues » est un **filtrage approximatif** appliqué après coup, pas du
  sampling par corde — documenté comme tel, à la demande explicite de
  l'utilisateur.
- **Aucune couche de vélocité.** Aucune source libre trouvée n'en propose pour
  une guitare acoustique ; la Martin est mono-couche. À ne pas simuler en
  faisant semblant.
- **Freesound est inaccessible** depuis l'environnement de développement (la
  politique réseau sortante refuse la connexion). Recherche menée indirectement :
  des jeux **échantillonnés corde par corde existent bien** chez
  `Carlos_Vaquero` (« Classical Guitar: Single notes … String 1 »), mais la
  licence paraît **CC BY-NC** et c'est une guitare **classique nylon**, pas
  acier. Non vérifiable d'ici.
- **Le déploiement n'est pas vérifiable** depuis l'environnement de dev
  (`vercel.app` est bloqué par la même politique). Les vérifications se font en
  local, au navigateur, avant fusion.

---

## 5. Ce qu'il reste à faire

Ordre décidé : **A → 4b → 4c → 5 → 6 → 7.**

### Fin du chantier A (petit reliquat)
- Bruit de glissé (*slide noise*) — optionnel.
- Encodage définitif du jeu retenu (FluidR3 acier). Les sources écartées
  restent dans le dépôt (décision 1).
- Retrait du traitement filées/nues s'il ne s'entend pas (décision 2).
- Couches de vélocité : **bloqué faute de source libre**, à documenter plutôt
  qu'à simuler.

### Phase 4b — Notation sur portée ⬜ (prochaine étape)
VexFlow (choisi plutôt qu'abcjs), parcours de lecture de notes.

### Phase 4c — Les 7 leçons restantes ⬜
Gamme mineure, accords, harmonisation, progressions, pentatoniques, modes,
tensions. Plus les formes d'accords ouverts (CAGED).
Le typage `conceptId` est prêt : les nouvelles notions s'ajoutent au registre
avec leurs prérequis, et les tests refusent une leçon qui s'appuierait sur une
notion enseignée plus tard.

### Phase 5 — Oreille ⬜
Reconnaissance d'intervalles, d'accords et de degrés. Plus un exercice de
conversion latin ↔ anglo.

### Phase 6 — Technique ⬜
Métronome, exercices chronométrés, **détection par micro**, backing tracks
échantillonnés (licence CC0 vérifiée et documentée par pack).

### Phase 7 — Progression ⬜
- Répétition espacée **SM-2**, s'appuyant sur les `conceptId` déjà déclarés.
- Routine du jour, statistiques, séries.
- **Analyse de session par le micro, SANS stockage audio** : seules les
  métriques et le retour rédigé sont sauvegardés.
  Consigne explicite de l'utilisateur : *« Sois honnête sur les limites. Pas de
  score global flatteur. »*
- Export / import JSON.
- **File d'écritures hors-ligne (outbox IndexedDB)** — notée dès la phase 2,
  toujours à faire.
- Répertoire : titres saisis à la main, statut, notes personnelles.
- Intégration Hooktheory.
- API Anthropic (`claude-sonnet-4-6`) pour le retour rédigé de session.

---

## 6. Architecture des données

Journal **append-only** `PracticeEvent` (`id`, `type`, `refId`, `correct?`,
`quality?`, `createdAt`, indexé) comme **source de vérité**. `EarStat` et
`ReviewItem` sont des **agrégats de lecture**, pas la vérité.

9 modèles Prisma : `LessonProgress`, `ReviewItem`, `PracticeEvent`, `EarStat`,
`ExerciseSetting`, `TempoRecord`, `PracticeSession`, `DailyStat`,
`RepertoireSong`.

Toutes les migrations sont aussi concaténées dans un `schema.sql` unique, pour
que la mise en place de Turso tienne en un seul copier-coller.

---

## 7. Méthode de travail

- Développement par phases, **avec arrêt et validation à chaque fin de phase**.
- Commits atomiques, messages explicites.
- README tenu à jour ; tout ce qui n'est pas de la phase en cours y est noté
  avec sa phase d'affectation.
- **Vérification au navigateur** (Playwright) avant chaque fusion vers `main`,
  pas seulement des tests unitaires.
- Les mesures priment sur les impressions : plusieurs « défauts » se sont révélés
  être des erreurs dans les outils de mesure eux-mêmes (une erreur annoncée à
  147 cents venait d'une cadence d'échantillonnage codée en dur ; une autre à
  29 cents, d'une résolution d'autocorrélation insuffisante). Toujours vérifier
  l'instrument avant d'accuser le code.

---

## 8. Décisions prises sur les quatre sujets ouverts

**1. Sources écartées — gardées dans le dépôt**, mais elles ne doivent partir ni
dans le bundle client ni dans le précache du service worker. Fait et vérifié :
SW sans précache et excluant `/audio/`, catalogue chargé dynamiquement au
premier son, échantillons chargés note par note. Contrôlé au navigateur
(0 entrée audio dans le cache du SW) et verrouillé par des tests.

**2. Traitement filées/nues — à juger, pas à supposer.** Un test à l'aveugle a
été construit sur le cas critique : le même Mi4 joué corde 1 case 0 puis corde 4
case 14, traitement actif contre traitement coupé, niveaux égalisés, côté tiré
au sort. **En attente du verdict de l'utilisateur.** S'il n'entend pas de
différence, le traitement est retiré — une approximation qui n'apporte rien est
de la dette.

**3. VexFlow (phase 4b) — la portée n'apparaît jamais seule.** Composant unique
portée + manche + son, où la même note s'allume simultanément aux deux endroits.
Le parcours de lecture demande « trouve cette note sur ta guitare et joue-la »,
**jamais** « nomme cette note ». Si une vue portée seule devient nécessaire
quelque part, prévenir l'utilisateur avant de l'implémenter.

**4. Micro (phases 6/7) — honnêteté jusqu'au bout.**

*Mesurable de façon fiable* : fréquence fondamentale d'une note seule tenue
(monophonique) ; instants d'attaque et régularité du tempo ; conformité des
notes jouées à une gamme attendue.

*Non fiable, à ne pas prétendre mesurer* : la transcription polyphonique
(détecter les notes d'un accord gratté dépasse ce qu'on peut faire honnêtement
avec YIN sur un micro de téléphone) ; la dynamique et les nuances (le contrôle
automatique de gain des micros de téléphone écrase les écarts de volume) ; le
son, le toucher, la musicalité — aucune métrique ne les capture.

*Obstacle à traiter en premier* : **la calibration de latence**. Mesurer le
placement rythmique contre le métronome exige de connaître la latence
aller-retour, qui va de ~20 ms en filaire à ~300 ms en Bluetooth. Sans
calibration, toute métrique de timing est du bruit présenté comme une mesure.
Une procédure de calibration est donc un **prérequis** de tout exercice
rythmique, et les métriques de timing sont refusées tant qu'elle n'a pas été
faite : **pas affichées avec un avertissement — pas affichées du tout**.

*Dans tous les cas* : pas de score global, métriques brutes avec leur
incertitude.
