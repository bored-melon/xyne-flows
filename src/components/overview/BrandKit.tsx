import { useEffect, useState } from "react";
import type { Brand } from "@/data/types";
import { makeVars } from "@/data/scenarios";
import { Icon } from "@/lib/icons";
import { contrastOnWhite, PALETTE } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { MailView } from "../email/MailView";
import { Scope, Seg } from "../ui";

/** Emails shown on the live preview wall, across modules. */
const WALL: [string, string][] = [
  ["reimb", "r-sub"],
  ["reimb", "r-appr"],
  ["reimb", "r-paid"],
  ["travel", "travel-5"],
  ["cards", "cards-3"],
  ["proc", "proc-3"],
];

/** Hex field that only commits complete, valid colours. */
function HexInput({ value, onValid }: { value: string; onValid: (hex: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      id="bk-hex"
      className="input tnum"
      aria-label="Brand colour hex"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const x = e.target.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(x)) onValid(x.toUpperCase());
      }}
    />
  );
}

/** Global brand kit: one look for every notification in every module. */
export function BrandKit() {
  const { S, act, U, nChanges } = useStudio();
  const b = S.brand;
  const set = <K extends keyof Brand>(k: K, val: Brand[K]) =>
    act((d) => {
      d.brand[k] = val;
    }, k);
  const ratio = contrastOnWhite(b.color);
  const ok = ratio >= 4.5;
  const v = makeVars("mixed", b);
  const total = S.modules.reduce((a, m) => a + m.emails.length, 0);

  return (
    <>
      <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="grow">
          <div className="row">
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Brand kit</h2>
            <Scope k="Brand" />
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            One look for every notification, across all 5 modules · {total} emails
          </div>
        </div>
        {nChanges > 0 && (
          <button type="button" className="btn primary" onClick={() => U({ review: true })}>
            Review & publish<span className="count">{nChanges}</span>
          </button>
        )}
      </div>

      <div className="bk">
        <div className="panel">
          <div className="sec">
            <h3>Identity</h3>
            <div className="field">
              <label className="lab" htmlFor="bk-co">
                Company name
              </label>
              <input id="bk-co" className="input" value={b.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div className="row" style={{ gap: 10, padding: "10px 12px", border: "1px dashed var(--line)", borderRadius: 10 }}>
              <Icon n="upload" s={16} />
              <span className="grow" style={{ fontSize: 13 }}>
                Upload a logo
                <div className="hint">SVG or PNG. Until then, your initial is used.</div>
              </span>
            </div>
            <div className="row" style={{ gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div className="field grow" style={{ minWidth: 130 }}>
                <label className="lab" htmlFor="bk-se">
                  Sender name
                </label>
                <input id="bk-se" className="input" value={b.sender} onChange={(e) => set("sender", e.target.value)} />
              </div>
              <div className="field grow" style={{ minWidth: 130 }}>
                <label className="lab" htmlFor="bk-rt">
                  Reply-to
                </label>
                <input id="bk-rt" className="input" value={b.replyTo} onChange={(e) => set("replyTo", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="sec">
            <h3>Brand colour</h3>
            <div className="row">
              <span style={{ width: 34, height: 34, borderRadius: 8, flex: "none", background: b.color }} />
              <HexInput value={b.color} onValid={(x) => set("color", x)} />
              <span className={"badge " + (ok ? "green" : "amber")}>
                {ok ? "AA" : "Low"} {ratio.toFixed(1)}:1
              </span>
            </div>
            <div className="swatches">
              {PALETTE.map((p) => (
                <button
                  type="button"
                  key={p}
                  aria-label={"Use " + p}
                  aria-pressed={b.color.toUpperCase() === p ? "true" : "false"}
                  style={{ background: p }}
                  onClick={() => set("color", p)}
                />
              ))}
            </div>
            <div className="hint">
              Used for buttons, links, the timeline and highlights. Status colours (approved, flagged, rejected) stay fixed so their meaning never
              changes.{ok ? "" : " This colour is hard to read as button text on white."}
            </div>
          </div>

          <div className="sec">
            <h3>Shape</h3>
            <div className="field">
              <span className="lab">Corners</span>
              <Seg
                sm
                value={b.radius}
                onChange={(x) => set("radius", x)}
                opts={[
                  { v: "square", l: "Square" },
                  { v: "soft", l: "Soft" },
                  { v: "round", l: "Round" },
                ]}
              />
            </div>
            <div className="field">
              <span className="lab">Buttons</span>
              <Seg
                sm
                value={b.button}
                onChange={(x) => set("button", x)}
                opts={[
                  { v: "filled", l: "Filled" },
                  { v: "outline", l: "Outline" },
                ]}
              />
            </div>
          </div>

          <div className="sec">
            <h3>Illustrations</h3>
            <Seg
              sm
              value={b.illustrations}
              onChange={(x) => set("illustrations", x)}
              opts={[
                { v: "product", l: "Product set" },
                { v: "none", l: "None" },
              ]}
            />
            <div className="hint">Each email picks its own illustration from the set in the studio.</div>
          </div>

          <div className="sec">
            <h3>Footer</h3>
            <input id="bk-ft" className="input" value={b.footer} onChange={(e) => set("footer", e.target.value)} />
            <div className="row hint">
              <Icon n="lock" s={12} />
              The notification settings link is always included.
            </div>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <b style={{ fontWeight: 600 }}>Live preview</b>
            <span className="muted" style={{ fontSize: 13 }}>
              Real emails from 4 modules
            </span>
          </div>
          <div className="wall">
            {WALL.map(([mid, eid]) => {
              const m = S.modules.find((x) => x.id === mid)!;
              const e = m.emails.find((x) => x.id === eid)!;
              return (
                <div key={eid}>
                  <div className="cap">
                    {m.name} · {e.name}
                  </div>
                  <div className="frame">
                    <MailView email={e} v={v} brand={b} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
