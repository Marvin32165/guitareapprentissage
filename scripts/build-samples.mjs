#!/usr/bin/env node
/**
 * Fabrique un jeu d'échantillons web à partir de WAV bruts.
 *
 *   node scripts/build-samples.mjs <dossier-wav> <dossier-sortie> [--slug=nom]
 *
 * Trois étapes, dans cet ordre :
 *
 *  1. MESURE DE HAUTEUR — autocorrélation normalisée (NSDF) avec interpolation
 *     parabolique du pic. L'interpolation n'est pas un raffinement cosmétique :
 *     en lag entier, la résolution vaut ~32 cents à 830 Hz, de quoi conclure à
 *     tort qu'un jeu est faux.
 *
 *  2. CORRECTION — rééchantillonnage par 2^(écart/1200) pour amener chaque note
 *     sur sa hauteur tempérée exacte. On rééchantillonne (soxr) plutôt que de
 *     transposer au vocodeur : sous ~30 cents, c'est exact et sans artefact ;
 *     la durée bouge de moins de 1 %, inaudible sur une note pincée.
 *
 *  3. ENCODAGE — Opus 64 kbps mono (léger, excellent à ce débit) ET MP3 96 kbps
 *     en repli, parce qu'Opus dans un conteneur Ogg n'est pas lisible partout
 *     sur iOS selon la version. Le chargeur choisit à l'exécution.
 *     L'Opus sort en « .ogg » et non « .opus » : c'est le même conteneur, mais
 *     Next sert « .opus » en application/octet-stream, et l'en-tête global
 *     `X-Content-Type-Options: nosniff` interdit alors au navigateur de
 *     rattraper le coup.
 *
 * Écrit un manifeste JSON à côté des fichiers : mesures, correction appliquée,
 * durées, poids. C'est lui qui alimente la documentation — les chiffres du
 * README ne sont pas recopiés à la main.
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const OPUS_KBPS = 64;
const MP3_KBPS = 96;
const TARGET_RATE = 48000;

function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    return createRequire(import.meta.url)("ffmpeg-static");
  } catch {
    return "ffmpeg";
  }
}

// ---------------------------------------------------------------- lecture WAV

function readWav(path) {
  const b = readFileSync(path);
  if (b.toString("ascii", 0, 4) !== "RIFF") throw new Error(`${path} : pas un RIFF`);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "fmt ") fmt = { channels: b.readUInt16LE(off + 10), rate: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) };
    else if (id === "data") data = b.subarray(off + 8, off + 8 + size);
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`${path} : chunk fmt/data manquant`);
  if (fmt.bits !== 16) throw new Error(`${path} : ${fmt.bits} bits non géré`);
  const n = Math.floor(data.length / 2 / fmt.channels);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = data.readInt16LE(i * 2 * fmt.channels) / 32768;
  return { rate: fmt.rate, x, seconds: n / fmt.rate };
}

// ------------------------------------------------------- détection de hauteur

function nsdf(x, rate, fMin, fMax) {
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
  const delta = den !== 0 ? (0.5 * (y0 - y2)) / den : 0;
  return { hz: rate / (bt + delta), clarity: y1 };
}

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Écart en cents entre la hauteur réelle du fichier et la note visée. */
function measureCents(x, rate, midi) {
  const expected = midiToHz(midi);
  const found = [];
  for (const t of [0.1, 0.25, 0.45, 0.7]) {
    const start = Math.floor(t * rate);
    const len = Math.floor(0.3 * rate);
    if (start + len > x.length) continue;
    const w = x.subarray(start, start + len);
    let rms = 0;
    for (let i = 0; i < w.length; i++) rms += w[i] * w[i];
    if (Math.sqrt(rms / w.length) < 0.003) continue;
    const { hz, clarity } = nsdf(w, rate, expected * 0.75, expected * 1.33);
    if (clarity > 0.85) found.push(1200 * Math.log2(hz / expected));
  }
  if (!found.length) return null;
  found.sort((a, b) => a - b);
  return { cents: found[Math.floor(found.length / 2)], spread: found.at(-1) - found[0], windows: found.length };
}

// ------------------------------------------------------------------- pipeline

function main() {
  const [srcDir, outDir] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const slug = process.argv.find((a) => a.startsWith("--slug="))?.slice(7) ?? basename(outDir);
  if (!srcDir || !outDir) {
    console.error("usage : node scripts/build-samples.mjs <dossier-wav> <dossier-sortie> [--slug=nom]");
    process.exit(1);
  }
  const ffmpeg = ffmpegPath();
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".wav")).sort();
  const entries = [];

  for (const file of files) {
    // Le numéro MIDI est lu dans le nom : « ..._040__E2_1.wav » -> 40.
    const midi = Number(file.match(/_(\d{2,3})[_.]/)?.[1]);
    if (!Number.isFinite(midi)) { console.warn(`ignoré (pas de numéro MIDI) : ${file}`); continue; }

    const src = join(srcDir, file);
    const { rate, x, seconds } = readWav(src);
    const measured = measureCents(x, rate, midi);
    const cents = measured?.cents ?? 0;

    // On remonte la note de `-cents` pour la poser sur la hauteur exacte.
    const ratio = Math.pow(2, -cents / 1200);
    const filter = `asetrate=${Math.round(rate * ratio)},aresample=${TARGET_RATE}:resampler=soxr:precision=28,aformat=channel_layouts=mono`;

    const opus = join(outDir, `${midi}.ogg`);
    const mp3 = join(outDir, `${midi}.mp3`);
    execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", src,
      "-af", filter, "-c:a", "libopus", "-b:a", `${OPUS_KBPS}k`, "-application", "audio", "-vbr", "on", opus]);
    execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", src,
      "-af", filter, "-c:a", "libmp3lame", "-b:a", `${MP3_KBPS}k`, "-ac", "1", mp3]);

    entries.push({
      midi,
      source: file,
      secondes: Number(seconds.toFixed(3)),
      ecartMesureCents: measured ? Number(cents.toFixed(1)) : null,
      dispersionCents: measured ? Number((measured.spread / 2).toFixed(1)) : null,
      correctionAppliquee: measured ? Number((-cents).toFixed(1)) : 0,
      octets: { ogg: statSync(opus).size, mp3: statSync(mp3).size },
    });
    const sign = cents >= 0 ? "+" : "";
    console.log(`${String(midi).padStart(3)}  ${file.padEnd(26)} ${sign}${cents.toFixed(1)} ct -> corrigé  ${(statSync(opus).size / 1024).toFixed(1)} ko ogg`);
  }

  const total = (k) => entries.reduce((s, e) => s + e.octets[k], 0);
  const manifest = {
    slug,
    genere: new Date().toISOString().slice(0, 10),
    encodage: { ogg_opus: `${OPUS_KBPS} kbps mono ${TARGET_RATE} Hz`, mp3: `${MP3_KBPS} kbps mono ${TARGET_RATE} Hz` },
    correctionHauteur: "rééchantillonnage soxr vers la hauteur tempérée exacte",
    notes: entries.length,
    etendueMidi: [Math.min(...entries.map((e) => e.midi)), Math.max(...entries.map((e) => e.midi))],
    poidsTotal: { ogg: total("ogg"), mp3: total("mp3") },
    entries,
  };
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\n${entries.length} notes · ogg/opus ${(total("ogg") / 1024).toFixed(0)} ko · mp3 ${(total("mp3") / 1024).toFixed(0)} ko`);
  console.log(`manifeste : ${join(outDir, "manifest.json")}`);
}

main();
