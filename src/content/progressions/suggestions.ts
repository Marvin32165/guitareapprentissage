// « Qu'est-ce que je pourrais apprendre ? »
//
// Rien n'est ajouté au corpus pour ça : la liste est DÉDUITE de ce qu'il
// contient déjà, croisé avec les onze formes d'accords ouverts que les leçons
// enseignent. Un morceau est proposé quand sa progression signature se joue
// entièrement en accords ouverts, dans au moins une tonalité.
//
// LA RÉSERVE, ET ELLE COMPTE : le corpus ne garde pas la tonalité d'origine
// d'un morceau, seulement ses degrés. La tonalité proposée ici est celle qui
// rend la grille jouable sans barré — ce n'est pas forcément celle du disque.
// L'interface le dit. Sans ça, la liste laisserait croire qu'on joue le
// morceau, alors qu'on joue sa grille transposée.

import { OPEN_CHORDS, fingerCount } from "@/lib/music/chord-shapes";
import { hauteursDuDegre, lireDegre, nomTonalite, toniqueDe } from "@/lib/music/degres";
import { formatNote, parseNote, pitchClass } from "@/lib/music/pitch";
import {
  chargerCorpus,
  type CodeSource,
  type MorceauCorpus,
  type ProgressionCorpus,
} from "./corpus";

/** Une forme ouverte, repérée par ce qu'elle produit : hauteur et qualité. */
interface FormeOuverte {
  id: string;
  symbole: string;
  doigts: number;
}

const OUVERTS = new Map<string, FormeOuverte>();
for (const forme of OPEN_CHORDS) {
  const qualite = forme.quality === "major" ? "maj" : forme.quality === "minor" ? "min" : "dom7";
  const cle = `${pitchClass(parseNote(forme.root))}:${qualite}`;
  const doigts = fingerCount(forme);
  const dejaLa = OUVERTS.get(cle);
  // À hauteur et qualité égales, la forme la plus simple gagne.
  if (!dejaLa || doigts < dejaLa.doigts) {
    OUVERTS.set(cle, { id: forme.id, symbole: forme.symbol, doigts });
  }
}

/**
 * Tonalités essayées, dans l'ordre où un guitariste les rencontre. À grille
 * également jouable, on propose la première : autant que ce soit toujours la
 * même poignée de tonalités, pour que les formes se réutilisent.
 */
const TONALITES = [7, 0, 2, 9, 4, 5, 10, 3, 11, 8, 6, 1];

export interface GrilleOuverte {
  tonique: number;
  /** Les quatre formes, dans l'ordre de la progression. */
  formes: FormeOuverte[];
  /** Total de doigts à poser sur les quatre accords. */
  doigts: number;
}

/**
 * La tonalité, s'il en existe une, où toute la progression se joue en accords
 * ouverts. Rend null quand il faut au moins un barré.
 */
export function grilleOuverte(progression: ProgressionCorpus): GrilleOuverte | null {
  for (const tonique of TONALITES) {
    const formes: FormeOuverte[] = [];
    for (const degre of progression.degres) {
      const lu = lireDegre(progression.mode, degre);
      const hauteurs = hauteursDuDegre(progression.mode, degre, tonique);
      if (!lu || !hauteurs) break;
      const qualite = lu.qualite;
      if (qualite !== "maj" && qualite !== "min" && qualite !== "dom7") break;
      const forme = OUVERTS.get(`${hauteurs[0]}:${qualite}`);
      if (!forme) break;
      formes.push(forme);
    }
    if (formes.length === progression.degres.length) {
      return { tonique, formes, doigts: formes.reduce((t, f) => t + f.doigts, 0) };
    }
  }
  return null;
}

/**
 * Confiance dans le fait que le morceau soit connu. Ce n'est pas une mesure de
 * popularité — le corpus n'en contient pas — mais ce que la SOURCE garantit :
 * Billboard ne liste que des succès classés, Isophonics que des albums entiers
 * des Beatles, de Queen et de Carole King.
 */
