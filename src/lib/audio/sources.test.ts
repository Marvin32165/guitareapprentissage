import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SOURCES, getSource, type SampleSource } from "./sources";

// Une URL déclarée mais absente du disque ne casse rien à la compilation :
// elle produit du silence au clic, en production, sans message d'erreur. D'où
// ces tests, qui vérifient l'existence réelle de chaque fichier annoncé.

const PUBLIC = join(process.cwd(), "public");
const toPath = (url: string) => join(PUBLIC, url.replace(/^\//, ""));

function declaredFiles(src: SampleSource): string[] {
  if (src.multi) {
    return src.multi.midis.flatMap((m) =>
      src.multi!.formats.map((f) => `${src.multi!.base}/${m}.${f.ext}`),
    );
  }
  return Object.values(src.urls ?? {});
}

describe("sources audio", () => {
  it("chaque source a un identifiant unique", () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque source est documentée (licence et couverture non vides)", () => {
    for (const s of SOURCES) {
      expect(s.licence.trim(), `licence de ${s.id}`).not.toBe("");
      expect(s.couverture.trim(), `couverture de ${s.id}`).not.toBe("");
      expect(s.description.trim(), `description de ${s.id}`).not.toBe("");
    }
  });

  it("la synthèse est la seule source sans échantillon", () => {
    for (const s of SOURCES) {
      const hasSamples = Boolean(s.urls) || Boolean(s.multi);
      expect(hasSamples, `${s.id} doit ${s.id === "synth" ? "ne pas " : ""}avoir des échantillons`)
        .toBe(s.id !== "synth");
    }
  });

  it.each(SOURCES.filter((s) => s.id !== "synth").map((s) => [s.id, s] as const))(
    "%s : tous les fichiers déclarés existent",
    (_id, src) => {
      const missing = declaredFiles(src).filter((u) => !existsSync(toPath(u)));
      expect(missing).toEqual([]);
    },
  );

  it.each(SOURCES.filter((s) => s.id !== "synth").map((s) => [s.id, s] as const))(
    "%s : aucun fichier vide",
    (_id, src) => {
      const empty = declaredFiles(src).filter((u) => readFileSync(toPath(u)).length < 512);
      expect(empty).toEqual([]);
    },
  );

  it("l'hybride bascule bien d'Iowa vers FluidR3 au-dessus de Ré5", () => {
    const urls = getSource("hybride").urls!;
    expect(urls["D5"]).toContain("/iowa/");
    for (const note of ["Eb5", "E5", "F5", "Gb5", "G5"]) {
      expect(urls[note], `${note} doit venir de FluidR3`).toContain("/fluid-steel/");
    }
  });

  it("le jeu Martin propose Opus et MP3, et couvre Mi2 → Si5 par pas de 3 demi-tons", () => {
    const { multi } = getSource("martin");
    expect(multi).toBeDefined();
    expect(multi!.formats.map((f) => f.ext)).toEqual(["ogg", "mp3"]);
    expect(multi!.midis[0]).toBe(40);
    expect(multi!.midis.at(-1)).toBe(83);
    const gaps = multi!.midis.slice(1).map((m, i) => m - multi!.midis[i]);
    expect(Math.max(...gaps), "aucun écart de plus de 4 demi-tons").toBeLessThanOrEqual(4);
  });

  it("le manifeste Martin atteste une hauteur corrigée à moins d'un cent", () => {
    const manifest = JSON.parse(
      readFileSync(join(PUBLIC, "audio/compare/martin/manifest.json"), "utf8"),
    );
    expect(manifest.notes).toBe(15);
    for (const e of manifest.entries) {
      // La correction annoncée doit compenser exactement l'écart mesuré.
      expect(e.correctionAppliquee).toBeCloseTo(-e.ecartMesureCents, 1);
    }
  });
});
