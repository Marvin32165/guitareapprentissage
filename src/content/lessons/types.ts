// Contenu des leçons « as code » : 100 % sérialisable (traversé du serveur vers
// des composants client) et surtout TYPÉ de façon à imposer la règle du projet :
// une notion s'ancre sur le manche, sur un son, et sur un exercice.

/** Ce qu'on affiche sur un diagramme de manche, sous forme de données. */
export interface FretboardSpec {
  /** Fondamentale, notation anglo-saxonne ("C", "A", "F#"). */
  root: string;
  kind:
    | "major"
    | "naturalMinor"
    | "pentaMajor"
    | "pentaMinor"
    | "chordMaj"
    | "chordMin"
    | "box";
  /** Pour kind "box" : 1..5 et la qualité de la pentatonique. */
  boxIndex?: number;
  boxQuality?: "minor" | "major";
  fromFret?: number;
  toFret?: number;
  labelMode?: "note" | "degree";
  /** Limiter l'affichage à certaines cordes (index 0 = 6e corde grave). */
  onlyStringIndexes?: number[];
}

export type Exercise =
  | {
      id: string;
      kind: "mcq";
      prompt: string;
      options: string[];
      answer: number;
      explain?: string;
    }
  | {
      id: string;
      kind: "fretFind";
      prompt: string;
      spec: FretboardSpec;
      /** Bonne réponse : degrés acceptés (demi-tons depuis la fondamentale). */
      targetDegrees?: number[];
      /** Ou classes de hauteur acceptées. */
      targetPcs?: number[];
      /** Contrainte optionnelle de corde (0 = 6e corde grave). */
      onlyStringIndex?: number;
      explain?: string;
    };

export type LessonBlock =
  | { kind: "prose"; paragraphs: string[] }
  | { kind: "heading"; text: string }
  | { kind: "callout"; tone: "info" | "warn"; text: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "fretboard"; caption?: string; spec: FretboardSpec }
  | { kind: "exercise"; exercise: Exercise };

export interface Lesson {
  slug: string;
  order: number;
  title: string;
  /** Une phrase : ce que tu sauras faire à la fin. */
  goal: string;
  minutes: number;
  blocks: LessonBlock[];
}
