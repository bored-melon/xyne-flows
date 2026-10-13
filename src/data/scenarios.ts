import type { Brand, CaseKey, Claim, BlockProps, Scenario, Vars } from "./types";
import { inr } from "@/lib/utils";

/** Variables admins can insert into copy. Keys appear in templates as {key}. */
export const VARS: [string, string][] = [
  ["firstName", "Employee first name"],
  ["approver", "Approver name"],
  ["count", "Claim count"],
  ["flagged", "Claims to fix"],
  ["rejected", "Rejected count"],
  ["total", "Total claimed"],
  ["deadline", "Fix deadline"],
  ["payout", "Payout date"],
  ["req", "Request ID"],
  ["company", "Company name"],
  ["period", "Summary period"],
];
export const VLABEL: Record<string, string> = Object.fromEntries(VARS);

const C = (m: string, amt: number, status: Claim["status"], note: string, cat: string, date: string): Claim => ({
  m,
  amt,
  status,
  note,
  cat,
  date,
});

const merchants: [string, string][] = [
  ["Uber", "Local travel"],
  ["Taj MG Road", "Hotel"],
  ["Barbeque Nation", "Meals"],
  ["IndiGo", "Flights"],
  ["Starbucks", "Meals"],
  ["Ola", "Local travel"],
  ["Amazon Business", "Office supplies"],
  ["Swiggy", "Meals"],
  ["Airtel", "Phone bill"],
  ["Claude", "Software"],
  ["Rapido", "Local travel"],
  ["WeWork", "Workspace"],
];
const longAmounts = [1240, 18900, 4420, 7650, 640, 890, 3299, 800, 999, 2599, 310, 12000];

/** Sample requests used to preview edge cases in the editor. */
export const SCEN: Scenario[] = [
  { id: "one", label: "1 claim · just submitted", hint: "Simplest case", claims: [C("Uber", 1240, "Submitted", "", "Local travel", "24 Sep")] },
  {
    id: "several",
    label: "3 claims · submitted",
    hint: "A typical request",
    claims: [
      C("Uber", 1240, "Submitted", "", "Local travel", "24 Sep"),
      C("Taj MG Road", 18900, "Submitted", "", "Hotel", "22 Sep"),
      C("Barbeque Nation", 4420, "Submitted", "", "Meals", "23 Sep"),
    ],
  },
  {
    id: "onerej",
    label: "1 claim · rejected",
    hint: "Single rejection",
    claims: [C("Swiggy", 800, "Rejected", "Personal expense. Not claimable under the meals policy.", "Meals", "26 Sep")],
  },
  {
    id: "approved",
    label: "3 claims · all approved",
    hint: "Happy path",
    claims: [
      C("Uber", 1240, "Approved", "", "Local travel", "24 Sep"),
      C("Taj MG Road", 18900, "Approved", "", "Hotel", "22 Sep"),
      C("Barbeque Nation", 4420, "Approved", "", "Meals", "23 Sep"),
    ],
  },
  {
    id: "mixed",
    label: "2 flagged · 1 rejected",
    hint: "Mixed outcome",
    claims: [
      C("Claude", 2599, "Flagged", "Receipt total does not match the claimed amount.", "Software", "25 Sep"),
      C("Uber", 3400, "Partly approved", "₹1,800 approved. The rest needs a GST invoice.", "Local travel", "26 Sep"),
      C("Swiggy", 800, "Rejected", "Personal expense. Not claimable under the meals policy.", "Meals", "26 Sep"),
      C("Starbucks", 2000, "Approved", "", "Meals", "27 Sep"),
    ],
  },
  {
    id: "long",
    label: "12 claims · long list",
    hint: "Checks “+ N more”",
    claims: merchants.map(([m, cat], i) =>
      C(
        m,
        longAmounts[i],
        i % 3 === 0 ? "Flagged" : i === 7 ? "Rejected" : "Approved",
        i % 3 === 0 ? "Missing GST number on the receipt." : i === 7 ? "Personal expense." : "",
        cat,
        14 + i + " Sep",
      ),
    ),
  },
  {
    id: "rejected",
    label: "All rejected",
    hint: "Only bad news",
    claims: [
      C("Swiggy", 800, "Rejected", "Personal expense. Not claimable under the meals policy.", "Meals", "26 Sep"),
      C("Rapido", 310, "Rejected", "Duplicate of a claim from 24 Sep.", "Local travel", "25 Sep"),
    ],
  },
  {
    id: "none",
    label: "Nothing needs a fix",
    hint: "Empty block behaviour",
    claims: [C("Uber", 1240, "Approved", "", "Local travel", "24 Sep"), C("Starbucks", 640, "Approved", "", "Meals", "25 Sep")],
  },
];

export function makeVars(scId: string, brand: Brand): Vars {
  const sc = SCEN.find((s) => s.id === scId) || SCEN[2];
  const cl = sc.claims;
  const need = cl.filter((c) => c.status === "Flagged" || c.status === "Partly approved");
  const rej = cl.filter((c) => c.status === "Rejected");
  const ok = cl.filter((c) => c.status === "Approved" || c.status === "Submitted");
  const sum = (a: Claim[]) => a.reduce((s, c) => s + c.amt, 0);
  return {
    firstName: "Priya",
    approver: "Shankar",
    count: cl.length,
    flagged: need.length,
    rejected: rej.length,
    total: inr(sum(cl)),
    deadline: "10 Oct",
    payout: "15 Oct",
    req: "REQ-2041",
    company: brand.company,
    period: "daily",
    _all: cl,
    _need: need,
    _rej: rej,
    _amtOk: sum(ok),
    _amtNeed: sum(need),
    _amtRej: sum(rej),
  };
}

/** Conditions for "Says it differently when…" headline cases. */
export const CASES: Record<CaseKey, string> = {
  one: "Exactly 1 claim",
  onlyRejected: "Only rejected claims",
  none: "Nothing needs a fix",
};

export const caseMatch = (w: CaseKey, v: Vars) =>
  w === "one" ? v.count === 1 : w === "onlyRejected" ? v.count > 0 && v.rejected === v.count : w === "none" ? v.flagged === 0 : false;

export const activeCase = (p: BlockProps, v: Vars) => (p.cases || []).findIndex((c) => caseMatch(c.when, v));

export const pickText = (p: BlockProps, v: Vars) => {
  const i = activeCase(p, v);
  return i >= 0 ? p.cases![i].text : p.text;
};
