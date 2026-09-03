import { describe, it, expect } from "vitest";
import { keyToMidi, nearestSample, strumSchedule } from "./guitar";
import { getSource, resolveUrls } from "./sources";

describe("keyToMidi", () => {
  it("lit les noms de notes anglo-saxons", () => {
    expect(keyToMidi("A4")).toBe(69);
    expect(keyToMidi("C4")).toBe(60);
    expect(keyToMidi("E2")).toBe(40);
    expect(keyToMidi("B5")).toBe(83);
  });

  it("traite dièses et bémols, y compris les enharmonies", () => {
    expect(keyToMidi("C#5")).toBe(73);
    expect(keyToMidi("Db5")).toBe(73);
    expect(keyToMidi("Eb5")).toBe(75);
    expect(keyToMidi("Gb5")).toBe(78);
  });

  it("accepte un numéro MIDI écrit directement", () => {
    expect(keyToMidi("64")).toBe(64);
    expect(keyToMidi("40")).toBe(40);
  });

  it("rejette ce qui n'est pas une note", () => {
    expect(keyToMidi("manifest")).toBeNull();
    expect(keyToMidi("H4")).toBeNull();
    expect(keyToMidi("")).toBeNull();
  });
});

describe("nearestSample", () => {
  const layout = [
    { midi: 40, url: "a" },
    { midi: 43, url: "b" },
    { midi: 46, url: "c" },
  ];

  it("rend l'échantillon exact quand il existe", () => {
    expect(nearestSample(layout, 43).url).toBe("b");
  });

  it("rend le plus proche sinon", () => {
    expect(nearestSample(layout, 44).url).toBe("b");
    expect(nearestSample(layout, 45).url).toBe("c");
  });

  it("ne sort jamais de la table, même hors tessiture", () => {
    expect(nearestSample(layout, 12).midi).toBe(40);
    expect(nearestSample(layout, 120).midi).toBe(46);
  });
});

describe("couverture des sources sur le manche", () => {
  // Manche utile : Mi grave à vide (40) jusqu'à la 15e case de la corde
  // aiguë (79), l'étendue que l'application affiche réellement.
  const LOW = 40;
  const HIGH = 79;

  function worstDistance(id: Parameters<typeof getSource>[0]): number {
    const urls = resolveUrls(getSource(id))!;
    const layout = Object.entries(urls)
      .map(([key, url]) => ({ midi: keyToMidi(key)!, url }))
      .filter((s) => Number.isFinite(s.midi));
    let worst = 0;
    for (let m = LOW; m <= HIGH; m++) {
      worst = Math.max(worst, Math.abs(nearestSample(layout, m).midi - m));
    }
    return worst;
  }

  it("Martin : jamais plus de 2 demi-tons de transposition", () => {
    expect(worstDistance("martin")).toBeLessThanOrEqual(2);
  });

  it("Iowa : au moins 5 demi-tons d'étirement dans l'aigu, ce qui motive l'hybride", () => {
    expect(worstDistance("iowa")).toBeGreaterThanOrEqual(5);
  });

  it("l'hybride comble bien le trou d'Iowa", () => {
    expect(worstDistance("hybride")).toBeLessThanOrEqual(2);
  });
});

describe("strumSchedule", () => {
  const accordMi = [
    { stringIndex: 0, midi: 40 },
    { stringIndex: 1, midi: 47 },
    { stringIndex: 2, midi: 52 },
    { stringIndex: 3, midi: 56 },
    { stringIndex: 4, midi: 59 },
    { stringIndex: 5, midi: 64 },
  ];

  it("attaque de la grave vers l'aiguë en coup descendant", () => {
    const order = strumSchedule(accordMi).map((p) => p.stringIndex);
    expect(order).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("inverse l'ordre en coup montant", () => {
    const order = strumSchedule(accordMi, { direction: "up" }).map((p) => p.stringIndex);
    expect(order).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it("étale bien les attaques sur la durée demandée", () => {
    const s = strumSchedule(accordMi, { spreadMs: 25 });
    expect(s[0].offsetSec).toBe(0);
    expect(s.at(-1)!.offsetSec).toBeCloseTo(0.025, 6);
    // écarts réguliers
    const gaps = s.slice(1).map((p, i) => p.offsetSec - s[i].offsetSec);
    for (const g of gaps) expect(g).toBeCloseTo(0.025 / 5, 6);
  });

  it("reste dans la fourchette 15–30 ms attendue pour une gratte", () => {
    for (const spreadMs of [15, 22, 30]) {
      const s = strumSchedule(accordMi, { spreadMs });
      expect(s.at(-1)!.offsetSec * 1000).toBeCloseTo(spreadMs, 6);
    }
  });

  it("ne divise pas par zéro sur une corde unique", () => {
    const s = strumSchedule([{ stringIndex: 2, midi: 52 }]);
    expect(s).toHaveLength(1);
    expect(s[0].offsetSec).toBe(0);
  });

  it("rend une liste vide pour un accord vide", () => {
    expect(strumSchedule([])).toEqual([]);
  });
});
