import type { ReactNode } from "react";
import type { Block, BlockProps, CaseKey } from "@/data/types";
import { activeCase, CASES } from "@/data/scenarios";
import { Icon } from "@/lib/icons";
import { blockName, bundledInto, ILLS, isData, isLocked, statesOf } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { ChipEditor, ChipField, Tok } from "../chips";
import { brandStyle } from "../email/MailView";
import { Illustration } from "../email/Illustration";
import { Scope, Seg, Toggle } from "../ui";

const LAYOUTS: [NonNullable<BlockProps["layout"]>, string, ReactNode][] = [
  [
    "notes",
    "With notes",
    <div className="mini" key="n">
      <i style={{ width: "70%" }} />
      <i className="n" />
      <i style={{ width: "70%" }} />
      <i className="n" />
    </div>,
  ],
  [
    "compact",
    "Compact",
    <div className="mini" key="c">
      <i />
      <i />
      <i />
      <i />
    </div>,
  ],
  [
    "totals",
    "Totals only",
    <div className="mini" key="t">
      <i style={{ width: "40%" }} />
      <i className="b" />
    </div>,
  ],
];

const LIST_FIELDS: [keyof NonNullable<BlockProps["fields"]>, string][] = [
  ["logo", "Merchant logo"],
  ["status", "Status chip"],
  ["note", "Approver’s note"],
  ["category", "Category"],
  ["date", "Expense date"],
];

