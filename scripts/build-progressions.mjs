#!/usr/bin/env node
/**
 * Construit l'index de progressions d'accords à partir du jeu de données
 * Hooktheory publié avec Sheet Sage.
 *
 *   node --max-old-space-size=6144 scripts/build-progressions.mjs \
 *        <Hooktheory.json> src/content/progressions/donnees.ts
 *
 * SOURCE ET LICENCE — voir CREDITS.md. En deux mots : annotations TheoryTab
 * (Hooktheory) publiées par Chris Donahue sous CC BY-NC-SA 3.0. Le fichier
 * produit en est une ADAPTATION, donc placé sous la même licence.
 *
 * CE QU'ON EXTRAIT, ET CE QU'ON N'EXTRAIT PAS
 *
 * Uniquement des DEGRÉS (I, V, vi, IV…), jamais les accords réels d'un
 * morceau, jamais la mélodie, jamais de tablature. Un degré est une relation
 * entre deux hauteurs : un fait de théorie, pas une transcription. Le titre et
 * l'artiste sont des faits également.
 *
 * MÉTHODE
 *
 *  1. Un morceau n'est retenu que s'il tient dans UNE seule tonalité : un
 *     changement de tonalité rendrait les degrés faux sur une partie du
 *     morceau, et une progression fausse enseignée comme vraie est pire que
 *     pas de progression du tout.
 *  2. Les répétitions consécutives d'un même accord sont fusionnées : « I I V V »
 *     et « I V » sont la même progression jouée à deux vitesses.
 *  3. On relève toutes les fenêtres de 4 accords. La progression « signature »
 *     d'un morceau est la plus répandue à l'échelle du corpus parmi celles
 *     qu'il contient — celle qu'un auditeur reconnaîtrait.
 *
 * CHIFFRAGE
 *
 * Les degrés sont nommés comme le fait le moteur d'harmonie de l'app
 * (src/lib/music/harmony.ts) : position dans la gamme de la tonalité, majeure
 * ou mineure naturelle, avec ♭/♯ pour les notes hors gamme. C'est ce qui
 * permet de relier une progression du corpus aux leçons.
 */

import { readFileSync, writeFileSync } from "node:fs";

/** Intervalles empilés -> qualité, telle que le chiffrage romain l'attend. */
const QUALITES = new Map([
  ["4,3", { suffixe: "", majuscule: true }],
  ["3,4", { suffixe: "", majuscule: false }],
  ["3,3", { suffixe: "°", majuscule: false }],
  ["4,4", { suffixe: "+", majuscule: true }],
  ["4,3,3", { suffixe: "7", majuscule: true }],
  ["4,3,4", { suffixe: "maj7", majuscule: true }],
  ["3,4,3", { suffixe: "7", majuscule: false }],
  ["3,3,4", { suffixe: "ø7", majuscule: false }],
  ["3,3,3", { suffixe: "°7", majuscule: false }],
  ["5,2", { suffixe: "sus4", majuscule: true }],
  ["2,5", { suffixe: "sus2", majuscule: true }],
]);

/**
 * Chiffre romain par écart en demi-tons depuis la tonique, POUR CHAQUE MODE.
 * Les degrés de la gamme n'ont pas d'altération ; les notes hors gamme sont
 * nommées avec l'altération qui est d'usage dans ce mode-là (♭II napolitain,
 * ♯VII sensible du mineur harmonique, ♯VI du mineur mélodique…).
 */
const ROMAINS = {
  major: ["I", "♭II", "II", "♭III", "III", "IV", "♭V", "V", "♭VI", "VI", "♭VII", "VII"],
  minor: ["I", "♭II", "II", "III", "♯III", "IV", "♯IV", "V", "VI", "♯VI", "VII", "♯VII"],
};

const MAJEUR = "2,2,1,2,2,2";
const MINEUR = "2,1,2,2,1,2";

/** Taille de la fenêtre : quatre accords, la maille de la chanson populaire. */
const TAILLE = 4;

/** Morceaux listés au plus par progression. Le total réel est conservé. */
const PLAFOND = 40;

function chiffrer(mode, demiTons, intervalles) {
  const q = QUALITES.get(intervalles.join(","));
  if (!q) return null;
  const base = ROMAINS[mode][((demiTons % 12) + 12) % 12];
  return (q.majuscule ? base : base.toLowerCase()) + q.suffixe;
}

