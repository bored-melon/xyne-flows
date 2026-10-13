import { Icon } from "@/lib/icons";
import { AUD, blockIcon, blockName, bundledInto, digestFor, enabledFreqs, FREQ_LABEL, freqText, isDigest, isLocked, orderedBlocks, resolve, statesOf, timingIcon, timingText } from "@/lib/utils";
import { useStudio } from "@/state/StudioContext";
import { ChipField } from "../chips";
import { EmailStatusTag, Scope, Toggle } from "../ui";

/** Properties for the selected email: subject, preheader, which blocks it shows, and its delivery. */
export function EmailPanel() {
  const { S, email, v, upEmail, U, ui, mod, emailDirty } = useStudio();
  const digest = isDigest(email);
  const bundled = digest ? bundledInto(mod, email) : [];
  const freqs = !digest && email.timing.type === "event" ? email.timing.freqs || [] : [];
  const dg = freqs.length ? digestFor(mod, email) : undefined;
  const states = statesOf(email);
  const open = (id: string, sid?: string) => U({ selEmail: id, emailId: id, selState: sid || null, sel: null, scrollTo: sid ? id + ":" + sid : id });

  return (
    <>
      <div className="head">
        <div className="row">
          <button type="button" className="ibtn sm" aria-label="Back to all emails" title="Back to all emails (Esc)" onClick={() => U({ selEmail: null, sel: null })}>
            <Icon n="back" s={15} />
          </button>
          <h2 className="grow">{email.name}</h2>
          <EmailStatusTag on={email.on} dirty={emailDirty(mod.id, email.id)} moduleOn={mod.on} isNew={email.isNew} digestEmpty={digest && !bundled.length} />
        </div>
        <div className="sendrow">
          <span className="grow">
            <div style={{ fontWeight: 500 }}>Send this template</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {email.on ? (mod.on ? "On. Recipients get it when it triggers." : "On, but " + mod.name + " is off for your organisation.") : "Off. Nobody gets this email."}
            </div>
          </span>
          <Toggle
            on={email.on}
            label={"Send " + email.name}
            onChange={(val) =>
              upEmail((e) => {
                e.on = val;
              })
            }
          />
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {AUD[email.aud]} · {email.trigger.charAt(0).toLowerCase() + email.trigger.slice(1)}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Scope k="Email" />
          <span className="muted" style={{ fontSize: 11 }}>
            Changes here affect this email only
          </span>
        </div>
      </div>

      <div className="sec">
        <h3>Subject & preheader</h3>
        <ChipField
          label="Subject"
          value={email.subject}
          v={v}
          onChange={(t) =>
            upEmail((e) => {
              e.subject = t;
            }, "subject")
          }
          right={
            <span className="muted tnum" style={{ fontSize: 11 }}>
              {resolve(email.subject, v).length}/78
            </span>
          }
        />
        <ChipField
          label="Preheader"
          value={email.pre}
          v={v}
          onChange={(t) =>
            upEmail((e) => {
              e.pre = t;
            }, "pre")
          }
          hint="Shown next to the subject in most inboxes."
        />
      </div>

      {states.length > 1 && !digest && (
        <div className="sec">
          <h3>States</h3>
          <div className="hint">This template reads differently depending on the request. Each state is shown on the canvas.</div>
          {states.map((st) => (
            <button type="button" key={st.id} className={"linkrow" + (ui.selState === st.id ? " on" : "")} onClick={() => open(email.id, st.id)}>
              <Icon n="layout" s={15} />
              <span className="grow">{st.label}</span>
              <Icon n="chevR" s={15} />
            </button>
          ))}
        </div>
      )}

      {digest && (
        <div className="sec">
          <h3>What goes into each summary</h3>
          {enabledFreqs(email.timing.schedule).length ? (
            enabledFreqs(email.timing.schedule).map((f) => {
              const list = bundledInto(mod, email, f);
              return (
                <div key={f} className="bundle">
                  <button type="button" className="bundle-h" onClick={() => open(email.id, f)}>
                    <Icon n="cal" s={14} />
                    <b className="grow">{FREQ_LABEL[f]} summary</b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {freqText(f, email.timing.schedule!)}
                    </span>
                  </button>
                  {list.length ? (
                    list.map((e) => (
                      <button type="button" key={e.id} className="linkrow" onClick={() => open(e.id)}>
                        <Icon n="mail" s={15} />
                        <span className="grow">{e.name}</span>
                        <Icon n="chevR" s={15} />
                      </button>
                    ))
                  ) : (
                    <div className="hint" style={{ padding: "4px 2px" }}>
                      Nothing yet.
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="hint">No summary is scheduled, so this digest never sends.</div>
          )}
          <div className="hint">To add a template, turn on a summary for it in Delivery → Timing.</div>
        </div>
      )}

      <div className="sec">
        <h3>Blocks in this email</h3>
        <div className="outline">
          {orderedBlocks(email, S.layout).map((b) => {
            const locked = isLocked(b.type);
            const offAll = S.layout.off.includes(b.id);
            const hidden = b.hidden || offAll;
            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                className={"orow" + (hidden ? " hid" : "")}
                onClick={() => !hidden && U({ sel: b.id })}
                onKeyDown={(e) => e.key === "Enter" && !hidden && U({ sel: b.id })}
              >
                <span className="tilebox">
                  <Icon n={blockIcon(b.type)} s={13} />
                </span>
                <span className="nm grow">{blockName(b)}</span>
                {locked ? (
                  <span className="muted" style={{ fontSize: 11 }}>
                    Brand kit
                  </span>
                ) : offAll ? (
                  <span className="muted" style={{ fontSize: 11 }} title="Hidden for all emails in Block order">
                    Hidden in all emails
                  </span>
                ) : (
                  <Toggle
                    sm
                    on={!b.hidden}
                    label={(b.hidden ? "Show " : "Hide ") + blockName(b)}
                    onChange={(val) =>
                      upEmail((x) => {
                        x.blocks.find((y) => y.id === b.id)!.hidden = !val;
                      })
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="note">
          <Icon n="info" s={15} />
          <span>
            Block order is shared by every email.{" "}
            <button type="button" className="inline-link" onClick={() => U({ selEmail: null, sel: null })}>
              Change it in All emails
            </button>
          </span>
        </div>
      </div>

      <div className="sec">
        <h3>Delivery</h3>
        <div className="row" style={{ gap: 8 }}>
          <Icon n={timingIcon(email.timing)} s={15} c="var(--muted)" />
          <span className="grow">{timingText(email.timing)}</span>
        </div>
        {dg &&
          freqs.map((f) => {
            const live = dg.timing.schedule?.[f].on;
            return (
              <button type="button" key={f} className="linkrow" onClick={() => open(dg.id, live ? f : undefined)}>
                <Icon n="cal" s={15} />
                <span className="grow">
                  <div style={{ fontWeight: 500 }}>Goes into the {FREQ_LABEL[f].toLowerCase()} summary</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {live ? freqText(f, dg.timing.schedule!) + " · " + dg.name : FREQ_LABEL[f] + " summary is off in the " + dg.name.toLowerCase()}
                  </div>
                </span>
                <Icon n="chevR" s={15} />
              </button>
            );
          })}
        <button type="button" className="btn" onClick={() => U({ tab: "delivery" })}>
          <Icon n="zap" s={15} />
          Edit delivery
        </button>
      </div>
    </>
  );
}
