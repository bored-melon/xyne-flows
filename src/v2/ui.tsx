import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/lib/icons";
import { use2 } from "./store";

/* Small building blocks in the web app's style (Unifying Account Payables screens). */

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={"n2-switch" + (on ? " on" : "")} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}

export function Check({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="n2-check">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="box">{on && <Icon n="check" s={11} w={3} />}</span>
      <span>{children}</span>
    </label>
  );
}

export type TagTone = "neutral" | "sky" | "green" | "amber" | "violet";
export function Tag({ tone = "neutral", children }: { tone?: TagTone; children: ReactNode }) {
  return <span className={"n2-tag " + tone}>{children}</span>;
}

export function Btn({ children, icon, kind = "outline", onClick, disabled, title, full }: { children: ReactNode; icon?: string; kind?: "outline" | "dark" | "ghost" | "blue"; onClick?: () => void; disabled?: boolean; title?: string; full?: boolean }) {
  return (
    <button type="button" className={"n2-btn " + kind + (full ? " full" : "")} onClick={onClick} disabled={disabled} title={title}>
      {icon && <Icon n={icon} s={15} />}
      {children}
    </button>
  );
}

export function Num({ value, onChange, min = 1, max = 30, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <input
      className="n2-num"
      type="number"
      aria-label={label}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Math.max(min, Math.min(max, +e.target.value || min)))}
    />
  );
}

/** A popover menu anchored under its trigger; closes on outside click or Escape. */
export function Menu({ trigger, children, align = "right" }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="n2-menu-wrap" ref={ref}>
      {trigger(open, () => setOpen(!open))}
      {open && <div className={"n2-menu " + align}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, width = 520 }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="n2-scrim" onMouseDown={onClose}>
      <div className="n2-modal" style={{ width }} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="n2-modal-h">
          <h2>{title}</h2>
          <button type="button" className="n2-icon-btn" aria-label="Close" onClick={onClose}>
            <Icon n="x" s={16} />
          </button>
        </div>
        <div className="n2-modal-b">{children}</div>
        {footer && <div className="n2-modal-f">{footer}</div>}
      </div>
    </div>
  );
}

/* The two states of the app's left nav: the modules, and Settings. */

type NavItem = { icon: string; label: string; dot?: boolean; children?: string[] };
type NavGroup = { title?: string; items: NavItem[] };

export const MAIN_NAV: NavGroup[] = [
  { items: [{ icon: "home", label: "Home" }, { icon: "sparkles", label: "Assistant", dot: true }] },
  { title: "Operations", items: [{ icon: "circleCheck", label: "Approvals" }] },
  {
    title: "Payables",
    items: [
      { icon: "layers", label: "Procurement", children: ["Purchase requests", "Quotations", "Purchase orders", "GRNs", "Bills"] },
      { icon: "wallet", label: "Payments" },
      { icon: "building", label: "Vendors" },
      { icon: "sliders", label: "Configurations" },
    ],
  },
  { title: "Spend", items: [{ icon: "card", label: "Cards" }, { icon: "plane", label: "Travel Booking" }, { icon: "card", label: "Subscriptions" }] },
  { title: "Insights", items: [{ icon: "chartLine", label: "Analytics" }, { icon: "clipboard", label: "Reports" }] },
];

export const SETTINGS_NAV: NavGroup[] = [
  { title: "Company", items: [{ icon: "building", label: "Company Profile" }, { icon: "plug", label: "Integrations" }, { icon: "fileText", label: "Terms & Conditions" }, { icon: "users", label: "User and Roles" }] },
  { title: "Controls", items: [{ icon: "shield", label: "Policy" }, { icon: "workflow", label: "Workflows" }, { icon: "bot", label: "Agents" }] },
  { title: "Workspace", items: [{ icon: "palette", label: "Design Kit" }, { icon: "boxes", label: "Components" }, { icon: "sliders", label: "Designer controls" }] },
  {
    title: "Configuration",
    items: [
      { icon: "brush", label: "Branding" },
      { icon: "palette", label: "Theme" },
      { icon: "mail", label: "Notifications" },
      { icon: "layers", label: "Modules" },
      { icon: "packagePlus", label: "Extra modules" },
      { icon: "userCog", label: "Profiles" },
      { icon: "history", label: "Version control" },
    ],
  },
];

function Brand() {
  return (
    <div className="n2-side-brand">
      <span className="n2-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
          <path d="M7 5c3 0 4 3 5 7s2 7 5 7M17 5c-2 0-3.5 2-4.3 4.5M7 19c2 0 3.5-2 4.3-4.5" />
        </svg>
      </span>
      <b>Xyne Flow</b>
      <Icon n="chevUD" s={14} />
      <span className="grow" />
      <Icon n="sidebar" s={18} />
    </div>
  );
}

function Me() {
  return (
    <div className="n2-side-me">
      <span className="av" aria-hidden="true">
        🏪
      </span>
      <span className="grow">
        <b>Small Business Owner</b>
        <small>SME Demo</small>
      </span>
      <Icon n="chevD" s={14} />
    </div>
  );
}

