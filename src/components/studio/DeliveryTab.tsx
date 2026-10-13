import type { Email, Freq, Schedule, Timing } from "@/data/types";
import { Icon } from "@/lib/icons";
import { AUD, AUDIENCES, bundledInto, digestFor, enabledFreqs, FREQ_LABEL, FREQS, freqText, isDigest, timingIcon, timingText } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { Scope, Seg, Toggle } from "../ui";

const LEGEND: [string, string][] = [
  ["zap", "Instantly"],
  ["repeat", "Repeats"],
  ["clock", "Before a deadline"],
  ["cal", "Summary (digest)"],
  ["bell", "In-app"],
  ["msg", "Slack"],
];

/** Direction D: every email on the request's lifecycle, in the lane of who receives it. */
export function DeliveryTab() {
  const { U, mod, email, act } = useStudio();
  const select = (id: string) => U({ emailId: id, selEmail: id, sel: null });
  const lanes = AUDIENCES.filter((a) => mod.emails.some((e) => e.aud === a));
  const cols = mod.stages.length + 1; // + summaries column
  const setOn = (id: string, val: boolean) =>
    act((d) => {
      d.modules.find((m) => m.id === mod.id)!.emails.find((e) => e.id === id)!.on = val;
    });
  const laneLabel = (a: string) => (a === "admin" && mod.id === "travel" ? "Admin & travel desk" : a[0].toUpperCase() + a.slice(1));

  return (
    <div className="stbody wide">
      <section className="journey" aria-label="Journey map">
        <div className="row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <b style={{ fontSize: 15, fontWeight: 600 }}>{mod.name} journey</b>
          <span className="muted" style={{ fontSize: 13 }}>
            When each email sends, and to whom
          </span>
          {!mod.on && <span className="badge">Module off — nothing sends</span>}
        </div>
        <div className="jgrid" style={{ gridTemplateColumns: `88px repeat(${cols}, minmax(136px, 1fr))` }}>
          <span />
          {mod.stages.map((s, i) => (
            <span className="stage" key={s}>
              <i>{i + 1}</i>
              {s}
            </span>
          ))}
          <span className="stage digest">
            <Icon n="cal" s={13} />
            Summaries
          </span>
          {lanes.map((a) => (
            <div className="lane" key={a}>
              <div className="ll">
                <Icon n={a === "employee" ? "user" : a === "approver" ? "users" : "sliders"} s={16} />
                {laneLabel(a)}
              </div>
              {mod.stages.map((s, si) => (
                <div className="cell" key={s}>
                  {mod.emails
                    .filter((e) => !isDigest(e) && e.aud === a && e.stage === si)
                    .map((e) => (
                      <Node key={e.id} e={e} selected={e.id === email.id} onSelect={() => select(e.id)} onToggle={(val) => setOn(e.id, val)} />
                    ))}
                </div>
              ))}
              <div className="cell">
                {mod.emails
                  .filter((e) => isDigest(e) && e.aud === a)
                  .map((e) => (
                    <Node
                      key={e.id}
                      e={e}
                      digestCount={bundledInto(mod, e).length}
                      selected={e.id === email.id}
                      onSelect={() => select(e.id)}
                      onToggle={(val) => setOn(e.id, val)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="row muted" style={{ marginTop: 16, gap: 16, fontSize: 11.5, flexWrap: "wrap" }}>
          {LEGEND.map(([i, l]) => (
            <span className="row" style={{ gap: 5 }} key={i}>
              <Icon n={i} s={13} />
              {l}
            </span>
          ))}
        </div>
      </section>
      <aside className="insp" aria-label="Delivery settings">
        <DeliveryPanel />
      </aside>
    </div>
  );
}

function Node({ e, selected, onSelect, onToggle, digestCount }: { e: Email; selected: boolean; onSelect: () => void; onToggle: (on: boolean) => void; digestCount?: number }) {
  const inSummary = e.timing.type === "event" && !!e.timing.freqs?.length;
  return (
    <div
      role="button"
      tabIndex={0}
      className={"node" + (selected ? " sel" : "") + (e.on ? "" : " isoff") + (digestCount !== undefined ? " dg" : "") + (inSummary ? " indg" : "")}
      onClick={onSelect}
      onKeyDown={(ev) => ev.key === "Enter" && onSelect()}
    >
      <span className="nm">{e.name}</span>
      <span className="tr">
        <Icon n={timingIcon(e.timing)} s={12} />
        {digestCount !== undefined ? (digestCount ? `${timingText(e.timing)} · ${digestCount} template${digestCount > 1 ? "s" : ""}` : "Not in use yet") : timingText(e.timing)}
      </span>
      <span className="row" style={{ width: "100%" }}>
        <Toggle sm on={e.on} label={"Send " + e.name} onChange={onToggle} />
        {e.isNew && <span className="badge purple">New</span>}
        <span className="grow" />
        <Icon n="mail" s={13} c="var(--faint)" />
        {e.channels.inapp && <Icon n="bell" s={13} c="var(--faint)" />}
        {e.channels.slack && <Icon n="msg" s={13} c="var(--faint)" />}
      </span>
    </div>
  );
}

const TIMES = ["7:00 AM", "8:00 AM", "9:00 AM", "9:30 AM", "10:00 AM", "12:00 PM", "2:00 PM", "5:30 PM", "6:00 PM", "7:00 PM", "8:00 PM"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function TimeSelect({ id, value, onChange, opts = TIMES }: { id: string; value: string; onChange: (v: string) => void; opts?: string[] }) {
  return (
    <select id={id} className="input sel-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {(opts.includes(value) ? opts : [value, ...opts]).map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

/** Hourly / daily / weekly / monthly schedule for a persona digest. */
function ScheduleEditor({ s, set }: { s: Schedule; set: (fn: (s: Schedule) => void, key?: string) => void }) {
  return (
    <div className="freqs">
      {FREQS.map((f) => (
        <div className={"freq" + (s[f].on ? " on" : "")} key={f}>
          <div className="row">
            <span className="grow">
              <b>{FREQ_LABEL[f]}</b>
              <div className="hint">{s[f].on ? freqText(f, s) : "Off"}</div>
            </span>
            <Toggle sm on={s[f].on} label={FREQ_LABEL[f] + " summary"} onChange={(v) => set((x) => void (x[f].on = v))} />
          </div>
          {s[f].on && f === "hourly" && (
            <div className="row wrap">
              Every
              <NumberInput id="h-every" value={s.hourly.every} max={12} onChange={(n) => set((x) => void (x.hourly.every = n), "h-every")} />
              hours, from
              <TimeSelect id="h-from" value={s.hourly.from} onChange={(v) => set((x) => void (x.hourly.from = v))} />
              to
              <TimeSelect id="h-to" value={s.hourly.to} onChange={(v) => set((x) => void (x.hourly.to = v))} />
            </div>
          )}
          {s[f].on && f === "daily" && (
            <div className="row wrap">
              Every day at
              <TimeSelect id="d-time" value={s.daily.time} onChange={(v) => set((x) => void (x.daily.time = v))} />
            </div>
          )}
          {s[f].on && f === "weekly" && (
            <div className="row wrap">
              Every
              <TimeSelect id="w-day" value={s.weekly.day} opts={DAYS} onChange={(v) => set((x) => void (x.weekly.day = v))} />
              at
              <TimeSelect id="w-time" value={s.weekly.time} onChange={(v) => set((x) => void (x.weekly.time = v))} />
            </div>
          )}
          {s[f].on && f === "monthly" && (
            <div className="row wrap">
              On day
              <NumberInput id="m-date" value={s.monthly.date} max={28} onChange={(n) => set((x) => void (x.monthly.date = n), "m-date")} />
              at
              <TimeSelect id="m-time" value={s.monthly.time} onChange={(v) => set((x) => void (x.monthly.time = v))} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NumberInput({ id, value, onChange, max = 30 }: { id: string; value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <input
      id={id}
      type="number"
      min={1}
      max={max}
      className="input num tnum"
      value={value}
      onChange={(e) => onChange(Math.max(1, Math.min(max, +e.target.value || 1)))}
    />
  );
}

/** Timing, quiet hours and channels for the selected email. Triggers are locked to the workflow. */
function DeliveryPanel() {
  const { email, upEmail, U, mod } = useStudio();
  const editContent = (id: string, sid?: string) =>
    U({ tab: "content", selEmail: id, emailId: id, selState: sid || null, sel: null, scrollTo: sid ? id + ":" + sid : id });
  const t = email.timing;
  const setT = (fn: (t: Timing) => void, key?: string) => upEmail((e) => fn(e.timing), key);

  let timing;
  if (t.type === "reminder") {
    const days = [0];
    for (let i = 0; i < t.max; i++) days.push(t.first + i * t.every);
    timing = (
      <>
        <div className="row" style={{ flexWrap: "wrap" }}>
          First after
          <NumberInput id="t-first" value={t.first} onChange={(n) => setT((x) => void (x.first = n), "t-first")} />
          days without action
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          Then every
          <NumberInput id="t-every" value={t.every} onChange={(n) => setT((x) => void (x.every = n), "t-every")} />
          days, at most
          <NumberInput id="t-max" value={t.max} max={6} onChange={(n) => setT((x) => void (x.max = n), "t-max")} />
          times
        </div>
        <div className="sched">
          {days.map((d, i) => (
            <div key={i}>
              <div className={"d" + (i === 0 ? " first" : "")} />
              <b>Day {d}</b>
              {i === 0 ? "Request arrives" : i === days.length - 1 ? "Last reminder" : "Reminder " + i}
            </div>
          ))}
        </div>
        <div className="row hint">
          <Icon n="lock" s={12} />
          Stops as soon as they approve or reject.
        </div>
      </>
    );
  } else if (t.type === "before") {
    timing = (
      <>
        <div className="row" style={{ flexWrap: "wrap" }}>
          Send
          <NumberInput id="t-days" value={t.days} onChange={(n) => setT((x) => void (x.days = n), "t-days")} />
          day{t.days > 1 ? "s" : ""} before the deadline
        </div>
        <div className="row hint">
          <Icon n="lock" s={12} />
          Skipped if nothing is pending by then.
        </div>
      </>
    );
  } else if (t.type === "digest") {
    const on = enabledFreqs(t.schedule);
    timing = (
      <>
        <div className="hint">One email that rounds up updates for this person. Turn on the summaries you want and set when each goes out. A summary is skipped when there’s nothing new.</div>
        <ScheduleEditor s={t.schedule!} set={(fn, key) => setT((x) => fn(x.schedule!), key)} />
        {on.length > 0 && (
          <>
            <div className="lab" style={{ fontSize: 12, fontWeight: 500, color: "var(--fg2)", marginTop: 4 }}>
              What goes into each summary
            </div>
            {on.map((f) => {
              const list = bundledInto(mod, email, f);
              return (
                <div key={f} className="bundle">
                  <div className="bundle-h static">
                    <Icon n="cal" s={14} />
                    <b className="grow">{FREQ_LABEL[f]}</b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {list.length} template{list.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {list.map((e) => (
                    <button type="button" key={e.id} className="linkrow" onClick={() => U({ emailId: e.id, selEmail: e.id })}>
                      <Icon n="mail" s={15} />
                      <span className="grow">{e.name}</span>
                      <Icon n="chevR" s={15} />
                    </button>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </>
    );
  } else {
    const d = digestFor(mod, email);
    const freqs = t.freqs || [];
    const toggleFreq = (f: Freq) =>
      setT((x) => {
        const cur = x.freqs || [];
        x.freqs = cur.includes(f) ? cur.filter((y) => y !== f) : FREQS.filter((y) => y === f || cur.includes(y));
      });
    timing = (
      <>
        <div className="row">
          <Icon n="zap" s={15} c="var(--muted)" />
          <span className="grow">
            <div style={{ fontWeight: 500 }}>Send instantly</div>
            <div className="hint">As soon as it happens, outside quiet hours.</div>
          </span>
          <Toggle sm on={!!t.instant} label="Send instantly" onChange={(v) => setT((x) => void (x.instant = v))} />
        </div>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <Icon n="cal" s={15} c="var(--muted)" />
          <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span>
              <div style={{ fontWeight: 500 }}>Also include in summaries</div>
              <div className="hint">Adds a line to the {d ? d.name.toLowerCase() : "digest"}. Pick as many as you like.</div>
            </span>
            <span className="fchips" role="group" aria-label="Summaries">
              {FREQS.map((f) => (
                <button type="button" key={f} className={"fchip" + (freqs.includes(f) ? " on" : "")} aria-pressed={freqs.includes(f)} onClick={() => toggleFreq(f)}>
                  {freqs.includes(f) && <Icon n="check" s={12} w={2.4} />}
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </span>
          </span>
        </div>
        {!t.instant && !freqs.length && (
          <div className="note warn">
            <Icon n="alert" s={15} />
            <span>Neither instant nor in a summary, so this template never reaches anyone.</span>
          </div>
        )}
        {d &&
          freqs.map((f) => {
            const live = d.timing.schedule?.[f].on;
            return (
              <button type="button" key={f} className={"linkrow" + (live ? "" : " warn")} onClick={() => (live ? editContent(d.id, f) : U({ emailId: d.id, selEmail: d.id }))}>
                <Icon n={live ? "cal" : "alert"} s={15} />
                <span className="grow">
                  <div style={{ fontWeight: 500 }}>{FREQ_LABEL[f]} summary</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {live ? freqText(f, d.timing.schedule!) + ". Edit the summary email" : "Off in the " + d.name.toLowerCase() + ". Turn it on there"}
                  </div>
                </span>
                <Icon n="chevR" s={15} />
              </button>
            );
          })}
      </>
    );
  }

  return (
    <>
      <div className="head">
        <div className="row">
          <h2 className="grow">{email.name}</h2>
          <Toggle on={email.on} label={"Send " + email.name} onChange={(val) => upEmail((e) => void (e.on = val))} />
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {AUD[email.aud]}
          {isDigest(email) ? " · summary template" : ""}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Scope k="Delivery" />
          <span className="muted" style={{ fontSize: 11 }}>
            When and where it sends
          </span>
        </div>
      </div>
      <div className="sec">
        <h3>Trigger</h3>
        <div className="input row" style={{ background: "var(--sunk)", height: "auto", minHeight: 34, paddingBlock: 7, color: "var(--fg2)" }}>
          <Icon n="zap" s={14} />
          <span className="grow">{email.trigger}</span>
          <Icon n="lock" s={13} c="var(--faint)" />
        </div>
        <div className="hint">Triggers follow your workflow and can’t be edited here.</div>
      </div>
      <div className="sec">
        <h3>Timing</h3>
        {timing}
      </div>
      <div className="sec">
        <h3>Quiet hours</h3>
        <div className="row">
          <span className="grow">Skip weekends & company holidays</span>
          <Toggle sm on={email.quiet.weekends} label="Skip weekends" onChange={(val) => upEmail((e) => void (e.quiet.weekends = val))} />
        </div>
        <div className="field">
          <label className="lab" htmlFor="q-time">
            Earliest send time
          </label>
          <select
            id="q-time"
            className="input"
            value={email.quiet.time}
            onChange={(e) => {
              const val = e.target.value;
              upEmail((x) => void (x.quiet.time = val));
            }}
          >
            {["8:00 AM", "9:30 AM", "11:00 AM"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <div className="hint">In each recipient’s time zone.</div>
        </div>
      </div>
      <div className="sec">
        <h3>Channels</h3>
        <div className="row">
          <Icon n="mail" s={15} />
          <span className="grow">
            Email<div className="hint">Always on</div>
          </span>
          <Icon n="lock" s={13} c="var(--faint)" />
        </div>
        <div className="row">
          <Icon n="bell" s={15} />
          <span className="grow">In-app & mobile push</span>
          <Toggle sm on={email.channels.inapp} label="In-app" onChange={(val) => upEmail((e) => void (e.channels.inapp = val))} />
        </div>
        <div className="row">
          <Icon n="msg" s={15} />
          <span className="grow">
            Slack<div className="hint">Via the Xyne Flow app</div>
          </span>
          <Toggle sm on={email.channels.slack} label="Slack" onChange={(val) => upEmail((e) => void (e.channels.slack = val))} />
        </div>
      </div>
      <div className="sec">
        <button type="button" className="btn" onClick={() => editContent(email.id)}>
          <Icon n="type" s={15} />
          Edit this template’s content
        </button>
      </div>
    </>
  );
}
