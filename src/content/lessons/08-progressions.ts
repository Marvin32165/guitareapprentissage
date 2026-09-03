import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "progressions",
  order: 8,
  title: "Les enchaînements qui reviennent",
  goal: "Reconnaître les quelques progressions qui portent l'essentiel du répertoire, et entendre pourquoi elles fonctionnent.",
  minutes: 12,
  concepts: ["progressions", "cadence-v-i"],
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Une poignée d'enchaînements revient dans des milliers de morceaux. Ce n'est pas un manque d'imagination : ces suites créent une attente puis la satisfont, et l'oreille y est sensible avant toute connaissance.",
        "En chiffres romains, elles se retiennent d'un coup et se transposent partout.",
      ],
    },
    {
      kind: "table",
      head: ["Progression", "En Sol majeur", "Ce qu'on entend"],
      rows: [
        ["I – V – vi – IV", "Sol – Ré – Mi m – Do", "Le tour de chant par excellence"],
        ["I – vi – IV – V", "Sol – Mi m – Do – Ré", "Tourne en boucle sans jamais s'arrêter"],
        ["ii – V – I", "La m – Ré – Sol", "La cadence du jazz : tension, puis repos"],
        ["I – IV – V", "Sol – Do – Ré", "Le blues et le rock à trois accords"],
      ],
    },
    {
      kind: "chords",
      caption: "Les cinq formes dont sortent toutes les grilles ci-dessus. Joue-les dans l'ordre I – V – vi – IV : Sol, Ré, Mi m, Do.",
      shapeIds: ["G", "D", "Em", "C"],
    },
    {
      kind: "heading",
      text: "Le V appelle le I",
    },
    {
      kind: "prose",
      paragraphs: [
        "Le cinquième degré est l'accord le plus instable de la tonalité, et c'est pour ça qu'il est utile. Il contient la sensible — le 7e degré de la gamme, à un demi-ton sous la tonique.",
        "En Do majeur, l'accord de Sol contient un Si. Ce Si « tire » vers le Do de toutes ses forces. Joue Sol puis Do : tu entends la résolution. Joue Sol et arrête-toi : c'est resté en l'air.",
        "C'est le mécanisme le plus rentable de toute l'harmonie tonale, et tu peux le vérifier à la guitare en dix secondes.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Essaie maintenant : plaque Ré, puis Sol. Puis Ré, et arrête-toi. La différence que tu entends, c'est la cadence.",
    },
    {
      kind: "chords",
      caption: "V puis I en Sol majeur : Ré, puis Sol",
      shapeIds: ["D", "G"],
    },
    {
      kind: "fretboard",
      caption: "L'accord de Sol, Ve degré de Do majeur : le Si qu'il contient est la sensible",
      spec: { root: "G", kind: "chordMaj", fromFret: 0, toFret: 10, labelMode: "note" },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l8-e1",
        conceptId: "progressions",
        kind: "mcq",
        prompt: "Que donne I – V – vi – IV en Do majeur ?",
        options: [
          "Do – Sol – La m – Fa",
          "Do – Fa – Sol – La m",
          "Do – Sol – La – Fa",
          "Do – Mi m – Fa – Sol",
        ],
        answer: 0,
        explain: "I=Do, V=Sol, vi=La mineur, IV=Fa. La minuscule du vi signale le mineur.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l8-e2",
        conceptId: "cadence-v-i",
        kind: "mcq",
        prompt: "Pourquoi le Ve degré « appelle » le Ier ?",
        options: [
          "Parce qu'il est plus grave",
          "Parce qu'il contient la sensible, à un demi-ton de la tonique",
          "Parce qu'il se joue plus fort",
          "Par convention, sans raison acoustique",
        ],
        answer: 1,
        explain: "La sensible est à un demi-ton sous la tonique : c'est cette proximité qui crée l'attente.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l8-e3",
        conceptId: "cadence-v-i",
        kind: "fretFind",
        prompt: "Dans l'accord de Sol majeur, clique la sensible de Do majeur (le Si).",
        spec: { root: "G", kind: "chordMaj", fromFret: 0, toFret: 10, labelMode: "note" },
        targetPcs: [11],
        explain: "Si, la tierce de l'accord de Sol. C'est elle qui tire vers Do et crée la résolution.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l8-e4",
        conceptId: "progressions",
        kind: "mcq",
        prompt: "Un morceau utilise La m – Ré – Sol. De quelle progression s'agit-il, et dans quelle tonalité ?",
        options: [
          "I – IV – V en La",
          "ii – V – I en Sol",
          "vi – IV – I en Ré",
          "I – V – vi en La mineur",
        ],
        answer: 1,
        explain: "En Sol majeur : La m est le ii, Ré le V, Sol le I. La cadence la plus utilisée du jazz.",
      },
    },
  ],
};
