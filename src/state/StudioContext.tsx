import { createContext, useContext } from "react";
import type { ChangeGroup, Email, Module, StudioState, UIState, Vars } from "@/data/types";

export type UIPatch = Partial<UIState> | ((u: UIState) => Partial<UIState>);

export interface StudioCtx {
  /** Current draft (what the admin is editing) */
  S: StudioState;
  /** What is live for employees right now */
  pub: StudioState;
  ui: UIState;
  U: (patch: UIPatch) => void;
  /** Apply an undoable edit to the draft. Same `key` within 1.2s merges into one undo step. */
  act: (fn: (draft: StudioState) => void, key?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  mod: Module;
  email: Email;
  v: Vars;
  changes: ChangeGroup[];
  nChanges: number;
  emailDirty: (moduleId: string, emailId: string) => boolean;
  /** Edit the email open in the studio */
  upEmail: (fn: (email: Email, mod: Module) => void, key?: string) => void;
  /** Open the studio on a module; pass an email to select and scroll to it, or null for all emails */
  openStudio: (moduleId: string, emailId: string | null, tab?: UIState["tab"]) => void;
  toast: (msg: string) => void;
  publish: (note: string) => void;
}

export const StudioContext = createContext<StudioCtx | null>(null);

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside <StudioContext.Provider>");
  return ctx;
}
