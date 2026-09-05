#!/usr/bin/env node
/**
 * Construit l'index de progressions d'accords à partir de deux jeux de données
 * publics, et n'en garde que des DEGRÉS.
 *
 *   node --max-old-space-size=6144 scripts/build-progressions.mjs \
 *        --hooktheory=Hooktheory.json \
 *        --choco=choco/partitions \
 *        --sortie=src/content/progressions/donnees.ts
 *
 * Les deux entrées sont facultatives ; le fichier versionné est produit avec
 * les deux.
 *
 * SOURCES ET LICENCES — le détail est dans CREDITS.md. En deux mots :
 *   · Hooktheory / Sheet Sage (Chris Donahue) — CC BY-NC-SA 3.0
 *   · ChoCo (Polifonia) — CC BY 4.0, sauf trois sous-collections en
 *     CC BY-NC-SA 4.0 (Chordify, Mozart Piano Sonata, JAAH) qui ne sont PAS
 *     reprises ici.
 * Le fichier produit est une adaptation des deux : c'est la licence la plus
 * contraignante qui s'applique à l'ensemble, donc CC BY-NC-SA.
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
 *  1. Un morceau n'est retenu que s'il tient dans UNE seule tonalité, majeure
 *     ou mineure : un changement de tonalité rendrait les degrés faux sur une
 *     partie du morceau, et une progression fausse enseignée comme vraie est
 *     pire que pas de progression du tout. Les tonalités modales (« G:mix »)
 *     sont écartées pour la même raison.
 *  2. Un accord qu'on ne sait pas lire (accord de quinte sans tierce, accord
 *     incomplet, marque de pédale) COUPE la suite en deux au lieu d'être
 *     ignoré : sauter un accord inventerait un enchaînement qui n'existe pas.
 *  3. Les répétitions consécutives d'un même accord sont fusionnées : « I I V V »
 *     et « I V » sont la même progression jouée à deux vitesses.
 *  4. Un accord enrichi est ramené à son noyau — triade plus septième. « C9 »
 *     et « C13 » sont des V7 : les notes en plus ne changent pas le degré.
 *  5. On relève toutes les fenêtres de 4 accords. La progression « signature »
 *     d'un morceau est la plus répandue à l'échelle du corpus parmi celles
 *     qu'il contient — celle qu'un auditeur reconnaîtrait.
 *
 * CHIFFRAGE
 *
 * Les degrés sont nommés comme le fait le moteur d'harmonie de l'app
 * (src/lib/music/degres.ts) : position dans la gamme de la tonalité, majeure
 * ou mineure naturelle, avec ♭/♯ pour les notes hors gamme. C'est ce qui
 * permet de relier une progression du corpus aux leçons.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────── qualités d'accord

/** Les onze qualités que le chiffrage romain distingue ici. */
const Q = {
  maj: { suffixe: "", majuscule: true },
  min: { suffixe: "", majuscule: false },
  dim: { suffixe: "°", majuscule: false },
  aug: { suffixe: "+", majuscule: true },
  dom7: { suffixe: "7", majuscule: true },
  maj7: { suffixe: "maj7", majuscule: true },
  min7: { suffixe: "7", majuscule: false },
  demiDim7: { suffixe: "ø7", majuscule: false },
  dim7: { suffixe: "°7", majuscule: false },
  sus4: { suffixe: "sus4", majuscule: true },
  sus2: { suffixe: "sus2", majuscule: true },
};

/**
 * Noyau d'un accord : tierce, quinte et septième en demi-tons au-dessus de la
 * fondamentale (septième nulle si absente). C'est le seul endroit où une
 * qualité est décidée — les deux jeux de données y passent.
 */
