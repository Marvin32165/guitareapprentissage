"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Fretboard } from "@/components/fretboard/Fretboard";
import { ChordDiagram } from "@/components/fretboard/ChordDiagram";
import { getChordShape } from "@/lib/music/chord-shapes";
import { AudioUnlockButton } from "@/components/audio/AudioProvider";
import { getConcept } from "@/content/concepts";
import { resolveSpec } from "@/lib/lessons/spec";
import { postJson } from "@/lib/offline/post";
import type {
  Exercise,
  FretboardSpec,
  Lesson,
  LessonBlock,
} from "@/content/lessons/types";
import type { FretPosition } from "@/lib/music/fretboard";

async function log(path: string, body: unknown) {
  // Hors-ligne, l'écriture est mise en file plutôt que perdue : le journal sert
  // de source de vérité à la répétition espacée, et un journal troué produit un
  // calendrier faux.
  await postJson(path, body);
}

export function LessonView({
  lesson,
  initialStatus,
  prevSlug,
  nextSlug,
}: {
  lesson: Lesson;
  initialStatus: string;
  prevSlug?: string;
  nextSlug?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const total = lesson.blocks.filter((b) => b.kind === "exercise").length;
  const done = Object.keys(results).length;
  const correct = Object.values(results).filter(Boolean).length;

  // Marque la leçon « en cours » à la première ouverture (effet vers le serveur,
  // sans setState : on ne déclenche pas de rendu en cascade).
  useEffect(() => {
    if (initialStatus === "not_started") {
      void log("/api/lessons/progress", { lessonId: lesson.slug, status: "in_progress" });
    }
  }, [initialStatus, lesson.slug]);

  function onAnswer(ex: Exercise, ok: boolean) {
    setResults((r) => (ex.id in r ? r : { ...r, [ex.id]: ok }));
    void log("/api/practice-event", {
      type: "lesson_exercise",
      refId: ex.id,
      correct: ok,
    });
  }

  const isDone = status === "completed";

  // Bascule dans les deux sens : on doit pouvoir revenir en arrière si on a
  // marqué une leçon terminée par erreur, ou si on veut la retravailler.
  async function toggleComplete() {
    const next = isDone ? "in_progress" : "completed";
    setStatus(next);
    await log("/api/lessons/progress", { lessonId: lesson.slug, status: next });
  }

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-neutral-500">
          Leçon {lesson.order} · {lesson.minutes} min
          {status === "completed" && (
            <span className="ml-2 text-emerald-400">· terminée</span>
          )}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="text-neutral-400">{lesson.goal}</p>
        {lesson.concepts.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {lesson.concepts.map((id) => (
              <li
                key={id}
                title={getConcept(id).summary}
                className="rounded-full bg-neutral-800/80 px-2.5 py-1 text-xs text-neutral-300"
              >
                {getConcept(id).label}
              </li>
            ))}
          </ul>
        )}
        <div className="pt-1">
          <AudioUnlockButton />
        </div>
      </header>

      {lesson.blocks.map((block, i) => (
        <Block key={i} block={block} onAnswer={onAnswer} answered={results} />
      ))}

      <footer className="space-y-4 border-t border-neutral-800 pt-5">
        <p className="text-sm text-neutral-400">
          Exercices : {done}/{total} répondus
          {done > 0 && <> · {correct} juste{correct > 1 ? "s" : ""}</>}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {isDone && (
            <span className="rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-medium text-emerald-300">
              ✓ Leçon terminée
            </span>
          )}
          <button
            type="button"
            onClick={toggleComplete}
            className={
              "min-h-12 rounded-lg px-4 font-medium transition-colors " +
              (isDone
                ? "border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                : "w-full bg-emerald-600 text-white active:bg-emerald-700 sm:w-auto")
            }
          >
            {isDone ? "Marquer comme non terminée" : "Marquer comme terminée"}
          </button>
        </div>
        <nav className="flex justify-between gap-3 text-sm">
          {prevSlug ? (
            <Link href={`/theorie/${prevSlug}`} className="min-h-11 text-neutral-400 hover:text-neutral-100">
              ← Leçon précédente
            </Link>
          ) : (
            <span />
          )}
          {nextSlug ? (
            <Link href={`/theorie/${nextSlug}`} className="min-h-11 text-emerald-400">
              Leçon suivante →
            </Link>
          ) : (
            <Link href="/theorie" className="min-h-11 text-emerald-400">
              Retour au parcours
            </Link>
          )}
        </nav>
      </footer>
    </article>
  );
}

