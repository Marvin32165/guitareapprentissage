// Passage du manche à la portée.
//
// LE PIÈGE DE CETTE PHASE : la guitare est un instrument TRANSPOSITEUR. Sa
// musique s'écrit **une octave au-dessus de ce qu'elle sonne**, en clé de sol
// avec un petit 8 sous la clé. Le Mi grave à vide sonne un Mi2 (MIDI 40) mais
// s'écrit à la place d'un Mi3 — trois lignes supplémentaires sous la portée.
//
// Ignorer ça donnerait une portée juste sur le papier et fausse d'une octave
// pour quelqu'un qui apprend à lire. C'est le genre d'erreur qu'un débutant ne
// peut pas détecter tout seul, donc elle est traitée explicitement ici et
// vérifiée par des tests.

import { naturalPitchClass, type Note } from "@/lib/music/pitch";

/**
 * Décalage d'écriture de la guitare, en demi-tons. La partition est notée une
 * octave plus haut que le son réel.
 */
export const GUITAR_WRITTEN_OFFSET = 12;

/** Hauteur écrite sur la portée, à partir de la hauteur réellement entendue. */
export function writtenMidi(soundingMidi: number): number {
  return soundingMidi + GUITAR_WRITTEN_OFFSET;
}

/** Hauteur entendue, à partir de ce qui est écrit. */
export function soundingMidi(written: number): number {
  return written - GUITAR_WRITTEN_OFFSET;
}

/**
 * Octave d'une note écrite, déduite de sa LETTRE et non du numéro MIDI divisé
 * par douze. La différence compte aux limites : un Si♯ et le Do qui le suit
 * partagent la même hauteur mais pas la même octave écrite.
 */
export function octaveOf(n: Note, midi: number): number {
  const offset = naturalPitchClass(n.letter) + n.accidental;
  return (midi - offset) / 12 - 1;
}

const ACCIDENTAL_SUFFIX: Record<number, string> = {
  [-2]: "bb",
  [-1]: "b",
  [0]: "",
  [1]: "#",
  [2]: "##",
};

/** Clé VexFlow (« f#/4 ») pour une note écrite. */
export function vexKey(n: Note, midi: number): string {
  const suffix = ACCIDENTAL_SUFFIX[n.accidental] ?? "";
  return `${n.letter.toLowerCase()}${suffix}/${octaveOf(n, midi)}`;
}

/** Altération à dessiner, ou null si la note est naturelle. */
export function vexAccidental(n: Note): string | null {
  return n.accidental === 0 ? null : (ACCIDENTAL_SUFFIX[n.accidental] ?? null);
}

/** Ce qu'il faut pour dessiner une note du manche sur la portée. */
export interface StaffNote {
  /** Hauteur réellement entendue (celle qu'on joue et qu'on envoie au son). */
  sounding: number;
  /** Hauteur écrite, une octave au-dessus. */
  written: number;
  key: string;
  accidental: string | null;
}

/**
 * Prépare une note du manche pour la portée. `spelled` vient du moteur
 * théorique : c'est lui qui décide Fa♯ ou Sol♭, pas la notation.
 */
export function staffNote(soundingPitch: number, spelled: Note): StaffNote {
  const written = writtenMidi(soundingPitch);
  return {
    sounding: soundingPitch,
    written,
    key: vexKey(spelled, written),
    accidental: vexAccidental(spelled),
  };
}
