"use client";

import { strum } from "@/lib/audio/guitar";
import { soundingNotes, type ChordShape } from "@/lib/music/chord-shapes";
import { TUNINGS } from "@/lib/music/fretboard";

// Diagramme d'accord, à la verticale comme sur un carnet : c'est la
// représentation que tout guitariste sait lire, et la seule qui tienne à côté
// d'une autre sur un écran de 375 px.
//
// Le diagramme est ENTIÈREMENT tactile : le toucher gratte l'accord. Une forme
// d'accord qu'on ne peut pas entendre n'est qu'un dessin.

const STRINGS = 6;
const FRETS = 4;
const GAP_X = 22;
const GAP_Y = 28;
const PAD_X = 16;
const TOP = 26; // place pour les marques « à vide » et « étouffée »
const W = PAD_X * 2 + (STRINGS - 1) * GAP_X;
const H = TOP + FRETS * GAP_Y + 18;

const x = (stringIndex: number) => PAD_X + stringIndex * GAP_X;
const y = (fret: number) => TOP + (fret - 0.5) * GAP_Y;

export interface ChordDiagramProps {
  shape: ChordShape;
  /** Affiche le numéro de doigt dans les points. */
  showFingers?: boolean;
}

export function ChordDiagram({ shape, showFingers = true }: ChordDiagramProps) {
  function jouer() {
    const notes = soundingNotes(shape, TUNINGS.standard);
    void strum(
      notes.map((n) => ({ stringIndex: n.stringIndex, midi: n.midi })),
      { spreadMs: 26, durationSec: 3 },
    );
  }

  const notes = soundingNotes(shape);
  const description = `${shape.name} : ${notes
    .map((n) => `corde ${6 - n.stringIndex} case ${n.fret}`)
    .join(", ")}`;

  return (
    <button
      type="button"
      onClick={jouer}
      aria-label={`Écouter ${description}`}
      className="flex min-h-11 flex-col items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900/40 px-2 py-3 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
    >
      <span className="text-sm font-medium text-neutral-100">{shape.symbol}</span>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={description}
        className="select-none"
      >
        {/* Sillet : trait épais en haut, comme sur un vrai diagramme. */}
        <line
          x1={x(0)}
          y1={TOP}
          x2={x(STRINGS - 1)}
          y2={TOP}
          stroke="#e5e5e5"
          strokeWidth={4}
          strokeLinecap="square"
        />
        {Array.from({ length: FRETS }, (_, i) => i + 1).map((f) => (
          <line
            key={`f${f}`}
            x1={x(0)}
            y1={TOP + f * GAP_Y}
            x2={x(STRINGS - 1)}
            y2={TOP + f * GAP_Y}
            stroke="#404040"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: STRINGS }, (_, s) => (
          <line
            key={`s${s}`}
            x1={x(s)}
            y1={TOP}
            x2={x(s)}
            y2={TOP + FRETS * GAP_Y}
            stroke="#525252"
            strokeWidth={1}
          />
        ))}

        {shape.frets.map((fret, s) => {
          if (fret < 0) {
            return (
              <text
                key={`m${s}`}
                x={x(s)}
                y={TOP - 9}
                fontSize="13"
                fill="#737373"
                textAnchor="middle"
              >
                ×
              </text>
            );
          }
          if (fret === 0) {
            return (
              <circle
                key={`o${s}`}
                cx={x(s)}
                cy={TOP - 13}
                r={5}
                fill="none"
                stroke="#a3a3a3"
                strokeWidth={1.5}
              />
            );
          }
          return (
            <g key={`d${s}`}>
              <circle cx={x(s)} cy={y(fret)} r={9} fill="#10b981" />
              {showFingers && shape.fingers[s] > 0 && (
                <text
                  x={x(s)}
                  y={y(fret)}
                  fontSize="10"
                  fontWeight="700"
                  fill="#04231d"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {shape.fingers[s]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </button>
  );
}
