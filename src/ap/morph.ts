import type { CSSProperties } from "react";
import { flushSync } from "react-dom";
import type { ColId } from "./data";
import { ap } from "./state";

/* Board ↔ page animation, using the browser's View Transitions.
   While a board is morphing, its title, strip, legend, surface and cards carry the same
   view-transition names as the page's title, strip, status tabs, table and rows, so the browser
   animates each pair from one box to the other. Browsers without View Transitions, and people
   who ask for reduced motion, just switch pages. */

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

export function morph(col: ColId, go: () => void) {
  const d = document as VTDoc;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!d.startViewTransition || reduce) {
    go();
    return;
  }
  // Name the board's parts before the old snapshot is taken
  flushSync(() => ap.set({ morph: col }));
  document.documentElement.classList.add("ap-morphing");
  const t = d.startViewTransition(() => {
    flushSync(go);
  });
  t.finished.finally(() => {
    document.documentElement.classList.remove("ap-morphing");
    ap.set({ morph: null });
  });
}

/** Inline style giving an element a view-transition name (and class), or nothing when off. */
export const vt = (on: boolean, name: string, cls?: string): CSSProperties | undefined =>
  on ? ({ viewTransitionName: name, ...(cls ? { viewTransitionClass: cls } : {}) } as CSSProperties) : undefined;

/** Document ids are already valid identifiers (PO-1188); keep them safe anyway. */
export const docName = (id: string) => "ap-doc-" + id.replace(/[^A-Za-z0-9-]/g, "_");
