import { Fragment, useEffect, useRef, useState } from "react";
import type { Audience } from "@/data/types";
import { Icon } from "@/lib/icons";
import { resolve } from "@/lib/utils";
import { CH_ICON, CHANNELS, collectedBy, emailById, FREQ_NAME, SUMMARY_FREQS, varsFor, type Channel, type Notif, type Variant } from "@/v2/model";
import { AppPreview, EmailPreview, setText, SlackPreview, type EditProps, type Field } from "@/v2/Previews";
import { usePan } from "@/v2/Editor";
import { use2 } from "@/v2/store";
import { Btn, Check, Num, Switch, Tag } from "@/v2/ui";
import { chrono, eventOf, isOff, PERSONAS, persona, whenOf } from "./journey";

/*
 * Version 3 · Focus editor. One person's notifications, in the order they get them, laid out on a
 * canvas you can drag around (only as far as there is something to see). Each notification shows
 * every channel side by side; the panel on the left holds the selected notification's settings.
 */

const CH_NAME: Record<Channel, string> = { email: "E-mail", slack: "Slack", app: "App notifications" };
const CH_SETTING: Record<Channel, string> = { email: "E-mail notifications", slack: "Slack notifications", app: "In-app notifications" };

/** The variants a notification shows as rows: versions that are on, plus its reminder when any channel reminds. */
function rowsOf(n: Notif): Variant[] {
  const versions = n.variants.filter((v) => v.kind === "version");
  const on = versions.filter((v) => v.on);
  const reminds = CHANNELS.some((c) => n.ch[c].on && n.ch[c].remind);
  return [...(on.length ? on : versions.slice(0, 1)), ...n.variants.filter((v) => v.kind === "reminder" && v.on && reminds)];
}

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

