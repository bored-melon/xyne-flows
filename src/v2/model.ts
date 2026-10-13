import { initialState } from "@/data/modules";
import { makeVars, pickText } from "@/data/scenarios";
import type { Audience, Brand, Email, Freq, Vars } from "@/data/types";
import { clone, isDigest, statesOf } from "@/lib/utils";

/*
 * Version 2 · Notifications.
 * One notification can go out by email, Slack and the app. Each channel has its own
 * on/off and timing, and the journey card only reflects what is set in the panel.
 * Built from the version 1 sample data so both versions share the same emails.
 */

export type Channel = "email" | "slack" | "app";
export const CHANNELS: Channel[] = ["email", "slack", "app"];
export const CH_LABEL: Record<Channel, string> = { email: "Email", slack: "Slack", app: "App" };
export const CH_ICON: Record<Channel, string> = { email: "mail", slack: "slack", app: "phone" };
export const CH_SEND: Record<Channel, string> = { email: "Send email notifications", slack: "Send Slack notifications", app: "Send app notifications" };

export type SummaryFreq = Exclude<Freq, "hourly">;
export const SUMMARY_FREQS: SummaryFreq[] = ["daily", "weekly", "monthly"];
export const FREQ_NAME: Record<SummaryFreq, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

export interface ChannelSettings {
  on: boolean;
  instant: boolean;
  /** Summaries this notification adds a line to */
  freqs: SummaryFreq[];
  /** Follow-up reminders on this channel (only for notifications that support them) */
  remind: boolean;
}

/** The words people read. Stored with {tokens}; resolved per person when sent. */
export interface Copy {
  subject: string;
  pre: string;
  head: string;
  slackTitle: string;
  slackBody: string;
  appTitle: string;
  appBody: string;
  /** Other words in the email, keyed "blockId.prop": the line under the headline, section titles, the button */
  blocks: Record<string, string>;
}

/** Every piece of wording in an email, other than subject, preview text and headline, that an admin can change. */
export function blockTexts(e: Email): Record<string, string> {
  const out: Record<string, string> = {};
  for (const b of e.blocks) {
    const p = b.props;
    if (b.type === "headline" && p.sub) out[b.id + ".sub"] = p.sub;
    if (b.type === "amount" && p.label) out[b.id + ".label"] = p.label;
    if ((b.type === "list" || b.type === "digest") && p.heading) out[b.id + ".heading"] = p.heading;
    if (b.type === "note" && p.text) out[b.id + ".text"] = p.text;
    if (b.type === "button" && p.label) out[b.id + ".label"] = p.label;
  }
  return out;
}

/** One frame in the workspace: a version of the notification, or its reminder. */
export interface Variant {
  id: string;
  label: string;
  kind: "version" | "reminder";
  /** Version 1 email the frame is rendered from (layout, data blocks) */
  emailId: string;
  scenario: string;
  on: boolean;
  copy: Copy;
}

export interface Schedule2 {
  daily: { on: boolean; time: string };
  weekly: { on: boolean; day: string; time: string };
  monthly: { on: boolean; date: number; time: string };
}

export interface Notif {
  id: string;
  name: string;
  aud: Audience;
  /** Column in the journey; 5 = Summaries */
  stage: number;
  desc: string;
  summary?: boolean;
  schedule?: Schedule2;
  ch: Record<Channel, ChannelSettings>;
  reminder?: { every: number; max: number };
  variants: Variant[];
}

export interface Product {
  id: string;
  name: string;
  icon: string;
  covers: string;
  used: boolean;
  stages: string[];
  notifs: Notif[];
}

export type ChannelState = "connected" | "paused" | "none";

export interface State2 {
  brand: Brand;
  channels: Record<Channel, ChannelState>;
  products: Product[];
}

/** Version 1 sample data: the emails, scenarios and brand both versions share. */
export const V1 = initialState();

