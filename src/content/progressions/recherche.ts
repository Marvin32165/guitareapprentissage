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
  accordDuDegre,
  accordsDesDegres,
  decouperDegre,
  lireSuiteAccords,
  nomDegre,
  nomTonalite,
} from "@/lib/music/degres";
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
export { accordDuDegre };

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

/**
 * Les progressions du corpus qui CONTIENNENT une suite plus courte. Le corpus
 * n'indexe que des fenêtres de quatre accords : « ii V I » ne s'y trouve pas
 * comme telle, mais dans « ii-V-I-IV », « I-ii-V-I »… Les montrer telles
 * quelles est plus honnête que d'inventer un total.
 */
export async function progressionsContenant(
  mode: Mode,
  degres: string[],
  max = 6,
): Promise<{ resultats: ProgressionEtMorceaux[]; position: number[]; totalProgressions: number }> {
  const c = await chargerCorpus();
  const cibles: CibleDegre[] = degres.map((d) => decouperDegre(d));
  const trouvees = progressionsCompatibles(c, cibles, 0, mode).sort(
    (a, b) => b.progression.total - a.progression.total,
  );
  const gardees = trouvees.slice(0, max);
  return {
    totalProgressions: trouvees.length,
    position: gardees.map((t) => t.position),
    resultats: gardees.map((t) => {
      const morceaux = morceauxDe(c, t.progression.id);
      return {
        progression: t.progression,
        morceaux,
        tronque: t.progression.total > morceaux.length,
      };
    }),
  };
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

/**
 * Confort : la même chose que accordsDesDegres(), à partir d'une progression
 * du corpus. Le calcul lui-même est de la théorie pure et vit dans
 * src/lib/music/degres.ts, pour que l'affichage d'une grille n'oblige pas à
 * charger le corpus.
 */
export function accordsDeLaProgression(
  progression: ProgressionCorpus,
  toniquePc: number,
  systeme: "anglo" | "latin" = "anglo",
): string[] | null {
  return accordsDesDegres(progression.mode, progression.degres, toniquePc, systeme);
}
