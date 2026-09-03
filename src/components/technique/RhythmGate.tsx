"use client";

import { useSyncExternalStore } from "react";
import {
  readLatency,
  subscribeLatency,
  latencySnapshot,
  serverLatencySnapshot,
} from "@/lib/audio/latency";

// Ce que l'application accepte de mesurer, et ce qu'elle refuse.
//
// La règle est stricte : SANS CALIBRATION, AUCUNE MÉTRIQUE DE TIMING.
// Pas affichée avec un avertissement — pas affichée du tout. Un chiffre
// accompagné d'une réserve reste un chiffre : on le retient, on le compare,
// on s'en sert. Or sans latence connue, il ne mesure rien.

export function RhythmGate() {
  const empreinte = useSyncExternalStore(
    subscribeLatency,
    latencySnapshot,
    serverLatencySnapshot,
  );
  const mesure = empreinte ? readLatency() : null;

  if (!mesure) {
    return (
      <section className="space-y-2 rounded-2xl border border-dashed border-neutral-800 p-5">
        <h2 className="text-sm font-medium text-neutral-400">Analyse du jeu</h2>
        <p className="text-neutral-300">
          Indisponible : la latence de cet appareil n&apos;est pas mesurée.
        </p>
        <p className="text-sm text-neutral-500">
          Entre le moment où un clic est émis et celui où ton jeu revient par le
          micro, il s&apos;écoule de 20 ms en filaire à 300 ms en Bluetooth. À
          120 bpm, une double croche dure 125 ms : sans cette mesure, un écart
          affiché pourrait aussi bien venir de ton jeu que du téléphone.
        </p>
        <p className="text-sm text-neutral-500">
          C&apos;est pourquoi rien n&apos;est affiché ici plutôt qu&apos;un
          chiffre assorti d&apos;une réserve. Lance la calibration ci-dessous.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="text-sm font-medium text-neutral-400">Analyse du jeu</h2>
      <p className="text-sm text-neutral-300">
        Latence connue ({mesure.ms} ms) : les mesures de placement rythmique
        sont possibles sur cet appareil.
      </p>
      <div className="grid gap-2 text-sm">
        <p className="text-neutral-400">Ce qui sera mesuré, et rien d&apos;autre :</p>
        <ul className="list-disc space-y-1 pl-5 text-neutral-500">
          <li>hauteur d&apos;une note seule tenue ;</li>
          <li>instants d&apos;attaque et régularité du tempo ;</li>
          <li>conformité des notes jouées à une gamme attendue.</li>
        </ul>
        <p className="mt-1 text-neutral-400">Ce qui ne le sera pas :</p>
        <ul className="list-disc space-y-1 pl-5 text-neutral-500">
          <li>
            les notes d&apos;un accord gratté — la transcription polyphonique
            dépasse ce qu&apos;un micro de téléphone permet honnêtement ;
          </li>
          <li>
            la dynamique et les nuances — le contrôle automatique de gain des
            micros de téléphone écrase les écarts de volume ;
          </li>
          <li>le son, le toucher, la musicalité : aucune métrique ne les capture.</li>
        </ul>
      </div>
      <p className="text-xs text-neutral-600">
        Les exercices d&apos;analyse arrivent en phase 7. Pas de score global :
        des mesures brutes, avec leur incertitude.
      </p>
    </section>
  );
}
