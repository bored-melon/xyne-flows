import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/lib/icons";
import { SearchBar } from "../v2/ui";
import { use2 } from "../v2/store";
import { CARDS, COLUMNS, avatarColors, fkey, initials, inr, inrShort, sharedPr, toneOf, type Card, type Column, type Tone } from "./data";
import "./ap.css";

/* Payables › Procurement: a summary anchor over a kanban of the five procurement documents.
   Filters are a set of column:status keys. The anchor's tags and each board's colour strip
   add and remove keys from the same set, so any number of filters can be on at once. */

type Anchor = "sentence" | "cards";
type Sel = Set<string>;

interface Tag {
  id: string;
  /** Shown in the active-filter bar */
  name: string;
  keys: string[];
  tone: Tone;
}

const ANCHOR_KEY = "xyne.ap.anchor";
const readAnchor = (): Anchor => {
  try {
    return localStorage.getItem(ANCHOR_KEY) === "cards" ? "cards" : "sentence";
  } catch {
    return "sentence";
  }
};

const BY_KEY = CARDS.reduce<Record<string, Card[]>>((m, c) => ((m[fkey(c.col, c.status)] ||= []).push(c), m), {});
const n = (keys: string[]) => keys.reduce((s, k) => s + (BY_KEY[k]?.length || 0), 0);
const v = (keys: string[]) => keys.reduce((s, k) => s + (BY_KEY[k] || []).reduce((t, c) => t + c.amt, 0), 0);
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

/** The sidebar page each board opens */
const PAGE: Record<Column["id"], string> = { pr: "Purchase requests", rfq: "Quotations", po: "Purchase orders", grn: "GRNs", bill: "Bills" };

const isOn = (sel: Sel, keys: string[]) => keys.length > 0 && keys.every((k) => sel.has(k));

