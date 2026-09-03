// Génération des questions d'oreille.
//
// Séparée de l'interface pour être vérifiable : une question dont la bonne
// réponse ne figure pas dans les propositions, ou dont les notes jouées ne
// correspondent pas à ce qu'on demande d'identifier, serait un piège
// silencieux — l'utilisateur croirait avoir mal entendu.
//
// Toutes les questions sont ANCRÉES : chacune sait quoi montrer sur le manche
// une fois répondue. Entendre une tierce mineure sans voir où elle tombe sous
// les doigts n'apprend rien à un guitariste.

import { parseNote, pitchClass, formatNote, type Note } from "@/lib/music/pitch";
import { majorScale } from "@/lib/music/scales";

export type EarExerciseId = "interval" | "chord_quality" | "degree" | "naming";

export interface EarOption {
  value: string;
  label: string;
}

export interface PlayGroup {
  /** Notes jouées ensemble. Une seule = mélodique, plusieurs = harmonique. */
  midis: number[];
  /** Délai avant ce groupe, en millisecondes, depuis le début. */
  atMs: number;
}

export interface EarQuestion {
  exercise: EarExerciseId;
  /** Sujet précis, tel qu'il sera journalisé (voir EarStat.subtype). */
  subtype: string;
  /** Consigne, sans jamais révéler la réponse. */
  prompt: string;
  options: EarOption[];
  answer: string;
  /** Ce qu'il faut jouer pour poser la question. */
  play: PlayGroup[];
  /** Explication affichée après coup. */
  explain: string;
  /** Racine à afficher sur le manche pour ancrer la réponse. */
  anchorRoot: string;
  anchorKind: "major" | "naturalMinor" | "chordMaj" | "chordMin";
}

// ------------------------------------------------------------- intervalles

export interface IntervalDef {
  semitones: number;
  id: string;
  label: string;
  /** Niveau d'introduction : 1 = les plus francs, 3 = les plus proches. */
  level: 1 | 2 | 3;
}

export const INTERVALS: IntervalDef[] = [
  { semitones: 12, id: "P8", label: "Octave", level: 1 },
  { semitones: 7, id: "P5", label: "Quinte juste", level: 1 },
  { semitones: 5, id: "P4", label: "Quarte juste", level: 1 },
  { semitones: 4, id: "M3", label: "Tierce majeure", level: 1 },
  { semitones: 3, id: "m3", label: "Tierce mineure", level: 1 },
  { semitones: 9, id: "M6", label: "Sixte majeure", level: 2 },
  { semitones: 8, id: "m6", label: "Sixte mineure", level: 2 },
  { semitones: 10, id: "m7", label: "Septième mineure", level: 2 },
  { semitones: 2, id: "M2", label: "Seconde majeure", level: 2 },
  { semitones: 11, id: "M7", label: "Septième majeure", level: 3 },
  { semitones: 1, id: "m2", label: "Seconde mineure", level: 3 },
  { semitones: 6, id: "TT", label: "Quarte augmentée", level: 3 },
];

// ------------------------------------------------------------ qualités

export interface QualityDef {
  id: string;
  label: string;
  /** Écarts en demi-tons depuis la fondamentale. */
  steps: number[];
  level: 1 | 2 | 3;
}

export const QUALITIES: QualityDef[] = [
  { id: "maj", label: "Majeur", steps: [0, 4, 7], level: 1 },
  { id: "min", label: "Mineur", steps: [0, 3, 7], level: 1 },
  { id: "dom7", label: "Septième de dominante", steps: [0, 4, 7, 10], level: 2 },
  { id: "min7", label: "Mineur septième", steps: [0, 3, 7, 10], level: 2 },
  { id: "maj7", label: "Majeure septième", steps: [0, 4, 7, 11], level: 2 },
  { id: "dim", label: "Diminué", steps: [0, 3, 6], level: 3 },
];

/** Étendue confortable pour l'écoute : Mi2 à La4. */
const LOW = 40;
const HIGH = 69;

export interface Rng {
  (): number;
}

/**
 * Générateur déterministe. Sert à deux choses : couvrir beaucoup de tirages
 * dans les tests, et produire la PREMIÈRE question d'une session à l'identique
 * sur le serveur et sur le client. Une question tirée au hasard pendant le
 * rendu serveur ne peut pas correspondre à celle du navigateur, et React
 * signale l'écart comme une erreur d'hydratation.
 */
export function seededRng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Graine stable dérivée d'une chaîne. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

const NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"];

function randomRootNote(rng: Rng): Note {
  return parseNote(pick(NOTE_NAMES, rng));
}

function midiFor(note: Note, low = LOW, high = HIGH, rng?: Rng): number {
  const pc = pitchClass(note);
  const choix: number[] = [];
  for (let m = low; m <= high; m++) if (((m % 12) + 12) % 12 === pc) choix.push(m);
  return rng ? pick(choix, rng) : choix[0];
}

/** Propositions : la bonne réponse plus des leurres, mélangées. */
function buildOptions<T extends { id: string; label: string }>(
  all: T[],
  answer: T,
  count: number,
  rng: Rng,
): EarOption[] {
  const leurres = all.filter((x) => x.id !== answer.id);
  const choisis: T[] = [];
  while (choisis.length < Math.min(count - 1, leurres.length)) {
    const c = pick(leurres, rng);
    if (!choisis.some((x) => x.id === c.id)) choisis.push(c);
  }
  const tout = [...choisis, answer];
  // Mélange : sans ça la bonne réponse serait toujours en dernier.
  for (let i = tout.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tout[i], tout[j]] = [tout[j], tout[i]];
  }
  return tout.map((x) => ({ value: x.id, label: x.label }));
}