function qualite(tierce, quinte, septieme) {
  if (tierce === 5 && quinte === 7 && septieme === null) return "sus4";
  if (tierce === 2 && quinte === 7 && septieme === null) return "sus2";
  if (tierce === 4) {
    if (quinte === 8) return septieme === null ? "aug" : null;
    if (quinte !== 7) return null;
    if (septieme === null) return "maj";
    if (septieme === 10) return "dom7";
    if (septieme === 11) return "maj7";
    return null;
  }
  if (tierce === 3) {
    if (quinte === 6) {
      if (septieme === null) return "dim";
      if (septieme === 9) return "dim7";
      if (septieme === 10) return "demiDim7";
      return null;
    }
    if (quinte !== 7) return null;
    if (septieme === null) return "min";
    if (septieme === 10) return "min7";
    return null;
  }
  return null;
}

// ─────────────────────────────────────────────── chiffres romains

/**
 * Chiffre romain par écart en demi-tons depuis la tonique, mode par mode.
 * Les degrés de la gamme n'ont pas d'altération ; les notes hors gamme portent
 * celle qui est d'usage dans ce mode-là (♭II napolitain, ♯VII sensible du
 * mineur harmonique, ♯VI du mineur mélodique).
 */
const ROMAINS = {
  major: ["I", "♭II", "II", "♭III", "III", "IV", "♭V", "V", "♭VI", "VI", "♭VII", "VII"],
  minor: ["I", "♭II", "II", "III", "♯III", "IV", "♯IV", "V", "VI", "♯VI", "VII", "♯VII"],
};

function chiffrer(mode, demiTons, q) {
  const { suffixe, majuscule } = Q[q];
  const base = ROMAINS[mode][((demiTons % 12) + 12) % 12];
  return (majuscule ? base : base.toLowerCase()) + suffixe;
}

/** Taille de la fenêtre : quatre accords, la maille de la chanson populaire. */
const TAILLE = 4;

/** Morceaux listés au plus par progression. Le total réel est conservé. */
const PLAFOND = 20;

/**
 * Découpe une suite d'accords (ou de coupures) en segments de degrés.
 * `accords` : liste de { demiTons, qualite } ou null pour une coupure.
 */
function segmenter(mode, accords) {
  const segments = [];
  let courant = [];
  for (const a of accords) {
    if (!a) {
      if (courant.length) segments.push(courant);
      courant = [];
      continue;
    }
    const degre = chiffrer(mode, a.demiTons, a.qualite);
    if (courant[courant.length - 1] !== degre) courant.push(degre);
  }
  if (courant.length) segments.push(courant);
  return segments.filter((s) => s.length >= TAILLE);
}

// ─────────────────────────────────────────────── Hooktheory

const MAJEUR = "2,2,1,2,2,2";
const MINEUR = "2,1,2,2,1,2";

function chargerHooktheory(fichier, journal) {
  const brut = JSON.parse(readFileSync(fichier, "utf8"));
  const morceaux = [];
  const vus = new Set();
  for (const id of Object.keys(brut)) {
    const entree = brut[id];
    const meta = entree.hooktheory;
    if (!meta?.artist || !meta?.song) continue;
    const cle = `${meta.artist}/${meta.song}`;
    // Un même morceau peut être annoté plusieurs fois (couplet, refrain…).
    if (vus.has(cle)) continue;

    const a = entree.annotations;
    if (!a?.harmony?.length || a.keys?.length !== 1) {
      journal.tonalite++;
      continue;
    }
    const intervalles = a.keys[0].scale_degree_intervals.join(",");
    const mode = intervalles === MAJEUR ? "major" : intervalles === MINEUR ? "minor" : null;
    if (!mode) {
      journal.tonalite++;
      continue;
    }

    const accords = a.harmony.map((accord) => {
      const iv = accord.root_position_intervals;
      const tierce = iv[0];
      const quinte = iv.length > 1 ? iv[0] + iv[1] : null;
      const septieme = iv.length > 2 ? iv[0] + iv[1] + iv[2] : null;
      const q = quinte === null ? null : qualite(tierce, quinte, septieme);
      if (!q) {
        journal.accords++;
        return null;
      }
      return { demiTons: accord.root_pitch_class - a.keys[0].tonic_pitch_class, qualite: q };
    });

    const segments = segmenter(mode, accords);
    if (!segments.length) {
      journal.court++;
      continue;
    }
    vus.add(cle);
    morceaux.push({ source: "H", artiste: meta.artist, titre: meta.song, mode, segments });
  }
  return morceaux;
}

