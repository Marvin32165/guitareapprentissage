// Lecture du corpus de progressions.
//
// Les données brutes (donnees.ts) sont des chaînes compactes : ce module les
// décode une fois, à la demande, et expose des requêtes.
//
// CE QUE CE CORPUS EST — et n'est pas. Des PROGRESSIONS EN DEGRÉS relevées sur
// des morceaux connus : « I V vi IV », pas « Do Sol La m Fa », et surtout pas
// le morceau. Ni mélodie, ni tablature, ni accords exacts : un morceau ne se
// réduit pas à quatre chiffres romains, et deux morceaux qui partagent une
// progression ne se ressemblent pas forcément.
//
// Chargement : ce module est importé dynamiquement par les composants qui s'en
// servent, pour que le demi-mégaoctet de données ne parte pas dans le bundle
// de démarrage. Une fois chargé, le service worker le garde (c'est un fichier
// /_next/static) : la recherche fonctionne hors-ligne.

import { type Mode, decouperDegre } from "@/lib/music/degres";

export interface ProgressionCorpus {
  id: number;
  mode: Mode;
  /** Les quatre degrés : ["I", "V", "vi", "IV"]. */
  degres: string[];
  /** Nombre réel de morceaux du corpus qui l'emploient. */
  total: number;
}

/** Code d'une source, tel qu'il est écrit en tête de ligne dans MORCEAUX. */
export type CodeSource = "H" | "B" | "I" | "R" | "W";

export interface DescriptionSource {
  nom: string;
  /** Ce que désigne le nom : celui qui joue, ou celui qui a écrit. */
  credit: "interprète" | "compositeur";
  /**
   * Vrai si les noms sont des identifiants d'URL à rendre lisibles. Seul
   * Hooktheory est dans ce cas, et lui seul a une fiche à montrer.
   */
  identifiants: boolean;
}

/**
 * Les cinq jeux d'annotations réunis ici. Le crédit n'est pas décoratif :
 * Wikifonia nomme le COMPOSITEUR, pas l'interprète — « Lonesome Town » y est
 * signé Baker Knight et non Ricky Nelson. Afficher les deux de la même façon
 * serait faux.
 */
export const SOURCES: Record<CodeSource, DescriptionSource> = {
  H: { nom: "Hooktheory / TheoryTab", credit: "interprète", identifiants: true },
  B: { nom: "Billboard (ChoCo)", credit: "interprète", identifiants: false },
  I: { nom: "Isophonics (ChoCo)", credit: "interprète", identifiants: false },
  R: { nom: "Robbie Williams (ChoCo)", credit: "interprète", identifiants: false },
  W: { nom: "Wikifonia (ChoCo)", credit: "compositeur", identifiants: false },
};

export interface MorceauCorpus {
  id: number;
  titre: string;
  artiste: string;
  source: CodeSource;
  /** Ce que le nom désigne, selon la source. */
  credit: "interprète" | "compositeur";
  /** Progression « signature » : la plus répandue parmi celles du morceau. */
  progression: number;
  /** Fiche d'origine quand la source en publie une, sinon null. */
  url: string | null;
}

interface Corpus {
  progressions: ProgressionCorpus[];
  /** Indices de morceaux par progression, plafonnés. */
  morceauxParProgression: number[][];
  nbMorceaux: number;
  morceau(id: number): MorceauCorpus;
  /** Clé « M:I-V-vi-IV » -> identifiant de progression. */
  parCle: Map<string, number>;
  plafond: number;
}

let promesse: Promise<Corpus> | null = null;

/** Charge et décode le corpus. Le résultat est mémorisé. */
export function chargerCorpus(): Promise<Corpus> {
  promesse ??= import("./donnees").then(decoder);
  return promesse;
}

type Donnees = typeof import("./donnees");

