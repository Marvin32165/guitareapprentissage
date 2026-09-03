// Lecture d'un accompagnement, sur l'horloge de l'AudioContext.
//
// Même principe que le métronome : un `setInterval` grossier planifie à
// l'avance des événements datés. Séparé de `backing.ts`, qui reste pur et
// testable — ici on touche au son, donc rien n'est vérifiable hors navigateur.

import { LOOKAHEAD_S, SCHEDULER_MS, beatDuration, scheduleClick } from "./metronome";
import type { BackingChord } from "./backing";

export interface BackingOptions {
  chords: BackingChord[];
  bpm: number;
  beatsPerBar: number;
  /** Clic du métronome par-dessus l'accompagnement. */
  withClick: boolean;
  /** Appelé quand une mesure démarre, pour l'affichage. */
  onBar?: (info: { index: number; chord: BackingChord; time: number; now: number }) => void;
}

export interface BackingHandle {
  stop: () => void;
}

/**
 * Une mesure = la basse sur le premier temps, l'accord gratté sur chaque temps.
 * Volontairement sobre : c'est un support pour jouer par-dessus, pas un morceau.
 */
export async function startBacking(options: BackingOptions): Promise<BackingHandle> {
  const { chords, bpm, beatsPerBar, withClick, onBar } = options;
  const { pluck, strum } = await import("./guitar");
  const Tone = await import("tone");
  await Tone.start();
  const ctx = Tone.getContext().rawContext as unknown as BaseAudioContext;

  const clickOut = ctx.createGain();
  clickOut.gain.value = 0.6;
  clickOut.connect(ctx.destination);

  const beat = beatDuration(bpm);
  const start = ctx.currentTime + 0.15;
  let beatIndex = 0;
  let stopped = false;

  const timer = setInterval(() => {
    if (stopped) return;
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    while (start + beatIndex * beat < horizon) {
      const time = start + beatIndex * beat;
      const barIndex = Math.floor(beatIndex / beatsPerBar);
      const beatInBar = beatIndex % beatsPerBar;
      const chord = chords[barIndex % chords.length];

      if (withClick) {
        scheduleClick(ctx, clickOut, time, beatInBar === 0 ? "accent" : "beat");
      }

      // La basse marque le début de mesure ; l'accord marque chaque temps, plus
      // doucement, pour laisser la place à ce qu'on joue dessus.
      if (beatInBar === 0) {
        void pluck({ stringIndex: 0, midi: chord.bassMidi, velocity: 0.75, time, durationSec: beat * 0.95 });
        onBar?.({ index: barIndex, chord, time, now: ctx.currentTime });
      }
      void strum(
        chord.midis.map((midi, i) => ({ stringIndex: 2 + (i % 4), midi })),
        {
          direction: beatInBar % 2 === 0 ? "down" : "up",
          spreadMs: 20,
          time,
          velocity: beatInBar === 0 ? 0.55 : 0.4,
          durationSec: beat * 0.9,
        },
      );

      beatIndex += 1;
    }
  }, SCHEDULER_MS);

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      try {
        clickOut.disconnect();
      } catch {
        /* déjà déconnecté */
      }
    },
  };
}