const COVERS: Record<string, string> = {
  reimb: "Submitting claims, approvals, fixes and payouts",
  travel: "Trip requests, approvals, bookings and changes",
  cards: "Card requests, spends, receipts and limits",
  proc: "Purchase requests, orders and invoices",
  petty: "Advances, top-ups and settlements",
};

const DESC_AUD: Record<Audience, string> = { employee: "the employee", approver: "the approver", admin: "admins" };
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Turns a version 1 email into the default words for every channel. */
export function copyFrom(e: Email, scenario: string): Copy {
  const h = e.blocks.find((b) => b.id === "headline");
  const v = makeVars(scenario, V1.brand);
  const head = h ? pickText(h.props, v) : e.name;
  const sub = h?.props.sub || e.pre;
  return { subject: e.subject, pre: e.pre, head, slackTitle: e.subject, slackBody: e.pre, appTitle: head, appBody: sub, blocks: blockTexts(e) };
}

const chs = (email: boolean, slack: boolean, app: boolean, instant: boolean, freqs: SummaryFreq[], remind: boolean): Record<Channel, ChannelSettings> => ({
  email: { on: email, instant, freqs: [...freqs], remind },
  slack: { on: slack, instant, freqs: [], remind },
  app: { on: app, instant, freqs: [], remind },
});

function variantsOf(e: Email): Variant[] {
  return statesOf(e).map((s) => ({ id: s.id, label: statesOf(e).length > 1 ? s.label : "Message", kind: "version", emailId: e.id, scenario: s.scenario, on: true, copy: copyFrom(e, s.scenario) }));
}

const DIGEST_NAME: Record<Audience, string> = { employee: "Employee summary", approver: "Approver summary", admin: "Admin summary" };

export function buildState(): State2 {
  const S1 = clone(V1);
  const products: Product[] = S1.modules.map((m) => {
    const emails = m.emails;
    const reminders = emails.filter((e) => !isDigest(e) && (e.timing.type === "reminder" || e.timing.type === "before"));
    const used = new Set<string>();
    const notifs: Notif[] = [];
    // Reimbursements: approved + rejected become one notification with versions
    const merged = m.id === "reimb" ? { app: emails.find((e) => e.id === "r-app"), rej: emails.find((e) => e.id === "r-rej") } : null;
    for (const e of emails) {
      if (isDigest(e) || used.has(e.id)) continue;
      const isRem = reminders.includes(e);
      // a reminder attaches to the main notification for the same person at the same stage
      const parent = isRem ? emails.find((p) => p !== e && !isDigest(p) && p.aud === e.aud && p.stage === e.stage && !reminders.includes(p)) : undefined;
      if (isRem && parent) continue;
      const rem = reminders.find((r) => r !== e && r.aud === e.aud && r.stage === e.stage);
      if (rem) used.add(rem.id);
      let variants = variantsOf(e);
      let name = e.name;
      let desc = `Sent to ${DESC_AUD[e.aud]} ${lower(e.trigger)}.`;
      if (merged && e === merged.app && merged.rej) {
        used.add(merged.rej.id);
        name = "Claims reviewed";
        desc = "Sent to the employee when an approver finishes reviewing their claims. The wording follows the outcome.";
        variants = [
          { id: "approved", label: "All approved", kind: "version", emailId: e.id, scenario: "approved", on: true, copy: copyFrom(e, "approved") },
          { id: "rejected", label: "All rejected", kind: "version", emailId: merged.rej.id, scenario: "rejected", on: true, copy: copyFrom(merged.rej, "rejected") },
        ];
      } else if (merged && e === merged.rej) continue;
      if (rem) {
        const remLabel = "Reminder";
        variants.push({ id: "reminder", label: remLabel, kind: "reminder", emailId: rem.id, scenario: variants[0].scenario, on: true, copy: copyFrom(rem, variants[0].scenario) });
      }
      const t = e.timing;
      const freqs = (t.freqs || []).filter((f): f is SummaryFreq => f !== "hourly");
      const instant = t.type === "event" ? t.instant !== false : true;
      const on = e.on && m.on !== false;
      const remindOn = rem ? rem.on : false;
      notifs.push({
        id: e.id,
        name,
        aud: e.aud,
        stage: e.stage,
        desc,
        ch: chs(on, on && e.channels.slack, on && e.channels.inapp, instant, freqs, remindOn),
        reminder: rem ? { every: rem.timing.every || 2, max: rem.timing.max || 3 } : undefined,
        variants,
      });
    }
    // the persona summaries
    for (const d of emails.filter(isDigest)) {
      const s = d.timing.schedule!;
      notifs.push({
        id: d.id,
        name: DIGEST_NAME[d.aud],
        aud: d.aud,
        stage: 5,
        desc: `One email that rounds up updates for ${DESC_AUD[d.aud]}. Skipped when there’s nothing new.`,
        summary: true,
        schedule: { daily: { ...s.daily }, weekly: { on: s.weekly.on, day: s.weekly.day, time: s.weekly.time }, monthly: { ...s.monthly } },
        ch: chs(true, false, false, false, [], false),
        variants: [{ id: "daily", label: "Summary", kind: "version", emailId: d.id, scenario: "mixed", on: true, copy: copyFrom(d, "mixed") }],
      });
    }
    return { id: m.id, name: m.name, icon: m.icon === "coins" ? "wallet" : m.icon, covers: COVERS[m.id] || "", used: m.id !== "proc", stages: m.stages, notifs };
  });
  // Claims need a fix is on in the designs (it starts off in version 1)
  const fix = products[0].notifs.find((n) => n.id === "r-fix");
  if (fix) { fix.ch.email.on = true; fix.ch.app.on = true; fix.ch.email.freqs = ["daily"]; fix.ch.email.remind = true; fix.ch.app.remind = true; }
  return { brand: S1.brand, channels: { email: "connected", slack: "none", app: "connected" }, products };
}

