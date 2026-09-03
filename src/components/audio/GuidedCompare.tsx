"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { getSource, type SourceId } from "@/lib/audio/sources";
import { pluck, strum, preloadForMidis } from "@/lib/audio/guitar";
import { storeSource } from "@/lib/audio/preference";

// Comparaison guidée, à l'aveugle.
//
// L'écoute libre suppose qu'on sache quoi écouter. Ici, une seule question par
// manche — « lequel préfères-tu ? » — sans jamais dire quelle source est
// laquelle : autrement le nom l'emporte sur l'oreille, et « captations réelles »
// gagne d'avance.
//
// Tournoi à la loyale : le gagnant d'un manche affronte le suivant. Cinq
// manches pour six sources.

/** Accord de Mi ouvert, puis trois notes plus haut : grave, médium, aigu. */
const CHORD: { stringIndex: number; midi: number }[] = [
  { stringIndex: 0, midi: 40 },
  { stringIndex: 1, midi: 47 },
  { stringIndex: 2, midi: 52 },
  { stringIndex: 3, midi: 56 },
  { stringIndex: 4, midi: 59 },
  { stringIndex: 5, midi: 64 },
];
const MELODY: { stringIndex: number; midi: number; delayMs: number }[] = [
  { stringIndex: 5, midi: 67, delayMs: 1100 },
  { stringIndex: 5, midi: 72, delayMs: 1650 },
  { stringIndex: 5, midi: 76, delayMs: 2200 },
];
const ALL_MIDIS = [...CHORD.map((c) => c.midi), ...MELODY.map((m) => m.midi)];

const ORDER: SourceId[] = ["synth", "iowa", "fluid-steel", "fluid-nylon", "hybride", "martin"];

type Side = "A" | "B";

export function GuidedCompare({ onFinish }: { onFinish?: () => void }) {
  const [champion, setChampion] = useState<SourceId>(ORDER[0]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [playing, setPlaying] = useState<Side | null>(null);
  const [heard, setHeard] = useState<Record<Side, boolean>>({ A: false, B: false });
  const [adopted, setAdopted] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const challenger = ORDER[roundIndex + 1];
  const finished = roundIndex >= ORDER.length - 1;

  // Le tenant du titre n'est pas toujours en A : sinon la position trahit
  // l'identité au bout de deux manches.
  const championSide: Side = useMemo(
    () => (roundIndex % 2 === 0 ? "A" : "B"),
    [roundIndex],
  );
  const sourceFor = useCallback(
    (side: Side): SourceId => (side === championSide ? champion : challenger),
    [championSide, champion, challenger],
  );

  const play = useCallback(
    async (side: Side) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      const sourceId = sourceFor(side);
      setPlaying(side);
      await preloadForMidis(sourceId, ALL_MIDIS);
      await strum(CHORD, { sourceId, spreadMs: 26, durationSec: 3 });
      for (const note of MELODY) {
        timers.current.push(
          setTimeout(() => {
            void pluck({ ...note, sourceId, durationSec: 1.6 });
          }, note.delayMs),
        );
      }
      timers.current.push(
        setTimeout(() => {
          setPlaying(null);
          setHeard((h) => ({ ...h, [side]: true }));
        }, 3400),
      );
    },
    [sourceFor],
  );

  function choose(side: Side | "egal") {
    const winner = side === "egal" ? champion : sourceFor(side);
    setChampion(winner);
    setRoundIndex((r) => r + 1);
    setHeard({ A: false, B: false });
  }

  if (finished) {
    const win = getSource(champion);
    return (
      <section className="space-y-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-5">
        <div>
          <h2 className="text-lg font-medium text-emerald-300">Ton choix : {win.label}</h2>
          <p className="mt-2 text-sm text-neutral-300">{win.description}</p>
          <p className="mt-2 text-xs text-neutral-500">
            {win.couverture} · {win.licence}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            storeSource(champion);
            setAdopted(true);
            onFinish?.();
          }}
          disabled={adopted}
          className={
            "min-h-11 w-full rounded-xl px-4 text-sm font-medium transition-colors " +
            (adopted
              ? "cursor-default border border-emerald-700/60 bg-emerald-900/30 text-emerald-300"
              : "bg-emerald-600 text-white hover:bg-emerald-500")
          }
        >
          {adopted ? "✓ Adopté dans toute l'application" : "Adopter ce son dans toute l'application"}
        </button>
        <button
          type="button"
          onClick={() => {
            setChampion(ORDER[0]);
            setRoundIndex(0);
            setHeard({ A: false, B: false });
            setAdopted(false);
          }}
          className="min-h-11 w-full rounded-xl border border-neutral-700 px-4 text-sm text-neutral-300"
        >
          Recommencer la comparaison
        </button>
      </section>
    );
  }

  const canChoose = heard.A && heard.B;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-400">
          Manche {roundIndex + 1} sur {ORDER.length - 1}
        </p>
        <AudioUnlockButton />
      </div>

      <p className="text-sm text-neutral-300">
        Écoute les deux, autant de fois que tu veux, puis dis simplement lequel tu
        préfères. Tu n&apos;as rien à analyser : c&apos;est celui que tu aurais
        envie d&apos;entendre pendant une heure de travail.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B"] as Side[]).map((side) => (
          <div
            key={side}
            className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
          >
            <p className="text-sm font-medium text-neutral-200">
              Son {side}
              {heard[side] && <span className="ml-2 text-xs text-neutral-500">écouté</span>}
            </p>
            <button
              type="button"
              onClick={() => void play(side)}
              className={
                "min-h-11 w-full rounded-lg px-3 text-sm font-medium transition-colors " +
                (playing === side
                  ? "bg-emerald-600/30 text-emerald-200"
                  : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700")
              }
            >
              {playing === side ? "♪ en cours…" : `▶ Écouter ${side}`}
            </button>
            <button
              type="button"
              onClick={() => choose(side)}
              disabled={!canChoose}
              className={
                "min-h-11 w-full rounded-lg px-3 text-sm font-medium transition-colors " +
                (canChoose
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "cursor-not-allowed border border-neutral-800 text-neutral-600")
              }
            >
              Je préfère {side}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => choose("egal")}
        disabled={!canChoose}
        className={
          "min-h-11 w-full rounded-xl border px-4 text-sm transition-colors " +
          (canChoose
            ? "border-neutral-700 text-neutral-300 hover:bg-neutral-900"
            : "cursor-not-allowed border-neutral-800 text-neutral-600")
        }
      >
        Je n&apos;entends pas de différence
      </button>

      {!canChoose && (
        <p className="text-xs text-neutral-600">
          Écoute les deux avant de choisir — les boutons s&apos;activent ensuite.
        </p>
      )}
      <p className="text-xs text-neutral-600">
        Les niveaux sont égalisés automatiquement, et les noms sont cachés
        jusqu&apos;à la fin : sans ça, c&apos;est l&apos;étiquette qu&apos;on juge,
        pas le son.
      </p>
    </section>
  );
}
