"use client";

import { useCallback, useRef, useState } from "react";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { pluck, preloadForMidis, setStringTreatment } from "@/lib/audio/guitar";

// Le traitement filées/nues est une approximation par filtrage : aucune source
// libre n'échantillonne corde par corde, donc Mi4 corde 1 et Mi4 corde 4
// déclenchent le même fichier. Le filtrage sert uniquement à ce que ces deux
// occurrences ne sonnent pas rigoureusement à l'identique.
//
// C'est exactement ce cas qu'on fait entendre ici, à l'aveugle : si l'écart ne
// s'entend pas, le traitement ne sert à rien et doit être retiré.

/** Mi4 (MIDI 64) au même endroit du clavier, à deux endroits du manche. */
const PAIRE = [
  { stringIndex: 5, fret: 0, midi: 64, label: "corde 1, case 0" },
  { stringIndex: 2, fret: 14, midi: 64, label: "corde 4, case 14" },
];

type Side = "A" | "B";

export function TreatmentTest() {
  // Le traitement est actif d'un côté, coupé de l'autre — tiré au sort une fois.
  const [traiteEnA] = useState(() => Math.random() < 0.5);
  const [playing, setPlaying] = useState<Side | null>(null);
  const [heard, setHeard] = useState<Record<Side, boolean>>({ A: false, B: false });
  const [verdict, setVerdict] = useState<"different" | "identique" | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(
    async (side: Side) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setPlaying(side);
      setStringTreatment(side === "A" ? traiteEnA : !traiteEnA);
      await preloadForMidis("fluid-steel", [64]);
      // Les deux positions à la suite : c'est leur écart qu'on juge, pas leur
      // timbre absolu.
      for (const [i, p] of PAIRE.entries()) {
        timers.current.push(
          setTimeout(() => {
            void pluck({ stringIndex: p.stringIndex, midi: p.midi, durationSec: 2 });
          }, i * 1400),
        );
      }
      timers.current.push(
        setTimeout(() => {
          setPlaying(null);
          setHeard((h) => ({ ...h, [side]: true }));
        }, 3400),
      );
    },
    [traiteEnA],
  );

  const pretA = heard.A && heard.B;

  if (verdict) {
    const juste = verdict === "different";
    return (
      <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-lg font-medium text-neutral-100">
          {juste ? "Tu entends la différence" : "Aucune différence audible"}
        </h2>
        <p className="text-sm text-neutral-300">
          {juste
            ? "Le traitement filées/nues fait donc quelque chose d'audible sur le cas où il est censé servir. Il reste une approximation, mais il se justifie."
            : "Le traitement ne s'entend pas sur le cas même où il est censé servir. Il n'apporte rien et sera retiré : une approximation qui ne s'entend pas est de la dette."}
        </p>
        <p className="text-xs text-neutral-600">
          Le traitement était sur le son {traiteEnA ? "A" : "B"}.
        </p>
        <button
          type="button"
          onClick={() => {
            setVerdict(null);
            setHeard({ A: false, B: false });
          }}
          className="min-h-11 w-full rounded-xl border border-neutral-700 px-4 text-sm text-neutral-300"
        >
          Réécouter
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-400">
          Traitement filées / nues
        </h2>
        <AudioUnlockButton />
      </div>

      <p className="text-sm text-neutral-300">
        Chaque son joue <strong className="text-neutral-100">le même Mi4</strong> à
        deux endroits du manche : corde 1 case 0, puis corde 4 case 14. Sur une
        vraie guitare, ces deux notes ne sonnent pas pareil. Ici elles
        déclenchent le même fichier — le traitement sert à les différencier un
        peu.
      </p>
      <p className="text-sm text-neutral-300">
        La question n&apos;est pas « lequel est le plus joli », mais :{" "}
        <strong className="text-neutral-100">
          dans lequel les deux notes sonnent-elles le moins pareil ?
        </strong>{" "}
        Si tu ne distingues pas A de B, dis-le : c&apos;est une réponse utile.
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
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => setVerdict("different")}
          disabled={!pretA}
          className={
            "min-h-11 w-full rounded-xl px-4 text-sm font-medium transition-colors " +
            (pretA
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "cursor-not-allowed border border-neutral-800 text-neutral-600")
          }
        >
          J&apos;entends une différence entre A et B
        </button>
        <button
          type="button"
          onClick={() => setVerdict("identique")}
          disabled={!pretA}
          className={
            "min-h-11 w-full rounded-xl border px-4 text-sm transition-colors " +
            (pretA
              ? "border-neutral-700 text-neutral-300 hover:bg-neutral-900"
              : "cursor-not-allowed border-neutral-800 text-neutral-600")
          }
        >
          A et B me paraissent identiques
        </button>
      </div>

      {!pretA && (
        <p className="text-xs text-neutral-600">
          Écoute les deux avant de répondre — les boutons s&apos;activent ensuite.
        </p>
      )}
    </section>
  );
}
