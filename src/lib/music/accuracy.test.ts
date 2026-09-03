import { describe, it, expect } from "vitest";
import {
  TUNINGS,
  midiAtFret,
  pitchClassAtFret,
  spellPitchClass,
  fretboardPositions,
  degreeName,
} from "./fretboard";
import { pitchClass, formatNote, parseNote, type Note } from "./pitch";
import { buildScale, MAJOR, NATURAL_MINOR, MINOR_PENTATONIC } from "./scales";
import { pluckFrequency } from "@/lib/audio/engine";

// « La note affichée est-elle exactement la note jouée ? »
//
// Le manche affiche un nom calculé par `fretboardPositions` et joue une hauteur
// calculée par `midiAtFret`. Ce sont deux chemins de code distincts appelés au
// même endroit (le composant affiche l'un, le gestionnaire de clic déclenche
// l'autre) : rien n'impose qu'ils restent d'accord, sauf ce test.

const TUNING_LIST = Object.values(TUNINGS);
const CAPOS = [0, 1, 2, 3, 4, 5, 7];
const FRETS = Array.from({ length: 16 }, (_, i) => i);

describe("cohérence nom affiché / hauteur jouée", () => {
  it("classe de hauteur identique pour toutes cordes, frettes, accordages et capos", () => {
    const desaccords: string[] = [];
    for (const tuning of TUNING_LIST) {
      for (const capo of CAPOS) {
        for (let s = 0; s < tuning.openMidi.length; s++) {
          for (const f of FRETS) {
            const affiche = pitchClassAtFret(s, f, tuning, capo);
            const joue = ((midiAtFret(s, f, tuning, capo) % 12) + 12) % 12;
            if (affiche !== joue) {
              desaccords.push(`${tuning.id} capo${capo} corde${s} case${f} : ${affiche} ≠ ${joue}`);
            }
          }
        }
      }
    }
    expect(desaccords).toEqual([]);
  });

  it("le nom porté par chaque position correspond à la hauteur qu'elle déclenche", () => {
    const jeux: { label: string; notes: Note[]; rootPc: number }[] = [];
    for (const root of ["C", "G", "D", "A", "E", "F", "B", "F#", "Bb", "Eb"]) {
      for (const [nom, formule] of [
        ["majeure", MAJOR],
        ["mineure", NATURAL_MINOR],
        ["penta min", MINOR_PENTATONIC],
      ] as const) {
        const notes = buildScale(parseNote(root), formule);
        jeux.push({ label: `${root} ${nom}`, notes, rootPc: pitchClass(notes[0]) });
      }
    }

    const fautes: string[] = [];
    for (const tuning of TUNING_LIST) {
      for (const capo of [0, 2, 5]) {
        for (const jeu of jeux) {
          for (const pos of fretboardPositions(jeu.notes, jeu.rootPc, { tuning, capo, toFret: 15 })) {
            const midi = midiAtFret(pos.stringIndex, pos.fret, tuning, capo);
            const attendu = ((midi % 12) + 12) % 12;
            if (pitchClass(pos.note) !== attendu) {
              fautes.push(
                `${tuning.id} capo${capo} ${jeu.label} corde${pos.stringIndex} case${pos.fret} : ` +
                  `affiche ${formatNote(pos.note)} (pc ${pitchClass(pos.note)}) mais joue pc ${attendu}`,
              );
            }
            // Le champ `pc` sert au code couleur : il doit suivre lui aussi.
            if (pos.pc !== attendu) {
              fautes.push(`${tuning.id} capo${capo} corde${pos.stringIndex} case${pos.fret} : pc incohérent`);
            }
          }
        }
      }
    }
    expect(fautes.slice(0, 10)).toEqual([]);
  });

  it("le degré annoncé correspond à l'écart réel à la fondamentale", () => {
    const fautes: string[] = [];
    for (const root of ["C", "A", "F#", "Eb"]) {
      const notes = buildScale(parseNote(root), MAJOR);
      const rootPc = pitchClass(notes[0]);
      for (const pos of fretboardPositions(notes, rootPc, { toFret: 15 })) {
        const midi = midiAtFret(pos.stringIndex, pos.fret);
        const ecart = (((midi % 12) - rootPc) % 12 + 12) % 12;
        if (pos.degreeSemitones !== ecart) {
          fautes.push(`${root} corde${pos.stringIndex} case${pos.fret} : ${pos.degreeSemitones} ≠ ${ecart}`);
        }
        if (pos.isRoot !== (ecart === 0)) {
          fautes.push(`${root} corde${pos.stringIndex} case${pos.fret} : isRoot incohérent`);
        }
        // `degreeName` sert l'étiquette d'accessibilité : elle doit exister.
        expect(degreeName(pos.degreeSemitones)).toBeTruthy();
      }
    }
    expect(fautes).toEqual([]);
  });

  it("spellPitchClass rend toujours une note de la classe demandée", () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const flats of [false, true]) {
        expect(pitchClass(spellPitchClass(pc, flats)), `pc ${pc} bémols=${flats}`).toBe(pc);
      }
    }
  });

  it("les cordes à vide sonnent bien la note attendue de l'accordage", () => {
    const attendu: Record<string, string[]> = {
      standard: ["E", "A", "D", "G", "B", "E"],
      dropD: ["D", "A", "D", "G", "B", "E"],
      dadgad: ["D", "A", "D", "G", "A", "D"],
      openG: ["D", "G", "D", "G", "B", "D"],
      openD: ["D", "A", "D", "F#", "A", "D"],
    };
    for (const [id, noms] of Object.entries(attendu)) {
      const tuning = TUNINGS[id as keyof typeof TUNINGS];
      noms.forEach((nom, s) => {
        const pc = ((midiAtFret(s, 0, tuning) % 12) + 12) % 12;
        const attenduPc = pitchClass(spellPitchClass(pc, nom.includes("b")));
        expect(pc, `${id} corde ${s} devrait être ${nom}`).toBe(attenduPc);
        expect(formatNote(spellPitchClass(pc, false)).replace("♯", "#")).toBe(nom);
      });
    }
  });

  it("une octave vaut douze frettes, sur toutes les cordes et tous les accordages", () => {
    for (const tuning of TUNING_LIST) {
      for (let s = 0; s < tuning.openMidi.length; s++) {
        expect(midiAtFret(s, 12, tuning) - midiAtFret(s, 0, tuning)).toBe(12);
      }
    }
  });
});

