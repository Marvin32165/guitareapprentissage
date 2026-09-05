// Chiffrage en degrés : passer d'une suite d'accords réels à des chiffres
// romains, et l'inverse.
//
// C'est le pont entre ce que les doigts jouent (« Do Sol La m Fa ») et ce que
// la théorie en dit (« I V vi IV en do majeur »). Le vocabulaire produit ici
// est EXACTEMENT celui du corpus de progressions (src/content/progressions) :
// un test vérifie que tous les degrés du corpus sont reproductibles par ces
// fonctions, sinon l'index et l'app se mettraient à parler deux langues.

import {
  type Letter,
  type Note,
  formatNote,
  formatNoteLatin,
  letterAt,
  letterIndex,
  naturalPitchClass,
  note,
} from "./pitch";

export type Mode = "major" | "minor";

/**
 * Qualités d'accord que le corpus distingue. Les enrichissements (9, 11, 13,
 * add9, 6) se ramènent à l'une d'elles : ce sont les mêmes degrés, avec des
 * notes en plus.
 */
export type QualiteDegre =
  | "maj"
  | "min"
  | "dim"
  | "aug"
  | "dom7"
  | "maj7"
  | "min7"
  | "demiDim7"
  | "dim7"
  | "sus4"
  | "sus2";

const SUFFIXE: Record<QualiteDegre, { suffixe: string; majuscule: boolean }> = {
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

export const QUALITES_DEGRE = Object.keys(SUFFIXE) as QualiteDegre[];

/**
 * Chiffre romain par écart en demi-tons depuis la tonique, mode par mode.
 * Les degrés de la gamme n'ont pas d'altération ; les notes hors gamme portent
 * celle qui est d'usage dans ce mode-là (♭II napolitain en majeur comme en
 * mineur, ♯VII sensible du mineur harmonique, ♯VI du mineur mélodique).
 *
 * Ce sont les mêmes tables que scripts/build-progressions.mjs. Elles ne
 * peuvent pas être importées de là (le générateur tourne hors TypeScript) :
 * c'est le test degres.test.ts qui garantit qu'elles n'ont pas divergé.
 */
export const ROMAINS: Record<Mode, readonly string[]> = {
  major: ["I", "♭II", "II", "♭III", "III", "IV", "♭V", "V", "♭VI", "VI", "♭VII", "VII"],
  minor: ["I", "♭II", "II", "III", "♯III", "IV", "♯IV", "V", "VI", "♯VI", "VII", "♯VII"],
};

/** Nom du degré : « I », « vi », « ♭VII », « ii7 », « viiø7 »… */
export function nomDegre(mode: Mode, demiTons: number, qualite: QualiteDegre): string {
  const { suffixe, majuscule } = SUFFIXE[qualite];
  const base = ROMAINS[mode][((demiTons % 12) + 12) % 12];
  return (majuscule ? base : base.toLowerCase()) + suffixe;
}

/**
 * Découpe un degré en sa partie romaine et son suffixe : « viiø7 » →
 * { romain: "vii", suffixe: "ø7" }. Sert à comparer deux degrés en ignorant
 * la qualité, pour les accords dont on ne connaît pas la tierce (accords de
 * quinte, « power chords »).
 */
export function decouperDegre(degre: string): { romain: string; suffixe: string } {
  const m = /^([♭♯]?[IViv]+)(.*)$/.exec(degre);
  if (!m) return { romain: degre, suffixe: "" };
  return { romain: m[1], suffixe: m[2] };
}

// ── Lecture d'un chiffrage d'accord écrit à la main ──

export interface AccordLu {
  /** Classe de hauteur de la fondamentale, 0 = Do. */
  fondamentale: number;
  /** Orthographe telle qu'écrite, pour pouvoir la réafficher. */
  note: Note;
  /** null pour un accord de quinte : la tierce n'est pas donnée. */
  qualite: QualiteDegre | null;
  /** Le symbole tel qu'il a été saisi. */
  saisi: string;
}

const LETTRES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Suffixes reconnus, du plus long au plus court : « m7b5 » doit être essayé
 * avant « m7 », lui-même avant « m ».
 */
const SUFFIXES: [string, QualiteDegre | null][] = [
  ["m7b5", "demiDim7"], ["m7♭5", "demiDim7"], ["min7b5", "demiDim7"],
  ["ø7", "demiDim7"], ["ø", "demiDim7"],
  ["dim7", "dim7"], ["°7", "dim7"], ["o7", "dim7"],
  ["dim", "dim"], ["°", "dim"], ["mb5", "dim"],
  ["aug", "aug"], ["+", "aug"], ["#5", "aug"], ["♯5", "aug"],
  ["maj13", "maj7"], ["maj11", "maj7"], ["maj9", "maj7"], ["maj7", "maj7"],
  ["M7", "maj7"], ["Δ7", "maj7"], ["Δ", "maj7"], ["j7", "maj7"],
  ["min13", "min7"], ["min11", "min7"], ["min9", "min7"], ["min7", "min7"],
  ["m13", "min7"], ["m11", "min7"], ["m9", "min7"], ["m7", "min7"], ["-7", "min7"],
  ["sus4", "sus4"], ["sus2", "sus2"], ["sus", "sus4"],
  ["13", "dom7"], ["11", "dom7"], ["9", "dom7"], ["7", "dom7"],
  ["add9", "maj"], ["add11", "maj"], ["6", "maj"],
  ["m6", "min"], ["min6", "min"], ["madd9", "min"],
  ["min", "min"], ["m", "min"], ["-", "min"],
  ["maj", "maj"], ["M", "maj"],
  ["5", null],
  ["", "maj"],
];

/**
 * Lit « C », « Am », « F#m7 », « Bbmaj7 », « G7 », « Dsus4 », « E5 », « C/G ».
 * L'accord renversé (« C/G ») est ramené à son état fondamental : le degré ne
 * change pas, c'est la basse qui change. Rend null si ce n'est pas un accord.
 */
export function lireAccord(saisi: string): AccordLu | null {
  const brut = saisi.trim().replace(/\s+/g, "");
  if (!brut) return null;
  // Renversement : « C/G ». On garde la partie gauche.
  const sansBasse = brut.split("/")[0];
  const m = /^([A-Ga-g])([#b♯♭x]{0,2})(.*)$/.exec(sansBasse);
  if (!m) return null;

  const lettre = m[1].toUpperCase();
  let alteration = 0;
  for (const c of m[2]) {
    if (c === "#" || c === "♯") alteration += 1;
    else if (c === "b" || c === "♭") alteration -= 1;
    else if (c === "x") alteration += 2;
  }
  const reste = m[3];

  for (const [suffixe, qualite] of SUFFIXES) {
    if (reste === suffixe) {
      return {
        fondamentale: (((LETTRES[lettre] + alteration) % 12) + 12) % 12,
        note: note(lettre as Letter, alteration),
        qualite,
        saisi: brut,
      };
    }
  }
  return null;
}

/**
 * Lit une suite d'accords séparés par des espaces, virgules ou tirets.
 * Les répétitions consécutives sont fusionnées, comme à la construction du
 * corpus : « C C G G » et « C G » sont la même progression, jouée deux fois
 * plus lentement.
 */
export function lireSuiteAccords(saisi: string): { accords: AccordLu[]; refuses: string[] } {
  // Le tiret n'est pas un séparateur de premier rang : « C-7 » est un accord.
  // On ne le coupe que si le jeton entier ne se lit pas (« C-G-Am-F »).
  const jetons: string[] = [];
  for (const jeton of saisi.split(/[\s,;|\u2013\u2014]+/u).filter(Boolean)) {
    if (lireAccord(jeton) || !jeton.includes("-")) jetons.push(jeton);
    else jetons.push(...jeton.split("-").filter(Boolean));
  }

  const accords: AccordLu[] = [];
  const refuses: string[] = [];
  for (const jeton of jetons) {
    const a = lireAccord(jeton);
    if (!a) {
      refuses.push(jeton);
      continue;
    }
    // Répétitions consécutives fusionnées, comme à la construction du corpus.
    const precedent = accords[accords.length - 1];
    if (precedent && precedent.fondamentale === a.fondamentale && precedent.qualite === a.qualite) {
      continue;
    }
    accords.push(a);
  }
  return { accords, refuses };
}

// ── Tonalités ──

/**
 * Orthographe d'usage d'une tonalité : celle de son armure. Do♯ majeur existe
 * mais s'écrit Ré♭ ; en mineur c'est l'inverse pour la même hauteur.
 */
const TONALITES: Record<Mode, [Letter, number][]> = {
  major: [
    ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
    ["F", 1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
  ],
  minor: [
    ["C", 0], ["C", 1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
    ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["B", -1], ["B", 0],
  ],
};

export function toniqueDe(classeDeHauteur: number, mode: Mode): Note {
  const [lettre, alteration] = TONALITES[mode][((classeDeHauteur % 12) + 12) % 12];
  return note(lettre, alteration);
}

/** « Do majeur (C) », « La mineur (A) ». */
export function nomTonalite(classeDeHauteur: number, mode: Mode): string {
  const t = toniqueDe(classeDeHauteur, mode);
  return `${formatNoteLatin(t)} ${mode === "major" ? "majeur" : "mineur"} (${formatNote(t)})`;
}

// ── Du degré vers l'accord réel ──

const CHIFFRES = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** Demi-tons empilés sur la fondamentale, pour chaque qualité. */
const INTERVALLES: Record<QualiteDegre, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  demiDim7: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
};

/**
 * Suffixe du chiffrage romain (et casse) vers la qualité d'accord et le
 * suffixe qu'on écrit sur une grille. La casse porte la moitié de
 * l'information : « vii°7 » est diminué, « VII7 » est une septième de
 * dominante. Un test vérifie que cette table est l'exact inverse de nomDegre().
 */
const DEPUIS_DEGRE: Record<string, { qualite: QualiteDegre; accord: string }> = {
  "|majuscule": { qualite: "maj", accord: "" },
  "|minuscule": { qualite: "min", accord: "m" },
  "°|minuscule": { qualite: "dim", accord: "°" },
  "+|majuscule": { qualite: "aug", accord: "+" },
  "7|majuscule": { qualite: "dom7", accord: "7" },
  "7|minuscule": { qualite: "min7", accord: "m7" },
  "maj7|majuscule": { qualite: "maj7", accord: "maj7" },
  "ø7|minuscule": { qualite: "demiDim7", accord: "m7♭5" },
  "°7|minuscule": { qualite: "dim7", accord: "°7" },
  "sus4|majuscule": { qualite: "sus4", accord: "sus4" },
  "sus2|majuscule": { qualite: "sus2", accord: "sus2" },
};

export interface DegreLu {
  /** Rang dans la gamme, 1..7 : c'est lui qui donne la LETTRE de l'accord. */
  rang: number;
  /** Écart en demi-tons depuis la tonique. */
  demiTons: number;
  qualite: QualiteDegre;
  /** Suffixe d'accord : "", "m", "7", "m7♭5"… */
  suffixe: string;
}

/** « ♭VII7 » → rang 7, 10 demi-tons, septième de dominante. */
export function lireDegre(mode: Mode, degre: string): DegreLu | null {
  const m = /^([♭♯]?)([IViv]+)(.*)$/.exec(degre);
  if (!m) return null;
  const rang = CHIFFRES.indexOf(m[2].toUpperCase()) + 1;
  if (rang === 0) return null;
  const demiTons = ROMAINS[mode].indexOf(m[1] + m[2].toUpperCase());
  if (demiTons < 0) return null;
  const casse = m[2] === m[2].toUpperCase() ? "majuscule" : "minuscule";
  const trouve = DEPUIS_DEGRE[`${m[3]}|${casse}`];
  if (!trouve) return null;
  return { rang, demiTons, qualite: trouve.qualite, suffixe: trouve.accord };
}

function alterationPour(lettre: Letter, viseePc: number): number {
  let a = viseePc - naturalPitchClass(lettre);
  if (a > 6) a -= 12;
  if (a < -6) a += 12;
  return a;
}

function joli(texte: string): string {
  return texte.replace(/#/g, "♯").replace(/b/g, "♭");
}

/**
 * L'accord réel d'un degré dans une tonalité. L'orthographe suit le chiffre :
 * le III de do mineur s'écrit Mi♭, jamais Ré♯, parce que c'est un TROISIÈME
 * degré — la lettre vient du rang, l'altération de la hauteur.
 */
export function accordDuDegre(
  mode: Mode,
  degre: string,
  toniquePc: number,
): { note: Note; anglo: string; latin: string } | null {
  const lu = lireDegre(mode, degre);
  if (!lu) return null;

  const tonique = toniqueDe(toniquePc, mode);
  const lettre = letterAt(letterIndex(tonique.letter) + lu.rang - 1);
  const alteration = alterationPour(lettre, (((toniquePc + lu.demiTons) % 12) + 12) % 12);
  // Au-delà du double dièse l'orthographe n'a plus de sens : mieux vaut ne
  // rien afficher qu'écrire un Fa###.
  if (Math.abs(alteration) > 2) return null;
  const fondamentale = note(lettre, alteration);

  return {
    note: fondamentale,
    anglo: joli(formatNote(fondamentale)) + lu.suffixe,
    latin: joli(formatNoteLatin(fondamentale)) + lu.suffixe,
  };
}

/**
 * Les hauteurs de l'accord d'un degré, en classes de hauteur (0 = Do), de la
 * fondamentale vers le haut. C'est ce qu'il faut pour le FAIRE ENTENDRE :
 * l'orthographe n'intervient pas dans le son.
 */
export function hauteursDuDegre(mode: Mode, degre: string, toniquePc: number): number[] | null {
  const lu = lireDegre(mode, degre);
  if (!lu) return null;
  const racine = toniquePc + lu.demiTons;
  return INTERVALLES[lu.qualite].map((d) => (((racine + d) % 12) + 12) % 12);
}

/**
 * Une suite de degrés jouée dans une tonalité : ["C", "G", "Am", "F"].
 * Rend null si un seul degré n'est pas orthographiable — plutôt qu'une grille
 * à trous.
 */
export function accordsDesDegres(
  mode: Mode,
  degres: string[],
  toniquePc: number,
  systeme: "anglo" | "latin" = "anglo",
): string[] | null {
  const out: string[] = [];
  for (const degre of degres) {
    const a = accordDuDegre(mode, degre, toniquePc);
    if (!a) return null;
    out.push(systeme === "latin" ? a.latin : a.anglo);
  }
  return out;
}
