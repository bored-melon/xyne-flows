import { useSyncExternalStore } from "react";
import { CARDS, type Card, type ColId } from "./data";

/* Filters shared by the Procurement kanban and the five module pages, so a filter set on one
   carries over to the other when you expand a board or come back to it. */

export interface Scope {
  period: "quarter" | "month";
  entity: string;
  dept: string;
}
export const ALL_SCOPE: Scope = { period: "quarter", entity: "", dept: "" };
export const inScope = (s: Scope) => (c: Card) => (s.period === "quarter" || !c.lastMonth) && (!s.entity || c.entity === s.entity) && (!s.dept || c.dept === s.dept);
export const scoped = (s: Scope) => (s === ALL_SCOPE ? CARDS : CARDS.filter(inScope(s)));

export interface ApState {
  /** Board:status keys, e.g. "po:Pending" */
  sel: Set<string>;
  scope: Scope;
  /** The board that is animating to or from its page, if any */
  morph: ColId | null;
}

let state: ApState = { sel: new Set(), scope: ALL_SCOPE, morph: null };
const subs = new Set<() => void>();

export const ap = {
  get: () => state,
  set(patch: Partial<ApState> | ((s: ApState) => Partial<ApState>)) {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
  /** Turn a group of keys on, or off if they are all on already. */
  toggle(keys: string[]) {
    ap.set((s) => {
      const next = new Set(s.sel);
      const all = keys.every((k) => s.sel.has(k));
      keys.forEach((k) => (all ? next.delete(k) : next.add(k)));
      return { sel: next };
    });
  },
  remove(keys: string[]) {
    ap.set((s) => {
      const next = new Set(s.sel);
      keys.forEach((k) => next.delete(k));
      return { sel: next };
    });
  },
  setScope(next: Scope) {
    ap.set({ scope: next.period === "quarter" && !next.entity && !next.dept ? ALL_SCOPE : next });
  },
  clear() {
    ap.set({ sel: new Set(), scope: ALL_SCOPE });
  },
};

export const useAp = () => useSyncExternalStore(ap.subscribe, ap.get);
