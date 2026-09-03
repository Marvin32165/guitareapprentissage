"use client";

import { useState, useSyncExternalStore } from "react";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { SOURCES, getSource, type SourceId } from "@/lib/audio/sources";
import { playFromSource, playSequence } from "@/lib/audio/sampler";
import {
  getServerSourceSnapshot,
  getSourceSnapshot,
  storeSource,
  subscribeSource,
} from "@/lib/audio/preference";
import { TUNINGS, STRING_NUMBERS, midiAtFret } from "@/lib/music/fretboard";

const FRETS = [0, 5, 12, 15];
const STRING_LABELS = ["Mi grave", "La", "Ré", "Sol", "Si", "Mi aigu"];

const NAMES = ["Do", "Do♯", "Ré", "Ré♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];
function midiLabel(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function AudioCompare() {
  const [source, setSource] = useState<SourceId>("martin");
  const [gains, setGains] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const retenue = useSyncExternalStore(
    subscribeSource,
    getSourceSnapshot,
    getServerSourceSnapshot,
  );

  const current = getSource(source);
  const gainDb = gains[source] ?? 0;

  async function play(midi: number, key: string) {
    setBusy(key);
    try {
      await playFromSource(source, midi, { gainDb });
      setLoaded((l) => ({ ...l, [source]: true }));
    } finally {
      setBusy(null);
    }
  }

  async function sequence(midis: number[], key: string) {
    setBusy(key);
    try {
      await playSequence(source, midis, { gainDb });
      setLoaded((l) => ({ ...l, [source]: true }));
    } finally {
      setBusy(null);
    }
  }

  const needsLoad = source !== "synth" && !loaded[source];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <AudioUnlockButton />
        {needsLoad && (
          <span className="text-sm text-neutral-500">
            Les échantillons se chargent au premier clic.
          </span>
        )}
      </div>

      {/* Choix de la source */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-400">Source</h2>
        <div className="grid gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSource(s.id)}
              aria-pressed={source === s.id}
              className={
                "min-h-12 rounded-xl border px-4 py-3 text-left transition-colors " +
                (source === s.id
                  ? "border-emerald-600 bg-emerald-600/10"
                  : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700")
              }
            >
              <span
                className={
                  "block font-medium " +
                  (source === s.id ? "text-emerald-300" : "text-neutral-200")
                }
              >
                {s.label}
              </span>
              <span className="mt-1 block text-sm text-neutral-500">{s.description}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-600">
          Étendue : {current.couverture} · Licence : {current.licence}
        </p>
      </section>

      {/* Égalisation du niveau — indispensable pour une comparaison honnête */}
      <section className="space-y-2">
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Niveau de cette source : {gainDb > 0 ? "+" : ""}
          {gainDb} dB
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={gainDb}
            onChange={(e) =>
              setGains((g) => ({ ...g, [source]: Number(e.target.value) }))
            }
            className="w-full accent-emerald-500"
          />
        </label>
        <p className="text-xs text-neutral-600">
          Égalise les niveaux à l&apos;oreille avant de juger : une source plus forte
          paraît toujours meilleure.
        </p>
      </section>

      {/* Grille cordes × cases */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-400">Corde par corde</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[340px] border-separate border-spacing-1">
            <thead>
              <tr className="text-xs text-neutral-500">
                <th className="text-left font-normal">Corde</th>
                {FRETS.map((f) => (
                  <th key={f} className="font-normal">
                    case {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STRING_NUMBERS.map((sn, idx) => {
                const stringIndex = 5 - idx; // afficher la 6e corde en haut
                return (
                  <tr key={sn}>
                    <td className="whitespace-nowrap pr-2 text-sm text-neutral-400">
                      {STRING_LABELS[stringIndex]}
                    </td>
                    {FRETS.map((f) => {
                      const midi = midiAtFret(stringIndex, f, TUNINGS.standard);
                      const key = `${stringIndex}-${f}`;
                      return (
                        <td key={f}>
                          <button
                            type="button"
                            onClick={() => play(midi, key)}
                            className={
                              "min-h-11 w-full rounded-lg border border-neutral-700 px-1 text-sm transition-colors " +
                              (busy === key
                                ? "bg-emerald-600/30 text-emerald-200"
                                : "text-neutral-200 hover:bg-neutral-800")
                            }
                          >
                            {midiLabel(midi)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tests ciblés */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-400">Tests ciblés</h2>
        <div className="grid gap-2">
          <TestButton
            busy={busy === "seam"}
            onClick={() => sequence([72, 73, 74, 75, 76, 77, 78, 79], "seam")}
            title="Test du raccord — Do5 → Sol5, chromatique"
            detail="Le point décisif pour l'hybride : la jonction tombe entre Ré5 et Mi♭5. Entends-tu un changement de timbre au passage ?"
          />
          <TestButton
            busy={busy === "span"}
            onClick={() => sequence([40, 47, 52, 59, 64, 71, 76, 79], "span")}
            title="Toute l'étendue — Mi2 → Sol5"
            detail="Juge l'homogénéité du grave à l'aigu, et l'écrasement éventuel dans le haut."
          />
          <TestButton
            busy={busy === "steps"}
            onClick={() => sequence([64, 65, 66, 67, 68], "steps")}
            title="Notes intermédiaires — Mi4 → Sol♯4, chromatique"
            detail="La source 6 n'a d'échantillon qu'en Mi4 et en Sol♯4 : les trois notes du milieu sont transposées. C'est le prix d'un échantillon tous les 3 demi-tons — s'entend-il ?"
          />
          <TestButton
            busy={busy === "same"}
            onClick={() => sequence([64, 64, 64, 64], "same")}
            title="Même hauteur, quatre cordes différentes"
            detail="Mi4 joué corde 1 case 0, corde 2 case 5, corde 3 case 9, corde 4 case 14. Avec des échantillons par note, les quatre sonnent à l'identique : c'est la limite à laquelle le traitement par groupe de cordes tentera de répondre."
          />
        </div>
      </section>

      {/* Adoption de la source pour toute l'application */}
      <section className="space-y-2">
        <button
          type="button"
          onClick={() => storeSource(source)}
          disabled={retenue === source}
          className={
            "min-h-11 w-full rounded-xl px-4 text-sm font-medium transition-colors " +
            (retenue === source
              ? "cursor-default border border-emerald-700/60 bg-emerald-900/20 text-emerald-300"
              : "bg-emerald-600 text-white hover:bg-emerald-500")
          }
        >
          {retenue === source
            ? `✓ ${current.label} est la source de l'application`
            : `Adopter ${current.label} dans toute l'application`}
        </button>
        <p className="text-xs text-neutral-600">
          Le choix est mémorisé sur cet appareil uniquement, et s&apos;applique au
          manche interactif comme aux leçons.
        </p>
      </section>

      <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-sm text-neutral-400">
        Ce que je ne peux pas trancher à ta place : le timbre. Les tests
        automatisés vérifient que le bon fichier est joué à la bonne hauteur, pas
        qu&apos;il sonne juste. C&apos;est le seul point du projet qui dépend
        entièrement de ton oreille.
      </p>
    </div>
  );
}

function TestButton({
  busy,
  onClick,
  title,
  detail,
}: {
  busy: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-xl border px-4 py-3 text-left transition-colors " +
        (busy
          ? "border-emerald-600 bg-emerald-600/15"
          : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700")
      }
    >
      <span className="block min-h-6 font-medium text-neutral-100">
        {busy ? "▶ lecture…" : title}
      </span>
      <span className="mt-1 block text-sm text-neutral-500">{detail}</span>
    </button>
  );
}
