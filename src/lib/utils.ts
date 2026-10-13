import type { Audience, Block, BlockType, Brand, Email, Freq, Layout, Module, Schedule, TemplateState, Timing } from "@/data/types";

export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Replace {variable} tokens with values from the preview scenario. */
export const resolve = (t: string | undefined, v: Record<string, unknown>) =>
  (t || "").replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));

const AV_COLORS = ["#111827", "#B45309", "#0F766E", "#7C3AED", "#BE185D", "#1D4ED8", "#4D7C0F", "#9A3412"];
export const avColor = (s: string) => AV_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
export const initials = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const AUD: Record<Audience, string> = {
  employee: "To employee",
  approver: "To approver",
  admin: "To admin",
};
export const AUDDESC: Record<Audience, string> = {
  employee: "The person who raised the request",
  approver: "Managers and finance in the approval chain",
  admin: "Finance admins, travel desk and auditors",
};
export const AUDIENCES: Audience[] = ["employee", "approver", "admin"];

/** [card radius, button radius] for each corner style in the brand kit */
export const RADII: Record<Brand["radius"], [number, number]> = {
  square: [4, 6],
  soft: [12, 999],
  round: [20, 999],
};
export const PALETTE = ["#145DFB", "#0F766E", "#7C3AED", "#BE123C", "#C2410C", "#18181B"];
export const ILLS = ["receipts", "approval", "clock", "wallet", "alert", "check", "plane", "hotel", "card", "cart", "coins"];

/** WCAG contrast ratio of a hex colour against white. */
export function contrastOnWhite(hex: string) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return 0;
  const L = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const l = 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2];
  return 1.05 / (l + 0.05);
}

export const FREQS: Freq[] = ["hourly", "daily", "weekly", "monthly"];
export const FREQ_LABEL: Record<Freq, string> = { hourly: "Hourly", daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

/** "Daily 9:30 AM", "Weekly Monday 9:30 AM"… for one frequency of a digest schedule. */
export function freqText(f: Freq, s: Schedule) {
  if (f === "hourly") return `Every ${s.hourly.every} h, ${s.hourly.from}–${s.hourly.to}`;
  if (f === "daily") return `Daily at ${s.daily.time}`;
  if (f === "weekly") return `Weekly, ${s.weekly.day} ${s.weekly.time}`;
  return `Monthly, day ${s.monthly.date} at ${s.monthly.time}`;
}
export const enabledFreqs = (s?: Schedule) => (s ? FREQS.filter((f) => s[f].on) : []);

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " & " + xs[xs.length - 1]);

export function timingText(t: Timing) {
  if (t.type === "reminder") return `Every ${t.every} days · max ${t.max}`;
  if (t.type === "before") return `${t.days} day${t.days > 1 ? "s" : ""} before deadline`;
  if (t.type === "digest") {
    const on = enabledFreqs(t.schedule).map((f) => FREQ_LABEL[f]);
    return on.length ? list(on) + " summary" : "No schedule";
  }
  const sums = (t.freqs || []).map((f) => FREQ_LABEL[f].toLowerCase());
  if (t.instant && sums.length) return `Instantly + ${list(sums)} summary`;
  if (t.instant) return "Instantly";
  if (sums.length) return `${list(sums)[0].toUpperCase() + list(sums).slice(1)} summary only`;
  return "Not sent";
}

export const timingIcon = (t: Timing) =>
  t.type === "reminder" ? "repeat" : t.type === "before" ? "clock" : t.type === "digest" || (!t.instant && t.freqs?.length) ? "cal" : "zap";

const BLOCK_NAMES: Partial<Record<BlockType, string>> = {
  logo: "Logo",
  illustration: "Illustration",
  headline: "Headline",
  timeline: "Timeline",
  amount: "Amount",
  details: "Details",
  note: "Paragraph",
  button: "Button",
  footer: "Footer",
  digest: "Digest updates",
};
export const blockName = (b: Block) => BLOCK_NAMES[b.type] || b.props.heading || "Claims list";

const BLOCK_ICONS: Record<BlockType, string> = {
  logo: "image",
  illustration: "image",
  headline: "type",
  timeline: "zap",
  amount: "zap",
  list: "list",
  details: "zap",
  note: "type",
  button: "pointer",
  footer: "list",
  digest: "cal",
};
export const blockIcon = (t: BlockType) => BLOCK_ICONS[t];

/** Logo and footer come from the brand kit and can't be edited per email. */
export const isLocked = (t: BlockType) => t === "logo" || t === "footer";
/** Data blocks render values from the request; admins only choose what shows. */
export const isData = (t: BlockType) => ["timeline", "amount", "list", "details", "digest"].includes(t);

/** Names for the shared block slots (the universal order). */
export const SLOT_NAMES: Record<string, string> = {
  logo: "Logo",
  ill: "Illustration",
  headline: "Headline",
  timeline: "Timeline",
  amount: "Amount",
  digest: "Digest updates",
  list0: "Claims list",
  list1: "Second claims list",
  details: "Details",
  help: "Paragraph",
  button: "Button",
  footer: "Footer",
};
export const SLOT_ICONS: Record<string, string> = {
  logo: "image",
  ill: "image",
  headline: "type",
  timeline: "zap",
  amount: "zap",
  digest: "cal",
  list0: "list",
  list1: "list",
  details: "zap",
  help: "type",
  button: "pointer",
  footer: "list",
};

/** An email's blocks in the universal order. */
export function orderedBlocks(e: Email, layout: Layout) {
  const idx = (id: string) => {
    const i = layout.order.indexOf(id);
    return i < 0 ? layout.order.length - 1.5 : i;
  };
  return [...e.blocks].sort((a, b) => idx(a.id) - idx(b.id));
}
/** Blocks that actually render in an email: not hidden in it, not hidden everywhere. */
export const visibleBlocks = (e: Email, layout: Layout) => orderedBlocks(e, layout).filter((b) => !b.hidden && !layout.off.includes(b.id));

export const isDigest = (e: Email) => e.kind === "digest";

/** Emails bundled into a persona's digest. Pass a frequency to get just that summary's emails. */
export const bundledInto = (mod: Module, digest: Email, freq?: Freq) =>
  mod.emails.filter(
    (e) => !isDigest(e) && e.aud === digest.aud && e.on && e.timing.type === "event" && (freq ? e.timing.freqs?.includes(freq) : !!e.timing.freqs?.length),
  );
/** The persona digest an email's summaries go into. */
export const digestFor = (mod: Module, e: Email) => mod.emails.find((d) => isDigest(d) && d.aud === e.aud);

/** The states a template shows on the canvas. Digests show one state per enabled frequency. */
export function statesOf(e: Email): TemplateState[] {
  if (isDigest(e)) {
    const on = enabledFreqs(e.timing.schedule);
    return on.length ? on.map((f) => ({ id: f, label: FREQ_LABEL[f], scenario: "mixed" })) : [{ id: "off", label: "No schedule", scenario: "mixed" }];
  }
  return e.states?.length ? e.states : [{ id: "default", label: "Default", scenario: "mixed" }];
}
