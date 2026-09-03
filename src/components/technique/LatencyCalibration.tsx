"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { startCapture, MicUnavailableError } from "@/lib/audio/capture";
import { scheduleClick } from "@/lib/audio/metronome";
import {
  detectOnsets,
  estimateLatency,
  isUsable,
  readLatency,
  storeLatency,
  clearLatency,
  subscribeLatency,
  latencySnapshot,
  serverLatencySnapshot,
  MAX_SPREAD_MS,
  MIN_HITS,
} from "@/lib/audio/latency";

// Calibration de la latence aller-retour.
//
// L'application émet des clics par le haut-parleur et les réenregistre par le
// micro : l'écart mesure la chaîne complète, sans faire intervenir le temps de
// réaction de l'utilisateur. On mesure la machine, pas la personne.

const CLICKS = 8;
const INTERVAL_S = 0.55;
const LEAD_S = 0.5;

type Etat = { phase: "repos" } | { phase: "mesure" } | { phase: "echec"; raison: string };

export function LatencyCalibration() {
  const [etat, setEtat] = useState<Etat>({ phase: "repos" });
  const empreinte = useSyncExternalStore(
    subscribeLatency,
    latencySnapshot,
    serverLatencySnapshot,
  );
  const mesure = empreinte ? readLatency() : null;

  const calibrer = useCallback(async () => {
    setEtat({ phase: "mesure" });
    let capture;
    try {
      capture = await startCapture();
    } catch (e) {
      setEtat({
        phase: "echec",
        raison:
          e instanceof MicUnavailableError ? e.message : "Le micro n'a pas pu être ouvert.",
      });
      return;
    }

    try {
      const Tone = await import("tone");
      const ctx = Tone.getContext().rawContext as unknown as BaseAudioContext;
      const out = ctx.createGain();
      out.gain.value = 1;
      out.connect(ctx.destination);

      const debut = ctx.currentTime + LEAD_S;
      const emis: number[] = [];
      for (let i = 0; i < CLICKS; i++) {
        const t = debut + i * INTERVAL_S;
        scheduleClick(ctx, out, t, "accent");
        emis.push(t);
      }

      const fin = debut + CLICKS * INTERVAL_S + 0.8;
      await new Promise((r) => setTimeout(r, (fin - ctx.currentTime) * 1000));

      const samples = capture.samples();
      const t0 = capture.startTime();
      const onsets = detectOnsets(samples, capture.sampleRate).map(
        (i) => t0 + i / capture.sampleRate,
      );
      const m = estimateLatency(emis, onsets);
      out.disconnect();

      // Trois causes d'échec distinctes, trois messages distincts : « ça n'a
      // pas marché » n'aide personne à s'y reprendre.
      if (m === null) {
        setEtat({
          phase: "echec",
          raison:
            "Aucun clic n'a été réentendu. Monte le volume, et vérifie que le micro n'est pas coupé.",
        });
        return;
      }
      if (m.hits < MIN_HITS) {
        setEtat({
          phase: "echec",
          raison: `Seulement ${m.hits} clic(s) sur ${CLICKS} réentendus. Monte le volume ou rapproche le téléphone du haut-parleur.`,
        });
        return;
      }
      if (!isUsable(m)) {
        setEtat({
          phase: "echec",
          raison: `Mesures trop dispersées (±${m.spreadMs.toFixed(0)} ms, maximum ${MAX_SPREAD_MS}). Recommence dans un endroit plus calme.`,
        });
        return;
      }

      storeLatency({
        ms: Math.round(m.ms),
        spreadMs: Math.round(m.spreadMs * 10) / 10,
        hits: m.hits,
        emitted: CLICKS,
        measuredAt: new Date().toISOString(),
      });
      setEtat({ phase: "repos" });
    } catch {
      setEtat({ phase: "echec", raison: "La mesure a échoué." });
    } finally {
      capture.stop();
    }
  }, []);

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="text-sm font-medium text-neutral-400">Calibration de la latence</h2>

      {mesure ? (
        <div className="space-y-1">
          <p className="text-neutral-100">
            <span className="text-2xl font-semibold text-emerald-300">{mesure.ms} ms</span>{" "}
            <span className="text-sm text-neutral-400">aller-retour</span>
          </p>
          <p className="text-xs text-neutral-500">
            Dispersion ±{mesure.spreadMs} ms · {mesure.hits}/{mesure.emitted} clics
            retrouvés · mesuré le {new Date(mesure.measuredAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-300">
          Pas encore mesurée. Tant qu&apos;elle ne l&apos;est pas, aucune métrique de
          placement rythmique ne sera affichée — une mesure de timing sans
          calibration n&apos;est pas approximative, elle est arbitraire.
        </p>
      )}

      <div className="space-y-2 text-sm text-neutral-400">
        <p>
          L&apos;application émet huit clics par le haut-parleur et les réenregistre
          par le micro. C&apos;est la machine qu&apos;on mesure, pas ton temps de
          réaction : tu n&apos;as rien à faire.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-neutral-500">
          <li>Haut-parleur allumé, volume à mi-course au moins.</li>
          <li>Pas de casque : les clics doivent passer par l&apos;air.</li>
          <li>Endroit calme, cinq secondes de silence.</li>
          <li>À refaire si tu changes de casque, d&apos;enceinte ou d&apos;appareil.</li>
        </ul>
      </div>

      {etat.phase === "echec" && (
        <p className="rounded-xl border border-amber-800/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {etat.raison}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={calibrer}
          disabled={etat.phase === "mesure"}
          className={
            "min-h-11 flex-1 rounded-xl px-4 text-sm font-medium transition-colors " +
            (etat.phase === "mesure"
              ? "cursor-wait bg-neutral-800 text-neutral-400"
              : "bg-emerald-600 text-white hover:bg-emerald-500")
          }
        >
          {etat.phase === "mesure"
            ? "Mesure en cours… ne fais pas de bruit"
            : mesure
              ? "Refaire la mesure"
              : "Lancer la calibration"}
        </button>
        {mesure && (
          <button
            type="button"
            onClick={clearLatency}
            className="min-h-11 rounded-xl border border-neutral-700 px-4 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Effacer
          </button>
        )}
      </div>

      <p className="text-xs text-neutral-600">
        Une dispersion supérieure à ±{MAX_SPREAD_MS} ms fait rejeter la mesure, et
        moins de {MIN_HITS} clics retrouvés aussi : mieux vaut pas de chiffre
        qu&apos;un chiffre faux.
      </p>
    </section>
  );
}
