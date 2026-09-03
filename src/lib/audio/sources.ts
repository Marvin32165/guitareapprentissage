// Déclaration des sources sonores comparées.
//
// Volontairement DÉCLARATIF : ajouter une source (par exemple un jeu Freesound
// échantillonné corde par corde) consiste à ajouter une entrée ici, sans
// toucher au moteur ni à l'interface.

export type SourceId =
  | "synth"
  | "iowa"
  | "fluid-steel"
  | "fluid-nylon"
  | "hybride"
  | "martin";

export interface SampleSource {
  id: SourceId;
  label: string;
  /** Ce qu'on cherche à juger en l'écoutant. */
  description: string;
  licence: string;
  /** Étendue réellement échantillonnée, en clair. */
  couverture: string;
  /** Map note -> URL pour Tone.Sampler. null = synthèse, pas d'échantillons. */
  urls: Record<string, string> | null;
  /**
   * Source disponible en plusieurs formats : le chargeur tranche à l'exécution
   * selon ce que sait lire le navigateur. Opus n'est pas lisible partout sur
   * iOS selon la version, et cette application se juge d'abord au téléphone.
   */
  multi?: {
    base: string;
    /** Numéros MIDI échantillonnés (les fichiers sont nommés par ce numéro). */
    midis: number[];
    formats: { ext: string; mime: string }[];
  };
}

const IOWA = "/audio/compare/iowa";
const STEEL = "/audio/compare/fluid-steel";
const NYLON = "/audio/compare/fluid-nylon";
const MARTIN = "/audio/compare/martin";

/** Notes présentes dans le jeu Iowa (fichiers en dièses : Cs5). */
const IOWA_NOTES: [string, string][] = [
  ["E2", "E2"], ["A2", "A2"], ["D3", "D3"], ["E3", "E3"], ["G3", "G3"],
  ["A3", "A3"], ["B3", "B3"], ["C4", "C4"], ["D4", "D4"], ["E4", "E4"],
  ["G4", "G4"], ["A4", "A4"], ["B4", "B4"], ["C5", "C5"], ["C#5", "Cs5"],
  ["D5", "D5"],
];

/** Notes présentes dans les jeux FluidR3 (fichiers en bémols : Db5). */
const FLUID_NOTES: [string, string][] = [
  ["E2", "E2"], ["A2", "A2"], ["D3", "D3"], ["E3", "E3"], ["G3", "G3"],
  ["A3", "A3"], ["B3", "B3"], ["C4", "C4"], ["D4", "D4"], ["E4", "E4"],
  ["G4", "G4"], ["A4", "A4"], ["B4", "B4"], ["C5", "C5"], ["Db5", "Db5"],
  ["D5", "D5"], ["Eb5", "Eb5"], ["E5", "E5"], ["F5", "F5"], ["Gb5", "Gb5"],
  ["G5", "G5"],
];

function map(base: string, ext: string, notes: [string, string][]): Record<string, string> {
  return Object.fromEntries(notes.map(([note, file]) => [note, `${base}/${file}.${ext}`]));
}

/** Au-dessus de ce MIDI, Iowa n'a plus d'échantillon (D5 = 74). */
export const IOWA_MAX_MIDI = 74;

// Hybride : Iowa jusqu'à D5, FluidR3 steel au-dessus. Tone.Sampler choisit
// l'échantillon le plus proche : la jonction se fait donc exactement à D5/Eb5.
const HYBRIDE = {
  ...map(IOWA, "ogg", IOWA_NOTES),
  ...map(STEEL, "mp3", FLUID_NOTES.filter(([n]) => ["Eb5", "E5", "F5", "Gb5", "G5"].includes(n))),
};

