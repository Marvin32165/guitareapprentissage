import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Le garde d'authentification a déjà intercepté les échantillons audio une
// fois (307 vers /login au lieu du fichier). Le même piège a repris avec les
// worklets : `addModule` suivait la redirection, recevait du HTML, et le micro
// tombait en panne sans message clair. Ce test fige les deux exclusions.

const proxy = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");

describe("garde d'authentification", () => {
  it("laisse passer les fichiers statiques dont l'audio a besoin", () => {
    for (const chemin of ["audio/", "worklets/"]) {
      expect(proxy, `${chemin} doit être exclu du matcher`).toContain(chemin);
    }
  });

  it("le worklet d'enregistrement existe là où le code le demande", () => {
    const capture = readFileSync(join(process.cwd(), "src/lib/audio/capture.ts"), "utf8");
    const chemin = capture.match(/addModule\("([^"]+)"\)/)?.[1];
    expect(chemin, "chemin du worklet introuvable dans capture.ts").toBeTruthy();
    const fichier = join(process.cwd(), "public", chemin!.replace(/^\//, ""));
    expect(() => readFileSync(fichier, "utf8")).not.toThrow();
    expect(readFileSync(fichier, "utf8")).toContain("registerProcessor(\"recorder\"");
  });
});
