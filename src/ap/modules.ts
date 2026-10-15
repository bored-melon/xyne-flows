import { COLUMNS, inrShort, sharedPr, type Card, type ColId, type Tone } from "./data";

/* The five module pages (direction B): which columns each table has, how a document becomes a row,
   and the two figures beside the strip. Rows are built from the same sample cards as the kanban,
   so every filter, count and total agrees with the boards. Extra detail that only the tables show
   (approvers, quote counts, received and billed amounts, 3-way match) is sample data kept here. */

export type TextTone = "amber" | "red" | "green" | "muted" | "link";
export type Match = "ok" | "qty" | "price" | "grn" | "nopo";
export type Cell =
  | { t: "text"; v: string; tone?: TextTone; sub?: string; flag?: string; strong?: boolean }
  | { t: "money"; v: number | null; muted?: boolean }
  | { t: "status" }
  | { t: "person"; v: string }
  | { t: "progress"; v: number; label: string; tone: Tone }
  | { t: "dots"; v: number; of: number }
  | { t: "match"; v: Match }
  | { t: "pct"; v: number | null };

export interface Col {
  k: string;
  label: string;
  /** Fixed width in px; 0 takes the remaining space */
  w: number;
  align?: "r";
  /** Show a checklist of this column's values in its header menu */
  filter?: boolean;
}

export interface Row {
  card: Card;
  cells: Record<string, Cell>;
  /** Sort values that differ from what the cell shows (dates, due in days) */
  sort?: Record<string, number>;
}

export interface Stat {
  label: string;
  value: string;
}

export interface ModuleDef {
  col: ColId;
  title: string;
  page: string;
  newLabel: string;
  search: string;
  cols: Col[];
  row: (c: Card) => Row;
  stats: (rows: Row[]) => Stat[];
  total: (rows: Row[]) => [string, string];
}

export const MATCH: Record<Match, { label: string; tone: TextTone; icon: "check" | "alert" | "clock" | null }> = {
  ok: { label: "Matched", tone: "green", icon: "check" },
  qty: { label: "Qty mismatch", tone: "red", icon: "alert" },
  price: { label: "Price mismatch", tone: "red", icon: "alert" },
  grn: { label: "Waiting on GRN", tone: "amber", icon: "clock" },
  nopo: { label: "No PO · 2-way", tone: "muted", icon: null },
};

/* ---------- dates: the sample data's "today" is 15 Oct ---------- */
const MON: Record<string, number> = { Sep: -30, Oct: 0, Nov: 31 };
const lastDate = (s: string) => [...s.matchAll(/(\d{1,2}) (Sep|Oct|Nov)/g)].pop();
/** Days from today to the last date in a string (negative = in the past) */
export const daysFrom = (s: string) => {
  const m = lastDate(s);
  return m ? +m[1] + MON[m[2]] - 15 : 0;
};
const day = (s: string) => {
  const m = lastDate(s);
  return m ? `${m[1]} ${m[2]}` : "—";
};

const T = (v: string, tone?: TextTone, more: Partial<Extract<Cell, { t: "text" }>> = {}): Cell => ({ t: "text", v, ...(tone ? { tone } : {}), ...more });
const ID = (c: Card): Cell => ({ t: "text", v: c.id, strong: true });
const M = (v: number | null, muted?: boolean): Cell => ({ t: "money", v, ...(muted ? { muted } : {}) });
const P = (v: number, label: string, tone: Tone): Cell => ({ t: "progress", v, label, tone });
const NA = T("—", "muted");
const sum = (rows: Row[], f: (r: Row) => boolean = () => true) => rows.filter(f).reduce((t, r) => t + r.card.amt, 0);
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/* ---------- Purchase requests ---------- */
const APPROVER: Record<string, string> = { L1: "Arjun Kapoor", L2: "Rajesh Iyer · CFO", CFO: "Rajesh Iyer · CFO" };
const OVER: Record<string, string> = { "REQ-2091": "Over Marketing budget", "REQ-2074": "Over Events budget by INR 6.2L" };