function decoder(d: Donnees): Corpus {
  const degres = d.DEGRES.split(" ");
  const pas = 1 + 2 * d.TAILLE_PROGRESSION;

  const progressions: ProgressionCorpus[] = [];
  const parCle = new Map<string, number>();
  for (let i = 0; i * pas < d.PROGRESSIONS.length; i++) {
    const brut = d.PROGRESSIONS.slice(i * pas, (i + 1) * pas);
    const mode: Mode = brut[0] === "m" ? "minor" : "major";
    const suite: string[] = [];
    for (let k = 0; k < d.TAILLE_PROGRESSION; k++) {
      suite.push(degres[parseInt(brut.slice(1 + 2 * k, 3 + 2 * k), 36)]);
    }
    parCle.set(cle(mode, suite), i);
    progressions.push({ id: i, mode, degres: suite, total: 0 });
  }

  // Index : « total:écart,écart,… », une entrée par progression, même ordre.
  const morceauxParProgression: number[][] = [];
  const entrees = d.INDEX.split(";");
  for (let i = 0; i < entrees.length; i++) {
    const [total, liste] = entrees[i].split(":");
    progressions[i].total = parseInt(total, 36);
    const ids: number[] = [];
    let precedent = 0;
    if (liste) {
      for (const ecart of liste.split(",")) {
        precedent += parseInt(ecart, 36);
        ids.push(precedent);
      }
    }
    morceauxParProgression.push(ids);
  }

  // Morceaux : une ligne par (source, artiste), le code de source collé devant
  // le nom : « Bchicago \t 25 or 6 to 4|prog \t … ».
  const artistes: string[] = [];
  const titres: string[] = [];
  const codes: CodeSource[] = [];
  const progs: number[] = [];
  for (const ligne of d.MORCEAUX.split("\n")) {
    const champs = ligne.split("\t");
    const code = champs[0][0] as CodeSource;
    const artiste = champs[0].slice(1);
    for (let k = 1; k < champs.length; k++) {
      const coupe = champs[k].lastIndexOf("|");
      artistes.push(artiste);
      titres.push(champs[k].slice(0, coupe));
      codes.push(code);
      progs.push(parseInt(champs[k].slice(coupe + 1), 36));
    }
  }

  return {
    progressions,
    morceauxParProgression,
    nbMorceaux: titres.length,
    parCle,
    plafond: d.PLAFOND_MORCEAUX,
    morceau(id) {
      const code = codes[id];
      const source = SOURCES[code];
      return {
        id,
        titre: source.identifiants ? titrer(titres[id]) : titres[id],
        artiste: source.identifiants ? titrer(artistes[id]) : artistes[id],
        source: code,
        credit: source.credit,
        progression: progs[id],
        url:
          code === "H"
            ? `https://www.hooktheory.com/theorytab/view/${artistes[id]}/${titres[id]}`
            : null,
      };
    },
  };
}

export function cle(mode: Mode, degres: string[]): string {
  return `${mode === "minor" ? "m" : "M"}:${degres.join("-")}`;
}

/**
 * Les identifiants Hooktheory sont des adresses : « whataya-want-from-me »,
 * « razors-in-your-apple-%28on-halloween%29 ». On les rend lisibles sans
 * prétendre reconstituer la ponctuation d'origine : les apostrophes ont été
 * perdues à la source, « Youre Gone » restera « Youre Gone ».
 */
export function titrer(identifiant: string): string {
  let texte = identifiant;
  for (let i = 0; i < 2 && texte.includes("%"); i++) {
    try {
      texte = decodeURIComponent(texte);
    } catch {
      break;
    }
  }
  return texte
    .split("-")
    .filter(Boolean)
    .map((mot) => mot.replace(/[a-z]/, (c) => c.toUpperCase()))
    .join(" ");
}

// ── Requêtes ──

/** Les morceaux du corpus qui emploient cette progression, plafond compris. */
export function morceauxDe(c: Corpus, progression: number): MorceauCorpus[] {
  return c.morceauxParProgression[progression].map((id) => c.morceau(id));
}

export function progressionParDegres(
  c: Corpus,
  mode: Mode,
  degres: string[],
): ProgressionCorpus | null {
  const id = c.parCle.get(cle(mode, degres));
  return id === undefined ? null : c.progressions[id];
}

// ── Recherche de morceau par titre ──

/** Minuscules, sans accents ni ponctuation : « Don't Stop » → « dont stop ». */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

