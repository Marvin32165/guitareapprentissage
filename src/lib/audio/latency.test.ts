import { describe, it, expect } from "vitest";
import {
  detectOnsets,
  estimateLatency,
  isUsable,
  MAX_SPREAD_MS,
  MIN_HITS,
} from "./latency";

const RATE = 48000;

/**
 * Fabrique un enregistrement de synthèse : du bruit de fond, plus des clics
 * placés à des instants connus. On sait donc exactement ce que le détecteur
 * doit trouver — sinon on ne teste que sa capacité à rendre un nombre.
 */
function fakeRecording({
  durationS = 3,
  clickTimes = [] as number[],
  latencyMs = 0,
  noise = 0.002,
  clickAmp = 0.4,
  seed = 1,
}): Float32Array {
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
  const x = new Float32Array(Math.floor(durationS * RATE));
  for (let i = 0; i < x.length; i++) x[i] = rnd() * noise * 2;
  for (const t of clickTimes) {
    const start = Math.floor((t + latencyMs / 1000) * RATE);
    // Clic : quelques millisecondes de sinusoïde amortie, comme celui du
    // métronome une fois passé par un haut-parleur.
    const len = Math.floor(0.006 * RATE);
    for (let i = 0; i < len && start + i < x.length; i++) {
      const env = Math.exp(-i / (0.0012 * RATE));
      x[start + i] += Math.sin((2 * Math.PI * 1600 * i) / RATE) * clickAmp * env;
    }
  }
  return x;
}

describe("détection des attaques", () => {
  it("retrouve chaque clic, et pas davantage", () => {
    const times = [0.3, 0.8, 1.3, 1.8, 2.3];
    const x = fakeRecording({ clickTimes: times });
    const onsets = detectOnsets(x, RATE).map((i) => i / RATE);
    expect(onsets.length).toBe(times.length);
    onsets.forEach((o, i) => expect(o).toBeCloseTo(times[i], 2));
  });

  it("tient dans un environnement bruyant", () => {
    const times = [0.3, 0.8, 1.3, 1.8, 2.3];
    const x = fakeRecording({ clickTimes: times, noise: 0.02, clickAmp: 0.35 });
    expect(detectOnsets(x, RATE).length).toBe(times.length);
  });

  it("ne trouve rien dans du silence bruité", () => {
    const x = fakeRecording({ clickTimes: [], noise: 0.01 });
    expect(detectOnsets(x, RATE).length).toBe(0);
  });
});

describe("estimation de la latence", () => {
  it("retrouve un retard connu, au demi-milliseconde près", () => {
    for (const latencyMs of [20, 45, 90, 180, 300]) {
      const emis = [0.3, 0.8, 1.3, 1.8, 2.3];
      const x = fakeRecording({ clickTimes: emis, latencyMs, durationS: 3.5 });
      const onsets = detectOnsets(x, RATE).map((i) => i / RATE);
      const m = estimateLatency(emis, onsets)!;
      expect(m.ms, `${latencyMs} ms attendues`).toBeGreaterThan(latencyMs - 3);
      expect(m.ms, `${latencyMs} ms attendues`).toBeLessThan(latencyMs + 3);
      expect(m.hits).toBe(emis.length);
      expect(isUsable(m)).toBe(true);
    }
  });

  it("signale une mesure dispersée au lieu d'en tirer une moyenne", () => {
    // Latence instable : la mesure ne doit pas être présentée comme fiable.
    const emis = [0.3, 0.8, 1.3, 1.8, 2.3];
    const onsets = [0.32, 0.86, 1.31, 1.89, 2.33];
    const m = estimateLatency(emis, onsets)!;
    expect(m.spreadMs).toBeGreaterThan(MAX_SPREAD_MS);
    expect(isUsable(m)).toBe(false);
  });

  it("refuse une mesure fondée sur trop peu de clics", () => {
    const m = estimateLatency([0.3, 0.8], [0.35, 0.85])!;
    expect(m.hits).toBeLessThan(MIN_HITS);
    expect(isUsable(m)).toBe(false);
  });

  it("ignore les clics jamais captés plutôt que d'inventer un écart", () => {
    const emis = [0.3, 0.8, 1.3, 1.8];
    // Le deuxième clic n'a pas été entendu du tout.
    const onsets = [0.34, 1.34, 1.84];
    const m = estimateLatency(emis, onsets)!;
    expect(m.hits).toBeLessThan(emis.length);
  });

  it("rend null quand rien ne correspond", () => {
    expect(estimateLatency([1, 2, 3], [])).toBeNull();
    expect(isUsable(null)).toBe(false);
  });

  it("écarte un appariement absurde plutôt que de l'accepter", () => {
    // Une attaque une seconde après le clic n'est pas de la latence.
    expect(estimateLatency([0.3], [1.6])).toBeNull();
  });
});
