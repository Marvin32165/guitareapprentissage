"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ from }: { from: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const target = from.startsWith("/") ? from : "/";
        router.replace(target);
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Échec de connexion.");
    } catch {
      setError("Réseau indisponible. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm text-neutral-400"
        >
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 text-base text-neutral-100 outline-none focus:border-emerald-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || password.length === 0}
        className="min-h-12 w-full rounded-lg bg-emerald-600 px-4 text-base font-medium text-white active:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Connexion…" : "Entrer"}
      </button>
    </form>
  );
}
