import { describe, it, expect } from "vitest";
import {
  detectPitch,
  isConfident,
  nearestNote,
  hzToMidiFloat,
  midiToHz,
  isInTune,
  SILENCE_RMS,
  MIN_CLARITY,
} from "./pitch-detect";

const RATE = 48000;

/**
 * Signal de test : une note de guitare n'est pas une sinusoïde. On empile donc
 * des harmoniques décroissantes, et on ajoute du bruit — sinon on ne testerait
 * le détecteur que sur le cas le plus facile qui soit.
 */
function tone(hz: number, { seconds = 0.25, harmonics = 6, noise = 0.004, amp = 0.3 } = {}) {
  const n = Math.floor(seconds * RATE);
  const x = new Float32Array(n);
  let s = 12345;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let h = 1; h <= harmonics; h++) {
      v += Math.sin((2 * Math.PI * hz * h * i) / RATE) / h;
    }
    x[i] = v * amp + rnd() * noise * 2;
  }
  return x;
}

describe("détection de hauteur", () => {
  it("retrouve les six cordes à vide à moins d'un cent", () => {
    const cordes = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
    for (const hz of cordes) {
      const p = detectPitch(tone(hz), RATE)!;
      expect(isConfident(p), `${hz} Hz`).toBe(true);
      const cents = 1200 * Math.log2(p.hz / hz);
      expect(Math.abs(cents), `${hz} Hz : ${cents.toFixed(2)} cents`).toBeLessThan(1);
    }
  });

  it("reste juste sur toute l'étendue du manche", () => {
    for (let midi = 40; midi <= 79; midi += 3) {
      const attendu = midiToHz(midi);
      const p = detectPitch(tone(attendu), RATE)!;
      const cents = 1200 * Math.log2(p.hz / attendu);
      expect(Math.abs(cents), `MIDI ${midi}`).toBeLessThan(2);
    }
  });

  it("mesure un désaccord au lieu de l'arrondir à la note voisine", () => {
    // Une corde 20 cents trop basse doit se lire comme telle : c'est tout
    // l'intérêt d'un accordeur.
    const juste = 110.0;
    const faux = juste * Math.pow(2, -20 / 1200);
    const p = detectPitch(tone(faux), RATE)!;
    const lecture = nearestNote(p.hz);
    expect(lecture.name).toBe("La2");
    expect(lecture.cents).toBeGreaterThan(-24);
    expect(lecture.cents).toBeLessThan(-16);
    expect(isInTune(lecture)).toBe(false);
  });

  it("ne rend rien sur du silence", () => {
    const silence = new Float32Array(RATE * 0.2);
    expect(detectPitch(silence, RATE)).toBeNull();
    expect(isConfident(null)).toBe(false);
  });

  it("doute d'un signal bruité au lieu d'inventer une note", () => {
    // Du bruit blanc n'est pas périodique : la clarté doit rester basse, et
    // c'est ce qui permet de refuser de répondre.
    let s = 7;
    const bruit = new Float32Array(RATE * 0.2);
    for (let i = 0; i < bruit.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      bruit[i] = (s / 4294967296 - 0.5) * 0.6;
    }
    const p = detectPitch(bruit, RATE);
    expect(p === null || p.clarity < MIN_CLARITY).toBe(true);
    expect(isConfident(p)).toBe(false);
  });

  it("tient malgré un fondamental faible, comme sur un micro de téléphone", () => {
    // Les petits haut-parleurs et micros rendent mal le grave : le fondamental
    // d'un Mi2 y est très atténué, mais les harmoniques suffisent.
    const hz = 82.41;
    const n = Math.floor(0.3 * RATE);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let v = 0.05 * Math.sin((2 * Math.PI * hz * i) / RATE);
      for (let h = 2; h <= 8; h++) v += Math.sin((2 * Math.PI * hz * h * i) / RATE) / h;
      x[i] = v * 0.3;
    }
    const p = detectPitch(x, RATE)!;
    expect(Math.abs(1200 * Math.log2(p.hz / hz))).toBeLessThan(3);
  });

  it("le seuil de silence écarte un souffle de fond", () => {
    const souffle = new Float32Array(RATE * 0.2);
    for (let i = 0; i < souffle.length; i++) souffle[i] = Math.sin(i / 50) * SILENCE_RMS * 0.5;
    expect(detectPitch(souffle, RATE)).toBeNull();
  });
});

describe("rapport à une note tempérée", () => {
  it("La4 = 440 Hz, exactement", () => {
    expect(hzToMidiFloat(440)).toBeCloseTo(69, 9);
    expect(midiToHz(69)).toBeCloseTo(440, 9);
    const l = nearestNote(440);
    expect(l.name).toBe("La4");
    expect(l.cents).toBeCloseTo(0, 6);
    expect(isInTune(l)).toBe(true);
  });

  it("nomme correctement les cordes à vide", () => {
    const attendu = ["Mi2", "La2", "Ré3", "Sol3", "Si3", "Mi4"];
    [82.41, 110.0, 146.83, 196.0, 246.94, 329.63].forEach((hz, i) => {
      expect(nearestNote(hz).name).toBe(attendu[i]);
    });
  });

  it("l'écart est signé : négatif si la note est trop basse", () => {
    expect(nearestNote(440 * Math.pow(2, -10 / 1200)).cents).toBeLessThan(0);
    expect(nearestNote(440 * Math.pow(2, 10 / 1200)).cents).toBeGreaterThan(0);
  });
});
