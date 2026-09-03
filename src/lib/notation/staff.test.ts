import { describe, it, expect } from "vitest";
import {
  writtenMidi,
  soundingMidi,
  octaveOf,
  vexKey,
  vexAccidental,
  staffNote,
  GUITAR_WRITTEN_OFFSET,
} from "./staff";
import { note } from "@/lib/music/pitch";
import { TUNINGS, midiAtFret, spellPitchClass, pitchClassAtFret } from "@/lib/music/fretboard";

describe("transposition d'écriture de la guitare", () => {
  it("écrit une octave au-dessus du son", () => {
    expect(GUITAR_WRITTEN_OFFSET).toBe(12);
    expect(writtenMidi(40)).toBe(52); // Mi2 entendu -> Mi3 écrit
    expect(writtenMidi(64)).toBe(76); // Mi4 entendu -> Mi5 écrit
  });

  it("fait l'aller-retour sans perte", () => {
    for (let m = 40; m <= 88; m++) expect(soundingMidi(writtenMidi(m))).toBe(m);
  });

  it("place les six cordes à vide là où un guitariste les lit", () => {
    // Valeurs de référence : le Mi grave à vide s'écrit Mi3, le Mi aigu Mi5.
    // C'est la convention de la portée guitare (clé de sol avec 8 sous la clé).
    const attendu = ["e/3", "a/3", "d/4", "g/4", "b/4", "e/5"];
    for (let s = 0; s < 6; s++) {
      const sounding = midiAtFret(s, 0, TUNINGS.standard);
      const spelled = spellPitchClass(pitchClassAtFret(s, 0, TUNINGS.standard), false);
      expect(staffNote(sounding, spelled).key, `corde ${s}`).toBe(attendu[s]);
    }
  });
});

describe("octave écrite", () => {
  it("se déduit de la lettre, pas du numéro MIDI divisé par douze", () => {
    // Si♯3 et Do4 sonnent la même hauteur (MIDI 60) mais ne s'écrivent pas
    // dans la même octave : c'est le cas que `midi / 12` rate.
    expect(octaveOf(note("C", 0), 60)).toBe(4);
    expect(octaveOf(note("B", 1), 60)).toBe(3);
    // Idem à l'autre bord : Do♭4 sonne comme Si3.
    expect(octaveOf(note("C", -1), 59)).toBe(4);
    expect(octaveOf(note("B", 0), 59)).toBe(3);
  });

  it("reste cohérente sur toute l'étendue du manche", () => {
    for (let midi = 40; midi <= 88; midi++) {
      for (const flats of [false, true]) {
        const spelled = spellPitchClass(((midi % 12) + 12) % 12, flats);
        const o = octaveOf(spelled, midi);
        expect(Number.isInteger(o), `midi ${midi} bémols=${flats}`).toBe(true);
      }
    }
  });
});

describe("clés VexFlow", () => {
  it("écrit lettre, altération et octave", () => {
    expect(vexKey(note("F", 1), 66)).toBe("f#/4");
    expect(vexKey(note("G", -1), 66)).toBe("gb/4");
    expect(vexKey(note("C", 0), 60)).toBe("c/4");
    expect(vexKey(note("B", -2), 57)).toBe("bbb/3");
  });

  it("ne demande une altération que si la note en porte une", () => {
    expect(vexAccidental(note("C", 0))).toBeNull();
    expect(vexAccidental(note("F", 1))).toBe("#");
    expect(vexAccidental(note("B", -1))).toBe("b");
  });

  it("l'orthographe vient du moteur théorique, pas de la notation", () => {
    // Le même son, deux orthographes légitimes selon le contexte tonal :
    // la portée doit suivre ce que le moteur a décidé.
    const diese = staffNote(66, spellPitchClass(6, false));
    const bemol = staffNote(66, spellPitchClass(6, true));
    expect(diese.sounding).toBe(bemol.sounding);
    expect(diese.key).not.toBe(bemol.key);
  });
});

describe("cohérence son / portée sur tout le manche", () => {
  it("chaque position produit une note écrite dont le son est celui joué", () => {
    const fautes: string[] = [];
    for (const tuning of Object.values(TUNINGS)) {
      for (let s = 0; s < 6; s++) {
        for (let f = 0; f <= 15; f++) {
          const sounding = midiAtFret(s, f, tuning);
          const spelled = spellPitchClass(pitchClassAtFret(s, f, tuning), false);
          const sn = staffNote(sounding, spelled);
          // La note écrite doit redonner exactement la hauteur jouée.
          if (soundingMidi(sn.written) !== sounding) {
            fautes.push(`${tuning.id} corde${s} case${f}`);
          }
          // Et l'octave écrite doit correspondre à la hauteur écrite.
          const octave = Number(sn.key.split("/")[1]);
          if (octave !== Math.floor(sn.written / 12) - 1) {
            fautes.push(`${tuning.id} corde${s} case${f} : octave ${octave}`);
          }
        }
      }
    }
    expect(fautes).toEqual([]);
  });
});