const pr: ModuleDef = {
  col: "pr",
  title: "Purchase requests",
  page: "Purchase requests",
  newLabel: "New request",
  search: "Search requests",
  cols: [
    { k: "id", label: "Request #", w: 110 },
    { k: "title", label: "Title", w: 0 },
    { k: "who", label: "Requester", w: 200, filter: true },
    { k: "dept", label: "Department", w: 190, filter: true },
    { k: "amt", label: "Est. amount (INR)", w: 150, align: "r" },
    { k: "status", label: "Status", w: 130, filter: true },
    { k: "next", label: "Waiting on / next", w: 230 },
    { k: "date", label: "Date", w: 90 },
  ],
  row: (c) => {
    const wait = -daysFrom(c.date);
    const next =
      c.status === "Pending"
        ? T(`${APPROVER[c.sub || "L1"]} · ${wait}d`, wait >= 4 ? "amber" : undefined)
        : c.status === "Approved"
          ? T(c.ref || "—", "link")
          : c.status === "Rejected"
            ? T("Rejected by Arjun Kapoor")
            : T("Not submitted", "muted");
    return {
      card: c,
      cells: { id: ID(c), title: T(c.title, undefined, OVER[c.id] ? { flag: OVER[c.id] } : {}), who: { t: "person", v: c.owner }, dept: T(`${c.dept} · ${c.entity}`), amt: M(c.amt), status: { t: "status" }, next, date: T(day(c.date)) },
      sort: { date: daysFrom(c.date), next: c.status === "Pending" ? -wait : 0 },
    };
  },
  stats: (rows) => {
    const waiting = rows.filter((r) => r.card.status === "Pending");
    const oldest = Math.max(0, ...waiting.map((r) => -daysFrom(r.card.date)));
    return [
      { label: "Waiting on approvers", value: inrShort(sum(waiting)) },
      { label: "Oldest waiting", value: waiting.length ? plural(oldest, "day") : "—" },
    ];
  },
  total: (rows) => [inrShort(sum(rows)), plural(rows.length, "request")],
};

/* ---------- Quotes (RFQs) ---------- */
const QIN: Record<string, [number, number]> = {
  "RFQ-322": [1, 3], "RFQ-314": [0, 2], "RFQ-324": [1, 3], "RFQ-318": [3, 3], "RFQ-320": [4, 4], "RFQ-326": [3, 3], "RFQ-327": [2, 2], "RFQ-311": [3, 3],
  "RFQ-321": [3, 3], "RFQ-305": [3, 3], "RFQ-309": [3, 3], "RFQ-301": [2, 2], "RFQ-303": [2, 2], "RFQ-306": [2, 2], "RFQ-298": [3, 3],
};
/** The request's estimate */
const EST: Record<string, number> = {
  "RFQ-322": 820000, "RFQ-314": 480000, "RFQ-324": 900000, "RFQ-318": 2200000, "RFQ-320": 1800000, "RFQ-326": 700000, "RFQ-327": 300000, "RFQ-311": 5480000,
  "RFQ-321": 320000, "RFQ-305": 2240000, "RFQ-309": 2600000, "RFQ-301": 960000, "RFQ-303": 1760000, "RFQ-306": 830000, "RFQ-298": 1700000,
};
/** Best quote so far, for RFQs still out with vendors (null = none in yet) */
const BEST: Record<string, number | null> = { "RFQ-322": 860000, "RFQ-314": null, "RFQ-324": 940000 };
const best = (c: Card) => (c.id in BEST ? BEST[c.id] : c.amt);

const rfq: ModuleDef = {
  col: "rfq",
  title: "Quotations",
  page: "Quotations",
  newLabel: "New RFQ",
  search: "Search RFQs",
  cols: [
    { k: "id", label: "RFQ #", w: 100 },
    { k: "title", label: "Title", w: 0 },
    { k: "req", label: "Request", w: 110 },
    { k: "quotes", label: "Quotes in", w: 130 },
    { k: "best", label: "Best quote (INR)", w: 150, align: "r" },
    { k: "vs", label: "vs estimate", w: 110, align: "r" },
    { k: "status", label: "Status", w: 130, filter: true },
    { k: "due", label: "Due / closed", w: 150 },
    { k: "who", label: "Buyer", w: 170, filter: true },
  ],
  row: (c) => {
    const [got, of] = QIN[c.id] || [0, 0];
    const b = best(c);
    const d = daysFrom(c.date);
    const due =
      c.status === "Awaiting" ? T("Due " + day(c.date), d <= 2 ? "amber" : undefined) : T((c.status === "Evaluating" ? "Closed " : c.status === "Received" ? "All in " : "Awarded ") + day(c.date));
    return {
      card: c,
      cells: {
        id: ID(c),
        title: T(c.title),
        req: T(c.ref?.match(/REQ-\d+/)?.[0] || "—", "link"),
        quotes: { t: "dots", v: got, of },
        best: b == null ? NA : M(b),
        vs: { t: "pct", v: b == null ? null : Math.round(((b - EST[c.id]) / EST[c.id]) * 100) },
        status: { t: "status" },
        due,
        who: { t: "person", v: c.owner },
      },
      sort: { due: d, quotes: of ? got / of : 0 },
    };
  },
  stats: (rows) => {
    const pending = rows.filter((r) => r.card.status === "Awaiting").reduce((t, r) => t + ((QIN[r.card.id]?.[1] || 0) - (QIN[r.card.id]?.[0] || 0)), 0);
    const saved = rows.filter((r) => r.card.status === "Awarded").reduce((t, r) => t + (EST[r.card.id] - (best(r.card) || 0)), 0);
    return [
      { label: "Quotes still due", value: String(pending) },
      { label: "Saved vs estimates", value: inrShort(saved) },
    ];
  },
  total: (rows) => [inrShort(sum(rows)), plural(rows.length, "RFQ")],
};

