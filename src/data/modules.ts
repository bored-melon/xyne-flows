import type { Audience, Block, BlockProps, Email, HeadlineCase, Layout, Module, Schedule, Step, StepState, StudioState, TemplateState, Timing } from "./types";
import { clone } from "@/lib/utils";

/*
 * Sample data for the prototype.
 * Reimbursements has full content. The other modules use the real email names
 * with simpler generated content, so the studio and journey map work everywhere.
 */

const st = (label: string, sub: string, state: StepState): Step => ({ label, sub, state });
const blk = (type: Block["type"], props: BlockProps, id: string, hidden = false): Block => ({ id, type, hidden, props: props || {} });
export { blk };

interface StdOptions {
  ill: string;
  head: string;
  sub: string;
  cases?: HeadlineCase[];
  timeline?: Step[];
  amount?: { label: string; breakdown?: boolean };
  lists?: { heading: string; source: "all" | "need" | "rejected"; layout?: "notes" | "compact" | "totals" }[];
  details?: [string, string, string][];
  help?: string;
  button?: string;
  /** Daily digest emails list the bundled updates */
  digest?: boolean;
}

/**
 * The one block order every email follows. Each email has some of these slots
 * (and can hide them), but never reorders them, so all emails look alike.
 */
export const DEFAULT_LAYOUT: Layout = {
  order: ["logo", "ill", "headline", "timeline", "amount", "digest", "list0", "list1", "details", "help", "button", "footer"],
  off: [],
};

/** Builds the standard block stack every notification shares. */
function std(o: StdOptions): Block[] {
  const b: Block[] = [
    blk("logo", {}, "logo"),
    blk("illustration", { kind: o.ill }, "ill"),
    blk("headline", { text: o.head, sub: o.sub, cases: o.cases || [], align: "center" }, "headline"),
  ];
  if (o.timeline) b.push(blk("timeline", { steps: o.timeline, dates: true }, "timeline"));
  if (o.amount) b.push(blk("amount", { label: o.amount.label, breakdown: !!o.amount.breakdown }, "amount"));
  if (o.digest) b.push(blk("digest", { heading: "Since yesterday", showTime: true }, "digest"));
  (o.lists || []).forEach((l, i) => {
    const layout = l.layout || "notes";
    b.push(
      blk(
        "list",
        {
          heading: l.heading,
          source: l.source,
          layout,
          fields: { logo: true, status: true, note: layout === "notes", category: false, date: false },
          max: 5,
          empty: "hide",
        },
        "list" + i,
      ),
    );
  });
  if (o.details) b.push(blk("details", { rows: o.details.map(([icon, label, value]) => ({ icon, label, value, on: true })) }, "details"));
  b.push(blk("note", { text: o.help || "Questions? Reply to this email and the {company} finance team will help." }, "help", !o.help));
  b.push(blk("button", { label: o.button || "View claims" }, "button"));
  b.push(blk("footer", {}, "footer"));
  return b;
}

type EmailInput = Omit<Email, "on" | "channels" | "quiet" | "timing"> & Partial<Pick<Email, "on" | "channels" | "quiet" | "timing">>;
const E = (o: EmailInput): Email => ({
  on: true,
  channels: { inapp: true, slack: false },
  quiet: { weekends: true, time: "9:30 AM" },
  timing: { type: "event", instant: true, freqs: [] },
  ...o,
});

function genTimeline(stages: string[], stage: number): Step[] {
  const s = stages.slice(0, 4);
  const cur = Math.min(stage, 3);
  return s.map((l, j) => st(l, j < cur ? "Done" : j === cur ? "Now" : "Next", j < cur ? "done" : j === cur ? "now" : "todo"));
}

type SimpleRow = [name: string, aud: Audience, stage: number, on: number, head: string, sub: string, ill: string, trigger: string, timing?: Timing];

function simpleModule(id: string, name: string, icon: string, on: boolean, stages: string[], list: SimpleRow[]): Module {
  return {
    id,
    name,
    icon,
    on,
    stages,
    emails: list.map(([n, aud, stage, eon, head, sub, ill, trigger, timing], i) =>
      E({
        id: id + "-" + i,
        name: n,
        aud,
        stage,
        on: !!eon,
        trigger,
        timing: timing || { type: "event", instant: true, freqs: [] },
        subject: head,
        pre: sub,
        blocks: std({
          ill,
          head,
          sub,
          timeline: genTimeline(stages, stage),
          details: [
            ["user", "Requested by", "{firstName} Mehta"],
            ["cal", "Last updated", "12 Oct"],
          ],
          button: "View details",
        }),
      }),
    ),
  };
}

