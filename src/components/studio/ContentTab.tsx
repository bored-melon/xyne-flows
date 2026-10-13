import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { activeCase, CASES, makeVars } from "@/data/scenarios";
import type { Email, Freq, TemplateState, Vars } from "@/data/types";
import { Icon } from "@/lib/icons";
import { AUD, AUDDESC, AUDIENCES, bundledInto, isDigest, resolve, statesOf, visibleBlocks } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { ChipEditor, type ChipEditorApi, VarMenu } from "../chips";
import { MailView } from "../email/MailView";
import { EmailStatusTag, Toggle } from "../ui";
import { BlockPanel } from "./BlockPanel";
import { EmailPanel } from "./EmailPanel";
import { GlobalPanel } from "./GlobalPanel";
import { tune } from "@/lib/tuning";

/* ------------------------------------------------------------------ */
/* In-place headline editor                                            */
/* ------------------------------------------------------------------ */

interface InlineHeadlineProps {
  value: string;
  sub: string;
  align: "left" | "center";
  caseLabel: string | null;
  v: Vars;
  onChange: (t: string) => void;
  onDone: () => void;
}

function InlineHeadline({ value, sub, align, onChange, onDone, v, caseLabel }: InlineHeadlineProps) {
  const api = useRef<ChipEditorApi | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-ed">
      <div className="bar">
        <span style={{ position: "relative" }}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(!open)}>
            <Icon n="braces" s={14} />
            Variable
          </button>
          {open && <VarMenu v={v} onPick={(k) => api.current?.insert(k)} onClose={() => setOpen(false)} style={{ right: 0, top: 36, width: 272 }} />}
        </span>
        <button type="button" onClick={onDone}>
          <Icon n="check" s={14} />
          Done
        </button>
      </div>
      <div className={"m-head" + (align === "left" ? " left" : "")}>
        {caseLabel && <div style={{ fontSize: 11, color: "var(--e-muted)", textAlign: "inherit" }}>Editing the “{caseLabel}” version</div>}
        <ChipEditor value={value} onChange={onChange} api={api} className="m-h1" label="Headline" autoFocus />
        <p className="m-sub">{sub}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Board: persona sections → templates → states. Memoised so panning   */
/* (which only changes a CSS transform) never re-renders the emails.   */
/* ------------------------------------------------------------------ */

const frameVars = (e: Email, st: TemplateState, brand: Parameters<typeof makeVars>[1]): Vars => {
  const v = makeVars(st.scenario, brand);
  if (isDigest(e) && st.id !== "off") v.period = st.label.toLowerCase();
  return v;
};

