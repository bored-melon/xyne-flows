import { useEffect, useRef, useState } from "react";
import { ChipEditor, type ChipEditorApi } from "@/components/chips";
import { MailView, type DigestItem } from "@/components/email/MailView";
import { DEFAULT_LAYOUT } from "@/data/modules";
import { VARS } from "@/data/scenarios";
import type { Brand, Email, Vars } from "@/data/types";
import { Icon } from "@/lib/icons";
import { inr, resolve } from "@/lib/utils";
import type { Copy } from "./model";

/* The three ways a notification lands, each editable in place when its frame is selected. */

/** A piece of wording: a Copy key, or "b:<block>.<prop>" for other words in the email. */
export type Field = string;
export const getText = (c: Copy, f: Field): string => (f.startsWith("b:") ? (c.blocks?.[f.slice(2)] ?? "") : ((c as unknown as Record<string, string>)[f] ?? ""));
export function setText(c: Copy, f: Field, val: string) {
  if (f.startsWith("b:")) c.blocks = { ...(c.blocks || {}), [f.slice(2)]: val };
  else (c as unknown as Record<string, string>)[f] = val;
}

export interface EditProps {
  copy: Copy;
  v: Vars;
  brand: Brand;
  /** The frame is selected, so its words can be edited */
  editable: boolean;
  editing: Field | null;
  setEditing: (f: Field | null) => void;
  onChange: (f: Field, value: string) => void;
  /** Review: fields to mark as changed, and on which side */
  marks?: Field[];
  tone?: "before" | "after";
}

/** Floating toolbar over the field being edited: add a detail, done. */
function EditBar({ v, api, onDone }: { v: Vars; api: React.MutableRefObject<ChipEditorApi | null>; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="n2-editbar" onMouseDown={(e) => e.preventDefault()}>
      <span className="n2-menu-wrap">
        <button type="button" onClick={() => setOpen(!open)}>
          <Icon n="plus" s={13} />
          Add a detail
        </button>
        {open && (
          <div className="n2-menu left details">
            <div className="n2-menu-h">Fills in for each person</div>
            {VARS.map(([k, l]) => (
              <button
                type="button"
                key={k}
                className="n2-mi row"
                onClick={() => {
                  api.current?.insert(k);
                  setOpen(false);
                }}
              >
                <span className="grow">{l}</span>
                <span className="eg">e.g. {String(v[k])}</span>
              </button>
            ))}
          </div>
        )}
      </span>
      <button type="button" onClick={onDone}>
        <Icon n="check" s={13} />
        Done
      </button>
    </div>
  );
}

/** Text that shows resolved for the reader, and becomes a chip editor when clicked in the selected frame. */
function Editable({ field, p, className, as = "span" }: { field: Field; p: EditProps; className?: string; as?: "span" | "div" }) {
  const api = useRef<ChipEditorApi | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const editing = p.editing === field && p.editable;
  useEffect(() => {
    if (!editing) return;
    const off = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!box.current?.contains(t) && !t.closest(".n2-menu")) p.setEditing(null);
    };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [editing, p]);
  if (editing)
    return (
      <div className="n2-editing" ref={box}>
        <EditBar v={p.v} api={api} onDone={() => p.setEditing(null)} />
        <ChipEditor value={getText(p.copy, field)} onChange={(t) => p.onChange(field, t)} api={api} className={(className || "") + " n2-rich"} autoFocus label={field} />
      </div>
    );
  const Tag = as;
  const mark = p.marks?.includes(field) ? " n2-mark " + (p.tone || "after") : "";
  return (
    <Tag
      className={(className || "") + (p.editable ? " n2-editable" : "") + mark}
      onClick={
        p.editable
          ? (e) => {
              e.stopPropagation();
              p.setEditing(field);
            }
          : undefined
      }
      title={p.editable ? "Click to change" : undefined}
    >
      {resolve(getText(p.copy, field), p.v) || " "}
    </Tag>
  );
}