const POIDS_SOURCE: Record<CodeSource, number> = { I: 4, B: 3, R: 2, H: 2, W: 1 };

export interface Suggestion {
  morceau: MorceauCorpus;
  progression: ProgressionCorpus;
  grille: GrilleOuverte;
  /** « Sol majeur (G) ». */
  tonalite: string;
  /**
   * La même tonalité en court — « G », « Em » — pour le champ « tonalité » du
   * répertoire. C'est la TONIQUE, pas le premier accord de la grille : « Don't
   * Stop Me Now » commence sur un V7 et n'est pas pour autant en la.
   */
  tonaliteCourte: string;
  /** Les accords à jouer : ["G", "D", "Em", "C"]. */
  accords: string[];
}

/** Au plus deux morceaux par artiste : une liste, pas une discographie. */
const PAR_ARTISTE = 2;

/**
 * Et au plus trois par progression. Sans ça, la liste aligne quinze morceaux
 * bâtis sur la même grille : elle est censée montrer plusieurs grilles à
 * apprendre, pas plusieurs façons d'en jouer une seule.
 */
const PAR_PROGRESSION = 3;

/**
 * Les morceaux du corpus dont la grille se joue en accords ouverts, du plus
 * sûrement connu au moins sûr, et à confiance égale du plus simple à jouer.
 */
export async function morceauxAApprendre(max = 30): Promise<Suggestion[]> {
  const c = await chargerCorpus();
  const grilles = new Map<number, GrilleOuverte | null>();

  const candidats: { morceau: MorceauCorpus; grille: GrilleOuverte; note: number }[] = [];
  for (let id = 0; id < c.nbMorceaux; id++) {
    const morceau = c.morceau(id);
    if (!morceau.artiste) continue;
    let grille = grilles.get(morceau.progression);
    if (grille === undefined) {
      grille = grilleOuverte(c.progressions[morceau.progression]);
      grilles.set(morceau.progression, grille);
    }
    if (!grille) continue;
    const progression = c.progressions[morceau.progression];
    // Trois termes, du plus décisif au moins décisif :
    //  · la confiance dans le fait que le morceau soit connu ;
    //  · le nombre d'accords DIFFÉRENTS — « V – I – V – I » n'apprend pas
    //    grand-chose à côté de « I – V – vi – IV » ;
    //  · la fréquence de la progression, qui dit si elle resservira ailleurs.
    const distincts = new Set(progression.degres).size;
    const note =
      POIDS_SOURCE[morceau.source] * 10000 + distincts * 1000 + Math.min(progression.total, 500);
    candidats.push({ morceau, grille, note });
  }

  candidats.sort((a, b) => b.note - a.note || a.grille.doigts - b.grille.doigts);

  const parArtiste = new Map<string, number>();
  const parProgression = new Map<number, number>();
  const out: Suggestion[] = [];
  for (const { morceau, grille } of candidats) {
    // « Abba » et « ABBA » sont le même groupe : la casse ne doit pas ouvrir
    // une seconde place dans la liste.
    const artiste = morceau.artiste.toLowerCase();
    const vus = parArtiste.get(artiste) ?? 0;
    if (vus >= PAR_ARTISTE) continue;
    const vuesGrille = parProgression.get(morceau.progression) ?? 0;
    if (vuesGrille >= PAR_PROGRESSION) continue;
    parArtiste.set(artiste, vus + 1);
    parProgression.set(morceau.progression, vuesGrille + 1);
    const progression = c.progressions[morceau.progression];
    out.push({
      morceau,
      progression,
      grille,
      tonalite: nomTonalite(grille.tonique, progression.mode),
      tonaliteCourte:
        formatNote(toniqueDe(grille.tonique, progression.mode)) +
        (progression.mode === "minor" ? "m" : ""),
      accords: grille.formes.map((f) => f.symbole),
    });
    if (out.length >= max) break;
  }
  return out;
}