export function Procurement() {
  const [anchor, setAnchorState] = useState<Anchor>(readAnchor);
  const [sel, setSel] = useState<Sel>(() => new Set());
  const setAnchor = (a: Anchor) => {
    setAnchorState(a);
    try {
      localStorage.setItem(ANCHOR_KEY, a);
    } catch {
      /* private window */
    }
  };

  /** Turn a group of keys on, or off if they are all on already. */
  const toggle = (keys: string[]) =>
    setSel((s) => {
      const next = new Set(s);
      const all = keys.every((k) => s.has(k));
      keys.forEach((k) => (all ? next.delete(k) : next.add(k)));
      return next;
    });
  const remove = (keys: string[]) =>
    setSel((s) => {
      const next = new Set(s);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  const clear = () => setSel(new Set());

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSel((s) => (s.size ? new Set() : s));
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  const tags = anchor === "sentence" ? SENTENCE_TAGS : CARD_TAGS;
  const shown = sel.size ? CARDS.filter((c) => sel.has(fkey(c.col, c.status))).length : CARDS.length;

  return (
    <div className="n2-page ap-page">
      <SearchBar />
      <div className="ap-main">
        <div className="ap-head">
          <h1 className="n2-h1">Procurement</h1>
          <span className="grow" />
          <span className="ap-seg-label">Summary</span>
          <div className="ap-seg" role="radiogroup" aria-label="Summary style">
            {(["sentence", "cards"] as Anchor[]).map((a) => (
              <button key={a} type="button" role="radio" aria-checked={anchor === a} className={anchor === a ? "on" : ""} onClick={() => setAnchor(a)}>
                {a === "sentence" ? "Sentence" : "Cards"}
              </button>
            ))}
          </div>
        </div>

        {anchor === "sentence" ? <SentenceAnchor sel={sel} toggle={toggle} /> : <CardsAnchor sel={sel} toggle={toggle} />}

        <FilterBar sel={sel} tags={tags} shown={shown} remove={remove} clear={clear} />

        <div className="ap-board-wrap">
          <div className="ap-board">
            {COLUMNS.map((col) => (
              <Board key={col.id} col={col} sel={sel} toggle={toggle} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Quarter() {
  return (
    <button type="button" className="ap-quarter">
      This quarter
      <Icon n="chevD" s={16} />
    </button>
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
  const [appr, cmp, mis, paid] = SENTENCE_TAGS;
  const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  const requests = CARDS.filter((c) => c.col === "pr");
  const pill = (t: Tag, one: string, many: string) => <Pill tag={t} label={plural(n(t.keys), one, many)} sel={sel} toggle={toggle} />;
  return (
    <section className="ap-sentence" aria-label="Summary">
      <Quarter />
      <div className="grow">
        <p className="ap-sentence-text">
          Your team raised <span className="ap-strong">{plural(requests.length, "request", "requests")}</span> worth {inrShort(requests.reduce((t, c) => t + c.amt, 0))}.{" "}
          {pill(appr, "document", "documents")} {n(appr.keys) === 1 ? "is" : "are"} waiting on approvers, {pill(cmp, "quote", "quotes")} {n(cmp.keys) === 1 ? "is" : "are"} ready to compare, and{" "}
          {pill(mis, "bill", "bills")} {n(mis.keys) === 1 ? "doesn’t" : "don’t"} match {n(mis.keys) === 1 ? "its order" : "their orders"}. {pill(paid, "bill", "bills")} worth {inrShort(v(paid.keys))}{" "}
          {n(paid.keys) === 1 ? "has" : "have"} been paid.
        </p>
        {!sel.size && <p className="ap-hint">Click a highlighted number, or a colour strip on a board, to filter. You can pick as many as you like.</p>}
      </div>
    </section>
  );
}

function CardsAnchor({ sel, toggle }: { sel: Sel; toggle: (k: string[]) => void }) {
  const c = (k: string) => n([k]);
  const subs: Record<string, string> = {
    team: `${c("rfq:Received")} quotes to compare · ${c("grn:Submitted")} receipts to check · ${c("bill:Approved")} bills to pay`,
    approvers: `${inrShort(v(T.approvers))} · oldest waiting 3 days`,
    vendors: `${c("rfq:Awaiting")} RFQs out · ${c("po:Sent")} POs sent, not yet delivered`,
    fix: `${c("bill:Mismatch")} bill mismatches · ${c("pr:Rejected") + c("po:Rejected") + c("grn:Rejected")} rejected documents`,
  };
  return (
    <section className="ap-tiles-row" aria-label="Summary">
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
      <Quarter />
    </section>
  );
}

/** What's filtered, as chips. Whole anchor tags show by name; single statuses as "Board · Status". */
function FilterBar({ sel, tags, shown, remove, clear }: { sel: Sel; tags: Tag[]; shown: number; remove: (k: string[]) => void; clear: () => void }) {
  if (!sel.size) return null;
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

function Board({ col, sel, toggle }: { col: Column; sel: Sel; toggle: (k: string[]) => void }) {
  const { setUi } = use2();
  const [hover, setHover] = useState<string | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const all = useMemo(() => CARDS.filter((c) => c.col === col.id), [col.id]);
  const filtered = sel.size > 0;
  const visible = filtered ? all.filter((c) => sel.has(fkey(col.id, c.status))) : all;
  const ordered = [...visible].sort((a, b) => col.order.indexOf(a.status) - col.order.indexOf(b.status));
  const counts = col.statuses.map((s) => ({ ...s, key: fkey(col.id, s.name), n: n([fkey(col.id, s.name)]), v: v([fkey(col.id, s.name)]) })).filter((s) => s.n > 0);
  const total = all.length;
  const sum = visible.reduce((t, c) => t + c.amt, 0);

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
    <section className="ap-col" aria-label={col.title}>
      <div className="ap-col-head">
        <div className="ap-col-title">
          <button type="button" className="ap-col-open" title={`Open ${col.title}`} onClick={() => setUi({ page: PAGE[col.id] })}>
            <h3>{col.title}</h3>
            <Icon n="chevR" s={13} />
          </button>
          <span className="grow" />
          <button type="button" className="ap-ico" aria-label={`New ${col.title.replace(/s$/, "").toLowerCase()}`}>
            <Icon n="plus" s={14} />
          </button>
          <button type="button" className="ap-ico" aria-label="More">
            <Icon n="dotsV" s={14} />
          </button>
        </div>
        <div className="ap-col-sub">
          <span className={"cnt" + (filtered ? (visible.length ? " hit" : " none") : "")}>{filtered ? `${visible.length} of ${total}` : `${total} ${col.noun}`}</span>
          <span className="val">{inrShort(sum)}</span>
        </div>
        <div className="ap-strip" ref={strip} onMouseLeave={() => setHover(null)}>
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
        <div className="ap-legend">
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
          <CardView key={c.id} c={c} />
        ))}
        {!ordered.length && <div className="ap-empty">No {col.noun} match these filters</div>}
      </div>
    </section>
  );
}

/** Requests and open RFQs are estimates; everything else is the exact figure. */
function amountText(c: Card) {
  const est = c.col === "pr" || (c.col === "rfq" && c.status === "Awaiting");
  const base = c.disp || (est || c.amt >= 1e7 ? inrShort(c.amt) : inr(c.amt));
  return est ? `${base} est.` : base;
}

function CardView({ c }: { c: Card }) {
  const { setUi } = use2();
  const tone = toneOf(c.col, c.status);
  const shared = sharedPr(c);
  return (
    <article className="ap-card" tabIndex={0}>
      <span className={`ap-status ${tone}`}>{c.status}</span>
      <div className="ap-card-head">
        <span className="id">{c.id}</span>
        <h4>{c.title}</h4>
      </div>
      <div className="ap-meta">
        <span>
          <Icon n="banknote" s={12} w={2} />
          <span className="t">{amountText(c)}</span>
        </span>
        <span>
          <Icon n="cal" s={12} w={2} />
          <span className="t">{c.date}</span>
        </span>
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
      <span className="ap-av" style={avatarColors(c.owner)} title={c.owner}>
        {initials(c.owner)}
      </span>
    </article>
  );
}
