import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "tensions",
  order: 11,
  title: "Les septièmes",
  goal: "Ajouter une quatrième note à tes accords, et savoir laquelle appelle une résolution et laquelle se pose.",
  minutes: 12,
  concepts: ["septiemes", "tensions-usage"],
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Une triade empile deux tierces. Rien n'empêche d'en empiler une troisième : on obtient un accord de quatre notes, dit de septième.",
        "Sur Do, dans la gamme de Do majeur : Do – Mi – Sol – Si. La quatrième note, Si, est à onze demi-tons de la fondamentale — une septième majeure.",
      ],
    },
    {
      kind: "table",
      head: ["Accord", "Notes depuis Do", "Écart de la 7e", "Ce qu'on entend"],
      rows: [
        ["Do maj7", "Do Mi Sol Si", "11 demi-tons", "Doux, posé, un peu rêveur"],
        ["Do 7", "Do Mi Sol Si♭", "10 demi-tons", "Tendu, appelle une suite"],
        ["Do m7", "Do Mi♭ Sol Si♭", "10 demi-tons", "Mineur adouci"],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Un seul demi-ton sépare maj7 et 7, et il change complètement l'usage : le premier se pose, le second réclame une résolution.",
    },
    {
      kind: "heading",
      text: "L'accord de septième de dominante",
    },
    {
      kind: "prose",
      paragraphs: [
        "Harmonise la gamme majeure en accords de quatre notes et une chose apparaît : un seul degré donne un accord « 7 » avec septième mineure — le Ve.",
        "En Do majeur, c'est Sol 7 : Sol – Si – Ré – Fa. Cet accord contient à la fois la sensible (Si, qui tire vers Do) et le Fa, qui tire vers Mi. Deux notes en tension simultanée, qui se résolvent ensemble sur l'accord de Do.",
        "C'est pour ça que Sol 7 → Do est la cadence la plus forte de la musique tonale, et pourquoi le blues, qui empile ces accords sans jamais tout résoudre, tient debout tout seul.",
      ],
    },
    {
      kind: "chords",
      caption: "Trois septièmes de dominante en position ouverte. Chacune appelle un accord quatre degrés plus haut : E7 → A, A7 → D, D7 → G.",
      shapeIds: ["E7", "A7", "D7"],
    },
    {
      kind: "prose",
      paragraphs: [
        "Fais l'essai : plaque E7, puis La mineur ou La majeur. Puis plaque E7 et arrête-toi. La tension est beaucoup plus nette qu'avec un simple Mi majeur.",
      ],
    },
    {
      kind: "chords",
      caption: "E7 puis A : la résolution la plus courante du blues",
      shapeIds: ["E7", "A"],
    },
    {
      kind: "fretboard",
      caption: "L'accord de Sol 7, Ve degré de Do majeur — repère le Fa, la septième",
      spec: { root: "G", kind: "chordMaj", fromFret: 0, toFret: 10, labelMode: "note" },
    },
    {
      kind: "prose",
      paragraphs: [
        "Le diagramme montre la triade de Sol : Sol, Si, Ré. Ajoute-lui un Fa et tu obtiens Sol 7. Sur la guitare, ce Fa est souvent la note la plus aiguë de l'accord — c'est elle qu'on entend « pencher ».",
      ],
    },
    {
      kind: "exercise",
      exercise: {
        id: "l11-e1",
        conceptId: "septiemes",
        kind: "mcq",
        prompt: "Comment obtient-on un accord de septième ?",
        options: [
          "En doublant la fondamentale",
          "En empilant une tierce de plus sur la triade",
          "En retirant la quinte",
          "En jouant sept cordes",
        ],
        answer: 1,
        explain: "Une tierce supplémentaire au-dessus de la quinte : fondamentale, tierce, quinte, septième.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l11-e2",
        conceptId: "septiemes",
        kind: "mcq",
        prompt: "Qu'est-ce qui différencie Do maj7 de Do 7 ?",
        options: [
          "La tierce",
          "La quinte",
          "La septième : majeure dans l'un, mineure dans l'autre",
          "Rien, ce sont deux notations du même accord",
        ],
        answer: 2,
        explain: "Un demi-ton sur la septième : Si pour maj7, Si♭ pour 7. Et ça change tout leur usage.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l11-e3",
        conceptId: "tensions-usage",
        kind: "mcq",
        prompt: "Dans une tonalité majeure, quel degré donne l'accord de septième de dominante ?",
        options: ["Le Ier", "Le IVe", "Le Ve", "Le VIe"],
        answer: 2,
        explain: "Le Ve, et lui seul. C'est ce qui en fait un repère : entendre un accord « 7 » désigne la dominante.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l11-e4",
        conceptId: "tensions-usage",
        kind: "fretFind",
        prompt: "Voici les notes de Do majeur numérotées depuis Sol. Clique une septième mineure (le Fa) — la note qui met Sol 7 en tension.",
        spec: {
          root: "C",
          kind: "major",
          degreeRoot: "G",
          fromFret: 0,
          toFret: 12,
          labelMode: "degree",
        },
        targetDegrees: [10],
        explain: "Fa, dix demi-tons au-dessus de Sol. Avec le Si de l'accord, il forme l'intervalle qui réclame Do.",
      },
    },
  ],
};
