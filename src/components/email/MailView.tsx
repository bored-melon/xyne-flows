import { useContext, type CSSProperties, type ReactNode } from "react";
import type { Block, BlockProps, Brand, Email, Freq, Layout, Module, Vars } from "@/data/types";
import { pickText } from "@/data/scenarios";
import { Icon } from "@/lib/icons";
import { avColor, blockIcon, blockName, bundledInto, initials, inr, isData, isDigest, isLocked, RADII, resolve, visibleBlocks } from "@/lib/utils";
import { StudioContext } from "@/state/StudioContext";
import { DEFAULT_LAYOUT } from "@/data/modules";
import { Illustration } from "./Illustration";

/** Brand kit → CSS custom properties on the email. */
export function brandStyle(brand: Brand): CSSProperties {
  const [r, b] = RADII[brand.radius];
  return { ["--brand" as string]: brand.color, ["--r" as string]: r + "px", ["--btnr" as string]: b + "px" } as CSSProperties;
}

/** Lets a caller render a piece of wording itself (version 2 makes it editable in place). */
export type TextHook = (key: string, raw: string) => ReactNode;

function ListBlock({ p, v, edit, h }: { p: BlockProps; v: Vars; edit?: boolean; h: ReactNode }) {
  const src = p.source === "need" ? v._need : p.source === "rejected" ? v._rej : v._all;
  if (!src.length) {
    if (p.empty === "message")
      return (
        <div className="m-card m-list">
          <h4>{h}</h4>
          <p className="m-para" style={{ fontSize: 14 }}>
            Nothing here right now. You’re all set.
          </p>
        </div>
      );
    return edit ? <div className="ghost">“{p.heading}” is hidden in this scenario — there are no claims to show.</div> : null;
  }
  if (p.layout === "totals") {
    const sum = src.reduce((a, c) => a + c.amt, 0);
    return (
      <div className="m-card m-list">
        <h4>{h}</h4>
        <div className="m-r">
          <div className="m-stack">
            {src.slice(0, 4).map((c, i) => (
              <span key={i} className="m-av" style={{ background: avColor(c.m) }}>
                {initials(c.m)}
              </span>
            ))}
          </div>
          <span className="meta">
            {src.length} claim{src.length > 1 ? "s" : ""} · {src.slice(0, 2).map((c) => c.m).join(", ")}
            {src.length > 2 ? " +" + (src.length - 2) : ""}
          </span>
          <span className="amt">{inr(sum)}</span>
        </div>
      </div>
    );
  }
  const shown = src.slice(0, p.max);
  const more = src.length - shown.length;
  const f = p.fields!;
  return (
    <div className="m-card m-list">
      <h4>{h}</h4>
      <div className="m-rows">
        {shown.map((c, i) => (
          <div className="m-item" key={i}>
            <div className="m-r">
              {f.logo && (
                <span className="m-av" style={{ background: avColor(c.m) }}>
                  {initials(c.m)}
                </span>
              )}
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="who">{c.m}</span>
                  {f.status && <span className={"m-chip " + c.status.split(" ")[0]}>{c.status}</span>}
                </div>
                {(f.category || f.date) && <div className="meta">{[f.category && c.cat, f.date && c.date].filter(Boolean).join(" · ")}</div>}
              </div>
              <span className="amt">{inr(c.amt)}</span>
            </div>
            {p.layout === "notes" && f.note && c.note && (
              <div className="m-quote">
                “{c.note}”<small>Note from {v.approver} · Operations approver</small>
              </div>
            )}
          </div>
        ))}
      </div>
      {more > 0 && (
        <div className="m-more">
          + {more} more claim{more > 1 ? "s" : ""} in the app
        </div>
      )}
    </div>
  );
}

function StepDot({ state }: { state: string }) {
  if (state === "done") return <Icon n="check" s={13} c="#fff" w={3} />;
  if (state === "you") return <>!</>;
  if (state === "rejected") return <Icon n="x" s={12} c="#fff" w={3} />;
  return null;
}

