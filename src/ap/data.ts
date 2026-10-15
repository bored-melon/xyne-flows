/* Sample data for Payables › Procurement. Every number on the page is counted from these cards. */

export type Tone = "neutral" | "amber" | "green" | "red" | "blue" | "violet";
export type ColId = "pr" | "rfq" | "po" | "grn" | "bill";

export interface Status {
  name: string;
  tone: Tone;
}

export interface Column {
  id: ColId;
  title: string;
  /** Plural noun used in empty states */
  noun: string;
  /** In the order the colour strip shows them */
  statuses: Status[];
  /** Statuses that need someone come first in the list */
  order: string[];
}

export interface Card {
  id: string;
  col: ColId;
  status: string;
  /** Who it waits on, e.g. "L2" or "CFO". Not shown on the card. */
  sub?: string;
  title: string;
  /** Value in INR, used for totals */
  amt: number;
  /** How the amount reads on the card when it isn't a plain INR figure */
  disp?: string;
  date: string;
  /** For purchase orders: the request it was raised from */
  pr?: string;
  owner: string;
}

export const COLUMNS: Column[] = [
  {
    id: "pr",
    title: "Purchase requests",
    noun: "requests",
    statuses: [
      { name: "Draft", tone: "neutral" },
      { name: "Pending", tone: "amber" },
      { name: "Approved", tone: "green" },
      { name: "Rejected", tone: "red" },
    ],
    order: ["Pending", "Rejected", "Draft", "Approved"],
  },
  {
    id: "rfq",
    title: "Quotations",
    noun: "quotations",
    statuses: [
      { name: "Awaiting", tone: "neutral" },
      { name: "Received", tone: "blue" },
      { name: "Evaluating", tone: "amber" },
      { name: "Awarded", tone: "green" },
    ],
    order: ["Evaluating", "Received", "Awaiting", "Awarded"],
  },
  {
    id: "po",
    title: "Purchase orders",
    noun: "purchase orders",
    statuses: [
      { name: "Pending", tone: "amber" },
      { name: "Sent", tone: "neutral" },
      { name: "Partly received", tone: "violet" },
      { name: "Received", tone: "green" },
      { name: "Rejected", tone: "red" },
    ],
    order: ["Pending", "Rejected", "Partly received", "Sent", "Received"],
  },
  {
    id: "grn",
    title: "GRNs",
    noun: "receipts",
    statuses: [
      { name: "Draft", tone: "neutral" },
      { name: "Submitted", tone: "blue" },
      { name: "Accepted", tone: "green" },
      { name: "Rejected", tone: "red" },
    ],
    order: ["Submitted", "Rejected", "Draft", "Accepted"],
  },
  {
    id: "bill",
    title: "Bills",
    noun: "bills",
    statuses: [
      { name: "Received", tone: "neutral" },
      { name: "Mismatch", tone: "red" },
      { name: "Pending", tone: "amber" },
      { name: "Approved", tone: "blue" },
      { name: "Paid", tone: "green" },
    ],
    order: ["Mismatch", "Pending", "Received", "Approved", "Paid"],
  },
];

type Row = [id: string, status: string, sub: string, title: string, amt: number, disp: string, date: string, link: string, owner: string];

