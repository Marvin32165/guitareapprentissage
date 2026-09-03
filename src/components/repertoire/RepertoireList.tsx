"use client";

import { useCallback, useState } from "react";

// Répertoire : une liste de titres saisie à la main, avec des notes
// personnelles. Rien n'est récupéré ailleurs, aucune tablature n'est engendrée
// — c'est une règle du projet, pas une limite technique.

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  songKey: string | null;
  status: string;
  targetBpm: number | null;
  notes: string | null;
}

export function RepertoireList({
  initial,
  persistance,
}: {
  initial: Song[];
  persistance: boolean;
}) {
  const [songs, setSongs] = useState<Song[]>(initial);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const ajouter = useCallback(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const bpm = Number(data.get("targetBpm"));
    const res = await fetch("/api/repertoire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        artist: data.get("artist"),
        songKey: data.get("songKey"),
        targetBpm: Number.isFinite(bpm) && bpm > 0 ? bpm : undefined,
        notes: data.get("notes"),
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      setErreur(json.error ?? "Impossible d'enregistrer : pas de base de données.");
      return;
    }
    setSongs((s) => [json.song, ...s]);
    setErreur(null);
    setOuvert(false);
    form.reset();
  }, []);

  const basculer = useCallback(async (song: Song) => {
    const status = song.status === "acquired" ? "learning" : "acquired";
    setSongs((s) => s.map((x) => (x.id === song.id ? { ...x, status } : x)));
    await fetch("/api/repertoire", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: song.id, status }),
    }).catch(() => {});
  }, []);

  const supprimer = useCallback(async (id: string) => {
    setSongs((s) => s.filter((x) => x.id !== id));
    await fetch(`/api/repertoire?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      () => {},
    );
  }, []);

  const enCours = songs.filter((s) => s.status !== "acquired");
  const acquis = songs.filter((s) => s.status === "acquired");

  return (
    <div className="space-y-5">
      {!persistance && (
        <p className="rounded-xl border border-amber-700/60 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          Aucune base de données configurée : un morceau ajouté ne sera pas
          retrouvé au prochain chargement.
        </p>
      )}

      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
      >
        {ouvert ? "Annuler" : "+ Ajouter un morceau"}
      </button>

      {ouvert && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ajouter(e.currentTarget);
          }}
          className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4"
        >
          <Champ name="title" label="Titre" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ name="artist" label="Artiste" />
            <Champ name="songKey" label="Tonalité" placeholder="Am, G…" />
          </div>
          <Champ name="targetBpm" label="Tempo visé" type="number" placeholder="120" />
          <label className="block text-sm text-neutral-400">
            Tes notes
            <textarea
              name="notes"
              rows={3}
              placeholder="Le passage du pont, l'accord barré en 5e case…"
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Enregistrer
          </button>
          {erreur && <p className="text-sm text-amber-300">{erreur}</p>}
        </form>
      )}

      {songs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-neutral-500">
          Aucun morceau pour l&apos;instant. Ajoute ceux que tu travailles, avec
          tes propres notes dessus.
        </p>
      ) : (
        <>
          <Groupe titre="En travail" songs={enCours} onToggle={basculer} onDelete={supprimer} />
          <Groupe titre="Acquis" songs={acquis} onToggle={basculer} onDelete={supprimer} />
        </>
      )}

      <p className="text-xs text-neutral-600">
        Cette liste est la tienne : aucun titre n&apos;est récupéré ailleurs, et
        l&apos;application n&apos;engendre aucune tablature.
      </p>
    </div>
  );
}

function Champ({
  name,
  label,
  type = "text",
  required,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-neutral-400">
      {label}
      {required && <span className="text-emerald-400"> *</span>}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100"
      />
    </label>
  );
}

function Groupe({
  titre,
  songs,
  onToggle,
  onDelete,
}: {
  titre: string;
  songs: Song[];
  onToggle: (s: Song) => void;
  onDelete: (id: string) => void;
}) {
  if (songs.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-neutral-400">
        {titre} ({songs.length})
      </h2>
      <ul className="space-y-2">
        {songs.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-neutral-100">{s.title}</p>
                <p className="text-sm text-neutral-500">
                  {[s.artist, s.songKey, s.targetBpm ? `${s.targetBpm} bpm` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(s)}
                className={
                  "min-h-11 shrink-0 rounded-lg border px-3 text-xs " +
                  (s.status === "acquired"
                    ? "border-emerald-700 text-emerald-300"
                    : "border-neutral-700 text-neutral-300")
                }
              >
                {s.status === "acquired" ? "Acquis" : "En travail"}
              </button>
            </div>
            {s.notes && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-400">{s.notes}</p>
            )}
            <button
              type="button"
              onClick={() => onDelete(s.id)}
              className="mt-2 inline-flex min-h-11 items-center text-xs text-neutral-600 underline underline-offset-4 hover:text-neutral-400"
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