/* ---------- Purchase orders ---------- */
const PO_V: Record<string, [string, string]> = {
  "PO-1188": ["Bluepeak", "Monitors 27″ × 20"], "PO-1203": ["Datadog", "Annual platform licence"], "PO-1205": ["Godrej Interio", "Office floor setup · 50 workstations"],
  "PO-1202": ["Postman", "Enterprise · 30 seats"], "PO-1190": ["Sodexo", "Cafeteria services · Q3"], "PO-1187": ["Ingram Micro", "Laptops 16 GB × 20"],
  "PO-1199": ["Hikvision", "CCTV cameras × 16"], "PO-1193": ["Featherlite", "Office chairs × 30"], "PO-1196": ["Tata Communications", "MPLS network · 4 sites"],
  "PO-1201": ["Blue Dart", "Courier & logistics · annual"], "PO-1204": ["Sodexo", "Pantry supplies · October"], "PO-1200": ["Lighthouse Films", "Brand film · Diwali campaign"],
  "PO-1197": ["Ricoh", "Printer leases · 3 sites"], "PO-1198": ["Pinecrest", "Catering · November all-hands"], "PO-1206": ["AWS", "Credits · Q4 top-up"],
  "PO-1189": ["Featherlite", "Ergonomic chairs × 20"], "PO-1176": ["Sodexo", "Pantry supplies · September"], "PO-1185": ["Figma", "Enterprise · 40 seats"],
  "PO-1183": ["Giftbay", "Diwali hampers × 500"], "PO-1171": ["Blue Dart", "Shipments · September"],
};
const RECV: Record<string, [number, number]> = { "PO-1187": [12, 20], "PO-1199": [14, 16], "PO-1193": [20, 30] };
/** Share billed, and whether it is above what was received or ordered */
const BILLED: Record<string, [number, boolean]> = {
  "PO-1187": [1, true], "PO-1199": [0.77, false], "PO-1193": [0.67, false], "PO-1189": [1, false], "PO-1176": [0.73, false], "PO-1185": [1, false], "PO-1183": [1.04, true], "PO-1171": [1, false],
};
const EXPECT: Record<string, string> = {
  "PO-1187": "Rest due 18 Oct", "PO-1199": "Rest due 20 Oct", "PO-1193": "Rest due 24 Oct", "PO-1196": "Live by 20 Oct", "PO-1201": "Monthly from 1 Nov", "PO-1204": "Due 18 Oct",
  "PO-1200": "Final cut 28 Oct", "PO-1197": "Install 16 Oct", "PO-1198": "Event 7 Nov", "PO-1206": "Credits by 17 Oct",
};

const po: ModuleDef = {
  col: "po",
  title: "Purchase orders",
  page: "Purchase orders",
  newLabel: "New purchase order",
  search: "Search POs",
  cols: [
    { k: "id", label: "PO #", w: 100 },
    { k: "vendor", label: "Vendor", w: 190, filter: true },
    { k: "item", label: "Item", w: 0 },
    { k: "req", label: "Request", w: 150 },
    { k: "amt", label: "Amount (INR)", w: 130, align: "r" },
    { k: "recv", label: "Received", w: 150 },
    { k: "billed", label: "Billed", w: 150 },
    { k: "status", label: "Status", w: 140, filter: true },
    { k: "date", label: "Expected / sent", w: 170 },
  ],
  row: (c) => {
    const [vendor, item] = PO_V[c.id] || [c.title.split(" — ")[1] || "", c.title.split(" — ")[0]];
    const shared = sharedPr(c);
    const st = c.status;
    const r = RECV[c.id];
    const recv = st === "Pending" || st === "Rejected" ? NA : st === "Sent" ? P(0, "Not yet", "neutral") : st === "Partly received" && r ? P(r[0] / r[1], `${r[0]} / ${r[1]}`, "violet") : P(1, "All in", "green");
    const b = BILLED[c.id];
    const billed = b ? P(Math.min(b[0], 1), `${Math.round(b[0] * 100)}%`, b[1] ? "red" : b[0] >= 1 && st === "Received" ? "green" : "blue") : NA;
    return {
      card: c,
      cells: { id: ID(c), vendor: T(vendor), item: T(item), req: T(shared ? shared.label.replace(/ POs$/, "") : c.pr || "—", "link"), amt: M(c.amt), recv, billed, status: { t: "status" }, date: T(EXPECT[c.id] || c.date) },
      sort: { date: daysFrom(EXPECT[c.id] || c.date), recv: recv.t === "progress" ? recv.v : -1, billed: b ? b[0] : -1 },
    };
  },
  stats: (rows) => [
    { label: "Open commitments", value: inrShort(sum(rows, (r) => r.card.status === "Sent" || r.card.status === "Partly received")) },
    { label: "Billing exceptions", value: String(rows.filter((r) => BILLED[r.card.id]?.[1]).length) },
  ],
  total: (rows) => [inrShort(sum(rows)), plural(rows.length, "PO")],
};