function TopBar({ list, focus }: { list: Notif[]; focus: (n: Notif) => void }) {
  const { ui, setUi, product, notif, changed, toast, undo, redo, canUndo, canRedo } = use2();
  const people = PERSONAS.filter((p) => product.notifs.some((n) => n.aud === p.aud));
  const steps = [...product.stages.slice(0, 5).map((s, i) => ({ i, s })), { i: 5, s: "Summaries" }];
  return (
    <header className="n3-top">
      <button type="button" className="n2-icon-btn" aria-label="Close the editor" title="Back to the list" onClick={() => setUi({ view: "product" })}>
        <Icon n="x" s={18} />
      </button>
      <span className="vline" />
      <span className="n3-crumb">{product.name}</span>
      <Icon n="chevR" s={14} c="#9F9FA9" />
      <label className="n3-persona">
        <span className="sr">Whose notifications</span>
        <select value={ui.persona} onChange={(e) => setUi({ persona: e.target.value as Audience, notifId: null, variantId: null })}>
          {people.map((p) => (
            <option key={p.aud} value={p.aud}>
              {p.one}
            </option>
          ))}
        </select>
        <Icon n="chevUD" s={14} />
      </label>
      <span className="grow" />
      <nav className="n3-steps" aria-label="Where this fits">
        {steps.map(({ i, s }, k) => {
          const first = list.find((n) => n.stage === i);
          const on = notif?.stage === i;
          return (
            <Fragment key={i}>
              {k > 0 && <span className="ln" />}
              <button type="button" className={"st" + (on ? " on" : "") + (i === 5 ? " sum" : "")} disabled={!first} title={first ? `Go to ${first.name}` : `${persona(ui.persona).many} aren’t told at this step`} onClick={() => first && focus(first)}>
                <i>{i === 5 ? <Icon n="cal" s={10} w={2.4} /> : i + 1}</i>
                {s}
              </button>
            </Fragment>
          );
        })}
      </nav>
      <span className="grow" />
      <button type="button" className="n2-icon-btn" aria-label="Undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>
        <Icon n="undo" s={17} />
      </button>
      <button type="button" className="n2-icon-btn" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo}>
        <Icon n="redo" s={17} />
      </button>
      <span className="vline" />
      <Btn icon="send" disabled={!notif} onClick={() => toast("Test sent to you on every channel that’s on")}>
        Send test
      </Btn>
      <button type="button" className="n2-btn blue" disabled={!changed.length} onClick={() => setUi({ modal: "publish" })}>
        Review &amp; publish
        {changed.length > 0 && <span className="count">{changed.length}</span>}
      </button>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Left panel                                                          */
/* ------------------------------------------------------------------ */

const TIMES = ["8:00 AM", "9:00 AM", "9:30 AM", "10:00 AM", "12:00 PM", "5:30 PM", "6:00 PM"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function Panel() {
  const { S, DEF, product, notif, upNotif, setUi, toast } = use2();
  if (!notif) return <aside className="n3-panel" />;
  const n = notif;
  const up = (fn: (x: Notif) => void) => upNotif(n.id, fn);
  const main = CHANNELS.find((c) => n.ch[c].on) || "email";
  const cs = n.ch[main];
  const anyOn = CHANNELS.some((c) => n.ch[c].on && S.channels[c] === "connected");
  const versions = n.variants.filter((v) => v.kind === "version");
  const def = DEF.products.find((p) => p.id === product.id)!.notifs.find((x) => x.id === n.id)!;
  const isDefault = JSON.stringify(n) === JSON.stringify(def);
  const sel = (label: string, value: string, opts: string[], on: (v: string) => void) => (
    <select className="n2-select" aria-label={label} value={value} onChange={(e) => on(e.target.value)}>
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
  return (
    <aside className="n3-panel" aria-label="Notification settings">
      <div className="ps head">
        <h2>{n.name}</h2>
        <p>{n.desc}</p>
      </div>
      <div className="ps">
        <h3>Notifications</h3>
        {(n.summary ? (["email"] as Channel[]) : CHANNELS).map((c) => (
          <div className="row" key={c}>
            <Icon n={CH_ICON[c]} s={16} />
            <span className="grow">{CH_SETTING[c]}</span>
            {S.channels[c] === "connected" ? (
              <Switch on={n.ch[c].on} label={CH_SETTING[c]} onChange={(v) => up((x) => void (x.ch[c].on = v))} />
            ) : (
              <button type="button" className="n2-inline small" onClick={() => setUi({ view: "home" })}>
                {S.channels[c] === "paused" ? "Paused" : "Connect"}
              </button>
            )}
          </div>
        ))}
        {!n.summary && !anyOn && <p className="n2-warn">Not sent on any channel. Turn one on to start sending it.</p>}
      </div>
      {n.summary ? (
        <div className="ps">
          <h3>Schedule</h3>
          <Check on={n.schedule!.daily.on} onChange={(v) => up((x) => void (x.schedule!.daily.on = v))}>
            Daily
          </Check>
          {n.schedule!.daily.on && <div className="indent row">at {sel("Daily time", n.schedule!.daily.time, TIMES, (v) => up((x) => void (x.schedule!.daily.time = v)))}</div>}
          <Check on={n.schedule!.weekly.on} onChange={(v) => up((x) => void (x.schedule!.weekly.on = v))}>
            Weekly
          </Check>
          {n.schedule!.weekly.on && (
            <div className="indent row">
              on {sel("Weekly day", n.schedule!.weekly.day, DAYS, (v) => up((x) => void (x.schedule!.weekly.day = v)))} at {sel("Weekly time", n.schedule!.weekly.time, TIMES, (v) => up((x) => void (x.schedule!.weekly.time = v)))}
            </div>
          )}
          <Check on={n.schedule!.monthly.on} onChange={(v) => up((x) => void (x.schedule!.monthly.on = v))}>
            Monthly
          </Check>
          {n.schedule!.monthly.on && (
            <div className="indent row">
              on day <Num label="Day of month" value={n.schedule!.monthly.date} max={28} onChange={(v) => up((x) => void (x.schedule!.monthly.date = v))} />
            </div>
          )}
          <p className="muted small">Collects {collectedBy(product, n).length} notification{collectedBy(product, n).length === 1 ? "" : "s"}. Skipped when there’s nothing new.</p>
        </div>
      ) : (
        <div className="ps">
          <h3>When</h3>
          <Check on={cs.instant} onChange={(v) => up((x) => CHANNELS.forEach((c) => (x.ch[c].instant = v)))}>
            Instantly
          </Check>
          <Check on={cs.freqs.length > 0} onChange={(v) => up((x) => CHANNELS.forEach((c) => (x.ch[c].freqs = v ? ["daily"] : [])))}>
            Periodic summary
          </Check>
          {cs.freqs.length > 0 && (
            <div className="indent">
              <div className="n2-chips">
                {SUMMARY_FREQS.map((f) => {
                  const on = cs.freqs.includes(f);
                  return (
                    <button
                      type="button"
                      key={f}
                      className={"n2-chip" + (on ? " on" : "")}
                      aria-pressed={on}
                      onClick={() =>
                        up((x) =>
                          CHANNELS.forEach((c) => {
                            const cur = x.ch[c].freqs;
                            x.ch[c].freqs = on ? (cur.length > 1 ? cur.filter((y) => y !== f) : cur) : SUMMARY_FREQS.filter((y) => y === f || cur.includes(y));
                          }),
                        )
                      }
                    >
                      {on && <Icon n="check" s={12} w={2.4} />}
                      {FREQ_NAME[f]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {!cs.instant && !cs.freqs.length && <p className="n2-warn">Pick at least one, or it won’t go out.</p>}
        </div>
      )}
      {n.reminder && (
        <div className="ps">
          <h3>Reminders</h3>
          <div className="row">
            <Icon n="repeat" s={15} />
            <span className="grow">Remind them if they haven’t acted</span>
            <Switch on={cs.remind} label="Reminders" onChange={(v) => up((x) => CHANNELS.forEach((c) => (x.ch[c].remind = v)))} />
          </div>
          {cs.remind && (
            <div className="row wrap">
              Every <Num label="Days between reminders" value={n.reminder.every} max={14} onChange={(v) => up((x) => void (x.reminder!.every = v))} /> days, up to{" "}
              <Num label="Number of reminders" value={n.reminder.max} max={6} onChange={(v) => up((x) => void (x.reminder!.max = v))} /> reminders.
            </div>
          )}
        </div>
      )}
      {versions.length > 1 && (
        <div className="ps">
          <h3>Versions</h3>
          <p className="muted small">The wording changes with what happened. Each one is shown on the canvas.</p>
          {versions.map((v) => (
            <div className="row" key={v.id}>
              <span className="grow">{v.label}</span>
              <Switch on={v.on} label={"Send " + v.label} onChange={(val) => up((x) => void (x.variants.find((y) => y.id === v.id)!.on = val))} />
            </div>
          ))}
        </div>
      )}
      <div className="ps">
        <div className="n2-hint">
          <Icon n="info" s={15} />
          <span>Change the subject, preview text and wording right on the messages in the canvas. Editable text has a dashed outline.</span>
        </div>
        <Btn
          icon="undo"
          full
          disabled={isDefault}
          onClick={() => {
            up((x) => Object.assign(x, JSON.parse(JSON.stringify(def))));
            toast("Back to the default settings for " + n.name);
          }}
        >
          Back to default settings
        </Btn>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

type Editing = { vid: string; field: Field } | null;

/** Set when a click on the canvas selects a notification, so the canvas doesn't jump to it. */
let pickedOnCanvas = false;

function Group({ n, idx, editing, setEditing }: { n: Notif; idx: number; editing: Editing; setEditing: (e: Editing) => void }) {
  const { S, ui, setUi, product, upNotif } = use2();
  const selected = ui.notifId === n.id;
  const chans: Channel[] = n.summary ? ["email"] : CHANNELS;
  const rows = rowsOf(n);
  const off = isOff(n, S.channels);
  const stage = n.stage === 5 ? "Summary" : product.stages[n.stage];
  const items = n.summary ? collectedBy(product, n).map((x) => ({ name: x.name, line: resolve(x.variants[0].copy.head, varsFor(x.variants[0], S.brand)) })) : undefined;
  const select = () => {
    if (selected) return;
    pickedOnCanvas = true;
    setUi({ notifId: n.id, variantId: n.variants[0].id });
  };
  return (
    <section className={"n3-group" + (selected ? " sel" : "") + (off ? " off" : "")} data-nid={n.id} aria-label={n.name} onClick={(e) => (e.stopPropagation(), select())}>
      <div className="gt">
        <span className="num">{idx}.</span>
        <b>{n.name}</b>
        {off && <Tag>Off</Tag>}
        <span className="meta">
          {stage} · {whenOf(n, S.channels)}
        </span>
      </div>
      <div className="gbox" style={{ gridTemplateColumns: chans.map((c) => (c === "email" ? "600px" : c === "slack" ? "520px" : "360px")).join(" ") }}>
        {chans.map((c) => (
          <div className="colhd" key={c}>
            <span>{CH_NAME[c]}</span>
            {S.channels[c] === "connected" && <Switch on={n.ch[c].on} label={`${CH_NAME[c]} for ${n.name}`} onChange={(v) => upNotif(n.id, (x) => void (x.ch[c].on = v))} />}
          </div>
        ))}
        {rows.map((v) => (
          <Fragment key={v.id}>
            {rows.length > 1 && (
              <div className="vrow" style={{ gridColumn: `1 / span ${chans.length}` }}>
                {v.kind === "reminder" ? <Icon n="repeat" s={13} /> : <Icon n="layers" s={13} />}
                {v.label}
                {v.kind === "reminder" && n.reminder && <span className="faint">· every {n.reminder.every} days, up to {n.reminder.max}</span>}
              </div>
            )}
            {chans.map((c) => {
              if (S.channels[c] !== "connected")
                return (
                  <div className="n3-cell empty" key={c}>
                    <Icon n={CH_ICON[c]} s={18} />
                    <span>{CH_NAME[c]} isn’t connected</span>
                    <button type="button" className="n2-inline small" onClick={(e) => (e.stopPropagation(), setUi({ view: "home" }))}>
                      Connect it in Settings
                    </button>
                  </div>
                );
              if (!n.ch[c].on)
                return (
                  <div className="n3-cell empty" key={c}>
                    <Icon n={CH_ICON[c]} s={18} />
                    <span>Not sent by {c === "app" ? "the app" : CH_NAME[c].toLowerCase()}</span>
                    <button type="button" className="n2-inline small" onClick={(e) => (e.stopPropagation(), upNotif(n.id, (x) => void (x.ch[c].on = true)))}>
                      Turn on
                    </button>
                  </div>
                );
              const p: EditProps = {
                copy: v.copy,
                v: { ...varsFor(v, S.brand), period: "daily" },
                brand: S.brand,
                editable: selected,
                editing: selected && editing?.vid === v.id ? editing.field : null,
                setEditing: (f) => setEditing(f ? { vid: v.id, field: f } : null),
                onChange: (f, val) => upNotif(n.id, (x) => setText(x.variants.find((y) => y.id === v.id)!.copy, f, val)),
              };
              return (
                <div className={"n3-cell " + c} key={c}>
                  {c === "email" && <EmailPreview email={emailById(v.emailId)!} p={p} items={items} fields />}
                  {c === "slack" && <SlackPreview p={p} />}
                  {c === "app" && <AppPreview p={p} compact />}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <p className="gfoot">{eventOf(n)}</p>
    </section>
  );
}

function Canvas({ list }: { list: Notif[] }) {
  const { ui, setUi } = use2();
  const ws = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const zoomBy = (d: number) => setUi((u) => ({ zoom: Math.min(1.4, Math.max(0.3, +(u.zoom + d).toFixed(2))) }));
  const pan = usePan(ws, zoomBy);
  useEffect(() => setEditing(null), [ui.notifId]);
  // bring the selected notification into view (from the list page, the stepper, or a persona switch)
  useEffect(() => {
    if (pickedOnCanvas) {
      pickedOnCanvas = false;
      return;
    }
    const el = ws.current;
    const g = el?.querySelector<HTMLElement>(`[data-nid="${ui.notifId}"]`);
    if (!el || !g) return;
    const a = el.getBoundingClientRect();
    const b = g.getBoundingClientRect();
    const top = el.scrollTop + b.top - a.top - 32;
    const left = el.scrollLeft + b.left - a.left - 32;
    el.scrollTo({ top, left: Math.max(0, left), behavior: "smooth" });
  }, [ui.notifId, ui.persona]);
  return (
    <div className="n3-canvas-wrap">
      <div ref={ws} className={"n3-canvas" + (pan.panning ? " panning" : "")} onClick={() => setEditing(null)} {...pan.handlers}>
        <div className="n3-stack" style={{ zoom: ui.zoom }}>
          {list.map((n, i) => (
            <Group key={n.id} n={n} idx={i + 1} editing={editing} setEditing={setEditing} />
          ))}
        </div>
      </div>
      <div className="n2-zoom top" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(-0.1)}>
          <Icon n="minus" s={14} />
        </button>
        <button type="button" className="val" onClick={() => setUi({ zoom: 0.7 })} title="Back to 70%">
          {Math.round(ui.zoom * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(0.1)}>
          <Icon n="plus" s={14} />
        </button>
      </div>
      {!editing && (
        <div className="n2-pill" aria-live="polite">
          <Icon n="pointer" s={14} />
          Drag to move around · click any highlighted text to change it
        </div>
      )}
    </div>
  );
}

export function FocusEditor() {
  const { ui, setUi, product, notif, undo, redo } = use2();
  const list = chrono(product).filter((n) => n.aud === ui.persona);
  // always have something selected for this person
  useEffect(() => {
    if ((!notif || notif.aud !== ui.persona) && list[0]) setUi({ notifId: list[0].id, variantId: list[0].variants[0].id });
  }, [ui.persona, notif, list, setUi]);
  // ⌘Z / ⇧⌘Z outside text fields
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, select, textarea, [contenteditable]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [undo, redo]);
  const focus = (n: Notif) => setUi({ notifId: n.id, variantId: n.variants[0].id });
  return (
    <div className="n3-focus">
      <TopBar list={list} focus={focus} />
      <div className="n3-body">
        <Panel />
        <Canvas list={list} />
      </div>
    </div>
  );
}
