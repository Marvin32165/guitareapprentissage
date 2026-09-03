"use client";

import { useMemo } from "react";
import {
  type FretPosition,
  type NoteRole,
  type Tuning,
  STANDARD,
  roleOfDegree,
  degreeName,
  midiAtFret,
  STRING_NUMBERS,
} from "@/lib/music/fretboard";
import { type NoteSystem, formatNote, formatNoteIn } from "@/lib/music/pitch";
import { pluck } from "@/lib/audio/guitar";

export type Orientation = "horizontal" | "vertical";
/**
 * « none » sert aux exercices de lecture : si chaque case porte son nom, la
 * question « trouve cette note » se résout en lisant l'étiquette.
 */
export type LabelMode = "note" | "degree" | "none";
export type Handed = "right" | "left";

export interface FretboardProps {
  positions: FretPosition[];
  orientation?: Orientation;
  fromFret?: number;
  toFret?: number;
  labelMode?: LabelMode;
  noteSystem?: NoteSystem;
  tuning?: Tuning;
  capo?: number;
  handed?: Handed;
  onSelect?: (pos: FretPosition) => void;
  /**
   * Position mise en évidence, indépendamment du code couleur par fonction.
   * C'est ce qui permet à la même note de s'allumer en même temps sur la
   * portée et sur le manche.
   */
  highlight?: { stringIndex: number; fret: number } | null;
  /** Estompe les positions non mises en évidence. */
  dimOthers?: boolean;
}

// Géométrie (unités SVG).
const CELL = 54; // le long du manche (entre deux frettes)
const GAP = 32; // entre deux cordes
const ALONG_PAD = 38;
const CROSS_PAD = 26;
const CIRCLE_R = 13;
const HIT_R = 22; // cible tactile ≥ 44 px

const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_INLAYS = new Set([12, 24]);

const ROLE_STYLE: Record<NoteRole, { fill: string; text: string; label: string }> = {
  root: { fill: "#10b981", text: "#04231d", label: "Fondamentale" },
  third: { fill: "#f59e0b", text: "#2a1a00", label: "Tierce" },
  fifth: { fill: "#38bdf8", text: "#052534", label: "Quinte" },
  other: { fill: "#d4d4d8", text: "#18181b", label: "Autres" },
};

export function roleStyle(role: NoteRole) {
  return ROLE_STYLE[role];
}