/** Email: inbox line (sender, subject, preview text) above the email itself. */
export function EmailPreview({ email, p, items, fields }: { email: Email; p: EditProps; items?: DigestItem[]; fields?: boolean }) {
  // The email renders the current wording, without the version 1 "says it differently" cases.
  const shown: Email = {
    ...email,
    blocks: email.blocks.map((b) => {
      const props = { ...b.props };
      if (b.id === "headline") Object.assign(props, { text: p.copy.head, cases: [] });
      for (const [k, val] of Object.entries(p.copy.blocks || {})) {
        const [id, prop] = k.split(".");
        if (id === b.id) (props as Record<string, unknown>)[prop] = val;
      }
      return { ...b, props };
    }),
  };
  const known = new Set(Object.keys(p.copy.blocks || {}));
  return (
    <>
      {fields ? (
        <div className="n3-fields">
          <div className="f">
            <span className="k">Subject :</span>
            <Editable field="subject" p={p} className="v" as="div" />
          </div>
          <div className="f">
            <span className="k">Preheader :</span>
            <Editable field="pre" p={p} className="v" as="div" />
          </div>
        </div>
      ) : (
      <div className="n2-inbox">
        <div className="row">
          <span className="av" style={{ background: p.brand.color }}>
            {(p.brand.company || "A")[0]}
          </span>
          <b>{p.brand.sender}</b>
          <span className="grow" />
          <span className="time">10:42 AM</span>
        </div>
        <Editable field="subject" p={p} className="subj" as="div" />
        <Editable field="pre" p={p} className="pre" as="div" />
      </div>
      )}
      <div className="n2-mail">
        <MailView
          email={shown}
          v={p.v}
          brand={p.brand}
          layout={DEFAULT_LAYOUT}
          items={items}
          txt={(key, raw) =>
            key === "headline.text" ? <Editable field="head" p={p} /> : known.has(key) ? <Editable field={"b:" + key} p={p} /> : resolve(raw, p.v)
          }
        />
      </div>
    </>
  );
}

/** Slack: a direct message from the Expense app. */
export function SlackPreview({ p }: { p: EditProps }) {
  const items = (p.v._need.length ? p.v._need : p.v._all).slice(0, 3);
  return (
    <div className="n2-slack">
      <div className="hd">
        <span className="hash">#</span> Expense <span className="muted">Direct message</span>
      </div>
      <div className="body">
        <span className="av" style={{ background: p.brand.color }}>
          {(p.brand.company || "A")[0]}
        </span>
        <div className="col">
          <div className="nm">
            <b>Expense by Juspay</b>
            <span className="app">APP</span>
            <span className="muted">10:42 AM</span>
          </div>
          <Editable field="slackTitle" p={p} className="title" as="div" />
          <Editable field="slackBody" p={p} className="text" as="div" />
          {items.length > 0 && (
            <div className="att">
              {items.map((c, i) => (
                <div key={i}>
                  <b>
                    {c.m} · {inr(c.amt)}
                  </b>{" "}
                  <span className={"st " + c.status.split(" ")[0].toLowerCase()}>{c.status}</span>
                  {c.note && <div className="muted">{c.note}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="btns">
            <span className="primary">Open in Expense</span>
            <span>View request</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** App & mobile: the push on the lock screen. */
export function AppPreview({ p, compact }: { p: EditProps; compact?: boolean }) {
  if (compact)
    return (
      <div className="n3-push">
        <div className="row">
          <span className="ai" style={{ background: p.brand.color }}>
            {(p.brand.company || "A")[0]}
          </span>
          <span className="app">EXPENSE</span>
          <span className="grow" />
          <span className="muted">now</span>
        </div>
        <Editable field="appTitle" p={p} className="title" as="div" />
        <Editable field="appBody" p={p} className="text" as="div" />
      </div>
    );
  return (
    <div className="n2-phone">
      <div className="screen">
        <span className="island" />
        <div className="date">Tuesday 13 October</div>
        <div className="clock">9:41</div>
        <div className="push">
          <div className="row">
            <span className="ai" style={{ background: p.brand.color }}>
              {(p.brand.company || "A")[0]}
            </span>
            <span className="app">EXPENSE</span>
            <span className="grow" />
            <span className="muted">now</span>
          </div>
          <Editable field="appTitle" p={p} className="title" as="div" />
          <Editable field="appBody" p={p} className="text" as="div" />
        </div>
      </div>
    </div>
  );
}
