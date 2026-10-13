import { Icon } from "@/lib/icons";
import { AUD, AUDIENCES, isDigest } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { Seg, Tag } from "../ui";
import { ContentTab } from "./ContentTab";
import { DeliveryTab } from "./DeliveryTab";

/** Full-screen studio for one module. Content = Direction A, Delivery = journey map. */
export function Studio() {
  const { ui, U, mod, email, undo, redo, canUndo, canRedo, nChanges, toast, emailDirty } = useStudio();
  const inContent = ui.tab === "content";
  const showStatus = !inContent || !!ui.selEmail;
  const dirty = emailDirty(mod.id, email.id);

  return (
    <div className="studio">
      <header className="topbar">
        <button type="button" className="ibtn" aria-label="Close studio" onClick={() => U({ view: "overview", side: mod.id })}>
          <Icon n="x" s={18} />
        </button>
        <span className="vbar" />
        <div className="crumb">
          <span>{mod.name}</span>
          <Icon n="chevR" s={14} />
          <select
            id="email-switch"
            aria-label="Select an email"
            value={inContent ? ui.selEmail || "" : email.id}
            onChange={(e) => {
              const id = e.target.value;
              U(id ? { selEmail: id, emailId: id, selState: null, sel: null, scrollTo: id } : { selEmail: null, selState: null, sel: null });
            }}
          >
            {inContent && <option value="">All templates</option>}
            {AUDIENCES.map((a) => {
              const list = [...mod.emails.filter((x) => x.aud === a && !isDigest(x)), ...mod.emails.filter((x) => x.aud === a && isDigest(x))];
              return list.length ? (
                <optgroup key={a} label={AUD[a]}>
                  {list.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </div>
        {showStatus && (dirty ? <Tag tone="amber">Draft</Tag> : <Tag tone="green">Live</Tag>)}
        <span className="grow" />
        <div className="tabs-wrap">
          <Seg
            value={ui.tab}
            onChange={(t) => U((u) => ({ tab: t, sel: null, scrollTo: t === "content" ? u.selEmail : null }))}
            opts={[
              { v: "content", l: "Content", i: "type" },
              { v: "delivery", l: "Delivery", i: "zap" },
            ]}
          />
        </div>
        <span className="grow" />
        <button type="button" className="ibtn" aria-label="Undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>
          <Icon n="undo" />
        </button>
        <button type="button" className="ibtn" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo}>
          <Icon n="redo" />
        </button>
        <span className="vbar" />
        <button
          type="button"
          className="btn"
          onClick={() => {
            U({ tested: true });
            toast("Test email sent to you (prototype — nothing is actually sent)");
          }}
        >
          <Icon n="send" s={15} />
          Send test
        </button>
        <button type="button" className="btn primary" disabled={!nChanges} onClick={() => U({ review: true })}>
          Review & publish
          {nChanges > 0 && <span className="count">{nChanges}</span>}
        </button>
      </header>
      {ui.tab === "content" ? <ContentTab /> : <DeliveryTab />}
    </div>
  );
}
