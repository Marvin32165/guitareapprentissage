"use client";

import { useCallback, useRef, useState } from "react";
import { startCapture, MicUnavailableError } from "@/lib/audio/capture";
import { scheduleClick, beatDuration, clampBpm, BPM_MIN, BPM_MAX } from "@/lib/audio/metronome";
import { detectOnsets } from "@/lib/audio/latency";
import {
  analyseRhythm,
  isInterpretable,
  biasIsMeaningful,
  MIN_SAMPLES,
  type RhythmAnalysis,
} from "@/lib/audio/rhythm";
import type { LatencyMeasurement } from "@/lib/audio/latency";

// Mesure de placement rythmique.
//
// Ce composant n'est rendu QUE si la latence est connue : c'est la porte
// d'entrée, pas une vérification interne. Il reçoit la mesure en propriété et
// s'en sert pour corriger les instants captés ET pour dire jusqu'où ses propres
// chiffres sont interprétables.
//
// AUCUN SON N'EST CONSERVÉ. La capture sert le temps de l'exercice, les
// instants d'attaque en sont extraits, et le signal est jeté.

const BARS = 4;
const BEATS_PER_BAR = 4;

type Etat =
  | { phase: "repos" }
  | { phase: "decompte" }
  | { phase: "mesure" }
  | { phase: "resultat"; analyse: RhythmAnalysis }
  | { phase: "echec"; raison: string };

export function RhythmCheck({ latence }: { latence: LatencyMeasurement }) {
  const [bpm, setBpm] = useState(80);
  const [etat, setEtat] = useState<Etat>({ phase: "repos" });
  const annule = useRef(false);

  const lancer = useCallback(async () => {
    annule.current = false;
    setEtat({ phase: "decompte" });

    let capture;
    try {
      capture = await startCapture({ maxSeconds: 40 });
    } catch (e) {
      setEtat({
        phase: "echec",
        raison: e instanceof MicUnavailableError ? e.message : "Micro indisponible.",
      });
      return;
    }

    try {
      const ctx = capture.context;
      const out = ctx.createGain();
      out.gain.value = 0.9;
      out.connect(ctx.destination);

      const beat = beatDuration(bpm);
      const depart = ctx.currentTime + 0.4;
      // Une mesure de décompte avant de mesurer : personne n'est en place sur
      // le premier clic.
      const decompte = BEATS_PER_BAR;
      const total = decompte + BARS * BEATS_PER_BAR;
      const temps: number[] = [];
      for (let i = 0; i < total; i++) {
        const t = depart + i * beat;
        scheduleClick(ctx, out, t, i % BEATS_PER_BAR === 0 ? "accent" : "beat");
        if (i >= decompte) temps.push(t);
      }

      const finDecompte = depart + decompte * beat;
      await new Promise((r) => setTimeout(r, (finDecompte - ctx.currentTime) * 1000));
      if (annule.current) return;
      setEtat({ phase: "mesure" });

      const fin = depart + total * beat + 0.5;
      await new Promise((r) => setTimeout(r, (fin - ctx.currentTime) * 1000));
      if (annule.current) return;

      const samples = capture.samples();
      const t0 = capture.startTime();
      // Les instants d'attaque sont extraits, puis le signal est abandonné :
      // rien n'est conservé, rien n'est envoyé nulle part.
      const onsets = detectOnsets(samples, capture.sampleRate, { minGapMs: 80 }).map(
        (i) => t0 + i / capture.sampleRate,
      );
      out.disconnect();

      const analyse = analyseRhythm(onsets, temps, {
        latencyMs: latence.ms,
        uncertaintyMs: latence.spreadMs,
      });
      setEtat({ phase: "resultat", analyse });
    } catch {
      setEtat({ phase: "echec", raison: "La mesure a échoué." });
    } finally {
      capture.stop();
    }
  }, [bpm, latence]);

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="text-sm font-medium text-neutral-400">Placement rythmique</h2>

      {etat.phase === "resultat" ? (
        <Resultat analyse={etat.analyse} onRejouer={() => setEtat({ phase: "repos" })} />
      ) : (
        <>
          <p className="text-sm text-neutral-400">
            Une mesure de décompte, puis {BARS} mesures : joue une note franche
            sur chaque temps. Peu importe laquelle — c&apos;est l&apos;instant qui
            est mesuré, pas la note.
          </p>

          <label className="flex items-center justify-between gap-3 text-sm text-neutral-400">
            <span>
              Tempo <span className="tabular-nums text-neutral-100">{bpm}</span> bpm
            </span>
            <input
              type="range"
              min={BPM_MIN}
              max={BPM_MAX}
              value={bpm}
              onChange={(e) => setBpm(clampBpm(Number(e.target.value)))}
              disabled={etat.phase !== "repos" && etat.phase !== "echec"}
              aria-label="Tempo de l'exercice"
              className="w-1/2 accent-emerald-500"
            />
          </label>

          {etat.phase === "echec" && (
            <p className="rounded-xl border border-amber-800/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              {etat.raison}
            </p>
          )}

          <button
            type="button"
            onClick={() => void lancer()}
            disabled={etat.phase === "decompte" || etat.phase === "mesure"}
            className={
              "min-h-11 w-full rounded-xl px-4 text-sm font-medium transition-colors " +
              (etat.phase === "decompte" || etat.phase === "mesure"
                ? "cursor-wait bg-neutral-800 text-neutral-400"
                : "bg-emerald-600 text-white hover:bg-emerald-500")
            }
          >
            {etat.phase === "decompte"
              ? "Décompte…"
              : etat.phase === "mesure"
                ? "Joue ! Mesure en cours…"
                : "▶ Lancer l'exercice"}
          </button>

          <p className="text-xs text-neutral-600">
            Le micro sert le temps de l&apos;exercice. Les instants d&apos;attaque
            en sont extraits, et le son est jeté : rien n&apos;est enregistré,
            rien n&apos;est envoyé.
          </p>
        </>
      )}
    </section>
  );
}

