// Accès à Tone.js. Le premier son nécessite un geste utilisateur (politique
// d'autoplay, indispensable sur iOS) : `startAudio()` doit être appelé depuis
// un gestionnaire d'événement (clic/tap). Tone est importé dynamiquement pour
// ne pas l'embarquer tant qu'aucun son n'est demandé.
//
// PluckSynth (corde pincée, Karplus-Strong) est monophonique et incompatible
// avec PolySynth : on gère la polyphonie via un petit pool de voix.

type Voice = {
  triggerAttackRelease: (
    note: number,
    duration: number,
    time?: number,
    velocity?: number,
  ) => void;
};

let started = false;
const voices: Voice[] = [];
let voiceCursor = 0;

export function isAudioStarted(): boolean {
  return started;
}

export async function startAudio(): Promise<void> {
  if (started) return;
  const Tone = await import("tone");
  await Tone.start();
  started = true;
}

async function ensureVoices(count = 8): Promise<typeof import("tone")> {
  const Tone = await import("tone");
  await startAudio();
  if (voices.length === 0) {
    for (let i = 0; i < count; i++) {
      const v = new Tone.PluckSynth({
        resonance: 0.9,
        dampening: 4000,
      }).toDestination();
      voices.push(v as unknown as Voice);
    }
  }
  return Tone;
}

function nextVoice(): Voice {
  const v = voices[voiceCursor % voices.length];
  voiceCursor += 1;
  return v;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Joue une note (numéro MIDI). Silencieux en cas d'échec (jamais bloquant). */
export async function playMidi(midi: number, durationSec = 1.4): Promise<void> {
  try {
    await ensureVoices();
    nextVoice().triggerAttackRelease(midiToFreq(midi), durationSec);
  } catch {
    /* audio indisponible : on n'interrompt pas l'UI */
  }
}

/** Joue plusieurs notes en léger balayage (effet de gratte). */
export async function playMidis(
  midis: number[],
  { strumSec = 0.035, durationSec = 1.8 }: { strumSec?: number; durationSec?: number } = {},
): Promise<void> {
  try {
    const Tone = await ensureVoices();
    const now = Tone.now();
    midis.forEach((m, i) => {
      nextVoice().triggerAttackRelease(midiToFreq(m), durationSec, now + i * strumSec);
    });
  } catch {
    /* idem : non bloquant */
  }
}
