// Accompagnements générés, plutôt que téléchargés.
//
// Le cahier des charges prévoyait des backing tracks échantillonnés sous
// licence CC0. Deux raisons de faire autrement :
//
//  1. Les hébergeurs d'échantillons sont inaccessibles depuis l'environnement
//     de développement (voir CREDITS.md), donc invérifiables.
//  2. Surtout, un accompagnement engendré à partir de la guitare déjà
//     échantillonnée n'a AUCUNE licence à vérifier, se transpose dans les douze
//     tonalités, suit n'importe quel tempo, et sonne comme le reste de
//     l'application. Un fichier figé ne fait rien de tout ça.
//
// Ce que ça ne fait pas, à dire franchement : ni batterie, ni basse jouée, ni
// production. C'est une grille d'accords qui tourne, pas un morceau.

import { parseNote, pitchClass, formatNote, type Note } from "@/lib/music/pitch";
import { majorScale, naturalMinorScale } from "@/lib/music/scales";
import { harmonizeScale, type HarmonizedDegree } from "@/lib/music/harmony";
import { accordDuDegre, hauteursDuDegre, lireDegre } from "@/lib/music/degres";

export interface ProgressionDef {
  id: string;
  label: string;
  /** Degrés (1..7) dans l'ordre, un par mesure. */
  degrees: number[];
  mode: "major" | "minor";
  /** Ce qu'on travaille dessus. */
  hint: string;
}

export const PROGRESSIONS: ProgressionDef[] = [
  {
    id: "I-V-vi-IV",
    label: "I – V – vi – IV",
    degrees: [1, 5, 6, 4],
    mode: "major",
    hint: "Le tour de chant. Idéal pour la pentatonique majeure.",
  },
  {
    id: "I-vi-IV-V",
    label: "I – vi – IV – V",
    degrees: [1, 6, 4, 5],
    mode: "major",
    hint: "Tourne sans jamais se poser.",
  },
  {
    id: "ii-V-I",
    label: "ii – V – I",
    degrees: [2, 5, 1, 1],
    mode: "major",
    hint: "La cadence du jazz. Écoute la résolution sur le I.",
  },
  {
    id: "I-IV-V",
    label: "I – IV – V – I",
    degrees: [1, 4, 5, 1],
    mode: "major",
    hint: "Trois accords, le socle du rock et du blues.",
  },
  {
    id: "i-VI-III-VII",
    label: "i – VI – III – VII",
    degrees: [1, 6, 3, 7],
    mode: "minor",
    hint: "En mineur. La pentatonique mineure tombe dessus toute seule.",
  },
  {
    id: "i-iv-v",
    label: "i – iv – v – i",
    degrees: [1, 4, 5, 1],
    mode: "minor",
    hint: "Mineur sombre, sans dominante majeure.",
  },
];

export function getProgression(id: string): ProgressionDef {
  const p = PROGRESSIONS.find((x) => x.id === id);
  if (!p) throw new Error(`Progression inconnue : ${id}`);
  return p;
}

export interface BackingChord {
  /** Mesure, à partir de 0. */
  bar: number;
  degree: number;
  roman: string;
  symbol: string;
  /** Notes de l'accord, en MIDI, dans une tessiture de guitare. */
  midis: number[];
  /** Fondamentale grave, jouée seule sur le premier temps. */
  bassMidi: number;
}

/** Étendue de l'accompagnement : assez grave pour porter, assez haut pour sonner. */
const CHORD_LOW = 48;
const BASS_LOW = 40;

/** Monte une note dans une octave donnée, à partir de sa classe de hauteur. */
function place(pc: number, low: number): number {
  const base = low + (((pc - (low % 12)) % 12) + 12) % 12;
  return base;
}

/**
 * Voix de l'accord : fondamentale, tierce, quinte empilées vers le haut. On ne
 * cherche pas un voicing de guitariste — juste un accompagnement lisible qui ne
 * masque pas ce qu'on joue par-dessus.
 */
function voice(triad: Note[]): number[] {
  let precedent = CHORD_LOW - 1;
  return triad.map((n) => {
    const pc = pitchClass(n);
    let midi = place(pc, CHORD_LOW);
    while (midi <= precedent) midi += 12;
    precedent = midi;
    return midi;
  });
}

export function harmonyFor(tonic: Note, mode: "major" | "minor"): HarmonizedDegree[] {
  return harmonizeScale(mode === "major" ? majorScale(tonic) : naturalMinorScale(tonic));
}

/** Grille développée : un accord par mesure, prêt à être joué. */
export function buildProgression(
  progression: ProgressionDef,
  key: string,
): BackingChord[] {
  const tonic = parseNote(key);
  const degres = harmonyFor(tonic, progression.mode);
  return progression.degrees.map((d, bar) => {
    const h = degres[d - 1];
    return {
      bar,
      degree: d,
      roman: h.roman,
      symbol: h.triad.symbol,
      midis: voice(h.triad.notes),
      bassMidi: place(pitchClass(h.triad.root), BASS_LOW),
    };
  });
}

/** Nom lisible de la tonalité, pour l'affichage. */
export function keyLabel(key: string, mode: "major" | "minor"): string {
  return `${formatNote(parseNote(key))} ${mode === "major" ? "majeur" : "mineur"}`;
}

export const KEYS = ["C", "G", "D", "A", "E", "F", "Bb", "Eb"];

/**
 * Grille à partir de degrés écrits (« I », « ♭VII », « viiø7 »), et non d'un
 * rang dans la gamme : c'est ce qu'il faut pour faire entendre une progression
 * venue du corpus, qui contient des emprunts que l'harmonisation de la gamme
 * ne produit pas.
 *
 * Rend null si un degré n'est pas lisible — plutôt que de jouer autre chose que
 * ce qui est affiché.
 */
export function grilleDepuisDegres(
  mode: "major" | "minor",
  degres: string[],
  toniquePc: number,
): BackingChord[] | null {
  const out: BackingChord[] = [];
  for (let bar = 0; bar < degres.length; bar++) {
    const lu = lireDegre(mode, degres[bar]);
    const hauteurs = hauteursDuDegre(mode, degres[bar], toniquePc);
    const accord = accordDuDegre(mode, degres[bar], toniquePc);
    if (!lu || !hauteurs || !accord) return null;
    out.push({
      bar,
      degree: lu.rang,
      roman: degres[bar],
      symbol: accord.anglo,
      midis: voicePitchClasses(hauteurs),
      bassMidi: place(hauteurs[0], BASS_LOW),
    });
  }
  return out;
}

/** Même empilement que voice(), à partir de classes de hauteur. */
function voicePitchClasses(pcs: number[]): number[] {
  let precedent = CHORD_LOW - 1;
  return pcs.map((pc) => {
    let midi = place(pc, CHORD_LOW);
    while (midi <= precedent) midi += 12;
    precedent = midi;
    return midi;
  });
}
