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

/**
 * Corrige la justesse de PluckSynth.
 *
 * Karplus-Strong fait circuler le signal dans une ligne à retard d'un nombre
 * ENTIER d'échantillons : les hauteurs réellement atteignables sont donc
 * `cadence / N`, une grille qui s'élargit vers l'aigu (30 cents d'écart entre
 * deux crans à 780 Hz). Tone arrondit cette longueur vers le haut — mesuré :
 * `ceil(cadence / f)` — ce qui rend toutes les notes basses, jusqu'à
 * −23,5 cents sur Fa5.
 *
 * On vise donc l'entier le PLUS PROCHE plutôt que le suivant, en demandant une
 * fréquence juste au-dessus du cran voulu. L'erreur reste inhérente à la
 * méthode, mais elle passe d'environ −23 cents à moins de +8.
 */
export function pluckFrequency(midi: number, sampleRate: number): number {
  const target = midiToFreq(midi);
  const nearest = Math.max(2, Math.round(sampleRate / target));
  // Un cheveu sous l'entier : `ceil` retombe alors exactement dessus.
  return sampleRate / (nearest - 0.001);
}

/** Joue une note (numéro MIDI). Silencieux en cas d'échec (jamais bloquant). */
export async function playMidi(midi: number, durationSec = 1.4): Promise<void> {
  try {
    const Tone = await ensureVoices();
    nextVoice().triggerAttackRelease(
      pluckFrequency(midi, Tone.getContext().sampleRate),
      durationSec,
    );
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
    const sampleRate = Tone.getContext().sampleRate;
    midis.forEach((m, i) => {
      nextVoice().triggerAttackRelease(
        pluckFrequency(m, sampleRate),
        durationSec,
        now + i * strumSec,
      );
    });
  } catch {
    /* idem : non bloquant */
  }
}
