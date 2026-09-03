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
