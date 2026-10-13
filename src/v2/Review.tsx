import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/lib/icons";
import { clone, resolve, same } from "@/lib/utils";
import { CH_LABEL, CHANNELS, emailById, FREQ_NAME, timingLine, varsFor, type Channel, type ChannelSettings, type ChannelState, type Notif, type State2, type Variant } from "./model";
import { AppPreview, EmailPreview, getText, SlackPreview, type EditProps, type Field } from "./Previews";
import { use2 } from "./store";
import { Btn, Modal, Tag } from "./ui";

/* Review & publish: every change, with the before and after of settings and wording. */

export interface Change {
  key: string;
  group: string;
  title: string;
  kind: "brand" | "channels" | "notif";
  productId?: string;
  notifId?: string;
}

/** Everything in the draft that differs from what's live. */
export function listChanges(S: State2, pub: State2): Change[] {
  const out: Change[] = [];
  if (!same(S.brand, pub.brand)) out.push({ key: "brand", group: "Settings", title: "Branding", kind: "brand" });
  if (!same(S.channels, pub.channels)) out.push({ key: "channels", group: "Settings", title: "Channels", kind: "channels" });
  S.products.forEach((p) => {
    const pp = pub.products.find((x) => x.id === p.id)!;
    p.notifs.forEach((n) => {
      if (!same(n, pp.notifs.find((x) => x.id === n.id))) out.push({ key: p.id + "/" + n.id, group: p.name, title: n.name, kind: "notif", productId: p.id, notifId: n.id });
    });
  });
  return out;
}

interface Row {
  label: string;
  before: ReactNode;
  after: ReactNode;
}

const onOff = (b: boolean, on = "Sent", off = "Not sent") => (b ? on : off);
const when = (c: ChannelSettings) =>
  [c.instant && "Instantly", c.freqs.length > 0 && c.freqs.map((f) => FREQ_NAME[f]).join(" & ") + " summary"].filter(Boolean).join(" + ") || "Not scheduled";
const CH_STATE: Record<ChannelState, string> = { connected: "Connected", paused: "Paused", none: "Not connected" };

function settingRows(b: Notif, a: Notif, channels: Record<Channel, ChannelState>): Row[] {
  const rows: Row[] = [];
  for (const c of CHANNELS) {
    const x = b.ch[c];
    const y = a.ch[c];
    if (x.on !== y.on) rows.push({ label: CH_LABEL[c], before: onOff(x.on), after: onOff(y.on) });
    if (!a.summary && (x.instant !== y.instant || !same(x.freqs, y.freqs))) rows.push({ label: `${CH_LABEL[c]} · When`, before: when(x), after: when(y) });
    if (x.remind !== y.remind) rows.push({ label: `${CH_LABEL[c]} · Reminders`, before: onOff(x.remind, "On", "Off"), after: onOff(y.remind, "On", "Off") });
  }
  if (b.reminder && a.reminder && !same(b.reminder, a.reminder))
    rows.push({ label: "Reminder timing", before: `Every ${b.reminder.every} days, up to ${b.reminder.max}`, after: `Every ${a.reminder.every} days, up to ${a.reminder.max}` });
  if (a.summary && !same(b.schedule, a.schedule)) rows.push({ label: "Schedule", before: timingLine(b, channels), after: timingLine(a, channels) });
  a.variants.forEach((v) => {
    const o = b.variants.find((x) => x.id === v.id);
    if (o && o.on !== v.on) rows.push({ label: `${v.kind === "reminder" ? "Reminder" : "Version"} · ${v.label}`, before: onOff(o.on), after: onOff(v.on) });
  });
  return rows;
}

const BASE: { f: Field; label: string; ch: Channel }[] = [
  { f: "subject", label: "Subject line", ch: "email" },
  { f: "pre", label: "Preview text", ch: "email" },
  { f: "head", label: "Headline", ch: "email" },
  { f: "slackTitle", label: "Title", ch: "slack" },
  { f: "slackBody", label: "Message", ch: "slack" },
  { f: "appTitle", label: "Title", ch: "app" },
  { f: "appBody", label: "Message", ch: "app" },
];

/** What the admin would call a piece of email wording. */
function blockLabel(v: Variant, key: string) {
  const [id, prop] = key.split(".");
  const type = emailById(v.emailId)?.blocks.find((b) => b.id === id)?.type;
  if (type === "headline" && prop === "sub") return "Line under the headline";
  if (type === "amount") return "Amount label";
  if (type === "list" || type === "digest") return "Section title";
  if (type === "button") return "Button";
  if (type === "note") return "Note";
  return "Text";
}

interface WordingGroup {
  variant: Variant;
  before: Variant;
  ch: Channel;
  fields: { f: Field; label: string }[];
}

