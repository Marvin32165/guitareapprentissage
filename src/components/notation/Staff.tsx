"use client";

import { useEffect, useRef, useState } from "react";
import type { StaffNote } from "@/lib/notation/staff";

// Portée rendue par VexFlow, en SVG.
//
// VexFlow est importé dynamiquement : c'est une grosse bibliothèque, et seules
// les pages qui affichent une portée doivent la télécharger.
//
// La clé porte un « 8 » sous elle : la musique de guitare s'écrit une octave
// au-dessus de ce qu'elle sonne. Le décalage est appliqué en amont (voir
// `lib/notation/staff.ts`) ; ici on se contente de le signaler à l'œil.

// La hauteur n'est PAS fixée à l'avance. En clé de sol 8vb, le Mi grave à vide
// s'écrit Mi3 — trois lignes supplémentaires sous la portée — et le glyphe de
// clé lui-même déborde largement. Toute valeur choisie d'avance coupe quelque
// chose : mesuré, le dessin s'étend de -12 à 253 pour une portée « de 160 ».
//
// On dessine donc d'abord, puis on cadre sur ce qui a réellement été tracé.
const DRAW_WIDTH = 320; // unités de dessin, indépendantes de la taille écran
const STAVE_Y = 90;
const PAD = 8;
/** Hauteur d'affichage : le viewBox s'y adapte, le contenu n'est jamais coupé. */
const CSS_HEIGHT = 170;

export interface StaffProps {
  notes: StaffNote[];
  /** Index de la note mise en évidence, si elle doit l'être. */
  activeIndex?: number | null;
  /**
   * Index d'une note à marquer comme erronée. La couleur doit porter
   * l'information au même titre que le texte : « la tienne est la seconde »
   * oblige à compter, un contraste se voit.
   */
  errorIndex?: number | null;
  onSelectNote?: (index: number) => void;
  /** Étiquette accessible de la portée. */
  label?: string;
}

export function Staff({
  notes,
  activeIndex = null,
  errorIndex = null,
  onSelectNote,
  label,
}: StaffProps) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Pas d'observateur de taille : le dessin se fait à largeur fixe et c'est le
  // viewBox qui l'adapte au conteneur, du 375 px au grand écran.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;

    (async () => {
      try {
        const VF = await import("vexflow");
        if (cancelled || !host.current) return;
        host.current.innerHTML = "";

        const renderer = new VF.Renderer(host.current, VF.Renderer.Backends.SVG);
        renderer.resize(DRAW_WIDTH, 300);
        const ctx = renderer.getContext();
        // Fond transparent : c'est la page qui porte la couleur.
        ctx.setFillStyle("#d4d4d4");
        ctx.setStrokeStyle("#d4d4d4");

        const stave = new VF.Stave(8, STAVE_Y, DRAW_WIDTH - 16);
        stave.addClef("treble", undefined, "8vb");
        stave.setStyle({ fillStyle: "#a3a3a3", strokeStyle: "#a3a3a3" });
        stave.setContext(ctx).draw();

        if (notes.length === 0) return;

        const staveNotes = notes.map((n) => {
          const sn = new VF.StaveNote({
            keys: [n.key],
            duration: "w",
            clef: "treble",
            autoStem: true,
          });
          if (n.accidental) sn.addModifier(new VF.Accidental(n.accidental), 0);
          return sn;
        });

        staveNotes.forEach((sn, i) => {
          const couleur =
            i === errorIndex ? "#fbbf24" : i === activeIndex ? "#34d399" : "#e5e5e5";
          sn.setStyle({ fillStyle: couleur, strokeStyle: couleur });
        });

        const voice = new VF.Voice({ numBeats: notes.length, beatValue: 1 });
        voice.setStrict(false);
        voice.addTickables(staveNotes);
        new VF.Formatter().joinVoices([voice]).format([voice], DRAW_WIDTH - 100);
        voice.draw(ctx, stave);

        const svg = host.current.querySelector("svg") as SVGSVGElement | null;
        if (!svg) return;

        // Cadrage sur le dessin réel, mesuré après coup. Les zones tactiles sont
        // ajoutées ENSUITE, sinon leur surface gonflerait le cadre.
        const bbox = svg.getBBox();
        svg.setAttribute(
          "viewBox",
          `${bbox.x - PAD} ${bbox.y - PAD} ${bbox.width + PAD * 2} ${bbox.height + PAD * 2}`,
        );
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        // VexFlow pose des dimensions en style inline : un simple attribut ne
        // ferait pas le poids.
        svg.style.width = "100%";
        svg.style.height = `${CSS_HEIGHT}px`;
        svg.removeAttribute("width");
        svg.removeAttribute("height");

        // Zones tactiles : une note dessinée fait quelques pixels de large,
        // très en deçà des 44 px exigés au doigt.
        if (onSelectNote) {
          {
            staveNotes.forEach((sn, i) => {
              const box = sn.getBoundingBox();
              const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
              hit.setAttribute("x", String(box.getX() - 12));
              hit.setAttribute("y", String(bbox.y - PAD));
              hit.setAttribute("width", String(Math.max(box.getW() + 24, 44)));
              hit.setAttribute("height", String(bbox.height + PAD * 2));
              // `fill: none` ne reçoit pas les clics : il faut « transparent »
              // ET neutraliser le trait, que le contexte VexFlow laisse actif.
              hit.setAttribute("fill", "transparent");
              hit.setAttribute("stroke", "none");
              hit.setAttribute("pointer-events", "all");
              hit.style.cursor = "pointer";
              hit.addEventListener("click", () => onSelectNote(i));
              svg.appendChild(hit);
            });
          }
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notes, activeIndex, errorIndex, onSelectNote]);

  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40"
      role="img"
      aria-label={label ?? "Portée"}
    >
      <div ref={host} className="w-full" style={{ minHeight: CSS_HEIGHT }} />
      {failed && (
        <p className="px-4 pb-3 text-sm text-amber-300">
          La portée n&apos;a pas pu être affichée. Le manche et le son restent
          utilisables ci-dessous.
        </p>
      )}
    </div>
  );
}