function Resultat({
  analyse,
  onRejouer,
}: {
  analyse: RhythmAnalysis;
  onRejouer: () => void;
}) {
  const [retour, setRetour] = useState<string | null>(null);
  const [erreurRetour, setErreurRetour] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const lisible = isInterpretable(analyse);

  async function demanderRetour() {
    setEnCours(true);
    setErreurRetour(null);
    try {
      // On n'envoie QUE des nombres. Le signal du micro n'a jamais quitté
      // l'appareil et a déjà été jeté.
      const res = await fetch("/api/session-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "technique",
          metrics: {
            exercice: "placement rythmique",
            placementMedianMs: Math.round(analyse.medianOffsetMs),
            dispersionMs: Math.round(analyse.spreadMs),
            incertitudeCalibrationMs: Math.round(analyse.uncertaintyMs),
            attaquesRetenues: analyse.detected,
            tempsProposes: analyse.expected,
            biaisInterpretable: biasIsMeaningful(analyse),
            nonMesure: [
              "notes d'un accord gratté (transcription polyphonique)",
              "dynamique et nuances (gain automatique du micro)",
              "son, toucher, musicalité",
            ],
          },
        }),
      });
      const json = await res.json();
      if (json.ok) setRetour(json.feedback);
      else setErreurRetour(json.error ?? "Retour indisponible.");
    } catch {
      setErreurRetour("Retour indisponible : pas de réseau.");
    } finally {
      setEnCours(false);
    }
  }
  const biais = biasIsMeaningful(analyse);
  const devant = analyse.medianOffsetMs < 0;

  return (
    <div className="space-y-3">
      {!lisible ? (
        <p className="rounded-xl border border-amber-800/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          Seulement {analyse.detected} attaque{analyse.detected > 1 ? "s" : ""} retenue
          {analyse.detected > 1 ? "s" : ""} sur {analyse.expected} temps — il en faut au
          moins {MIN_SAMPLES} pour que la mesure veuille dire quelque chose. Joue plus
          franchement, ou rapproche le micro.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <dt className="text-xs text-neutral-500">Placement</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-neutral-100">
                {biais
                  ? `${devant ? "−" : "+"}${Math.abs(analyse.medianOffsetMs).toFixed(0)} ms`
                  : "≈ 0"}
              </dd>
              <dd className="mt-0.5 text-xs text-neutral-500">
                {biais ? (devant ? "devant le temps" : "derrière le temps") : "sur le temps"}
              </dd>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <dt className="text-xs text-neutral-500">Régularité</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-neutral-100">
                ±{analyse.spreadMs.toFixed(0)} ms
              </dd>
              <dd className="mt-0.5 text-xs text-neutral-500">
                dispersion autour de ton propre placement
              </dd>
            </div>
          </dl>

          <p className="text-sm text-neutral-400">
            {analyse.detected} attaque{analyse.detected > 1 ? "s" : ""} retenue
            {analyse.detected > 1 ? "s" : ""} sur {analyse.expected} temps.{" "}
            {!biais &&
              `Ton écart est plus petit que l'incertitude de la mesure (±${analyse.uncertaintyMs.toFixed(0)} ms) : il n'est pas interprétable, et c'est une bonne nouvelle.`}
          </p>

          <p className="text-xs text-neutral-600">
            Deux chiffres, et pas de note globale : le placement dit si tu es
            devant ou derrière, la régularité dit si tu t&apos;y tiens. Ils ne se
            mélangent pas — on peut être très régulier et systématiquement en
            retard. Incertitude héritée de la calibration : ±
            {analyse.uncertaintyMs.toFixed(0)} ms.
          </p>
        </>
      )}

      {lisible && !retour && (
        <button
          type="button"
          onClick={() => void demanderRetour()}
          disabled={enCours}
          className={
            "min-h-11 w-full rounded-xl px-4 text-sm font-medium transition-colors " +
            (enCours
              ? "cursor-wait bg-neutral-800 text-neutral-400"
              : "bg-emerald-600 text-white hover:bg-emerald-500")
          }
        >
          {enCours ? "Rédaction…" : "Demander un retour écrit"}
        </button>
      )}

      {retour && (
        <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="whitespace-pre-wrap text-sm text-neutral-200">{retour}</p>
          <p className="text-xs text-neutral-600">
            Rédigé à partir des chiffres ci-dessus, et d&apos;eux seuls. Aucun son
            n&apos;a été transmis : seules les mesures sont sorties de
            l&apos;appareil.
          </p>
        </div>
      )}

      {erreurRetour && (
        <p className="rounded-xl border border-amber-800/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {erreurRetour} Les mesures restent valables telles quelles.
        </p>
      )}

      <button
        type="button"
        onClick={onRejouer}
        className="min-h-11 w-full rounded-xl border border-neutral-700 px-4 text-sm text-neutral-200 hover:bg-neutral-800"
      >
        Recommencer
      </button>
    </div>
  );
}
