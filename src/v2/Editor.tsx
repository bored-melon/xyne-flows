import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AUD, resolve } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import type { Audience } from "@/data/types";
import {
  anyOn,
  CH_ICON,
  CH_LABEL,
  CH_SEND,
  CHANNELS,
  collectedBy,
  emailById,
  FREQ_NAME,
  onChannels,
  SUMMARY_FREQS,
  timingLine,
  varsFor,
  type Channel,
  type Notif,
  type Variant,
} from "./model";
import { AppPreview, EmailPreview, SlackPreview, setText, type EditProps, type Field } from "./Previews";
import { use2 } from "./store";
import { Btn, Check, Num, Switch, Tag } from "./ui";

const LANES: { aud: Audience; icon: string }[] = [
  { aud: "employee", icon: "user" },
  { aud: "approver", icon: "users" },
  { aud: "admin", icon: "sliders" },
];
const laneName = (a: Audience, productId: string) => (a === "admin" && productId === "travel" ? "Admin & travel desk" : a.charAt(0).toUpperCase() + a.slice(1));

/* ------------------------------------------------------------------ */
/* Journey                                                             */
/* ------------------------------------------------------------------ */

function JourneyCard({ n }: { n: Notif }) {
  const { S, ui, product, setUi } = use2();
  const off = !n.summary && !anyOn(n, S.channels);
  const on = onChannels(n, S.channels);
  const versions = n.variants.filter((v) => v.kind === "version").length;
  const reminds = n.reminder && CHANNELS.some((c) => n.ch[c].on && n.ch[c].remind);
  const sel = ui.notifId === n.id;
  const collected = n.summary ? collectedBy(product, n).length : 0;
  return (
    <button
      type="button"
      className={"n2-jcard" + (sel ? " sel" : "") + (off ? " off" : "") + (n.summary ? " sum" : "")}
      onClick={() => selectNotif(setUi, n, S.channels)}
      aria-pressed={sel}
    >
      <span className="t">
        <span className="nm">{n.name}</span>
        {off && <Tag>Off</Tag>}
      </span>
      <span className="ln">
        <Icon n={n.summary ? "cal" : "clock"} s={12} />
        <span className="grow">{timingLine(n, S.channels)}</span>
        {on.map((c) => (
          <Icon key={c} n={CH_ICON[c]} s={12} />
        ))}
      </span>
      {versions > 1 && (
        <span className="ln">
          <Icon n="layers" s={12} />
          {versions} versions
        </span>
      )}
      {reminds && (
        <span className="ln dash">
          <Icon n="repeat" s={12} />
          Reminds every {n.reminder!.every} days
        </span>
      )}
      {n.summary && (
        <span className="ln dash">
          <Icon n="repeat" s={12} />
          {collected ? `Collects ${collected} notification${collected > 1 ? "s" : ""}` : "Nothing goes into it yet"}
        </span>
      )}
    </button>
  );
}

export function selectNotif(setUi: ReturnType<typeof use2>["setUi"], n: Notif, channels: Record<Channel, string>) {
  const first = CHANNELS.find((c) => n.ch[c].on && channels[c] === "connected") || "email";
  setUi({ notifId: n.id, channel: first, variantId: n.variants[0].id });
}

/** The journey's top edge: drag to make it taller or shorter, double-click to reset. */
function Splitter() {
  const { ui, setUi } = use2();
  const start = useRef<{ y: number; h: number; max: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div className="n2-split">
      <i
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize the journey"
        aria-valuenow={ui.journeyH}
        tabIndex={0}
        className={dragging ? "on" : ""}
        onPointerDown={(e) => {
          const main = (e.currentTarget.closest(".n2-main") as HTMLElement)?.getBoundingClientRect();
          start.current = { y: e.clientY, h: ui.journeyH, max: main ? main.height - 180 : 600 };
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const st = start.current;
          if (!st) return;
          setUi({ journeyH: Math.round(Math.max(140, Math.min(st.max, st.h - (e.clientY - st.y)))) });
        }}
        onPointerUp={() => {
          start.current = null;
          setDragging(false);
        }}
        onDoubleClick={() => setUi({ journeyH: Math.round(Math.min(380, window.innerHeight * 0.4)) })}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") setUi((u) => ({ journeyH: u.journeyH + 24 }));
          if (e.key === "ArrowDown") setUi((u) => ({ journeyH: Math.max(140, u.journeyH - 24) }));
        }}
      />
    </div>
  );
}

