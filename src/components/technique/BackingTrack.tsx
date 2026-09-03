"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { Fretboard } from "@/components/fretboard/Fretboard";
import { resolveSpec } from "@/lib/lessons/spec";
import { clampBpm, BPM_MIN, BPM_MAX } from "@/lib/audio/metronome";
import { startBacking, type BackingHandle } from "@/lib/audio/backing-player";
import {
  PROGRESSIONS,
  buildProgression,
  getProgression,
  keyLabel,
  KEYS,
} from "@/lib/audio/backing";

// Accompagnement engendré, pas téléchargé : la tonalité et le tempo se règlent,
// aucune licence n'est en jeu, et le son est celui du reste de l'application.
//
// Ce que ce n'est pas, et il vaut mieux le dire que le laisser découvrir : ni
// batterie, ni basse jouée, ni production. Une grille qui tourne, sur laquelle
// travailler ses gammes.

export function BackingTrack() {
  const [progressionId, setProgressionId] = useState(PROGRESSIONS[0].id);
  const [key, setKey] = useState("G");
  const [bpm, setBpm] = useState(80);
  const [withClick, setWithClick] = useState(true);
  const [enMarche, setEnMarche] = useState(false);
  const [mesure, setMesure] = useState(0);
  const handle = useRef<BackingHandle | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const progression = getProgression(progressionId);
  const grille = useMemo(
    () => buildProgression(progression, key),
    [progression, key],
  );

  const arreter = useCallback(() => {
    handle.current?.stop();
    handle.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setEnMarche(false);
    setMesure(0);
  }, []);

  useEffect(() => () => arreter(), [arreter]);

  async function demarrer() {
    if (handle.current) return;
    handle.current = await startBacking({
      chords: grille,
      bpm,
      beatsPerBar: 4,
      withClick,
      onBar: ({ index, time, now }) => {
        const delaiMs = Math.max(0, (time - now) * 1000);
        const t = setTimeout(() => setMesure(index % grille.length), delaiMs);
        timers.current.push(t);
        if (timers.current.length > 32) {
          timers.current.splice(0, timers.current.length - 16);
        }
      },
    });
    setEnMarche(true);
  }

  // La gamme qui tombe sur la grille : c'est là qu'on va jouer.
  const gamme = useMemo(
    () =>
      resolveSpec({
        root: key,
        kind: progression.mode === "major" ? "pentaMajor" : "pentaMinor",
        fromFret: 0,
        toFret: 12,
        labelMode: "degree",
      }),
    [key, progression.mode],
  );

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-400">Accompagnement</h2>
        <AudioUnlockButton />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm text-neutral-400">
          Grille
          <select
            value={progressionId}
            onChange={(e) => {
              arreter();
              setProgressionId(e.target.value);
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
          >
            {PROGRESSIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-neutral-400">
          Tonalité
          <select
            value={key}
            onChange={(e) => {
              arreter();
              setKey(e.target.value);
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
          >
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {keyLabel(k, progression.mode)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-neutral-500">{progression.hint}</p>

      {/* La grille, avec la mesure en cours mise en évidence. */}
      <div className="grid grid-cols-4 gap-2">
        {grille.map((accord, i) => (
          <div
            key={i}
            className={
              "rounded-xl border px-2 py-3 text-center transition-colors " +
              (enMarche && mesure === i
                ? "border-emerald-600 bg-emerald-950/40"
                : "border-neutral-800 bg-neutral-900/60")
            }
          >
            <span
              className={
                "block text-base font-medium " +
                (enMarche && mesure === i ? "text-emerald-300" : "text-neutral-200")
              }
            >
              {accord.symbol}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">{accord.roman}</span>
          </div>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3 text-sm text-neutral-400">
        <span>
          Tempo <span className="tabular-nums text-neutral-100">{bpm}</span> bpm
        </span>
        <input
          type="range"
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpm}
          onChange={(e) => {
            const v = clampBpm(Number(e.target.value));
            setBpm(v);
            // Le tempo se règle à l'arrêt : rebâtir la boucle en cours de route
            // ferait un trou plus gênant qu'utile.
            if (enMarche) arreter();
          }}
          aria-label="Tempo de l'accompagnement"
          className="w-1/2 accent-emerald-500"
        />
      </label>

      <label className="flex items-center gap-3 text-sm text-neutral-400">
        <input
          type="checkbox"
          checked={withClick}
          onChange={(e) => {
            setWithClick(e.target.checked);
            if (enMarche) arreter();
          }}
          className="h-5 w-5 accent-emerald-500"
        />
        Ajouter le clic du métronome
      </label>

      <button
        type="button"
        onClick={() => (enMarche ? arreter() : void demarrer())}
        className={
          "min-h-11 w-full rounded-xl px-4 text-sm font-medium transition-colors " +
          (enMarche
            ? "border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
            : "bg-emerald-600 text-white hover:bg-emerald-500")
        }
      >
        {enMarche ? "■ Arrêter" : "▶ Lancer la boucle"}
      </button>

      <figure className="space-y-2">
        <Fretboard
          positions={gamme.positions}
          orientation="horizontal"
          fromFret={gamme.fromFret}
          toFret={gamme.toFret}
          labelMode="degree"
        />
        <figcaption className="text-sm text-neutral-500">
          La pentatonique {progression.mode === "major" ? "majeure" : "mineure"} de{" "}
          {keyLabel(key, progression.mode)} tombe sur toute la grille. C&apos;est
          là que tu peux jouer sans fausse note.
        </figcaption>
      </figure>

      <p className="text-xs text-neutral-600">
        Cet accompagnement est engendré à partir de la guitare échantillonnée : ni
        batterie, ni basse jouée, ni production. Une grille qui tourne, pour
        travailler par-dessus.
      </p>
    </section>
  );
}