/* ---------- GRNs ---------- */
const GRN: Record<string, [string, number, number, string]> = {
  "GRN-4412": ["Laptops 16 GB", 12, 20, "laptops"], "GRN-4420": ["CCTV cameras", 14, 16, "cameras"], "GRN-4423": ["Brand film · first cut", 1, 2, "milestones"],
  "GRN-4417": ["UPS batteries · wrong spec", 0, 12, "batteries"], "GRN-4422": ["Figma Enterprise seats", 40, 40, "seats"], "GRN-4424": ["Office chairs · second lot", 10, 10, "chairs"],
  "GRN-4415": ["Ergonomic chairs", 20, 20, "chairs"], "GRN-4409": ["Pantry supplies · September", 1, 1, ""], "GRN-4410": ["Diwali hampers", 500, 500, "hampers"],
  "GRN-4405": ["Shipments · September", 1, 1, ""], "GRN-4418": ["Office chairs · first lot", 20, 20, "chairs"], "GRN-4401": ["MacBook Air × 10", 10, 10, "laptops"],
  "GRN-4403": ["Zoom Rooms · 6 rooms", 1, 1, ""], "GRN-4404": ["Access control", 1, 1, ""], "GRN-4406": ["Network switches × 8", 8, 8, "switches"],
  "GRN-4407": ["Ergonomic keyboards × 40", 40, 40, "keyboards"], "GRN-4408": ["Water dispensers", 1, 1, ""], "GRN-4411": ["Boardroom projector", 1, 1, "projector"],
};
const VENDOR_OF_PO: Record<string, string> = {
  "PO-1185": "Figma", "PO-1193": "Featherlite", "PO-1187": "Ingram Micro", "PO-1199": "Hikvision", "PO-1200": "Lighthouse Films", "PO-1189": "Featherlite",
  "PO-1176": "Sodexo", "PO-1183": "Giftbay", "PO-1171": "Blue Dart", "PO-1160": "Apple", "PO-1162": "Zoom", "PO-1164": "Honeywell", "PO-1166": "Cisco",
  "PO-1168": "Logitech", "PO-1170": "Kent RO", "PO-1172": "Epson", "PO-1180": "APC",
};
const short = (r: Row) => {
  const g = GRN[r.card.id];
  return g && g[1] < g[2] && g[3] !== "milestones" && r.card.status !== "Rejected" ? g[2] - g[1] : 0;
};

const grn: ModuleDef = {
  col: "grn",
  title: "GRNs",
  page: "GRNs",
  newLabel: "New GRN",
  search: "Search receipts",
  cols: [
    { k: "id", label: "GRN #", w: 110 },
    { k: "title", label: "Delivery", w: 0 },
    { k: "po", label: "PO", w: 100 },
    { k: "vendor", label: "Vendor", w: 160, filter: true },
    { k: "qty", label: "Received", w: 190 },
    { k: "amt", label: "Value (INR)", w: 130, align: "r" },
    { k: "status", label: "Status", w: 120, filter: true },
    { k: "who", label: "Received by", w: 170, filter: true },
    { k: "date", label: "Date", w: 90 },
  ],
  row: (c) => {
    const [title, a, b, unit] = GRN[c.id] || [c.title, 1, 1, ""];
    const tone: Tone = c.status === "Rejected" ? "red" : a < b ? "violet" : "green";
    return {
      card: c,
      cells: {
        id: ID(c),
        title: T(title),
        po: T(c.ref || "—", "link"),
        vendor: T(VENDOR_OF_PO[c.ref || ""] || ""),
        qty: P(b ? a / b : 1, unit ? `${a} / ${b} ${unit}` : "All in", tone),
        amt: M(c.amt),
        status: { t: "status" },
        who: { t: "person", v: c.owner },
        date: T(day(c.date)),
      },
      sort: { date: daysFrom(c.date), qty: b ? a / b : 1 },
    };
  },
  stats: (rows) => [
    { label: "To check", value: inrShort(sum(rows, (r) => r.card.status === "Submitted")) },
    { label: "Items short", value: String(rows.reduce((t, r) => t + short(r), 0)) },
  ],
  total: (rows) => [inrShort(sum(rows)), plural(rows.length, "receipt")],
};