const REM: Timing = { type: "reminder", first: 2, every: 2, max: 3 };

export const DEFAULT_SCHEDULE: Schedule = {
  hourly: { on: false, every: 2, from: "9:00 AM", to: "7:00 PM" },
  daily: { on: true, time: "9:30 AM" },
  weekly: { on: false, day: "Monday", time: "9:30 AM" },
  monthly: { on: false, date: 1, time: "9:30 AM" },
};

const DIGEST_COPY: Record<Audience, [string, string, string]> = {
  employee: ["Employee digest", "Your {period} update", "What changed on your requests."],
  approver: ["Approver digest", "Your {period} approvals summary", "Everything waiting on you, in one email."],
  admin: ["Admin digest", "Your {period} admin summary", "Flags and activity across your company."],
};

/** One digest template per persona in the module. It bundles emails set to go into summaries. */
function digests(m: Module): Email[] {
  const auds = (["employee", "approver", "admin"] as Audience[]).filter((a) => m.emails.some((e) => e.aud === a));
  return auds.map((aud) => {
    const [name, head, sub] = DIGEST_COPY[aud];
    return E({
      id: `${m.id}-digest-${aud}`,
      kind: "digest",
      name,
      aud,
      stage: -1,
      trigger: "On its schedule, if any bundled updates are waiting",
      timing: { type: "digest", schedule: clone(DEFAULT_SCHEDULE) },
      subject: `Your {period} ${m.name.toLowerCase()} summary`,
      pre: "Everything that changed, in one email.",
      blocks: std({ ill: "clock", head, sub, digest: true, button: "Open Xyne Flow" }),
    });
  });
}

