import { describe, it, expect } from "vitest";
import {
  OPEN_CHORDS,
  getChordShape,
  soundingNotes,
  shapePitchClasses,
  fingerCount,
} from "./chord-shapes";
import { parseNote, pitchClass, formatNote } from "./pitch";
import { transpose } from "./intervals";
import { STANDARD } from "./fretboard";

// Les formes d'accords sont les seules données saisies à la main du projet.
// Elles sont donc confrontées au moteur : une case fausse donnerait un accord
// faux, enseigné comme juste, et personne ne s'en apercevrait.

/** Notes attendues d'après la théorie, pas d'après la forme. */
function expectedPitchClasses(root: string, quality: "major" | "minor" | "dom7"): Set<number> {
  const r = parseNote(root);
  const tierce = quality === "minor" ? transpose(r, 2, 3) : transpose(r, 2, 4);
  const quinte = transpose(r, 4, 7);
  const notes = [r, tierce, quinte];
  if (quality === "dom7") notes.push(transpose(r, 6, 10));
  return new Set(notes.map(pitchClass));
}

describe("formes d'accords ouverts", () => {
  it("identifiants uniques", () => {
    const ids = OPEN_CHORDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("six cordes décrites, cases plausibles en position ouverte", () => {
    for (const c of OPEN_CHORDS) {
      expect(c.frets.length, c.id).toBe(6);
      expect(c.fingers.length, c.id).toBe(6);
      for (const f of c.frets) {
        expect(f, `${c.id} : case ${f}`).toBeGreaterThanOrEqual(-1);
        expect(f, `${c.id} : case ${f} hors position ouverte`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("un doigt est indiqué là où une case est pressée, et nulle part ailleurs", () => {
    for (const c of OPEN_CHORDS) {
      c.frets.forEach((fret, i) => {
        if (fret > 0) {
          expect(c.fingers[i], `${c.id} corde ${i} : case pressée sans doigt`).toBeGreaterThan(0);
        } else {
          expect(c.fingers[i], `${c.id} corde ${i} : doigt sur une corde non pressée`).toBe(0);
        }
      });
      expect(fingerCount(c), `${c.id} : plus de 4 doigts`).toBeLessThanOrEqual(4);
    }
  });

  it.each(OPEN_CHORDS.map((c) => [c.id, c] as const))(
    "%s produit exactement les notes de l'accord annoncé",
    (_id, shape) => {
      const attendu = expectedPitchClasses(shape.root, shape.quality);
      const obtenu = shapePitchClasses(shape);
      // Aucune note étrangère…
      for (const pc of obtenu) {
        expect([...attendu], `${shape.symbol} contient une note hors accord (pc ${pc})`)
          .toContain(pc);
      }
      // …et aucune note manquante.
      for (const pc of attendu) {
        expect([...obtenu], `${shape.symbol} : note d'accord absente (pc ${pc})`).toContain(pc);
      }
    },
  );

  it("la note la plus grave est la fondamentale", () => {
    // Un accord ouvert dont la basse n'est pas la fondamentale sonne renversé :
    // ce n'est pas ce qu'on veut enseigner en première approche.
    for (const shape of OPEN_CHORDS) {
      const notes = soundingNotes(shape);
      const basse = notes.reduce((a, n) => (n.midi < a.midi ? n : a));
      const attendu = pitchClass(parseNote(shape.root));
      expect(((basse.midi % 12) + 12) % 12, `${shape.symbol} : basse ${formatNote(parseNote(shape.root))}`)
        .toBe(attendu);
    }
  });

  it("au moins trois cordes sonnent", () => {
    for (const c of OPEN_CHORDS) {
      expect(soundingNotes(c).length, c.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("les hauteurs se déduisent de l'accordage, pas d'une table figée", () => {
    // Mi majeur, corde de Sol case 1 -> Sol dièse 3 (MIDI 56).
    const notes = soundingNotes(getChordShape("E"), STANDARD);
    const sol = notes.find((n) => n.stringIndex === 3)!;
    expect(sol.midi).toBe(56);
  });

  it("rejette une forme inconnue", () => {
    expect(() => getChordShape("Zz")).toThrow();
  });
});