const RAW: Record<ColId, Row[]> = {
  pr: [
    ["REQ-2088", "Pending", "L2", "Thales Luna HSMs × 2 — payments infra", 11200000, "", "Raised 9 Oct", "", "Karthik Rao"],
    ["REQ-2091", "Pending", "L1", "Global Fintech Fest booth — Mumbai", 3200000, "", "Raised 13 Oct", "", "Meera Iyer"],
    ["REQ-2095", "Pending", "L2", "Zscaler ZIA — 3-year renewal", 4100000, "", "Raised 10 Oct", "", "Nikhil Jain"],
    ["REQ-2096", "Pending", "L1", "Interview panel travel — Q4", 640000, "", "Raised 11 Oct", "", "Sanjana Pillai"],
    ["REQ-2097", "Pending", "L1", "Load-test cluster — 3 months", 1510000, "USD 18,000", "Raised 14 Oct", "", "Karthik Rao"],
    ["REQ-2093", "Draft", "", "Pantry & housekeeping — Q3", 360000, "", "Created 14 Oct", "", "Rohan Desai"],
    ["REQ-2098", "Draft", "", "Standing desks × 12 — Pune", 540000, "", "Created 15 Oct", "", "Sana Rao"],
    ["REQ-2085", "Approved", "", "MacBook Pro 14\" × 25 — new engineers", 5480000, "", "Approved 9 Oct", "RFQ-311", "Priya Nair"],
    ["REQ-2079", "Approved", "", "SOC 2 Type II audit — FY26-27", 2200000, "", "Approved 6 Oct", "RFQ-318", "Ananya Das"],
    ["REQ-2081", "Approved", "", "Office floor setup — 50 workstations", 820000, "", "Approved 7 Oct", "RFQ-322", "Sana Rao"],
    ["REQ-2041", "Approved", "", "New-joiner kit — Bengaluru office", 2240000, "", "Approved 3 Oct", "RFQ-305 · 3 POs", "Priya Nair"],
    ["REQ-2066", "Approved", "", "Courier & logistics — annual", 2600000, "", "Approved 1 Oct", "RFQ-309", "Sana Rao"],
    ["REQ-2077", "Approved", "", "UPS AMC — 3 sites", 480000, "", "Approved 8 Oct", "RFQ-314", "Rohan Desai"],
    ["REQ-2072", "Approved", "", "Datadog — annual platform licence", 1760000, "", "Approved 7 Oct", "PO-1203", "Karthik Rao"],
    ["REQ-2069", "Approved", "", "MPLS network — 4 sites, 12 months", 960000, "", "Approved 2 Oct", "PO-1196", "Rohan Desai"],
    ["REQ-2070", "Approved", "", "Postman Enterprise — 30 seats", 830000, "", "Approved 10 Oct", "PO-1202", "Karthik Rao"],
    ["REQ-2083", "Approved", "", "Brand film — Diwali campaign", 1800000, "", "Approved 8 Oct", "RFQ-320", "Meera Iyer"],
    ["REQ-2086", "Approved", "", "Legal counsel — vendor contracts", 900000, "", "Approved 9 Oct", "RFQ-324", "Ananya Das"],
    ["REQ-2074", "Rejected", "", "Team offsite — Goa, 60 people", 1850000, "", "Rejected 8 Oct", "", "Sanjana Pillai"],
  ],
  rfq: [
    ["RFQ-322", "Awaiting", "", "Office floor setup — 50 workstations", 820000, "", "1 of 3 quotes · due 17 Oct", "REQ-2081", "Sana Rao"],
    ["RFQ-314", "Awaiting", "", "UPS AMC — 3 sites", 480000, "", "0 of 2 quotes · due 20 Oct", "REQ-2077", "Rohan Desai"],
    ["RFQ-324", "Awaiting", "", "Legal counsel — vendor contracts", 900000, "", "1 of 3 quotes · due 21 Oct", "REQ-2086", "Vikram Mehta"],
    ["RFQ-318", "Received", "", "SOC 2 Type II audit — FY26-27", 1950000, "", "3 quotes in · 12 Oct", "REQ-2079", "Vikram Mehta"],
    ["RFQ-320", "Received", "", "Brand film — Diwali campaign", 1720000, "", "4 quotes in · 13 Oct", "REQ-2083", "Vikram Mehta"],
    ["RFQ-326", "Received", "", "Security cameras — warehouse", 650000, "", "3 quotes in · 9 Oct", "REQ-2049", "Sana Rao"],
    ["RFQ-327", "Received", "", "Printer leases — 3 sites", 280000, "", "2 quotes in · 10 Oct", "REQ-2058", "Rohan Desai"],
    ["RFQ-311", "Evaluating", "", "MacBook Pro 14\" × 25", 5300000, "", "Closed 12 Oct", "REQ-2085", "Vikram Mehta"],
    ["RFQ-321", "Evaluating", "", "Catering — November all-hands", 290000, "", "Closed 11 Oct", "REQ-2044", "Vikram Mehta"],
    ["RFQ-305", "Awarded", "", "New-joiner kit — split across 3 vendors", 2150000, "", "Awarded 9 Oct", "REQ-2041 · 3 POs", "Vikram Mehta"],
    ["RFQ-309", "Awarded", "", "Courier & logistics — annual", 2400000, "", "Awarded 2 Oct", "REQ-2066", "Sana Rao"],
    ["RFQ-301", "Awarded", "", "MPLS network — 4 sites", 960000, "", "Awarded 30 Sep", "REQ-2069", "Sana Rao"],
    ["RFQ-303", "Awarded", "", "Datadog — annual platform licence", 1760000, "USD 21,000", "Awarded 6 Oct", "REQ-2072", "Vikram Mehta"],
    ["RFQ-306", "Awarded", "", "Postman Enterprise — 30 seats", 830000, "USD 9,900", "Awarded 10 Oct", "REQ-2070", "Vikram Mehta"],
    ["RFQ-298", "Awarded", "", "Pantry supplies — 12-month rate contract", 1620000, "", "Awarded 22 Sep", "REQ-2051", "Sana Rao"],
  ],
  po: [
    ["PO-1188", "Pending", "CFO", "Monitors 27\" × 20 — Bluepeak", 382320, "", "Raised 9 Oct", "REQ-2041 · 2 of 3 POs", "Vikram Mehta"],
    ["PO-1203", "Pending", "L1", "Datadog — annual platform licence", 1760000, "USD 21,000", "Raised 13 Oct", "REQ-2072", "Vikram Mehta"],
    ["PO-1205", "Pending", "L1", "Office floor setup — Godrej Interio", 967600, "", "Raised 14 Oct", "REQ-2081", "Sana Rao"],
    ["PO-1202", "Pending", "L1", "Postman Enterprise — 30 seats", 830000, "USD 9,900", "Raised 14 Oct", "REQ-2070", "Vikram Mehta"],
    ["PO-1196", "Sent", "", "MPLS network — Tata Communications", 1132800, "", "Sent 11 Oct", "REQ-2069", "Sana Rao"],
    ["PO-1201", "Sent", "", "Courier & logistics — Blue Dart", 2400000, "", "Sent 12 Oct", "REQ-2066", "Sana Rao"],
    ["PO-1204", "Sent", "", "Pantry supplies — Sodexo, October", 162400, "", "Sent 13 Oct", "REQ-2051", "Sana Rao"],
    ["PO-1200", "Sent", "", "Brand film — Lighthouse Films", 1720000, "", "Sent 13 Oct", "REQ-2083", "Vikram Mehta"],
    ["PO-1197", "Sent", "", "Printer leases — Ricoh", 280000, "", "Sent 10 Oct", "REQ-2058", "Sana Rao"],
    ["PO-1198", "Sent", "", "Catering — Pinecrest, November", 290000, "", "Sent 12 Oct", "REQ-2044", "Vikram Mehta"],
    ["PO-1206", "Sent", "", "AWS credits — Q4 top-up", 4200000, "USD 50,000", "Sent 14 Oct", "REQ-2062", "Vikram Mehta"],
    ["PO-1187", "Partly received", "", "Laptops 16 GB × 20 — Ingram Micro", 1852600, "", "12 of 20 in · rest 18 Oct", "REQ-2041 · 1 of 3 POs", "Vikram Mehta"],
    ["PO-1199", "Partly received", "", "CCTV cameras × 16 — Hikvision", 650000, "", "14 of 16 in", "REQ-2049", "Sana Rao"],
    ["PO-1193", "Partly received", "", "Office chairs × 30 — Featherlite", 450000, "", "20 of 30 in", "REQ-2055", "Sana Rao"],
    ["PO-1189", "Received", "", "Ergonomic chairs × 20 — Featherlite", 302080, "", "Closed 12 Oct", "REQ-2041 · 3 of 3 POs", "Vikram Mehta"],
    ["PO-1176", "Received", "", "Pantry supplies — Sodexo, September", 162400, "", "Received 3 Oct", "REQ-2051", "Sana Rao"],
    ["PO-1185", "Received", "", "Figma Enterprise — 40 seats", 604800, "USD 7,200", "Live 12 Oct", "REQ-2031", "Vikram Mehta"],
    ["PO-1183", "Received", "", "Diwali hampers × 500 — Giftbay", 1180000, "", "Received 6 Oct", "REQ-2029", "Sana Rao"],
    ["PO-1171", "Received", "", "Shipments — Blue Dart, September", 194700, "", "Received 30 Sep", "REQ-2034", "Sana Rao"],
    ["PO-1190", "Rejected", "", "Cafeteria services — Sodexo, Q3", 1440000, "", "Rejected 12 Oct", "REQ-2064", "Sana Rao"],
  ],
  grn: [
    ["GRN-4422", "Draft", "", "Figma Enterprise — 40 seats live", 604800, "USD 7,200", "Started 12 Oct", "PO-1185", "Ananya Das"],
    ["GRN-4424", "Draft", "", "Office chairs — 10 more arrived", 150000, "", "Started 15 Oct", "PO-1193", "Sana Rao"],
    ["GRN-4412", "Submitted", "", "Laptops — 12 of 20 received", 1111560, "", "Received 11 Oct", "PO-1187", "Priya Nair"],
    ["GRN-4420", "Submitted", "", "CCTV cameras — 14 of 16 received", 569000, "", "Received 12 Oct", "PO-1199", "Rohan Desai"],
    ["GRN-4423", "Submitted", "", "Brand film — first cut delivered", 860000, "", "Delivered 14 Oct", "PO-1200", "Meera Iyer"],
    ["GRN-4415", "Accepted", "", "Ergonomic chairs — 20 of 20", 302080, "", "Accepted 12 Oct", "PO-1189", "Priya Nair"],
    ["GRN-4409", "Accepted", "", "Pantry supplies — September", 162400, "", "Accepted 3 Oct", "PO-1176", "Rohan Desai"],
    ["GRN-4410", "Accepted", "", "Diwali hampers — 500 of 500", 1180000, "", "Accepted 6 Oct", "PO-1183", "Meera Iyer"],
    ["GRN-4405", "Accepted", "", "Shipments — Blue Dart, September", 194700, "", "Accepted 30 Sep", "PO-1171", "Sana Rao"],
    ["GRN-4418", "Accepted", "", "Office chairs — 20 of 30", 300000, "", "Accepted 10 Oct", "PO-1193", "Sana Rao"],
    ["GRN-4401", "Accepted", "", "MacBook Air × 10 — Q2 hires", 1150000, "", "Accepted 18 Sep", "PO-1160", "Priya Nair"],
    ["GRN-4403", "Accepted", "", "Zoom Rooms — 6 rooms", 420000, "", "Accepted 22 Sep", "PO-1162", "Rohan Desai"],
    ["GRN-4404", "Accepted", "", "Access control — Bengaluru office", 380000, "", "Accepted 24 Sep", "PO-1164", "Rohan Desai"],
    ["GRN-4406", "Accepted", "", "Network switches × 8", 520000, "", "Accepted 26 Sep", "PO-1166", "Karthik Rao"],
    ["GRN-4407", "Accepted", "", "Ergonomic keyboards × 40", 160000, "", "Accepted 27 Sep", "PO-1168", "Priya Nair"],
    ["GRN-4408", "Accepted", "", "Water dispensers — 3 floors", 90000, "", "Accepted 29 Sep", "PO-1170", "Rohan Desai"],
    ["GRN-4411", "Accepted", "", "Projector — boardroom", 140000, "", "Accepted 1 Oct", "PO-1172", "Rohan Desai"],
    ["GRN-4417", "Rejected", "", "UPS batteries — wrong spec", 210000, "", "Rejected 9 Oct", "PO-1180", "Rohan Desai"],
  ],
  bill: [
    ["BILL-887", "Received", "", "Datadog — September usage", 155000, "USD 1,850", "Due 28 Oct", "", "Ananya Das"],
    ["BILL-896", "Received", "", "Ricoh — printer lease, October", 23600, "", "Due 30 Oct", "PO-1197", "Ananya Das"],
    ["BILL-897", "Received", "", "Lighthouse Films — 50% advance", 860000, "", "Due 29 Oct", "PO-1200", "Ananya Das"],
    ["BILL-890", "Mismatch", "", "Ingram Micro — billed 20 laptops, 12 received", 1852600, "", "Due 10 Nov", "PO-1187 · REQ-2041", "Ananya Das"],
    ["BILL-879", "Mismatch", "", "Giftbay — INR 47,200 over the PO price", 1227200, "", "Due 22 Oct", "PO-1183", "Ananya Das"],
    ["BILL-891", "Pending", "", "Tata Communications — MPLS Q3", 283200, "", "Due 25 Oct", "PO-1196", "Ananya Das"],
    ["BILL-893", "Pending", "", "Blue Dart — October shipments", 206500, "", "Due 30 Oct", "PO-1201", "Ananya Das"],
    ["BILL-894", "Pending", "", "Sodexo — pantry, September", 118000, "", "Due 27 Oct", "PO-1176", "Ananya Das"],
    ["BILL-895", "Pending", "", "AWS — September usage", 1190000, "USD 14,200", "Due 31 Oct", "", "Ananya Das"],
    ["BILL-883", "Approved", "", "Featherlite — chairs × 20", 302080, "", "Pays 18 Oct", "PO-1189 · REQ-2041", "Ananya Das"],
    ["BILL-884", "Approved", "", "Figma — Enterprise, 40 seats", 604800, "USD 7,200", "Pays 18 Oct", "PO-1185", "Ananya Das"],
    ["BILL-885", "Approved", "", "Featherlite — office chairs, 20 of 30", 354000, "", "Pays 25 Oct", "PO-1193", "Ananya Das"],
    ["BILL-886", "Approved", "", "Hikvision — CCTV, 14 of 16", 498000, "", "Pays 25 Oct", "PO-1199", "Ananya Das"],
    ["BILL-888", "Approved", "", "Zoom — Rooms, 6 rooms", 420000, "", "Pays 25 Oct", "PO-1162", "Ananya Das"],
    ["BILL-889", "Approved", "", "Cisco — network switches × 8", 520000, "", "Pays 25 Oct", "PO-1166", "Ananya Das"],
    ["BILL-872", "Paid", "", "Blue Dart — September shipments", 194700, "", "Paid 10 Oct", "PO-1171", "Ananya Das"],
    ["BILL-870", "Paid", "", "Apple — MacBook Air × 10", 1357000, "", "Paid 2 Oct", "PO-1160", "Ananya Das"],
    ["BILL-871", "Paid", "", "Honeywell — access control", 448400, "", "Paid 4 Oct", "PO-1164", "Ananya Das"],
    ["BILL-873", "Paid", "", "Logitech — keyboards × 40", 188800, "", "Paid 6 Oct", "PO-1168", "Ananya Das"],
    ["BILL-874", "Paid", "", "Kent RO — water dispensers", 106200, "", "Paid 7 Oct", "PO-1170", "Ananya Das"],
    ["BILL-875", "Paid", "", "Epson — boardroom projector", 165200, "", "Paid 8 Oct", "PO-1172", "Ananya Das"],
    ["BILL-876", "Paid", "", "Sodexo — pantry, August", 116000, "", "Paid 9 Oct", "PO-1158", "Ananya Das"],
    ["BILL-877", "Paid", "", "Tata Communications — MPLS Q2", 283200, "", "Paid 9 Oct", "PO-1150", "Ananya Das"],
    ["BILL-878", "Paid", "", "Ricoh — printer lease, September", 23600, "", "Paid 10 Oct", "PO-1197", "Ananya Das"],
  ],
};

