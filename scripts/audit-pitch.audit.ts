/**
 * Audit : « la note affichée est-elle exactement la note jouée ? »
 *
 *   npm run audit:pitch            (source par défaut)
 *   AUDIT_SOURCE=martin npm run audit:pitch
 *
 * Écrit comme un test pour profiter de la résolution de modules de Vitest, mais
 * exclu de la suite : il dépend de ffmpeg, absent en intégration continue.
 *
 * Ne fait pas confiance au code : refait le trajet complet pour chaque position
 * du manche, jusqu'à mesurer la fréquence du signal réellement produit.
 *
 *   position (corde, case) -> nom affiché      [moteur théorique]
 *                          -> numéro MIDI       [moteur théorique]
 *                          -> échantillon choisi + vitesse de lecture  [moteur audio]
 *                          -> rééchantillonnage effectif               [ffmpeg]
 *                          -> hauteur mesurée                          [autocorrélation]
 *
 * puis compare la hauteur mesurée à celle qu'annonce le nom affiché.
 *
 * Les modules réels sont importés : mesurer une reconstitution ne prouverait
 * que la justesse de la reconstitution.
 */

import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

import { it, expect } from "vitest";
import { TUNINGS, midiAtFret, pitchClassAtFret, spellPitchClass } from "@/lib/music/fretboard";
import { formatNote, pitchClass } from "@/lib/music/pitch";
import { getSource, type SourceId } from "@/lib/audio/sources";
import { nearestSample, playbackRateFor, sampleLayout } from "@/lib/audio/guitar";

const SOURCE_ID = (process.env.AUDIT_SOURCE ?? "fluid-steel") as SourceId;
const TOLERANCE_CENTS = 10;
const MAX_FRET = 15;

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  return createRequire(import.meta.url)("ffmpeg-static");
}

function readWav(path: string) {
  const b = readFileSync(path);
  let off = 12;
  let fmt: { channels: number; rate: number } | null = null;
  let data: Buffer | null = null;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "fmt ") fmt = { channels: b.readUInt16LE(off + 10), rate: b.readUInt32LE(off + 12) };
    else if (id === "data") data = b.subarray(off + 8, off + 8 + size);
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`${path} : WAV illisible`);
  const n = Math.floor(data.length / 2 / fmt.channels);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = data.readInt16LE(i * 2 * fmt.channels) / 32768;
  return { rate: fmt.rate, x };
}

function nsdf(x: Float32Array, rate: number, fMin: number, fMax: number) {
  const t0 = Math.max(2, Math.floor(rate / fMax));
  const t1 = Math.ceil(rate / fMin);
  const N = x.length;
  const r = new Float64Array(t1 + 2);
  for (let t = t0; t <= t1 + 1; t++) {
    let num = 0, a = 0, b = 0;
    for (let i = 0; i + t < N; i++) { num += x[i] * x[i + t]; a += x[i] * x[i]; b += x[i + t] * x[i + t]; }
    const den = Math.sqrt(a * b);
    r[t] = den > 0 ? num / den : 0;
  }
  let bt = t0;
  for (let t = t0; t <= t1; t++) if (r[t] > r[bt]) bt = t;
  const y0 = r[bt - 1] ?? r[bt], y1 = r[bt], y2 = r[bt + 1] ?? r[bt];
  const den = y0 - 2 * y1 + y2;
  return { hz: rate / (bt + (den !== 0 ? (0.5 * (y0 - y2)) / den : 0)), clarity: y1 };
}

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Fréquence réelle d'un fichier, mesurée à sa propre cadence. */
function measureHz(path: string, aroundHz: number): number | null {
  const { rate, x } = readWav(path);
  const found: number[] = [];
  for (const t of [0.1, 0.25, 0.45, 0.7]) {
    const start = Math.floor(t * rate), len = Math.floor(0.3 * rate);
    if (start + len > x.length) continue;
    const w = x.subarray(start, start + len);
    let rms = 0;
    for (let i = 0; i < w.length; i++) rms += w[i] * w[i];
    if (Math.sqrt(rms / w.length) < 0.002) continue;
    const { hz, clarity } = nsdf(w, rate, aroundHz * 0.75, aroundHz * 1.33);
    if (clarity > 0.85) found.push(hz);
  }
  if (!found.length) return null;
  found.sort((a, b) => a - b);
  return found[Math.floor(found.length / 2)];
}

// -------------------------------------------------------------------- audit