export function intervalQuestion(level: 1 | 2 | 3, rng: Rng = Math.random): EarQuestion {
  const pool = INTERVALS.filter((i) => i.level <= level);
  const chosen = pick(pool, rng);
  const root = randomRootNote(rng);
  // On garde la seconde note dans l'étendue : sinon l'intervalle change d'octave.
  const base = midiFor(root, LOW, HIGH - chosen.semitones, rng);
  return {
    exercise: "interval",
    subtype: chosen.id,
    prompt: "Deux notes, l'une après l'autre. Quel est l'intervalle ?",
    options: buildOptions(pool, chosen, 4, rng),
    answer: chosen.id,
    play: [
      { midis: [base], atMs: 0 },
      { midis: [base + chosen.semitones], atMs: 900 },
    ],
    explain: `${chosen.label} : ${chosen.semitones} demi-tons, donc ${chosen.semitones} cases sur une même corde.`,
    anchorRoot: formatNote(root).replace("♯", "#").replace("♭", "b"),
    anchorKind: "major",
  };
}

export function chordQualityQuestion(level: 1 | 2 | 3, rng: Rng = Math.random): EarQuestion {
  const pool = QUALITIES.filter((q) => q.level <= level);
  const chosen = pick(pool, rng);
  const root = randomRootNote(rng);
  const base = midiFor(root, LOW, 57, rng);
  return {
    exercise: "chord_quality",
    subtype: chosen.id,
    prompt: "Un accord plaqué. De quelle sorte est-il ?",
    options: buildOptions(pool, chosen, 4, rng),
    answer: chosen.id,
    play: [{ midis: chosen.steps.map((s) => base + s), atMs: 0 }],
    explain: `${chosen.label} : ${chosen.steps.slice(1).join(" et ")} demi-tons au-dessus de la fondamentale.`,
    anchorRoot: formatNote(root).replace("♯", "#").replace("♭", "b"),
    anchorKind: chosen.steps[1] === 3 ? "chordMin" : "chordMaj",
  };
}

const DEGREE_LABELS = [
  "1er (tonique)",
  "2e",
  "3e",
  "4e",
  "5e",
  "6e",
  "7e (sensible)",
];

export function degreeQuestion(level: 1 | 2 | 3, rng: Rng = Math.random): EarQuestion {
  // Niveau 1 : les degrés les plus stables. Puis on ouvre.
  const indices = level === 1 ? [0, 2, 4] : level === 2 ? [0, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
  const degreeIndex = pick(indices, rng);
  const root = randomRootNote(rng);
  const scale = majorScale(root);
  const base = midiFor(root, LOW, 60, rng);
  const cible = base + ((pitchClass(scale[degreeIndex]) - pitchClass(root) + 12) % 12);
  const pool = indices.map((i) => ({ id: String(i + 1), label: DEGREE_LABELS[i] }));
  const answer = { id: String(degreeIndex + 1), label: DEGREE_LABELS[degreeIndex] };
  return {
    exercise: "degree",
    subtype: String(degreeIndex + 1),
    prompt: "L'accord de tonique, puis une note de la gamme. Quel degré ?",
    options: buildOptions(pool, answer, Math.min(4, pool.length), rng),
    answer: answer.id,
    play: [
      { midis: [base, base + 4, base + 7], atMs: 0 },
      { midis: [cible], atMs: 1400 },
    ],
    explain: `${DEGREE_LABELS[degreeIndex]} degré de ${formatNote(root)} majeur, soit ${formatNote(scale[degreeIndex])}.`,
    anchorRoot: formatNote(root).replace("♯", "#").replace("♭", "b"),
    anchorKind: "major",
  };
}

/** Conversion latin ↔ anglo : pas de l'oreille, du vocabulaire. */
const LATIN = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];

export function namingQuestion(_level: 1 | 2 | 3, rng: Rng = Math.random): EarQuestion {
  const i = Math.floor(rng() * 7);
  const versAnglo = rng() < 0.5;
  const pool = NOTE_NAMES.map((anglo, k) => ({
    id: versAnglo ? anglo : LATIN[k],
    label: versAnglo ? anglo : LATIN[k],
  }));
  const answer = pool[i];
  return {
    exercise: "naming",
    subtype: NOTE_NAMES[i],
    prompt: versAnglo
      ? `Comment s'écrit « ${LATIN[i]} » en notation anglo-saxonne ?`
      : `Quelle note est « ${NOTE_NAMES[i]} » en notation latine ?`,
    options: buildOptions(pool, answer, 4, rng),
    answer: answer.id,
    play: [{ midis: [midiFor(parseNote(NOTE_NAMES[i]), 52, 64)], atMs: 0 }],
    explain: `${LATIN[i]} = ${NOTE_NAMES[i]}. La notation anglo-saxonne part de La = A.`,
    anchorRoot: NOTE_NAMES[i],
    anchorKind: "major",
  };
}

export const GENERATORS: Record<
  EarExerciseId,
  (level: 1 | 2 | 3, rng?: Rng) => EarQuestion
> = {
  interval: intervalQuestion,
  chord_quality: chordQualityQuestion,
  degree: degreeQuestion,
  naming: namingQuestion,
};

export const EXERCISE_LABELS: Record<EarExerciseId, { label: string; hint: string }> = {
  interval: { label: "Intervalles", hint: "deux notes, quel écart" },
  chord_quality: { label: "Accords", hint: "majeur, mineur, septième" },
  degree: { label: "Degrés", hint: "quelle note dans la tonalité" },
  naming: { label: "Do ré mi / C D E", hint: "conversion des noms" },
};