function Block({
  block,
  onAnswer,
  answered,
}: {
  block: LessonBlock;
  onAnswer: (ex: Exercise, ok: boolean) => void;
  answered: Record<string, boolean>;
}) {
  switch (block.kind) {
    case "heading":
      return <h2 className="pt-2 text-lg font-semibold text-neutral-100">{block.text}</h2>;
    case "prose":
      return (
        <div className="space-y-3">
          {block.paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed text-neutral-300">
              {p}
            </p>
          ))}
        </div>
      );
    case "callout":
      return (
        <p
          className={
            "rounded-xl border px-4 py-3 text-sm " +
            (block.tone === "warn"
              ? "border-amber-700/60 bg-amber-900/20 text-amber-200"
              : "border-emerald-800/60 bg-emerald-900/20 text-emerald-200")
          }
        >
          {block.text}
        </p>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900/60 text-neutral-400">
              <tr>
                {block.head.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-neutral-800 text-neutral-300">
                  {row.map((c, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-2">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "fretboard":
      return <FretboardBlock caption={block.caption} spec={block.spec} />;
    case "chords":
      return <ChordsBlock caption={block.caption} shapeIds={block.shapeIds} />;
    case "exercise":
      return (
        <ExerciseBlock
          exercise={block.exercise}
          onAnswer={onAnswer}
          already={answered[block.exercise.id]}
        />
      );
  }
}

function ChordsBlock({ caption, shapeIds }: { caption?: string; shapeIds: string[] }) {
  return (
    <figure className="space-y-2">
      {/* Grille souple : deux diagrammes tiennent côte à côte dès 375 px. */}
      <div className="flex flex-wrap gap-2">
        {shapeIds.map((id) => (
          <ChordDiagram key={id} shape={getChordShape(id)} />
        ))}
      </div>
      <figcaption className="text-sm text-neutral-500">
        {caption ? `${caption} ` : ""}
        <span className="text-neutral-600">Touche un diagramme pour l&apos;entendre.</span>
      </figcaption>
    </figure>
  );
}

function FretboardBlock({ caption, spec }: { caption?: string; spec: FretboardSpec }) {
  const r = useMemo(() => resolveSpec(spec), [spec]);
  return (
    <figure className="space-y-2">
      {caption && <figcaption className="text-sm text-neutral-400">{caption}</figcaption>}
      <div className="overflow-x-auto">
        <div className="flex justify-center">
          <Fretboard
            positions={r.positions}
            orientation="vertical"
            fromFret={r.fromFret}
            toFret={r.toFret}
            labelMode={spec.labelMode ?? "note"}
          />
        </div>
      </div>
    </figure>
  );
}

function ExerciseBlock({
  exercise,
  onAnswer,
  already,
}: {
  exercise: Exercise;
  onAnswer: (ex: Exercise, ok: boolean) => void;
  already?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [hit, setHit] = useState<boolean | null>(already ?? null);

  const resolved = useMemo(
    () => (exercise.kind === "fretFind" ? resolveSpec(exercise.spec) : null),
    [exercise],
  );

  function answer(ok: boolean) {
    if (hit !== null) return;
    setHit(ok);
    onAnswer(exercise, ok);
  }

  return (
    <section className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <p className="text-sm font-medium text-neutral-400">Exercice</p>
      <p className="text-neutral-100">{exercise.prompt}</p>

      {exercise.kind === "mcq" && (
        <ul className="space-y-2">
          {exercise.options.map((opt, i) => {
            const isAnswer = i === exercise.answer;
            const chosen = picked === i;
            const revealed = hit !== null;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => {
                    setPicked(i);
                    answer(isAnswer);
                  }}
                  className={
                    "min-h-12 w-full rounded-lg border px-4 text-left text-sm transition-colors " +
                    (revealed && isAnswer
                      ? "border-emerald-600 bg-emerald-600/15 text-emerald-200"
                      : revealed && chosen
                        ? "border-red-700 bg-red-900/20 text-red-200"
                        : "border-neutral-700 text-neutral-200 hover:bg-neutral-800")
                  }
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {exercise.kind === "fretFind" && resolved && (
        <div className="overflow-x-auto">
          <div className="flex justify-center">
            <Fretboard
              positions={resolved.positions}
              orientation="vertical"
              fromFret={resolved.fromFret}
              toFret={resolved.toFret}
              labelMode={exercise.spec.labelMode ?? "note"}
              onSelect={(pos: FretPosition) => {
                if (hit !== null) return;
                answer(matchesTarget(exercise, pos));
              }}
            />
          </div>
        </div>
      )}

      {hit !== null && (
        <p
          className={
            "text-sm " + (hit ? "text-emerald-400" : "text-amber-300")
          }
        >
          {hit ? "Juste. " : "Raté. "}
          {exercise.explain}
        </p>
      )}
    </section>
  );
}

function matchesTarget(
  exercise: Extract<Exercise, { kind: "fretFind" }>,
  pos: FretPosition,
): boolean {
  if (exercise.onlyStringIndex !== undefined && pos.stringIndex !== exercise.onlyStringIndex) {
    return false;
  }
  if (exercise.targetDegrees?.length) {
    return exercise.targetDegrees.includes(pos.degreeSemitones);
  }
  if (exercise.targetPcs?.length) {
    return exercise.targetPcs.includes(pos.pc);
  }
  return false;
}