export const SOURCES: SampleSource[] = [
  {
    id: "synth",
    label: "1 · Synthèse actuelle",
    description:
      "Tone.js PluckSynth (Karplus-Strong). La référence à battre : elle s'écrase dans les aigus et n'a aucun corps de caisse dans les médiums.",
    licence: "Aucune (synthèse temps réel)",
    couverture: "Toute l'étendue, sans échantillon",
    urls: null,
  },
  {
    id: "iowa",
    label: "2 · Iowa (captations réelles)",
    description:
      "Guitare acoustique enregistrée, chromatique tous les demi-tons. Le plus vivant, mais s'arrête à Ré5 : au-delà, l'échantillon est étiré.",
    licence: "CC-BY 3.0 — University of Iowa, via nbrosowsky/tonejs-instruments",
    couverture: "Ré2 → Ré5 (au-delà : transposition audible)",
    urls: map(IOWA, "ogg", IOWA_NOTES),
  },
  {
    id: "fluid-steel",
    label: "3 · FluidR3 cordes acier",
    description:
      "Rendu de soundfont, cordes acier. Couvre tout le manche sans transposition, mais moins vivant (une seule couche, bouclé).",
    licence: "CC-BY 3.0 — FluidR3_GM, via gleitz/midi-js-soundfonts",
    couverture: "La0 → Do8 (tout le manche)",
    urls: map(STEEL, "mp3", FLUID_NOTES),
  },
  {
    id: "fluid-nylon",
    label: "4 · FluidR3 cordes nylon",
    description:
      "Même origine, guitare classique. Timbre plus rond, attaque plus douce — à comparer surtout dans les médiums.",
    licence: "CC-BY 3.0 — FluidR3_GM, via gleitz/midi-js-soundfonts",
    couverture: "La0 → Do8 (tout le manche)",
    urls: map(NYLON, "mp3", FLUID_NOTES),
  },
  {
    id: "hybride",
    label: "5 · Hybride Iowa + FluidR3",
    description:
      "Iowa jusqu'à Ré5, FluidR3 acier au-dessus. À juger sur un seul point : entend-on le raccord entre deux captations différentes ?",
    licence: "CC-BY 3.0 — University of Iowa + FluidR3_GM",
    couverture: "Ré2 → Do8, jonction à Ré5/Mi♭5",
    urls: HYBRIDE,
  },
  {
    id: "martin",
    label: "6 · Martin HD28 (CC0)",
    description:
      "Une vraie Martin HD28 cordes acier, un échantillon tous les 3 demi-tons de Mi2 à Si5 : aucune transposition longue, aucun raccord entre deux captations. Trouvée après coup — c'est la candidate sérieuse.",
    licence: "CC0 1.0 (domaine public) — Jeff Learman, via sfzinstruments/Discord-SFZ-GM-Bank",
    couverture: "Mi2 → Si5, un échantillon tous les 3 demi-tons",
    urls: null,
    multi: {
      base: MARTIN,
      midis: [40, 43, 46, 49, 52, 55, 58, 61, 64, 68, 71, 74, 77, 80, 83],
      formats: [
        { ext: "ogg", mime: 'audio/ogg; codecs="opus"' },
        { ext: "mp3", mime: "audio/mpeg" },
      ],
    },
  },
];

/**
 * URLs effectivement chargées pour une source, extension choisie selon le
 * navigateur. À n'appeler que côté client (utilise HTMLAudioElement).
 */
export function resolveUrls(src: SampleSource): Record<string, string> | null {
  if (!src.multi) return src.urls;
  const { base, midis, formats } = src.multi;
  const probe = typeof Audio !== "undefined" ? new Audio() : null;
  const chosen =
    formats.find((f) => probe && probe.canPlayType(f.mime) !== "") ?? formats.at(-1)!;
  return Object.fromEntries(midis.map((m) => [String(m), `${base}/${m}.${chosen.ext}`]));
}

/**
 * Égalisation de niveau, en dB, par dossier d'échantillons.
 *
 * Mesuré à l'EBU R128 (loudness intégrée) sur l'ensemble de chaque jeu, puis
 * ramené à une cible commune de −23 LUFS. Sans ça, les jeux s'écartent de plus
 * de 12 dB : FluidR3 acier est à −33,1 LUFS quand Iowa est à −20,8. Une source
 * 12 dB plus forte est jugée meilleure quelle que soit sa qualité — c'est le
 * biais le plus grossier d'une comparaison à l'oreille, et le seul que
 * l'auditeur ne peut pas corriger sans matériel de mesure.
 *
 * L'application est par dossier et non par source : l'hybride mélange deux
 * captations, et son « raccord » serait sinon un saut de volume de 12 dB
 * plutôt qu'une différence de timbre.
 */
const TRIM_DB: Record<string, number> = {
  iowa: -2.2,
  "fluid-steel": 10.1,
  "fluid-nylon": 7.9,
  martin: -0.5,
};

/**
 * Niveau de la synthèse, estimé par rendu hors ligne (RMS) et non par mesure
 * R128 : approximatif, contrairement aux quatre autres.
 */
export const SYNTH_TRIM_DB = -3;

/** Correction de niveau à appliquer à un échantillon, d'après son chemin. */
export function trimForUrl(url: string): number {
  const folder = url.split("/audio/compare/")[1]?.split("/")[0];
  return folder ? (TRIM_DB[folder] ?? 0) : 0;
}

export function getSource(id: SourceId): SampleSource {
  const s = SOURCES.find((x) => x.id === id);
  if (!s) throw new Error(`Source inconnue : ${id}`);
  return s;
}
