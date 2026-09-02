import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "intervalles",
  order: 2,
  title: "Les intervalles",
  goal: "Mesurer la distance entre deux notes, et reconnaître à l'œil les formes d'octave, de quinte et de tierce sur le manche.",
  minutes: 10,
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Un intervalle, c'est la distance entre deux notes. Rien de plus. Sur une guitare c'est immédiat : une frette = un demi-ton, donc un intervalle se compte en frettes.",
        "Chaque intervalle a deux informations : un chiffre (seconde, tierce, quarte…) qui compte les noms de notes, et une qualité (majeure, mineure, juste) qui précise la taille exacte.",
      ],
    },
    {
      kind: "table",
      head: ["Demi-tons", "Intervalle", "Exemple depuis Do"],
      rows: [
        ["1", "Seconde mineure", "Do → Ré♭"],
        ["2", "Seconde majeure", "Do → Ré"],
        ["3", "Tierce mineure", "Do → Mi♭"],
        ["4", "Tierce majeure", "Do → Mi"],
        ["5", "Quarte juste", "Do → Fa"],
        ["6", "Triton", "Do → Fa♯"],
        ["7", "Quinte juste", "Do → Sol"],
        ["8", "Sixte mineure", "Do → La♭"],
        ["9", "Sixte majeure", "Do → La"],
        ["10", "Septième mineure", "Do → Si♭"],
        ["11", "Septième majeure", "Do → Si"],
        ["12", "Octave", "Do → Do"],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Les trois à retenir en priorité : la tierce (3 ou 4 demi-tons) décide si ça sonne mineur ou majeur. La quinte (7) est le pilier. L'octave (12), c'est la même note.",
    },
    { kind: "heading", text: "Les formes sur le manche" },
    {
      kind: "prose",
      paragraphs: [
        "L'intérêt de la guitare : un intervalle est une FORME, la même partout. Depuis une fondamentale sur la corde de Mi grave :",
        "L'octave : deux cordes plus haut, deux frettes plus loin. La quinte juste : une corde plus haut, deux frettes plus loin. La tierce majeure : une corde plus haut, une frette en arrière.",
        "Ci-dessous un accord de Do majeur affiché en degrés : 1 = fondamentale, 3 = tierce, 5 = quinte. Repère les formes, puis touche les notes pour les entendre.",
      ],
    },
    {
      kind: "fretboard",
      caption: "Do majeur — fondamentale, tierce et quinte sur tout le manche",
      spec: { root: "C", kind: "chordMaj", fromFret: 0, toFret: 12, labelMode: "degree" },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l2-e1",
        kind: "mcq",
        prompt: "Combien de demi-tons contient une quinte juste ?",
        options: ["5", "6", "7", "8"],
        answer: 2,
        explain: "Sept demi-tons. Sur le manche : une corde plus haut, deux frettes plus loin.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l2-e2",
        kind: "mcq",
        prompt: "Do → Mi, quel intervalle ?",
        options: ["Tierce mineure", "Tierce majeure", "Quarte juste", "Seconde majeure"],
        answer: 1,
        explain: "Quatre demi-tons (Do, Do♯, Ré, Ré♯, Mi) : tierce majeure. C'est elle qui rend l'accord majeur.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l2-e3",
        kind: "fretFind",
        prompt: "Sur ce Do majeur, clique une quinte (un Sol).",
        spec: { root: "C", kind: "chordMaj", fromFret: 0, toFret: 12, labelMode: "degree" },
        targetDegrees: [7],
        explain: "La quinte de Do est Sol, à 7 demi-tons. C'est la note la plus stable de l'accord après la fondamentale.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l2-e4",
        kind: "fretFind",
        prompt: "Maintenant clique une tierce (un Mi).",
        spec: { root: "C", kind: "chordMaj", fromFret: 0, toFret: 12, labelMode: "degree" },
        targetDegrees: [4],
        explain: "Mi est la tierce majeure de Do. Baisse-la d'une frette (Mi♭) et l'accord devient mineur.",
      },
    },
  ],
};
