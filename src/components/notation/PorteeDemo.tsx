"use client";

import { useState } from "react";
import { StaffFretboard } from "./StaffFretboard";
import { ReadingExercise } from "./ReadingExercise";

const ONGLETS = [
  { id: "explorer", label: "Explorer", hint: "touche, vois, entends" },
  { id: "lire", label: "S'entraîner", hint: "trouve la note et joue-la" },
] as const;

type Onglet = (typeof ONGLETS)[number]["id"];

export function PorteeDemo() {
  const [onglet, setOnglet] = useState<Onglet>("explorer");
  const [caseMax, setCaseMax] = useState(5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={
              "min-h-11 rounded-xl border px-3 py-2 text-left transition-colors " +
              (onglet === o.id
                ? "border-emerald-600 bg-emerald-950/30"
                : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700")
            }
          >
            <span
              className={
                "block text-sm font-medium " +
                (onglet === o.id ? "text-emerald-300" : "text-neutral-200")
              }
            >
              {o.label}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">{o.hint}</span>
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3 text-sm text-neutral-400">
        Jusqu&apos;à la case
        <select
          value={caseMax}
          onChange={(e) => setCaseMax(Number(e.target.value))}
          className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
        >
          {[3, 5, 7, 12].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {onglet === "explorer" ? (
        <StaffFretboard toFret={caseMax} />
      ) : (
        <ReadingExercise key={caseMax} toFret={caseMax} />
      )}
    </div>
  );
}
