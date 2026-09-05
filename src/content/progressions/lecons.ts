// Du chiffrage d'une progression vers les leçons qui l'expliquent.
//
// Les règles sont volontairement peu nombreuses et lisibles : mieux vaut trois
// renvois justes qu'une liste de onze qui ne veut rien dire. Chaque renvoi dit
// POURQUOI il est là — un lien sans raison ne donne pas envie de cliquer.

import { LESSONS } from "@/content/lessons";
import { lireDegre } from "@/lib/music/degres";
import type { ProgressionCorpus } from "./corpus";

export interface RenvoiLecon {
  slug: string;
  titre: string;
  pourquoi: string;
}

const SEPTIEMES = new Set(["dom7", "maj7", "min7", "demiDim7", "dim7"]);

function titreDe(slug: string): string {
  return LESSONS.find((l) => l.slug === slug)?.title ?? slug;
}

export function leconsPourProgression(progression: ProgressionCorpus): RenvoiLecon[] {
  const lus = progression.degres.map((d) => lireDegre(progression.mode, d));
  const renvois: RenvoiLecon[] = [];

  const pousser = (slug: string, pourquoi: string) => {
    if (renvois.some((r) => r.slug === slug)) return;
    renvois.push({ slug, titre: titreDe(slug), pourquoi });
  };

  pousser("harmonisation", "D'où viennent les chiffres romains, et comment les lire.");
  pousser("progressions", "Les enchaînements les plus répandus, et ce qu'ils font entendre.");

  if (progression.mode === "minor") {
    pousser("gamme-mineure", "Cette progression est en mineur : la gamme dont elle sort.");
  }

  // Une septième quelque part : c'est la leçon sur les tensions.
  if (lus.some((l) => l && SEPTIEMES.has(l.qualite))) {
    pousser("tensions", "Elle contient des accords de septième.");
  }

  // Un degré altéré (♭VII, ♯IV…) n'appartient pas à la gamme de la tonalité :
  // c'est un emprunt, et il s'explique par la construction des accords.
  if (progression.degres.some((d) => /[♭♯]/.test(d))) {
    pousser("accords", "Elle emprunte un accord hors de la gamme.");
  }

  // Un V (ou V7) suivi du I : la cadence, cœur de la leçon 8.
  for (let i = 0; i + 1 < progression.degres.length; i++) {
    const a = lus[i];
    const b = lus[i + 1];
    if (a?.demiTons === 7 && b?.rang === 1 && b.demiTons === 0) {
      pousser("progressions", "Elle contient une cadence V → I.");
      break;
    }
  }

  // Ordre du parcours : on renvoie vers la plus précoce d'abord.
  const rang = new Map(LESSONS.map((l, i) => [l.slug, i]));
  return renvois.sort((a, b) => (rang.get(a.slug) ?? 99) - (rang.get(b.slug) ?? 99));
}
