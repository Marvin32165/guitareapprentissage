import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "harmonisation",
  order: 7,
  title: "Les accords d'une tonalité",
  goal: "Savoir quels accords vont ensemble, et pourquoi certains sonnent majeurs et d'autres mineurs sans qu'on l'ait décidé.",
  minutes: 12,
  concepts: ["harmonisation", "chiffrage-romain"],
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Tu sais construire une triade sur Do. Fais la même chose sur chaque degré de la gamme, sans jamais sortir des sept notes disponibles.",
        "Sur Ré : Ré – Fa – La. L'écart Ré–Fa fait trois demi-tons : tierce mineure. L'accord est donc mineur, et personne ne l'a choisi. C'est la gamme qui l'impose.",
      ],
    },
    {
      kind: "table",
      head: ["Degré", "Accord", "Qualité", "Pourquoi"],
      rows: [
        ["I", "Do", "majeur", "Do–Mi : 4 demi-tons"],
        ["ii", "Ré m", "mineur", "Ré–Fa : 3 demi-tons"],
        ["iii", "Mi m", "mineur", "Mi–Sol : 3 demi-tons"],
        ["IV", "Fa", "majeur", "Fa–La : 4 demi-tons"],
        ["V", "Sol", "majeur", "Sol–Si : 4 demi-tons"],
        ["vi", "La m", "mineur", "La–Do : 3 demi-tons"],
        ["vii°", "Si dim", "diminué", "quinte diminuée : 6 demi-tons"],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Majeur, mineur, mineur, majeur, majeur, mineur, diminué. Cet ordre est le même dans TOUTES les tonalités majeures — c'est une conséquence de la formule, pas une liste à retenir.",
    },
    {
      kind: "heading",
      text: "Pourquoi les chiffres romains",
    },
    {
      kind: "prose",
      paragraphs: [
        "Écrire « Do – Fa – Sol » ne vaut que pour Do. Écrire « I – IV – V » vaut pour les douze tonalités.",
        "La convention est simple : majuscules pour les accords majeurs, minuscules pour les mineurs, un petit rond pour le diminué. I, ii, iii, IV, V, vi, vii°.",
        "C'est ce qui te permet de transposer une chanson sans la réapprendre : la grille reste la même, seules les positions changent.",
      ],
    },
    {
      kind: "chords",
      caption: "Les degrés I, IV et V de Sol majeur : Sol, Do, Ré. Trois accords, des centaines de chansons.",
      shapeIds: ["G", "C", "D"],
    },
    {
      kind: "prose",
      paragraphs: [
        "Et les degrés vi et ii de la même tonalité, tous deux mineurs : Mi mineur et La mineur.",
      ],
    },
    {
      kind: "chords",
      caption: "vi et ii de Sol majeur",
      shapeIds: ["Em", "Am"],
    },
    {
      kind: "fretboard",
      caption: "La gamme de Sol majeur : tous ces accords en sortent, sans exception",
      spec: { root: "G", kind: "major", fromFret: 0, toFret: 12, labelMode: "degree" },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l7-e1",
        conceptId: "harmonisation",
        kind: "mcq",
        prompt: "Dans une tonalité majeure, quels degrés donnent des accords mineurs ?",
        options: ["I, IV et V", "ii, iii et vi", "ii, V et vii°", "Tous sauf le I"],
        answer: 1,
        explain: "ii, iii et vi. Le vii° est diminué, les trois autres sont majeurs.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l7-e2",
        conceptId: "harmonisation",
        kind: "mcq",
        prompt: "Quel accord se construit sur le 5e degré de Do majeur ?",
        options: ["Fa majeur", "Sol majeur", "La mineur", "Si diminué"],
        answer: 1,
        explain: "Sol – Si – Ré : quatre demi-tons entre Sol et Si, donc majeur.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l7-e3",
        conceptId: "chiffrage-romain",
        kind: "mcq",
        prompt: "Une grille notée I – vi – IV – V en Sol majeur donne…",
        options: [
          "Sol – Mi m – Do – Ré",
          "Sol – La m – Do – Ré",
          "Sol – Mi – Do – Ré",
          "Sol – Mi m – Ré – Do",
        ],
        answer: 0,
        explain: "vi de Sol, c'est Mi mineur. La minuscule signale le mineur, l'ordre suit les degrés.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l7-e4",
        conceptId: "chiffrage-romain",
        kind: "fretFind",
        prompt: "Sur la gamme de Do majeur, clique la fondamentale du Ve degré.",
        spec: { root: "C", kind: "major", fromFret: 0, toFret: 12, labelMode: "degree" },
        targetDegrees: [7],
        explain: "Sol, sept demi-tons au-dessus de Do. C'est la dominante, l'accord le plus tendu de la tonalité.",
      },
    },
  ],
};
