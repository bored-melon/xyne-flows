import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode } from "react";
import { Icon } from "@/lib/icons";
import { esc } from "@/lib/utils";
import { VARS, VLABEL } from "@/data/scenarios";
import type { Vars } from "@/data/types";

/*
 * Copy with variables is stored as plain text with {tokens}, e.g. "{flagged} claims flagged".
 * In the editor, tokens show as non-editable chips; serialize() turns the DOM back into text.
 */

/** Read-only text with variable chips */
export function Tok({ t }: { t: string }) {
  const parts = (t || "").split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\{(\w+)\}$/);
        return m ? (
          <span className="var" key={i}>
            {VLABEL[m[1]] || m[1]}
          </span>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </>
  );
}

function toHTML(t: string) {
  return esc(t || "").replace(
    /\{(\w+)\}/g,
    (_m, k) => `<span class="var" contenteditable="false" data-v="${k}">${esc(VLABEL[k] || k)}</span>`,
  );
}

function serialize(el: Node): string {
  let s = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) s += n.textContent;
    else if ((n as HTMLElement).dataset?.v) s += "{" + (n as HTMLElement).dataset.v + "}";
    else if (n.nodeName === "BR") s += "";
    else s += serialize(n);
  });
  return s.replace(/ /g, " ");
}

export interface ChipEditorApi {
  insert: (key: string) => void;
}

interface ChipEditorProps {
  value: string;
  onChange: (v: string) => void;
  api?: MutableRefObject<ChipEditorApi | null>;
  className?: string;
  ph?: string;
  label?: string;
  /** Focus on mount with the caret at the end */
  autoFocus?: boolean;
}

/** Single-line rich text field where variables are atomic chips. */
export function ChipEditor({ value, onChange, api, className = "rich", ph, label, autoFocus }: ChipEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  const range = useRef<Range | null>(null);

  // Only rewrite the DOM when the value changed from outside (undo, case switch…), never while typing.
  useEffect(() => {
    if (value !== last.current && ref.current) {
      ref.current.innerHTML = toHTML(value);
      last.current = value;
    }
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!autoFocus || !el) return;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    range.current = r.cloneRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ref.current && ref.current.contains(s.anchorNode)) range.current = s.getRangeAt(0).cloneRange();
  };
  const emit = () => {
    const v = serialize(ref.current!);
    last.current = v;
    onChange(v);
  };

  if (api)
    api.current = {
      insert(k: string) {
        const el = ref.current!;
        const span = document.createElement("span");
        span.className = "var";
        span.contentEditable = "false";
        span.dataset.v = k;
        span.textContent = VLABEL[k] || k;
        const space = document.createTextNode(" ");
        const r = range.current;
        if (!r || !el.contains(r.startContainer)) {
          el.appendChild(document.createTextNode(" "));
          el.appendChild(span);
          el.appendChild(space);
        } else {
          r.deleteContents();
          r.insertNode(space);
          r.insertNode(span);
        }
        const sel = window.getSelection()!;
        const nr = document.createRange();
        nr.setStartAfter(space);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
        range.current = nr.cloneRange();
        el.focus();
        emit();
      },
    };

  return (
    <div
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={label || "Text"}
      data-ph={ph || ""}
      spellCheck
      onInput={emit}
      onKeyUp={save}
      onMouseUp={save}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text"));
      }}
    />
  );
}

interface VarMenuProps {
  v: Vars;
  onPick: (k: string) => void;
  onClose: () => void;
  style?: CSSProperties;
}

export function VarMenu({ v, onPick, onClose, style }: VarMenuProps) {
  return (
    <>
      <div className="catch" onClick={onClose} />
      <div className="pop" style={style || { right: 0, top: 28, width: 272 }}>
        <div className="grp eyebrow">Insert a variable</div>
        {VARS.map(([k, l]) => (
          <button
            type="button"
            key={k}
            className="opt"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPick(k);
              onClose();
            }}
          >
            <span className="var">{l}</span>
            <span className="grow" />
            <span className="muted tnum" style={{ fontSize: 12 }}>
              {String(v[k])}
            </span>
          </button>
        ))}
        <div className="hint" style={{ padding: "8px 8px 4px" }}>
          Values shown come from the preview scenario.
        </div>
      </div>
    </>
  );
}

interface ChipFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  v: Vars;
  right?: ReactNode;
  hint?: string;
  ph?: string;
}

/** Labelled chip editor with a "Variable" picker button. */
export function ChipField({ label, value, onChange, v, right, hint, ph }: ChipFieldProps) {
  const api = useRef<ChipEditorApi | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <div className="lab">
        {label}
        <span className="grow" />
        {right}
        <span style={{ position: "relative" }}>
          <button type="button" className="varbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(!open)}>
            <Icon n="braces" s={13} />
            Variable
          </button>
          {open && <VarMenu v={v} onPick={(k) => api.current?.insert(k)} onClose={() => setOpen(false)} />}
        </span>
      </div>
      <ChipEditor value={value} onChange={onChange} api={api} ph={ph} label={label} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
