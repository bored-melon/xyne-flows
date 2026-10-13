import { Icon } from "@/lib/icons";
import { useStudio } from "@/state/StudioContext";
import { Scope, Toggle } from "../ui";
import { BrandKit } from "./BrandKit";
import { ModuleEmails } from "./ModuleEmails";

const APP_NAV: [string, [string, string, boolean?][]][] = [
  ["Company", [["Company profile", "building"], ["Integrations", "link"], ["Users and roles", "users"]]],
  ["Controls", [["Policy", "shield"], ["Workflows", "zap"]]],
  ["Configuration", [["Branding", "palette"], ["Email notifications", "mail", true], ["Modules", "layers"], ["Version control", "history"]]],
];

/** Settings → Email notifications. Modules and the global brand kit on the left, the selected one on the right. */
export function Overview() {
  const { S, ui, U, act } = useStudio();
  const mod = S.modules.find((m) => m.id === ui.side);

  return (
    <div className="ov">
      <aside className="appnav" aria-label="Settings">
        <div className="brandrow">
          <span className="xmark">X</span>Xyne Flow
        </div>
        <div className="row" style={{ padding: "6px 10px 10px", fontWeight: 500 }}>
          <Icon n="back" s={16} />
          Settings
        </div>
        {APP_NAV.map(([group, items]) => (
          <div key={group}>
            <div className="grp eyebrow">{group}</div>
            {items.map(([name, icon, on]) => (
              <button type="button" key={name} className={"item" + (on ? " on" : "")}>
                <Icon n={icon} s={16} />
                {name}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <section className="modcol" aria-label="Modules and brand">
        <div className="eyebrow" style={{ padding: "0 6px" }}>
          Settings
        </div>
        <h1>Email notifications</h1>
        <p className="lede">What your team receives, from whom, and when.</p>
        <div className="eyebrow" style={{ padding: "0 6px 4px" }}>
          Modules
        </div>
        <div className="modlist">
          {S.modules.map((m) => {
            const onCount = m.emails.filter((e) => e.on).length;
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                className={"mod" + (ui.side === m.id ? " on" : "")}
                onClick={() => U({ side: m.id, filter: "all" })}
                onKeyDown={(e) => e.key === "Enter" && U({ side: m.id })}
              >
                <span className="tile">
                  <Icon n={m.icon} s={17} />
                </span>
                <span className="grow">
                  <div className="nm" style={m.on ? undefined : { color: "var(--muted)" }}>
                    {m.name}
                  </div>
                  <div className="mt">
                    {m.emails.length} emails · {m.on ? onCount + " on" : "off"}
                  </div>
                </span>
                <Toggle
                  sm
                  on={m.on}
                  label={"Turn " + m.name + " emails on or off"}
                  onChange={(val) =>
                    act((d) => {
                      d.modules.find((x) => x.id === m.id)!.on = val;
                    })
                  }
                />
              </div>
            );
          })}
        </div>

        <button type="button" className={"brandcard" + (ui.side === "brand" ? " on" : "")} onClick={() => U({ side: "brand" })}>
          <span className="row">
            <Scope k="Brand" />
            <span className="muted" style={{ fontSize: 12 }}>
              Applies to all 5 modules
            </span>
          </span>
          <span className="row" style={{ fontWeight: 600, fontSize: 15, gap: 8 }}>
            <span className="mk" style={{ background: S.brand.color }}>
              {(S.brand.company || "A")[0]}
            </span>
            {S.brand.company}
            <span className="muted" style={{ fontWeight: 400 }}>
              Expenses
            </span>
          </span>
          <span className="row" style={{ gap: 6 }}>
            <span className="sw" style={{ background: S.brand.color }} />
            <span className="muted" style={{ fontSize: 12 }}>
              {S.brand.color.toUpperCase()} · {S.brand.radius} corners · {S.brand.button} buttons
            </span>
          </span>
          <span className="row" style={{ color: "var(--purple)", fontWeight: 500, fontSize: 13 }}>
            Edit brand kit <Icon n="arrowR" s={14} />
          </span>
        </button>
      </section>

      <main className="ovmain">{ui.side === "brand" || !mod ? <BrandKit /> : <ModuleEmails mod={mod} />}</main>
    </div>
  );
}
