import { describe, it, expect } from "vitest";
import { assignStrings, assignSequence, STRINGS } from "./voicing";

describe("attribution des cordes", () => {
  it("donne une corde distincte à chaque note d'un accord", () => {
    for (const accord of [[60, 64, 67], [48, 52, 55, 58], [40, 47, 52, 56, 59, 64]]) {
      const cordes = assignStrings(accord);
      expect(new Set(cordes).size, `accord de ${accord.length} notes`).toBe(accord.length);
    }
  });

  it("range les notes du grave à l'aigu sur des cordes croissantes", () => {
    expect(assignStrings([67, 60, 64])).toEqual([2, 0, 1]);
  });

  it("ne réutilise pas la corde du groupe précédent", () => {
    // Sinon la deuxième note d'un intervalle couperait la première.
    const [a, b] = assignSequence([[60], [67]]);
    expect(a[0]).not.toBe(b[0]);
  });

  it("reste dans les six cordes même sur un accord large", () => {
    const cordes = assignSequence([[40, 47, 52, 56, 59, 64], [60]]).flat();
    for (const c of cordes) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(STRINGS);
    }
  });
});
