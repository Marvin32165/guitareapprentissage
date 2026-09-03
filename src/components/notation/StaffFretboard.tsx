"use client";

import { useMemo, useState } from "react";
import { Staff } from "./Staff";
import { Fretboard } from "@/components/fretboard/Fretboard";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { pluck } from "@/lib/audio/guitar";
import { staffNote } from "@/lib/notation/staff";
import {
  TUNINGS,
  midiAtFret,
  spellPitchClass,
  fretboardPositions,
  type FretPosition,
  type Tuning,
} from "@/lib/music/fretboard";
import { formatNoteIn, type NoteSystem } from "@/lib/music/pitch";

// Composant unique : portée + manche + son.
//
// Contrainte du projet : LA PORTÉE N'APPARAÎT JAMAIS SEULE. Une note lue n'a
// de sens que si l'on sait où la poser sur l'instrument et ce qu'elle donne à
// l'oreille. Toucher le manche allume la note sur la portée, toucher la portée
// rejoue la note — c'est le même objet vu de deux côtés.

export interface StaffFretboardProps {
  tuning?: Tuning;
  fromFret?: number;
  toFret?: number;
  noteSystem?: NoteSystem;
  /** Cache les noms sur le manche : indispensable en situation d'exercice. */
  labelMode?: "note" | "none";
}

export function StaffFretboard({
  tuning = TUNINGS.standard,
  fromFret = 0,
  toFret = 5,
  noteSystem = "anglo",
  labelMode = "note",
}: StaffFretboardProps) {
  const [selected, setSelected] = useState<FretPosition | null>(null);

  // Les douze notes : on ne filtre pas sur une gamme, il s'agit de lire le
  // manche tel qu'il est.
  const positions = useMemo(() => {
    const chromatique = Array.from({ length: 12 }, (_, pc) => spellPitchClass(pc, false));
    return fretboardPositions(chromatique, 0, { fromFret, toFret, tuning });
  }, [fromFret, toFret, tuning]);

  const notes = useMemo(() => {
    if (!selected) return [];
    const sounding = midiAtFret(selected.stringIndex, selected.fret, tuning);
    return [staffNote(sounding, selected.note)];
  }, [selected, tuning]);

  function choisir(pos: FretPosition) {
    setSelected(pos);
    void pluck({
      stringIndex: pos.stringIndex,
      midi: midiAtFret(pos.stringIndex, pos.fret, tuning),
    });
  }

  function rejouer() {
    if (selected) choisir(selected);
  }

  return (
    <div className="space-y-4">
      <Staff
        notes={notes}
        activeIndex={notes.length ? 0 : null}
        onSelectNote={rejouer}
        label={
          selected
            ? `Portée : ${formatNoteIn(selected.note, noteSystem)}`
            : "Portée, aucune note choisie"
        }
      />

      <p className="text-sm text-neutral-400" aria-live="polite">
        {selected ? (
          <>
            <span className="font-medium text-emerald-300">
              {formatNoteIn(selected.note, noteSystem)}
            </span>{" "}
            — corde {selected.stringNumber}, case {selected.fret}. Touche la
            portée pour la réentendre.
          </>
        ) : (
          "Touche une note sur le manche : elle s'allume sur la portée et sonne."
        )}
      </p>

      <div className="flex justify-end">
        <AudioUnlockButton />
      </div>

      <Fretboard
        positions={positions}
        orientation="horizontal"
        fromFret={fromFret}
        toFret={toFret}
        labelMode={labelMode}
        noteSystem={noteSystem}
        tuning={tuning}
        highlight={
          selected ? { stringIndex: selected.stringIndex, fret: selected.fret } : null
        }
        dimOthers
        onSelect={choisir}
      />
    </div>
  );
}
