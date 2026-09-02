import { type Note } from "./pitch";
import { majorScale } from "./scales";
import {
  type Triad,
  type SeventhChord,
  type TriadQuality,
  type SeventhQuality,
  triadOnScaleDegree,
  seventhOnScaleDegree,
} from "./chords";

// Harmonisation : on empile des tierces sur chaque degré. Les qualités
// (I majeur, ii mineur, vii° diminué…) ÉMERGENT du calcul, elles ne sont pas
// posées à la main.

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export interface HarmonizedDegree {
  degree: number; // 1..7
  roman: string; // I, ii, iii, IV, V, vi, vii°
  triad: Triad;
  seventhRoman: string; // Imaj7, ii7, …, viiø7
  seventh: SeventhChord;
}

function triadRoman(degreeIndex: number, quality: TriadQuality): string {
  const lower = quality === "min" || quality === "dim";
  let r = lower ? ROMAN[degreeIndex].toLowerCase() : ROMAN[degreeIndex];
  if (quality === "dim") r += "°";
  else if (quality === "aug") r += "+";
  return r;
}

function seventhRoman(
  degreeIndex: number,
  triadQuality: TriadQuality,
  seventhQuality: SeventhQuality,
): string {
  const lower = triadQuality === "min" || triadQuality === "dim";
  const core = lower ? ROMAN[degreeIndex].toLowerCase() : ROMAN[degreeIndex];
  const suffix: Record<SeventhQuality, string> = {
    maj7: "maj7",
    "7": "7",
    min7: "7",
    m7b5: "ø7",
    dim7: "°7",
    minMaj7: "mMaj7",
    aug7: "+7",
    augMaj7: "+maj7",
  };
  return core + suffix[seventhQuality];
}

/** Harmonise une gamme majeure : 7 degrés, triades + septièmes + chiffrage. */
export function harmonizeMajor(tonic: Note): HarmonizedDegree[] {
  const scale = majorScale(tonic);
  return scale.map((_, i) => {
    const triad = triadOnScaleDegree(scale, i);
    const seventh = seventhOnScaleDegree(scale, i);
    return {
      degree: i + 1,
      roman: triadRoman(i, triad.quality),
      triad,
      seventhRoman: seventhRoman(i, triad.quality, seventh.quality),
      seventh,
    };
  });
}
