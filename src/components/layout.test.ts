import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Deux corrections de mise en page qui disparaîtraient sans bruit au prochain
// remaniement, et dont le symptôme (une page qui défile latéralement sur un
// téléphone) est pénible à relier à sa cause.

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("mise en page — contraintes du projet", () => {
  it("le manche porte lui-même son défilement horizontal", () => {
    // Un manche de 15 cases dépasse toujours 375 px. Si l'enveloppe dépend des
    // appelants, il suffit d'un oubli pour faire déborder la page entière —
    // mesuré : 436 px de débord sur /technique.
    const fretboard = lire("src/components/fretboard/Fretboard.tsx");
    expect(fretboard).toContain("overflow-x-auto");
  });

  it("la colonne principale peut rétrécir sous la largeur de son contenu", () => {
    // Sans `min-w-0`, un enfant flex ne descend pas sous la largeur de son
    // contenu : un SVG à largeur explicite poussait toute la page à 1072 px
    // dès l'apparition de la barre latérale, à 768 px.
    const shell = lire("src/components/nav/AppShell.tsx");
    expect(shell).toContain("min-w-0");
  });

  it("les curseurs et cases à cocher atteignent la cible tactile de 44 px", () => {
    const css = lire("src/app/globals.css");
    expect(css).toContain('input[type="range"]');
    expect(css).toMatch(/min-height:\s*44px/);
  });

  it("aucune commande interactive ne descend sous 44 px de haut", () => {
    // `min-h-10` vaut 40 px : c'est la valeur qui traînait sur les bascules du
    // manche. On interdit les hauteurs minimales inférieures à `min-h-11`.
    const fichiers = [
      "src/components/fretboard/FretboardDemo.tsx",
      "src/components/technique/Metronome.tsx",
      "src/components/technique/BackingTrack.tsx",
      "src/components/audio/CompareTabs.tsx",
      "src/components/ear/EarTrainer.tsx",
    ];
    for (const f of fichiers) {
      const src = lire(f);
      for (const trop_petit of ["min-h-10", "min-h-9", "min-h-8"]) {
        expect(src, `${f} contient ${trop_petit}`).not.toContain(`${trop_petit} `);
      }
    }
  });
});