/** Suite de degrés d'un morceau, doublons consécutifs fusionnés. */
function suiteDeDegres(entry) {
  const a = entry.annotations;
  if (!a?.harmony?.length || !a.keys?.length) return null;
  // Une seule tonalité : sinon les degrés seraient faux sur une partie du morceau.
  if (a.keys.length !== 1) return null;

  const cle = a.keys[0];
  const intervalles = cle.scale_degree_intervals.join(",");
  const mode =
    intervalles === MAJEUR ? "major" : intervalles === MINEUR ? "minor" : null;
  if (!mode) return null;

  const suite = [];
  for (const accord of a.harmony) {
    const degre = chiffrer(
      mode,
      accord.root_pitch_class - cle.tonic_pitch_class,
      accord.root_position_intervals,
    );
    // Un accord non reconnu casse la suite : mieux vaut écarter le morceau
    // qu'enseigner une progression à laquelle il manque un accord.
    if (!degre) return null;
    if (suite[suite.length - 1] !== degre) suite.push(degre);
  }
  return { mode, suite };
}

function fenetres(suite) {
  const out = new Set();
  for (let i = 0; i + TAILLE <= suite.length; i++) out.add(suite.slice(i, i + TAILLE).join("-"));
  return [...out];
}

const b36 = (n, largeur) => n.toString(36).padStart(largeur, "0");

