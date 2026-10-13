import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Email, Module, StudioState, UIState } from "@/data/types";
import { initialState } from "@/data/modules";
import { makeVars } from "@/data/scenarios";
import { computeChanges } from "@/lib/changes";
import { Icon } from "@/lib/icons";
import { clone, same, statesOf } from "@/lib/utils";
import { historyReducer, initHistory } from "@/state/history";
import { StudioContext, type StudioCtx, type UIPatch } from "@/state/StudioContext";
import { Overview } from "@/components/overview/Overview";
import { Studio } from "@/components/studio/Studio";
import { Review } from "@/components/review/Review";

const INITIAL: StudioState = initialState();

const INITIAL_UI: UIState = {
  view: "overview",
  side: "reimb",
  moduleId: "reimb",
  emailId: "r-fix",
  tab: "content",
  selEmail: null,
  selState: null,
  sel: null,
  scrollTo: null,
  filter: "all",
  review: false,
  tested: false,
  search: "",
};

export default function App() {
  // Draft with undo/redo, and the published ("live") copy it's compared against.
  const [hist, dispatch] = useReducer(historyReducer, undefined, () => initHistory(clone(INITIAL)));
  const [pub, setPub] = useState<StudioState>(() => clone(INITIAL));
  const [ui, setUi] = useState<UIState>(INITIAL_UI);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const toastId = useRef(0);
  const S = hist.present;

  const U = useCallback((patch: UIPatch) => setUi((u) => ({ ...u, ...(typeof patch === "function" ? patch(u) : patch) })), []);
  const act = useCallback((fn: (d: StudioState) => void, key?: string) => dispatch({ type: "apply", fn, key, now: Date.now() }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const toast = useCallback((msg: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !target.closest?.("[contenteditable],input,textarea")) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Escape")
        // Go up one level: review → block → email → all emails
        U((u) => (u.review ? { review: false } : u.sel ? { sel: null } : u.selEmail && u.tab === "content" ? { selEmail: null, selState: null } : {}));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, U]);

  const mod: Module = S.modules.find((m) => m.id === ui.moduleId)!;
  const email: Email = mod.emails.find((e) => e.id === ui.emailId) || mod.emails[0];
  // Sample values follow the selected state of the selected template
  const state = statesOf(email).find((s) => s.id === ui.selState) || statesOf(email)[0];
  const v = useMemo(() => makeVars(state.scenario, S.brand), [state.scenario, S.brand]);
  const changes = useMemo(() => computeChanges(pub, S), [pub, S]);
  const nChanges = changes.reduce((a, g) => a + g.items.length, 0);

  const emailDirty = (mid: string, eid: string) => {
    const a = pub.modules.find((m) => m.id === mid)!.emails.find((e) => e.id === eid);
    const b = S.modules.find((m) => m.id === mid)!.emails.find((e) => e.id === eid);
    return !same(a, b);
  };

  const upEmail: StudioCtx["upEmail"] = (fn, key) =>
    act((d) => {
      const m = d.modules.find((x) => x.id === ui.moduleId)!;
      fn(m.emails.find((e) => e.id === email.id)!, m);
    }, key);

  const openStudio: StudioCtx["openStudio"] = (mid, eid, tab = "content") => {
    const first = S.modules.find((m) => m.id === mid)!.emails[0].id;
    U({
      view: "studio",
      moduleId: mid,
      emailId: eid || first,
      selEmail: eid,
      selState: null,
      scrollTo: eid,
      tab,
      sel: null,
      search: "",
    });
  };

  const publish = (note: string) => {
    setPub(clone(S));
    U({ review: false });
    toast(`Published ${nChanges} change${nChanges > 1 ? "s" : ""}` + (note ? ` · “${note}”` : ""));
  };

  const ctx: StudioCtx = {
    S,
    pub,
    ui,
    U,
    act,
    undo,
    redo,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    mod,
    email,
    v,
    changes,
    nChanges,
    emailDirty,
    upEmail,
    openStudio,
    toast,
    publish,
  };

  return (
    <StudioContext.Provider value={ctx}>
      {ui.view === "overview" ? <Overview /> : <Studio />}
      {ui.review && <Review />}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <Icon n="check" s={15} w={2.5} />
            {t.msg}
          </div>
        ))}
      </div>
    </StudioContext.Provider>
  );
}