export function initialState(): StudioState {
  const reimb: Module = {
    id: "reimb",
    name: "Reimbursements",
    icon: "receipt",
    on: true,
    stages: ["Submitted", "In approval", "Needs a fix", "Approved / rejected", "Paid"],
    emails: [
      E({
        id: "r-sub",
        states: [{ id: "one", label: "1 claim", scenario: "one" }, { id: "several", label: "3 claims", scenario: "several" }, { id: "many", label: "Many claims", scenario: "long" }],
        name: "Claims submitted",
        aud: "employee",
        stage: 0,
        trigger: "When an employee submits claims",
        subject: "Your claims were sent to {approver} for approval",
        pre: "We’ll let you know as soon as they move.",
        blocks: std({
          ill: "receipts",
          head: "{count} claims submitted",
          cases: [{ when: "one", text: "Your claim was submitted" }],
          sub: "Sent to {approver} for approval",
          timeline: [st("Submitted", "29 Sep", "done"), st("{approver}", "Reviewing", "now"), st("Finance", "Next", "todo"), st("Paid", "About {payout}", "todo")],
          lists: [{ heading: "Claims", source: "all", layout: "compact" }],
          details: [
            ["clock", "Expected approval", "Usually within 3 working days"],
            ["wallet", "If approved", "Paid with the {payout} payout"],
          ],
        }),
      }),
      E({
        id: "r-fix",
        states: [{ id: "mixed", label: "Flagged and rejected", scenario: "mixed" }, { id: "many", label: "Many flagged", scenario: "long" }],
        name: "Claims need a fix",
        aud: "employee",
        stage: 2,
        on: false,
        trigger: "When an approver flags or part-approves a claim",
        subject: "Action needed: {flagged} claims flagged on {req}",
        pre: "Fix them by {deadline} to be paid with the {payout} payout.",
        blocks: std({
          ill: "receipts",
          head: "{flagged} claims flagged, {rejected} rejected",
          cases: [{ when: "one", text: "Your claim needs a fix" }],
          sub: "Act on flagged claims by {deadline} to include them in this payout.",
          timeline: [st("Submitted", "29 Sep", "done"), st("{approver}", "Reviewed 4 Oct", "done"), st("Fix claims", "By {deadline}", "you"), st("Paid", "{payout}", "todo")],
          amount: { label: "Total claimed", breakdown: true },
          lists: [
            { heading: "What needs action", source: "need" },
            { heading: "Rejected", source: "rejected" },
          ],
          details: [
            ["clock", "Resubmit by", "{deadline}"],
            ["wallet", "If approved", "Paid in the {payout} payout"],
          ],
          button: "Fix claims",
        }),
      }),
      E({
        id: "r-rem",
        name: "Fix reminder",
        aud: "employee",
        stage: 2,
        on: false,
        trigger: "Before the fix deadline, if claims are still flagged",
        timing: { type: "before", days: 1 },
        subject: "Reminder: {flagged} claims still need a fix",
        pre: "{deadline} is the last day to include them in this payout.",
        blocks: std({
          ill: "clock",
          head: "{flagged} claims need your action",
          sub: "Fixed claims will be paid with the rest on {payout}.",
          lists: [{ heading: "What needs action", source: "need" }],
          details: [
            ["clock", "Resubmit by", "{deadline}"],
            ["alert", "If you miss it", "They move to the next payout"],
          ],
          button: "Fix claims",
        }),
      }),
      E({
        id: "r-rej",
        states: [{ id: "one", label: "1 claim", scenario: "onerej" }, { id: "several", label: "Several claims", scenario: "rejected" }],
        name: "Claims rejected",
        aud: "employee",
        stage: 3,
        on: false,
        trigger: "When every claim in a request is rejected",
        subject: "{rejected} claims were rejected",
        pre: "See why, and raise a new claim if something was missed.",
        blocks: std({
          ill: "alert",
          head: "{rejected} claims rejected",
          cases: [{ when: "one", text: "Your claim was rejected" }],
          sub: "See why below. You can raise a new claim if something was missed.",
          timeline: [st("Submitted", "29 Sep", "done"), st("{approver}", "Rejected 4 Oct", "rejected"), st("Finance", "—", "todo"), st("Paid", "—", "todo")],
          lists: [{ heading: "Rejected", source: "rejected" }],
          button: "View claims",
        }),
      }),
      E({
        id: "r-app",
        states: [{ id: "one", label: "1 claim", scenario: "one" }, { id: "several", label: "Several claims", scenario: "approved" }],
        name: "Claims approved",
        aud: "employee",
        stage: 3,
        trigger: "After the last approval",
        subject: "Approved: {req} will be paid on {payout}",
        pre: "No action needed from you.",
        blocks: std({
          ill: "check",
          head: "All {count} claims approved",
          cases: [{ when: "one", text: "Your claim is approved" }],
          sub: "To be paid with the payout on {payout}.",
          timeline: [st("Submitted", "29 Sep", "done"), st("{approver}", "Approved 4 Oct", "done"), st("Finance", "Approved 7 Oct", "done"), st("To be paid", "{payout}", "now")],
          amount: { label: "To be paid" },
          details: [["wallet", "To be reimbursed on", "{payout}"]],
        }),
      }),
      E({
        id: "r-paid",
        states: [{ id: "default", label: "Default", scenario: "approved" }],
        name: "Reimbursement paid",
        aud: "employee",
        stage: 4,
        trigger: "When the payout succeeds",
        channels: { inapp: true, slack: true },
        subject: "{total} is on its way to your bank",
        pre: "All your claims have been reimbursed.",
        blocks: std({
          ill: "wallet",
          head: "{total} has been paid",
          sub: "All your claims have been reimbursed.",
          amount: { label: "Reimbursed amount" },
          details: [
            ["cal", "Paid on", "{payout}"],
            ["wallet", "Paid to", "Account ending 4410"],
          ],
          button: "View payout",
        }),
      }),
      E({
        id: "r-fail",
        name: "Payout failed",
        aud: "employee",
        stage: 4,
        trigger: "When the bank returns a payout",
        subject: "Your payout of {total} did not go through",
        pre: "Update your bank details to get paid.",
        blocks: std({
          ill: "alert",
          head: "Your payout did not go through",
          sub: "Your bank returned it on {payout}. Update your bank details to get paid.",
          amount: { label: "Amount returned" },
          details: [
            ["alert", "Reason", "Account closed"],
            ["cal", "Paid again", "2 days after you update"],
          ],
          button: "Update bank details",
        }),
      }),
      E({
        id: "r-appr",
        states: [{ id: "one", label: "1 claim", scenario: "one" }, { id: "several", label: "Several claims", scenario: "several" }],
        name: "Claims to approve",
        aud: "approver",
        stage: 1,
        trigger: "When claims reach this approver",
        subject: "{firstName} needs your approval on {req}",
        pre: "{count} claims totalling {total}.",
        blocks: std({
          ill: "approval",
          head: "{firstName} needs your approval",
          sub: "{count} claims totalling {total} need your review.",
          timeline: [st("Submitted", "29 Sep", "done"), st("You", "Review by {deadline}", "now"), st("Finance", "Next", "todo"), st("Paid", "About {payout}", "todo")],
          lists: [{ heading: "Claims", source: "all", layout: "compact" }],
          details: [["clock", "Respond by", "{deadline}"]],
          button: "Review claims",
        }),
      }),
      E({
        id: "r-arem",
        name: "Approval reminder",
        aud: "approver",
        stage: 1,
        trigger: "Until the approver approves or rejects",
        timing: clone(REM),
        subject: "Reminder: {req} is waiting for you",
        pre: "It’s due by {deadline}.",
        blocks: std({
          ill: "clock",
          head: "{req} is still waiting on you",
          sub: "It’s due by {deadline}.",
          amount: { label: "Total claimed" },
          details: [["clock", "Respond by", "{deadline}"]],
          button: "Review claims",
        }),
      }),
      E({
        id: "r-resub",
        name: "Claims resubmitted",
        aud: "approver",
        stage: 2,
        trigger: "When fixed claims come back",
        timing: { type: "event", instant: false, freqs: ["daily"] },
        subject: "{firstName} fixed and resubmitted {req}",
        pre: "Ready for another look.",
        blocks: std({
          ill: "approval",
          head: "{firstName} updated {flagged} claims",
          cases: [{ when: "one", text: "{firstName} updated a claim" }],
          sub: "They’re ready for another look.",
          lists: [{ heading: "What changed", source: "need" }],
          details: [["clock", "Respond by", "{deadline}"]],
          button: "Review claims",
        }),
      }),
      E({
        id: "r-flags",
        states: [{ id: "default", label: "Default", scenario: "long" }],
        name: "Claim flags",
        aud: "admin",
        stage: 1,
        on: false,
        isNew: true,
        trigger: "When policy checks flag a claim",
        timing: { type: "event", instant: false, freqs: ["daily"] },
        subject: "{flagged} claims flagged by policy checks",
        pre: "Across all teams.",
        blocks: std({
          ill: "alert",
          head: "{flagged} claims flagged today",
          sub: "Across all teams, from policy checks.",
          lists: [{ heading: "Flagged claims", source: "need", layout: "compact" }],
          button: "Open flagged claims",
        }),
      }),
    ],
  };

  const travel = simpleModule("travel", "Travel", "plane", false, ["Requested", "In approval", "Changes", "Booking", "Trip"], [
    ["Travel request submitted", "employee", 0, 1, "Your travel request was submitted", "Sent to {approver} for approval.", "plane", "When a trip request is submitted"],
    ["Changes requested", "employee", 2, 1, "{approver} asked for changes", "Update your trip request to keep it moving.", "alert", "When an approver asks for changes"],
    ["Travel request rejected", "employee", 1, 1, "Your travel request was rejected", "See the reason from {approver}.", "alert", "When a trip request is rejected"],
    ["Travel request approved", "employee", 3, 1, "Your trip is approved", "The travel desk will book it next.", "check", "After the last approval"],
    ["Preferences need an update", "employee", 3, 1, "Add your travel preferences", "The travel desk needs them to book your trip.", "alert", "When preferences are missing"],
    ["Flights booked", "employee", 3, 1, "Your flights are booked", "Tickets are attached to this email.", "plane", "When flights are booked"],
    ["Hotel booked", "employee", 3, 1, "Your stay is booked", "Check-in details are below.", "hotel", "When a hotel is booked"],
    ["Booking changed", "employee", 4, 1, "Your booking changed", "Here is what is different.", "plane", "When a booking changes"],
    ["Trip cancelled", "employee", 4, 1, "Your trip was cancelled", "Any refunds will follow.", "alert", "When a trip is cancelled"],
    ["Add trip expenses", "employee", 4, 1, "Add expenses from your trip", "Claim them within 15 days of returning.", "receipts", "After the trip ends"],
    ["Travel request to approve", "approver", 1, 1, "{firstName} needs your approval", "A trip request is waiting for you.", "approval", "When a trip reaches this approver"],
    ["Approval reminder", "approver", 1, 1, "A trip request is still waiting", "It’s due by {deadline}.", "clock", "Until the approver acts", clone(REM)],
    ["Trip resubmitted", "approver", 2, 1, "{firstName} updated the trip request", "It’s ready for another look.", "approval", "When an updated request comes back", { type: "event", instant: false, freqs: ["daily"] }],
    ["Trip to book", "admin", 3, 1, "A new trip is ready to book", "Approved by {approver}.", "plane", "When a trip is fully approved"],
    ["Preferences updated", "admin", 3, 1, "{firstName} updated travel preferences", "Use them for future bookings.", "check", "When an employee updates preferences"],
  ]);

  const cards = simpleModule("cards", "Cards", "card", true, ["Requested", "In approval", "Issued", "In use", "Expiry"], [
    ["Card request submitted", "employee", 0, 1, "Card request submitted", "Sent to {approver} for approval.", "card", "When a card is requested"],
    ["Changes requested", "employee", 1, 1, "{approver} asked for changes", "Update your card request.", "alert", "When an approver asks for changes"],
    ["Card request rejected", "employee", 1, 1, "Your card request was rejected", "See the reason from {approver}.", "alert", "When a card request is rejected"],
    ["Card ready", "employee", 2, 1, "Your card is ready", "Use it at approved merchants.", "card", "When the card is issued"],
    ["Card expiring", "employee", 4, 1, "Your card expires in 3 days", "Use it before it closes.", "clock", "3 days before expiry", { type: "before", days: 3 }],
    ["Card expired", "employee", 4, 0, "Your card has expired", "Request a new one if you still need it.", "card", "When the card expires"],
    ["Upload receipt", "employee", 3, 1, "Upload the receipt for your last payment", "Within 3 days of paying.", "receipts", "After each card payment"],
    ["Card access paused", "employee", 3, 1, "Your card is paused", "Upload missing receipts to unpause it.", "alert", "When receipts are overdue"],
    ["Receipt needs a fix", "employee", 3, 1, "A receipt needs a fix", "{approver} left a note.", "receipts", "When a receipt is flagged"],
    ["Card expense approved", "employee", 3, 1, "Your card expense is approved", "No action needed.", "check", "When a card expense is approved"],
    ["Card request to approve", "approver", 1, 1, "{firstName} needs a card", "Review the request.", "approval", "When a request reaches this approver"],
    ["Approval reminder", "approver", 1, 1, "A card request is still waiting", "It’s due by {deadline}.", "clock", "Until the approver acts", clone(REM)],
    ["Card request resubmitted", "approver", 1, 0, "{firstName} updated the card request", "Ready for another look.", "approval", "When an updated request comes back"],
  ]);

  const proc = simpleModule("proc", "Procurement", "cart", true, ["Requested", "In approval", "Ordered", "Received", "Paid"], [
    ["Purchase request submitted", "employee", 0, 1, "Purchase request submitted", "Sent to {approver} for approval.", "cart", "When a purchase is requested"],
    ["Changes requested", "employee", 1, 1, "{approver} asked for changes", "Update your purchase request.", "alert", "When an approver asks for changes"],
    ["Purchase request approved", "employee", 2, 1, "Your purchase is approved", "Procurement will place the order.", "check", "After the last approval"],
    ["Order placed", "employee", 2, 1, "Your order was placed", "We’ll tell you when it arrives.", "cart", "When the PO is sent to the vendor"],
    ["Goods received", "employee", 3, 1, "Your order has arrived", "Confirm what you received.", "check", "When goods are marked received"],
    ["Purchase request to approve", "approver", 1, 1, "{firstName} needs your approval", "A purchase request is waiting for you.", "approval", "When a request reaches this approver"],
    ["Approval reminder", "approver", 1, 1, "A purchase request is still waiting", "It’s due by {deadline}.", "clock", "Until the approver acts", clone(REM)],
    ["Invoice due", "admin", 4, 1, "An invoice is due in 3 days", "Pay it to avoid late fees.", "wallet", "3 days before an invoice is due", { type: "before", days: 3 }],
  ]);

  const petty = simpleModule("petty", "Petty cash", "coins", true, ["Requested", "Approved", "Disbursed", "Settled"], [
    ["Advance requested", "employee", 0, 1, "Your advance request was submitted", "Sent to {approver} for approval.", "coins", "When an advance is requested"],
    ["Advance approved", "employee", 1, 1, "Your advance is approved", "Collect it from the cash desk.", "check", "After approval"],
    ["Cash disbursed", "employee", 2, 1, "Your advance was paid out", "Keep your receipts to settle it.", "wallet", "When cash is handed over"],
    ["Settle your advance", "employee", 2, 0, "Settle your advance", "Submit receipts by {deadline}.", "clock", "Before the settlement deadline", { type: "before", days: 2 }],
    ["Advance settled", "employee", 3, 1, "Your advance is settled", "Thanks for submitting your receipts.", "check", "When the advance is settled"],
    ["Advance to approve", "approver", 1, 1, "{firstName} needs an advance", "Review the request.", "approval", "When a request reaches this approver"],
  ]);

  return {
    brand: {
      company: "Acme Corp",
      sender: "Acme Corp Expenses",
      replyTo: "finance@acme.com",
      color: "#145DFB",
      radius: "soft",
      button: "filled",
      illustrations: "product",
      footer: "Acme Corp · 12 MG Road, Bengaluru 560001",
    },
    layout: clone(DEFAULT_LAYOUT),
    modules: [reimb, travel, cards, proc, petty].map((m) => ({ ...m, emails: [...m.emails, ...digests(m)] })),
  };
}
