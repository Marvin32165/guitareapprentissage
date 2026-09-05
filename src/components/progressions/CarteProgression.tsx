"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { Fretboard } from "@/components/fretboard/Fretboard";
import { resolveSpec } from "@/lib/lessons/spec";
import { ListeMorceaux } from "./ListeMorceaux";
import { grilleDepuisDegres } from "@/lib/audio/backing";
import { startBacking, type BackingHandle } from "@/lib/audio/backing-player";
import { accordsDesDegres, nomTonalite, toniqueDe } from "@/lib/music/degres";
import { formatNote } from "@/lib/music/pitch";
import type { MorceauCorpus, ProgressionCorpus } from "@/content/progressions/recherche";

// Une progression du corpus, montrée comme le projet l'exige : le chiffrage,
// les accords réels dans une tonalité qu'on choisit, et le SON. Un chiffrage
// romain qu'on ne peut pas entendre n'apprend rien.

const BPM = 76;

/** Tonalités proposées : celles qui se jouent, pas les douze par principe. */
const TONIQUES_MAJEUR = [0, 7, 2, 9, 4, 5, 10, 3];
const TONIQUES_MINEUR = [9, 4, 11, 2, 7, 0, 5, 8];

export function CarteProgression({
  progression,
  morceaux,
  tronque,
  toniqueSuggeree,
  surligne,
  entete,
}: {
  progression: ProgressionCorpus;
  morceaux: MorceauCorpus[];
  tronque: boolean;
  /** Tonique déduite d'une recherche, quand il y en a une. */
  toniqueSuggeree?: number;
  /** Intervalle de degrés à mettre en avant : [début, longueur]. */
  surligne?: [number, number];
  entete?: React.ReactNode;
}) {
  const defaut =
    toniqueSuggeree ?? (progression.mode === "major" ? TONIQUES_MAJEUR[0] : TONIQUES_MINEUR[0]);
  const [tonique, setTonique] = useState(defaut);
  const [enMarche, setEnMarche] = useState(false);
  const [manche, setManche] = useState(false);
  const [mesure, setMesure] = useState(-1);
  const handle = useRef<BackingHandle | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const accords = useMemo(
    () => accordsDesDegres(progression.mode, progression.degres, tonique),
    [progression.mode, progression.degres, tonique],
  );

  const arreter = useCallback(() => {
    handle.current?.stop();
    handle.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setEnMarche(false);
    setMesure(-1);
  }, []);

  useEffect(() => () => arreter(), [arreter]);

  async function demarrer() {
    if (handle.current) return;
    const grille = grilleDepuisDegres(progression.mode, progression.degres, tonique);
    if (!grille) return;
    handle.current = await startBacking({
      chords: grille,
      bpm: BPM,
      beatsPerBar: 4,
      withClick: false,
      onBar: ({ index, time, now }) => {
        const t = setTimeout(
          () => setMesure(index % grille.length),
          Math.max(0, (time - now) * 1000),
        );
        timers.current.push(t);
        if (timers.current.length > 32) timers.current.splice(0, timers.current.length - 16);
      },
    });
    setEnMarche(true);
  }

  const toniques = progression.mode === "major" ? TONIQUES_MAJEUR : TONIQUES_MINEUR;

  // La gamme qui tombe sur la grille : c'est là que les doigts vont. Repliée
  // par défaut — une recherche peut rendre vingt grilles, et vingt manches
  // dépliés sur un téléphone ne servent personne.
  const gamme = useMemo(
    () =>
      manche
        ? resolveSpec({
            root: formatNote(toniqueDe(tonique, progression.mode)),
            kind: progression.mode === "major" ? "pentaMajor" : "pentaMinor",
            fromFret: 0,
            toFret: 12,
            labelMode: "degree",
          })
        : null,
    [manche, tonique, progression.mode],
  );

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4">
      {entete}

      {/* Le chiffrage, d'abord : c'est lui, la donnée. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <ol className="flex flex-wrap items-baseline gap-2">
          {progression.degres.map((d, i) => {
            const dedans =
              surligne !== undefined && i >= surligne[0] && i < surligne[0] + surligne[1];
            return (
              <li
                key={i}
                className={
                  "rounded-lg px-2 py-1 text-lg font-semibold tabular-nums " +
                  (mesure === i
                    ? "bg-emerald-600 text-white"
                    : dedans
                      ? "bg-neutral-700/70 text-neutral-100"
                      : "text-neutral-300")
                }
              >
                {d}
              </li>
            );
          })}
        </ol>
        <span className="text-sm text-neutral-500">
          {progression.mode === "major" ? "en majeur" : "en mineur"}
        </span>
      </div>

      {/* Puis les accords réels, qui n'existent qu'une fois la tonalité choisie. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-neutral-400" htmlFor={`ton-${progression.id}`}>
            Dans la tonalité de
          </label>
          <select
            id={`ton-${progression.id}`}
            value={tonique}
            onChange={(e) => {
              // Changer de tonalité pendant la lecture ferait entendre la
              // grille précédente sous le nouveau libellé.
              arreter();
              setTonique(Number(e.target.value));
            }}
            className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-sm text-neutral-200"
          >
            {toniques.map((pc) => (
              <option key={pc} value={pc}>
                {nomTonalite(pc, progression.mode)}
              </option>
            ))}
          </select>
        </div>
        {accords && (
          <p className="flex flex-wrap gap-2 text-neutral-100">
            {accords.map((a, i) => (
              <span
                key={i}
                className={
                  "rounded-lg border px-2.5 py-1 text-base " +
                  (mesure === i
                    ? "border-emerald-500 bg-emerald-600/20"
                    : "border-neutral-800 bg-neutral-900/60")
                }
              >
                {a}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AudioUnlockButton />
        <button
          type="button"
          onClick={() => (enMarche ? arreter() : void demarrer())}
          className={
            "min-h-11 rounded-lg px-4 text-sm font-medium " +
            (enMarche
              ? "bg-neutral-200 text-neutral-900 active:bg-neutral-300"
              : "border border-neutral-700 text-neutral-200 hover:bg-neutral-900")
          }
        >
          {enMarche ? "Arrêter" : "Écouter la grille"}
        </button>
        <span className="text-xs text-neutral-600">{BPM} bpm, en boucle</span>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setManche((v) => !v)}
          aria-expanded={manche}
          className="min-h-11 rounded-lg border border-neutral-800 px-3 text-sm text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
        >
          {manche ? "Masquer le manche" : "Voir la gamme sur le manche"}
        </button>
        {gamme && (
          <figure className="space-y-1">
            <Fretboard
              positions={gamme.positions}
              orientation="horizontal"
              fromFret={gamme.fromFret}
              toFret={gamme.toFret}
              labelMode="degree"
            />
            <figcaption className="text-xs text-neutral-500">
              Pentatonique {progression.mode === "major" ? "majeure" : "mineure"} de{" "}
              {nomTonalite(tonique, progression.mode)} — elle tombe sur toute la grille.
            </figcaption>
          </figure>
        )}
      </div>

      <ListeMorceaux morceaux={morceaux} total={progression.total} tronque={tronque} />
    </section>
  );
}