function wordingGroups(b: Notif, a: Notif): WordingGroup[] {
  const out: WordingGroup[] = [];
  a.variants.forEach((v) => {
    const o = b.variants.find((x) => x.id === v.id);
    if (!o || same(o.copy, v.copy)) return;
    const blockKeys = Array.from(new Set([...Object.keys(o.copy.blocks || {}), ...Object.keys(v.copy.blocks || {})]));
    const all = [...BASE.slice(0, 3), ...blockKeys.map((k) => ({ f: "b:" + k, label: blockLabel(v, k), ch: "email" as Channel })), ...BASE.slice(3)];
    for (const c of CHANNELS) {
      const fields = all.filter((x) => x.ch === c && getText(o.copy, x.f) !== getText(v.copy, x.f)).map(({ f, label }) => ({ f, label }));
      if (fields.length) out.push({ variant: v, before: o, ch: c, fields });
    }
  });
  return out;
}

function Preview({ g, side }: { g: WordingGroup; side: "before" | "after" }) {
  const { S } = use2();
  const stage = useRef<HTMLDivElement>(null);
  // open on the first thing that changed
  useEffect(() => {
    const el = stage.current;
    const m = el?.querySelector<HTMLElement>(".n2-mark");
    if (!el || !m) return;
    const a = el.getBoundingClientRect();
    const b = m.getBoundingClientRect();
    el.scrollTop += b.top - a.top - 60;
  }, [g]);
  const v = side === "before" ? g.before : g.variant;
  const p: EditProps = {
    copy: v.copy,
    v: { ...varsFor(v, S.brand), period: "daily" },
    brand: S.brand,
    editable: false,
    editing: null,
    setEditing: () => {},
    onChange: () => {},
    marks: g.fields.map((x) => x.f),
    tone: side,
  };
  return (
    <div className={"n2-rv-prev " + g.ch}>
      <div className="cap">
        <Tag tone={side === "before" ? "neutral" : "green"}>{side === "before" ? "Live now" : "After you publish"}</Tag>
      </div>
      <div className="stage" ref={stage}>
        <div style={{ zoom: g.ch === "email" ? 0.5 : 0.62 }}>
          {g.ch === "email" && <EmailPreview email={emailById(v.emailId)!} p={p} />}
          {g.ch === "slack" && <SlackPreview p={p} />}
          {g.ch === "app" && <AppPreview p={p} />}
        </div>
      </div>
    </div>
  );
}

function Diff({ rows }: { rows: Row[] }) {
  return (
    <div className="n2-rv-rows">
      {rows.map((r, i) => (
        <div className="r" key={i}>
          <span className="l">{r.label}</span>
          <span className="b">{r.before}</span>
          <Icon n="chevR" s={14} c="#9F9FA9" />
          <span className="a">{r.after}</span>
        </div>
      ))}
    </div>
  );
}

