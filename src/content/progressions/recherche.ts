// Les trois usages du corpus, au-dessus du décodage brut :
//   - d'une progression vers les morceaux qui l'emploient (depuis une leçon) ;
//   - d'un titre de morceau vers sa progression (depuis le répertoire) ;
//   - d'une suite d'accords vers les progressions du corpus (recherche inverse).
//
// Rappel affiché partout dans l'interface, et vrai ici aussi : ce sont des
// progressions EN DEGRÉS. Le corpus ne contient ni les accords exacts d'un
// morceau, ni sa mélodie, ni de quoi le jouer.

import {
  type Mode,
  type AccordLu,
  ROMAINS,
  decouperDegre,
  lireSuiteAccords,
  nomDegre,
  nomTonalite,
  toniqueDe,
} from "@/lib/music/degres";
import {
  formatNote,
  formatNoteLatin,
  letterAt,
  letterIndex,
  naturalPitchClass,
  note,
  type Note,
} from "@/lib/music/pitch";
import {
  chargerCorpus,
  chercherMorceaux,
  morceauxDe,
  progressionParDegres,
  progressionsCompatibles,
  type CibleDegre,
  type MorceauCorpus,
  type ProgressionCorpus,
  type TrouvailleMorceau,
} from "./corpus";

export type { MorceauCorpus, ProgressionCorpus, TrouvailleMorceau };

/** Combien de morceaux le corpus contient, pour le dire honnêtement. */
export async function tailleCorpus(): Promise<{ morceaux: number; progressions: number }> {
  const c = await chargerCorpus();
  return { morceaux: c.nbMorceaux, progressions: c.progressions.length };
}

// ── 1. D'une progression vers les morceaux ──

export interface ProgressionEtMorceaux {
  progression: ProgressionCorpus;
  morceaux: MorceauCorpus[];
  /** Vrai si le corpus en connaît plus que la liste n'en montre. */
  tronque: boolean;
}

/**
 * Les morceaux du corpus qui emploient cette progression. `degres` s'écrit
 * comme dans les leçons : ["I", "V", "vi", "IV"].
 */
export async function morceauxDeLaProgression(
  mode: Mode,
  degres: string[],
): Promise<ProgressionEtMorceaux | null> {
  const c = await chargerCorpus();
  const progression = progressionParDegres(c, mode, degres);
  if (!progression) return null;
  const morceaux = morceauxDe(c, progression.id);
  return { progression, morceaux, tronque: progression.total > morceaux.length };
}

// ── 2. D'un titre vers sa progression ──

export async function chercherMorceau(requete: string, max = 12): Promise<TrouvailleMorceau[]> {
  const c = await chargerCorpus();
  return chercherMorceaux(c, requete, max);
}

// ── 3. D'une suite d'accords vers les progressions ──

export interface ResultatAccords {
  progression: ProgressionCorpus;
  /** Tonalité sous-entendue par cette lecture. */
  tonique: number;
  tonalite: string;
  /** Position des accords saisis dans la progression. */
  position: number;
  morceaux: MorceauCorpus[];
  tronque: boolean;
}

export interface RechercheAccords {
  accords: AccordLu[];
  /** Ce qui n'a pas pu être lu comme un accord. */
  refuses: string[];
  resultats: ResultatAccords[];
}

/**
 * Cherche une suite d'accords dans le corpus SANS demander la tonalité : on
 * essaie les douze toniques dans les deux modes et on garde les lectures qui
 * tombent sur une progression connue. C'est plus honnête que de deviner : « Do
 * Sol La m Fa » est I-V-vi-IV en do majeur ET III-VII-i-VI en la mineur, et
 * les deux lectures sont justes.
 */
export async function chercherParAccords(saisi: string, max = 24): Promise<RechercheAccords> {
  const { accords, refuses } = lireSuiteAccords(saisi);
  if (accords.length < 2) return { accords, refuses, resultats: [] };

  const c = await chargerCorpus();
  const vues = new Set<number>();
  const resultats: ResultatAccords[] = [];

  for (const mode of ["major", "minor"] as Mode[]) {
    for (let tonique = 0; tonique < 12; tonique++) {
      // On passe par nomDegre() plutôt que par une table à part : c'est la
      // fonction qui a servi à écrire le corpus, donc la casse et les suffixes
      // ne peuvent pas diverger.
      const cibles: CibleDegre[] = accords.map((a) => {
        const demiTons = a.fondamentale - tonique;
        if (a.qualite === null) {
          return { romain: ROMAINS[mode][((demiTons % 12) + 12) % 12], suffixe: null };
        }
        return decouperDegre(nomDegre(mode, demiTons, a.qualite));
      });
      for (const m of progressionsCompatibles(c, cibles, tonique, mode)) {
        if (vues.has(m.progression.id)) continue;
        vues.add(m.progression.id);
        const morceaux = morceauxDe(c, m.progression.id);
        resultats.push({
          progression: m.progression,
          tonique,
          tonalite: nomTonalite(tonique, mode),
          position: m.position,
          morceaux,
          tronque: m.progression.total > morceaux.length,
        });
      }
    }
  }

  resultats.sort((a, b) => b.progression.total - a.progression.total || a.position - b.position);
  return { accords, refuses, resultats: resultats.slice(0, max) };
}