export function Fretboard({
  positions,
  orientation = "vertical",
  fromFret = 0,
  toFret = 15,
  labelMode = "note",
  highlight = null,
  dimOthers = false,
  noteSystem = "anglo",
  tuning = STANDARD,
  capo = 0,
  handed = "right",
  onSelect,
}: FretboardProps) {
  const vertical = orientation === "vertical";
  const nFrets = toFret - fromFret + 1;

  const alongLen = ALONG_PAD * 2 + nFrets * CELL;
  const crossLen = CROSS_PAD * 2 + 5 * GAP;
  const width = vertical ? crossLen : alongLen;
  const height = vertical ? alongLen : crossLen;

  const alongNote = (f: number) => ALONG_PAD + (f - fromFret + 0.5) * CELL;
  const alongWire = (k: number) => ALONG_PAD + k * CELL; // k = 0..nFrets
  // Gaucher : ordre des cordes inversé sur l'axe transversal.
  const flip = handed === "left";
  const crossString = (stringIndex: number) => {
    // Droitier : vertical → 6e corde à gauche ; horizontal → 6e corde en bas.
    const idx = vertical
      ? flip
        ? 5 - stringIndex
        : stringIndex
      : flip
        ? stringIndex
        : 5 - stringIndex;
    return CROSS_PAD + idx * GAP;
  };

  const XY = (along: number, cross: number) =>
    vertical ? { x: cross, y: along } : { x: along, y: cross };

  const crossMin = CROSS_PAD;
  const crossMax = CROSS_PAD + 5 * GAP;
  const alongMin = ALONG_PAD;
  const alongMax = ALONG_PAD + nFrets * CELL;

  const frets = useMemo(
    () => Array.from({ length: nFrets }, (_, i) => fromFret + i),
    [nFrets, fromFret],
  );

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Diagramme de manche"
      className="select-none"
    >
      {/* Bois du manche */}
      <rect
        x={XY(alongMin, crossMin).x - 6}
        y={XY(alongMin, crossMin).y - 6}
        width={(vertical ? crossMax - crossMin : alongMax - alongMin) + 12}
        height={(vertical ? alongMax - alongMin : crossMax - crossMin) + 12}
        rx="8"
        fill="#1c1917"
      />

      {/* Repères (inlays) */}
      {frets.map((f) => {
        if (f < 1) return null;
        const mid = (crossMin + crossMax) / 2;
        const a = alongNote(f);
        if (DOUBLE_INLAYS.has(f)) {
          const o = GAP * 1.1;
          const p1 = XY(a, mid - o);
          const p2 = XY(a, mid + o);
          return (
            <g key={`inlay-${f}`} fill="#3f3a36">
              <circle cx={p1.x} cy={p1.y} r="4.5" />
              <circle cx={p2.x} cy={p2.y} r="4.5" />
            </g>
          );
        }
        if (SINGLE_INLAYS.has(f)) {
          const p = XY(a, mid);
          return <circle key={`inlay-${f}`} cx={p.x} cy={p.y} r="4.5" fill="#3f3a36" />;
        }
        return null;
      })}

      {/* Frettes (barrettes) */}
      {Array.from({ length: nFrets + 1 }, (_, k) => {
        const aw = alongWire(k);
        const start = XY(aw, crossMin);
        const end = XY(aw, crossMax);
        const isNut = fromFret === 0 && k === 0;
        return (
          <line
            key={`wire-${k}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={isNut ? "#e7e5e4" : "#57534e"}
            strokeWidth={isNut ? 5 : 2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Cordes */}
      {STRING_NUMBERS.map((sn, stringIndex) => {
        const c = crossString(stringIndex);
        const start = XY(alongMin, c);
        const end = XY(alongMax, c);
        return (
          <line
            key={`string-${sn}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#8a8580"
            strokeWidth={1 + stringIndex * 0.4}
          />
        );
      })}

      {/* Capodastre */}
      {capo > 0 && capo >= fromFret && capo <= toFret
        ? (() => {
            const a = alongNote(capo);
            const s = XY(a, crossMin);
            const e = XY(a, crossMax);
            return (
              <line
                x1={s.x}
                y1={s.y}
                x2={e.x}
                y2={e.y}
                stroke="#f59e0b"
                strokeWidth={8}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })()
        : null}

      {/* Numéros de frette */}
      {frets.map((f) => {
        const a = alongNote(f);
        const p = vertical
          ? { x: crossMin - 16, y: a }
          : { x: a, y: crossMax + 18 };
        return (
          <text
            key={`num-${f}`}
            x={p.x}
            y={p.y}
            fontSize="11"
            fill="#78716c"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {f}
          </text>
        );
      })}

      {/* Notes cliquables */}
      {positions.map((pos) => {
        const role = roleOfDegree(pos.degreeSemitones);
        const style = ROLE_STYLE[role];
        const { x, y } = XY(alongNote(pos.fret), crossString(pos.stringIndex));
        const label =
          labelMode === "none"
            ? ""
            : labelMode === "degree"
              ? degreeName(pos.degreeSemitones)
              : formatNoteIn(pos.note, noteSystem);
        const estAllumee =
          highlight !== null &&
          highlight.stringIndex === pos.stringIndex &&
          highlight.fret === pos.fret;
        const estompee = dimOthers && highlight !== null && !estAllumee;
        return (
          <g
            key={`${pos.stringIndex}-${pos.fret}`}
            role="button"
            tabIndex={0}
            aria-label={`${formatNote(pos.note)}, degré ${degreeName(pos.degreeSemitones)}, corde ${pos.stringNumber} frette ${pos.fret}`}
            style={{ cursor: "pointer" }}
            onClick={() => {
              void pluck({
                stringIndex: pos.stringIndex,
                midi: midiAtFret(pos.stringIndex, pos.fret, tuning, capo),
              });
              onSelect?.(pos);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void pluck({
                  stringIndex: pos.stringIndex,
                  midi: midiAtFret(pos.stringIndex, pos.fret, tuning, capo),
                });
                onSelect?.(pos);
              }
            }}
          >
            <circle cx={x} cy={y} r={HIT_R} fill="transparent" />
            {estAllumee && (
              <circle
                cx={x}
                cy={y}
                r={CIRCLE_R + 6}
                fill="none"
                stroke="#34d399"
                strokeWidth={3}
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={CIRCLE_R}
              fill={style.fill}
              opacity={estompee ? 0.25 : 1}
              stroke={pos.isRoot && !estompee ? "#ffffff" : "none"}
              strokeWidth={pos.isRoot && !estompee ? 2 : 0}
            />
            {label && (
              <text
                x={x}
                y={y}
                fontSize="11"
                fontWeight="600"
                fill={style.text}
                opacity={estompee ? 0.35 : 1}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
