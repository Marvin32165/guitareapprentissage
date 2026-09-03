// Moteur de jeu « guitare » : au-dessus d'une source d'échantillons, ce qui
// distingue une guitare d'un clavier.
//
// Trois choses qu'un simple Sampler ne fait pas :
//
//  1. ÉTOUFFEMENT PAR CORDE — une corde ne peut porter qu'une note à la fois.
//     Rejouer la corde de Sol coupe ce qu'elle jouait ; les autres continuent.
//     C'est pour ça qu'on pilote soi-même chaque AudioBufferSourceNode plutôt
//     que d'appeler un Sampler, qui raisonne par hauteur et pas par corde.
//
//  2. BALAYAGE — un accord n'est pas un cluster : les cordes sont attaquées
//     l'une après l'autre, sur 15 à 30 ms selon la vigueur du coup.
//
//  3. PETITE PIÈCE — une convolution courte, sur une réponse impulsionnelle
//     calculée à l'exécution (bruit filtré à décroissance exponentielle). Pas
//     de fichier à embarquer, donc pas de licence à vérifier ; en contrepartie
//     ce n'est pas une vraie pièce, juste de quoi retirer l'aspect « note
//     posée sur du silence ».
//
// Un filtrage « cordes filées / cordes nues » a existé ici. Comparé à l'aveugle
// sur le cas même où il devait servir — le même Mi4 corde 1 case 0 puis corde 4
// case 14, qui déclenchent le même fichier —, il ne s'entendait pas. Il a donc
// été retiré : une approximation qui n'apporte rien reste du code à maintenir.
// Seul un jeu réellement échantillonné corde par corde résoudrait ce point.

import { startAudio, playMidi } from "./engine";
import { type SourceId } from "./source-ids";

// Le catalogue (chemins des échantillons de six sources) n'est chargé qu'au
// premier son : inutile de le faire descendre sur une page qui n'en joue pas.
const catalogue = () => import("./sources");
import { loadBuffer } from "./buffers";

/**
 * Le repli sur la synthèse est délibéré — un appui ne doit jamais produire de
 * silence — mais il masque aussi les vraies pannes. En développement, on le
 * signale : c'est exactement ce qui a caché un branchement invalide sur la
 * sortie de Tone.
 */
