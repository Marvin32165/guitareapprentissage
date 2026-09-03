"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startMetronome,
  tempoFromTaps,
  clampBpm,
  BPM_MIN,
  BPM_MAX,
  DEFAULTS,
  type MetronomeHandle,
} from "@/lib/audio/metronome";

// Métronome. Le rythme est planifié sur l'horloge de l'AudioContext ; ce
// composant ne fait que l'afficher et le régler.

const SUBDIVISIONS = [
  { value: 1, label: "Noires" },
  { value: 2, label: "Croches" },
  { value: 3, label: "Triolets" },
  { value: 4, label: "Doubles" },
];

export function Metronome() {
  const [bpm, setBpm] = useState(DEFAULTS.bpm);
  const [beatsPerBar, setBeatsPerBar] = useState(DEFAULTS.beatsPerBar);
  const [subdivision, setSubdivision] = useState(DEFAULTS.subdivision);
  const [enMarche, setEnMarche] = useState(false);
  const [temps, setTemps] = useState(0);
  const handle = useRef<MetronomeHandle | null>(null);
  const taps = useRef<number[]>([]);
  const affichage = useRef<ReturnType<typeof setTimeout>[]>([]);

  const arreter = useCallback(() => {
    handle.current?.stop();
    handle.current = null;
    affichage.current.forEach(clearTimeout);
    affichage.current = [];
    setEnMarche(false);
    setTemps(0);
  }, []);

  useEffect(() => () => arreter(), [arreter]);

  // Les réglages changent à chaud, sans couper le rythme.
  useEffect(() => {
    handle.current?.update({ bpm, beatsPerBar, subdivision });
  }, [bpm, beatsPerBar, subdivision]);

  async function demarrer() {
    if (handle.current) return;
    const onTick = ({ index, time, now }: { index: number; time: number; now: number }) => {
      const reglages = handle.current?.settings();
      const sub = Math.max(1, reglages?.subdivision ?? subdivision);
      // Le repère visuel ne marque que les temps, pas les subdivisions.
      if (index % sub !== 0) return;
      const parMesure = Math.max(1, reglages?.beatsPerBar ?? beatsPerBar);
      const beat = (Math.floor(index / sub) % parMesure) + 1;
      // Les clics sont planifiés en avance : on retarde l'affichage jusqu'à
      // l'instant où le son sort vraiment.
      const delaiMs = Math.max(0, (time - now) * 1000);
      const t = setTimeout(() => setTemps(beat), delaiMs);
      affichage.current.push(t);
      if (affichage.current.length > 64) {
        affichage.current.splice(0, affichage.current.length - 32);
      }
    };
    handle.current = await startMetronome({ bpm, beatsPerBar, subdivision, onTick });
    setEnMarche(true);
  }

  function taper() {
    const maintenant = performance.now() / 1000;
    const dernier = taps.current.at(-1);
    // Une longue pause repart de zéro : sinon on moyennerait deux séries.
    if (dernier !== undefined && maintenant - dernier > 2) taps.current = [];
    taps.current.push(maintenant);
    if (taps.current.length > 8) taps.current.shift();
    const t = tempoFromTaps(taps.current);
    if (t !== null) setBpm(t);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-400">Métronome</h2>
        <p className="text-3xl font-semibold tabular-nums text-neutral-100">
          {bpm}
          <span className="ml-1 text-sm font-normal text-neutral-500">bpm</span>
        </p>
      </div>

      {/* Repère visuel : un point par temps de la mesure. */}
      <div className="flex justify-center gap-2" aria-hidden>
        {Array.from({ length: beatsPerBar }, (_, i) => (
          <span
            key={i}
            className={
              "h-3 w-3 rounded-full transition-colors " +
              (enMarche && temps === i + 1
                ? i === 0
                  ? "bg-emerald-400"
                  : "bg-neutral-300"
                : "bg-neutral-700")
            }
          />
        ))}
      </div>

      <input
        type="range"
        min={BPM_MIN}
        max={BPM_MAX}
        value={bpm}
        onChange={(e) => setBpm(clampBpm(Number(e.target.value)))}
        aria-label="Tempo"
        className="w-full accent-emerald-500"
      />

      <div className="flex flex-wrap gap-2">
        {[-5, -1, 1, 5].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setBpm((b) => clampBpm(b + d))}
            className="min-h-11 min-w-11 flex-1 rounded-xl border border-neutral-700 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm text-neutral-400">
          Mesure
          <select
            value={beatsPerBar}
            onChange={(e) => setBeatsPerBar(Number(e.target.value))}
            className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
          >
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} temps
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-neutral-400">
          Subdivision
          <select
            value={subdivision}
            onChange={(e) => setSubdivision(Number(e.target.value))}
            className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
          >
            {SUBDIVISIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => (enMarche ? arreter() : void demarrer())}
          className={
            "min-h-11 flex-1 rounded-xl px-4 text-sm font-medium transition-colors " +
            (enMarche
              ? "border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              : "bg-emerald-600 text-white hover:bg-emerald-500")
          }
        >
          {enMarche ? "■ Arrêter" : "▶ Démarrer"}
        </button>
        <button
          type="button"
          onClick={taper}
          className="min-h-11 flex-1 rounded-xl border border-neutral-700 px-4 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Taper le tempo
        </button>
      </div>
    </section>
  );
}
