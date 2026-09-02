"use client";

import { useMemo, useState } from "react";
import { Fretboard, roleStyle, type Orientation, type LabelMode } from "./Fretboard";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { parseNote, formatNote, type Note } from "@/lib/music/pitch";
import { transpose } from "@/lib/music/intervals";
import {
  majorScale,
  naturalMinorScale,
  majorPentatonic,
  minorPentatonic,
} from "@/lib/music/scales";
import { pitchClass } from "@/lib/music/pitch";
import {
  type FretPosition,
  type NoteRole,
  degreeName,
  roleOfDegree,
  fretboardPositions,
  pentatonicBoxes,
} from "@/lib/music/fretboard";

const ROOTS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];

type Content =
  | "major"
  | "minor"
  | "pentaMajor"
  | "pentaMinor"
  | "chordMaj"
  | "chordMin"
  | "chordMaj7"
  | "chord7"
  | "chordMin7"
  | "boxMinor"
  | "boxMajor";

const CONTENT_LABELS: Record<Content, string> = {
  major: "Gamme majeure",
  minor: "Gamme mineure naturelle",
  pentaMajor: "Pentatonique majeure",
  pentaMinor: "Pentatonique mineure",
  chordMaj: "Accord — triade majeure",
  chordMin: "Accord — triade mineure",
  chordMaj7: "Accord — maj7",
  chord7: "Accord — 7 (dominante)",
  chordMin7: "Accord — m7",
  boxMinor: "Boîte pentatonique mineure",
  boxMajor: "Boîte pentatonique majeure",
};

function chordNotes(root: Note, kind: Content): Note[] {
  const M3 = transpose(root, 2, 4);
  const m3 = transpose(root, 2, 3);
  const P5 = transpose(root, 4, 7);
  const M7 = transpose(root, 6, 11);
  const m7 = transpose(root, 6, 10);
  switch (kind) {
    case "chordMaj":
      return [root, M3, P5];
    case "chordMin":
      return [root, m3, P5];
    case "chordMaj7":
      return [root, M3, P5, M7];
    case "chord7":
      return [root, M3, P5, m7];
    case "chordMin7":
      return [root, m3, P5, m7];
    default:
      return [root];
  }
}

export function FretboardDemo() {
  const [rootLabel, setRootLabel] = useState("A");
  const [content, setContent] = useState<Content>("pentaMinor");
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [labelMode, setLabelMode] = useState<LabelMode>("note");
  const [boxIndex, setBoxIndex] = useState(1);
  const [selected, setSelected] = useState<FretPosition | null>(null);

  const root = useMemo(() => parseNote(rootLabel), [rootLabel]);
  const rootPc = pitchClass(root);
  const isBox = content === "boxMinor" || content === "boxMajor";

  const { positions, fromFret, toFret } = useMemo(() => {
    if (isBox) {
      const quality = content === "boxMinor" ? "minor" : "major";
      const boxes = pentatonicBoxes(root, quality);
      const box = boxes[Math.min(boxIndex, boxes.length) - 1];
      const allFrets = box.positions.map((p) => p.fret);
      const lo = Math.max(0, Math.min(...allFrets) - 1);
      const hi = Math.max(...allFrets) + 1;
      return { positions: box.positions, fromFret: lo, toFret: hi };
    }
    let notes: Note[];
    if (content === "major") notes = majorScale(root);
    else if (content === "minor") notes = naturalMinorScale(root);
    else if (content === "pentaMajor") notes = majorPentatonic(root);
    else if (content === "pentaMinor") notes = minorPentatonic(root);
    else notes = chordNotes(root, content);
    return { positions: fretboardPositions(notes, rootPc, { fromFret: 0, toFret: 15 }), fromFret: 0, toFret: 15 };
  }, [root, rootPc, content, isBox, boxIndex]);

  const legendRoles: NoteRole[] = ["root", "third", "fifth", "other"];

  return (
    <div className="space-y-5">
      {/* Contrôles */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tonalité">
          <select
            value={rootLabel}
            onChange={(e) => setRootLabel(e.target.value)}
            className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
          >
            {ROOTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Contenu">
          <select
            value={content}
            onChange={(e) => setContent(e.target.value as Content)}
            className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
          >
            {(Object.keys(CONTENT_LABELS) as Content[]).map((c) => (
              <option key={c} value={c}>
                {CONTENT_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>

        {isBox && (
          <Field label="Boîte">
            <select
              value={boxIndex}
              onChange={(e) => setBoxIndex(Number(e.target.value))}
              className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Toggle
          options={[
            { value: "vertical", label: "Vertical" },
            { value: "horizontal", label: "Horizontal" },
          ]}
          value={orientation}
          onChange={(v) => setOrientation(v as Orientation)}
        />
        <Toggle
          options={[
            { value: "note", label: "Notes" },
            { value: "degree", label: "Degrés" },
          ]}
          value={labelMode}
          onChange={(v) => setLabelMode(v as LabelMode)}
        />
        <AudioUnlockButton />
      </div>

      {/* Lecture de la note sélectionnée */}
      <div
        aria-live="polite"
        className="min-h-14 rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-sm"
      >
        {selected ? (
          <span className="text-neutral-200">
            <span className="text-lg font-semibold">{formatNote(selected.note)}</span>
            {"  "}· degré{" "}
            <span className="font-medium text-emerald-400">
              {degreeName(selected.degreeSemitones)}
            </span>{" "}
            · {roleStyle(roleOfDegree(selected.degreeSemitones)).label.toLowerCase()} · corde{" "}
            {selected.stringNumber}, frette {selected.fret}
          </span>
        ) : (
          <span className="text-neutral-500">
            Touche une note du manche : elle sonne et son nom + degré s&apos;affichent ici.
          </span>
        )}
      </div>

      {/* Manche */}
      <div className="overflow-x-auto rounded-xl">
        <div className={orientation === "vertical" ? "flex justify-center" : "inline-block"}>
          <Fretboard
            positions={positions}
            orientation={orientation}
            fromFret={fromFret}
            toFret={toFret}
            labelMode={labelMode}
            onSelect={setSelected}
          />
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
        {legendRoles.map((role) => {
          const s = roleStyle(role);
          return (
            <span key={role} className="inline-flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full"
                style={{ backgroundColor: s.fill }}
              />
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-neutral-400">
      {label}
      {children}
    </label>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-700 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={
            "min-h-10 rounded-md px-3 text-sm font-medium transition-colors " +
            (value === o.value
              ? "bg-neutral-800 text-emerald-400"
              : "text-neutral-400 hover:text-neutral-200")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