export interface DigestItem {
  name: string;
  line: string;
}

const DIGEST_TIMES = ["9:12 AM", "Yesterday, 6:40 PM", "Yesterday, 3:05 PM", "Yesterday, 11:20 AM"];

function DigestBlock({ p, items, edit, h }: { p: BlockProps; items: DigestItem[]; edit?: boolean; h: ReactNode }) {
  if (!items.length)
    return edit ? (
      <div className="ghost">No emails go into this summary yet. Add one from an email’s Delivery settings.</div>
    ) : null;
  return (
    <div className="m-card m-list">
      <h4>{h}</h4>
      <div className="m-rows">
        {items.map((it, i) => (
          <div className="m-item" key={i}>
            <div className="m-r">
              <span className="m-av" style={{ background: "var(--brand)" }}>
                {i + 1}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="who">{it.line}</div>
                <div className="meta">
                  {it.name}
                  {p.showTime ? " · " + DIGEST_TIMES[i % DIGEST_TIMES.length] : ""}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlockBody({ b, v, brand, edit, digestItems = [], txt }: { b: Block; v: Vars; brand: Brand; edit?: boolean; digestItems?: DigestItem[]; txt?: TextHook }) {
  const p = b.props;
  const T = (prop: string, raw: string | undefined): ReactNode => (txt ? txt(b.id + "." + prop, raw || "") : prop === "heading" || (prop === "label" && b.type === "amount") ? raw : resolve(raw || "", v));
  switch (b.type) {
    case "logo":
      return (
        <div className="m-logo">
          <span className="m-mark">{(brand.company || "A")[0]}</span>
          {brand.company}
          <span className="sub">Expenses</span>
        </div>
      );
    case "illustration":
      if (brand.illustrations === "none") return edit ? <div className="ghost">Illustrations are turned off in the brand kit.</div> : null;
      return (
        <div className="m-ill">
          <Illustration k={p.kind} />
        </div>
      );
    case "headline":
      return (
        <div className={"m-head" + (p.align === "left" ? " left" : "")}>
          <h1 className="m-h1">{T("text", pickText(p, v))}</h1>
          {p.sub && <p className="m-sub">{T("sub", p.sub)}</p>}
        </div>
      );
    case "timeline":
      return (
        <ol className="m-tl">
          {p.steps!.map((s, i) => (
            <li key={i} className={"m-step " + s.state}>
              <span className="m-dot">
                <StepDot state={s.state} />
              </span>
              <b>{resolve(s.label, v)}</b>
              {p.dates && <small>{resolve(s.sub, v)}</small>}
            </li>
          ))}
        </ol>
      );
    case "amount":
      return (
        <div className="m-card m-amt">
          <div>
            <small>{T("label", p.label)}</small>
            <div className="big">{v.total}</div>
          </div>
          {p.breakdown && (
            <div className="m-break">
              <span>
                <i style={{ background: "#16A34A" }} />
                Approved<b>{inr(v._amtOk)}</b>
              </span>
              <span>
                <i style={{ background: "#F59E0B" }} />
                Needs action<b>{inr(v._amtNeed)}</b>
              </span>
              <span>
                <i style={{ background: "#DC2626" }} />
                Rejected<b>{inr(v._amtRej)}</b>
              </span>
            </div>
          )}
        </div>
      );
    case "list":
      return <ListBlock p={p} v={v} edit={edit} h={T("heading", p.heading)} />;
    case "details": {
      const rows = p.rows!.filter((r) => r.on);
      if (!rows.length) return edit ? <div className="ghost">All detail rows are turned off.</div> : null;
      return (
        <div className="m-card" style={{ paddingBlock: 6 }}>
          <div className="m-details">
            {rows.map((r, i) => (
              <div className="m-d" key={i}>
                <span className="l">
                  <Icon n={r.icon} s={17} />
                  {r.label}
                </span>
                <span className="v">{resolve(r.value, v)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "note":
      return <p className="m-para">{T("text", p.text)}</p>;
    case "digest":
      return <DigestBlock p={p} items={digestItems} edit={edit} h={T("heading", p.heading)} />;
    case "button":
      // Rendered as a span: this is a preview, and the real link is set by the system.
      return (
        <div className="m-cta">
          <span className="m-btn">{T("label", p.label)}</span>
        </div>
      );
    case "footer":
      return (
        <div className="m-foot">
          <span>
            You’re getting this because you use {brand.company} spend management. <span className="m-link">Notification settings</span>
          </span>
          <span>{brand.footer}</span>
        </div>
      );
  }
  return null;
}

interface MailViewProps {
  email: Email;
  v: Vars;
  brand: Brand;
  /** Needed for digest emails, to list what they bundle */
  mod?: Module;
  /** Digest state: which summary this frame shows */
  freq?: Freq;
  /** Editor mode: blocks become selectable with hover tools */
  edit?: boolean;
  sel?: string | null;
  onSel?: (id: string) => void;
  /** Move a block in the shared order (affects every email) */
  onMove?: (id: string, dir: -1 | 1) => void;
  /** Hide a block in this email */
  onHide?: (id: string) => void;
  /** Replaces the selected headline with an in-place editor */
  inlineEditor?: ReactNode;
  /** Shared block order; defaults to the studio's (version 1) or the default layout */
  layout?: Layout;
  /** What a summary lists, when the caller works it out itself (version 2) */
  items?: DigestItem[];
  /** Renders each piece of wording (version 2: editable in place) */
  txt?: TextHook;
}

export function MailView({ email, v, brand, mod, freq, edit, sel, onSel, onMove, onHide, inlineEditor, layout, items, txt }: MailViewProps) {
  const ctx = useContext(StudioContext);
  const blocks = visibleBlocks(email, layout || ctx?.S.layout || DEFAULT_LAYOUT);
  const digestItems: DigestItem[] = items
    ? items
    : mod && isDigest(email)
      ? bundledInto(mod, email, freq).map((e) => {
          const h = e.blocks.find((b) => b.id === "headline");
          return { name: e.name, line: h ? resolve(pickText(h.props, v), v) : e.name };
        })
      : [];
  return (
    <div className={"mail" + (brand.button === "outline" ? " outline" : "")} style={brandStyle(brand)}>
      {blocks.map((b, i) => {
        if (!edit) return <BlockBody key={b.id} b={b} v={v} brand={brand} digestItems={digestItems} txt={txt} />;
        const locked = isLocked(b.type);
        const isSel = sel === b.id;
        if (isSel && b.type === "headline" && inlineEditor)
          return (
            <div className="blk sel" key={b.id}>
              {inlineEditor}
            </div>
          );
        return (
          <div
            key={b.id}
            className={"blk" + (isSel ? " sel" : "") + (locked ? " locked" : "")}
            onClick={(e) => {
              e.stopPropagation();
              onSel?.(b.id);
            }}
          >
            <span className="tag">
              <Icon n={locked ? "lock" : blockIcon(b.type)} s={11} w={2} />
              {blockName(b)}
              {locked ? " · Brand kit" : isData(b.type) ? " · Data" : ""}
            </span>
            {!locked && (
              <div className="tools" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="ibtn sm" title="Move up in every email" aria-label="Move up in every email" disabled={i <= 1} onClick={() => onMove?.(b.id, -1)}>
                  <Icon n="up" s={14} />
                </button>
                <button
                  type="button"
                  className="ibtn sm"
                  title="Move down in every email"
                  aria-label="Move down in every email"
                  disabled={i >= blocks.length - 2}
                  onClick={() => onMove?.(b.id, 1)}
                >
                  <Icon n="down" s={14} />
                </button>
                <button type="button" className="ibtn sm" title="Hide in this email" aria-label="Hide in this email" onClick={() => onHide?.(b.id)}>
                  <Icon n="eyeOff" s={14} />
                </button>
              </div>
            )}
            <BlockBody b={b} v={v} brand={brand} edit digestItems={digestItems} />
          </div>
        );
      })}
    </div>
  );
}
