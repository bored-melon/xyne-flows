import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useDialKit } from "dialkit";
import { Icon } from "@/lib/icons";
import { SearchBar } from "../v2/ui";
import { use2 } from "../v2/store";
import { CARDS, COLUMNS, avatarColors, fkey, grp, initials, inr, inrShort, sharedPr, toneOf, type Card, type Column, type Tone } from "./data";
import { HeaderFilters, useMenu } from "./controls";
import { docName, morph, vt } from "./morph";
import { ALL_SCOPE, ap, scoped, useAp } from "./state";
import { Ph } from "./icons";
import "./ap.css";

/* Payables › Procurement: a summary anchor over a kanban of the five procurement documents.
   Filters are a set of column:status keys. The anchor's tags and each board's colour strip
   add and remove keys from the same set, so any number of filters can be on at once. */

type Anchor = "sentence" | "cards";
type TagPos = "top-right" | "before-id" | "after-id" | "bottom-left";
type Sel = Set<string>;

/* Design dials, in the DialKit panel (bottom-left button) under "Procurement". */
const DIALS = {
  Summary: {
    layout: {
      type: "select" as const,
      options: [
        { value: "sentence", label: "Sentence" },
        { value: "cards", label: "Cards" },
      ],
      default: "sentence",
    },
  },
  "Kanban cards": {
    style: {
      type: "select" as const,
      options: [
        { value: "classic", label: "Classic" },
        { value: "compact", label: "Compact" },
      ],
      default: "classic",
    },
    statusTag: {
      type: "select" as const,
      options: [
        { value: "top-right", label: "Top right" },
        { value: "before-id", label: "Before ID" },
        { value: "after-id", label: "After ID" },
        { value: "bottom-left", label: "Bottom left" },
      ],
      default: "top-right",
    },
    amount: true,
    date: true,
    profilePhoto: true,
    linkedRequest: true,
  },
};

interface CardOpts {
  /** Classic: status chip, ID above the title. Compact (Figma 2945:36423): ID and title on one line, status as a dot row. */
  style: "classic" | "compact";
  /** Classic only; compact cards list the status with the other details */
  tagPos: TagPos;
  amount: boolean;
  date: boolean;
  photo: boolean;
  link: boolean;
}

interface Tag {
  id: string;
  /** Shown in the active-filter bar */
  name: string;
  keys: string[];
  tone: Tone;
}

/* The header filters (period, entity, department) pick which documents are in play (see state.ts).
   Every count on the page is taken from that set, so the sentence, tiles, strips and boards always agree. */
function stats(cards: Card[]) {
  const byKey = cards.reduce<Record<string, Card[]>>((m, c) => ((m[fkey(c.col, c.status)] ||= []).push(c), m), {});
  return {
    cards,
    n: (keys: string[]) => keys.reduce((s, k) => s + (byKey[k]?.length || 0), 0),
    v: (keys: string[]) => keys.reduce((s, k) => s + (byKey[k] || []).reduce((t, c) => t + c.amt, 0), 0),
  };
}
type Stats = ReturnType<typeof stats>;
const StatsCtx = createContext<Stats>(stats(CARDS));
const useStats = () => useContext(StatsCtx);
const colKeys = (col: Column) => col.statuses.map((s) => fkey(col.id, s.name));
const LABEL = (key: string) => {
  const [col, st] = key.split(":");
  return `${COLUMNS.find((c) => c.id === col)!.title} · ${st}`;
};

/* The anchor's tags. Each is a group of keys across the boards, and every key in a group
   shares one colour, so a tag always looks like the cards it brings up. */
const T = {
  approvers: ["pr:Pending", "po:Pending", "bill:Pending"],
  compare: ["rfq:Received"],
  mismatch: ["bill:Mismatch"],
  paid: ["bill:Paid"],
  team: ["rfq:Received", "grn:Submitted", "bill:Approved"],
  vendors: ["rfq:Awaiting", "po:Sent"],
  fix: ["pr:Rejected", "po:Rejected", "grn:Rejected", "bill:Mismatch"],
};

/** A tag takes its colour from the statuses it filters. */
const tag = (id: keyof typeof T, name: string): Tag => {
  const tones = new Set(T[id].map((k) => toneOf(k.split(":")[0] as Card["col"], k.split(":")[1])));
  if (tones.size > 1) console.warn(`[procurement] tag "${name}" mixes colours: ${[...tones].join(", ")}`);
  return { id, name, keys: T[id], tone: [...tones][0] };
};

