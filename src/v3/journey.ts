import type { Audience } from "@/data/types";
import { CHANNELS, emailById, FREQ_NAME, onChannels, timingLine, type Channel, type ChannelState, type Notif, type Product } from "@/v2/model";

/* Version 3 · helpers for listing a product's notifications in the order a request moves. */

export const PERSONAS: { aud: Audience; icon: string; one: string; many: string; color: string }[] = [
  { aud: "employee", icon: "user", one: "Employee", many: "Employees", color: "#2B7FFF" },
  { aud: "approver", icon: "users", one: "Approver", many: "Approvers", color: "#7C3AED" },
  { aud: "admin", icon: "sliders", one: "Admin", many: "Admins", color: "#52525B" },
];
export const persona = (a: Audience) => PERSONAS.find((p) => p.aud === a)!;
const ORDER: Record<Audience, number> = { employee: 0, approver: 1, admin: 2 };

/** Every notification, in the order a request meets them: by stage, then by who gets it. Summaries last. */
export function chrono(p: Product): Notif[] {
  return p.notifs
    .map((n, i) => ({ n, i }))
    .sort((a, b) => a.n.stage - b.n.stage || ORDER[a.n.aud] - ORDER[b.n.aud] || a.i - b.i)
    .map((x) => x.n);
}

/** What happens in the product that sends it, in the admin's words. */
export function eventOf(n: Notif): string {
  if (n.summary) return "Rounds up what changed since the last one. Skipped when there’s nothing new.";
  return emailById(n.id)?.trigger || n.desc;
}

/** A short line about what each stage means, so the stages read as a story. */
export const STAGE_HINT: Record<string, string[]> = {
  reimb: ["The employee submits claims", "An approver reviews them", "Some claims are flagged and fixed", "The approver finishes reviewing", "Finance pays the employee"],
  travel: ["The employee requests a trip", "An approver reviews it", "The travel desk books it", "Plans change", "The trip happens"],
  cards: ["The employee asks for a card", "An approver reviews it", "The card is issued", "Spends need receipts", "Limits and changes"],
  petty: ["The employee asks for an advance", "An approver reviews it", "The money is handed over", "Receipts are submitted", "The advance is settled"],
};

/** When it goes out, briefly. */
export function whenOf(n: Notif, channels: Record<Channel, ChannelState>): string {
  if (n.summary) return timingLine(n, channels);
  const on = onChannels(n, channels);
  if (!on.length) return "Off";
  const c = n.ch[on[0]];
  const sum = c.freqs.length ? c.freqs.map((f) => FREQ_NAME[f].toLowerCase()).join(" & ") + " summary" : "";
  if (c.instant && sum) return "Right away + " + sum;
  if (c.instant) return "Right away";
  return sum ? sum.charAt(0).toUpperCase() + sum.slice(1) + " only" : "Not scheduled";
}

export const isOff = (n: Notif, channels: Record<Channel, ChannelState>) => !n.summary && !CHANNELS.some((c) => n.ch[c].on && channels[c] === "connected");
