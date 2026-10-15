import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { CARDS, DEPTS, ENTITIES } from "./data";
import { ap, inScope, useAp, type Scope } from "./state";

/** Open/close for a small menu: closes on an outside click, and Esc closes it before it clears filters. */
export function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", down);
    window.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key, true);
    };
  }, [open]);
  return { open, setOpen, ref };
}

export interface Opt {
  value: string;
  label: string;
  count: number;
}

export function Dropdown({ name, value, opts, onChange, small }: { name: string; value: string; opts: Opt[]; onChange: (v: string) => void; small?: boolean }) {
  const m = useMenu();
  const cur = opts.find((o) => o.value === value) || opts[0];
  return (
    <div className="ap-dd" ref={m.ref}>
      <button type="button" className={"ap-filter-btn" + (small ? " sm" : "") + (value !== opts[0].value ? " set" : "")} aria-haspopup="listbox" aria-expanded={m.open} aria-label={`${name}: ${cur.label}`} onClick={() => m.setOpen(!m.open)}>
        {cur.label}
        <Icon n="chevD" s={small ? 14 : 16} w={small ? 2 : 1.75} />
      </button>
      {m.open && (
        <div className="ap-menu" role="listbox" aria-label={name}>
          <div className="ap-menu-h">{name}</div>
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={o.value === value ? "on" : ""}
              onClick={() => {
                onChange(o.value);
                m.setOpen(false);
              }}
            >
              <span className="grow">{o.label}</span>
              <span className="ap-menu-n">{o.count}</span>
              <span className="ap-menu-tick">{o.value === value && <Icon n="check" s={14} w={2} />}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Period, entity and department. Option counts are what each choice would show, given the other two.
    `only` narrows the counts to one board, for the module pages. */
export function HeaderFilters({ small, only }: { small?: boolean; only?: string }) {
  const { scope } = useAp();
  const base = only ? CARDS.filter((c) => c.col === only) : CARDS;
  const count = (s: Scope) => base.filter(inScope(s)).length;
  const set = (patch: Partial<Scope>) => ap.setScope({ ...scope, ...patch });
  return (
    <div className="ap-filters-row">
      <Dropdown
        small={small}
        name="Period"
        value={scope.period}
        opts={[
          { value: "quarter", label: "This quarter", count: count({ ...scope, period: "quarter" }) },
          { value: "month", label: "This month", count: count({ ...scope, period: "month" }) },
        ]}
        onChange={(v) => set({ period: v as Scope["period"] })}
      />
      <Dropdown
        small={small}
        name="Entity"
        value={scope.entity}
        opts={[{ value: "", label: "All entities", count: count({ ...scope, entity: "" }) }, ...ENTITIES.map((e) => ({ value: e, label: e, count: count({ ...scope, entity: e }) }))]}
        onChange={(v) => set({ entity: v })}
      />
      <Dropdown
        small={small}
        name="Department"
        value={scope.dept}
        opts={[{ value: "", label: "All departments", count: count({ ...scope, dept: "" }) }, ...DEPTS.map((d) => ({ value: d, label: d, count: count({ ...scope, dept: d }) }))]}
        onChange={(v) => set({ dept: v })}
      />
    </div>
  );
}