// ── Des degrés vers des accords réels ──

const CHIFFRES = ["I", "II", "III", "IV", "V", "VI", "VII"];

/**
 * Du suffixe de degré vers le suffixe d'accord. La casse du chiffre romain
 * porte la moitié de l'information : « vii°7 » est diminué, « VII7 » est un
 * accord de septième de dominante. Un test vérifie que cette table couvre
 * exactement les qualités que nomDegre() sait produire.
 */
export const SUFFIXE_ACCORD: Record<string, string> = {
  "|majuscule": "",
  "|minuscule": "m",
  "°|minuscule": "°",
  "+|majuscule": "+",
  "7|majuscule": "7",
  "7|minuscule": "m7",
  "maj7|majuscule": "maj7",
  "ø7|minuscule": "m7♭5",
  "°7|minuscule": "°7",
  "sus4|majuscule": "sus4",
  "sus2|majuscule": "sus2",
};

/** « ♭VII7 » -> rang 7, 10 demi-tons, suffixe « 7 », majuscule. */
function lireDegre(
  mode: Mode,
  degre: string,
): { rang: number; demiTons: number; suffixe: string; casse: "majuscule" | "minuscule" } | null {
  const m = /^([♭♯]?)([IViv]+)(.*)$/.exec(degre);
  if (!m) return null;
  const rang = CHIFFRES.indexOf(m[2].toUpperCase()) + 1;
  if (rang === 0) return null;
  const demiTons = ROMAINS[mode].indexOf(m[1] + m[2].toUpperCase());
  if (demiTons < 0) return null;
  return {
    rang,
    demiTons,
    suffixe: m[3],
    casse: m[2] === m[2].toUpperCase() ? "majuscule" : "minuscule",
  };
}

function joli(texte: string): string {
  return texte.replace(/#/g, "♯").replace(/b/g, "♭");
}

/**
 * L'accord réel d'un degré dans une tonalité. L'orthographe suit le chiffre :
 * le ♭III de do mineur s'écrit Mi♭, jamais Ré♯, parce que c'est un troisième
 * degré — la lettre vient du rang, l'altération de la hauteur.
 */
export function accordDuDegre(
  mode: Mode,
  degre: string,
  toniquePc: number,
): { note: Note; anglo: string; latin: string } | null {
  const lu = lireDegre(mode, degre);
  if (!lu) return null;
  const suffixe = SUFFIXE_ACCORD[`${lu.suffixe}|${lu.casse}`];
  if (suffixe === undefined) return null;

  const tonique = toniqueDe(toniquePc, mode);
  const lettre = letterAt(letterIndex(tonique.letter) + lu.rang - 1);
  const vise = (((toniquePc + lu.demiTons) % 12) + 12) % 12;
  let alteration = vise - naturalPitchClass(lettre);
  if (alteration > 6) alteration -= 12;
  if (alteration < -6) alteration += 12;
  // Au-delà du double dièse, l'orthographe correcte n'existe plus vraiment :
  // mieux vaut ne rien afficher que d'écrire un Fa### .
  if (Math.abs(alteration) > 2) return null;
  const fondamentale = note(lettre, alteration);

  return {
    note: fondamentale,
    anglo: joli(formatNote(fondamentale)) + suffixe,
    latin: joli(formatNoteLatin(fondamentale)) + suffixe,
  };
}

/** La progression jouée dans une tonalité : ["C", "G", "Am", "F"]. */
export function accordsDeLaProgression(
  progression: ProgressionCorpus,
  toniquePc: number,
  systeme: "anglo" | "latin" = "anglo",
): string[] | null {
  const out: string[] = [];
  for (const degre of progression.degres) {
    const a = accordDuDegre(progression.mode, degre, toniquePc);
    if (!a) return null;
    out.push(systeme === "latin" ? a.latin : a.anglo);
  }
  return out;
}
