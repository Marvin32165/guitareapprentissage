import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "pentatoniques",
  order: 9,
  title: "Les cinq boîtes pentatoniques",
  goal: "Couvrir tout le manche avec cinq positions, et savoir laquelle utiliser sans réfléchir.",
  minutes: 14,
  concepts: ["penta-boites", "penta-relative"],
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "La pentatonique mineure, c'est la gamme mineure dont on a retiré les deux notes les plus fragiles : le 2e et le 6e degré. Il en reste cinq, d'où le nom.",
        "Ces deux notes retirées sont précisément celles qui sonnent faux si on les tient trop longtemps sur un accord. En les enlevant, on obtient une gamme où presque tout passe — c'est pour ça qu'elle est partout dans le blues et le rock.",
      ],
    },
    {
      kind: "table",
      head: ["Degré", "La mineur naturelle", "Pentatonique mineure"],
      rows: [
        ["1", "La", "La"],
        ["2", "Si", "— retiré"],
        ["♭3", "Do", "Do"],
        ["4", "Ré", "Ré"],
        ["5", "Mi", "Mi"],
        ["♭6", "Fa", "— retiré"],
        ["♭7", "Sol", "Sol"],
      ],
    },
    {
      kind: "heading",
      text: "Cinq positions qui pavent le manche",
    },
    {
      kind: "prose",
      paragraphs: [
        "Ces cinq notes se répètent le long du manche, et il existe exactement cinq façons de les regrouper sous la main. On les appelle des boîtes, et elles s'enchaînent : la fin de l'une est le début de la suivante.",
        "La boîte 1 est celle que presque tout le monde apprend en premier. Elle commence sur la fondamentale, corde de Mi grave.",
      ],
    },
    {
      kind: "fretboard",
      caption: "Boîte 1 de La mineur pentatonique — la position de départ",
      spec: { root: "A", kind: "box", boxIndex: 1, boxQuality: "minor", labelMode: "degree" },
    },
    {
      kind: "fretboard",
      caption: "Boîte 2 — elle commence là où la 1 finit",
      spec: { root: "A", kind: "box", boxIndex: 2, boxQuality: "minor", labelMode: "degree" },
    },
    {
      kind: "fretboard",
      caption: "Boîte 3",
      spec: { root: "A", kind: "box", boxIndex: 3, boxQuality: "minor", labelMode: "degree" },
    },
    {
      kind: "fretboard",
      caption: "Boîte 4",
      spec: { root: "A", kind: "box", boxIndex: 4, boxQuality: "minor", labelMode: "degree" },
    },
    {
      kind: "fretboard",
      caption: "Boîte 5 — après elle, la boîte 1 revient une octave plus haut",
      spec: { root: "A", kind: "box", boxIndex: 5, boxQuality: "minor", labelMode: "degree" },
    },
    {
      kind: "callout",
      tone: "warn",
      text: "Ne les apprends pas comme cinq dessins séparés. Cherche plutôt, sur chaque diagramme, où sont les fondamentales : c'est ce qui te dira toujours dans quelle tonalité tu es.",
    },
    {
      kind: "heading",
      text: "Majeure ou mineure, au choix",
    },
    {
      kind: "prose",
      paragraphs: [
        "La pentatonique de Do majeur contient exactement les mêmes cinq notes que celle de La mineur. C'est le même mécanisme que pour les gammes complètes : seul le point d'appui change.",
        "Concrètement, tu n'as pas deux jeux de boîtes à apprendre. Tu as les mêmes, jouées avec une fondamentale différente en tête. Sur un accompagnement en Do, appuie sur Do ; sur un accompagnement en La mineur, appuie sur La.",
      ],
    },
    {
      kind: "fretboard",
      caption: "Do majeur pentatonique — compare avec la boîte de La mineur plus haut",
      spec: { root: "C", kind: "pentaMajor", fromFret: 0, toFret: 12, labelMode: "note" },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l9-e1",
        conceptId: "penta-boites",
        kind: "mcq",
        prompt: "Quelles notes retire-t-on à la gamme mineure pour obtenir la pentatonique mineure ?",
        options: [
          "Les degrés 3 et 7",
          "Les degrés 2 et 6",
          "Les degrés 4 et 5",
          "Les degrés 1 et 8",
        ],
        answer: 1,
        explain: "Le 2e et le 6e. Ce sont eux qui sonnent le plus fragile tenus longtemps.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l9-e2",
        conceptId: "penta-boites",
        kind: "fretFind",
        prompt: "Dans la boîte 1 de La mineur, clique une fondamentale.",
        spec: { root: "A", kind: "box", boxIndex: 1, boxQuality: "minor", labelMode: "degree" },
        targetDegrees: [0],
        explain: "Repérer les fondamentales dans chaque boîte est ce qui permet de changer de tonalité sans tout réapprendre.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l9-e3",
        conceptId: "penta-boites",
        kind: "fretFind",
        prompt: "Dans la boîte 1, clique la septième mineure (le Sol).",
        spec: { root: "A", kind: "box", boxIndex: 1, boxQuality: "minor", labelMode: "degree" },
        targetDegrees: [10],
        explain: "Dix demi-tons au-dessus de La. C'est la note qui donne son goût de blues à la position.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l9-e4",
        conceptId: "penta-relative",
        kind: "mcq",
        prompt: "La pentatonique de Do majeur et celle de La mineur…",
        options: [
          "n'ont aucune note commune",
          "contiennent les mêmes cinq notes",
          "diffèrent d'une seule note",
          "ne se jouent pas dans les mêmes positions",
        ],
        answer: 1,
        explain: "Les mêmes cinq notes, les mêmes boîtes. Seule la fondamentale visée change.",
      },
    },
  ],
};