/** Inspector for the selected block. */
export function BlockPanel({ b }: { b: Block }) {
  const { v, upEmail, U, S, ui, mod, email } = useStudio();
  const p = b.props;
  const set = (fn: (props: BlockProps) => void, key?: string) => upEmail((e) => fn(e.blocks.find((x) => x.id === b.id)!.props), key);
  const locked = isLocked(b.type);

  const head = (
    <div className="head">
      <div className="row">
        <button type="button" className="ibtn sm" aria-label="Back to email" onClick={() => U({ sel: null })}>
          <Icon n="back" s={15} />
        </button>
        <h2 className="grow">{blockName(b)}</h2>
        {!locked && (
          <button
            type="button"
            className="ibtn sm"
            aria-label="Hide block"
            title="Hide block"
            onClick={() => {
              upEmail((e) => {
                e.blocks.find((x) => x.id === b.id)!.hidden = true;
              });
              U({ sel: null });
            }}
          >
            <Icon n="eyeOff" s={15} />
          </button>
        )}
        {b.type === "note" && b.id.startsWith("p") && (
          <button
            type="button"
            className="ibtn sm"
            aria-label="Delete block"
            title="Delete"
            onClick={() => {
              upEmail((e) => {
                e.blocks = e.blocks.filter((x) => x.id !== b.id);
              });
              U({ sel: null });
            }}
          >
            <Icon n="trash" s={15} />
          </button>
        )}
      </div>
      <div className="row" style={{ gap: 6 }}>
        {locked ? <Scope k="Brand" /> : isData(b.type) ? <Scope k="Data" /> : <Scope k="Email" />}
        <span className="muted" style={{ fontSize: 11 }}>
          {locked ? "Set once in the brand kit" : isData(b.type) ? "Values come from the request; you choose what shows" : "Copy for this email"}
        </span>
      </div>
    </div>
  );

  let body: ReactNode = null;

  if (locked) {
    body = (
      <div className="sec">
        <div className="note">
          <Icon n="lock" s={15} />
          <span>The {blockName(b).toLowerCase()} is shared by every email so they stay consistent. Change it in the brand kit.</span>
        </div>
        <button type="button" className="btn" onClick={() => U({ view: "overview", side: "brand" })}>
          <Icon n="palette" s={15} />
          Open brand kit
        </button>
      </div>
    );
  } else if (b.type === "headline") {
    const ci = activeCase(p, v);
    const st = statesOf(email).find((x) => x.id === ui.selState) || statesOf(email)[0];
    const scenarioLabel = st.label;
    body = (
      <>
        <div className="sec">
          <h3>Text</h3>
          <ChipField
            label={ci >= 0 ? "Headline (otherwise)" : "Headline"}
            value={p.text}
            v={v}
            onChange={(t) =>
              set((x) => {
                x.text = t;
              }, "hl--1")
            }
            right={
              <span className="muted tnum" style={{ fontSize: 11 }}>
                {p.text.replace(/\{\w+\}/g, "00").length}/60
              </span>
            }
          />
          <ChipField
            label="Subtext"
            value={p.sub}
            v={v}
            onChange={(t) =>
              set((x) => {
                x.sub = t;
              }, "hl-sub")
            }
          />
        </div>
        <div className="sec">
          <h3>Says it differently when…</h3>
          <div className="hint">The first case that matches the request is used. Otherwise, the headline above.</div>
          {p.cases!.map((cs, i) => (
            <div key={i} className={"case" + (i === ci ? " live" : "")}>
              <div className="row">
                <select
                  className="input"
                  style={{ height: 28, width: "auto", fontSize: 12 }}
                  aria-label="Condition"
                  value={cs.when}
                  onChange={(e) =>
                    set((x) => {
                      x.cases![i].when = e.target.value as CaseKey;
                    })
                  }
                >
                  {(Object.entries(CASES) as [CaseKey, string][]).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
                <span className="grow" />
                {i === ci && <span className="badge blue">Previewing</span>}
                <button
                  type="button"
                  className="ibtn sm"
                  aria-label="Remove case"
                  onClick={() =>
                    set((x) => {
                      x.cases!.splice(i, 1);
                    })
                  }
                >
                  <Icon n="trash" s={14} />
                </button>
              </div>
              <ChipEditor
                value={cs.text}
                onChange={(t) =>
                  set((x) => {
                    x.cases![i].text = t;
                  }, "hl-" + i)
                }
                label={"Headline when " + CASES[cs.when]}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn sm"
            onClick={() =>
              set((x) => {
                const used = x.cases!.map((c) => c.when);
                const w = (Object.keys(CASES) as CaseKey[]).find((k) => !used.includes(k)) || "one";
                x.cases!.push({ when: w, text: x.text });
              })
            }
          >
            <Icon n="plus" s={14} />
            Add a case
          </button>
          {ci < 0 && <div className="hint">No case matches the “{scenarioLabel}” state, so the main headline shows.</div>}
        </div>
        <div className="sec">
          <h3>Style</h3>
          <div className="field">
            <span className="lab">Alignment</span>
            <Seg
              sm
              value={p.align}
              onChange={(x) =>
                set((y) => {
                  y.align = x;
                })
              }
              opts={[
                { v: "left", l: "Left" },
                { v: "center", l: "Centre" },
              ]}
            />
          </div>
        </div>
      </>
    );
  } else if (b.type === "list") {
    body = (
      <>
        <div className="sec">
          <h3>Content</h3>
          <div className="field">
            <label className="lab" htmlFor={"h-" + b.id}>
              Heading
            </label>
            <input
              id={"h-" + b.id}
              className="input"
              value={p.heading}
              onChange={(e) =>
                set((x) => {
                  x.heading = e.target.value;
                }, "heading")
              }
            />
          </div>
          <div className="field">
            <span className="lab">Shows</span>
            <div className="input row" style={{ background: "var(--sunk)", color: "var(--muted)" }}>
              <span className="grow">
                {p.source === "need" ? "Claims flagged or partly approved" : p.source === "rejected" ? "Rejected claims" : "Every claim in the request"}
              </span>
              <Icon n="lock" s={13} />
            </div>
            <div className="hint">Decided by the approval workflow.</div>
          </div>
        </div>
        <div className="sec">
          <h3>Layout</h3>
          <div className="layouts">
            {LAYOUTS.map(([k, l, mini]) => (
              <button
                type="button"
                key={k}
                aria-pressed={p.layout === k ? "true" : "false"}
                onClick={() =>
                  set((x) => {
                    x.layout = k;
                  })
                }
              >
                {mini}
                {l}
              </button>
            ))}
          </div>
        </div>
        {p.layout !== "totals" && (
          <>
            <div className="sec">
              <h3>Show for each claim</h3>
              {LIST_FIELDS.filter(([k]) => k !== "note" || p.layout === "notes").map(([k, l]) => (
                <div className="row" key={k}>
                  <span className="grow">{l}</span>
                  <Toggle
                    sm
                    on={p.fields![k]}
                    label={l}
                    onChange={(val) =>
                      set((x) => {
                        x.fields![k] = val;
                      })
                    }
                  />
                </div>
              ))}
              <div className="row">
                <span className="grow muted">Amount</span>
                <Icon n="lock" s={13} c="var(--faint)" />
              </div>
            </div>
            <div className="sec">
              <h3>Long lists</h3>
              <div className="row" style={{ flexWrap: "wrap" }}>
                Show first
                <input
                  id={"max-" + b.id}
                  type="number"
                  min={1}
                  max={20}
                  aria-label="Claims to show"
                  className="input num tnum"
                  value={p.max}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(20, +e.target.value || 1));
                    set((x) => {
                      x.max = n;
                    }, "max");
                  }}
                />
                claims, then “+ N more”
              </div>
            </div>
          </>
        )}
        <div className="sec">
          <h3>When there’s nothing to show</h3>
          <Seg
            sm
            value={p.empty}
            onChange={(x) =>
              set((y) => {
                y.empty = x;
              })
            }
            opts={[
              { v: "hide", l: "Hide block" },
              { v: "message", l: "Show a message" },
            ]}
          />
        </div>
      </>
    );
  } else if (b.type === "details") {
    body = (
      <div className="sec">
        <h3>Rows</h3>
        {p.rows!.map((r, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="row">
              <Icon n={r.icon} s={15} c="var(--muted)" />
              <input
                id={"dr-" + i}
                className="input grow"
                style={{ height: 30 }}
                value={r.label}
                aria-label="Row label"
                onChange={(e) =>
                  set((x) => {
                    x.rows![i].label = e.target.value;
                  }, "dr" + i)
                }
              />
              <Toggle
                sm
                on={r.on}
                label={"Show " + r.label}
                onChange={(val) =>
                  set((x) => {
                    x.rows![i].on = val;
                  })
                }
              />
            </div>
            <div className="hint" style={{ marginLeft: 23 }}>
              Value: <Tok t={r.value} />
            </div>
          </div>
        ))}
        <div className="hint">Labels are yours. Values come from the request.</div>
      </div>
    );
  } else if (b.type === "amount") {
    body = (
      <div className="sec">
        <h3>Content</h3>
        <div className="field">
          <label className="lab" htmlFor="amt-l">
            Label
          </label>
          <input
            id="amt-l"
            className="input"
            value={p.label}
            onChange={(e) =>
              set((x) => {
                x.label = e.target.value;
              }, "amt")
            }
          />
        </div>
        <div className="row">
          <span className="grow">Show approved / needs action / rejected</span>
          <Toggle
            sm
            on={p.breakdown}
            label="Breakdown"
            onChange={(val) =>
              set((x) => {
                x.breakdown = val;
              })
            }
          />
        </div>
      </div>
    );
  } else if (b.type === "timeline") {
    body = (
      <div className="sec">
        <h3>Steps</h3>
        <div className="note">
          <Icon n="zap" s={15} />
          <span>Steps come from the approval workflow, so they always match what really happened to the request.</span>
        </div>
        <div className="row">
          <span className="grow">Show dates and status under each step</span>
          <Toggle
            sm
            on={p.dates}
            label="Show dates"
            onChange={(val) =>
              set((x) => {
                x.dates = val;
              })
            }
          />
        </div>
      </div>
    );
  } else if (b.type === "illustration") {
    body = (
      <div className="sec">
        <h3>Illustration</h3>
        <div className="illgrid" style={brandStyle(S.brand)}>
          {ILLS.map((k) => (
            <button
              type="button"
              key={k}
              aria-label={k}
              aria-pressed={p.kind === k ? "true" : "false"}
              onClick={() =>
                set((x) => {
                  x.kind = k;
                })
              }
            >
              <Illustration k={k} />
            </button>
          ))}
        </div>
        <div className="hint">Colours follow the brand kit.</div>
      </div>
    );
  } else if (b.type === "button") {
    body = (
      <div className="sec">
        <h3>Button</h3>
        <ChipField
          label="Label"
          value={p.label}
          v={v}
          onChange={(t) =>
            set((x) => {
              x.label = t;
            }, "btn")
          }
        />
        <div className="field">
          <span className="lab">Opens</span>
          <div className="input row" style={{ background: "var(--sunk)", color: "var(--muted)" }}>
            <span className="grow">This request in Xyne Flow</span>
            <Icon n="lock" s={13} />
          </div>
        </div>
      </div>
    );
  } else if (b.type === "digest") {
    const bundled = bundledInto(mod, email);
    body = (
      <div className="sec">
        <h3>Digest updates</h3>
        <div className="field">
          <label className="lab" htmlFor="dg-h">
            Heading
          </label>
          <input
            id="dg-h"
            className="input"
            value={p.heading}
            onChange={(e) =>
              set((x) => {
                x.heading = e.target.value;
              }, "dg-h")
            }
          />
        </div>
        <div className="row">
          <span className="grow">Show when each update happened</span>
          <Toggle
            sm
            on={p.showTime}
            label="Show time"
            onChange={(val) =>
              set((x) => {
                x.showTime = val;
              })
            }
          />
        </div>
        <div className="note">
          <Icon n="zap" s={15} />
          <span>
            Lists one line per update, using each bundled email’s headline. Right now:{" "}
            {bundled.length ? bundled.map((e) => e.name).join(", ") : "no emails go into summaries"}.
          </span>
        </div>
      </div>
    );
  } else if (b.type === "note") {
    body = (
      <div className="sec">
        <h3>Paragraph</h3>
        <ChipField
          label="Text"
          value={p.text}
          v={v}
          onChange={(t) =>
            set((x) => {
              x.text = t;
            }, "note")
          }
        />
      </div>
    );
  }

  return (
    <>
      {head}
      {body}
    </>
  );
}