const SENTENCE_TAGS: Tag[] = [tag("approvers", "Waiting on approvers"), tag("compare", "Quotes to compare"), tag("mismatch", "Mismatched bills"), tag("paid", "Paid bills")];

const CARD_TAGS: Tag[] = [tag("team", "Needs your team"), tag("approvers", "With approvers"), tag("vendors", "With vendors"), tag("fix", "Needs a fix")];

/** The sidebar page each board's expand button opens */
const PAGE: Record<Column["id"], string> = { pr: "Purchase requests", rfq: "Quotations", po: "Purchase orders", grn: "GRNs", bill: "Bills" };
const NEW: Record<Column["id"], string> = { pr: "New purchase request", rfq: "New RFQ", po: "New purchase order", grn: "New GRN", bill: "New bill" };

const isOn = (sel: Sel, keys: string[]) => keys.length > 0 && keys.every((k) => sel.has(k));

export function Procurement() {
  const dial = useDialKit("Procurement", DIALS, { id: "procurement", persist: { key: "xyne:procurement-dials" } });
  const anchor: Anchor = dial.Summary.layout === "cards" ? "cards" : "sentence";
  const k = dial["Kanban cards"];
  const card: CardOpts = { style: k.style === "compact" ? "compact" : "classic", tagPos: (k.statusTag as TagPos) || "top-right", amount: k.amount, date: k.date, photo: k.profilePhoto, link: k.linkedRequest };
  // Filters live in a small shared store, so they carry over to the module pages and back
  const { sel, scope } = useAp();
  const st = useMemo(() => stats(scoped(scope)), [scope]);
  const scopeOn = scope !== ALL_SCOPE;
  const toggle = ap.toggle;
  const remove = ap.remove;
  const clear = ap.clear;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && ap.clear();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  const tags = anchor === "sentence" ? SENTENCE_TAGS : CARD_TAGS;
  const shown = sel.size ? st.cards.filter((c) => sel.has(fkey(c.col, c.status))).length : st.cards.length;

  return (
    <div className="n2-page ap-page">
      <SearchBar />
      <div className="ap-main">
        <div className="ap-head">
          <h1 className="n2-h1">Procurement</h1>
        </div>

        <StatsCtx.Provider value={st}>
          <section className="ap-summary" aria-label="Summary">
            <HeaderFilters />
            {anchor === "sentence" ? <SentenceAnchor sel={sel} toggle={toggle} /> : <CardsAnchor sel={sel} toggle={toggle} />}
          </section>

          <FilterBar sel={sel} tags={tags} shown={shown} scopeOn={scopeOn} remove={remove} clear={clear} />

          <div className="ap-board-wrap">
            <div className="ap-board">
              {COLUMNS.map((col) => (
                <Board key={col.id} col={col} sel={sel} toggle={toggle} card={card} />
              ))}
            </div>
          </div>
        </StatsCtx.Provider>
      </div>
    </div>
  );
}

function Pill({ tag, label, sel, toggle }: { tag: Tag; label: string; sel: Sel; toggle: (k: string[]) => void }) {
  const on = isOn(sel, tag.keys);
  return (
    <button type="button" className={`ap-pill ${tag.tone}` + (on ? " on" : "") + (sel.size && !on ? " dim" : "")} aria-pressed={on} onClick={() => toggle(tag.keys)} title={on ? `Remove “${tag.name}”` : `Show ${tag.name.toLowerCase()}`}>
      {label}
      {on && <Icon n="x" s={28} w={1.75} />}
    </button>
  );
}