// ─────────────────────────────────────────────── ChoCo

const CLASSES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Fondamentale écrite : « Bb », « F# », « E- » (music21 note le bémol « - »). */
function racine(texte, tiretBemol) {
  const m = /^([A-Ga-g])([#b\-♯♭]*)/.exec(texte);
  if (!m) return null;
  let pc = CLASSES[m[1].toUpperCase()];
  for (const c of m[2]) {
    if (c === "#" || c === "♯") pc += 1;
    else if (c === "b" || c === "♭") pc -= 1;
    else if (c === "-" && tiretBemol) pc -= 1;
    else return null;
  }
  return { pc: ((pc % 12) + 12) % 12, reste: texte.slice(m[0].length) };
}

/**
 * Tonalité : « C », « A:minor », « Dm », « E- major ». Les tonalités modales
 * (« G:mixolydian ») sont refusées : leurs degrés ne se comptent ni comme en
 * majeur ni comme en mineur.
 *
 * Le mode est comparé en entier, jamais par sa première lettre : « major » et
 * « minor » commencent tous deux par « m ».
 */
function lireTonalite(valeur) {
  const t = String(valeur).trim();
  const m = /^([A-G][#b\-]?)\s*[: ]?\s*(major|minor|maj|min|m)?$/.exec(t);
  if (!m) return null;
  const r = racine(m[1], true);
  if (!r || r.reste) return null;
  const suffixe = (m[2] ?? "").toLowerCase();
  const mineur = suffixe === "minor" || suffixe === "min" || suffixe === "m";
  return { pc: r.pc, mode: mineur ? "minor" : "major" };
}

/** Abréviations Harte, ramenées au noyau triade + septième. */
const HARTE = new Map(Object.entries({
  maj: [4, 7, null], min: [3, 7, null], dim: [3, 6, null], aug: [4, 8, null],
  maj7: [4, 7, 11], maj9: [4, 7, 11], maj11: [4, 7, 11], maj13: [4, 7, 11],
  min7: [3, 7, 10], min9: [3, 7, 10], min11: [3, 7, 10], min13: [3, 7, 10],
  7: [4, 7, 10], 9: [4, 7, 10], 11: [4, 7, 10], 13: [4, 7, 10],
  dim7: [3, 6, 9], hdim7: [3, 6, 10], hdim: [3, 6, 10],
  maj6: [4, 7, null], min6: [3, 7, null], 6: [4, 7, null],
  sus2: [2, 7, null], sus4: [5, 7, null],
}));

/** Intervalles Harte explicites : « 3,5,b7 ». */
function noyauDepuisDegres(liste) {
  const d = new Set(liste.map((x) => x.trim()));
  const tierce = d.has("3") ? 4 : d.has("b3") ? 3 : d.has("4") ? 5 : d.has("2") ? 2 : null;
  const quinte = d.has("b5") ? 6 : d.has("#5") ? 8 : d.has("5") ? 7 : null;
  const septieme = d.has("bb7") ? 9 : d.has("b7") ? 10 : d.has("7") ? 11 : null;
  if (tierce === null || quinte === null) return null;
  return [tierce, quinte, septieme];
}

/** Notation Harte : « C », « A:min », « G:(3,5,b7) », « D:maj7/5 », « N ». */
function lireHarte(valeur) {
  const s = String(valeur).trim();
  if (!s || s === "N" || s === "X") return null;
  const [tete, ...suite] = s.split("/")[0].split(":");
  const r = racine(tete, false);
  if (!r || r.reste) return null;
  const corps = suite.join(":");
  if (!corps) return { pc: r.pc, noyau: [4, 7, null] };

  const par = /\(([^)]*)\)/.exec(corps);
  const abrege = corps.replace(/\([^)]*\)/, "");
  if (par && !abrege) {
    const noyau = noyauDepuisDegres(par[1].split(","));
    return noyau ? { pc: r.pc, noyau } : null;
  }
  if (!par && HARTE.has(abrege)) return { pc: r.pc, noyau: HARTE.get(abrege) };
  if (par && HARTE.has(abrege)) {
    // « min(b7) » est un min7 ; « maj(*3) » est un accord amputé, illisible.
    const ajouts = par[1].split(",").map((x) => x.trim());
    if (ajouts.some((x) => x.startsWith("*"))) return null;
    const [tierce, quinte] = HARTE.get(abrege);
    const septieme = ajouts.includes("b7") ? 10 : ajouts.includes("7") ? 11 : HARTE.get(abrege)[2];
    return { pc: r.pc, noyau: [tierce, quinte, septieme] };
  }
  return null;
}

/** Chiffrages music21 : « C », « E- », « Dm7 », « B-7 », « Cmaj7 ». */
const M21 = [
  [/^(m7b5|min7b5|ø7?|halfdim)/, [3, 6, 10]],
  [/^(dim7|o7|°7)/, [3, 6, 9]],
  [/^(dim|o|°)/, [3, 6, null]],
  [/^(aug|\+)/, [4, 8, null]],
  [/^(maj7|maj9|maj11|maj13|M7|Ma7|ma7)/, [4, 7, 11]],
  [/^(m|min|-)(7|9|11|13)/, [3, 7, 10]],
  [/^(m|min|-)6/, [3, 7, null]],
  [/^(m|min|-)/, [3, 7, null]],
  [/^sus2/, [2, 7, null]],
  [/^(7sus4?|sus4?)/, [5, 7, null]],
  [/^(7|9|11|13)/, [4, 7, 10]],
  [/^(6|add9|add2)?$/, [4, 7, null]],
];

function lireM21(valeur) {
  const s = String(valeur).trim();
  if (!s || s === "N" || s === "NC") return null;
  const r = racine(s.split("/")[0], true);
  if (!r) return null;
  const reste = r.reste
    .replace(/\([^)]*\)/g, "")
    .replace(/b9|#9|#11|b13|alt/g, "")
    .trim();
  for (const [motif, noyau] of M21) if (motif.test(reste)) return { pc: r.pc, noyau };
  return null;
}

/**
 * Partitions reprises, avec leur espace de noms d'accords et leur lecteur.
 *
 * Écartées volontairement, et pourquoi :
 *   · chordify, mozart-piano-sonatas, jaah  → CC BY-NC-SA, licence plus
 *     contraignante que le reste de ChoCo : hors sujet ici.
 *   · rwc-pop, uspop2002                    → aucune annotation de tonalité,
 *     donc aucun degré calculable sans la deviner.
 *   · rock-corpus, when-in-rome             → déjà en chiffres romains, dans
 *     une convention différente (V6/5, I64) qu'il faudrait retraduire.
 *   · weimar                                → convention où « - » veut dire
 *     mineur, l'inverse de music21 : un lecteur de plus pour 456 solos de jazz.
 *   · nottingham, jazz-corpus               → airs traditionnels sans auteur et
 *     morceaux sans titre : le corpus sert à reconnaître des morceaux connus.
 *   · biab-internet-corpus                  → 4 989 fichiers Band-in-a-Box
 *     d'origine incertaine, sans nom d'artiste. Volume sans identité.
 *   · real-book                             → 2 818 grilles de jazz sans aucun
 *     nom d'auteur ni d'interprète, et des titres qui ne sont pas des titres
 *     (« NOTES », « BALLADI »). Même raison : du volume sans identité.
 *
 * Wikifonia crédite le COMPOSITEUR et non l'interprète : « Lonesome Town » y
 * est signé Baker Knight, pas Ricky Nelson. L'interface le dit, sinon elle
 * mentirait.
 */
const PARTITIONS = {
  billboard: { ns: "chord", lire: lireHarte, code: "B", credit: "interprète" },
  isophonics: { ns: "chord", lire: lireHarte, code: "I", credit: "interprète" },
  "robbie-williams": { ns: "chord", lire: lireHarte, code: "R", credit: "interprète" },
  wikifonia: { ns: "chord_m21_leadsheet", lire: lireM21, code: "W", credit: "compositeur" },
};

function chargerChoco(dossier, journal) {
  const morceaux = [];
  for (const [nom, { ns, lire, code }] of Object.entries(PARTITIONS)) {
    let fichiers;
    try {
      fichiers = readdirSync(join(dossier, nom, "choco", "jams"));
    } catch {
      console.warn(`partition absente : ${nom}`);
      continue;
    }
    for (const f of fichiers) {
      let d;
      try {
        // Quelques fichiers contiennent NaN, que JSON refuse.
        d = JSON.parse(readFileSync(join(dossier, nom, "choco", "jams", f), "utf8")
          .replace(/\bNaN\b/g, "null"));
      } catch {
        journal.illisible++;
        continue;
      }
      const titre = String(d.file_metadata?.title ?? "").trim();
      if (!titre) continue;
      const bac = d.sandbox ?? {};
      const artiste = String(bac.performers?.[0] ?? bac.composers?.[0] ?? "").trim();

      const tonalites = [...new Set(
        d.annotations.filter((a) => a.namespace?.startsWith("key"))
          .flatMap((a) => a.data ?? [])
          .map((c) => String(c.value))
          .filter((v) => v && v !== "N"),
      )];
      if (tonalites.length !== 1) {
        journal.tonalite++;
        continue;
      }
      const cle = lireTonalite(tonalites[0]);
      if (!cle) {
        journal.tonalite++;
        continue;
      }

      const brut = d.annotations.find((a) => a.namespace === ns)?.data ?? [];
      const accords = brut.map((c) => {
        const a = lire(c.value);
        if (!a) {
          journal.accords++;
          return null;
        }
        const q = qualite(a.noyau[0], a.noyau[1], a.noyau[2]);
        if (!q) {
          journal.accords++;
          return null;
        }
        return { demiTons: a.pc - cle.pc, qualite: q };
      });

      const segments = segmenter(cle.mode, accords);
      if (!segments.length) {
        journal.court++;
        continue;
      }
      morceaux.push({ source: code, artiste, titre, mode: cle.mode, segments });
    }
  }
  return morceaux;
}

// ─────────────────────────────────────────────── fusion et encodage

const b36 = (n, largeur) => n.toString(36).padStart(largeur, "0");

/** Clé de comparaison entre deux jeux de données : sans casse ni ponctuation. */
function empreinte(artiste, titre) {
  const net = (s) =>
    decodeURIComponent(s.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"))
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${net(artiste)}|${net(titre)}`;
}

function fenetres(segments, mode) {
  const out = new Set();
  const prefixe = mode === "minor" ? "m" : "M";
  for (const s of segments) {
    for (let i = 0; i + TAILLE <= s.length; i++) {
      out.add(prefixe + s.slice(i, i + TAILLE).join("-"));
    }
  }
  return [...out];
}

function arguments_() {
  const out = {};
  for (const a of process.argv.slice(2)) {
    const m = /^--([a-z]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function main() {
  const { hooktheory, choco, sortie } = arguments_();
  if (!sortie) {
    console.error(
      "usage : node scripts/build-progressions.mjs [--hooktheory=<Hooktheory.json>] " +
        "[--choco=<dossier partitions>] --sortie=<fichier.ts>",
    );
    process.exit(1);
  }

  const journal = { tonalite: 0, accords: 0, court: 0, illisible: 0 };
  let morceaux = [];
  if (hooktheory) {
    const m = chargerHooktheory(hooktheory, journal);
    console.log(`Hooktheory : ${m.length} morceaux`);
    morceaux.push(...m);
  }
  if (choco) {
    const m = chargerChoco(choco, journal);
    for (const [nom, { code }] of Object.entries(PARTITIONS)) {
      console.log(`ChoCo ${nom.padEnd(16)} : ${m.filter((x) => x.source === code).length} morceaux`);
    }
    morceaux.push(...m);
  }

  // Dédoublonnage : un morceau annoté deux fois ne doit pas peser double dans
  // « combien de morceaux emploient cette progression ». Le premier arrivé
  // gagne, et Hooktheory arrive en premier — c'est la seule source qui porte
  // un lien vers sa fiche d'origine.
  const vus = new Set();
  let doublons = 0;
  morceaux = morceaux.filter((m) => {
    const e = empreinte(m.artiste, m.titre);
    // Sans nom d'artiste, on ne compare que les titres du même jeu de données.
    const cle = m.artiste ? e : `${m.source}|${e}`;
    if (vus.has(cle)) {
      doublons++;
      return false;
    }
    vus.add(cle);
    return true;
  });

  for (const m of morceaux) m.fenetres = fenetres(m.segments, m.mode);
  morceaux = morceaux.filter((m) => m.fenetres.length);

  const compte = new Map();
  for (const m of morceaux) for (const f of m.fenetres) compte.set(f, (compte.get(f) ?? 0) + 1);

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

  // Regroupement par (source, artiste) : les noms se répètent, les stocker une
  // fois économise une bonne dizaine de kilo-octets.
  morceaux.sort(
    (a, b) =>
      a.source.localeCompare(b.source) ||
      a.artiste.localeCompare(b.artiste) ||
      a.titre.localeCompare(b.titre),
  );
  const rang = new Map(morceaux.map((m, i) => [m, i]));

  const listeProg = [...retenues].sort(
    (a, b) => (compte.get(b) ?? 0) - (compte.get(a) ?? 0) || a.localeCompare(b),
  );
  const indexProg = new Map(listeProg.map((p, i) => [p, i]));

  const degres = [];
  const indexDegre = new Map();
  for (const p of listeProg) {
    for (const d of p.slice(1).split("-")) {
      if (!indexDegre.has(d)) {
        indexDegre.set(d, degres.length);
        degres.push(d);
      }
    }
  }
  if (degres.length > 36 * 36) throw new Error("trop de degrés pour deux chiffres base36");

  const parProg = new Map(listeProg.map((p) => [p, []]));
  for (const m of morceaux) {
    for (const f of m.fenetres) {
      const l = parProg.get(f);
      if (l) l.push(rang.get(m));
    }
  }

  const largeurProg = Math.max(2, b36(listeProg.length - 1, 1).length);

  const encodeProgressions = listeProg
    .map((p) => p[0] + p.slice(1).split("-").map((d) => b36(indexDegre.get(d), 2)).join(""))
    .join("");

  const encodeIndex = listeProg
    .map((p) => {
      const tous = parProg.get(p).sort((a, b) => a - b);
      let precedent = 0;
      const deltas = tous.slice(0, PLAFOND).map((id) => {
        const d = id - precedent;
        precedent = id;
        return d.toString(36);
      });
      return `${tous.length.toString(36)}:${deltas.join(",")}`;
    })
    .join(";");

  const lignes = [];
  let ligne = null;
  for (const m of morceaux) {
    if (!ligne || ligne.source !== m.source || ligne.artiste !== m.artiste) {
      ligne = { source: m.source, artiste: m.artiste, morceaux: [] };
      lignes.push(ligne);
    }
    ligne.morceaux.push(`${m.titre}|${b36(indexProg.get(m.signature), largeurProg)}`);
  }
  const encodeMorceaux = lignes
    .map((l) => [l.source + l.artiste, ...l.morceaux].join("\t"))
    .join("\n");

  const fichier = `// FICHIER GÉNÉRÉ par scripts/build-progressions.mjs — ne pas modifier à la main.
//
// Deux jeux de données, l'un et l'autre publics :
//   · Hooktheory / TheoryTab, publié avec Sheet Sage par Chris Donahue,
//     sous CC BY-NC-SA 3.0 ;
//   · ChoCo (Polifonia), sous CC BY 4.0 — partitions Billboard, Isophonics,
//     Robbie Williams et Wikifonia.
// Ce fichier en est une adaptation : c'est la licence la plus contraignante
// des deux qui s'applique, donc CC BY-NC-SA. Voir CREDITS.md.
//
// Ce sont des PROGRESSIONS EN DEGRÉS, pas les accords exacts d'un morceau et
// pas un morceau jouable. Aucune mélodie, aucune tablature.
//
// Format — tout est encodé en chaînes pour que le navigateur n'ait que quatre
// chaînes à lire au lieu de dizaines de milliers d'objets à construire :
//
//   DEGRES        les degrés distincts, séparés par des espaces ; l'indice
//                 dans cette liste sert de code (deux chiffres base36).
//   PROGRESSIONS  ${listeProg.length} entrées de ${1 + 2 * TAILLE} caractères, concaténées :
//                 mode ("M" ou "m") puis ${TAILLE} codes de degré.
//   MORCEAUX      une ligne par (source, artiste) ; champs séparés par des
//                 tabulations. Le premier champ est le code de source suivi du
//                 nom de l'artiste ; les suivants sont "titre|progression".
//                 Codes de source : H Hooktheory, B Billboard, I Isophonics,
//                 R Robbie Williams, W Wikifonia. Pour H, le nom est
//                 l'identifiant Hooktheory (minuscules, tirets, %28) : il sert
//                 aussi à reconstruire l'URL TheoryTab. Pour W, le nom est
//                 celui du COMPOSITEUR ; pour les autres, de l'interprète.
//   INDEX         une entrée par progression, séparées par ";", dans l'ordre
//                 de PROGRESSIONS : "total:d,d,d…" où total est le nombre réel
//                 de morceaux (base36) et les d les indices de morceaux,
//                 encodés en écarts successifs (base36), au plus ${PLAFOND}.

export const TAILLE_PROGRESSION = ${TAILLE};
export const PLAFOND_MORCEAUX = ${PLAFOND};
export const LARGEUR_CODE_PROGRESSION = ${largeurProg};

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
  console.log(`\nmorceaux retenus        : ${morceaux.length}`);
  console.log(`doublons entre sources  : ${doublons}`);
  console.log(`écartés — tonalité      : ${journal.tonalite}`);
  console.log(`écartés — trop court    : ${journal.court}`);
  console.log(`accords illisibles      : ${journal.accords} (ils coupent la suite)`);
  console.log(`lignes (source+artiste) : ${lignes.length}`);
  console.log(`degrés distincts        : ${degres.length}`);
  console.log(`progressions vues       : ${compte.size}`);
  console.log(`progressions retenues   : ${listeProg.length}`);
  console.log("\nles douze plus répandues :");
  for (const [p, n] of classees.slice(0, 12)) {
    console.log(`  ${((p[0] === "m" ? "mineur " : "majeur ") + p.slice(1)).padEnd(32)}${n} morceaux`);
  }
  const octets = Buffer.byteLength(fichier);
  console.log(`\npoids  DEGRES ${Buffer.byteLength(degres.join(" "))}`);
  console.log(`poids  PROGRESSIONS ${encodeProgressions.length}`);
  console.log(`poids  MORCEAUX ${Buffer.byteLength(encodeMorceaux)}`);
  console.log(`poids  INDEX ${encodeIndex.length}`);
  console.log(`poids  fichier ${octets} octets (${(octets / 1024).toFixed(0)} ko)`);
}

main();
