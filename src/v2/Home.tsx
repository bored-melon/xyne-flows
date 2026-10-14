import { Icon } from "@/lib/icons";
import { same } from "@/lib/utils";
import { CHANNELS, CH_ICON, type Channel } from "./model";
import { use2 } from "./store";
import { Btn, Menu, SearchBar, Tag } from "./ui";

const CH_NAME: Record<Channel, string> = { email: "Email", slack: "Slack", app: "Expense app" };
const CH_DESC: Record<Channel, string> = {
  email: "Sent from {sender} <expenses@acme.com>",
  slack: "Direct messages from the Expense app in your Slack workspace",
  app: "Push notifications on phones and the bell inside the app",
};
const LAST_EDIT: Record<string, string> = { reimb: "Edited 2 days ago", cards: "Edited 3 weeks ago" };

/** Settings › Notifications: connect channels, open a product, edit branding. */
export function Home() {
  const { S, DEF, up, setUi, toast, v3 } = use2();
  const used = (c: Channel) => S.products.reduce((a, p) => a + p.notifs.filter((n) => n.ch[c].on).length, 0);
  const setCh = (c: Channel, v: "connected" | "paused" | "none", msg: string) => {
    up((d) => void (d.channels[c] = v));
    toast(msg);
  };

  return (
    <div className="n2-page">
      <SearchBar />
      <div className="n2-home">
        <div className="n2-titles">
          <h1 className="n2-h1">Notifications</h1>
          <p>Choose how people hear about their requests: by email, in Slack or in the Expense app.</p>
        </div>

        <section className="n2-sec">
          <h2>Where people get notified</h2>
          <p>Connect a channel once. Each notification then lets you choose whether to use it.</p>
          <div className="n2-channels">
            {CHANNELS.map((c) => {
              const st = S.channels[c];
              const n = used(c);
              const foot =
                st === "none"
                  ? "Nothing is sent until you connect it and choose notifications for it."
                  : st === "paused"
                    ? `Paused. ${n} notification${n === 1 ? "" : "s"} will use it again when you resume.`
                    : n
                      ? `Used by ${n} notification${n === 1 ? "" : "s"}`
                      : "Connected. Choose notifications for it from any product.";
              return (
                <div className="n2-chcard" key={c}>
                  <div className="row">
                    <Icon n={CH_ICON[c]} s={20} />
                    <b>{CH_NAME[c]}</b>
                    <span className="grow" />
                    {st === "none" ? (
                      <Btn kind="dark" onClick={() => setCh(c, "connected", `${CH_NAME[c]} connected to the ${S.brand.company} workspace`)}>
                        Connect
                      </Btn>
                    ) : (
                      <Menu
                        trigger={(open, toggle) => (
                          <button type="button" className={"n2-btn outline" + (st === "paused" ? " paused" : "") + (open ? " pressed" : "")} onClick={toggle}>
                            <Icon n={st === "paused" ? "pause" : "check"} s={14} c={st === "paused" ? "#E17100" : "#009966"} w={2.4} />
                            {st === "paused" ? "Paused" : "Connected"}
                            <Icon n="chevD" s={14} />
                          </button>
                        )}
                      >
                        {(close) => (
                          <>
                            {st === "paused" ? (
                              <button type="button" className="n2-mi" onClick={() => (setCh(c, "connected", `${CH_NAME[c]} messages resumed`), close())}>
                                <Icon n="play" s={15} />
                                <span>
                                  <b>Resume {CH_NAME[c]} messages</b>
                                  <small>Everything set to use {CH_NAME[c]} starts sending again.</small>
                                </span>
                              </button>
                            ) : (
                              <button type="button" className="n2-mi" onClick={() => (setCh(c, "paused", `${CH_NAME[c]} paused. Your choices are kept.`), close())}>
                                <Icon n="pause" s={15} />
                                <span>
                                  <b>Pause {CH_NAME[c]} messages</b>
                                  <small>Nobody gets {CH_NAME[c]} messages until you resume. Your choices are kept.</small>
                                </span>
                              </button>
                            )}
                            {c !== "email" && (
                              <button type="button" className="n2-mi danger" onClick={() => (setCh(c, "none", `${CH_NAME[c]} disconnected`), close())}>
                                <Icon n="unlink" s={15} />
                                <span>
                                  <b>Disconnect {CH_NAME[c]}</b>
                                  <small>Notifications keep using the other channels.</small>
                                </span>
                              </button>
                            )}
                          </>
                        )}
                      </Menu>
                    )}
                  </div>
                  <p>{CH_DESC[c].replace("{sender}", S.brand.sender)}</p>
                  <div className="foot">{foot}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="n2-sec">
          <h2>What people are notified about</h2>
          <p>Open a product to see who hears what, and when.</p>
          <div className="n2-products">
            {S.products.map((p) => {
              const edited = !same(p, DEF.products.find((x) => x.id === p.id));
              return p.used ? (
                <button type="button" className="n2-prod" key={p.id} onClick={() => setUi(v3 ? { view: "product", productId: p.id, notifId: null, variantId: null } : { view: "editor", productId: p.id, notifId: null, variantId: null, journeyOpen: true })}>
                  <Icon n={p.icon} s={18} />
                  <span className="grow">
                    <span className="t">{p.name}</span>
                    <span className="s">{p.covers}</span>
                  </span>
                  {edited ? <Tag tone="sky">Edited just now</Tag> : LAST_EDIT[p.id] ? <Tag tone="sky">{LAST_EDIT[p.id]}</Tag> : <Tag>Default</Tag>}
                  <Icon n="chevR" s={16} c="#9F9FA9" />
                </button>
              ) : (
                <div className="n2-prod off" key={p.id}>
                  <Icon n={p.icon} s={18} />
                  <span className="grow">
                    <span className="t">{p.name}</span>
                    <span className="s">Not used by your company</span>
                  </span>
                  <span className="link">Turn on in Company</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="n2-sec">
          <h2>Branding</h2>
          <p>Your logo, colour and name on everything people receive.</p>
          <div className="n2-brandrow">
            <span className="mark" style={{ background: S.brand.color }}>
              {(S.brand.company || "A")[0]}
            </span>
            <span className="grow">
              <span className="t">{S.brand.company}</span>
              <span className="s">Logo, brand colour and footer on emails. Name and icon in Slack and the app.</span>
            </span>
            <Btn onClick={() => setUi({ modal: "branding" })}>Edit branding</Btn>
          </div>
        </section>
      </div>
    </div>
  );
}