// --- justesse de la synthèse de repli -------------------------------------

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

describe("justesse de la synthèse de repli (PluckSynth)", () => {
  // Karplus-Strong ne peut produire que les hauteurs `cadence / N`, N entier.
  // Tone arrondit N vers le haut, ce qui rend toute note basse — jusqu'à
  // -23,5 cents sur Fa5, mesuré au navigateur. `pluckFrequency` vise l'entier
  // le plus proche à la place.
  const RATES = [44100, 48000];
  const MIDIS = Array.from({ length: 40 }, (_, i) => 40 + i); // Mi2 -> Sol5

  it("fait tomber la ligne à retard sur l'entier le plus proche", () => {
    for (const rate of RATES) {
      for (const midi of MIDIS) {
        const attendu = Math.round(rate / midiToHz(midi));
        const obtenu = Math.ceil(rate / pluckFrequency(midi, rate));
        expect(obtenu, `midi ${midi} à ${rate} Hz`).toBe(attendu);
      }
    }
  });

  it("est toujours au moins aussi juste que l'arrondi par excès de Tone", () => {
    for (const rate of RATES) {
      for (const midi of MIDIS) {
        const cible = midiToHz(midi);
        const avant = cents(rate / Math.ceil(rate / cible), cible);
        const apres = cents(rate / Math.ceil(rate / pluckFrequency(midi, rate)), cible);
        expect(Math.abs(apres), `midi ${midi} à ${rate} Hz`).toBeLessThanOrEqual(
          Math.abs(avant) + 1e-9,
        );
      }
    }
  });

  it("reste dans la moitié d'un cran de la grille, ce qui est le mieux atteignable", () => {
    for (const rate of RATES) {
      for (const midi of MIDIS) {
        const cible = midiToHz(midi);
        // Les deux crans qui encadrent la note : c'est cet intervalle-là qui
        // borne l'erreur, pas celui d'à côté.
        const bas = Math.floor(rate / cible);
        const haut = Math.ceil(rate / cible);
        const cran = Math.abs(cents(rate / haut, rate / bas));
        const erreur = Math.abs(cents(rate / Math.ceil(rate / pluckFrequency(midi, rate)), cible));
        expect(erreur, `midi ${midi} à ${rate} Hz`).toBeLessThanOrEqual(cran / 2 + 0.01);
      }
    }
  });

  it("l'erreur résiduelle reste sous 15 cents sur tout le manche", () => {
    const pires: string[] = [];
    for (const rate of RATES) {
      for (const midi of MIDIS) {
        const cible = midiToHz(midi);
        const erreur = cents(rate / Math.ceil(rate / pluckFrequency(midi, rate)), cible);
        if (Math.abs(erreur) > 15) pires.push(`midi ${midi} @${rate} : ${erreur.toFixed(1)} ct`);
      }
    }
    expect(pires).toEqual([]);
  });
});