function reportFallback(origin: string, error: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[audio] ${origin} : repli sur la synthèse —`, error);
  }
}

export const STRING_COUNT = 6;

const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** « C#5 », « Db5 », « E2 » ou « 64 » -> numéro MIDI. */
export function keyToMidi(key: string): number | null {
  if (/^\d+$/.test(key)) return Number(key);
  const m = key.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!m) return null;
  const [, letter, accidental, octave] = m;
  const alter = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return (Number(octave) + 1) * 12 + NOTE_OFFSETS[letter] + alter;
}

export type Layout = { midi: number; url: string }[];

/**
 * Vitesse de lecture pour obtenir `midi` à partir d'un échantillon enregistré
 * à `sampleMidi`. Exportée pour que l'audit de justesse mesure bien ce que joue
 * l'application, et non une réécriture de la même formule.
 */
export function playbackRateFor(midi: number, sampleMidi: number): number {
  return Math.pow(2, (midi - sampleMidi) / 12);
}

/** Table des échantillons d'une source, triée par hauteur. */
export function sampleLayout(id: SourceId): Promise<Layout | null> {
  return layoutOf(id);
}

async function layoutOf(id: SourceId): Promise<Layout | null> {
  const { getSource, resolveUrls } = await catalogue();
  const urls = resolveUrls(getSource(id));
  if (!urls) return null;
  const layout: Layout = [];
  for (const [key, url] of Object.entries(urls)) {
    const midi = keyToMidi(key);
    if (midi !== null) layout.push({ midi, url });
  }
  return layout.sort((a, b) => a.midi - b.midi);
}

/** Échantillon le plus proche de la hauteur demandée. */
export function nearestSample(layout: Layout, midi: number): { midi: number; url: string } {
  let best = layout[0];
  for (const s of layout) {
    if (Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s;
  }
  return best;
}

// --------------------------------------------------------------- chaîne audio

type Rig = {
  ctx: BaseAudioContext;
  /** Entrée commune : convolution en parallèle du signal direct. */
  bus: GainNode;
  layout: Layout;
  sourceId: SourceId;
};

type ActiveNote = { gain: GainNode; source: AudioBufferSourceNode };

let rig: Rig | null = null;
const active: (ActiveNote | null)[] = Array.from({ length: STRING_COUNT }, () => null);

/**
 * Réponse impulsionnelle synthétique : bruit à décroissance exponentielle,
 * légèrement filtré. Courte (0,45 s) et discrète — l'objectif est un peu d'air
 * autour de la note, pas une salle de concert.
 */
function buildRoomImpulse(ctx: BaseAudioContext): AudioBuffer {
  const seconds = 0.45;
  const length = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = ir.getChannelData(channel);
    let previous = 0;
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.6);
      const noise = (Math.random() * 2 - 1) * decay;
      // Passe-bas du premier ordre : un rendu tout-aigu ferait « métallique ».
      previous = previous * 0.62 + noise * 0.38;
      data[i] = previous;
    }
  }
  return ir;
}

async function ensureRig(sourceId: SourceId): Promise<Rig | null> {
  if (rig && rig.sourceId === sourceId) return rig;

  const layout = await layoutOf(sourceId);
  if (!layout || layout.length === 0) return null;

  await startAudio();
  const Tone = await import("tone");
  const ctx = Tone.getContext().rawContext as unknown as BaseAudioContext;

  // On sort sur la destination *native* du contexte, pas sur celle de Tone :
  // `Tone.getDestination().input` est un nœud Tone (Volume), et y brancher un
  // GainNode natif lève une TypeError. Tone et ce moteur partagent le même
  // AudioContext, ils cohabitent donc sans problème sur la sortie.
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const dry = ctx.createGain();
  dry.gain.value = 0.86;
  dry.connect(master);

  const wet = ctx.createGain();
  wet.gain.value = 0.14;
  const convolver = ctx.createConvolver();
  convolver.buffer = buildRoomImpulse(ctx);
  convolver.connect(wet);
  wet.connect(master);

  const bus = ctx.createGain();
  bus.connect(dry);
  bus.connect(convolver);

  rig = { ctx, bus, layout, sourceId };
  return rig;
}

/** Coupe ce que joue une corde, avec une courte rampe (un couac sinon). */
function choke(stringIndex: number, at: number, fadeSec = 0.028): void {
  const current = active[stringIndex];
  if (!current) return;
  active[stringIndex] = null;
  try {
    current.gain.gain.cancelScheduledValues(at);
    current.gain.gain.setValueAtTime(current.gain.gain.value, at);
    current.gain.gain.linearRampToValueAtTime(0.0001, at + fadeSec);
    current.source.stop(at + fadeSec + 0.01);
  } catch {
    /* la source était déjà arrêtée */
  }
}

export interface PluckOptions {
  /** 0 = Mi grave (6e corde) … 5 = Mi aigu (1re corde). */
  stringIndex: number;
  midi: number;
  velocity?: number;
  /** Durée avant extinction forcée. Par défaut : décroissance naturelle. */
  durationSec?: number;
  /** Instant de jeu, en temps AudioContext. Par défaut : maintenant. */
  time?: number;
  sourceId?: SourceId;
}

/**
 * Joue une note sur une corde donnée. Retombe sur la synthèse si la source
 * n'est pas disponible : un appui ne doit jamais produire de silence.
 */
export async function pluck(options: PluckOptions): Promise<void> {
  const {
    stringIndex,
    midi,
    velocity = 0.8,
    durationSec,
    time,
    sourceId = currentSource,
  } = options;

  try {
    const r = await ensureRig(sourceId);
    if (!r) {
      await playMidi(midi, durationSec ?? 1.4);
      return;
    }

    const sample = nearestSample(r.layout, midi);
    const buffer = await loadBuffer(r.ctx, sample.url);

    const at = Math.max(time ?? r.ctx.currentTime, r.ctx.currentTime);
    const index = Math.min(Math.max(stringIndex, 0), STRING_COUNT - 1);
    choke(index, at);

    const source = r.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRateFor(midi, sample.midi);

    const gain = r.ctx.createGain();
    // Égalisation de niveau entre jeux, sinon le plus fort paraît le meilleur.
    const { trimForUrl } = await catalogue();
    const level =
      Math.max(0.05, Math.min(velocity, 1)) * Math.pow(10, trimForUrl(sample.url) / 20);
    // Attaque très courte plutôt qu'instantanée : évite le clic de démarrage.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.004);

    source.connect(gain);
    gain.connect(r.bus);
    source.start(at);

    const natural = buffer.duration / source.playbackRate.value;
    const stopAt = durationSec !== undefined ? at + durationSec : at + natural;
    if (durationSec !== undefined) {
      gain.gain.setValueAtTime(gain.gain.value, Math.max(stopAt - 0.08, at + 0.005));
      gain.gain.linearRampToValueAtTime(0.0001, stopAt);
    }
    source.stop(stopAt + 0.02);

    const note: ActiveNote = { gain, source };
    active[index] = note;
    source.onended = () => {
      if (active[index] === note) active[index] = null;
    };
  } catch (error) {
    reportFallback("pluck", error);
    await playMidi(midi, durationSec ?? 1.4);
  }
}

/**
 * Précharge les échantillons nécessaires à une série de notes. Indispensable
 * avant une comparaison A/B : un silence de chargement entre les deux extraits
 * suffit à fausser le jugement.
 */
export async function preloadForMidis(sourceId: SourceId, midis: number[]): Promise<void> {
  const r = await ensureRig(sourceId);
  if (!r) return;
  const urls = new Set(midis.map((m) => nearestSample(r.layout, m).url));
  await Promise.all([...urls].map((u) => loadBuffer(r.ctx, u).catch(() => null)));
}

export interface StrumPosition {
  stringIndex: number;
  midi: number;
}

export type StrumDirection = "down" | "up";

/**
 * Ordre et décalage de chaque corde dans un balayage. Extrait du jeu lui-même
 * pour être vérifiable : c'est le décalage qui fait entendre un accord plutôt
 * qu'un agrégat de notes simultanées.
 */
export function strumSchedule(
  positions: StrumPosition[],
  { direction = "down", spreadMs = 22 }: { direction?: StrumDirection; spreadMs?: number } = {},
): (StrumPosition & { offsetSec: number })[] {
  if (positions.length === 0) return [];
  // Un coup vers le bas part de la corde grave ; vers le haut, de l'aiguë.
  const ordered = [...positions].sort((a, b) =>
    direction === "down" ? a.stringIndex - b.stringIndex : b.stringIndex - a.stringIndex,
  );
  const step = spreadMs / 1000 / Math.max(ordered.length - 1, 1);
  return ordered.map((p, i) => ({ ...p, offsetSec: i * step }));
}

/**
 * Balaie un accord. `spreadMs` est l'écart total entre la première et la
 * dernière corde : 15 ms pour un coup sec, 30 ms pour un coup ample.
 */
export async function strum(
  positions: StrumPosition[],
  {
    direction = "down",
    spreadMs = 22,
    velocity = 0.8,
    durationSec,
    time,
    sourceId = currentSource,
  }: {
    direction?: StrumDirection;
    spreadMs?: number;
    velocity?: number;
    durationSec?: number;
    /** Instant de l'attaque, en temps AudioContext. Par défaut : maintenant. */
    time?: number;
    sourceId?: SourceId;
  } = {},
): Promise<void> {
  const schedule = strumSchedule(positions, { direction, spreadMs });
  if (schedule.length === 0) return;

  const r = await ensureRig(sourceId);
  // Sans instant explicite, on part maintenant ; avec, on respecte la
  // planification — un accompagnement planifié à l'avance en dépend.
  const base = r ? Math.max(time ?? r.ctx.currentTime + 0.02, r.ctx.currentTime) : 0;

  await Promise.all(
    schedule.map(({ stringIndex, midi, offsetSec }) =>
      pluck({
        stringIndex,
        midi,
        velocity: velocity * (direction === "up" ? 0.9 : 1),
        durationSec,
        sourceId,
        time: r ? base + offsetSec : undefined,
      }),
    ),
  );
}

/** Étouffe toutes les cordes (paume sur les cordes). */
export function muteAll(): void {
  if (!rig) return;
  const at = rig.ctx.currentTime;
  for (let i = 0; i < STRING_COUNT; i++) choke(i, at, 0.05);
}

// ------------------------------------------------------- source sélectionnée

// Source retenue après comparaison à l'aveugle (cf. README). C'est aussi ce
// que joue un appareil neuf, avant toute préférence enregistrée.
let currentSource: SourceId = "fluid-steel";

export function getGuitarSource(): SourceId {
  return currentSource;
}

/** Change de jeu d'échantillons ; la chaîne est reconstruite au prochain son. */
export function setGuitarSource(id: SourceId): void {
  if (id === currentSource) return;
  muteAll();
  currentSource = id;
  rig = null;
}
