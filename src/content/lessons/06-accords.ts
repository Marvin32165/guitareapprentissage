import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "accords",
  order: 6,
  title: "D'où viennent les accords",
  goal: "Comprendre ce que tes doigts font déjà quand tu plaques un accord ouvert, et pourquoi un demi-ton sépare le majeur du mineur.",
  minutes: 12,
  concepts: ["triade-construction", "triade-qualite", "accords-ouverts"],
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Un accord de base, c'est trois notes. On les appelle une triade, et on les obtient en empilant deux tierces à partir d'une note.",
        "Prends la gamme de Do majeur et ne garde qu'une note sur deux à partir de Do : Do, (Ré), Mi, (Fa), Sol. Do – Mi – Sol. C'est l'accord de Do majeur, et tu viens de le construire au lieu de le retenir.",
      ],
    },
    {
      kind: "table",
      head: ["Rôle", "Note", "Écart avec la fondamentale"],
      rows: [
        ["Fondamentale", "Do", "—"],
        ["Tierce", "Mi", "4 demi-tons (tierce majeure)"],
        ["Quinte", "Sol", "7 demi-tons (quinte juste)"],
      ],
    },
    {
      kind: "heading",
      text: "Un demi-ton décide de tout",
    },
    {
      kind: "prose",
      paragraphs: [
        "Baisse la tierce d'un demi-ton : Do – Mi♭ – Sol. L'accord devient mineur. La fondamentale n'a pas bougé, la quinte non plus.",
        "C'est le seul point à retenir de toute cette leçon : la tierce décide de la couleur. Quatre demi-tons, c'est majeur. Trois, c'est mineur.",
        "Tu l'as déjà sous les doigts sans le savoir. Le passage de La majeur à La mineur consiste à reculer d'une seule case sur la corde de Si — et cette case, c'est la tierce.",
      ],
    },
    {
      kind: "chords",
      caption: "Touche-les : le seul doigt qui bouge entre les deux est celui de la tierce.",
      shapeIds: ["A", "Am"],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Même chose entre Mi et Mi mineur, ou entre Ré et Ré mineur. Cherche à chaque fois le doigt qui recule d'une case : c'est toujours la tierce.",
    },
    {
      kind: "chords",
      caption: "Les mêmes paires, à repérer à l'oreille et sous les doigts",
      shapeIds: ["E", "Em", "D", "Dm"],
    },
    {
      kind: "heading",
      text: "Ce que contient un accord ouvert",
    },
    {
      kind: "prose",
      paragraphs: [
        "Un accord ouvert ne contient que trois notes différentes, mais il en fait sonner cinq ou six : certaines sont doublées, à l'octave. C'est ce qui lui donne son ampleur.",
        "Do majeur en position ouverte, du grave à l'aigu : Do, Mi, Sol, Do, Mi. Trois notes, cinq cordes.",
      ],
    },
    {
      kind: "chords",
      caption: "Les formes ouvertes majeures. La croix signale une corde qu'on ne fait pas sonner.",
      shapeIds: ["C", "G", "E", "A", "D"],
    },
    {
      kind: "fretboard",
      caption: "Do majeur sur tout le manche — les mêmes trois notes, partout",
      spec: { root: "C", kind: "chordMaj", fromFret: 0, toFret: 12, labelMode: "degree" },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l6-e1",
        conceptId: "triade-construction",
        kind: "mcq",
        prompt: "Comment obtient-on les trois notes d'une triade ?",
        options: [
          "En prenant trois notes voisines de la gamme",
          "En empilant deux tierces depuis la fondamentale",
          "En prenant les trois premières notes de la gamme",
          "En jouant trois cordes à vide",
        ],
        answer: 1,
        explain: "Une note sur deux dans la gamme : fondamentale, tierce, quinte.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l6-e2",
        conceptId: "triade-qualite",
        kind: "mcq",
        prompt: "Qu'est-ce qui distingue un accord majeur d'un accord mineur ?",
        options: [
          "La fondamentale",
          "La quinte, abaissée d'un demi-ton",
          "La tierce, abaissée d'un demi-ton",
          "Le nombre de cordes jouées",
        ],
        answer: 2,
        explain: "La tierce, et elle seule. Quatre demi-tons pour majeur, trois pour mineur.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l6-e3",
        conceptId: "triade-qualite",
        kind: "fretFind",
        prompt: "Sur cet accord de La mineur, clique la tierce (celle qui le rend mineur).",
        spec: { root: "A", kind: "chordMin", fromFret: 0, toFret: 8, labelMode: "degree" },
        targetDegrees: [3],
        explain: "Do, trois demi-tons au-dessus de La. Un demi-ton de plus et l'accord redevient majeur.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l6-e4",
        conceptId: "accords-ouverts",
        kind: "mcq",
        prompt: "Dans l'accord ouvert de Do majeur, combien de notes DIFFÉRENTES sonnent ?",
        options: ["Trois", "Cinq", "Six", "Autant que de cordes"],
        answer: 0,
        explain: "Trois : Do, Mi, Sol. Elles sont doublées à l'octave, ce qui fait cinq cordes qui sonnent.",
      },
    },
  ],
};
