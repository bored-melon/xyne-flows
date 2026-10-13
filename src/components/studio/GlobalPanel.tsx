import { useState } from "react";
import { Icon } from "@/lib/icons";
import { bundledInto, isDigest, SLOT_ICONS, SLOT_NAMES, timingText } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { Scope, Toggle } from "../ui";

const LOCKED = ["logo", "footer"];

/** Properties when nothing is selected: things that apply to every email. */
export function GlobalPanel() {
  const { S, act, U, mod } = useStudio();
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const total = S.modules.reduce((a, m) => a + m.emails.length, 0);
  const usage = (slot: string) => mod.emails.filter((e) => e.blocks.some((b) => b.id === slot && !b.hidden)).length;
  const digests = mod.emails.filter(isDigest);

  const drop = (target: string) => {
    if (!drag || drag === target || LOCKED.includes(target)) return;
    act((d) => {
      const order = d.layout.order.filter((x) => x !== drag);
      order.splice(order.indexOf(target), 0, drag);
      d.layout.order = order;
    });
    setDrag(null);
    setOver(null);
  };
  const nudge = (slot: string, dir: -1 | 1) =>
    act((d) => {
      const o = d.layout.order;
      const i = o.indexOf(slot);
      const j = i + dir;
      if (j <= 0 || j >= o.length - 1) return;
      [o[i], o[j]] = [o[j], o[i]];
    });

  return (
    <>
      <div className="head">
        <h2>All emails</h2>
        <div className="muted" style={{ fontSize: 12 }}>
          Settings shared by every email in all 5 modules · {total} emails
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Scope k="All emails" />
          <span className="muted" style={{ fontSize: 11 }}>
            Select an email or a block to edit just that
          </span>
        </div>
      </div>

      <div className="sec">
        <h3>Block order</h3>
        <div className="hint">Every email follows this order, so they all look alike. An email can hide blocks it doesn’t need, but can’t reorder them.</div>
        <div className="outline">
          {S.layout.order.map((slot) => {
            const locked = LOCKED.includes(slot);
            const off = S.layout.off.includes(slot);
            const n = usage(slot);
            return (
              <div
                key={slot}
                role="listitem"
                tabIndex={0}
                className={"orow" + (off ? " hid" : "") + (over === slot ? " over" : "")}
                draggable={!locked}
                onDragStart={(e) => {
                  setDrag(slot);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", slot);
                }}
                onDragOver={(e) => {
                  if (!locked) {
                    e.preventDefault();
                    setOver(slot);
                  }
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(slot);
                }}
                onDragEnd={() => {
                  setDrag(null);
                  setOver(null);
                }}
                onKeyDown={(e) => {
                  if (locked) return;
                  if (e.altKey && e.key === "ArrowUp") nudge(slot, -1);
                  if (e.altKey && e.key === "ArrowDown") nudge(slot, 1);
                }}
              >
                <span className={locked ? "" : "grip"}>
                  <Icon n={locked ? "lock" : "grip"} s={14} c="var(--faint)" />
                </span>
                <span className="tilebox">
                  <Icon n={SLOT_ICONS[slot]} s={13} />
                </span>
                <span className="nm grow">{SLOT_NAMES[slot] || slot}</span>
                {locked ? (
                  <span className="muted" style={{ fontSize: 11 }}>
                    Brand kit
                  </span>
                ) : (
                  <>
                    <span className="muted tnum" style={{ fontSize: 11 }} title={`Used in ${n} ${mod.name} emails`}>
                      {n} of {mod.emails.length}
                    </span>
                    <Toggle
                      sm
                      on={!off}
                      label={(off ? "Show " : "Hide ") + (SLOT_NAMES[slot] || slot) + " in every email"}
                      onChange={(val) =>
                        act((d) => {
                          d.layout.off = val ? d.layout.off.filter((x) => x !== slot) : [...d.layout.off, slot];
                        })
                      }
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="note">
          <Icon n="info" s={15} />
          <span>Drag to reorder (or Alt + ↑/↓). The switch hides a block in every email. The count shows how many {mod.name} emails use it.</span>
        </div>
      </div>

      <div className="sec">
        <h3>Brand</h3>
        <div className="row" style={{ gap: 10 }}>
          <span className="mk" style={{ background: S.brand.color, width: 28, height: 28, borderRadius: 8, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, flex: "none" }}>
            {(S.brand.company || "A")[0]}
          </span>
          <span className="grow">
            <div style={{ fontWeight: 500 }}>{S.brand.company}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {S.brand.color.toUpperCase()} · {S.brand.radius} corners · {S.brand.button} buttons
            </div>
          </span>
        </div>
        <button type="button" className="btn" onClick={() => U({ view: "overview", side: "brand" })}>
          <Icon n="palette" s={15} />
          Open brand kit
        </button>
      </div>

      <div className="sec">
        <h3>Digests</h3>
        <div className="hint">Each persona has a digest template. Templates added to an hourly, daily, weekly or monthly summary are rounded up in it.</div>
        {digests.map((d) => {
          const n = bundledInto(mod, d).length;
          return (
            <button type="button" key={d.id} className="linkrow" onClick={() => U({ selEmail: d.id, emailId: d.id, selState: null, sel: null, scrollTo: d.id })}>
              <Icon n="cal" s={15} />
              <span className="grow">
                <div style={{ fontWeight: 500 }}>{d.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {timingText(d.timing)} · {n ? `${n} template${n > 1 ? "s" : ""}` : "not in use yet"}
                </div>
              </span>
              <Icon n="chevR" s={15} />
            </button>
          );
        })}
      </div>
    </>
  );
}
