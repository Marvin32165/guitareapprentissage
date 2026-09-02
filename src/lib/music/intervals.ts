import {
  type Note,
  type Letter,
  letterAt,
  letterIndex,
  naturalPitchClass,
  pitchClass,
} from "./pitch";

// Intervalles : un numéro diatonique (1 = unisson, 2 = seconde…) et une
// qualité (P/M/m/A/d). Toute la théorie se déduit de ces formules.

export type IntervalQuality = "P" | "M" | "m" | "A" | "d";

export interface Interval {
  number: number; // 1 = unisson, 2 = seconde, …, 8 = octave, 9 = neuvième…
  quality: IntervalQuality;
}

// Demi-tons d'un degré diatonique simple (1..7) depuis la tonique.
const SIMPLE_SEMITONES: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

/** Un intervalle de numéro « parfait » (unisson, quarte, quinte, octave). */
function isPerfectNumber(n: number): boolean {
  const simple = ((n - 1) % 7) + 1;
  return simple === 1 || simple === 4 || simple === 5;
}

/** Demi-tons de l'intervalle « majeur/juste » de base pour ce numéro. */
function baseSemitones(n: number): number {
  const octaves = Math.floor((n - 1) / 7);
  const simple = ((n - 1) % 7) + 1;
  return SIMPLE_SEMITONES[simple] + 12 * octaves;
}

/** Nombre de demi-tons d'un intervalle. */
export function semitonesOf(interval: Interval): number {
  const base = baseSemitones(interval.number);
  const { quality } = interval;
  if (isPerfectNumber(interval.number)) {
    if (quality === "P") return base;
    if (quality === "A") return base + 1;
    if (quality === "d") return base - 1;
    throw new Error(
      `Qualité ${quality} invalide pour un intervalle juste (${interval.number}).`,
    );
  }
  if (quality === "M") return base;
  if (quality === "m") return base - 1;
  if (quality === "A") return base + 1;
  if (quality === "d") return base - 2;
  throw new Error(
    `Qualité ${quality} invalide pour un intervalle majeur/mineur (${interval.number}).`,
  );
}

/**
 * Transpose une note de `letterSteps` lettres et `semitones` demi-tons,
 * en calculant l'altération pour tomber juste. C'est la brique qui garantit
 * l'orthographe correcte des gammes et accords.
 */
export function transpose(n: Note, letterSteps: number, semitones: number): Note {
  const newLetter: Letter = letterAt(letterIndex(n.letter) + letterSteps);
  const targetPc = (((pitchClass(n) + semitones) % 12) + 12) % 12;
  const natural = naturalPitchClass(newLetter);
  let acc = (((targetPc - natural) % 12) + 12) % 12;
  if (acc > 6) acc -= 12; // choisir l'altération la plus proche (-…+)
  return { letter: newLetter, accidental: acc };
}

/** Transpose une note par un intervalle (vers l'aigu par défaut). */
export function transposeByInterval(
  n: Note,
  interval: Interval,
  direction: "up" | "down" = "up",
): Note {
  const letterSteps = interval.number - 1;
  const semis = semitonesOf(interval);
  return direction === "up"
    ? transpose(n, letterSteps, semis)
    : transpose(n, -letterSteps, -semis);
}

/**
 * Intervalle simple (dans l'octave) entre deux notes, de `a` vers `b` en
 * montant. Ex : C→E = tierce majeure, C→Gb = quinte diminuée.
 */
export function intervalBetween(a: Note, b: Note): Interval {
  const letterSteps = (((letterIndex(b.letter) - letterIndex(a.letter)) % 7) + 7) % 7;
  const number = letterSteps + 1;
  const semitones = (((pitchClass(b) - pitchClass(a)) % 12) + 12) % 12;
  const base = baseSemitones(number);
  const diff = semitones - base;
  let quality: IntervalQuality;
  if (isPerfectNumber(number)) {
    quality = diff === 0 ? "P" : diff === 1 ? "A" : diff === -1 ? "d" : diffToQuality(diff, true);
  } else {
    quality =
      diff === 0
        ? "M"
        : diff === -1
          ? "m"
          : diff === 1
            ? "A"
            : diffToQuality(diff, false);
  }
  return { number, quality };
}

function diffToQuality(diff: number, perfect: boolean): IntervalQuality {
  // Cas rares (double augmenté/diminué) : on approxime au plus proche.
  if (diff > 0) return "A";
  if (perfect) return "d";
  return diff <= -2 ? "d" : "m";
}
