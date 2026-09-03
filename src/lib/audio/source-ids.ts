// Identifiants des sources, isolés du catalogue.
//
// Ce fichier est minuscule et peut être expédié partout ; le catalogue complet
// (chemins des échantillons, descriptions, licences) ne concerne que la page de
// comparaison et le moteur au moment où il joue, et ne doit pas peser sur le
// chargement des autres pages.

export const SOURCE_IDS = [
  "synth",
  "iowa",
  "fluid-steel",
  "fluid-nylon",
  "hybride",
  "martin",
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

export function isSourceId(value: string): value is SourceId {
  return (SOURCE_IDS as readonly string[]).includes(value);
}
