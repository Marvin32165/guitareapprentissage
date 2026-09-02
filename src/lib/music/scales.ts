import { type Note, formatNote } from "./pitch";
import { transpose } from "./intervals";

// Une gamme = une formule de degrés. Chaque degré porte :
//   - letterSteps : de combien de lettres il avance depuis la tonique
//                   (garantit l'orthographe : une lettre par degré diatonique)
//   - semitones   : sa distance en demi-tons depuis la tonique
// On dérive TOUTES les tonalités d'une seule formule — aucune table de notes.

export interface ScaleDegreeSpec {
  letterSteps: number;
  semitones: number;
}

export interface ScaleType {
  id: string;
  name: string;
  degrees: ScaleDegreeSpec[];
}

const d = (letterSteps: number, semitones: number): ScaleDegreeSpec => ({
  letterSteps,
  semitones,
});

export const MAJOR: ScaleType = {
  id: "major",
  name: "majeure",
  degrees: [d(0, 0), d(1, 2), d(2, 4), d(3, 5), d(4, 7), d(5, 9), d(6, 11)],
};

export const NATURAL_MINOR: ScaleType = {
  id: "natural_minor",
  name: "mineure naturelle",
  degrees: [d(0, 0), d(1, 2), d(2, 3), d(3, 5), d(4, 7), d(5, 8), d(6, 10)],
};

export const HARMONIC_MINOR: ScaleType = {
  id: "harmonic_minor",
  name: "mineure harmonique",
  degrees: [d(0, 0), d(1, 2), d(2, 3), d(3, 5), d(4, 7), d(5, 8), d(6, 11)],
};

export const MELODIC_MINOR: ScaleType = {
  id: "melodic_minor",
  name: "mineure mélodique",
  degrees: [d(0, 0), d(1, 2), d(2, 3), d(3, 5), d(4, 7), d(5, 9), d(6, 11)],
};

export const MAJOR_PENTATONIC: ScaleType = {
  id: "major_pentatonic",
  name: "pentatonique majeure",
  degrees: [d(0, 0), d(1, 2), d(2, 4), d(4, 7), d(5, 9)],
};

export const MINOR_PENTATONIC: ScaleType = {
  id: "minor_pentatonic",
  name: "pentatonique mineure",
  degrees: [d(0, 0), d(2, 3), d(3, 5), d(4, 7), d(6, 10)],
};

export function buildScale(tonic: Note, type: ScaleType): Note[] {
  return type.degrees.map((deg) => transpose(tonic, deg.letterSteps, deg.semitones));
}

export function scaleNoteNames(tonic: Note, type: ScaleType): string[] {
  return buildScale(tonic, type).map(formatNote);
}

// Raccourcis courants.
export const majorScale = (tonic: Note) => buildScale(tonic, MAJOR);
export const naturalMinorScale = (tonic: Note) => buildScale(tonic, NATURAL_MINOR);
export const majorPentatonic = (tonic: Note) => buildScale(tonic, MAJOR_PENTATONIC);
export const minorPentatonic = (tonic: Note) => buildScale(tonic, MINOR_PENTATONIC);

/** Relative mineure d'une majeure (6e degré) : Do → La. */
export function relativeMinorTonic(majorTonic: Note): Note {
  return transpose(majorTonic, 5, 9);
}

/** Relative majeure d'une mineure (tierce mineure au-dessus) : La → Do. */
export function relativeMajorTonic(minorTonic: Note): Note {
  return transpose(minorTonic, 2, 3);
}
