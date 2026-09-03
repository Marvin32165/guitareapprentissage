import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Le dépôt garde six jeux d'échantillons pour pouvoir refaire la comparaison à
// l'aveugle, mais un seul est joué. Ces tests empêchent les cinq autres de
// partir sur le téléphone — par le service worker comme par le bundle.

const SW = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

describe("service worker", () => {
  it("ne précharge rien à l'installation", () => {
    // `addAll` / `add` dans le gestionnaire d'installation = préchargement.
    expect(SW).not.toMatch(/addEventListener\("install"[\s\S]{0,400}cache\.add/);
  });

  it("exclut explicitement /audio/ de son cache", () => {
    expect(SW).toContain('url.pathname.startsWith("/audio/")');
    // L'exclusion doit précéder la liste d'extensions, sinon elle ne sert à rien.
    expect(SW.indexOf('startsWith("/audio/")')).toBeLessThan(SW.indexOf("woff2"));
  });

  it("ne reconnaît aucune extension audio comme asset à mettre en cache", () => {
    const extensions = SW.match(/\/\\\.\(\?:([^)]+)\)/)?.[1] ?? "";
    for (const ext of ["ogg", "mp3", "opus", "wav", "m4a", "flac"]) {
      expect(extensions, `${ext} ne doit pas être mis en cache par le SW`).not.toContain(ext);
    }
  });
});

describe("séparation catalogue / identifiants", () => {
  const ids = readFileSync(join(process.cwd(), "src/lib/audio/source-ids.ts"), "utf8");

  it("le module d'identifiants ne référence aucun chemin d'échantillon", () => {
    expect(ids).not.toContain("/audio/");
  });

  it("le moteur ne charge le catalogue que dynamiquement", () => {
    const guitar = readFileSync(join(process.cwd(), "src/lib/audio/guitar.ts"), "utf8");
    // Un import statique ferait descendre les six jeux sur toutes les pages.
    expect(guitar).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+"\.\/sources"/m);
    expect(guitar).toContain('import("./sources")');
  });

  it("la préférence ne dépend pas du catalogue", () => {
    const pref = readFileSync(join(process.cwd(), "src/lib/audio/preference.ts"), "utf8");
    expect(pref).not.toContain('from "./sources"');
  });
});
