import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "gamme-majeure",
  order: 3,
  title: "La gamme majeure",
  goal: "Construire n'importe quelle gamme majeure avec une seule formule, et comprendre d'où viennent les dièses d'une tonalité.",
  minutes: 10,
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "La gamme majeure n'est pas une liste à apprendre par cœur : c'est un patron d'écarts. Un seul, valable dans les douze tonalités.",
        "La formule, en tons (T) et demi-tons (½) : T – T – ½ – T – T – T – ½.",
        "Applique-la depuis Do et tu tombes sur les sept notes naturelles, sans aucune altération. Ce n'est pas un hasard : c'est parce que Mi–Fa et Si–Do sont déjà des demi-tons naturels, et qu'ils tombent pile aux bons endroits.",
      ],
    },
    {
      kind: "table",
      head: ["Degré", "Note", "Écart avec la précédente"],
      rows: [
        ["1", "Do (C)", "—"],
        ["2", "Ré (D)", "1 ton"],
        ["3", "Mi (E)", "1 ton"],
        ["4", "Fa (F)", "1/2 ton"],
        ["5", "Sol (G)", "1 ton"],
        ["6", "La (A)", "1 ton"],
        ["7", "Si (B)", "1 ton"],
        ["8", "Do (C)", "1/2 ton"],
      ],
    },
    {
      kind: "fretboard",
      caption: "Gamme de Do majeur sur tout le manche",
      spec: { root: "C", kind: "major", fromFret: 0, toFret: 12, labelMode: "note" },
    },
    { kind: "heading", text: "Change de tonique, garde la formule" },
    {
      kind: "prose",
      paragraphs: [
        "Pars de Sol et applique exactement la même suite d'écarts : Sol, La, Si, Do, Ré, Mi… et là, il faut un ton entre le 6e et le 7e degré, puis un demi-ton pour retomber sur Sol. Fa naturel ne convient pas : il faut Fa♯.",
        "C'est toute l'origine des armures. Une tonalité n'a pas de dièses « parce que c'est comme ça » : elle en a exactement ce qu'il faut pour conserver le patron.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Sol majeur = Sol La Si Do Ré Mi Fa♯. Un seul dièse, et il est imposé par la formule.",
    },
    {
      kind: "fretboard",
      caption: "Gamme de Sol majeur — repère le Fa♯",
      spec: { root: "G", kind: "major", fromFret: 0, toFret: 12, labelMode: "note" },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l3-e1",
        kind: "mcq",
        prompt: "Quelle est la formule de la gamme majeure ?",
        options: [
          "T – ½ – T – T – ½ – T – T",
          "T – T – ½ – T – T – T – ½",
          "T – T – T – ½ – T – T – ½",
          "½ – T – T – T – ½ – T – T",
        ],
        answer: 1,
        explain: "T T ½ T T T ½. Les deux demi-tons tombent entre les degrés 3–4 et 7–8.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l3-e2",
        kind: "mcq",
        prompt: "Quelle note est altérée dans la gamme de Sol majeur ?",
        options: ["Do♯", "Si♭", "Fa♯", "Mi♭"],
        answer: 2,
        explain: "Fa♯, le 7e degré. Sans lui, l'écart avec Sol serait d'un ton au lieu d'un demi-ton.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l3-e3",
        kind: "fretFind",
        prompt: "Sur la gamme de Sol majeur, clique le 7e degré (la sensible, Fa♯).",
        spec: { root: "G", kind: "major", fromFret: 0, toFret: 12, labelMode: "degree" },
        targetDegrees: [11],
        explain: "Le 7e degré est à un demi-ton sous la tonique : il « appelle » Sol. D'où son nom de sensible.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l3-e4",
        kind: "mcq",
        prompt: "Quel est le 3e degré de la gamme de Do majeur ?",
        options: ["Ré", "Mi", "Fa", "Sol"],
        answer: 1,
        explain: "Do, Ré, Mi : le 3e degré est Mi. C'est la tierce qui rend l'accord de Do majeur… majeur.",
      },
    },
  ],
};
