/* Enregistreur minimal, pour la calibration de latence et la détection de
 * hauteur.
 *
 * Pourquoi un AudioWorklet plutôt qu'un ScriptProcessorNode : le premier est
 * déprécié, mais surtout le worklet tourne sur le fil audio et expose
 * `currentTime`, qui est l'horloge de l'AudioContext. C'est cette horloge qui
 * permet d'aligner ce qui a été capté avec ce qui a été planifié — un
 * alignement à la milliseconde près est le cœur même de la mesure.
 */
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.startTime = 0;
    this.port.onmessage = (e) => {
      if (e.data === "start") {
        this.recording = true;
        this.startTime = 0;
      } else if (e.data === "stop") {
        this.recording = false;
      }
    };
  }

  process(inputs) {
    if (!this.recording) return true;
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    if (this.startTime === 0) {
      this.startTime = currentTime;
      this.port.postMessage({ type: "start", time: currentTime });
    }
    // Copie : le tampon est réutilisé par le moteur audio d'un bloc à l'autre.
    this.port.postMessage({ type: "chunk", samples: new Float32Array(channel) });
    return true;
  }
}

registerProcessor("recorder", RecorderProcessor);