function SentenceAnchor({ sel, toggle }: { sel: Sel; toggle: (k: string[]) => void }) {
  const { cards, n, v } = useStats();
  const [appr, cmp, mis, paid] = SENTENCE_TAGS;
  const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  const requests = cards.filter((c) => c.col === "pr");
  const pill = (t: Tag, one: string, many: string) => <Pill tag={t} label={plural(n(t.keys), one, many)} sel={sel} toggle={toggle} />;
  const one = (t: Tag) => n(t.keys) === 1;

  // Clauses with nothing in them drop out, so a narrow filter never reads "0 bills don't match".
  const clauses = [
    n(appr.keys) > 0 && (
      <>
        {pill(appr, "document", "documents")} {one(appr) ? "is" : "are"} waiting on approvers
      </>
    ),
    n(cmp.keys) > 0 && (
      <>
        {pill(cmp, "quote", "quotes")} {one(cmp) ? "is" : "are"} ready to compare
      </>
    ),
    n(mis.keys) > 0 && (
      <>
        {pill(mis, "bill", "bills")} {one(mis) ? "doesn’t" : "don’t"} match {one(mis) ? "its order" : "their orders"}
      </>
    ),
  ].filter(Boolean);
  const joined = clauses.map((c, i) => (
    <span key={i}>
      {i > 0 && (i === clauses.length - 1 ? (clauses.length > 2 ? ", and " : " and ") : ", ")}
      {c}
    </span>
  ));

  return (
    <div className="ap-sentence">
      <p className="ap-sentence-text">
        {requests.length ? (
          <>
            Your team raised <span className="ap-strong">{plural(requests.length, "request", "requests")}</span> worth {inrShort(requests.reduce((t, c) => t + c.amt, 0))}.
          </>
        ) : (
          <>Your team hasn’t raised any requests.</>
        )}{" "}
        {clauses.length ? <>{joined}.</> : <>Nothing is waiting on approvers, quotes or bills.</>}{" "}
        {n(paid.keys) > 0 && (
          <>
            {pill(paid, "bill", "bills")} worth {inrShort(v(paid.keys))} {one(paid) ? "has" : "have"} been paid.
          </>
        )}
      </p>
      {!sel.size && <p className="ap-hint">Click a highlighted number, or a colour strip on a board, to filter. You can pick as many as you like.</p>}
    </div>
  );
}

