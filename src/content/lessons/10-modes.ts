import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "modes",
  order: 10,
  title: "Les modes",
  goal: "Comprendre ce qu'est un mode sans mystère, et savoir quelle note écouter pour le reconnaître.",
  minutes: 14,
  concepts: ["modes", "modes-couleur"],
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Tu connais déjà le mécanisme : Do majeur et La mineur contiennent les mêmes notes, et seule la note de repos change. Les modes, c'est ce même principe poussé jusqu'au bout — il y a sept notes, donc sept points d'appui possibles.",
        "Chaque point d'appui donne un mode. Ils portent des noms grecs, ce qui les fait passer pour compliqués, mais l'idée tient en une phrase : mêmes notes, autre centre.",
      ],
    },
    {
      kind: "table",
      head: ["Degré de départ", "Mode", "Depuis Do", "Caractère"],
      rows: [
        ["1", "Ionien", "Do → Do", "C'est la gamme majeure"],
        ["2", "Dorien", "Ré → Ré", "Mineur, mais avec une 6e claire"],
        ["3", "Phrygien", "Mi → Mi", "Mineur sombre, 2e abaissée"],
        ["4", "Lydien", "Fa → Fa", "Majeur avec une 4e augmentée, flottant"],
        ["5", "Mixolydien", "Sol → Sol", "Majeur avec une 7e mineure"],
        ["6", "Éolien", "La → La", "C'est la gamme mineure naturelle"],
        ["7", "Locrien", "Si → Si", "Instable, très peu utilisé"],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Deux de ces sept modes te sont déjà familiers : l'ionien est la gamme majeure, l'éolien la gamme mineure naturelle. Il n'en reste que cinq à découvrir.",
    },
    {
      kind: "heading",
      text: "La note qui fait la différence",
    },
    {
      kind: "prose",
      paragraphs: [
        "Comparer sept gammes note à note est décourageant. Il y a plus simple : chaque mode se distingue de son voisin le plus proche par UNE note.",
        "Le dorien est un mineur dont la sixte est majeure au lieu d'être mineure. C'est la seule différence avec l'éolien, et c'est ce qui lui donne son côté moins triste.",
        "Le mixolydien est un majeur dont la septième est mineure. Une seule note change par rapport à l'ionien, et l'accord de septième qui en découle est la base de tout le blues et du rock.",
        "Le lydien est un majeur dont la quarte est augmentée. Cette note, à un demi-ton au-dessus de la quarte juste, produit une impression de flottement.",
      ],
    },
    {
      kind: "table",
      head: ["Mode", "Comparé à…", "La note à écouter"],
      rows: [
        ["Dorien", "gamme mineure", "6e majeure au lieu de mineure"],
        ["Phrygien", "gamme mineure", "2e mineure au lieu de majeure"],
        ["Lydien", "gamme majeure", "4e augmentée au lieu de juste"],
        ["Mixolydien", "gamme majeure", "7e mineure au lieu de majeure"],
      ],
    },
    {
      kind: "fretboard",
      caption: "Ré dorien : ce sont les notes de Do majeur, mais avec Ré comme repos",
      spec: { root: "C", kind: "major", fromFret: 0, toFret: 12, labelMode: "note" },
    },
    {
      kind: "prose",
      paragraphs: [
        "Le diagramme ci-dessus est celui de Do majeur — et c'est bien le sujet. Pour jouer en Ré dorien, tu n'apprends aucune nouvelle position : tu joues ces notes-là en revenant sur Ré, et de préférence sur un accompagnement construit sur Ré mineur.",
        "C'est là qu'est le piège des modes : sans accompagnement pour poser le centre, un mode ne s'entend pas. Joue les notes de Do majeur en boucle et tu entendras du Do majeur, quelle que soit ton intention.",
      ],
    },
    {
      kind: "callout",
      tone: "warn",
      text: "Un mode n'existe que par contexte. Sur un accord de Ré mineur qui dure, ces mêmes notes deviennent du dorien. Sans lui, elles restent du Do majeur.",
    },
    {
      kind: "chords",
      caption: "Fais l'essai : laisse sonner Ré mineur, puis joue les notes de Do majeur en revenant sur Ré.",
      shapeIds: ["Dm"],
    },
    {
      kind: "exercise",
      exercise: {
        id: "l10-e1",
        conceptId: "modes",
        kind: "mcq",
        prompt: "Qu'est-ce qui distingue deux modes issus de la même gamme ?",
        options: [
          "Les notes utilisées",
          "La note qui sert de point de repos",
          "Le tempo",
          "Le nombre de notes",
        ],
        answer: 1,
        explain: "Les notes sont identiques. Seul le centre tonal change, et ça suffit à changer la couleur.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l10-e2",
        conceptId: "modes",
        kind: "mcq",
        prompt: "Quel mode obtient-on en partant du 5e degré d'une gamme majeure ?",
        options: ["Dorien", "Lydien", "Mixolydien", "Locrien"],
        answer: 2,
        explain: "Le mixolydien : un majeur à septième mineure. Depuis Do, c'est Sol → Sol.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l10-e3",
        conceptId: "modes-couleur",
        kind: "mcq",
        prompt: "Le dorien se distingue de la gamme mineure naturelle par…",
        options: [
          "sa tierce, qui devient majeure",
          "sa sixte, qui devient majeure",
          "sa septième, qui devient majeure",
          "sa quinte, qui devient diminuée",
        ],
        answer: 1,
        explain: "La sixte majeure. C'est la seule note qui change, et c'est elle qu'on entend.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l10-e4",
        conceptId: "modes-couleur",
        kind: "fretFind",
        prompt: "Voici les notes de Do majeur, numérotées depuis Fa — c'est-à-dire Fa lydien. Clique une quarte augmentée (le Si).",
        spec: {
          root: "C",
          kind: "major",
          degreeRoot: "F",
          fromFret: 0,
          toFret: 12,
          labelMode: "degree",
        },
        targetDegrees: [6],
        explain: "Six demi-tons au-dessus de Fa : la quarte augmentée. Elle n'existe dans aucune gamme majeure — c'est le décalage du centre qui la fait apparaître, et c'est elle qui donne au lydien son flottement.",
      },
    },
  ],
};
