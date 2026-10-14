import { Fragment, useState } from "react";
import type { Audience } from "@/data/types";
import { Icon } from "@/lib/icons";
import { same } from "@/lib/utils";
import { CH_ICON, onChannels, type Notif } from "@/v2/model";
import { use2 } from "@/v2/store";
import { SearchBar, Tag } from "@/v2/ui";
import { chrono, eventOf, isOff, PERSONAS, persona, STAGE_HINT, whenOf } from "./journey";

/* Version 3 · a product's notifications, before the editor. Two layouts: a chronological table, or a timeline. */

export function Avatar({ aud, s = 22 }: { aud: Audience; s?: number }) {
  const p = persona(aud);
  return (
    <span className="n3-av" style={{ width: s, height: s, background: p.color }} aria-hidden="true">
      <Icon n={p.icon} s={Math.round(s * 0.55)} c="#fff" w={2.2} />
    </span>
  );
}

function useOpen() {
  const { setUi } = use2();
  return (n: Notif) => setUi({ view: "editor", persona: n.aud, notifId: n.id, variantId: n.variants[0].id, channel: "email" });
}

/** Layout 1 · one table in the order a request moves, with the stage as a rail on the left. */
function Table({ who }: { who: Audience | "all" }) {
  const { S, product } = use2();
  const open = useOpen();
  const all = chrono(product).filter((n) => who === "all" || n.aud === who);
  const hints = STAGE_HINT[product.id] || [];
  const groups = [...product.stages.slice(0, 5).map((s, i) => ({ i, name: s, hint: hints[i], list: all.filter((n) => n.stage === i) })), { i: 5, name: "Every morning", hint: "Summaries, for anyone who gets them", list: all.filter((n) => n.stage === 5) }];
  return (
    <div className="n3-table" role="table" aria-label={`${product.name} notifications, in order`}>
      <div className="n3-tr n3-th" role="row">
        <span />
        <span>Notification</span>
        <span>Who’s told</span>
        <span>Channels</span>
        <span>When</span>
        <span>Status</span>
        <span />
      </div>
      {groups.map((g, gi) => (
        <Fragment key={g.i}>
          <div className={"n3-tr n3-ts" + (g.i === 5 ? " sum" : "") + (gi === groups.length - 1 ? " last" : "")} role="row">
            <span className="rail">
              <i>{g.i === 5 ? <Icon n="cal" s={12} c="#fff" w={2.2} /> : g.i + 1}</i>
            </span>
            <span className="st">
              <b>{g.name}</b>
              {g.hint && <span className="muted">{g.hint}</span>}
            </span>
          </div>
          {g.list.length === 0 && (
            <div className={"n3-tr n3-tn" + (gi === groups.length - 1 ? " last" : "")} role="row">
              <span className="rail" />
              <span className="faint">Nobody {who === "all" ? "" : `(${persona(who as Audience).many.toLowerCase()}) `}is told at this step.</span>
            </div>
          )}
          {g.list.map((n, ni) => {
            const off = isOff(n, S.channels);
            const ch = onChannels(n, S.channels);
            return (
              <button type="button" key={n.id} className={"n3-tr n3-trow" + (off ? " off" : "") + (gi === groups.length - 1 && ni === g.list.length - 1 ? " last" : "")} role="row" onClick={() => open(n)}>
                <span className="rail" />
                <span className="nm">
                  <b>{n.name}</b>
                  <span className="muted">{eventOf(n)}</span>
                </span>
                <span className="who">
                  <Avatar aud={n.aud} s={20} />
                  {persona(n.aud).one}
                </span>
                <span className="ch">
                  {ch.length ? ch.map((c) => <Icon key={c} n={CH_ICON[c]} s={15} />) : <span className="faint">—</span>}
                </span>
                <span className="when">{whenOf(n, S.channels)}</span>
                <span className="status">{off ? <Tag>Off</Tag> : <><i className="on" /> On</>}</span>
                <span className="go">
                  <span className="open">Open</span>
                  <Icon n="chevR" s={16} />
                </span>
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

/** Layout 2 · stages across the top; one line per person, with a stop wherever they hear something. */
function Timeline() {
  const { S, product } = use2();
  const open = useOpen();
  const stages = product.stages.slice(0, 5);
  const hints = STAGE_HINT[product.id] || [];
  const lanes = PERSONAS.filter((p) => product.notifs.some((n) => n.aud === p.aud));
  const cols = [...stages.map((_, i) => i), 5];
  return (
    <div className="n3-tl-wrap">
      <div className="n3-tl" style={{ gridTemplateColumns: `140px repeat(${stages.length}, minmax(148px, 1fr)) minmax(176px, 1fr)` }}>
        <span className="hd lab" />
        {stages.map((s, i) => (
          <div className={"hd step" + (i === 0 ? " first" : "")} key={s}>
            <span className="n3-node">{i + 1}</span>
            <b>{s}</b>
            {hints[i] && <small>{hints[i]}</small>}
          </div>
        ))}
        <div className="hd step sum">
          <span className="n3-node">
            <Icon n="cal" s={12} c="#fff" w={2.2} />
          </span>
          <b>Every morning</b>
          <small>A summary of what changed</small>
        </div>
        {lanes.map((l) => {
          const mine = product.notifs.filter((n) => n.aud === l.aud && n.stage < 5);
          const first = Math.min(...mine.map((n) => n.stage));
          const last = Math.max(...mine.map((n) => n.stage));
          return (
            <Fragment key={l.aud}>
              <div className="n3-lane lab">
                <Avatar aud={l.aud} s={26} />
                <span>
                  <b>{l.many}</b>
                  <small>{product.notifs.filter((n) => n.aud === l.aud).length} in total</small>
                </span>
              </div>
              {cols.map((ci) => {
                const here = product.notifs.filter((n) => n.aud === l.aud && n.stage === ci);
                const line = ci < 5 && mine.length > 0 && ci >= first && ci <= last;
                return (
                  <div key={ci} className={"n3-lane n3-cell" + (ci === 5 ? " sum" : "") + (line ? " line" : "") + (line && ci === first ? " from" : "") + (line && ci === last ? " to" : "")} style={{ ["--lc" as string]: l.color }}>
                    {here.map((n, k) => {
                      const off = isOff(n, S.channels);
                      return (
                        <button type="button" key={n.id} className={"n3-stop" + (off ? " off" : "") + (n.summary ? " summary" : "")} onClick={() => open(n)}>
                          {k === 0 && <span className="n3-dot" />}
                          <span className="t">
                            {n.name}
                            {off && <Tag>Off</Tag>}
                          </span>
                          <span className="m">
                            <span className="grow">{whenOf(n, S.channels)}</span>
                            {onChannels(n, S.channels).map((c) => (
                              <Icon key={c} n={CH_ICON[c]} s={13} />
                            ))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
      <p className="n3-legend">
        <span className="ln" /> Each line is one person’s path through a request. A stop is a notification they get at that step — open any one to see and change it.
      </p>
    </div>
  );
}

export function ProductPage() {
  const { product, setUi, ui, DEF } = use2();
  const [who, setWho] = useState<Audience | "all">("all");
  const edited = !same(product, DEF.products.find((x) => x.id === product.id));
  const counts = (a: Audience) => product.notifs.filter((n) => n.aud === a).length;
  return (
    <div className="n2-page">
      <SearchBar />
      <div className={"n3-product" + (ui.listLayout === "timeline" ? " wide" : "")}>
        <button type="button" className="n2-back" onClick={() => setUi({ view: "home" })}>
          <Icon n="arrowL" s={15} />
          Notifications
        </button>
        <div className="n3-title">
          <h1 className="n2-h1">{product.name}</h1>
          {edited ? <Tag tone="sky">Edited just now</Tag> : product.id === "reimb" ? <Tag tone="sky">Edited 2 days ago</Tag> : <Tag>Default</Tag>}
          <span className="grow" />
          <div className="n3-seg" role="tablist" aria-label="Layout">
            <button type="button" role="tab" aria-selected={ui.listLayout === "table"} className={ui.listLayout === "table" ? "on" : ""} onClick={() => setUi({ listLayout: "table" })}>
              <Icon n="list" s={15} />
              List
            </button>
            <button type="button" role="tab" aria-selected={ui.listLayout === "timeline"} className={ui.listLayout === "timeline" ? "on" : ""} onClick={() => setUi({ listLayout: "timeline" })}>
              <Icon n="layout" s={15} />
              Timeline
            </button>
          </div>
        </div>
        <p className="n3-sub">What people hear about as a request moves from start to finish. Open any notification to see the message and change it.</p>
        {ui.listLayout === "table" ? (
          <>
            <div className="n3-chips" role="tablist" aria-label="Who’s told">
              {[["all", "Everyone", product.notifs.length] as const, ...PERSONAS.filter((p) => counts(p.aud)).map((p) => [p.aud, p.many, counts(p.aud)] as const)].map(([k, l, n]) => (
                <button type="button" role="tab" aria-selected={who === k} key={k} className={"n3-pchip" + (who === k ? " on" : "")} onClick={() => setWho(k as Audience | "all")}>
                  {l} <span className="faint">{n}</span>
                </button>
              ))}
            </div>
            <Table who={who} />
          </>
        ) : (
          <Timeline />
        )}
      </div>
    </div>
  );
}
