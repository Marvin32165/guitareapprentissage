import { type Note, formatNote } from "./pitch";
import { transpose } from "./intervals";
import { majorScale } from "./scales";

// Les modes présentés comme des DÉPLACEMENTS de tonique, pas comme sept gammes
// à mémoriser : ils partagent le même « stock » de notes que le parent majeur,
// on ne fait que déplacer la tonique.

export const MODE_NAMES = [
  "ionien",
  "dorien",
  "phrygien",
  "lydien",
  "mixolydien",
  "éolien",
  "locrien",
] as const;
export type ModeName = (typeof MODE_NAMES)[number];

export interface Mode {
  name: ModeName;
  index: number; // 0 = ionien … 6 = locrien
  degreeOfParent: number; // 1..7 : degré du parent majeur qui devient tonique
  tonic: Note;
  notes: Note[];
}

/**
 * Les 7 modes issus d'une gamme majeure « parente » : chacun démarre sur un
 * degré différent, en conservant l'orthographe du parent.
 */
export function modesOfMajor(parentTonic: Note): Mode[] {
  const scale = majorScale(parentTonic);
  return MODE_NAMES.map((name, i) => ({
    name,
    index: i,
    degreeOfParent: i + 1,
    tonic: scale[i],
    notes: [...scale.slice(i), ...scale.slice(0, i)],
  }));
}

/** Notes d'un mode donné, sur une tonique donnée (formule propre au mode). */
export function modeScale(tonic: Note, modeIndex: number): Note[] {
  const maj = [0, 2, 4, 5, 7, 9, 11];
  return Array.from({ length: 7 }, (_, j) => {
    const semis = (((maj[(modeIndex + j) % 7] - maj[modeIndex]) % 12) + 12) % 12;
    return transpose(tonic, j, semis);
  });
}

export function modeNoteNames(parentTonic: Note): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const m of modesOfMajor(parentTonic)) {
    result[m.name] = m.notes.map(formatNote);
  }
  return result;
}