const Board = memo(function Board() {
  const { S, ui, U, act, mod, emailDirty } = useStudio();

  const selectTemplate = (id: string) => U({ selEmail: id, emailId: id, selState: null, sel: null });
  const selectState = (id: string, sid: string) => U({ selEmail: id, emailId: id, selState: sid, sel: null });
  const selectBlock = (id: string, sid: string, bid: string) => U({ selEmail: id, emailId: id, selState: sid, sel: bid });

  /** Move a block in the shared order, relative to its visible neighbour in this email. Affects every email. */
  const move = (email: Email) => (id: string, dir: -1 | 1) =>
    act((d) => {
      const vis = visibleBlocks(email, d.layout).map((b) => b.id);
      const neighbour = vis[vis.indexOf(id) + dir];
      if (!neighbour || neighbour === "logo" || neighbour === "footer") return;
      const order = d.layout.order.filter((x) => x !== id);
      const j = order.indexOf(neighbour);
      order.splice(dir < 0 ? j : j + 1, 0, id);
      d.layout.order = order;
    });
  const hide = (email: Email) => (id: string) => {
    act((d) => {
      d.modules.find((m) => m.id === mod.id)!.emails.find((e) => e.id === email.id)!.blocks.find((b) => b.id === id)!.hidden = true;
    });
    U((u) => (u.sel === id ? { sel: null } : {}));
  };
  const setOn = (id: string, val: boolean) =>
    act((d) => {
      d.modules.find((m) => m.id === mod.id)!.emails.find((e) => e.id === id)!.on = val;
    });

  const inlineFor = (e: Email, v: Vars) => {
    const hb = e.blocks.find((b) => b.id === "headline");
    if (!hb) return null;
    const ci = activeCase(hb.props, v);
    return (
      <InlineHeadline
        key={e.id + ci}
        value={ci >= 0 ? hb.props.cases![ci].text : hb.props.text}
        sub={resolve(hb.props.sub, v)}
        align={hb.props.align}
        caseLabel={ci >= 0 ? CASES[hb.props.cases![ci].when] : null}
        v={v}
        onChange={(t) =>
          act((d) => {
            const p = d.modules.find((m) => m.id === mod.id)!.emails.find((x) => x.id === e.id)!.blocks.find((b) => b.id === "headline")!.props;
            if (ci >= 0) p.cases![ci].text = t;
            else p.text = t;
          }, "hl-" + e.id + ci)
        }
        onDone={() => U({ sel: null })}
      />
    );
  };

  const personas = AUDIENCES.map((a) => ({
    a,
    list: [...mod.emails.filter((e) => e.aud === a && !isDigest(e)), ...mod.emails.filter((e) => e.aud === a && isDigest(e))],
  })).filter((p) => p.list.length);

  return (
    <div className="board-inner">
      {personas.map(({ a, list }) => (
        <section className="psec" key={a}>
          <div className="psec-h">
            <span className="psec-t">{AUD[a]}</span>
            <span className="psec-n">{list.length} templates</span>
            <span className="psec-d">{AUDDESC[a]}</span>
          </div>
          <div className="psec-body">
            {list.map((e) => {
              const states = statesOf(e);
              const multi = states.length > 1;
              const tplSel = ui.selEmail === e.id;
              const digestEmpty = isDigest(e) && !bundledInto(mod, e).length;
              return (
                <div
                  key={e.id}
                  data-email={e.id}
                  className={"tset" + (multi ? " multi" : "") + (tplSel ? " sel" : "") + (e.on && mod.on ? "" : " dim")}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    selectTemplate(e.id);
                  }}
                >
                  <div className="tset-h">
                    <span className="nm">{e.name}</span>
                    {multi && <span className="cnt">{states.length} states</span>}
                    <EmailStatusTag on={e.on} dirty={emailDirty(mod.id, e.id)} moduleOn={mod.on} isNew={e.isNew} digestEmpty={digestEmpty} />
                    <span className="grow" />
                    <Toggle sm on={e.on} label={"Send " + e.name} onChange={(val) => setOn(e.id, val)} />
                  </div>
                  <div className="tset-states">
                    {states.map((st) => {
                      const v = frameVars(e, st, S.brand);
                      const stSel = tplSel && (ui.selState === st.id || (!ui.selState && !multi));
                      const blockSel = stSel ? ui.sel : null;
                      return (
                        <div className="sframe" key={st.id} data-frame={e.id + ":" + st.id}>
                          {multi && <div className={"slabel" + (stSel ? " on" : "")}>{st.label}</div>}
                          <div
                            className={"fbody" + (stSel ? " sel" : "")}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              selectState(e.id, st.id);
                            }}
                          >
                            <div className="istrip">
                              <div className="row">
                                <span className="av" style={{ background: S.brand.color }}>
                                  {(S.brand.company || "A")[0]}
                                </span>
                                <b>{S.brand.sender}</b>
                                <span className="grow" />
                                <span className="muted">10:42 AM</span>
                              </div>
                              <div className="subj">{resolve(e.subject, v)}</div>
                              <div className="muted">{resolve(e.pre, v)}</div>
                            </div>
                            <MailView
                              email={e}
                              v={v}
                              brand={S.brand}
                              mod={mod}
                              freq={isDigest(e) && st.id !== "off" ? (st.id as Freq) : undefined}
                              edit
                              sel={blockSel}
                              onSel={(bid) => selectBlock(e.id, st.id, bid)}
                              onMove={move(e)}
                              onHide={hide(e)}
                              inlineEditor={blockSel === "headline" ? inlineFor(e, v) : null}
                            />
                          </div>
                          {stSel && (
                            <div className="edit-hint">
                              <Icon n="pointer" s={14} />
                              <span>
                                <b>Click any block to edit it.</b> Hover a block to move or hide it.
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Pannable / zoomable viewport                                        */
/* ------------------------------------------------------------------ */

const MIN_Z = 0.1;
const MAX_Z = 2;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function Canvas() {
  const { ui, U } = useStudio();
  const vpRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const view = useRef({ x: 56, y: 76, z: tune.startZoom });
  const [zoom, setZoom] = useState(view.current.z);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);

  /** Push the current view to the DOM directly (no React re-render while panning). */
  const apply = useCallback((animate = false) => {
    const b = boardRef.current;
    const vp = vpRef.current;
    if (!b || !vp) return;
    const { x, y, z } = view.current;
    b.style.transition = animate && tune.panMs ? `transform ${tune.panMs}ms cubic-bezier(.2,.7,.2,1)` : "none";
    b.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    vp.style.backgroundPosition = `${x}px ${y}px`;
    vp.style.backgroundSize = `${tune.dotGap * z}px ${tune.dotGap * z}px`;
    vp.style.setProperty("--z", String(z));
    vp.style.setProperty("--k", String(Math.min(tune.labelMax, Math.max(1, 1 / z))));
  }, []);

  const zoomAt = useCallback(
    (nz: number, cx: number, cy: number, animate = false) => {
      const v = view.current;
      nz = clamp(nz, MIN_Z, MAX_Z);
      v.x = cx - (cx - v.x) * (nz / v.z);
      v.y = cy - (cy - v.y) * (nz / v.z);
      v.z = nz;
      apply(animate);
      setZoom(nz);
    },
    [apply],
  );
  const zoomCenter = (nz: number) => {
    const r = vpRef.current!.getBoundingClientRect();
    zoomAt(nz, r.width / 2, r.height / 2, true);
  };
  const fit = () => {
    const vp = vpRef.current!.getBoundingClientRect();
    const inner = boardRef.current!.firstElementChild as HTMLElement;
    const w = inner.offsetWidth;
    const h = inner.offsetHeight;
    const z = clamp(Math.min((vp.width - 96) / w, (vp.height - 140) / h), MIN_Z, 1);
    view.current = { x: (vp.width - w * z) / 2, y: 76, z };
    apply(true);
    setZoom(z);
  };

  useLayoutEffect(() => apply(), [apply]);
  // Redraw when a DialKit value changes (dot spacing, label scale…).
  useEffect(() => {
    const on = () => apply();
    window.addEventListener("studio:tune", on);
    return () => window.removeEventListener("studio:tune", on);
  }, [apply]);

  // Trackpad / wheel: scroll pans, ⌘/Ctrl + scroll (or pinch) zooms around the cursor.
  useEffect(() => {
    const vp = vpRef.current!;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".pop")) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = vp.getBoundingClientRect();
        zoomAt(view.current.z * Math.exp(-e.deltaY * tune.zoomSpeed * 0.001), e.clientX - r.left, e.clientY - r.top);
      } else {
        view.current.x -= e.deltaX;
        view.current.y -= e.deltaY;
        apply();
      }
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [apply, zoomAt]);

  // Pan to a template or state when the layers panel (or a link) asks for it.
  useEffect(() => {
    if (!ui.scrollTo) return;
    const board = boardRef.current!;
    const el = board.querySelector<HTMLElement>(ui.scrollTo.includes(":") ? `[data-frame="${ui.scrollTo}"]` : `[data-email="${ui.scrollTo}"]`);
    if (el) {
      let left = 0;
      let top = 0;
      let n: HTMLElement | null = el;
      while (n && n !== board) {
        left += n.offsetLeft;
        top += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      const z = Math.max(view.current.z, 0.4);
      view.current = { x: 72 - left * z, y: 84 - top * z, z };
      apply(true);
      setZoom(z);
    }
    U({ scrollTo: null });
  }, [ui.scrollTo, U, apply]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, select, [contenteditable='true'], .tools, .zoombar, .toggle, .inline-ed .bar, .pop, .catch")) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: view.current.x, oy: view.current.y, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      vpRef.current!.setPointerCapture(d.id);
      vpRef.current!.classList.add("panning");
    }
    view.current.x = d.ox + dx;
    view.current.y = d.oy + dy;
    apply();
  };
  const endDrag = () => {
    if (drag.current?.moved) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
    }
    drag.current = null;
    vpRef.current?.classList.remove("panning");
  };

  return (
    <section
      className="canvas pan"
      ref={vpRef}
      aria-label="Email canvas. Drag to move around, scroll to pan, Ctrl or Command and scroll to zoom."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation();
          e.preventDefault();
          suppressClick.current = false;
        }
      }}
      onClick={() => U({ selEmail: null, selState: null, sel: null })}
    >
      <div className="board" ref={boardRef}>
        <Board />
      </div>

      <div className="canvas-hint">
        <Icon n="hand" s={13} />
        Drag to move around · ⌘/Ctrl + scroll to zoom
      </div>
      <div className="zoombar" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ibtn sm" aria-label="Zoom out" onClick={() => zoomCenter(view.current.z / 1.25)}>
          <Icon n="minus" s={15} />
        </button>
        <button type="button" className="zval tnum" title="Reset to 100%" onClick={() => zoomCenter(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className="ibtn sm" aria-label="Zoom in" onClick={() => zoomCenter(view.current.z * 1.25)}>
          <Icon n="plus" s={15} />
        </button>
        <span className="vbar" />
        <button type="button" className="btn sm ghost" onClick={fit}>
          Fit all
        </button>
      </div>

      {!ui.selEmail && (
        <div className="float-hint" onClick={(e) => e.stopPropagation()}>
          <Icon n="pointer" s={14} />
          <span>
            <b>Click a template to select it,</b> or click any block inside it to edit that block.
          </span>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Layers panel                                                        */
/* ------------------------------------------------------------------ */

function Layers() {
  const { ui, U, mod, emailDirty } = useStudio();
  const q = ui.search.toLowerCase();
  const nTemplates = mod.emails.length;

  return (
    <nav className="nav layers" aria-label="Layers">
      <div className="row" style={{ padding: "6px 10px 10px" }}>
        <span className="tile" style={{ width: 30, height: 30, background: "var(--accent-soft)", color: "var(--accent)" }}>
          <Icon n={mod.icon} s={15} />
        </span>
        <span className="grow">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{mod.name}</div>
          <div className="muted" style={{ fontSize: 11 }}>
            {nTemplates} templates
          </div>
        </span>
      </div>
      <div style={{ padding: "0 4px 4px", position: "relative" }}>
        <input
          id="nav-search"
          className="input"
          style={{ height: 32, paddingLeft: 30 }}
          placeholder="Find a template"
          value={ui.search}
          onChange={(e) => U({ search: e.target.value })}
        />
        <span style={{ position: "absolute", left: 14, top: 8, color: "var(--faint)" }}>
          <Icon n="search" s={15} />
        </span>
      </div>

      <button type="button" className={"it root" + (!ui.selEmail ? " on" : "")} onClick={() => U({ selEmail: null, selState: null, sel: null })}>
        <Icon n="layers" s={15} />
        <span className="grow">All templates</span>
        <span className="cnt">{nTemplates}</span>
      </button>

      {AUDIENCES.map((a) => {
        const list = [...mod.emails.filter((e) => e.aud === a && !isDigest(e)), ...mod.emails.filter((e) => e.aud === a && isDigest(e))].filter((e) =>
          e.name.toLowerCase().includes(q),
        );
        if (!list.length) return null;
        return (
          <div key={a}>
            <div className="grp eyebrow">{AUD[a]}</div>
            {list.map((e) => {
              const states = statesOf(e);
              const multi = states.length > 1;
              const open = ui.selEmail === e.id;
              const d = emailDirty(mod.id, e.id);
              return (
                <div key={e.id}>
                  <button
                    type="button"
                    className={"it" + (open && (!ui.selState || !multi) ? " on" : open ? " parent" : "") + (e.on ? "" : " isoff")}
                    onClick={() => U({ selEmail: e.id, emailId: e.id, selState: null, sel: null, scrollTo: e.id })}
                  >
                    <span className="caret">{multi ? <Icon n={open ? "chevD" : "chevR"} s={13} /> : <span style={{ width: 13, display: "inline-block" }} />}</span>
                    {isDigest(e) ? <Icon n="cal" s={13} c={e.on ? "var(--accent)" : "var(--faint)"} /> : <span className={"dot" + (d ? " amber" : e.on ? "" : " off")} />}
                    <span className="grow ellipsis">{e.name}</span>
                    {!e.on && <span style={{ fontSize: 11 }}>Off</span>}
                  </button>
                  {multi && open && (
                    <div className="children">
                      {states.map((st) => (
                        <button
                          type="button"
                          key={st.id}
                          className={"it child" + (ui.selState === st.id ? " on" : "")}
                          onClick={() => U({ selEmail: e.id, emailId: e.id, selState: st.id, sel: null, scrollTo: e.id + ":" + st.id })}
                        >
                          <Icon n="layout" s={13} />
                          <span className="grow ellipsis">{st.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="legend">
        <span className="row" style={{ gap: 5 }}>
          <span className="dot" />
          Sending
        </span>
        <span className="row" style={{ gap: 5 }}>
          <span className="dot amber" />
          Draft
        </span>
        <span className="row" style={{ gap: 5 }}>
          <span className="dot off" />
          Off
        </span>
        <span className="row" style={{ gap: 5 }}>
          <Icon n="cal" s={12} />
          Digest
        </span>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Content tab. Every template of the module on one pannable canvas, grouped into
 * persona sections; templates with several states show them side by side.
 * Properties on the right follow the selection: nothing → all templates,
 * a template → that template, a block → that block.
 */
export function ContentTab() {
  const { ui, mod } = useStudio();
  const selEmail = ui.selEmail ? mod.emails.find((e) => e.id === ui.selEmail) || null : null;
  const sel = selEmail && ui.sel && selEmail.blocks.some((b) => b.id === ui.sel) ? ui.sel : null;

  return (
    <div className="stbody">
      <Layers />
      <Canvas />
      <aside className="insp" aria-label="Properties">
        {selEmail && sel ? <BlockPanel b={selEmail.blocks.find((b) => b.id === sel)!} /> : selEmail ? <EmailPanel /> : <GlobalPanel />}
      </aside>
    </div>
  );
}
