// Représentation des notes : lettre (A–G) + altération (demi-tons, -2..+2).
// L'orthographe correcte (Fa# vs Solb) est cruciale pour l'enseignement :
// une note = une lettre + une altération, jamais une simple classe de hauteur.
// Rien n'est codé « en dur » comme table de noms ; tout se déduit du calcul.

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof LETTERS)[number];

// Demi-tons de chaque lettre naturelle depuis Do.
const LETTER_SEMITONE: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export interface Note {
  letter: Letter;
  /** Altération en demi-tons : -2 (double bémol) … +2 (double dièse). */
  accidental: number;
}

export function note(letter: Letter, accidental = 0): Note {
  return { letter, accidental };
}

/** Classe de hauteur 0..11 (Do = 0). */
export function pitchClass(n: Note): number {
  return (((LETTER_SEMITONE[n.letter] + n.accidental) % 12) + 12) % 12;
}

/** Demi-tons de la lettre naturelle (sans altération). */
export function naturalPitchClass(letter: Letter): number {
  return LETTER_SEMITONE[letter];
}

export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

/** Lettre à l'index donné, modulo 7 (gère le bouclage A→C…). */
export function letterAt(index: number): Letter {
  return LETTERS[((index % 7) + 7) % 7];
}

function accidentalSymbol(acc: number): string {
  if (acc === 0) return "";
  return acc > 0 ? "#".repeat(acc) : "b".repeat(-acc);
}

/** "C", "F#", "Bb", "F##"… */
export function formatNote(n: Note): string {
  return n.letter + accidentalSymbol(n.accidental);
}

export function parseNote(s: string): Note {
  const m = /^([A-Ga-g])(#{1,3}|b{1,3}|x)?$/.exec(s.trim());
  if (!m) throw new Error(`Note invalide : "${s}"`);
  const letter = m[1].toUpperCase() as Letter;
  const a = m[2] ?? "";
  let accidental = 0;
  if (a === "x") accidental = 2;
  else if (a.startsWith("#")) accidental = a.length;
  else if (a.startsWith("b")) accidental = -a.length;
  return { letter, accidental };
}

export function notesEqual(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.accidental === b.accidental;
}

/** Même hauteur (enharmonie) : Fa# == Solb. */
export function samePitch(a: Note, b: Note): boolean {
  return pitchClass(a) === pitchClass(b);
}
