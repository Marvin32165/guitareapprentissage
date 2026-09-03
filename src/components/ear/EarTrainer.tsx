"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { Fretboard } from "@/components/fretboard/Fretboard";
import { pluck } from "@/lib/audio/guitar";
import { resolveSpec } from "@/lib/lessons/spec";
import {
  GENERATORS,
  EXERCISE_LABELS,
  seededRng,
  seedFrom,
  type EarExerciseId,
  type EarQuestion,
} from "@/lib/ear/questions";
import { assignSequence } from "@/lib/ear/voicing";

// Entraînement de l'oreille.
//
// Règle du projet : rien d'abstrait. Une réponse n'est donc jamais un simple
// « juste / faux » — l'intervalle ou l'accord entendu est montré sur le manche
// et peut être rejoué. Reconnaître une tierce mineure sans savoir où elle tombe
// sous les doigts ne sert à rien à quelqu'un qui a l'instrument en main.

const EXERCISES = Object.keys(EXERCISE_LABELS) as EarExerciseId[];
const LEVELS = [
  { value: 1, label: "Découverte", hint: "les écarts les plus francs" },
  { value: 2, label: "Intermédiaire", hint: "sixtes, septièmes" },
  { value: 3, label: "Complet", hint: "secondes et triton compris" },
] as const;

type Etat = { phase: "question" } | { phase: "repondu"; choisi: string; juste: boolean };

async function log(question: EarQuestion, correct: boolean) {
  try {
    await fetch("/api/practice-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: `ear_${question.exercise}`,
        refId: question.subtype,
        correct,
      }),
    });
  } catch {
    // Hors-ligne : la session reste utilisable, le compte du jour est local.
  }
}

export function EarTrainer() {
  const [exercise, setExercise] = useState<EarExerciseId>("interval");
  const [level, setLevel] = useState<1 | 2 | 3>(1);

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-400">Exercice</h2>
        <div className="grid grid-cols-2 gap-2">
          {EXERCISES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setExercise(id)}
              className={
                "min-h-11 rounded-xl border px-3 py-2 text-left transition-colors " +
                (exercise === id
                  ? "border-emerald-600 bg-emerald-950/30"
                  : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700")
              }
            >
              <span
                className={
                  "block text-sm font-medium " +
                  (exercise === id ? "text-emerald-300" : "text-neutral-200")
                }
              >
                {EXERCISE_LABELS[id].label}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {EXERCISE_LABELS[id].hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      {exercise !== "naming" && (
        <label className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
          Niveau
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3)}
            className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label} — {l.hint}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* La clé fait repartir la session à neuf quand l'exercice ou le niveau
          change : c'est à React de reconstruire l'état, pas à un effet de le
          resynchroniser. */}
      <EarSession key={`${exercise}-${level}`} exercise={exercise} level={level} />
    </div>
  );
}

function EarSession({ exercise, level }: { exercise: EarExerciseId; level: 1 | 2 | 3 }) {
  // Première question déterministe : le rendu serveur et le rendu client
  // doivent produire exactement la même, sinon React signale une erreur
  // d'hydratation. Les suivantes sont tirées au hasard.
  const [question, setQuestion] = useState<EarQuestion>(() =>
    GENERATORS[exercise](level, seededRng(seedFrom(`${exercise}-${level}`))),
  );
  const [etat, setEtat] = useState<Etat>({ phase: "question" });
  const [faits, setFaits] = useState(0);
  const [justes, setJustes] = useState(0);
  const [joue, setJoue] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const nouvelle = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setQuestion(GENERATORS[exercise](level));
    setEtat({ phase: "question" });
  }, [exercise, level]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const ecouter = useCallback(() => {
    if (!question) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setJoue(true);
    const cordes = assignSequence(question.play.map((g) => g.midis));
    question.play.forEach((groupe, gi) => {
      timers.current.push(
        setTimeout(() => {
          groupe.midis.forEach((midi, i) => {
            void pluck({ stringIndex: cordes[gi][i], midi, durationSec: 2.4 });
          });
        }, groupe.atMs),
      );
    });
    const fin = Math.max(...question.play.map((g) => g.atMs)) + 1400;
    timers.current.push(setTimeout(() => setJoue(false), fin));
  }, [question]);

  function repondre(value: string) {
    if (!question || etat.phase !== "question") return;
    const juste = value === question.answer;
    setEtat({ phase: "repondu", choisi: value, juste });
    setFaits((n) => n + 1);
    if (juste) setJustes((n) => n + 1);
    void log(question, juste);
  }

  const ancrage = useMemo(() => {
    if (!question || etat.phase !== "repondu") return null;
    return resolveSpec({
      root: question.anchorRoot,
      kind: question.anchorKind,
      fromFret: 0,
      toFret: 12,
      labelMode: "degree",
    });
  }, [question, etat.phase]);

  const bonne = question.options.find((o) => o.value === question.answer)!;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          {faits} question{faits > 1 ? "s" : ""} · {justes} juste{justes > 1 ? "s" : ""}
        </p>
        <AudioUnlockButton />
      </div>

      <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <p className="text-neutral-100">{question.prompt}</p>
        <button
          type="button"
          onClick={ecouter}
          className={
            "min-h-11 w-full rounded-xl px-4 text-sm font-medium transition-colors " +
            (joue ? "bg-emerald-600/30 text-emerald-200" : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700")
          }
        >
          {joue ? "♪ en cours…" : "▶ Écouter"}
        </button>

        <div className="grid gap-2" data-role="reponses">
          {question.options.map((o) => {
            const repondu = etat.phase === "repondu";
            const estBonne = o.value === question.answer;
            const estChoisi = repondu && etat.choisi === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => repondre(o.value)}
                disabled={repondu}
                className={
                  "min-h-11 w-full rounded-xl border px-4 text-sm transition-colors " +
                  (!repondu
                    ? "border-neutral-700 text-neutral-100 hover:bg-neutral-800"
                    : estBonne
                      ? "border-emerald-600 bg-emerald-950/30 text-emerald-300"
                      : estChoisi
                        ? "border-amber-700 bg-amber-950/20 text-amber-300"
                        : "border-neutral-800 text-neutral-600")
                }
              >
                {o.label}
                {repondu && estBonne && " ✓"}
                {repondu && estChoisi && !estBonne && " — ton choix"}
              </button>
            );
          })}
        </div>
      </section>

      {etat.phase === "repondu" && (
        <section className="space-y-3">
          <p
            data-role="retour"
            className={
              "rounded-xl border px-4 py-3 text-sm " +
              (etat.juste
                ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-200"
                : "border-amber-800/60 bg-amber-950/20 text-amber-200")
            }
          >
            {etat.juste ? "Juste. " : `C'était ${bonne.label}. `}
            {question.explain}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={ecouter}
              className="min-h-11 flex-1 rounded-xl border border-neutral-700 px-4 text-sm text-neutral-200 hover:bg-neutral-900"
            >
              ♪ Réécouter
            </button>
            <button
              type="button"
              onClick={() => {
                nouvelle();
                setJoue(false);
              }}
              className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Suivante
            </button>
          </div>

          {ancrage && (
            <figure className="space-y-2">
              <Fretboard
                positions={ancrage.positions}
                orientation="horizontal"
                fromFret={ancrage.fromFret}
                toFret={ancrage.toFret}
                labelMode="degree"
              />
              <figcaption className="text-sm text-neutral-500">
                Où ça tombe sur le manche, en {question.anchorRoot}. Touche une
                note pour l&apos;entendre.
              </figcaption>
            </figure>
          )}
        </section>
      )}
    </div>
  );
}
