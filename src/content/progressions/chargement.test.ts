import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Le corpus pèse un demi-mégaoctet. Il tient dans son propre morceau de code,
// chargé par import() au moment où on s'en sert — c'est vérifié à la main sur
// le build (aucun manifeste de page ne le référence). Ce test empêche la
// régression qui l'y ramènerait sans bruit : un seul import statique depuis un
// composant suffirait à le coller au bundle de démarrage.

function fichiers(racine: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(racine)) {
    const chemin = join(racine, nom);
    if (statSync(chemin).isDirectory()) out.push(...fichiers(chemin));
    else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) out.push(chemin);
  }
  return out;
}

/** Imports statiques d'un fichier, sauf ceux qui ne portent que des types. */
function importsDeValeur(source: string): string[] {
  const out: string[] = [];
  const motif = /^import\s+([\s\S]*?)from\s+"([^"]+)"/gm;
  let m: RegExpExecArray | null;
  while ((m = motif.exec(source))) {
    const clause = m[1].trim();
    if (clause.startsWith("type ")) continue;
    // `import { type X, type Y }` ne fait descendre aucun code non plus.
    const nommes = /^\{([\s\S]*)\}$/.exec(clause);
    if (nommes && nommes[1].split(",").every((n) => !n.trim() || n.trim().startsWith("type "))) {
      continue;
    }
    out.push(m[2]);
  }
  return out;
}

describe("chargement du corpus", () => {
  it("aucun composant ni page n'importe le corpus statiquement", () => {
    const fautifs: string[] = [];
    for (const f of [...fichiers("src/components"), ...fichiers("src/app")]) {
      for (const cible of importsDeValeur(readFileSync(f, "utf8"))) {
        if (cible.startsWith("@/content/progressions")) fautifs.push(`${f} → ${cible}`);
      }
    }
    expect(fautifs, "à charger par await import(), pas par import statique").toEqual([]);
  });

  it("les données elles-mêmes ne sont atteintes que par import dynamique", () => {
    const source = readFileSync("src/content/progressions/corpus.ts", "utf8");
    expect(source).toContain('import("./donnees")');
    for (const cible of importsDeValeur(source)) {
      expect(cible, "donnees.ts ne doit jamais être importé statiquement").not.toContain(
        "donnees",
      );
    }
  });

  it("le service worker met bien en cache les morceaux de code /_next", () => {
    // Sans ça, le corpus serait retéléchargé à chaque visite, et absent
    // hors-ligne — ce qui était tout l'intérêt de l'embarquer.
    const sw = readFileSync("public/sw.js", "utf8");
    expect(sw).toContain('url.pathname.startsWith("/_next/")');
  });
});

describe("les chiffres affichés", () => {
  it("la taille du corpus annoncée dans l'interface est la vraie", async () => {
    // Trois composants annoncent « N morceaux » en texte. Le jour où le corpus
    // change, ce test tombe avant que l'app ne mente à l'utilisateur.
    const { chargerCorpus } = await import("./corpus");
    const attendu = (await chargerCorpus()).nbMorceaux;
    const trouves: string[] = [];
    for (const f of fichiers("src/components/progressions")) {
      const source = readFileSync(f, "utf8");
      for (const m of source.matchAll(/(\d{1,3}(?:[  ]\d{3})+) morceaux/g)) {
        trouves.push(`${f} : ${m[1]}`);
        expect(Number(m[1].replace(/[^0-9]/g, "")), `${f} annonce ${m[1]}`).toBe(attendu);
      }
    }
    expect(trouves.length, "aucun chiffre trouvé : le motif du test a dû changer").toBeGreaterThan(
      2,
    );
  });
});
