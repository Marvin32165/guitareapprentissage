import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "caged",
  order: 4,
  title: "Le système CAGED",
  goal: "Comprendre pourquoi le manche se découpe en cinq positions qui se répètent, et savoir où sont les fondamentales dans chacune.",
  minutes: 12,
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Tu connais déjà cinq formes d'accords ouverts : Do, La, Sol, Mi, Ré. En anglais : C, A, G, E, D. Mets-les dans cet ordre et tu obtiens le mot CAGED.",
        "L'idée du système tient en une phrase : ces cinq formes, déplacées le long du manche, couvrent tout le manche sans trou et se raccordent toujours dans le même ordre — C, A, G, E, D, puis on recommence.",
        "Concrètement : si tu joues un Do en forme de C en position ouverte, la forme suivante qui te donne un Do en montant est la forme de A, puis celle de G, puis de E, puis de D, puis à nouveau C une octave plus haut.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "CAGED n'est pas cinq accords : c'est une carte. Elle sert autant pour les accords que pour les gammes et les arpèges, qui se calquent sur les mêmes positions.",
    },
    { kind: "heading", text: "Les cinq positions, concrètement" },
    {
      kind: "prose",
      paragraphs: [
        "Le plus simple pour sentir ce découpage est de le voir sur une pentatonique, dont les cinq boîtes s'alignent exactement sur les cinq positions CAGED.",
        "Voici la pentatonique majeure de Do, boîte par boîte. Les fondamentales (Do) sont en vert. Passe d'une boîte à l'autre : tu verras qu'elles partagent des notes à leurs extrémités — c'est comme ça qu'on relie les positions.",
      ],
    },
    {
      kind: "fretboard",
      caption: "Position 1 — fondamentale sur la 6e corde (forme de E)",
      spec: { root: "C", kind: "box", boxQuality: "major", boxIndex: 1, labelMode: "note" },
    },
    {
      kind: "fretboard",
      caption: "Position 2 — la suivante en montant",
      spec: { root: "C", kind: "box", boxQuality: "major", boxIndex: 2, labelMode: "note" },
    },
    {
      kind: "fretboard",
      caption: "Position 3",
      spec: { root: "C", kind: "box", boxQuality: "major", boxIndex: 3, labelMode: "note" },
    },
    {
      kind: "fretboard",
      caption: "Position 4",
      spec: { root: "C", kind: "box", boxQuality: "major", boxIndex: 4, labelMode: "note" },
    },
    {
      kind: "fretboard",
      caption: "Position 5 — puis on reboucle sur la position 1, une octave plus haut",
      spec: { root: "C", kind: "box", boxQuality: "major", boxIndex: 5, labelMode: "note" },
    },
    { kind: "heading", text: "Où sont les fondamentales" },
    {
      kind: "prose",
      paragraphs: [
        "C'est le seul repère qui compte vraiment au début : dans chaque position, sache où tombe la fondamentale. Deux formes ont leur fondamentale sur la corde de Mi grave (E et G), deux sur la corde de La (C et A), une sur la corde de Ré (D).",
        "Tant que tu sais où est la fondamentale, tu sais dans quelle tonalité tu es, où que tu sois sur le manche.",
      ],
    },
    {
      kind: "table",
      head: ["Forme", "Fondamentale principale", "Accord ouvert de départ"],
      rows: [
        ["C", "Corde de La (5e)", "Do ouvert"],
        ["A", "Corde de La (5e)", "La ouvert"],
        ["G", "Corde de Mi grave (6e)", "Sol ouvert"],
        ["E", "Corde de Mi grave (6e)", "Mi ouvert"],
        ["D", "Corde de Ré (4e)", "Ré ouvert"],
      ],
    },
    {
      kind: "exercise",
      exercise: {
        id: "l4-e1",
        kind: "mcq",
        prompt: "Dans quel ordre les cinq formes s'enchaînent-elles en montant le manche ?",
        options: ["C – A – G – E – D", "C – D – E – G – A", "E – A – D – G – C", "G – C – E – A – D"],
        answer: 0,
        explain: "C, A, G, E, D — l'ordre donne son nom au système, et il boucle indéfiniment.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l4-e2",
        kind: "mcq",
        prompt: "Combien de positions faut-il pour couvrir tout le manche ?",
        options: ["3", "5", "7", "12"],
        answer: 1,
        explain: "Cinq. Au-delà, on retombe sur la première une octave plus haut.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l4-e3",
        kind: "fretFind",
        prompt: "Dans la position 1, clique une fondamentale (un Do).",
        spec: { root: "C", kind: "box", boxQuality: "major", boxIndex: 1, labelMode: "note" },
        targetDegrees: [0],
        explain: "Repérer la fondamentale dans chaque position, c'est ce qui transforme une forme mémorisée en outil utilisable.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l4-e4",
        kind: "mcq",
        prompt: "Quelle forme a sa fondamentale sur la corde de Ré (4e) ?",
        options: ["La forme de C", "La forme de G", "La forme de D", "La forme de E"],
        answer: 2,
        explain: "La forme de D. Les formes E et G s'appuient sur la 6e corde, C et A sur la 5e.",
      },
    },
  ],
};
