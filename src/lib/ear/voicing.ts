// Attribution des cordes pour la lecture d'une question d'oreille.
//
// Le moteur de jeu étouffe une corde quand elle rejoue : c'est voulu pour le
// manche, mais ici ça couperait un accord dont toutes les notes partiraient sur
// la même corde. Chaque note d'un même groupe reçoit donc une corde distincte,
// et deux groupes successifs ne réutilisent pas la même.

export const STRINGS = 6;

/** Cordes distinctes pour un groupe de notes jouées ensemble. */
export function assignStrings(midis: number[], offset = 0): number[] {
  const ordre = [...midis].sort((a, b) => a - b);
  return midis.map((m) => {
    const rang = ordre.indexOf(m);
    return (offset + rang) % STRINGS;
  });
}

/**
 * Cordes pour une suite de groupes. Le décalage évolue d'un groupe à l'autre
 * pour qu'une note ne coupe pas la précédente : dans un intervalle mélodique,
 * les deux notes doivent pouvoir sonner ensemble.
 */
export function assignSequence(groups: number[][]): number[][] {
  let offset = 0;
  return groups.map((g) => {
    const strings = assignStrings(g, offset);
    offset = (offset + g.length) % STRINGS;
    return strings;
  });
}