function main() {
  const [entree, sortie] = process.argv.slice(2);
  if (!entree || !sortie) {
    console.error("usage : node scripts/build-progressions.mjs <Hooktheory.json> <sortie.ts>");
    process.exit(1);
  }

  const brut = JSON.parse(readFileSync(entree, "utf8"));
  const morceaux = [];
  const vus = new Set();
  let rejetes = 0;

  for (const id of Object.keys(brut)) {
    const meta = brut[id].hooktheory;
    if (!meta?.artist || !meta?.song) continue;

    // Un même morceau peut être annoté plusieurs fois (couplet, refrain…) :
    // on ne le compte qu'une fois.
    const cle = `${meta.artist}/${meta.song}`;
    if (vus.has(cle)) continue;

    const res = suiteDeDegres(brut[id]);
    if (!res || res.suite.length < TAILLE) {
      rejetes++;
      continue;
    }
    vus.add(cle);
    morceaux.push({
      artiste: meta.artist,
      titre: meta.song,
      mode: res.mode,
      fenetres: fenetres(res.suite).map((f) => `${res.mode === "minor" ? "m" : "M"}${f}`),
    });
  }

  // Fréquence de chaque progression (mode + quatre degrés), tous morceaux confondus.
  const compte = new Map();
  for (const m of morceaux) for (const f of m.fenetres) compte.set(f, (compte.get(f) ?? 0) + 1);

  // Signature d'un morceau : la plus répandue des progressions qu'il contient.
  for (const m of morceaux) {
    let meilleure = null;
    let score = -1;
    for (const f of m.fenetres) {
      const c = compte.get(f);
      if (c > score) {
        score = c;
        meilleure = f;
      }
    }
    m.signature = meilleure;
  }

  // Table des progressions retenues : celles que partagent au moins deux
  // morceaux, plus la signature de chaque morceau (pour qu'aucun morceau ne
  // reste sans progression affichable).
  const retenues = new Set();
  for (const [f, n] of compte) if (n >= 2) retenues.add(f);
  for (const m of morceaux) retenues.add(m.signature);

  // Les morceaux sont regroupés par artiste : 4648 artistes pour 10451
  // morceaux, la répétition du nom coûterait 60 ko pour rien.
  morceaux.sort((a, b) => a.artiste.localeCompare(b.artiste) || a.titre.localeCompare(b.titre));
  const rang = new Map(morceaux.map((m, i) => [m, i]));

  const listeProg = [...retenues].sort(
    (a, b) => (compte.get(b) ?? 0) - (compte.get(a) ?? 0) || a.localeCompare(b),
  );
  const indexProg = new Map(listeProg.map((p, i) => [p, i]));

  // Vocabulaire des degrés : « I », « vi », « ♭VII », « ii7 »… Chaque degré
  // devient un indice, une progression quatre indices.
  const degres = [];
  const indexDegre = new Map();
  const idDegre = (d) => {
    if (!indexDegre.has(d)) {
      indexDegre.set(d, degres.length);
      degres.push(d);
    }
    return indexDegre.get(d);
  };
  for (const p of listeProg) for (const d of p.slice(1).split("-")) idDegre(d);
  if (degres.length > 36 * 36) throw new Error("trop de degrés distincts pour deux chiffres base36");

  // Morceaux par progression, plafonnés, avec le total réel.
  const parProg = new Map(listeProg.map((p) => [p, []]));
  for (const m of morceaux) {
    for (const f of m.fenetres) {
      const l = parProg.get(f);
      if (l) l.push(rang.get(m));
    }
  }

  const largeurProg = String(listeProg.length - 1).length; // en base36 plus bas
  const cheProg = Math.max(2, b36(listeProg.length - 1, 1).length);

  const encodeProgressions = listeProg
    .map((p) => {
      const [mode, ...reste] = [p[0], ...p.slice(1).split("-")];
      return mode + reste.map((d) => b36(indexDegre.get(d), 2)).join("");
    })
    .join("");

  const encodeIndex = listeProg
    .map((p) => {
      const tous = parProg.get(p).sort((a, b) => a - b);
      const gardes = tous.slice(0, PLAFOND);
      let precedent = 0;
      const deltas = gardes.map((id) => {
        const d = id - precedent;
        precedent = id;
        return d.toString(36);
      });
      return `${tous.length.toString(36)}:${deltas.join(",")}`;
    })
    .join(";");

  const parArtiste = new Map();
  for (const m of morceaux) {
    if (!parArtiste.has(m.artiste)) parArtiste.set(m.artiste, []);
    parArtiste.get(m.artiste).push(m);
  }
  const encodeMorceaux = [...parArtiste]
    .map(([artiste, liste]) =>
      [artiste, ...liste.map((m) => `${m.titre}|${b36(indexProg.get(m.signature), cheProg)}`)].join("\t"),
    )
    .join("\n");

  const fichier = `// FICHIER GÉNÉRÉ par scripts/build-progressions.mjs — ne pas modifier à la main.
//
// Données : annotations TheoryTab (Hooktheory) publiées avec Sheet Sage par
// Chris Donahue, sous CC BY-NC-SA 3.0. Ce fichier en est une adaptation et
// relève donc de la MÊME licence. Voir CREDITS.md.
//
// Ce sont des PROGRESSIONS EN DEGRÉS, pas les accords exacts d'un morceau et
// pas un morceau jouable. Aucune mélodie, aucune tablature.
//
// Format — tout est encodé en chaînes pour que le navigateur n'ait qu'une
// chaîne à lire au lieu de dizaines de milliers d'objets à construire :
//
//   DEGRES        les degrés distincts, séparés par des espaces ; l'indice
//                 dans cette liste sert de code (deux chiffres base36).
//   PROGRESSIONS  ${listeProg.length} entrées de ${1 + 2 * TAILLE} caractères, concaténées :
//                 mode ("M" ou "m") puis ${TAILLE} codes de degré.
//   MORCEAUX      une ligne par artiste ; champs séparés par des tabulations :
//                 le nom de l'artiste, puis chaque morceau sous la forme
//                 "titre|progression". Les noms sont les identifiants
//                 Hooktheory (minuscules, tirets, échappements %28) : ils
//                 servent aussi à reconstruire l'URL TheoryTab.
//   INDEX         une entrée par progression, séparées par ";", dans l'ordre
//                 de PROGRESSIONS : "total:d,d,d…" où total est le nombre réel
//                 de morceaux (base36) et les d les indices de morceaux,
//                 encodés en écarts successifs (base36), au plus ${PLAFOND}.

export const TAILLE_PROGRESSION = ${TAILLE};
export const PLAFOND_MORCEAUX = ${PLAFOND};
export const LARGEUR_CODE_PROGRESSION = ${cheProg};

export const DEGRES =
  ${JSON.stringify(degres.join(" "))};

export const PROGRESSIONS =
  ${JSON.stringify(encodeProgressions)};

export const MORCEAUX =
  ${JSON.stringify(encodeMorceaux)};

export const INDEX =
  ${JSON.stringify(encodeIndex)};
`;

  writeFileSync(sortie, fichier);

  const classees = [...compte].sort((a, b) => b[1] - a[1]);
  console.log(`morceaux retenus        : ${morceaux.length}`);
  console.log(`écartés                 : ${rejetes}`);
  console.log(`artistes                : ${parArtiste.size}`);
  console.log(`degrés distincts        : ${degres.length}`);
  console.log(`progressions vues       : ${compte.size}`);
  console.log(`progressions retenues   : ${listeProg.length}`);
  console.log("\nles douze plus répandues :");
  for (const [p, n] of classees.slice(0, 12))
    console.log(`  ${(p[0] === "m" ? "mineur " : "majeur ") + p.slice(1)}`.padEnd(34) + `${n} morceaux`);
  const octets = Buffer.byteLength(fichier);
  console.log(`\npoids  DEGRES ${Buffer.byteLength(degres.join(" "))}`);
  console.log(`poids  PROGRESSIONS ${encodeProgressions.length}`);
  console.log(`poids  MORCEAUX ${Buffer.byteLength(encodeMorceaux)}`);
  console.log(`poids  INDEX ${encodeIndex.length}`);
  console.log(`poids  fichier ${octets} octets (${(octets / 1024).toFixed(0)} ko)`);
  void largeurProg;
}

main();