function Journey() {
  const { product, setUi, ui } = use2();
  const stages = product.stages.slice(0, 5);
  const lanes = LANES.filter((l) => product.notifs.some((n) => n.aud === l.aud));
  return (
    <section className="n2-journey" aria-label="Journey" style={{ height: ui.journeyH }}>
      <div className="hd">
        <b>Journey</b>
        <span className="muted">When each notification goes out, and to whom</span>
        <span className="grow" />
        <button type="button" className="n2-link" onClick={() => setUi({ journeyOpen: false })}>
          Collapse <Icon n="chevD" s={15} />
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `160px repeat(${stages.length}, minmax(176px, 1fr)) minmax(224px, 1fr)` }}>
        <span className="stg first" />
        {stages.map((s, i) => (
          <span className="stg" key={s}>
            <i>{i + 1}</i>
            {s}
          </span>
        ))}
        <span className="stg sum">
          <Icon n="cal" s={14} />
          Summaries
        </span>
        {lanes.map((l, li) => (
          <div className={"lane" + (li % 2 ? " alt" : "")} key={l.aud} style={{ display: "contents" }}>
            <span className={"lbl" + (li % 2 ? " alt" : "")}>
              <Icon n={l.icon} s={15} />
              {laneName(l.aud, product.id)}
            </span>
            {[...stages.map((_, i) => i), 5].map((si) => (
              <div className={"cell" + (li % 2 ? " alt" : "") + (si === 5 ? " sum" : "")} key={si}>
                {product.notifs
                  .filter((n) => n.aud === l.aud && (si === 5 ? n.stage === 5 : n.stage === si))
                  .map((n) => (
                    <JourneyCard key={n.id} n={n} />
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Collapsed journey: who it's for, and where it sits in the request. */
function JourneyBar() {
  const { product, notif, setUi } = use2();
  const lane = notif && LANES.find((l) => l.aud === notif.aud);
  return (
    <div className="n2-jbar">
      <b>Journey</b>
      {notif && lane && (
        <span className="who">
          <Icon n={lane.icon} s={14} />
          {laneName(notif.aud, product.id)}
        </span>
      )}
      <span className="steps">
        {product.stages.slice(0, 5).map((s, i) => {
          const on = notif?.stage === i;
          return (
            <Fragment key={s}>
              {i > 0 && <span className="ln" />}
              <span className={"st" + (on ? " on" : "")} title={s}>
                <i>{i + 1}</i>
                {on && s}
              </span>
            </Fragment>
          );
        })}
        {notif?.summary && <span className="ln" />}
        {notif?.summary && (
          <span className="st on sum">
            <i>
              <Icon n="cal" s={10} c="#fff" w={2.2} />
            </i>
            Summaries
          </span>
        )}
      </span>
      <span className="grow" />
      <button type="button" className="n2-link" onClick={() => setUi({ journeyOpen: true })}>
        Show journey <Icon n="chevU" s={15} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

function Empty({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="n2-ws empty">
      <div className="n2-empty">
        <span className="badge">
          <Icon n={icon} s={22} />
        </span>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

/** Drag the background to move around. Only as far as there is something to see: the scroll area is the frames. */
function usePan(ref: React.RefObject<HTMLDivElement>, zoom: (d: number) => void) {
  const drag = useRef<{ x: number; y: number; sl: number; st: number; moved: boolean; id: number } | null>(null);
  const swallow = useRef(false);
  const [panning, setPanning] = useState(false);
  // ⌘/Ctrl + scroll zooms (needs a non-passive listener to stop the browser zooming the page)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoom(e.deltaY < 0 ? 0.05 : -0.05);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  });
  return {
    panning,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0 || !ref.current) return;
        if ((e.target as HTMLElement).closest(".n2-editable,.n2-editing,.n2-menu,button,input,select,[contenteditable]")) return;
        drag.current = { x: e.clientX, y: e.clientY, sl: ref.current.scrollLeft, st: ref.current.scrollTop, moved: false, id: e.pointerId };
      },
      onPointerMove: (e: React.PointerEvent) => {
        const d = drag.current;
        const el = ref.current;
        if (!d || !el) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved) {
          if (Math.hypot(dx, dy) < 4) return;
          d.moved = true;
          setPanning(true);
          el.setPointerCapture(d.id);
        }
        el.scrollLeft = d.sl - dx;
        el.scrollTop = d.st - dy;
      },
      onPointerUp: () => {
        const d = drag.current;
        drag.current = null;
        if (d?.moved) {
          setPanning(false);
          swallow.current = true;
          setTimeout(() => (swallow.current = false), 60);
        }
      },
      onPointerCancel: () => {
        drag.current = null;
        setPanning(false);
      },
      // a drag shouldn't also count as a click on a frame
      onClickCapture: (e: React.MouseEvent) => {
        if (!swallow.current) return;
        swallow.current = false;
        e.stopPropagation();
      },
    },
  };
}

function Workspace() {
  const { S, ui, setUi, notif, upNotif, product } = use2();
  const [editing, setEditing] = useState<Field | null>(null);
  const ws = useRef<HTMLDivElement>(null);
  const zoomBy = (d: number) => setUi((u) => ({ zoom: Math.min(1.4, Math.max(0.3, +(u.zoom + d).toFixed(2))) }));
  const pan = usePan(ws, zoomBy);
  useEffect(() => setEditing(null), [ui.notifId, ui.channel, ui.variantId]);
  // a new notification or channel starts from the top-left, where the first frame is
  useLayoutEffect(() => {
    const el = ws.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
  }, [ui.notifId, ui.channel]);

  if (!notif)
    return (
      <Empty icon="pointer" title="Pick a notification from the journey">
        Each card is one notification. Select it to see exactly what people receive and change how it’s sent.
      </Empty>
    );

  const c = ui.channel;
  if (!notif.summary && !anyOn(notif, S.channels))
    return (
      <Empty icon="bellOff" title={`${notif.name} isn’t sent on any channel`}>
        {AUD[notif.aud].replace("To ", "").replace(/^./, (m) => m.toUpperCase())}s don’t get it today. Turn on email, Slack or the app in the panel to preview it and start sending.
      </Empty>
    );
  if (S.channels[c] !== "connected" || !notif.ch[c].on)
    return (
      <Empty icon={CH_ICON[c]} title={S.channels[c] === "connected" ? `${notif.name} isn’t sent on ${CH_LABEL[c]}` : `${CH_LABEL[c]} isn’t connected`}>
        {S.channels[c] === "connected" ? `Turn on ${CH_LABEL[c].toLowerCase()} in the panel to preview it here.` : "Connect it in Settings › Notifications to use it for any notification."}
      </Empty>
    );

  const frames = notif.variants.filter((v) => v.on && (v.kind === "version" || notif.ch[c].remind));
  const set = (v: Variant, f: Field, val: string) =>
    upNotif(notif.id, (n) => {
      setText(n.variants.find((x) => x.id === v.id)!.copy, f, val);
    });
  const anySel = frames.some((v) => ui.variantId === v.id) || frames.length === 1;

  return (
    <div className="n2-wsw">
      <div ref={ws} className={"n2-ws" + (pan.panning ? " panning" : "")} onClick={() => setEditing(null)} {...pan.handlers}>
        <div className="frames" style={{ zoom: ui.zoom }}>
          {frames.map((v) => {
            const selected = ui.variantId === v.id || (frames.length === 1 && !ui.variantId);
            const p: EditProps = {
              copy: v.copy,
              v: { ...varsFor(v, S.brand), period: "daily" },
              brand: S.brand,
              editable: selected,
              editing: selected ? editing : null,
              setEditing,
              onChange: (f, val) => set(v, f, val),
            };
            const email = emailById(v.emailId)!;
            return (
              <div
                key={v.id}
                className={"n2-frame " + c + (selected ? " sel" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!selected) setUi({ variantId: v.id });
                }}
              >
                <div className="flabel">
                  {v.label}
                  {v.kind === "reminder" && notif.reminder && <span className="muted"> · every {notif.reminder.every} days, up to {notif.reminder.max}</span>}
                </div>
                {c === "email" && (
                  <EmailPreview
                    email={email}
                    p={p}
                    items={notif.summary ? collectedBy(product, notif).map((x) => ({ name: x.name, line: resolve(x.variants[0].copy.head, varsFor(x.variants[0], S.brand)) })) : undefined}
                  />
                )}
                {c === "slack" && <SlackPreview p={p} />}
                {c === "app" && <AppPreview p={p} />}
              </div>
            );
          })}
        </div>
      </div>
      {anySel && !editing && (
        <div className="n2-pill" aria-live="polite">
          <Icon n="pointer" s={14} />
          Click any highlighted text to change it
        </div>
      )}
      <div className="n2-zoom" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Right panel                                                         */
/* ------------------------------------------------------------------ */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIMES = ["8:00 AM", "9:00 AM", "9:30 AM", "10:00 AM", "12:00 PM", "5:30 PM", "6:00 PM"];

function Sel({ value, opts, onChange, label }: { value: string; opts: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <select className="n2-select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

function Panel() {
  const { S, DEF, ui, setUi, notif, product, upNotif, toast } = use2();
  if (!notif) return null;
  const c = ui.channel;
  const cs = notif.ch[c];
  const connected = S.channels[c] === "connected";
  const up = (fn: (n: Notif) => void) => upNotif(notif.id, fn);
  const isDefault = JSON.stringify(notif) === JSON.stringify(DEF.products.find((p) => p.id === product.id)!.notifs.find((n) => n.id === notif.id));
  const versions = notif.variants.filter((v) => v.kind === "version");
  const digestFor = product.notifs.find((n) => n.summary && n.aud === notif.aud);

  return (
    <aside className="n2-panel" aria-label="Notification settings">
      <div className="ph">
        <h2>{notif.name}</h2>
        <p>{notif.desc}</p>
        <div className="n2-chtabs" role="tablist" aria-label="Channel">
          {CHANNELS.map((k) => {
            const live = notif.ch[k].on && S.channels[k] === "connected";
            const dis = notif.summary && k !== "email";
            return (
              <button
                type="button"
                role="tab"
                key={k}
                aria-selected={c === k}
                disabled={dis}
                title={dis ? "Summaries go out by email" : S.channels[k] !== "connected" ? `${CH_LABEL[k]} isn’t connected` : undefined}
                className={"t" + (c === k ? " on" : "")}
                onClick={() => setUi({ channel: k })}
              >
                <Icon n={CH_ICON[k]} s={14} />
                {CH_LABEL[k]}
                {live && <i className="dot" />}
              </button>
            );
          })}
        </div>
      </div>

      {!connected ? (
        <div className="ps">
          <div className="n2-hint">
            <Icon n="info" s={15} />
            <span>
              {CH_LABEL[c]} isn’t {S.channels[c] === "paused" ? "sending right now. It’s paused for everyone" : "connected yet"}.{" "}
              <button type="button" className="n2-inline" onClick={() => setUi({ view: "home" })}>
                Go to Settings
              </button>
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="ps">
            <div className="lab">Notifications</div>
            <div className="row">
              <span className="grow">{CH_SEND[c]}</span>
              <Switch on={cs.on} label={CH_SEND[c]} onChange={(v) => up((n) => void (n.ch[c].on = v))} />
            </div>
          </div>

          {!cs.on ? (
            <div className="ps">
              <div className="n2-hint">
                <Icon n="info" s={15} />
                <span>Timing{notif.reminder ? ", reminders" : ""} and wording appear once {CH_LABEL[c].toLowerCase()} is on.</span>
              </div>
            </div>
          ) : notif.summary ? (
            <>
              <div className="ps">
                <div className="lab">Schedule</div>
                <Check on={notif.schedule!.daily.on} onChange={(v) => up((n) => void (n.schedule!.daily.on = v))}>
                  Daily
                </Check>
                {notif.schedule!.daily.on && (
                  <div className="indent row">
                    at <Sel label="Daily time" value={notif.schedule!.daily.time} opts={TIMES} onChange={(v) => up((n) => void (n.schedule!.daily.time = v))} />
                  </div>
                )}
                <Check on={notif.schedule!.weekly.on} onChange={(v) => up((n) => void (n.schedule!.weekly.on = v))}>
                  Weekly
                </Check>
                {notif.schedule!.weekly.on && (
                  <div className="indent row">
                    on <Sel label="Weekly day" value={notif.schedule!.weekly.day} opts={DAYS} onChange={(v) => up((n) => void (n.schedule!.weekly.day = v))} /> at{" "}
                    <Sel label="Weekly time" value={notif.schedule!.weekly.time} opts={TIMES} onChange={(v) => up((n) => void (n.schedule!.weekly.time = v))} />
                  </div>
                )}
                <Check on={notif.schedule!.monthly.on} onChange={(v) => up((n) => void (n.schedule!.monthly.on = v))}>
                  Monthly
                </Check>
                {notif.schedule!.monthly.on && (
                  <div className="indent row">
                    on day <Num label="Day of month" value={notif.schedule!.monthly.date} max={28} onChange={(v) => up((n) => void (n.schedule!.monthly.date = v))} />
                  </div>
                )}
              </div>
              <div className="ps">
                <div className="lab">What goes into it</div>
                {collectedBy(product, notif).length ? (
                  collectedBy(product, notif).map((x) => (
                    <button type="button" key={x.id} className="n2-linkrow" onClick={() => selectNotif(setUi, x, S.channels)}>
                      {x.name}
                      <Icon n="chevR" s={15} />
                    </button>
                  ))
                ) : (
                  <p className="muted small">Nothing yet. Tick “Periodic summary” on any {AUD[notif.aud].replace("To ", "")} notification.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="ps">
                <div className="lab">When</div>
                <Check on={cs.instant} onChange={(v) => up((n) => void (n.ch[c].instant = v))}>
                  Instantly
                </Check>
                <Check
                  on={cs.freqs.length > 0}
                  onChange={(v) =>
                    up((n) => {
                      n.ch[c].freqs = v ? ["daily"] : [];
                    })
                  }
                >
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
                              up((n) => {
                                const cur = n.ch[c].freqs;
                                n.ch[c].freqs = on ? (cur.length > 1 ? cur.filter((x) => x !== f) : cur) : SUMMARY_FREQS.filter((x) => x === f || cur.includes(x));
                              })
                            }
                          >
                            {on && <Icon n="check" s={12} w={2.4} />}
                            {FREQ_NAME[f]}
                          </button>
                        );
                      })}
                    </div>
                    {digestFor && (
                      <button type="button" className="n2-inline small" onClick={() => selectNotif(setUi, digestFor, S.channels)}>
                        Goes into the {digestFor.name.toLowerCase()} →
                      </button>
                    )}
                  </div>
                )}
                {!cs.instant && !cs.freqs.length && <p className="n2-warn">Pick at least one, or it won’t go out on {CH_LABEL[c].toLowerCase()}.</p>}
              </div>

              {notif.reminder && (
                <div className="ps">
                  <div className="lab">Reminders</div>
                  <div className="row">
                    <Icon n="repeat" s={15} />
                    <span className="grow">Remind them if they haven’t acted</span>
                    <Switch on={cs.remind} label="Reminders" onChange={(v) => up((n) => void (n.ch[c].remind = v))} />
                  </div>
                  {cs.remind && (
                    <div className="row wrap">
                      Every <Num label="Days between reminders" value={notif.reminder.every} max={14} onChange={(v) => up((n) => void (n.reminder!.every = v))} /> days, up to{" "}
                      <Num label="Number of reminders" value={notif.reminder.max} max={6} onChange={(v) => up((n) => void (n.reminder!.max = v))} /> reminders.
                    </div>
                  )}
                </div>
              )}

              {versions.length > 1 && (
                <div className="ps">
                  <div className="lab">Versions</div>
                  {versions.map((v) => (
                    <div className={"n2-vrow" + (ui.variantId === v.id ? " on" : "")} key={v.id}>
                      <button type="button" className="grow" onClick={() => setUi({ variantId: v.id })}>
                        {v.label}
                      </button>
                      <Switch
                        on={v.on}
                        label={"Send " + v.label}
                        onChange={(val) =>
                          up((n) => {
                            n.variants.find((x) => x.id === v.id)!.on = val;
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="ps">
        {connected && cs.on && (
          <div className="n2-hint">
            <Icon n="pointer" s={15} />
            <span>
              {c === "email"
                ? "Click any highlighted text on the email to change it: subject, preview text, headline, section titles and the button."
                : c === "slack"
                  ? "Click the highlighted title or message on the Slack preview to change it."
                  : "Click the highlighted title or message on the phone preview to change it."}
            </span>
          </div>
        )}
        <Btn
          icon="undo"
          full
          disabled={isDefault}
          onClick={() => {
            const d = DEF.products.find((p) => p.id === product.id)!.notifs.find((n) => n.id === notif.id)!;
            up((n) => Object.assign(n, JSON.parse(JSON.stringify(d))));
            toast("Back to the default settings for " + notif.name);
          }}
        >
          Back to default settings
        </Btn>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */

export function Editor() {
  const { ui, setUi, product, changed, toast } = use2();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target as HTMLElement).closest?.("[contenteditable]") && !ui.modal) setUi({ notifId: null });
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [setUi, ui.modal]);
  return (
    <div className="n2-editor">
      <header className="n2-top">
        <button type="button" className="n2-icon-btn" aria-label="Back to Notifications" onClick={() => setUi({ view: "home" })}>
          <Icon n="chevL" s={18} />
        </button>
        <span className="crumb">
          <button type="button" onClick={() => setUi({ view: "home" })}>
            Settings
          </button>
          <span>/</span>
          <button type="button" onClick={() => setUi({ view: "home" })}>
            Notifications
          </button>
          <span>/</span>
          <b>{product.name}</b>
        </span>
        <span className="grow" />
        <Btn icon="send" disabled={!ui.notifId} onClick={() => toast(`Test ${CH_LABEL[ui.channel].toLowerCase()} sent to you`)}>
          Send me a test
        </Btn>
        <Btn kind={changed.length ? "dark" : "outline"} disabled={!changed.length} onClick={() => setUi({ modal: "publish" })}>
          {changed.length ? `Publish ${changed.length} change${changed.length > 1 ? "s" : ""}` : "Publish"}
        </Btn>
      </header>
      <div className={"n2-body" + (ui.notifId ? " has-panel" : "")}>
        <div className="n2-main">
          <Workspace />
          {ui.journeyOpen ? (
            <>
              <Splitter />
              <Journey />
            </>
          ) : (
            <JourneyBar />
          )}
        </div>
        <Panel />
      </div>
    </div>
  );
}
