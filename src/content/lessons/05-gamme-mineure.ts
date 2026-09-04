import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "gamme-mineure",
  order: 5,
  title: "La gamme mineure",
  goal: "Jouer une gamme mineure sans rien réapprendre, et comprendre pourquoi elle sonne sombre alors qu'elle contient les mêmes notes qu'une majeure.",
  minutes: 10,
  concepts: ["gamme-mineure", "relative-mineure"],
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Tu sais déjà construire une gamme majeure : T – T – ½ – T – T – T – ½. La mineure naturelle utilise les mêmes ingrédients, rangés autrement : T – ½ – T – T – ½ – T – T.",
        "Regarde où tombent les deux demi-tons. En majeur, entre les degrés 3–4 et 7–8. En mineur, entre 2–3 et 5–6. Tout est là : le demi-ton remonte, et c'est ce déplacement qu'on entend comme « triste ».",
      ],
    },
    {
      kind: "table",
      head: ["Degré", "Do majeur", "La mineur", "Écart"],
      rows: [
        ["1", "Do", "La", "—"],
        ["2", "Ré", "Si", "1 ton"],
        ["3", "Mi", "Do", "1/2 ton en mineur"],
        ["4", "Fa", "Ré", "1 ton"],
        ["5", "Sol", "Mi", "1 ton"],
        ["6", "La", "Fa", "1/2 ton en mineur"],
        ["7", "Si", "Sol", "1 ton"],
      ],
    },
    {
      kind: "heading",
      text: "Les mêmes notes, une autre porte d'entrée",
    },
    {
      kind: "prose",
      paragraphs: [
        "Do majeur : Do Ré Mi Fa Sol La Si. La mineur : La Si Do Ré Mi Fa Sol. Compare-les. Ce sont exactement les mêmes sept notes.",
        "Ce qui change, c'est la note sur laquelle on se repose. Joue la suite en partant de Do et en y revenant : ça sonne ouvert. Repars de La et reviens sur La : ça sonne sombre. Aucune note n'a bougé — seul le point d'appui a changé.",
        "On appelle La la relative mineure de Do. Elle se trouve toujours au 6e degré de la majeure, ou trois demi-tons sous la tonique.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Trois demi-tons sous la tonique majeure : Do → La, Sol → Mi, Ré → Si. Sur le manche, c'est trois cases plus bas sur la même corde.",
    },
    {
      kind: "fretboard",
      caption: "La mineur naturelle — les mêmes notes que Do majeur, un autre centre",
      spec: { root: "A", kind: "naturalMinor", fromFret: 0, toFret: 12, labelMode: "note" },
    },
    {
      kind: "fretboard",
      caption: "Do majeur, pour comparer : cherche une seule note qui diffère",
      spec: { root: "C", kind: "major", fromFret: 0, toFret: 12, labelMode: "note" },
    },
    {
      kind: "prose",
      paragraphs: [
        "Tu n'en trouveras pas. C'est le même diagramme, avec une couleur de fondamentale déplacée.",
      ],
    },
    {
      kind: "exercise",
      exercise: {
        id: "l5-e1",
        conceptId: "gamme-mineure",
        kind: "mcq",
        prompt: "Où tombent les demi-tons dans une gamme mineure naturelle ?",
        options: [
          "Entre les degrés 3–4 et 7–8",
          "Entre les degrés 2–3 et 5–6",
          "Entre les degrés 1–2 et 4–5",
          "Il n'y en a pas",
        ],
        answer: 1,
        explain: "2–3 et 5–6. En majeur ils sont en 3–4 et 7–8 : c'est ce décalage qu'on entend.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l5-e2",
        conceptId: "gamme-mineure",
        kind: "fretFind",
        prompt: "Sur cette gamme de La mineur, clique une tierce mineure (un Do).",
        spec: { root: "A", kind: "naturalMinor", fromFret: 0, toFret: 12, labelMode: "degree" },
        targetDegrees: [3],
        explain: "Trois demi-tons au-dessus de La. C'est cette tierce abaissée qui fait le caractère mineur.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l5-e3",
        conceptId: "relative-mineure",
        kind: "mcq",
        prompt: "Quelle est la relative mineure de Sol majeur ?",
        options: ["La mineur", "Mi mineur", "Ré mineur", "Si mineur"],
        answer: 1,
        explain: "Trois demi-tons sous Sol : Mi. Sol majeur et Mi mineur partagent le même Fa♯.",
      },
    },
    {
      kind: "corpus",
      mode: "minor",
      degres: ["i", "VI", "III", "VII"],
      legende: "Une progression mineure très répandue",
    },
    {
      kind: "exercise",
      exercise: {
        id: "l5-e4",
        conceptId: "relative-mineure",
        kind: "mcq",
        prompt: "Do majeur et La mineur contiennent…",
        options: [
          "des notes complètement différentes",
          "exactement les mêmes sept notes",
          "les mêmes notes sauf une",
          "les mêmes notes mais une octave plus bas",
        ],
        answer: 1,
        explain: "Les mêmes sept notes. Seule la note de repos change, et ça suffit à changer la couleur.",
      },
    },
  ],
};
