import type { Email, Module } from "@/data/types";
import { Icon } from "@/lib/icons";
import { AUD, AUDDESC, AUDIENCES, bundledInto, isDigest, timingIcon, timingText } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { EmailStatusTag, Seg, Tag, Toggle } from "../ui";

/** One module's emails as a table, grouped by who receives them. Clicking a row opens it in the studio. */
export function ModuleEmails({ mod }: { mod: Module }) {
  const { ui, U, act, emailDirty, openStudio, nChanges } = useStudio();
  const dirty = mod.emails.filter((e) => emailDirty(mod.id, e.id)).length;
  const onCount = mod.emails.filter((e) => e.on).length;
  const f = ui.filter;
  const keep = (e: Email) => f === "all" || (f === "on" && e.on) || (f === "off" && !e.on) || (f === "draft" && emailDirty(mod.id, e.id));
  const groups = AUDIENCES.map((a) => ({
    key: a,
    label: AUD[a],
    desc: AUDDESC[a],
    icon: a === "employee" ? "user" : a === "approver" ? "users" : "sliders",
    list: [...mod.emails.filter((e) => !isDigest(e) && e.aud === a), ...mod.emails.filter((e) => isDigest(e) && e.aud === a)].filter(keep),
  })).filter((g) => g.list.length);
  const setOn = (id: string, val: boolean) =>
    act((d) => {
      d.modules.find((m) => m.id === mod.id)!.emails.find((x) => x.id === id)!.on = val;
    });

  return (
    <>
      <div className="modhead">
        <span className="tile" style={{ width: 44, height: 44, background: "var(--accent-soft)", color: "var(--accent)" }}>
          <Icon n={mod.icon} s={22} />
        </span>
        <div className="grow">
          <div className="row" style={{ flexWrap: "wrap" }}>
            <h2>{mod.name}</h2>
            {mod.on ? <Tag tone="green">Live</Tag> : <Tag>Module off</Tag>}
            {dirty > 0 && <Tag tone="amber">{dirty} with draft changes</Tag>}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {onCount} of {mod.emails.length} emails sending{mod.id === "reimb" ? "" : " · sample content"}
          </div>
        </div>
        {nChanges > 0 && (
          <button type="button" className="btn" onClick={() => U({ review: true })}>
            Review {nChanges} changes
          </button>
        )}
        <button type="button" className="btn primary" onClick={() => openStudio(mod.id, null, "content")}>
          Open studio
          <Icon n="arrowR" s={14} />
        </button>
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <Seg
          value={f}
          onChange={(x) => U({ filter: x })}
          opts={[
            { v: "all", l: "All " + mod.emails.length },
            { v: "on", l: "Sending " + onCount },
            { v: "draft", l: "Draft " + dirty },
            { v: "off", l: "Off " + (mod.emails.length - onCount) },
          ]}
        />
      </div>

      <div className="tblwrap">
        <table className="tbl">
          <colgroup>
            <col />
            <col style={{ width: 230 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 84 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Email</th>
              <th>When it sends</th>
              <th>Channels</th>
              <th>Status</th>
              <th>Send</th>
              <th aria-label="Open" />
            </tr>
          </thead>
          {groups.map(({ key, label, desc, icon, list }) => (
            <tbody key={key}>
              <tr className="grouprow">
                <td colSpan={6}>
                  <span className="ghead">
                    <span className="gicon">
                      <Icon n={icon} s={15} />
                    </span>
                    <b>{label}</b>
                    <span className="gcount">{list.length}</span>
                    <span className="gdesc">{desc}</span>
                  </span>
                </td>
              </tr>
              {list.map((e) => (
                <tr
                  key={e.id}
                  className={"erow" + (e.on && mod.on ? "" : " isoff")}
                  tabIndex={0}
                  onClick={() => openStudio(mod.id, e.id)}
                  onKeyDown={(ev) => ev.key === "Enter" && openStudio(mod.id, e.id)}
                >
                  <td>
                    <div className="nm">{e.name}</div>
                    <div className="sub">
                      {isDigest(e)
                        ? bundledInto(mod, e).length
                          ? "Summarises: " + bundledInto(mod, e).map((x) => x.name).join(", ")
                          : "Not in use yet: no template is part of a summary"
                        : e.trigger}
                    </div>
                  </td>
                  <td>
                    <span className="row muted" style={{ gap: 6 }}>
                      <Icon n={timingIcon(e.timing)} s={14} />
                      {timingText(e.timing)}
                    </span>
                  </td>
                  <td>
                    <span className="row" style={{ gap: 8, color: "var(--muted)" }}>
                      <span title="Email">
                        <Icon n="mail" s={15} />
                      </span>
                      {e.channels.inapp && (
                        <span title="In-app">
                          <Icon n="bell" s={15} />
                        </span>
                      )}
                      {e.channels.slack && (
                        <span title="Slack">
                          <Icon n="msg" s={15} />
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <EmailStatusTag
                      on={e.on}
                      dirty={emailDirty(mod.id, e.id)}
                      moduleOn={mod.on}
                      isNew={e.isNew}
                      digestEmpty={isDigest(e) && !bundledInto(mod, e).length}
                    />
                  </td>
                  <td>
                    <Toggle sm on={e.on} label={"Send " + e.name} onChange={(val) => setOn(e.id, val)} />
                  </td>
                  <td>
                    <span className="chev">
                      <Icon n="chevR" s={16} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
          {!groups.length && (
            <tbody>
              <tr>
                <td colSpan={6} className="empty">
                  No emails match this filter.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}
