# Crédits et licences des données embarquées

Tout contenu tiers embarqué dans ce dépôt — échantillons audio, jeux de
données — est listé ici, avec son origine, sa licence et l'attribution exigée
par cette licence. Rien n'est ajouté à `public/audio/` ni à
`src/content/progressions/` sans une ligne correspondante dans ce fichier.

- [Corpus de progressions d'accords](#corpus-de-progressions-daccords) —
  **CC BY-NC-SA 3.0**, à lire avant tout usage commercial
- [Échantillons audio](#échantillons-audio) — CC0 et CC-BY

---

# Corpus de progressions d'accords

## Ce que c'est

`src/content/progressions/donnees.ts` : 10 451 morceaux, ramenés chacun à des
**progressions en degrés** (I, V, vi, IV…). Ni mélodie, ni tablature, ni accords
réels d'un morceau : uniquement des relations entre hauteurs, plus un titre et
un nom d'artiste.

- **Source** : [Hooktheory dataset](https://github.com/chrisdonahue/sheetsage#hooktheory-dataset),
  publié par **Chris Donahue** avec le système *Sheet Sage*, à partir des
  annotations de la [TheoryTab DB de Hooktheory](https://www.hooktheory.com/theorytab)
- **Fichier récupéré** : `Hooktheory.json.gz`, 20 075 896 octets,
  SHA-256 `917b7cd58f5f4e07d6c36acf7bfad958c99ee05472dab3555399141094698e0c`
  — **identique à l'empreinte publiée** dans le README de Sheet Sage
- **Publication** : Donahue, Thickstun, Liang, *Melody transcription via
  generative pre-training*, ISMIR 2022 ([arXiv:2212.01884](https://arxiv.org/abs/2212.01884))

Rien n'a été moissonné : le jeu de données est distribué en un fichier, par son
auteur, avec son empreinte.

## Licence : CC BY-NC-SA 3.0 — et ce que ça implique vraiment

Le fichier `LICENSE` de Sheet Sage est explicite :

> IMPORTANT NOTE: All \*code\* in this repository is MIT-licensed, but dataset
> and trained models are distributed under CC BY-NC-SA 3.0, as they are derived
> from user contributions on HookTheory (https://forum.hooktheory.com/tos).

Donc : **réutilisation autorisée**, sous trois conditions.

| Clause | Ce qu'elle impose ici |
| --- | --- |
| **BY** (attribution) | Créditer Chris Donahue et Hooktheory. Fait dans ce fichier, en tête du fichier généré, et dans l'interface. |
| **NC** (pas d'usage commercial) | Cette app ne peut pas être vendue, ni monétisée, ni intégrée à une offre payante tant que ces données y sont. |
| **SA** (partage à l'identique) | Toute **adaptation** des données se rediffuse sous la même licence. `src/content/progressions/donnees.ts` est une adaptation : il est sous CC BY-NC-SA 3.0. |

### Le point qui mérite d'être dit franchement

Ailleurs dans ce fichier, la banque d'échantillons **MusyngKite a été écartée
précisément à cause d'une clause de partage à l'identique**. Il faut donc
assumer l'écart plutôt que le taire.

Ce n'est pas la même situation, pour deux raisons :

1. **Contenance.** La clause porte sur *l'œuvre et ses adaptations*. Ici
   l'adaptation est **un seul fichier généré**, clairement identifié, produit
   par **un seul script** (`scripts/build-progressions.mjs`). Le reste du dépôt
   ne dérive pas des données : il les lit.
2. **Réversibilité.** Supprimer `src/content/progressions/` et le script suffit
   à faire disparaître la contrainte : c'est un commit, pas une refonte.

Ce qu'on ne peut pas affirmer : qu'un juriste tracerait la frontière exactement
là. La question « où s'arrête l'adaptation et où commence la simple
agrégation » n'a pas de réponse tranchée, et je ne suis pas juriste. La lecture
sûre, celle qui est retenue ici : **ne jamais commercialiser cette app tant que
ces données y sont, et garder l'attribution partout où les progressions sont
affichées.**

Comme cette app est personnelle, mono-utilisateur, sans compte et sans offre
payante, la clause NC ne coûte rien aujourd'hui. Elle coûterait le jour où
l'app changerait de nature — c'est ce jour-là qu'il faudra revenir ici.

## Ce qui a été écarté, et pourquoi

Deux autres dépôts sont souvent cités pour « les 5000 progressions ». Aucun
n'est utilisable :

- [`DataStrategist/Musical-chord-progressions`](https://github.com/DataStrategist/Musical-chord-progressions)
  — celui du billet « Chord progressions of 5000 songs ». Son `LICENSE.txt` dit
  mot pour mot : *« License for data unknown. Please contact HookTheory.com
  directly. »* **Licence des données inconnue : inutilisable.** Une licence
  inconnue n'est pas une licence permissive.
- [`owencm/hooktheory-data`](https://github.com/owencm/hooktheory-data) —
  **aucun fichier de licence**, et son README décrit des dumps XML obtenus en
  interrogeant `hooktheory.com/songs/getXmlByPk?pk=…` : c'est un moissonnage.
  Écarté deux fois : pas de licence, et contraire à la règle du projet.

## Poids

| Élément | Octets |
| --- | --- |
| `donnees.ts` (source TypeScript) | 510 414 (498 ko) |
| dont vocabulaire des degrés | 910 |
| dont table des 7 631 progressions | 68 679 |
| dont 10 451 morceaux (titre + artiste + progression) | 285 019 |
| dont index progression → morceaux | 138 902 |
| **transmis au navigateur (brotli)** | **≈ 205 ko** |

Ce fichier n'est **pas** dans le bundle de démarrage : il est chargé par
`import()` dynamique quand une vue de progressions s'ouvre pour la première
fois, puis gardé par le service worker comme n'importe quel `/_next/static`.
Il est donc téléchargé une fois, et la recherche fonctionne ensuite hors-ligne.

## Reconstruire le fichier

```sh
curl -LO https://github.com/chrisdonahue/sheetsage-data/raw/refs/heads/main/hooktheory/Hooktheory.json.gz
sha256sum Hooktheory.json.gz   # doit donner 917b7cd5…98e0c
gunzip Hooktheory.json.gz
node --max-old-space-size=6144 scripts/build-progressions.mjs \
     Hooktheory.json src/content/progressions/donnees.ts
```

Le fichier de 309 Mo n'est **pas** versionné : seul le produit fini l'est.

---

# Échantillons audio

Tout fichier audio embarqué dans ce dépôt est listé ici, avec son origine, sa
licence et l'attribution exigée par cette licence. Rien n'est ajouté à
`public/audio/` sans une ligne correspondante dans ce fichier.

## Note sur les niveaux

Aucun fichier n'est modifié pour l'égalisation de volume : la correction est un
**gain appliqué à la lecture**, calculé à partir d'une mesure EBU R128 de chaque
jeu (Iowa −20,8 LUFS, FluidR3 acier −33,1, FluidR3 nylon −30,9, Martin −22,5,
ramenés à −23). Les échantillons distribués ici restent donc bit à bit ceux de
leur source, à l'exception du jeu Martin, dont les modifications sont détaillées
plus bas.

## Résumé des licences en présence

| Licence | Ce qu'elle impose | Sources concernées |
| --- | --- | --- |
| CC0 1.0 | Rien (domaine public) | **Martin HD28 (source retenue)** |
| CC-BY 3.0 | Créditer l'auteur ; usage commercial et modification autorisés | University of Iowa, FluidR3_GM |

Aucun échantillon sous CC-BY-**SA** n'est utilisé : la clause de partage à
l'identique contaminerait le dossier `public/audio/` tout entier, où les six
jeux cohabitent. C'est pourquoi la banque **MusyngKite**, pourtant de meilleure
qualité que FluidR3, a été écartée. Le corpus de progressions, lui, est sous
CC BY-NC-SA et tient dans un seul fichier généré : voir
[la section qui lui est consacrée](#corpus-de-progressions-daccords), où l'écart
est assumé et expliqué.


---

## 0. Martin HD28 — source pressentie

- **Dossier** : `public/audio/compare/martin/`
- **Instrument** : Martin HD28 Vintage Series (2017), cordes acier, notes pincées
- **Auteur** : Jeff Learman
- **Intermédiaire** : [`sfzinstruments/Discord-SFZ-GM-Bank`](https://github.com/sfzinstruments/Discord-SFZ-GM-Bank), programme GM 026 « Acoustic Guitar (steel) »
- **Licence** : **CC0 1.0** — domaine public, déclarée en tête du fichier
  `026-Acoustic Guitar (steel).sfz` : `// License: Creative Commons CC0`.
  Aucune attribution n'est exigée ; elle est donnée ici par correction.
- **Format d'origine** : WAV PCM 16 bits, 44,1 kHz, mono — 15 fichiers, 3,1 Mo
- **Étendue** : MIDI 40 → 83 (**Mi2 → Si5**), un échantillon tous les 3 demi-tons
  (40, 43, 46, 49, 52, 55, 58, 61, 64, 68, 71, 74, 77, 80, 83)

C'est la seule source trouvée qui couvre **tout le manche** avec des captations
réelles d'un **seul et même instrument** : ni raccord entre deux enregistrements,
ni transposition de plus d'un ton et demi.

### Modifications apportées — et pourquoi

Contrairement aux autres jeux, ces fichiers **ont été retraités**. Deux
opérations, toutes deux reproductibles par `scripts/build-samples.mjs` :

1. **Correction de hauteur.** Mesurés par autocorrélation normalisée, les
   fichiers d'origine sonnent **bas** : environ −5 cents dans le grave, jusqu'à
   −13,5 cents dans l'aigu (médiane −9,6 ct). Chaque fichier est rééchantillonné
   de `2^(−écart/1200)` pour tomber sur la hauteur tempérée exacte. Vérification
   après encodage : **écart maximal 0,1 cent** sur les 15 notes.

   Un décalage de 10 cents ne s'entend pas sur une note isolée, et les
   *intervalles* restaient justes puisque tout le jeu était décalé du même
   côté. Mais l'application sert à jouer **avec une vraie guitare accordée** :
   10 cents contre l'instrument de l'utilisateur, ça bat.

2. **Encodage.** Opus 64 kbps mono 48 kHz (**345 ko** au total) et MP3 96 kbps
   en repli (**428 ko**), le chargeur tranchant selon le navigateur. Les
   fichiers Opus portent l'extension `.ogg`, pas `.opus` : Next sert `.opus`
   en `application/octet-stream`, et l'en-tête `X-Content-Type-Options: nosniff`
   interdit alors au navigateur de rattraper le type.

Le détail note par note — écart mesuré, correction appliquée, durée, poids — est
dans `public/audio/compare/martin/manifest.json`, écrit par le script. Les
chiffres de ce document en sont tirés, ils ne sont pas recopiés à la main.

### Ce que cette source ne résout pas

Elle reste un **échantillon par hauteur**, pas par corde : Mi4 corde 1 case 0 et
Mi4 corde 4 case 14 jouent le même fichier. Voir la dernière section.

---

## 1. University of Iowa — Electronic Music Studios

- **Dossier** : `public/audio/compare/iowa/`
- **Instrument** : guitare acoustique (cordes acier), notes tenues, captation réelle
- **Auteur / éditeur** : University of Iowa Electronic Music Studios (Lawrence Fritts)
- **Intermédiaire** : [`nbrosowsky/tonejs-instruments`](https://github.com/nbrosowsky/tonejs-instruments), dossier `samples/guitar-acoustic/`
- **Licence** : CC-BY 3.0 (déclarée par le dépôt intermédiaire, `README.md` + `sample-source-info.txt`)
- **Attribution affichée dans l'app** : « University of Iowa, via nbrosowsky/tonejs-instruments — CC-BY 3.0 »
- **Format d'origine** : Ogg Vorbis ~240 kbps, mono
- **Modification apportée** : aucune. Les fichiers sont copiés tels quels ; seul un sous-ensemble a été retenu (voir manifeste).

Le jeu complet couvre 37 notes chromatiques de **Ré2 à Ré5**. Au-dessus de Ré5,
il n'y a plus d'échantillon : `Tone.Sampler` transpose le plus proche, et
l'étirement s'entend. C'est le trou que la source hybride cherche à combler.

### Manifeste (16 fichiers, 2,1 Mo)

| Fichier | Note | Provenance exacte |
| --- | --- | --- |
| `E2.ogg` | Mi2 | `samples/guitar-acoustic/E2.ogg` |
| `A2.ogg` | La2 | `samples/guitar-acoustic/A2.ogg` |
| `D3.ogg` | Ré3 | `samples/guitar-acoustic/D3.ogg` |
| `E3.ogg` | Mi3 | `samples/guitar-acoustic/E3.ogg` |
| `G3.ogg` | Sol3 | `samples/guitar-acoustic/G3.ogg` |
| `A3.ogg` | La3 | `samples/guitar-acoustic/A3.ogg` |
| `B3.ogg` | Si3 | `samples/guitar-acoustic/B3.ogg` |
| `C4.ogg` | Do4 | `samples/guitar-acoustic/C4.ogg` |
| `D4.ogg` | Ré4 | `samples/guitar-acoustic/D4.ogg` |
| `E4.ogg` | Mi4 | `samples/guitar-acoustic/E4.ogg` |
| `G4.ogg` | Sol4 | `samples/guitar-acoustic/G4.ogg` |
| `A4.ogg` | La4 | `samples/guitar-acoustic/A4.ogg` |
| `B4.ogg` | Si4 | `samples/guitar-acoustic/B4.ogg` |
| `C5.ogg` | Do5 | `samples/guitar-acoustic/C5.ogg` |
| `Cs5.ogg` | Do♯5 | `samples/guitar-acoustic/Cs5.ogg` |
| `D5.ogg` | Ré5 | `samples/guitar-acoustic/D5.ogg` |

Les notes Do5, Do♯5 et Ré5 sont présentes **exprès** : elles encadrent la
jonction de la source hybride, sinon le test du raccord ne prouverait rien.

---

## 2. FluidR3_GM — cordes acier

- **Dossier** : `public/audio/compare/fluid-steel/`
- **Instrument** : General MIDI n° 26, `acoustic_guitar_steel`
- **Auteur** : Frank Wen (soundfont FluidR3_GM)
- **Intermédiaire** : [`gleitz/midi-js-soundfonts`](https://github.com/gleitz/midi-js-soundfonts), dossier `FluidR3_GM/acoustic_guitar_steel-mp3/`
- **Licence** : CC-BY 3.0
- **Attribution affichée dans l'app** : « FluidR3_GM (Frank Wen), via gleitz/midi-js-soundfonts — CC-BY 3.0 »
- **Format d'origine** : MP3 mono, ~16 ko par note
- **Modification apportée** : aucune, sous-ensemble seulement.

## 3. FluidR3_GM — cordes nylon

- **Dossier** : `public/audio/compare/fluid-nylon/`
- **Instrument** : General MIDI n° 25, `acoustic_guitar_nylon`
- Auteur, intermédiaire, licence, format : identiques au point 2, dossier
  `FluidR3_GM/acoustic_guitar_nylon-mp3/`.

### Manifeste FluidR3 (21 fichiers par jeu — 412 ko acier, 380 ko nylon)

Mêmes noms de fichiers dans les deux dossiers :

`E2` `A2` `D3` `E3` `G3` `A3` `B3` `C4` `D4` `E4` `G4` `A4` `B4` `C5` `Db5`
`D5` `Eb5` `E5` `F5` `Gb5` `G5` (extension `.mp3`)

Chaque fichier vient de `FluidR3_GM/acoustic_guitar_{steel,nylon}-mp3/<note>.mp3`
du dépôt intermédiaire, sans retouche. Les banques `gleitz` nomment les
altérations en **bémols** (`Db5`), là où Iowa les nomme en **dièses** (`Cs5`) :
c'est une différence de convention de fichier, pas de hauteur.

Les cinq notes Mi♭5 → Sol5 sont présentes dans les deux jeux FluidR3 parce
qu'elles constituent précisément la zone où Iowa n'a rien.

---

## Ce qui n'a pas été retenu, et pourquoi

- **VCSL (Versilian Community Sample Library, CC0)** — inspection complète du
  dépôt (4 282 fichiers) : **aucune guitare**. La section `Chordophones` ne
  contient que des cithares (pianos, clavecins, Dan Tranh, psaltérion) et des
  cordophones composites (harpes, strumstick). Les 54 occurrences de « lute »
  désignent le *jeu de luth* d'un clavecin. Le seul instrument à frettes pincé
  est le **Strumstick**, échantillonné corde par corde avec couches de
  vélocité et round-robin — la preuve que le format existe, sur le mauvais
  instrument.
- **MusyngKite** — meilleure qualité que FluidR3, mais **CC-BY-SA** :
  écartée pour la clause de partage à l'identique.
- **Karoryfer / guitare électrique** — hors sujet ici (électrique, pas acoustique).
- **Freesound** — le site est **inaccessible depuis l'environnement où ce dépôt
  est développé** : la politique réseau sortante refuse la connexion
  (`connect_rejected`, 403 au CONNECT), pour `freesound.org` comme pour les
  autres hébergeurs d'échantillons. La recherche a donc été menée
  **indirectement**, par moteur de recherche, sans pouvoir ouvrir ni écouter
  une seule page. Résultat principal :
  [`Carlos_Vaquero`](https://freesound.org/people/Carlos_Vaquero/) publie des
  jeux de **guitare classique échantillonnés corde par corde**
  (« Classical Guitar: Single notes Non Vibrato **String 1**: A2-B3 »,
  [pack 9537](https://freesound.org/people/Carlos_Vaquero/packs/9537/) et
  [pack 9538](https://freesound.org/people/Carlos_Vaquero/packs/9538/),
  14 à 16 sons chacun, accordés à 440 Hz, nuance mezzoforte). **Le format
  existe donc bien, pour la guitare.** Deux réserves, invérifiables d'ici :
  la licence semble être **CC BY-NC** (attribution + usage non commercial) et
  non CC0 — acceptable pour un usage personnel, mais c'est une contrainte de
  plus que CC0 ; et il s'agit d'une guitare **classique** (nylon), pas acier.
  Le protocole pour vérifier et récupérer ces jeux est dans le README.

---

## Échantillonnage corde par corde : la limite, et le traitement abandonné

Le cahier des charges visait un échantillonnage **corde par corde** : la même
hauteur jouée sur la corde de La et sur la corde de Sol ne sonne pas pareil
(masse linéique, filage, longueur vibrante, position sur le manche).

**Aucune source libre exploitable d'ici ne fournit cela**, la Martin comprise :
tous les jeux ci-dessus donnent **une captation par hauteur**, pas par corde.
La seule piste sérieuse — les jeux `Carlos_Vaquero` sur Freesound, dont les
titres annoncent explicitement « String 1 », « String 2 »… — est sur un site
que cet environnement ne peut pas atteindre.

Un **traitement spectral appliqué après coup** a été implémenté pour atténuer
ce défaut : creux dans le haut médium et extinction plus rapide des partiels sur
les cordes filées (Mi grave, La, Ré), brillance et attaque conservées sur les
cordes nues (Sol, Si, Mi aigu).

Il a été **comparé à l'aveugle sur le cas même où il devait servir** : le même
Mi4 joué corde 1 case 0 puis corde 4 case 14, niveaux égalisés, côté traité tiré
au sort. **La différence ne s'est pas entendue, le traitement a été retiré.**

C'était le bon test à faire : une approximation qu'on ne distingue pas de son
absence n'améliore rien et reste du code à maintenir. La limite est assumée
telle quelle — seul un jeu réellement échantillonné corde par corde la lèverait.

Si un jeu réellement échantillonné corde par corde est trouvé plus tard, il
s'ajoute dans `src/lib/audio/sources.ts` comme une entrée de plus, sans toucher
au moteur ni à l'interface — c'est pour cela que la déclaration des sources est
séparée du lecteur.