it("chaque position du manche sonne la note qu'elle affiche", { timeout: 600_000 }, async () => {
const ffmpeg = ffmpegPath();
const work = mkdtempSync(join(tmpdir(), "audit-pitch-"));
// La table et la vitesse de lecture viennent du moteur lui-même : recopier
// la formule ici reviendrait à vérifier la copie.
const layout = await sampleLayout(SOURCE_ID);
if (!layout) throw new Error(`La source « ${SOURCE_ID} » n'a pas d'échantillons.`);

const tuning = TUNINGS.standard;
const rows: { s: number; f: number; affiche: string; midi: number; cents: number | null; ok: boolean; sampleMidi: number }[] = [];
const cache = new Map<string, number | null>();

console.log(`Source : ${getSource(SOURCE_ID).label}`);
console.log(`Tolérance : ±${TOLERANCE_CENTS} cents\n`);
console.log("corde case  affiché   attendu Hz   mesuré Hz    écart");

for (let s = 0; s < 6; s++) {
  for (let f = 0; f <= MAX_FRET; f++) {
    const midi = midiAtFret(s, f, tuning);
    const pc = pitchClassAtFret(s, f, tuning);
    // Le nom tel que l'interface l'écrirait pour cette position.
    const affiche = formatNote(spellPitchClass(pc, false));
    if (pitchClass(spellPitchClass(pc, false)) !== ((midi % 12) + 12) % 12) {
      throw new Error(`Incohérence théorique corde ${s} case ${f}`);
    }

    const sample = nearestSample(layout, midi);
    const rate = playbackRateFor(midi, sample.midi);
    const expectedHz = midiToHz(midi);

    // On mesure l'échantillon à sa propre cadence, puis on applique la vitesse
    // de lecture arithmétiquement : supposer une cadence source (44,1 kHz par
    // exemple) fabriquerait un écart de 147 cents sur un fichier à 48 kHz.
    let sampleHz = cache.get(sample.url);
    if (sampleHz === undefined) {
      const src = join(process.cwd(), "public", sample.url.replace(/^\//, ""));
      const out = join(work, `s${sample.midi}.wav`);
      execFileSync(ffmpeg as string, ["-hide_banner", "-loglevel", "error", "-y",
        "-i", src, "-ac", "1", "-c:a", "pcm_s16le", out]);
      sampleHz = measureHz(out, midiToHz(sample.midi));
      cache.set(sample.url, sampleHz);
    }

    const cents =
      sampleHz === null ? null : 1200 * Math.log2((sampleHz * rate) / expectedHz);

    const ok = cents !== null && Math.abs(cents) <= TOLERANCE_CENTS;
    rows.push({ s, f, affiche, midi, cents, ok, sampleMidi: sample.midi });
    const shown = cents === null ? "  non mesurable" : `${(cents >= 0 ? "+" : "")}${cents.toFixed(1)} ct`;
    console.log(
      `  ${6 - s}   ${String(f).padStart(2)}  ${affiche.padEnd(4)} ${expectedHz.toFixed(2).padStart(10)} ` +
      `${(cents === null ? "—" : (expectedHz * Math.pow(2, cents / 1200)).toFixed(2)).padStart(11)}  ` +
      `${shown}${ok ? "" : "   <-- HORS TOLERANCE"}`,
    );
  }
}

rmSync(work, { recursive: true, force: true });

const mesurees = rows.filter((r) => r.cents !== null);
const hors = mesurees.filter((r) => !r.ok);
const pires = [...mesurees].sort((a, b) => Math.abs(b.cents!) - Math.abs(a.cents!)).slice(0, 3);

console.log(`\n${rows.length} positions · ${mesurees.length} mesurées · ${rows.length - mesurees.length} non mesurables`);
console.log(`Écart maximal : ${Math.max(...mesurees.map((r) => Math.abs(r.cents!))).toFixed(1)} cents`);
console.log(`Pires : ${pires.map((r) => `${r.affiche} corde ${6 - r.s} case ${r.f} (${r.cents!.toFixed(1)} ct)`).join(" · ")}`);
console.log(hors.length ? `\n❌ ${hors.length} position(s) hors tolérance` : `\n✅ Toutes les positions mesurées sont dans ±${TOLERANCE_CENTS} cents`);

expect(hors.map((r) => `${r.affiche} corde ${6 - r.s} case ${r.f} : ${r.cents!.toFixed(1)} ct`)).toEqual([]);
expect(mesurees.length, "trop de positions non mesurables").toBeGreaterThan(rows.length * 0.9);
});
