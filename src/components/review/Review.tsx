import { useState } from "react";
import type { ChangeGroup } from "@/data/types";
import { Icon } from "@/lib/icons";
import { clone } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { Tok } from "../chips";
import { Scope } from "../ui";

function Val({ t }: { t?: string }) {
  if (!t) return <>—</>;
  return /\{\w+\}/.test(t) ? <Tok t={t} /> : <>{t}</>;
}

/** Review & publish: before/after for every change, plus the checks an admin ran. */
export function Review() {
  const { changes, nChanges, ui, U, act, pub, publish } = useStudio();
  const [note, setNote] = useState("");

  const discard = (g: ChangeGroup) =>
    act((d) => {
      if (g.key === "brand") d.brand = clone(pub.brand);
      else if (g.key === "layout") d.layout = clone(pub.layout);
      else if (g.key.startsWith("mod-")) {
        const id = g.key.slice(4);
        d.modules.find((m) => m.id === id)!.on = pub.modules.find((m) => m.id === id)!.on;
      } else {
        const m = d.modules.find((x) => x.id === g.mid)!;
        const i = m.emails.findIndex((x) => x.id === g.eid);
        m.emails[i] = clone(pub.modules.find((x) => x.id === g.mid)!.emails.find((x) => x.id === g.eid)!);
      }
    });

  return (
    <div className="scrim" onClick={() => U({ review: false })}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rv-t" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ padding: "18px 24px", borderBottom: "1px solid var(--line)" }}>
          <div className="grow">
            <div id="rv-t" style={{ fontSize: 19, fontWeight: 600 }}>
              Review changes before publishing
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {nChanges
                ? `${nChanges} change${nChanges > 1 ? "s" : ""} across ${changes.length} item${changes.length > 1 ? "s" : ""}`
                : "Nothing to publish — everything matches what’s live."}
            </div>
          </div>
          <button type="button" className="ibtn" aria-label="Close" onClick={() => U({ review: false })}>
            <Icon n="x" s={18} />
          </button>
        </div>

        <div className="rvbody">
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            {changes.map((g) => (
              <div className="chg" key={g.key}>
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <Icon n={g.scope === "Brand" ? "palette" : "mail"} s={15} />
                  <b style={{ fontWeight: 600 }}>{g.title}</b>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {g.sub}
                  </span>
                  <span className="grow" />
                  <Scope k={g.scope} />
                  {g.eid && (
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => U({ review: false, view: "studio", moduleId: g.mid, emailId: g.eid, tab: "content", sel: null })}
                    >
                      Open
                    </button>
                  )}
                  <button type="button" className="btn sm ghost" onClick={() => discard(g)}>
                    Discard
                  </button>
                </div>
                {g.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{it.label}</span>
                    {it.before != null && (
                      <div className="diff minus">
                        <span className="sign">−</span>
                        <span className="t">
                          <Val t={it.before} />
                        </span>
                      </div>
                    )}
                    {it.after != null && (
                      <div className="diff plus">
                        <span className="sign">+</span>
                        <span>
                          <Val t={it.after} />
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ padding: 20, background: "var(--bg)", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 16 }}>
            <b style={{ fontSize: 13, fontWeight: 600 }}>Before you publish</b>
            <div className="check">
              <Icon n={ui.tested ? "check" : "alert"} s={16} c={ui.tested ? "var(--green)" : "var(--amber)"} w={2.2} />
              <span>
                <div style={{ fontWeight: 500 }}>{ui.tested ? "Test email sent to you" : "No test sent yet"}</div>
                <div className="hint">{ui.tested ? "Prototype: nothing actually left this page." : "Use “Send test” in the studio to see it in your inbox."}</div>
              </span>
            </div>
            <div className="check">
              <Icon n="info" s={16} c="var(--muted)" w={2.2} />
              <span>
                <div style={{ fontWeight: 500 }}>Check every state</div>
                <div className="hint">Each template’s states (1 claim, many claims…) are shown side by side on the canvas.</div>
              </span>
            </div>
            <div className="field">
              <label className="lab" htmlFor="rv-note">
                Note for version history
              </label>
              <input id="rv-note" className="input" placeholder="What changed and why" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="row hint">
              <Icon n="history" s={13} />
              Every publish is saved as a version you can restore.
            </div>
          </div>
        </div>

        <div className="row" style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => U({ review: false })}>
            Keep editing
          </button>
          <button type="button" className="btn primary" disabled={!nChanges} onClick={() => publish(note)}>
            Publish {nChanges || ""} change{nChanges === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