/** The app's left navigation. Full width, or collapsed to icons while editing a product's notifications. */
export function Sidebar({ collapsed }: { collapsed?: boolean }) {
  const { ui, setUi } = use2();
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const list = useRef<HTMLDivElement>(null);
  // keep the open page visible when the list is taller than the screen
  useEffect(() => {
    list.current?.querySelector(".n2-nav.on")?.scrollIntoView({ block: "nearest" });
  }, [ui.nav, collapsed]);
  const groups = ui.nav === "main" ? MAIN_NAV : SETTINGS_NAV;
  const go = (label: string) => setUi(label === "Notifications" ? { page: label, view: "home" } : { page: label });

  if (collapsed)
    return (
      <nav className="n2-rail" aria-label={ui.nav === "main" ? "App" : "Settings"}>
        <Brand />
        {ui.nav === "settings" && (
          <button type="button" className="n2-rail-btn" title="Back to the app" aria-label="Back to the app" onClick={() => setUi({ nav: "main", page: "Home" })}>
            <Icon n="arrowL" s={17} />
          </button>
        )}
        <div className="n2-rail-items">
          {groups.map((g, gi) => (
            <div className="grp" key={gi}>
              {g.items.map((it) => (
                <button type="button" key={it.label} className={"n2-rail-btn" + (ui.page === it.label ? " on" : "")} title={it.label} aria-label={it.label} onClick={() => go(it.label)}>
                  <Icon n={it.icon} s={17} />
                  {it.dot && <i className="dot" />}
                </button>
              ))}
            </div>
          ))}
        </div>
        <span className="n2-side-me rail">
          <span className="av">🏪</span>
        </span>
      </nav>
    );

  return (
    <nav className="n2-side" aria-label={ui.nav === "main" ? "App" : "Settings"}>
      <Brand />
      <div className="n2-side-scroll" ref={list}>
        {ui.nav === "settings" && (
          <button type="button" className="n2-nav back" onClick={() => setUi({ nav: "main", page: "Home" })}>
            <Icon n="arrowL" s={17} />
            Settings
          </button>
        )}
        {groups.map((g, gi) => {
          const closed = g.title && shut[g.title];
          return (
            <div key={gi} className="n2-nav-sec">
              {g.title && (
                <button type="button" className="n2-nav-grp" aria-expanded={!closed} onClick={() => setShut((x) => ({ ...x, [g.title!]: !closed }))}>
                  {g.title}
                  <Icon n={closed ? "chevD" : "chevU"} s={14} />
                </button>
              )}
              {!closed &&
                g.items.map((it) => {
                  const open = it.children && !folded[it.label];
                  return (
                    <div key={it.label} className="n2-nav-item">
                      <button type="button" className={"n2-nav" + (ui.page === it.label ? " on" : "")} aria-current={ui.page === it.label ? "page" : undefined} onClick={() => go(it.label)}>
                        <Icon n={it.icon} s={17} />
                        <span className="grow">{it.label}</span>
                        {it.dot && <i className="dot" aria-label="New" />}
                        {it.children && (
                          <span
                            role="button"
                            tabIndex={0}
                            className="n2-nav-fold"
                            aria-label={open ? `Hide ${it.label} pages` : `Show ${it.label} pages`}
                            aria-expanded={!!open}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolded((f) => ({ ...f, [it.label]: !!open }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setFolded((f) => ({ ...f, [it.label]: !!open }));
                              }
                            }}
                          >
                            <Icon n={open ? "chevU" : "chevD"} s={14} />
                          </span>
                        )}
                      </button>
                      {open &&
                        it.children!.map((c) => (
                          <button type="button" key={c} className={"n2-nav sub" + (ui.page === c ? " on" : "")} aria-current={ui.page === c ? "page" : undefined} onClick={() => go(c)}>
                            <span className="grow">{c}</span>
                          </button>
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
      {ui.nav === "main" && (
        <button type="button" className="n2-nav" onClick={() => setUi({ nav: "settings", page: "Notifications", view: "home" })}>
          <Icon n="gear" s={17} />
          Settings
        </button>
      )}
      <Me />
    </nav>
  );
}

/** The bar across the top of every page. */
export function SearchBar() {
  return (
    <div className="n2-searchbar">
      <Icon n="search" s={16} />
      <span>Search</span>
      <span className="faint">[⌘ + K]</span>
      <span className="grow" />
      <Icon n="spark" s={18} c="#C084FC" />
      <Icon n="bell" s={18} />
      <Icon n="gear" s={18} />
      <span className="n2-avatar" />
    </div>
  );
}

/** A module that isn't built in this prototype yet. */
export function Placeholder({ title }: { title: string }) {
  const item = [...MAIN_NAV, ...SETTINGS_NAV].flatMap((g) => g.items).find((i) => i.label === title);
  return (
    <div className="n2-page">
      <SearchBar />
      <div className="n2-home">
        <h1 className="n2-h1">{title}</h1>
        <div className="n2-ph">
          <span className="badge">
            <Icon n={item?.icon || "layers"} s={22} />
          </span>
          <h3>{title} isn’t in the prototype yet</h3>
          <p>This is where the {title.toLowerCase()} module will go.</p>
        </div>
      </div>
    </div>
  );
}