export const emailById = (id: string): Email | undefined => {
  for (const m of V1.modules) {
    const e = m.emails.find((x) => x.id === id);
    if (e) return e;
  }
  return undefined;
};

export const anyOn = (n: Notif, channels?: Record<Channel, ChannelState>) => CHANNELS.some((c) => n.ch[c].on && (!channels || channels[c] === "connected"));
export const onChannels = (n: Notif, channels: Record<Channel, ChannelState>) => CHANNELS.filter((c) => n.ch[c].on && channels[c] === "connected");

/** One line for the journey card: when it goes out on its main channel. */
export function timingLine(n: Notif, channels: Record<Channel, ChannelState>): string {
  if (n.summary) {
    const s = n.schedule!;
    const parts = [s.daily.on && `Every day, ${s.daily.time}`, s.weekly.on && `${s.weekly.day}s, ${s.weekly.time}`, s.monthly.on && `Monthly, day ${s.monthly.date}`].filter(Boolean) as string[];
    return parts.length ? parts.join(" · ") : "No schedule";
  }
  const on = onChannels(n, channels);
  if (!on.length) return "Not sent on any channel";
  const c = n.ch[on[0]];
  const f = c.freqs.map((x) => FREQ_NAME[x].toLowerCase());
  const sum = f.length ? f.join(" & ") + " summary" : "";
  if (c.instant && sum) return "Instantly + " + sum;
  if (c.instant) return "Instantly";
  if (sum) return sum.charAt(0).toUpperCase() + sum.slice(1) + " only";
  return "Not scheduled";
}

/** Notifications that add a line to a persona's summary. */
export const collectedBy = (p: Product, sum: Notif) => p.notifs.filter((n) => !n.summary && n.aud === sum.aud && CHANNELS.some((c) => n.ch[c].on && n.ch[c].freqs.length));

export const varsFor = (variant: Variant, brand: Brand): Vars => makeVars(variant.scenario, brand);

export const cloneState = (s: State2) => clone(s);