let recherche: string[] | null = null;

function indexRecherche(c: Corpus): string[] {
  if (!recherche) {
    recherche = [];
    for (let i = 0; i < c.nbMorceaux; i++) {
      const m = c.morceau(i);
      recherche.push(`${normaliser(m.artiste)} ${normaliser(m.titre)}`);
    }
  }
  return recherche;
}

export interface TrouvailleMorceau {
  morceau: MorceauCorpus;
  progression: ProgressionCorpus;
}

/**
 * Cherche un morceau par titre, éventuellement par artiste : tous les mots de
 * la requête doivent apparaître. Les morceaux dont le titre commence par la
 * requête passent devant.
 */
export function chercherMorceaux(c: Corpus, requete: string, max = 12): TrouvailleMorceau[] {
  const mots = normaliser(requete).split(" ").filter(Boolean);
  if (!mots.length) return [];
  const index = indexRecherche(c);

  const trouves: { id: number; rang: number }[] = [];
  for (let i = 0; i < index.length; i++) {
    const foin = index[i];
    let ok = true;
    for (const mot of mots) {
      if (!foin.includes(mot)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    // Un titre qui commence par la requête est presque toujours le bon.
    const titre = foin.slice(foin.indexOf(" ", 0) + 1);
    const rang = titre.startsWith(mots.join(" ")) ? 0 : foin.startsWith(mots[0]) ? 1 : 2;
    trouves.push({ id: i, rang });
    if (trouves.length > 400) break;
  }

  trouves.sort((a, b) => a.rang - b.rang || a.id - b.id);
  return trouves.slice(0, max).map(({ id }) => {
    const morceau = c.morceau(id);
    return { morceau, progression: c.progressions[morceau.progression] };
  });
}

// ── Recherche inverse : d'une suite d'accords vers les progressions ──

export interface CibleDegre {
  romain: string;
  /** null quand la qualité n'est pas connue (accord de quinte). */
  suffixe: string | null;
}

export interface Correspondance {
  progression: ProgressionCorpus;
  /** Classe de hauteur de la tonique sous-entendue. */
  tonique: number;
  /** Position du premier accord saisi dans la progression (0 si suite de 4). */
  position: number;
}

// Le corpus n'a que 138 degrés distincts : on ne les redécoupe pas à chaque
// comparaison, sinon une recherche inverse fait tourner le motif un million
// de fois.
const decoupes = new Map<string, { romain: string; suffixe: string }>();

function decoupe(degre: string) {
  let d = decoupes.get(degre);
  if (!d) {
    d = decouperDegre(degre);
    decoupes.set(degre, d);
  }
  return d;
}

function correspond(degre: string, cible: CibleDegre): boolean {
  const { romain, suffixe } = decoupe(degre);
  // Qualité inconnue (accord de quinte) : le majeur/mineur n'est pas joué,
  // donc la casse du chiffre romain ne peut pas être exigée.
  if (cible.suffixe === null) return romain.toLowerCase() === cible.romain.toLowerCase();
  return romain === cible.romain && suffixe === cible.suffixe;
}

/**
 * Cherche les progressions du corpus compatibles avec une suite de cibles,
 * pour une tonique et un mode donnés. Une suite de moins de quatre accords est
 * cherchée À L'INTÉRIEUR des progressions ; une suite plus longue est découpée
 * en fenêtres de quatre.
 */
export function progressionsCompatibles(
  c: Corpus,
  cibles: CibleDegre[],
  tonique: number,
  mode: Mode,
): Correspondance[] {
  if (!cibles.length) return [];
  const out: Correspondance[] = [];
  for (const p of c.progressions) {
    if (p.mode !== mode) continue;
    for (let debut = 0; debut + cibles.length <= p.degres.length; debut++) {
      let ok = true;
      for (let k = 0; k < cibles.length; k++) {
        if (!correspond(p.degres[debut + k], cibles[k])) {
          ok = false;
          break;
        }
      }
      if (ok) {
        out.push({ progression: p, tonique, position: debut });
        break;
      }
    }
  }
  return out;
}
