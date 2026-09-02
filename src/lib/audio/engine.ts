// Accès bas niveau à Tone.js. Le premier son nécessite un geste utilisateur
// (politique d'autoplay, indispensable sur iOS) : `startAudio()` doit être
// appelé depuis un gestionnaire d'événement (clic/tap).
//
// Tone est importé dynamiquement pour ne pas l'embarquer tant qu'aucun son
// n'est demandé.

let started = false;

export function isAudioStarted(): boolean {
  return started;
}

export async function startAudio(): Promise<void> {
  if (started) return;
  const Tone = await import("tone");
  await Tone.start();
  started = true;
}
