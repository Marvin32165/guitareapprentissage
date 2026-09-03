// Lecture par échantillons, une instance de Tone.Sampler par source.
//
// Tone.Sampler choisit l'échantillon le plus proche et transpose le reste :
// c'est exactement ce qu'on veut entendre pour juger une source dont la
// tessiture est incomplète (Iowa au-dessus de Ré5).

import { startAudio, playMidi } from "./engine";
import { getSource, resolveUrls, type SourceId } from "./sources";

type SamplerLike = {
  triggerAttackRelease: (note: string, duration: number, time?: number) => void;
  releaseAll?: () => void;
};
type GainLike = { gain: { value: number } };

type Voice = { sampler: SamplerLike; gain: GainLike };

const loading = new Map<SourceId, Promise<Voice>>();

/** Charge (une seule fois) les échantillons d'une source. */
export function ensureSource(id: SourceId): Promise<Voice> {
  const existing = loading.get(id);
  if (existing) return existing;

  const p = (async (): Promise<Voice> => {
    const Tone = await import("tone");
    await startAudio();
    const src = getSource(id);
    const urls = resolveUrls(src);
    if (!urls) throw new Error("Cette source n'utilise pas d'échantillons.");

    const gain = new Tone.Gain(1).toDestination();
    const sampler = new Tone.Sampler({ urls }).connect(gain);
    await Tone.loaded();
    return {
      sampler: sampler as unknown as SamplerLike,
      gain: gain as unknown as GainLike,
    };
  })();

  loading.set(id, p);
  p.catch(() => loading.delete(id)); // un échec ne doit pas figer la source
  return p;
}

export function isSourceLoaded(id: SourceId): boolean {
  return loading.has(id);
}

function midiToNote(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Joue une note MIDI avec la source demandée. */
export async function playFromSource(
  id: SourceId,
  midi: number,
  { durationSec = 2.5, gainDb = 0 }: { durationSec?: number; gainDb?: number } = {},
): Promise<void> {
  if (id === "synth") {
    await playMidi(midi, durationSec);
    return;
  }
  try {
    const Tone = await import("tone");
    const voice = await ensureSource(id);
    voice.gain.gain.value = Tone.dbToGain(gainDb);
    voice.sampler.triggerAttackRelease(midiToNote(midi), durationSec);
  } catch {
    // Repli : jamais de silence au clic.
    await playMidi(midi, durationSec);
  }
}

/** Joue une séquence de notes espacées (test du raccord, gammes). */
export async function playSequence(
  id: SourceId,
  midis: number[],
  { stepSec = 0.42, durationSec = 1.2, gainDb = 0 }: {
    stepSec?: number;
    durationSec?: number;
    gainDb?: number;
  } = {},
): Promise<void> {
  for (let i = 0; i < midis.length; i++) {
    void playFromSource(id, midis[i], { durationSec, gainDb });
    if (i < midis.length - 1) {
      await new Promise((r) => setTimeout(r, stepSec * 1000));
    }
  }
}
