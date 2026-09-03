"use client";

import { useState } from "react";
import { GuidedCompare } from "./GuidedCompare";
import { AudioCompare } from "./AudioCompare";

// Deux façons de choisir, parce qu'elles ne demandent pas la même chose :
// le mode guidé ne suppose aucune habitude d'écoute comparative, l'exploration
// libre sert à vérifier un point précis quand on sait déjà ce qu'on cherche.

const TABS = [
  { id: "guide", label: "Comparaison guidée", hint: "5 questions, noms cachés" },
  { id: "libre", label: "Exploration libre", hint: "toutes les sources, note par note" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CompareTabs() {
  const [tab, setTab] = useState<TabId>("guide");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              "min-h-11 rounded-xl border px-3 py-2 text-left transition-colors " +
              (tab === t.id
                ? "border-emerald-600 bg-emerald-950/30"
                : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700")
            }
          >
            <span
              className={
                "block text-sm font-medium " +
                (tab === t.id ? "text-emerald-300" : "text-neutral-200")
              }
            >
              {t.label}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">{t.hint}</span>
          </button>
        ))}
      </div>

      {tab === "guide" ? <GuidedCompare /> : <AudioCompare />}
    </div>
  );
}
