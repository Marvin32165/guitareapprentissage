// Formes d'accords ouverts (position ouverte, cases 0 à 3).
//
// Ce sont les seules données du projet saisies « à la main » : une forme
// d'accord est un fait de doigté, pas une conséquence de formule. Elles sont
// donc VÉRIFIÉES contre le moteur théorique (voir chord-shapes.test.ts) :
// les hauteurs produites par le doigté doivent bien former l'accord annoncé.
// Une faute de frappe sur une case donnerait sinon un accord faux, enseigné
// comme juste.

import { STANDARD, type Tuning } from "./fretboard";

export interface ChordShape {
  id: string;
  /** Symbole d'accord (« C », « Am »). */
  symbol: string;
  /** Nom en clair, français. */
  name: string;
  /**
   * Case jouée par corde, index 0 = Mi grave.
   * -1 = corde étouffée (le fameux « x »), 0 = corde à vide.
   */
  frets: number[];
  /** Doigt par corde : 0 = à vide ou étouffée, 1 = index … 4 = auriculaire. */
  fingers: number[];
  /** Fondamentale, en notation anglo-saxonne. */
  root: string;
  quality: "major" | "minor" | "dom7";
  /** Ce qui rend la forme reconnaissable, en une phrase. */
  hint: string;
}

export const OPEN_CHORDS: ChordShape[] = [
  {
    id: "E",
    symbol: "E",
    name: "Mi majeur",
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    root: "E",
    quality: "major",
    hint: "Les six cordes sonnent. La forme la plus pleine du manche.",
  },
  {
    id: "Em",
    symbol: "Em",
    name: "Mi mineur",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    root: "E",
    quality: "minor",
    hint: "Mi majeur dont on retire le doigt de la corde de Sol : deux doigts suffisent.",
  },
  {
    id: "A",
    symbol: "A",
    name: "La majeur",
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    root: "A",
    quality: "major",
    hint: "Trois doigts alignés sur la même case. Le Mi grave ne sonne pas.",
  },
  {
    id: "Am",
    symbol: "Am",
    name: "La mineur",
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    root: "A",
    quality: "minor",
    hint: "La majeur dont la corde de Si recule d'une case : c'est ce demi-ton qui rend l'accord mineur.",
  },
  {
    id: "D",
    symbol: "D",
    name: "Ré majeur",
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    root: "D",
    quality: "major",
    hint: "Un triangle sur les trois cordes aiguës. Les deux graves restent muettes.",
  },
  {
    id: "Dm",
    symbol: "Dm",
    name: "Ré mineur",
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    root: "D",
    quality: "minor",
    hint: "Même triangle, pointe décalée : la corde aiguë recule d'une case.",
  },
  {
    id: "C",
    symbol: "C",
    name: "Do majeur",
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    root: "C",
    quality: "major",
    hint: "Une diagonale qui descend du grave vers l'aigu.",
  },
  {
    id: "G",
    symbol: "G",
    name: "Sol majeur",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    root: "G",
    quality: "major",
    hint: "Les doigts aux deux bouts, les cordes du milieu à vide.",
  },
  {
    id: "E7",
    symbol: "E7",
    name: "Mi septième",
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [0, 2, 0, 1, 0, 0],
    root: "E",
    quality: "dom7",
    hint: "Mi majeur dont on lève le doigt de la corde de Ré. Un doigt de moins, une tension en plus.",
  },
  {
    id: "A7",
    symbol: "A7",
    name: "La septième",
    frets: [-1, 0, 2, 0, 2, 0],
    fingers: [0, 0, 2, 0, 3, 0],
    root: "A",
    quality: "dom7",
    hint: "La majeur dont on lève le doigt du milieu.",
  },
  {
    id: "D7",
    symbol: "D7",
    name: "Ré septième",
    frets: [-1, -1, 0, 2, 1, 2],
    fingers: [0, 0, 0, 2, 1, 3],
    root: "D",
    quality: "dom7",
    hint: "Le triangle de Ré, pointe inversée.",
  },
];

export function getChordShape(id: string): ChordShape {
  const shape = OPEN_CHORDS.find((c) => c.id === id);
  if (!shape) throw new Error(`Forme d'accord inconnue : ${id}`);
  return shape;
}

/** Cordes qui sonnent réellement, avec leur hauteur MIDI. */
export function soundingNotes(
  shape: ChordShape,
  tuning: Tuning = STANDARD,
): { stringIndex: number; fret: number; midi: number }[] {
  return shape.frets.flatMap((fret, stringIndex) =>
    fret < 0
      ? []
      : [{ stringIndex, fret, midi: tuning.openMidi[stringIndex] + fret }],
  );
}

/** Classes de hauteur produites par la forme, sans doublon. */
export function shapePitchClasses(shape: ChordShape, tuning: Tuning = STANDARD): Set<number> {
  return new Set(soundingNotes(shape, tuning).map((n) => ((n.midi % 12) + 12) % 12));
}

/** Nombre de doigts à poser — ce qui décide de la difficulté ressentie. */
export function fingerCount(shape: ChordShape): number {
  return shape.frets.filter((f) => f > 0).length;
}