function CardsAnchor({ sel, toggle }: { sel: Sel; toggle: (k: string[]) => void }) {
  const { n, v } = useStats();
  const c = (k: string) => n([k]);
  const subs: Record<string, string> = {
    team: `${c("rfq:Received")} quotes to compare · ${c("grn:Submitted")} receipts to check · ${c("bill:Approved")} bills to pay`,
    approvers: `${inrShort(v(T.approvers))} · oldest waiting 3 days`,
    vendors: `${c("rfq:Awaiting")} RFQs out · ${c("po:Sent")} POs sent, not yet delivered`,
    fix: `${c("bill:Mismatch")} bill mismatches · ${c("pr:Rejected") + c("po:Rejected") + c("grn:Rejected")} rejected documents`,
  };
  return (
    <div className="ap-tiles-row">
      <div className="ap-tiles">
        {CARD_TAGS.map((t) => {
          const on = isOn(sel, t.keys);
          return (
            <button key={t.id} type="button" className={`ap-tile ${t.tone}` + (on ? " on" : "") + (sel.size && !on ? " dim" : "")} aria-pressed={on} onClick={() => toggle(t.keys)}>
              <span className="ap-tile-h">
                <i className="dot" />
                <span className="grow">{t.name}</span>
                <Icon n={on ? "x" : "chevR"} s={13} w={on ? 2.4 : 1.75} />
              </span>
              <span className="ap-tile-b">
                <b>{n(t.keys)}</b>
                <small>{subs[t.id]}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** What's filtered, as chips. Whole anchor tags show by name; single statuses as "Board · Status". */
function FilterBar({ sel, tags, shown, scopeOn, remove, clear }: { sel: Sel; tags: Tag[]; shown: number; scopeOn: boolean; remove: (k: string[]) => void; clear: () => void }) {
  if (!sel.size && !scopeOn) return null;
  const covered = new Set<string>();
  const chips: { label: string; keys: string[]; tone: Tone }[] = [];
  for (const t of tags)
    if (isOn(sel, t.keys)) {
      chips.push({ label: t.name, keys: t.keys, tone: t.tone });
      t.keys.forEach((k) => covered.add(k));
    }
  for (const k of sel)
    if (!covered.has(k)) {
      const [col, st] = k.split(":");
      chips.push({ label: LABEL(k), keys: [k], tone: toneOf(col as Card["col"], st) });
    }
  return (
    <div className="ap-filters" role="status">
      <span className="muted">
        Showing <b>{shown}</b> of {CARDS.length} documents
      </span>
      {chips.map((c) => (
        <span key={c.label} className={`ap-fchip ${c.tone}`}>
          <i className="dot" />
          {c.label}
          <button type="button" aria-label={`Remove ${c.label}`} onClick={() => remove(c.keys)}>
            <Icon n="x" s={12} w={2.4} />
          </button>
        </span>
      ))}
      <button type="button" className="ap-clear" onClick={clear}>
        Clear all
      </button>
      <span className="faint small">Esc</span>
    </div>
  );
}

function Board({ col, sel, toggle, card }: { col: Column; sel: Sel; toggle: (k: string[]) => void; card: CardOpts }) {
  const { setUi } = use2();
  // While this board animates to or from its page, its parts carry the page's view-transition names
  const named = useAp().morph === col.id;
  const { cards, n, v } = useStats();
  const [hover, setHover] = useState<string | null>(null);
  const all = useMemo(() => cards.filter((c) => c.col === col.id), [cards, col.id]);
  const filtered = sel.size > 0;
  const visible = filtered ? all.filter((c) => sel.has(fkey(col.id, c.status))) : all;
  const ordered = [...visible].sort((a, b) => col.order.indexOf(a.status) - col.order.indexOf(b.status));
  const counts = col.statuses.map((s) => ({ ...s, key: fkey(col.id, s.name), n: n([fkey(col.id, s.name)]), v: v([fkey(col.id, s.name)]) })).filter((s) => s.n > 0);
  const total = all.length;
  const sum = visible.reduce((t, c) => t + c.amt, 0);
  const mine = colKeys(col).filter((k) => sel.has(k));

  // where each segment sits, for the hover tooltip
  let acc = 0;
  const segs = counts.map((s) => {
    const left = (acc / total) * 100;
    const w = (s.n / total) * 100;
    acc += s.n;
    return { ...s, left, w };
  });
  const tip = segs.find((s) => s.key === hover);

  return (
    <section className="ap-col" aria-label={col.title} style={vt(named, "ap-surface", "ap-fill")}>
      <div className="ap-col-head">
        <div className="ap-col-title">
          <h3 style={vt(named, "ap-title")}>{col.title}</h3>
          <span className="grow" />
          <div className="ap-col-tools">
            <button type="button" className="ap-ico" title={`Open ${PAGE[col.id]}`} aria-label={`Open ${PAGE[col.id]}`} onClick={() => morph(col.id, () => setUi({ page: PAGE[col.id] }))}>
              <Ph n="expand" />
            </button>
            <BoardFilter col={col} counts={counts} sel={sel} toggle={toggle} active={mine.length > 0} />
            <BoardMore col={col} visible={ordered} onNew={() => setUi({ page: PAGE[col.id] })} />
          </div>
        </div>
        <div className="ap-col-sub">
          <span className={"cnt" + (filtered ? (visible.length ? " hit" : " none") : "")}>{filtered ? `${visible.length} of ${total}` : `${total} ${total === 1 ? col.noun.replace(/s$/, "") : col.noun}`}</span>
          <span className="val">{inrShort(sum)}</span>
        </div>
        <div className="ap-strip" onMouseLeave={() => setHover(null)} style={vt(named, "ap-strip", "ap-fill")}>
          {segs.map((s) => {
            const on = sel.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                className={`ap-seg-bar ${s.tone}` + (on ? " on" : "") + (filtered && !on ? " dim" : "")}
                style={{ flexGrow: s.n } as CSSProperties}
                aria-pressed={on}
                aria-label={`${s.name}: ${s.n} ${col.noun}, ${inrShort(s.v)}`}
                onMouseEnter={() => setHover(s.key)}
                onFocus={() => setHover(s.key)}
                onBlur={() => setHover(null)}
                onClick={() => toggle([s.key])}
              />
            );
          })}
          {!segs.length && <span className="ap-seg-empty" />}
          {tip && (
            <span className="ap-tip" style={{ left: `${tip.left + tip.w / 2}%` }} role="tooltip">
              <b>
                {tip.n} {tip.name.toLowerCase()}
              </b>
              <span>worth {inrShort(tip.v)}</span>
              <small>{sel.has(tip.key) ? "Click to remove" : "Click to filter"}</small>
            </span>
          )}
        </div>
        <div className="ap-legend" style={vt(named, "ap-tabs", "ap-nat")}>
          {counts.map((s) => {
            const on = sel.has(s.key);
            return (
              <button key={s.key} type="button" className={`ap-leg ${s.tone}` + (on ? " on" : "") + (filtered && !on ? " dim" : "")} aria-pressed={on} onClick={() => toggle([s.key])} onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}>
                <i />
                {s.name} {s.n}
              </button>
            );
          })}
        </div>
      </div>
      <div className="ap-cards">
        {ordered.map((c) => (
          <CardView key={c.id} c={c} o={card} named={named} />
        ))}
        {!ordered.length && <div className="ap-empty">No {col.noun} match these filters</div>}
      </div>
    </section>
  );
}

type Count = { name: string; tone: Tone; key: string; n: number };

/** The board's own statuses as a checklist. Same keys as the strip, so both stay in sync. */
function BoardFilter({ col, counts, sel, toggle, active }: { col: Column; counts: Count[]; sel: Sel; toggle: (k: string[]) => void; active: boolean }) {
  const m = useMenu();
  const on = counts.filter((s) => sel.has(s.key)).map((s) => s.key);
  return (
    <div className="ap-dd" ref={m.ref}>
      <button type="button" className={"ap-ico" + (active ? " active" : "")} title={`Filter ${col.title}`} aria-label={`Filter ${col.title}`} aria-expanded={m.open} onClick={() => m.setOpen(!m.open)}>
        <Ph n="funnel" />
        {active && <i className="ap-ico-dot" />}
      </button>
      {m.open && (
        <div className="ap-menu right" role="menu" aria-label={`Filter ${col.title}`}>
          <div className="ap-menu-h">Status</div>
          {counts.map((s) => (
            <button key={s.key} type="button" role="menuitemcheckbox" aria-checked={sel.has(s.key)} className={sel.has(s.key) ? "on" : ""} onClick={() => toggle([s.key])}>
              <i className={`ap-menu-dot ${s.tone}`} />
              <span className="grow">{s.name}</span>
              <span className="ap-menu-n">{s.n}</span>
              <span className="ap-menu-tick">{sel.has(s.key) && <Icon n="check" s={14} w={2} />}</span>
            </button>
          ))}
          {!counts.length && <div className="ap-menu-empty">Nothing here for these filters</div>}
          {on.length > 0 && (
            <>
              <div className="ap-menu-sep" />
              <button type="button" onClick={() => toggle(on)}>
                <span className="grow">Clear board filters</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BoardMore({ col, visible, onNew }: { col: Column; visible: Card[]; onNew: () => void }) {
  const m = useMenu();
  const exportCsv = () => {
    const q = (x: string | number) => `"${String(x).replace(/"/g, '""')}"`;
    const rows = [["ID", "Status", "Title", "Amount (INR)", "Date", "Owner", "Entity", "Department"], ...visible.map((c) => [c.id, c.status, c.title, c.amt, c.date, c.owner, c.entity, c.dept])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${col.title.toLowerCase().replace(/\s+/g, "-")}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    m.setOpen(false);
  };
  return (
    <div className="ap-dd" ref={m.ref}>
      <button type="button" className="ap-ico" title="More options" aria-label={`More options for ${col.title}`} aria-expanded={m.open} onClick={() => m.setOpen(!m.open)}>
        <Ph n="more" />
      </button>
      {m.open && (
        <div className="ap-menu right" role="menu" aria-label={`${col.title} options`}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              m.setOpen(false);
              onNew();
            }}
          >
            <Icon n="plus" s={14} />
            <span className="grow">{NEW[col.id]}</span>
          </button>
          <button type="button" role="menuitem" onClick={exportCsv} disabled={!visible.length}>
            <Icon n="download" s={14} />
            <span className="grow">Export {visible.length} as CSV</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Requests and open RFQs are estimates; everything else is the exact figure. */
function amountText(c: Card) {
  const est = c.col === "pr" || (c.col === "rfq" && c.status === "Awaiting");
  const base = c.disp || (est || c.amt >= 1e7 ? inrShort(c.amt) : inr(c.amt));
  return est ? `${base} est.` : base;
}

/** ~₹32.0L for estimates, ₹3,82,320 for exact figures */
function amountCompact(c: Card) {
  const est = c.col === "pr" || (c.col === "rfq" && c.status === "Awaiting");
  const short = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${grp(n)}`);
  const base = c.disp || (est || c.amt >= 1e7 ? short(c.amt) : `₹${grp(c.amt)}`);
  return est ? `~${base}` : base;
}

/** Compact card, Figma 2945:36423 */
function CompactCard({ c, o, named }: { c: Card; o: CardOpts; named?: boolean }) {
  const { setUi } = use2();
  const shared = o.link ? sharedPr(c) : undefined;
  return (
    <article className={"ap-card compact" + (o.photo ? " has-av" : "")} tabIndex={0} style={vt(!!named, docName(c.id), "ap-doc")}>
      <h4>
        {c.id} : {c.title}
      </h4>
      <div className="ap-meta">
        {o.amount && (
          <span>
            <Icon n="banknote" s={12} w={2} />
            <span className="t">{amountCompact(c)}</span>
          </span>
        )}
        {o.date && (
          <span>
            <Icon n="cal" s={12} w={2} />
            <span className="t">{c.date}</span>
          </span>
        )}
        {shared && (
          <button
            type="button"
            className="lnk"
            title={`Open ${shared.pr}`}
            onClick={(e) => {
              e.stopPropagation();
              setUi({ page: PAGE.pr });
            }}
          >
            <Icon n="link" s={12} w={2} />
            <span className="t">{shared.label}</span>
          </button>
        )}
        <span className="ap-cstat">
          <i className={`ap-cdot ${toneOf(c.col, c.status)}`} />
          <span className="t">{c.status}</span>
        </span>
      </div>
      {o.photo && (
        <span className="ap-av" style={avatarColors(c.owner)} title={c.owner}>
          {initials(c.owner)}
        </span>
      )}
    </article>
  );
}

function CardView({ c, o, named }: { c: Card; o: CardOpts; named?: boolean }) {
  if (o.style === "compact") return <CompactCard c={c} o={o} named={named} />;
  return <ClassicCard c={c} o={o} named={named} />;
}

function ClassicCard({ c, o, named }: { c: Card; o: CardOpts; named?: boolean }) {
  const { setUi } = use2();
  const tone = toneOf(c.col, c.status);
  const shared = o.link ? sharedPr(c) : undefined;
  const status = <span className={`ap-status ${tone}`}>{c.status}</span>;
  const hasMeta = o.amount || o.date || !!shared;
  const avatar = (
    <span className="ap-av" style={avatarColors(c.owner)} title={c.owner}>
      {initials(c.owner)}
    </span>
  );
  return (
    <article className={`ap-card tag-${o.tagPos}` + (o.photo && hasMeta ? " has-av" : "")} tabIndex={0} style={vt(!!named, docName(c.id), "ap-doc")}>
      {o.tagPos === "top-right" && status}
      <div className="ap-card-head">
        <span className="ap-card-idrow">
          {o.tagPos === "before-id" && status}
          <span className="id">{c.id}</span>
          {o.tagPos === "after-id" && status}
        </span>
        <h4>{c.title}</h4>
      </div>
      {hasMeta && (
        <div className="ap-meta">
          {o.amount && (
            <span>
              <Icon n="banknote" s={12} w={2} />
              <span className="t">{amountText(c)}</span>
            </span>
          )}
          {o.date && (
            <span>
              <Icon n="cal" s={12} w={2} />
              <span className="t">{c.date}</span>
            </span>
          )}
          {shared && (
            <button
              type="button"
              className="lnk"
              title={`Open ${shared.pr}`}
              onClick={(e) => {
                e.stopPropagation();
                setUi({ page: PAGE.pr });
              }}
            >
              <Icon n="link" s={12} w={2} />
              <span className="t">{shared.label}</span>
            </button>
          )}
        </div>
      )}
      {/* With details shown, the photo sits beside them; with none, it drops into the footer row */}
      {o.photo && hasMeta && avatar}
      {(o.tagPos === "bottom-left" || (o.photo && !hasMeta)) && (
        <div className="ap-card-foot">
          {o.tagPos === "bottom-left" && status}
          <span className="grow" />
          {o.photo && !hasMeta && avatar}
        </div>
      )}
    </article>
  );
}
