import type { ReactNode } from "react";
import { Icon } from "@/lib/icons";

interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  sm?: boolean;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ on, onChange, sm, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      className={"toggle" + (sm ? " sm" : "")}
      role="switch"
      aria-checked={on ? "true" : "false"}
      aria-label={label || "Toggle"}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
    />
  );
}

export interface SegOption<T extends string> {
  v: T;
  l?: string;
  i?: string;
}

interface SegProps<T extends string> {
  opts: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  sm?: boolean;
}

export function Seg<T extends string>({ opts, value, onChange, sm }: SegProps<T>) {
  return (
    <div className={"seg" + (sm ? " sm" : "")} role="group">
      {opts.map((o) => (
        <button type="button" key={o.v} aria-pressed={value === o.v ? "true" : "false"} onClick={() => onChange(o.v)}>
          {o.i && <Icon n={o.i} s={14} />}
          {o.l}
        </button>
      ))}
    </div>
  );
}

type ScopeKind = "Brand" | "Email" | "Data" | "Locked" | "Delivery" | "All emails";
const SCOPE_TONES: Record<ScopeKind, Tone> = {
  Brand: "purple",
  Email: "blue",
  Data: "green",
  Locked: "gray",
  Delivery: "gray",
  "All emails": "gray",
};

/** Shows where a setting lives: brand kit, this email, data from the request, etc. */
export function Scope({ k }: { k: ScopeKind }) {
  return <Tag tone={SCOPE_TONES[k]}>{k}</Tag>;
}

export type Tone = "gray" | "green" | "amber" | "red" | "blue" | "purple";

/** Pill tag (from the Figma email kit): soft tint, 13px text, no border. Pick the tone by meaning. */
export function Tag({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={"badge " + tone}>{children}</span>;
}

/** Status of one email: draft changes win, then off / not in use / new / sending. */
export function EmailStatusTag({ on, dirty, moduleOn, isNew, digestEmpty }: { on: boolean; dirty: boolean; moduleOn: boolean; isNew?: boolean; digestEmpty?: boolean }) {
  if (dirty) return <Tag tone="amber">Draft</Tag>;
  if (!on) return isNew ? <Tag tone="purple">New</Tag> : <Tag>Off</Tag>;
  if (!moduleOn) return <Tag>Module off</Tag>;
  if (digestEmpty) return <Tag>Not in use</Tag>;
  return <Tag tone="green">Sending</Tag>;
}
