import type { Lesson } from "./types";

export const lesson: Lesson = {
  slug: "notes-sur-le-manche",
  order: 1,
  title: "Les notes sur le manche",
  goal: "Nommer n'importe quelle note sur les cordes de Mi grave et de La, et savoir pourquoi Mi–Fa et Si–Do sont collés.",
  minutes: 8,
  concepts: ["notes-alterees", "notes-manche", "octave"],
  blocks: [
    {
      kind: "prose",
      paragraphs: [
        "Tes doigts connaissent déjà le manche. Ce qui manque, c'est le nom de ce que tu joues. On commence par là, parce que tout le reste s'y accroche.",
        "Il n'existe que sept noms de notes : Do Ré Mi Fa Sol La Si (C D E F G A B). Après Si, on repart à Do. C'est une boucle, pas une échelle qui monte indéfiniment.",
        "Sur une guitare, une frette = un demi-ton. Douze frettes = une octave : la note de la 12e case porte le même nom que la corde à vide.",
      ],
    },
    { kind: "heading", text: "Le piège des deux demi-tons naturels" },
    {
      kind: "prose",
      paragraphs: [
        "Entre la plupart des notes voisines il y a un ton, soit deux frettes, et une note altérée se glisse au milieu (le dièse ♯ monte d'un demi-ton, le bémol ♭ descend d'un demi-ton).",
        "Sauf à deux endroits : entre Mi et Fa, et entre Si et Do, il n'y a qu'un demi-ton. Une seule frette. Rien entre les deux.",
      ],
    },
    {
      kind: "table",
      head: ["De", "À", "Écart", "Note au milieu ?"],
      rows: [
        ["Do (C)", "Ré (D)", "1 ton", "Do♯ / Ré♭"],
        ["Ré (D)", "Mi (E)", "1 ton", "Ré♯ / Mi♭"],
        ["Mi (E)", "Fa (F)", "1/2 ton", "aucune"],
        ["Fa (F)", "Sol (G)", "1 ton", "Fa♯ / Sol♭"],
        ["Sol (G)", "La (A)", "1 ton", "Sol♯ / La♭"],
        ["La (A)", "Si (B)", "1 ton", "La♯ / Si♭"],
        ["Si (B)", "Do (C)", "1/2 ton", "aucune"],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Retiens ces deux paires : Mi–Fa et Si–Do. C'est la seule irrégularité de tout le système, et elle explique presque tout ce qui suivra.",
    },
    { kind: "heading", text: "Sur la corde de Mi grave (6e)" },
    {
      kind: "prose",
      paragraphs: [
        "Voici les notes naturelles (sans dièse ni bémol) sur ta corde la plus grave. Touche-les : chacune sonne et affiche son nom.",
        "Repère l'écart d'une seule frette entre Mi (0) et Fa (1), puis entre Si (7) et Do (8). Partout ailleurs, deux frettes.",
      ],
    },
    {
      kind: "fretboard",
      caption: "Notes naturelles sur la corde de Mi grave",
      spec: { root: "C", kind: "major", onlyStringIndexes: [0], fromFret: 0, toFret: 12, labelMode: "note" },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l1-e1",
        conceptId: "notes-alterees",
        kind: "mcq",
        prompt: "Entre quelles paires de notes n'y a-t-il PAS de note altérée ?",
        options: ["Do–Ré et Sol–La", "Mi–Fa et Si–Do", "Fa–Sol et La–Si", "Ré–Mi et Do–Ré"],
        answer: 1,
        explain: "Mi–Fa et Si–Do sont séparés d'un seul demi-ton : une frette, rien au milieu.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l1-e2",
        conceptId: "notes-manche",
        kind: "fretFind",
        prompt: "Sur la corde de Mi grave, clique le La (A).",
        spec: { root: "C", kind: "major", onlyStringIndexes: [0], fromFret: 0, toFret: 12, labelMode: "note" },
        targetPcs: [9],
        onlyStringIndex: 0,
        explain: "La se trouve à la 5e frette de la corde de Mi grave — le repère que tu utilises pour accorder la corde de La.",
      },
    },
    { kind: "heading", text: "Sur la corde de La (5e)" },
    {
      kind: "prose",
      paragraphs: [
        "Même logique, point de départ différent. Ces deux cordes suffisent pour placer la plupart des accords barrés : c'est pour ça qu'on les apprend en premier.",
      ],
    },
    {
      kind: "fretboard",
      caption: "Notes naturelles sur la corde de La",
      spec: { root: "C", kind: "major", onlyStringIndexes: [1], fromFret: 0, toFret: 12, labelMode: "note" },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l1-e3",
        conceptId: "notes-manche",
        kind: "fretFind",
        prompt: "Sur la corde de La, clique le Do (C).",
        spec: { root: "C", kind: "major", onlyStringIndexes: [1], fromFret: 0, toFret: 12, labelMode: "note" },
        targetPcs: [0],
        onlyStringIndex: 1,
        explain: "Do est à la 3e frette de la corde de La : la fondamentale de ton accord de Do barré.",
      },
    },
    {
      kind: "exercise",
      exercise: {
        id: "l1-e4",
        conceptId: "octave",
        kind: "mcq",
        prompt: "Combien de frettes séparent une note de son octave ?",
        options: ["7", "10", "12", "5"],
        answer: 2,
        explain: "Douze demi-tons = une octave. La 12e case sonne comme la corde à vide, une octave plus haut.",
      },
    },
  ],
};
