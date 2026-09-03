"use client";

import { useCallback, useMemo, useState } from "react";
import { Staff } from "./Staff";
import { Fretboard } from "@/components/fretboard/Fretboard";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { pluck } from "@/lib/audio/guitar";
import { staffNote } from "@/lib/notation/staff";
import {
  TUNINGS,
  midiAtFret,
  spellPitchClass,
  type FretPosition,
  type Tuning,
} from "@/lib/music/fretboard";
import { readingWindow, positionsForPitch, isCorrectAnswer } from "@/lib/notation/reading";
import { formatNoteIn, type NoteSystem } from "@/lib/music/pitch";

// Parcours de lecture.
//
// La question est TOUJOURS « trouve cette note sur ta guitare et joue-la »,
// jamais « nomme cette note ». Lire une portée sert à jouer, pas à réciter :
// nommer la note serait un raccourci qui n'apprend rien à un guitariste qui a
// déjà l'instrument en main.
//
// Le nom n'est donc affiché NULLE PART avant la réponse : ni sur la portée, ni
// sur le manche (`labelMode="none"`).
//
// Une même hauteur existe à plusieurs endroits du manche. Toutes ces positions
// sont acceptées : c'est précisément ce qu'il faut apprendre.

const TOTAL = 8;

export interface ReadingExerciseProps {
  tuning?: Tuning;
  fromFret?: number;
  toFret?: number;
  noteSystem?: NoteSystem;
  onAnswer?: (correct: boolean) => void;
}

type Etat =
  | { phase: "question" }
  | { phase: "juste"; joue: FretPosition }
  | { phase: "faux"; joue: FretPosition };

export function ReadingExercise({
  tuning = TUNINGS.standard,
  fromFret = 0,
  toFret = 5,
  noteSystem = "anglo",
  onAnswer,
}: ReadingExerciseProps) {
  const fenetre = useMemo(
    () => readingWindow({ fromFret, toFret, tuning }),
    [fromFret, toFret, tuning],
  );
  const positions = fenetre.positions;
  const hauteurs = fenetre.pitches;

  const tirer = useCallback(
    (eviter?: number) => {
      const choix = hauteurs.filter((m) => m !== eviter);
      return choix[Math.floor(Math.random() * choix.length)];
    },
    [hauteurs],
  );

  const [cible, setCible] = useState<number>(() => tirer());
  const [etat, setEtat] = useState<Etat>({ phase: "question" });
  const [faits, setFaits] = useState(0);
  const [justes, setJustes] = useState(0);

  const notesPortee = useMemo(() => {
    const spelled = spellPitchClass(((cible % 12) + 12) % 12, false);
    const cibleNote = staffNote(cible, spelled);
    if (etat.phase === "faux") {
      const joue = midiAtFret(etat.joue.stringIndex, etat.joue.fret, tuning);
      // La note fausse est montrée à côté de la bonne : c'est l'écart qui
      // s'apprend, pas le verdict.
      return joue === cible ? [cibleNote] : [cibleNote, staffNote(joue, etat.joue.note)];
    }
    return [cibleNote];
  }, [cible, etat, tuning]);

  function repondre(pos: FretPosition) {
    if (etat.phase !== "question") return;
    const joue = midiAtFret(pos.stringIndex, pos.fret, tuning);
    void pluck({ stringIndex: pos.stringIndex, midi: joue });
    const correct = isCorrectAnswer(pos, cible, tuning);
    setEtat({ phase: correct ? "juste" : "faux", joue: pos });
    setFaits((n) => n + 1);
    if (correct) setJustes((n) => n + 1);
    onAnswer?.(correct);
  }

  function suivante() {
    setCible((c) => tirer(c));
    setEtat({ phase: "question" });
  }

  function ecouterCible() {
    // Rejouer la cible : on cherche la première position qui la donne.
    const [pos] = positionsForPitch(fenetre, cible, tuning);
    if (pos) void pluck({ stringIndex: pos.stringIndex, midi: cible });
  }

  const fini = faits >= TOTAL && etat.phase !== "question";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          {Math.min(faits + (etat.phase === "question" ? 1 : 0), TOTAL)} / {TOTAL} ·{" "}
          {justes} juste{justes > 1 ? "s" : ""}
        </p>
        <AudioUnlockButton />
      </div>

      <p className="text-lg font-medium text-neutral-100">
        Trouve cette note sur ta guitare et joue-la.
      </p>

      <Staff
        notes={notesPortee}
        activeIndex={0}
        errorIndex={notesPortee.length > 1 ? 1 : null}
        label="Note à trouver sur le manche"
      />

      {etat.phase === "question" && (
        <p className="text-sm text-neutral-500">
          Plusieurs cases donnent cette note — toutes comptent juste.
        </p>
      )}

      {etat.phase === "juste" && (
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4">
          <p className="font-medium text-emerald-300">
            Juste — {formatNoteIn(etat.joue.note, noteSystem)}, corde{" "}
            {etat.joue.stringNumber}, case {etat.joue.fret}.
          </p>
        </div>
      )}

      {etat.phase === "faux" && (
        <div className="space-y-2 rounded-xl border border-amber-800/60 bg-amber-950/20 p-4">
          <p className="font-medium text-amber-300">
            Pas celle-là : tu as joué {formatNoteIn(etat.joue.note, noteSystem)}.
          </p>
          <p className="text-sm text-neutral-300">
            La note recherchée est en vert sur la portée, la tienne en orange.
            Écoute les deux : c&apos;est l&apos;écart qui se retient.
          </p>
          <button
            type="button"
            onClick={ecouterCible}
            className="min-h-11 rounded-lg bg-neutral-800 px-4 text-sm text-neutral-100 hover:bg-neutral-700"
          >
            ♪ Réécouter la note recherchée
          </button>
        </div>
      )}

      <Fretboard
        positions={positions}
        orientation="horizontal"
        fromFret={fromFret}
        toFret={toFret}
        labelMode={etat.phase === "question" ? "none" : "note"}
        noteSystem={noteSystem}
        tuning={tuning}
        highlight={
          etat.phase === "question"
            ? null
            : { stringIndex: etat.joue.stringIndex, fret: etat.joue.fret }
        }
        onSelect={repondre}
      />

      {etat.phase !== "question" && !fini && (
        <button
          type="button"
          onClick={suivante}
          className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Note suivante
        </button>
      )}

      {fini && (
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <p className="text-neutral-200">
            {justes} sur {faits}. Les positions se retiennent en jouant, pas en
            révisant : mieux vaut y revenir demain que d&apos;enchaîner.
          </p>
          <button
            type="button"
            onClick={() => {
              setFaits(0);
              setJustes(0);
              suivante();
            }}
            className="min-h-11 w-full rounded-xl border border-neutral-700 px-4 text-sm text-neutral-300"
          >
            Refaire une série
          </button>
        </div>
      )}
    </div>
  );
}
