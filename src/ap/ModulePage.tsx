import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Icon } from "@/lib/icons";
import { SearchBar } from "../v2/ui";
import { use2 } from "../v2/store";
import { COLUMNS, avatarColors, fkey, grp, initials, inrShort, toneOf, type ColId } from "./data";
import { HeaderFilters, useMenu } from "./controls";
import { MATCH, MODULES, filterValue, sortValue, type Cell, type Col, type ModuleDef, type Row } from "./modules";
import { docName, morph, vt } from "./morph";
import { ap, scoped, useAp } from "./state";
import { Ph } from "./icons";
import "./ap.css";

/* A module page (direction B): total and two figures, the board's colour strip, status tabs,
   then a table. Status tabs and strip share the kanban's filters; column headers sort and filter. */

type Sort = { k: string; dir: 1 | -1 } | null;
type ColFilters = Record<string, Set<string>>;

export function ModulePage({ col }: { col: ColId }) {
  const def = MODULES[col];
  const column = COLUMNS.find((c) => c.id === col)!;
  const { sel, scope } = useAp();
  const { setUi } = use2();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>(null);
  const [cf, setCf] = useState<ColFilters>({});

  // Everything on this board within the period/entity/department, in attention order
  const all = useMemo(
    () =>
      scoped(scope)
        .filter((c) => c.col === col)
        .sort((a, b) => column.order.indexOf(a.status) - column.order.indexOf(b.status))
        .map(def.row),
    [scope, col, def, column],
  );
  const keys = column.statuses.map((s) => fkey(col, s.name));
  const onKeys = keys.filter((k) => sel.has(k));
  const byStatus = (r: Row) => !onKeys.length || sel.has(fkey(col, r.card.status));
  const needle = q.trim().toLowerCase();
  const bySearch = (r: Row) => !needle || Object.values(r.cells).some((c) => (c.t === "text" || c.t === "person") && c.v.toLowerCase().includes(needle)) || r.card.id.toLowerCase().includes(needle);
  const byCols = (r: Row, skip?: string) => Object.entries(cf).every(([k, set]) => k === skip || !set.size || set.has(filterValue(r, k)));

  const rows = useMemo(() => {
    const out = all.filter((r) => byStatus(r) && bySearch(r) && byCols(r));
    if (sort) out.sort((a, b) => (sortValue(a, sort.k) > sortValue(b, sort.k) ? 1 : sortValue(a, sort.k) < sortValue(b, sort.k) ? -1 : 0) * sort.dir);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, sel, needle, cf, sort]);

  const colActive = Object.values(cf).some((s) => s.size);
  const clearTable = () => {
    setCf({});
    setQ("");
    ap.remove(onKeys);
  };

  // Esc clears this table's filters (open menus close first)
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && clearTable();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  });

  const back = () => morph(col, () => setUi({ page: "Procurement" }));

  return (
    <div className="n2-page ap-page mp-page">
      <SearchBar />
      <div className="ap-main mp-main">
        <div className="mp-head">
          <div className="mp-titles">
            <button type="button" className="mp-crumb" onClick={back}>
              Procurement
              <Icon n="chevR" s={12} w={2} />
            </button>
            <h1 className="n2-h1" style={vt(true, "ap-title")}>
              {def.title}
            </h1>
          </div>
          <span className="grow" />
          <button type="button" className="mp-new">
            <Icon n="plus" s={16} w={2} />
            {def.newLabel}
          </button>
        </div>

        <Summary def={def} all={all} onKeys={onKeys} />

        <section className="mp-block" style={vt(true, "ap-surface", "ap-fill")} aria-label={`${def.title} table`}>
          <div className="mp-toolbar">
            <label className="mp-search">
              <Icon n="search" s={16} c="#A1A1A1" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={def.search} aria-label={def.search} />
              {q && (
                <button type="button" aria-label="Clear search" onClick={() => setQ("")}>
                  <Icon n="x" s={12} w={2.4} />
                </button>
              )}
            </label>
            <HeaderFilters small only={col} />
            <span className="grow" />
            <ExportButton def={def} rows={rows} />
          </div>

          {(colActive || needle || onKeys.length > 0) && (
            <div className="ap-filters mp-filters" role="status">
              <span className="muted">
                Showing <b>{rows.length}</b> of {all.length} {def.title.toLowerCase()}
              </span>
              {Object.entries(cf)
                .filter(([, s]) => s.size)
                .map(([k, s]) => {
                  const c = def.cols.find((x) => x.k === k)!;
                  return (
                    <span key={k} className="ap-fchip neutral">
                      {c.label}: {[...s].join(", ")}
                      <button type="button" aria-label={`Remove ${c.label} filter`} onClick={() => setCf((f) => ({ ...f, [k]: new Set() }))}>
                        <Icon n="x" s={12} w={2.4} />
                      </button>
                    </span>
                  );
                })}
              <button type="button" className="ap-clear" onClick={clearTable}>
                Clear all
              </button>
              <span className="faint small">Esc</span>
            </div>
          )}

          <div className="mp-table" role="table" aria-label={def.title} style={gridVars(def.cols)}>
            <div className="mp-tr mp-th" role="row">
              {def.cols.map((c) => (
                <HeadCell key={c.k} c={c} def={def} all={all} rows={rows} sort={sort} setSort={setSort} cf={cf} setCf={setCf} onKeys={onKeys} pre={(r) => byStatus(r) && bySearch(r) && byCols(r, c.k)} />
              ))}
            </div>
            {rows.map((r) => (
              <div key={r.card.id} className="mp-tr" role="row" style={vt(true, docName(r.card.id), "ap-doc")}>
                {def.cols.map((c) => (
                  <div key={c.k} role="cell" className={"mp-td" + (c.align === "r" ? " r" : "")}>
                    <CellView cell={r.cells[c.k]} row={r} />
                  </div>
                ))}
              </div>
            ))}
            {!rows.length && (
              <div className="mp-empty">
                No {def.title.toLowerCase()} match these filters.{" "}
                <button type="button" className="ap-clear" onClick={clearTable}>
                  Clear table filters
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Columns share the width in proportion to their design width (1616px wide in Figma), never narrower than ~70% of it. */
const minW = (c: Col) => (c.w ? Math.round(c.w * 0.72) : 180);
const gridVars = (cols: Col[]) =>
  ({
    ["--cols" as string]: cols.map((c) => `minmax(${minW(c)}px, ${c.w || 320}fr)`).join(" "),
    ["--minw" as string]: `${cols.reduce((t, c) => t + minW(c), 0)}px`,
  }) as CSSProperties;

/* ---------- summary: total, figures, strip and status tabs ---------- */
function Summary({ def, all, onKeys }: { def: ModuleDef; all: Row[]; onKeys: string[] }) {
  const column = COLUMNS.find((c) => c.id === def.col)!;
  const [total, label] = def.total(all);
  const counts = column.statuses.map((s) => {
    const rs = all.filter((r) => r.card.status === s.name);
    return { ...s, key: fkey(def.col, s.name), n: rs.length, v: rs.reduce((t, r) => t + r.card.amt, 0) };
  });
  const filtered = onKeys.length > 0;
  return (
    <section className="mp-summary" aria-label="Summary">
      <div className="mp-totals">
        <div className="mp-total">
          <b>{total}</b>
          <span>{label}</span>
        </div>
        <span className="grow" />
        {def.stats(all).map((s) => (
          <div key={s.label} className="mp-stat">
            <small>{s.label}</small>
            <b>{s.value}</b>
          </div>
        ))}
      </div>
      <div className="mp-strip" style={vt(true, "ap-strip", "ap-fill")}>
        {counts
          .filter((s) => s.n)
          .map((s) => {
            const on = onKeys.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                className={`ap-seg-bar ${s.tone}` + (on ? " on" : "") + (filtered && !on ? " dim" : "")}
                style={{ flexGrow: s.n }}
                title={`${s.n} ${s.name.toLowerCase()} · ${inrShort(s.v)}`}
                aria-pressed={on}
                aria-label={`${s.name}: ${s.n}, ${inrShort(s.v)}`}
                onClick={() => ap.toggle([s.key])}
              />
            );
          })}
        {!all.length && <span className="ap-seg-empty" />}
      </div>
      <div className="mp-tabs" role="tablist" aria-label="Status" style={vt(true, "ap-tabs", "ap-nat")}>
        <button type="button" role="tab" aria-selected={!filtered} className={"mp-tab" + (!filtered ? " on" : "")} onClick={() => ap.remove(onKeys)}>
          <span className="nm">All</span>
          <span className="n">{all.length}</span>
        </button>
        {counts.map((s) => {
          const on = onKeys.includes(s.key);
          return (
            <button key={s.key} type="button" role="tab" aria-selected={on} className={"mp-tab" + (on ? " on" : "") + (!s.n ? " empty" : "")} onClick={() => ap.toggle([s.key])}>
              <i className={`mp-dot ${s.tone}`} />
              <span className="nm">{s.name}</span>
              <span className="n">{s.n}</span>
              {s.n > 0 && <span className="v">{inrShort(s.v)}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- header cell: sort, and a checklist for columns worth filtering ---------- */
function HeadCell({
  c,
  def,
  all,
  sort,
  setSort,
  cf,
  setCf,
  onKeys,
  pre,
}: {
  c: Col;
  def: ModuleDef;
  all: Row[];
  rows: Row[];
  sort: Sort;
  setSort: (s: Sort) => void;
  cf: ColFilters;
  setCf: (f: (x: ColFilters) => ColFilters) => void;
  onKeys: string[];
  /** Rows as filtered by everything except this column, for the option counts */
  pre: (r: Row) => boolean;
}) {
  const m = useMenu();
  const isStatus = c.k === "status";
  const sorted = sort?.k === c.k ? sort.dir : 0;
  const chosen = isStatus ? new Set(onKeys.map((k) => k.split(":")[1])) : cf[c.k] || new Set<string>();
  const active = chosen.size > 0;
  const base = all.filter(pre);
  const values = c.filter ? [...new Set(all.map((r) => filterValue(r, c.k)).filter(Boolean))] : [];
  if (!isStatus) values.sort((a, b) => a.localeCompare(b));
  const column = COLUMNS.find((x) => x.id === def.col)!;
  const toggleValue = (v: string) => {
    if (isStatus) return ap.toggle([fkey(def.col, v)]);
    setCf((f) => {
      const s = new Set(f[c.k] || []);
      s.has(v) ? s.delete(v) : s.add(v);
      return { ...f, [c.k]: s };
    });
  };
  const clearThis = () => (isStatus ? ap.remove(onKeys) : setCf((f) => ({ ...f, [c.k]: new Set() })));
  const numeric = c.align === "r" || ["date", "due", "recv", "billed", "qty", "quotes"].includes(c.k);
  return (
    <div role="columnheader" aria-sort={sorted === 1 ? "ascending" : sorted === -1 ? "descending" : "none"} className={"mp-td mp-hd" + (c.align === "r" ? " r" : "") + (active || sorted ? " active" : "")} ref={m.ref}>
      <button type="button" className="mp-hbtn" aria-haspopup="menu" aria-expanded={m.open} onClick={() => m.setOpen(!m.open)}>
        <span className="t">{c.label}</span>
        {sorted !== 0 && <Icon n={sorted === 1 ? "up" : "down"} s={12} w={2.2} />}
        {(c.filter || isStatus) && (
          <span className={"mp-funnel" + (active ? " on" : "")}>
            <Ph n="funnel" s={12} />
            {active && <i>{chosen.size}</i>}
          </span>
        )}
      </button>
      {m.open && (
        <div className={"ap-menu mp-hmenu" + (c.align === "r" ? " right" : "")} role="menu" aria-label={`${c.label} options`}>
          <div className="ap-menu-h">Sort</div>
          {([1, -1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              role="menuitemradio"
              aria-checked={sorted === dir}
              className={sorted === dir ? "on" : ""}
              onClick={() => {
                setSort(sorted === dir ? null : { k: c.k, dir });
                m.setOpen(false);
              }}
            >
              <Icon n={dir === 1 ? "up" : "down"} s={14} />
              <span className="grow">{numeric ? (dir === 1 ? "Low to high" : "High to low") : isStatus ? (dir === 1 ? "Needs attention first" : "Done first") : dir === 1 ? "A to Z" : "Z to A"}</span>
              <span className="ap-menu-tick">{sorted === dir && <Icon n="check" s={14} w={2} />}</span>
            </button>
          ))}
          {(c.filter || isStatus) && (
            <>
              <div className="ap-menu-sep" />
              <div className="ap-menu-h">Show only</div>
              <div className="mp-hlist">
                {values.map((v) => {
                  const n = base.filter((r) => filterValue(r, c.k) === v).length;
                  const on = chosen.has(v);
                  return (
                    <button key={v} type="button" role="menuitemcheckbox" aria-checked={on} className={on ? "on" : ""} onClick={() => toggleValue(v)}>
                      <span className={"mp-check" + (on ? " on" : "")}>{on && <Icon n="check" s={11} w={3} />}</span>
                      {isStatus && <i className={`ap-menu-dot ${toneOf(def.col, v)}`} />}
                      {c.k === "match" && <MatchIcon v={v} />}
                      <span className="grow">{v}</span>
                      <span className="ap-menu-n">{n}</span>
                    </button>
                  );
                })}
              </div>
              {active && (
                <>
                  <div className="ap-menu-sep" />
                  <button type="button" onClick={clearThis}>
                    <span className="grow">Clear {c.label.toLowerCase()} filter</span>
                  </button>
                </>
              )}
            </>
          )}
          {isStatus && <div className="mp-hnote">Same as the status tabs and the {column.title.toLowerCase()} board.</div>}
        </div>
      )}
    </div>
  );
}

function MatchIcon({ v }: { v: string }) {
  const m = Object.values(MATCH).find((x) => x.label === v);
  return m?.icon ? <Icon n={m.icon} s={13} w={2} /> : <span style={{ width: 13 }} />;
}

/* ---------- cells ---------- */
function CellView({ cell, row }: { cell?: Cell; row: Row }) {
  if (!cell) return null;
  switch (cell.t) {
    case "text":
      return (
        <>
          <span className={"mp-txt" + (cell.tone ? " " + cell.tone : "") + (cell.strong ? " strong" : "") + (cell.sub ? " two" : "")}>
            <span className="t">{cell.v}</span>
            {cell.sub && <small>{cell.sub}</small>}
          </span>
          {cell.flag && (
            <span className="mp-flag" title={cell.flag}>
              <Icon n="alert" s={12} w={2} />
              Over budget
            </span>
          )}
        </>
      );
    case "money":
      return <span className={"mp-num" + (cell.muted ? " muted" : "")}>{cell.v == null ? "—" : grp(cell.v)}</span>;
    case "pct":
      return <span className={"mp-num " + (cell.v == null || cell.v === 0 ? "muted" : cell.v < 0 ? "green" : "red")}>{cell.v == null ? "—" : `${cell.v > 0 ? "+" : ""}${cell.v}%`}</span>;
    case "status":
      return <span className={`ap-status ${toneOf(row.card.col, row.card.status)}`}>{row.card.status}</span>;
    case "person":
      return (
        <span className="mp-person">
          <span className="mp-av" style={avatarColors(cell.v)}>
            {initials(cell.v)}
          </span>
          <span className="t">{cell.v}</span>
        </span>
      );
    case "progress":
      return (
        <span className="mp-prog">
          <span className="bar">
            <i className={cell.tone} style={{ width: `${Math.max(cell.v > 0 ? 6 : 0, cell.v * 100)}%` }} />
          </span>
          <span className={"l" + (cell.tone === "red" ? " red" : "")}>{cell.label}</span>
        </span>
      );
    case "dots":
      return (
        <span className="mp-dots">
          {Array.from({ length: cell.of }, (_, i) => (
            <i key={i} className={i < cell.v ? "on" : ""} />
          ))}
          <span>
            {cell.v} of {cell.of}
          </span>
        </span>
      );
    case "match": {
      const m = MATCH[cell.v];
      return (
        <span className={"mp-match " + m.tone}>
          {m.icon && <Icon n={m.icon} s={14} w={2} />}
          {m.label}
        </span>
      );
    }
  }
}

function ExportButton({ def, rows }: { def: ModuleDef; rows: Row[] }) {
  const exportCsv = () => {
    const q = (x: string | number) => `"${String(x).replace(/"/g, '""')}"`;
    const text = (r: Row, k: string) => {
      const c = r.cells[k];
      if (!c) return "";
      if (c.t === "money") return c.v ?? "";
      if (c.t === "status") return r.card.status;
      if (c.t === "progress") return c.label;
      if (c.t === "dots") return `${c.v} of ${c.of}`;
      if (c.t === "match") return MATCH[c.v].label;
      if (c.t === "pct") return c.v == null ? "" : `${c.v}%`;
      return c.v;
    };
    const lines = [def.cols.map((c) => q(c.label)).join(","), ...rows.map((r) => def.cols.map((c) => q(text(r, c.k))).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `${def.title.toLowerCase().replace(/\s+/g, "-")}.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <button type="button" className="mp-iconbtn" title={`Export ${rows.length} as CSV`} aria-label={`Export ${rows.length} rows as CSV`} onClick={exportCsv} disabled={!rows.length}>
      <Icon n="download" s={16} />
    </button>
  );
}
