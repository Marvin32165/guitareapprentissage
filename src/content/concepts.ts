// Registre des notions enseignées.
//
// Une notion n'est pas une leçon : une leçon en introduit plusieurs, et une
// même notion est retravaillée par des exercices de leçons ultérieures. C'est
// la notion, pas l'exercice, qui doit être révisée — la répétition espacée
// (phase 7) planifie donc sur cet identifiant.
//
// Déclarer les prérequis ici permet de vérifier automatiquement qu'aucune
// leçon ne s'appuie sur une notion enseignée plus tard : sur un parcours qu'on
// suit seul, dans l'ordre, c'est une erreur qui coûte cher.

export const CONCEPTS = {
  "notes-alterees": {
    label: "Notes altérées et demi-tons naturels",
    summary: "Où se trouvent les dièses et bémols, et pourquoi Mi–Fa et Si–Do n'en ont pas.",
    requires: [],
  },
  "notes-manche": {
    label: "Repérage des notes sur le manche",
    summary: "Nommer une note à partir de sa corde et de sa case.",
    requires: ["notes-alterees"],
  },
  octave: {
    label: "Octave",
    summary: "12 frettes, même note ; les formes se répètent.",
    requires: ["notes-alterees"],
  },
  "intervalle-demi-tons": {
    label: "Intervalles en demi-tons",
    summary: "Compter un intervalle comme une distance en frettes.",
    requires: ["notes-manche"],
  },
  "intervalle-nom": {
    label: "Nommer un intervalle",
    summary: "Passer de deux notes à « tierce majeure », « quinte juste ».",
    requires: ["intervalle-demi-tons"],
  },
  "intervalle-manche": {
    label: "Formes d'intervalles sur le manche",
    summary: "Retrouver une tierce ou une quinte à partir d'une fondamentale.",
    requires: ["intervalle-nom"],
  },
  "gamme-majeure-formule": {
    label: "Formule de la gamme majeure",
    summary: "Ton–ton–demi-ton–ton–ton–ton–demi-ton, et ce qui en découle.",
    requires: ["intervalle-demi-tons"],
  },
  "armures-alterations": {
    label: "Altérations d'une tonalité",
    summary: "Quelles notes sont altérées dans une gamme majeure donnée.",
    requires: ["gamme-majeure-formule"],
  },
  degres: {
    label: "Degrés d'une gamme",
    summary: "Numéroter les notes d'une gamme, et ce que chaque degré fait entendre.",
    requires: ["gamme-majeure-formule"],
  },
  "caged-formes": {
    label: "Les cinq formes CAGED",
    summary: "Les cinq positions d'accord et leur enchaînement sur le manche.",
    requires: ["notes-manche", "octave"],
  },
  "gamme-mineure": {
    label: "Gamme mineure naturelle",
    summary: "La même formule décalée : où tombent les demi-tons, et pourquoi ça sonne sombre.",
    requires: ["gamme-majeure-formule"],
  },
  "relative-mineure": {
    label: "Relative mineure",
    summary: "Deux gammes, les mêmes notes, une fondamentale différente.",
    requires: ["gamme-mineure", "degres"],
  },
  "triade-construction": {
    label: "Construire une triade",
    summary: "Empiler deux tierces : fondamentale, tierce, quinte.",
    requires: ["intervalle-nom", "degres"],
  },
  "triade-qualite": {
    label: "Majeur, mineur, diminué",
    summary: "C'est la tierce qui décide, et un demi-ton suffit à tout changer.",
    requires: ["triade-construction"],
  },
  "accords-ouverts": {
    label: "Les accords ouverts",
    summary: "Les formes de base en position ouverte, et ce qu'elles ont dans le ventre.",
    requires: ["triade-qualite", "notes-manche"],
  },
  "harmonisation": {
    label: "Harmoniser une gamme",
    summary: "Un accord sur chaque degré, sans jamais sortir de la gamme.",
    requires: ["triade-qualite", "degres"],
  },
  "chiffrage-romain": {
    label: "Chiffrage romain",
    summary: "Nommer les accords par leur degré plutôt que par leur nom : ce qui rend une grille transposable.",
    requires: ["harmonisation"],
  },
  "progressions": {
    label: "Progressions d'accords",
    summary: "Les enchaînements qui reviennent partout, et pourquoi ils fonctionnent.",
    requires: ["chiffrage-romain", "accords-ouverts"],
  },
  "cadence-v-i": {
    label: "La tension de la dominante",
    summary: "Pourquoi le Ve degré appelle le Ier, et ce que ça donne sous les doigts.",
    requires: ["progressions"],
  },
  "penta-boites": {
    label: "Les cinq boîtes pentatoniques",
    summary: "Cinq positions qui pavent le manche, et comment elles s'emboîtent.",
    requires: ["gamme-mineure", "caged-formes"],
  },
  "penta-relative": {
    label: "Pentatonique majeure et mineure",
    summary: "Les mêmes cinq notes, deux couleurs, selon la note d'appui.",
    requires: ["penta-boites", "relative-mineure"],
  },
  modes: {
    label: "Les modes",
    summary: "Sept façons d'entendre les mêmes sept notes, selon celle qui sert de repos.",
    requires: ["relative-mineure", "degres"],
  },
  "modes-couleur": {
    label: "Ce qui donne sa couleur à un mode",
    summary: "Une ou deux notes suffisent à distinguer un mode d'un autre.",
    requires: ["modes", "intervalle-nom"],
  },
  "septiemes": {
    label: "Accords de septième",
    summary: "Une quatrième note qui change tout : maj7, m7, 7.",
    requires: ["triade-qualite", "harmonisation"],
  },
  "tensions-usage": {
    label: "À quoi servent les tensions",
    summary: "Quand la septième appelle une résolution, et quand elle se pose.",
    requires: ["septiemes", "cadence-v-i"],
  },
  "caged-fondamentales": {
    label: "Fondamentales des formes CAGED",
    summary: "Sur quelle corde chaque forme place sa fondamentale.",
    requires: ["caged-formes", "intervalle-manche"],
  },
} as const satisfies Record<string, ConceptDefinition>;

interface ConceptDefinition {
  label: string;
  summary: string;
  /** Notions à maîtriser avant celle-ci. */
  requires: readonly string[];
}

export type ConceptId = keyof typeof CONCEPTS;

export const CONCEPT_IDS = Object.keys(CONCEPTS) as ConceptId[];

export function getConcept(id: ConceptId) {
  return CONCEPTS[id];
}

export function isConceptId(value: string): value is ConceptId {
  return value in CONCEPTS;
}

/** Prérequis d'une notion, transitivement, sans doublon. */
export function conceptPrerequisites(id: ConceptId): ConceptId[] {
  const seen = new Set<ConceptId>();
  const walk = (current: ConceptId) => {
    for (const parent of CONCEPTS[current].requires as readonly ConceptId[]) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      walk(parent);
    }
  };
  walk(id);
  return [...seen];
}
