import type { Metadata } from "next";
import { prisma, isDatabaseConfigured } from "@/lib/db/prisma";
import { RepertoireList, type Song } from "@/components/repertoire/RepertoireList";

export const metadata: Metadata = { title: "Répertoire" };
export const dynamic = "force-dynamic";

export default async function RepertoirePage() {
  const persistance = isDatabaseConfigured();
  let songs: Song[] = [];
  if (persistance) {
    songs = await prisma.repertoireSong
      .findMany({ orderBy: { updatedAt: "desc" } })
      .catch(() => []);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Répertoire</h1>
        <p className="mt-2 text-neutral-400">
          Les morceaux que tu travailles, leur statut, et ce que tu veux te
          rappeler dessus.
        </p>
      </header>
      <RepertoireList initial={songs} persistance={persistance} />
    </div>
  );
}