export const CARDS: Card[] = (Object.keys(RAW) as ColId[]).flatMap((col) =>
  RAW[col].map(([id, status, sub, title, amt, disp, date, link, owner]) => ({
    id,
    col,
    status,
    sub: sub || undefined,
    title,
    amt,
    disp: disp || undefined,
    date,
    pr: col === "po" ? link.match(/REQ-\d+/)?.[0] : undefined,
    owner,
  })),
);

/** POs raised from the same request. Only these cards carry a link: "REQ-2041 · 2 of 3 POs". */
const PO_BY_PR = CARDS.reduce<Record<string, string[]>>((m, c) => (c.pr && (m[c.pr] ||= []).push(c.id), m), {});
Object.values(PO_BY_PR).forEach((ids) => ids.sort());
export const sharedPr = (c: Card) => {
  const ids = c.pr ? PO_BY_PR[c.pr] : undefined;
  return ids && ids.length > 1 ? { pr: c.pr!, label: `${c.pr} · ${ids.indexOf(c.id) + 1} of ${ids.length} POs` } : undefined;
};

/** A filter key is one status in one column, e.g. "po:Pending". */
export const fkey = (col: ColId, status: string) => `${col}:${status}`;

export const toneOf = (col: ColId, status: string): Tone => COLUMNS.find((c) => c.id === col)!.statuses.find((s) => s.name === status)?.tone || "neutral";

const group = (n: number) => {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return rest + "," + last3;
};

/** INR 1,94,700 — the exact figure, in Indian grouping */
export const inr = (n: number) => "INR " + group(n);

/** INR 3.12 Cr / INR 18.5L — for totals */
export const inrShort = (n: number) => {
  if (n >= 1e7) return `INR ${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `INR ${(n / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  return inr(n);
};

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

const AV_COLORS = ["#DBEAFE", "#FCE7F3", "#DCFCE7", "#FEF3C7", "#EDE9FE", "#E0F2FE", "#FFE4E6", "#F1F5F9"];
const AV_TEXT = ["#1E40AF", "#9D174D", "#166534", "#92400E", "#5B21B6", "#075985", "#9F1239", "#334155"];
export const avatarColors = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const i = h % AV_COLORS.length;
  return { background: AV_COLORS[i], color: AV_TEXT[i] };
};
