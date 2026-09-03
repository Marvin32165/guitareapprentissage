"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startCapture, MicUnavailableError, type Capture } from "@/lib/audio/capture";
import { detectPitch, isConfident, nearestNote, IN_TUNE_CENTS } from "@/lib/audio/pitch-detect";
import { TUNINGS } from "@/lib/music/fretboard";

// Accordeur.
//
// C'est la seule chose qu'un micro de téléphone mesure sans réserve : une note
// SEULE tenue. Pas de calibration nécessaire — on ne mesure pas un instant, on
// mesure une fréquence, et la latence n'y change rien.
//
// Corollaire : gratter l'accord entier ne donnera rien de bon, et l'interface
// le dit plutôt que d'afficher une valeur au hasard.

const NOMS_CORDES = ["Mi grave", "La", "Ré", "Sol", "Si", "Mi aigu"];
const FENETRE_S = 0.12;
const RAFRAICHI_MS = 90;

type Etat =
  | { phase: "arret" }
  | { phase: "ecoute" }
  | { phase: "erreur"; raison: string };

export function Tuner() {
  const [etat, setEtat] = useState<Etat>({ phase: "arret" });
  const [note, setNote] = useState<{ name: string; cents: number; hz: number } | null>(null);
  const [corde, setCorde] = useState<number | null>(null);
  const capture = useRef<Capture | null>(null);
  const boucle = useRef<ReturnType<typeof setInterval> | null>(null);

  const arreter = useCallback(() => {
    if (boucle.current) clearInterval(boucle.current);
    boucle.current = null;
    capture.current?.stop();
    capture.current = null;
    setEtat({ phase: "arret" });
    setNote(null);
    setCorde(null);
  }, []);

  useEffect(() => () => arreter(), [arreter]);

  async function demarrer() {
    try {
      // Deux secondes suffisent largement : au-delà, on garderait de la mémoire
      // pour rien.
      capture.current = await startCapture({ maxSeconds: 2 });
    } catch (e) {
      setEtat({
        phase: "erreur",
        raison: e instanceof MicUnavailableError ? e.message : "Micro indisponible.",
      });
      return;
    }
    setEtat({ phase: "ecoute" });

    boucle.current = setInterval(() => {
      const c = capture.current;
      if (!c) return;
      const tout = c.samples();
      const n = Math.floor(FENETRE_S * c.sampleRate);
      if (tout.length < n) return;
      const fenetre = tout.subarray(tout.length - n);

      const p = detectPitch(fenetre, c.sampleRate);
      if (!isConfident(p)) {
        // On efface plutôt que de laisser une valeur périmée à l'écran : une
        // note affichée alors qu'on ne joue plus se lit comme une mesure.
        setNote(null);
        setCorde(null);
        return;
      }
      const lecture = nearestNote(p!.hz);
      setNote({ name: lecture.name, cents: lecture.cents, hz: p!.hz });

      // Corde la plus probable, pour dire quoi tourner.
      let meilleure = 0;
      let ecart = Infinity;
      TUNINGS.standard.openMidi.forEach((midi, i) => {
        const d = Math.abs(midi - lecture.midi);
        if (d < ecart) {
          ecart = d;
          meilleure = i;
        }
      });
      setCorde(ecart <= 2 ? meilleure : null);
    }, RAFRAICHI_MS);
  }

  const juste = note !== null && Math.abs(note.cents) <= IN_TUNE_CENTS;
  // Aiguille : ±50 cents occupent toute la largeur.
  const position = note ? Math.max(-50, Math.min(50, note.cents)) : 0;

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="text-sm font-medium text-neutral-400">Accordeur</h2>

      {etat.phase === "ecoute" ? (
        <>
          <div className="text-center">
            <p
              className={
                "text-4xl font-semibold tabular-nums " +
                (note ? (juste ? "text-emerald-300" : "text-neutral-100") : "text-neutral-700")
              }
            >
              {note ? note.name : "—"}
            </p>
            <p className="mt-1 h-5 text-sm tabular-nums text-neutral-500">
              {note
                ? `${note.cents > 0 ? "+" : ""}${note.cents.toFixed(0)} cents · ${note.hz.toFixed(1)} Hz`
                : "joue une note seule"}
            </p>
          </div>

          {/* Aiguille : la zone juste est marquée, pas seulement suggérée. */}
          <div className="relative h-10 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-neutral-600" />
            <div
              className="absolute inset-y-1 left-1/2 -translate-x-1/2 rounded bg-emerald-900/40"
              style={{ width: `${(IN_TUNE_CENTS / 50) * 100}%` }}
            />
            {note && (
              <div
                className={
                  "absolute inset-y-2 w-1.5 rounded-full transition-[left] duration-75 " +
                  (juste ? "bg-emerald-400" : "bg-amber-400")
                }
                style={{ left: `calc(${50 + position}% - 3px)` }}
              />
            )}
          </div>

          <p className="h-5 text-center text-sm text-neutral-400">
            {note && corde !== null
              ? juste
                ? `${NOMS_CORDES[corde]} : juste.`
                : `${NOMS_CORDES[corde]} : ${note.cents < 0 ? "trop basse, tends" : "trop haute, détends"}.`
              : ""}
          </p>

          <button
            type="button"
            onClick={arreter}
            className="min-h-11 w-full rounded-xl border border-neutral-700 px-4 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            ■ Arrêter l&apos;accordeur
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-400">
            Joue <strong className="text-neutral-200">une corde à la fois</strong>,
            laissée sonner. Un accord gratté ne donnera rien : mesurer plusieurs
            notes simultanées dépasse ce qu&apos;un micro de téléphone permet
            honnêtement, et l&apos;accordeur préfère n&apos;afficher rien
            plutôt qu&apos;une valeur inventée.
          </p>
          {etat.phase === "erreur" && (
            <p className="rounded-xl border border-amber-800/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              {etat.raison}
            </p>
          )}
          <button
            type="button"
            onClick={() => void demarrer()}
            className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
          >
            ♪ Ouvrir le micro
          </button>
        </>
      )}
    </section>
  );
}