/* ---------- Bills ---------- */
const BILL_MATCH: Record<string, Match> = { "BILL-890": "qty", "BILL-879": "price", "BILL-896": "grn", "BILL-897": "grn", "BILL-887": "nopo", "BILL-895": "nopo" };
const unpaid = (r: Row) => r.card.status !== "Paid";

const bill: ModuleDef = {
  col: "bill",
  title: "Bills",
  page: "Bills",
  newLabel: "New bill",
  search: "Search bills",
  cols: [
    { k: "id", label: "Bill #", w: 100 },
    { k: "vendor", label: "Vendor", w: 190, filter: true },
    { k: "title", label: "Description", w: 0 },
    { k: "po", label: "PO", w: 100 },
    { k: "match", label: "3-way match", w: 140, filter: true },
    { k: "due", label: "Due", w: 150 },
    { k: "amt", label: "Amount (INR)", w: 130, align: "r" },
    { k: "bal", label: "Balance due (INR)", w: 150, align: "r" },
    { k: "status", label: "Status", w: 120, filter: true },
  ],
  row: (c) => {
    const [vendor, ...rest] = c.title.split(" — ");
    const desc = rest.join(" — ");
    const d = daysFrom(c.date);
    const po = c.ref?.match(/PO-\d+/)?.[0];
    const due =
      c.status === "Paid" ? T("Paid " + day(c.date), "muted") : c.status === "Approved" ? T("Pays " + day(c.date), undefined, { sub: `in ${plural(d, "day")}` }) : T(day(c.date), d <= 7 ? "amber" : undefined, { sub: `in ${plural(d, "day")}` });
    return {
      card: c,
      cells: {
        id: ID(c),
        vendor: T(vendor),
        title: T(desc ? desc[0].toUpperCase() + desc.slice(1) : ""),
        po: po ? T(po, "link") : T("No PO", "muted"),
        match: { t: "match", v: BILL_MATCH[c.id] || "ok" },
        due,
        amt: M(c.amt),
        bal: c.status === "Paid" ? M(0, true) : M(c.amt),
        status: { t: "status" },
      },
      sort: { due: d, bal: c.status === "Paid" ? 0 : c.amt },
    };
  },
  stats: (rows) => [
    { label: "Due in 7 days", value: inrShort(sum(rows, (r) => unpaid(r) && daysFrom(r.card.date) <= 7)) },
    { label: "Mismatched", value: inrShort(sum(rows, (r) => r.card.status === "Mismatch")) },
  ],
  total: (rows) => [inrShort(sum(rows, unpaid)), `outstanding · ${plural(rows.filter(unpaid).length, "bill")}`],
};

export const MODULES: Record<ColId, ModuleDef> = { pr, rfq, po, grn, bill };
export const PAGE_TO_COL: Record<string, ColId> = Object.fromEntries(Object.values(MODULES).map((m) => [m.page, m.col]));

/** The value a header checklist filters on */
export const filterValue = (r: Row, k: string): string => {
  const c = r.cells[k];
  if (!c) return "";
  if (c.t === "status") return r.card.status;
  if (c.t === "text" || c.t === "person") return c.v;
  if (c.t === "match") return MATCH[c.v].label;
  return "";
};

/** The value a column sorts on */
export const sortValue = (r: Row, k: string): number | string => {
  if (r.sort && k in r.sort) return r.sort[k];
  const c = r.cells[k];
  if (!c) return "";
  switch (c.t) {
    case "money":
      return c.v ?? -1;
    case "pct":
      return c.v ?? 999;
    case "progress":
      return c.v;
    case "dots":
      return c.of ? c.v / c.of : 0;
    case "status":
      return COLUMNS.find((x) => x.id === r.card.col)!.order.indexOf(r.card.status);
    case "match":
      return Object.keys(MATCH).indexOf(c.v);
    default:
      return c.v.toLowerCase();
  }
};