function Detail({ c }: { c: Change }) {
  const { S, pub, up, toast } = use2();
  const discard = () => {
    up((d) => {
      if (c.kind === "brand") d.brand = clone(pub.brand);
      else if (c.kind === "channels") d.channels = clone(pub.channels);
      else {
        const list = d.products.find((p) => p.id === c.productId)!.notifs;
        const i = list.findIndex((n) => n.id === c.notifId);
        list[i] = clone(pub.products.find((p) => p.id === c.productId)!.notifs.find((n) => n.id === c.notifId)!);
      }
    });
    toast(`Changes to ${c.title} discarded`);
  };

  let body: ReactNode = null;
  if (c.kind === "brand") {
    const B = pub.brand as unknown as Record<string, string>;
    const A = S.brand as unknown as Record<string, string>;
    const NAMES: Record<string, string> = { company: "Company name", sender: "Sender name", color: "Brand colour", footer: "Email footer", replyTo: "Reply-to" };
    const sw = (x: string) => (
      <span className="n2-rv-sw">
        <i style={{ background: x }} />
        {x}
      </span>
    );
    const rows = Object.keys(A)
      .filter((k) => !same(A[k], B[k]))
      .map((k) => ({ label: NAMES[k] || k, before: k === "color" ? sw(B[k]) : String(B[k]), after: k === "color" ? sw(A[k]) : String(A[k]) }));
    body = (
      <section>
        <h4>Branding</h4>
        <p className="muted small">Shows on every email, and as the name and icon in Slack and the app.</p>
        <Diff rows={rows} />
      </section>
    );
  } else if (c.kind === "channels") {
    const rows = CHANNELS.filter((k) => S.channels[k] !== pub.channels[k]).map((k) => ({ label: CH_LABEL[k], before: CH_STATE[pub.channels[k]], after: CH_STATE[S.channels[k]] }));
    body = (
      <section>
        <h4>Channels</h4>
        <Diff rows={rows} />
      </section>
    );
  } else {
    const a = S.products.find((p) => p.id === c.productId)!.notifs.find((n) => n.id === c.notifId)!;
    const b = pub.products.find((p) => p.id === c.productId)!.notifs.find((n) => n.id === c.notifId)!;
    const rows = settingRows(b, a, S.channels);
    const groups = wordingGroups(b, a);
    const many = a.variants.length > 1;
    body = (
      <>
        {rows.length > 0 && (
          <section>
            <h4>How it’s sent</h4>
            <Diff rows={rows} />
          </section>
        )}
        {groups.map((g, i) => (
          <section key={i}>
            <h4>
              Wording · {CH_LABEL[g.ch]}
              {many && <span className="muted"> · {g.variant.label}</span>}
            </h4>
            <div className="n2-rv-text">
              {g.fields.map(({ f, label }) => (
                <Fragment key={f}>
                  <span className="l">{label}</span>
                  <span className="b">{resolve(getText(g.before.copy, f), varsFor(g.before, S.brand)) || "Empty"}</span>
                  <span className="a">{resolve(getText(g.variant.copy, f), varsFor(g.variant, S.brand)) || "Empty"}</span>
                </Fragment>
              ))}
            </div>
            <div className="n2-rv-pair">
              <Preview g={g} side="before" />
              <Preview g={g} side="after" />
            </div>
          </section>
        ))}
      </>
    );
  }

  return (
    <div className="n2-rv-detail">
      <div className="hd">
        <div className="grow">
          <div className="muted small">{c.group}</div>
          <h3>{c.title}</h3>
        </div>
        <Btn icon="undo" onClick={discard}>
          Discard these changes
        </Btn>
      </div>
      {body}
    </div>
  );
}

/** A short line under each change in the list. */
function summaryOf(c: Change, S: State2, pub: State2) {
  if (c.kind === "brand") return "Logo, colour and name";
  if (c.kind === "channels") return CHANNELS.filter((k) => S.channels[k] !== pub.channels[k]).map((k) => `${CH_LABEL[k]} ${CH_STATE[S.channels[k]].toLowerCase()}`).join(", ");
  const a = S.products.find((p) => p.id === c.productId)!.notifs.find((n) => n.id === c.notifId)!;
  const b = pub.products.find((p) => p.id === c.productId)!.notifs.find((n) => n.id === c.notifId)!;
  const s = settingRows(b, a, S.channels).length;
  const w = wordingGroups(b, a).reduce((x, g) => x + g.fields.length, 0);
  return [w && `${w} wording change${w > 1 ? "s" : ""}`, s && `${s} setting${s > 1 ? "s" : ""}`].filter(Boolean).join(" · ");
}

export function Review({ onPublish }: { onPublish: () => void }) {
  const { S, pub, setUi } = use2();
  const changes = listChanges(S, pub);
  const [sel, setSel] = useState<string | null>(changes[0]?.key ?? null);
  const cur = changes.find((c) => c.key === sel) || changes[0];
  useEffect(() => {
    if (!changes.find((c) => c.key === sel) && changes[0]) setSel(changes[0].key);
  }, [changes, sel]);
  const groups = Array.from(new Set(changes.map((c) => c.group)));
  const n = changes.length;

  return (
    <Modal
      title="Review changes"
      width={1160}
      onClose={() => setUi({ modal: null })}
      footer={
        <>
          <span className="muted grow small">People get the new versions as soon as you publish. Each publish is kept, so you can go back.</span>
          <Btn onClick={() => setUi({ modal: null })}>Keep editing</Btn>
          <Btn kind="dark" disabled={!n} onClick={onPublish}>
            {n ? `Publish ${n} change${n > 1 ? "s" : ""}` : "Publish"}
          </Btn>
        </>
      }
    >
      {n ? (
        <div className="n2-rv">
          <nav className="n2-rv-list" aria-label="Changes">
            {groups.map((g) => (
              <div key={g}>
                <div className="gh">{g}</div>
                {changes
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <button type="button" key={c.key} className={"it" + (cur?.key === c.key ? " on" : "")} onClick={() => setSel(c.key)} aria-current={cur?.key === c.key}>
                      <span className="t">{c.title}</span>
                      <span className="s">{summaryOf(c, S, pub)}</span>
                    </button>
                  ))}
              </div>
            ))}
          </nav>
          {cur && <Detail c={cur} />}
        </div>
      ) : (
        <div className="n2-rv-none">
          <Icon n="check" s={20} />
          Nothing left to publish. Everything matches what’s live.
        </div>
      )}
    </Modal>
  );
}
