"use client";

import { useRef, useState } from "react";

// Export / import JSON.
//
// L'application vit sur un service tiers, avec une base hébergée ailleurs.
// Pouvoir tout emporter n'est pas un supplément : c'est ce qui rend le reste
// acceptable.

export function DataTransfer() {
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function exporter() {
    setMessage(null);
    try {
      const res = await fetch("/api/data");
      if (!res.ok) {
        setErreur(true);
        setMessage("Aucune base configurée : il n'y a rien à exporter.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guitare-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setErreur(false);
      setMessage("Export téléchargé.");
    } catch {
      setErreur(true);
      setMessage("L'export a échoué.");
    }
  }

  async function importer(fichier: File) {
    setMessage(null);
    try {
      const texte = await fichier.text();
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: texte,
      });
      const json = await res.json();
      if (!json.ok) {
        setErreur(true);
        setMessage(json.error ?? "L'import a échoué.");
        return;
      }
      const c = json.compte;
      setErreur(false);
      setMessage(
        `Importé : ${c.lessons} progression(s), ${c.reviews} révision(s), ${c.events} événement(s), ${c.songs} morceau(x).`,
      );
    } catch {
      setErreur(true);
      setMessage("Fichier illisible.");
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="text-sm font-medium text-neutral-400">Tes données</h2>
      <p className="text-sm text-neutral-400">
        Tout ce que l&apos;application sait de toi tient dans un fichier JSON :
        progression, révisions, journal d&apos;exercices, répertoire. À
        récupérer quand tu veux, et à réinstaller ailleurs.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exporter}
          className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Exporter
        </button>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="min-h-11 flex-1 rounded-xl border border-neutral-700 px-4 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Importer
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importer(f);
            e.target.value = "";
          }}
        />
      </div>

      {message && (
        <p
          className={
            "rounded-xl border px-4 py-3 text-sm " +
            (erreur
              ? "border-amber-800/60 bg-amber-950/20 text-amber-200"
              : "border-emerald-800/60 bg-emerald-950/20 text-emerald-200")
          }
        >
          {message}
        </p>
      )}

      <p className="text-xs text-neutral-600">
        L&apos;import fusionne, il ne remplace pas : rien n&apos;est effacé sur la
        foi d&apos;un fichier.
      </p>
    </section>
  );
}
