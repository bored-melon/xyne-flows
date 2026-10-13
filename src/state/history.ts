import type { StudioState } from "@/data/types";
import { clone } from "@/lib/utils";

/**
 * Undo/redo for everything an admin edits.
 * Consecutive edits with the same key (e.g. typing in one field) within 1.2s merge into one undo step.
 */
export interface History {
  present: StudioState;
  past: StudioState[];
  future: StudioState[];
  lastKey: string | null;
  lastAt: number;
}

export type HistoryAction =
  | { type: "apply"; fn: (draft: StudioState) => void; key?: string; now: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "replace"; state: StudioState };

const LIMIT = 80;

export function initHistory(state: StudioState): History {
  return { present: state, past: [], future: [], lastKey: null, lastAt: 0 };
}

export function historyReducer(h: History, a: HistoryAction): History {
  switch (a.type) {
    case "apply": {
      const merge = !!a.key && a.key === h.lastKey && a.now - h.lastAt < 1200;
      const draft = clone(h.present);
      a.fn(draft);
      return {
        present: draft,
        past: merge ? h.past : [...h.past, h.present].slice(-LIMIT),
        future: [],
        lastKey: a.key || null,
        lastAt: a.now,
      };
    }
    case "undo": {
      if (!h.past.length) return h;
      return { present: h.past[h.past.length - 1], past: h.past.slice(0, -1), future: [h.present, ...h.future], lastKey: null, lastAt: 0 };
    }
    case "redo": {
      if (!h.future.length) return h;
      return { present: h.future[0], past: [...h.past, h.present], future: h.future.slice(1), lastKey: null, lastAt: 0 };
    }
    case "replace":
      return initHistory(a.state);
  }
}
