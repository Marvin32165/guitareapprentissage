/**
 * Comparaison de titres saisis à la main : minuscules, sans accents ni
 * ponctuation. « Don't Stop Believin' » et « dont stop believin » doivent se
 * retrouver, sinon une recherche de morceau échoue sur une apostrophe.
 */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
