import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PALETTE, clone } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import { buildState, type Notif, type State2 } from "./model";
import { Ctx, type Ctx2, type UI2 } from "./store";
import { Home } from "./Home";
import { Editor } from "./Editor";
import { listChanges, Review } from "./Review";
import { Btn, Modal, Placeholder, Sidebar } from "./ui";
import { FocusEditor } from "@/v3/Focus";
import { ProductPage } from "@/v3/Product";
import "./v2.css";
import "@/v3/v3.css";

/**
 * Version 2 · Notifications: Settings › Notifications, then a product's journey editor.
 * Version 3 (v3): Settings › Notifications, a product's list (table or timeline), then a focus editor
 * showing one person's notifications on a pannable canvas.
 */
export default function AppV2({ v3 = false, layout = "table" }: { v3?: boolean; layout?: "table" | "timeline" }) {
  const DEF = useMemo(() => buildState(), []);
  const [S, setS] = useState<State2>(() => clone(DEF));
  const [pub, setPub] = useState<State2>(() => clone(DEF));
  const [ui, setUiState] = useState<UI2>({ nav: "settings", page: "Notifications", view: "home", persona: "employee", listLayout: layout, productId: "reimb", notifId: null, channel: "email", variantId: null, journeyOpen: true, journeyH: typeof window !== "undefined" ? Math.round(Math.min(380, window.innerHeight * 0.4)) : 340, zoom: typeof window !== "undefined" && window.innerWidth > 1800 ? 0.7 : 0.6, modal: null });
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const tid = useRef(0);

  const setUi = useCallback((p: Partial<UI2> | ((u: UI2) => Partial<UI2>)) => setUiState((u) => ({ ...u, ...(typeof p === "function" ? p(u) : p) })), []);
  // Undo and redo (version 3's editor shows them). Typing within a moment counts as one step.
  const cur = useRef(S);
  cur.current = S;
  const hist = useRef<{ past: State2[]; future: State2[]; at: number; typing: boolean }>({ past: [], future: [], at: 0, typing: false });
  const up = useCallback((fn: (d: State2) => void) => {
    const s = cur.current;
    const d = clone(s);
    fn(d);
    const h = hist.current;
    const now = Date.now();
    // keystrokes in the same text field become one undo step; anything else is its own step
    const typing = !!(document.activeElement as HTMLElement | null)?.isContentEditable;
    if (!(typing && h.typing && now - h.at < 1500)) {
      h.past.push(s);
      if (h.past.length > 60) h.past.shift();
    }
    h.typing = typing;
    h.at = now;
    h.future = [];
    cur.current = d;
    setS(d);
  }, []);
  const undo = useCallback(() => {
    const h = hist.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(cur.current);
    h.at = 0;
    cur.current = prev;
    setS(prev);
  }, []);
  const redo = useCallback(() => {
    const h = hist.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(cur.current);
    h.at = 0;
    cur.current = next;
    setS(next);
  }, []);
  // the DialKit layout choice sets the product page's starting layout
  useEffect(() => setUiState((u) => ({ ...u, listLayout: layout })), [layout]);
  // version 2 has no product page or persona canvas
  useEffect(() => setUiState((u) => (!v3 && u.view === "product" ? { ...u, view: "home" } : u)), [v3]);
  const toast = useCallback((msg: string) => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const product = S.products.find((p) => p.id === ui.productId) || S.products[0];
  const notif = product.notifs.find((n) => n.id === ui.notifId) || null;
  const upNotif = useCallback(
    (id: string, fn: (n: Notif) => void) =>
      up((d) => {
        const n = d.products.find((p) => p.id === ui.productId)!.notifs.find((x) => x.id === id)!;
        fn(n);
      }),
    [up, ui.productId],
  );
  const changed = useMemo(() => listChanges(S, pub).map((c) => ({ product: c.group, name: c.title })), [S, pub]);

  const ctx: Ctx2 = { S, pub, DEF, ui, setUi, up, upNotif, product, notif, changed, toast, v3, undo, redo, canUndo: hist.current.past.length > 0, canRedo: hist.current.future.length > 0 };

  return (
    <Ctx.Provider value={ctx}>
      {v3 && ui.page === "Notifications" && ui.view === "editor" ? (
        <div className="n2 n3-full">
          <FocusEditor />
        </div>
      ) : (
        <div className="n2">
          <Sidebar collapsed={!v3 && ui.page === "Notifications" && ui.view === "editor"} />
          <main className="n2-card">
            {ui.page !== "Notifications" ? <Placeholder key={ui.page} title={ui.page} /> : ui.view === "home" ? <Home /> : ui.view === "product" && v3 ? <ProductPage /> : <Editor />}
          </main>
        </div>
      )}
      {ui.modal === "branding" && Branding()}
      {ui.modal === "publish" && (
        <Review
          onPublish={() => {
            setPub(clone(S));
            setUi({ modal: null });
            toast("Published. People get the new versions from now on.");
          }}
        />
      )}
      <div className="n2-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div className="n2-toast" key={t.id}>
            <Icon n="check" s={14} w={2.4} />
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );

  function Branding() {
    const b = S.brand;
    const set = (k: keyof State2["brand"], v: string) => up((d) => void ((d.brand as unknown as Record<string, string>)[k] = v));
    return (
      <Modal title="Branding" onClose={() => setUi({ modal: null })} footer={<Btn kind="dark" onClick={() => setUi({ modal: null })}>Done</Btn>}>
        <label className="n2-field">
          <span>Company name</span>
          <input value={b.company} onChange={(e) => set("company", e.target.value)} />
        </label>
        <label className="n2-field">
          <span>Sender name</span>
          <input value={b.sender} onChange={(e) => set("sender", e.target.value)} />
          <small>Shown as who the email is from.</small>
        </label>
        <div className="n2-field">
          <span>Brand colour</span>
          <div className="n2-swatches">
            {PALETTE.map((c) => (
              <button type="button" key={c} aria-label={c} className={"sw" + (b.color.toLowerCase() === c.toLowerCase() ? " on" : "")} style={{ background: c }} onClick={() => set("color", c)} />
            ))}
            <input aria-label="Hex colour" value={b.color} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && set("color", e.target.value)} />
          </div>
          <small>Used for buttons and links in emails, and the app icon in Slack and push notifications.</small>
        </div>
        <label className="n2-field">
          <span>Email footer</span>
          <input value={b.footer} onChange={(e) => set("footer", e.target.value)} />
        </label>
      </Modal>
    );
  }
}
