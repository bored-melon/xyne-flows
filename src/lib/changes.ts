import type { Brand, ChangeGroup, ChangeItem, StudioState } from "@/data/types";
import { CASES } from "@/data/scenarios";
import { AUD, blockName, same, SLOT_NAMES, timingText } from "./utils";

const BRAND_LABELS: Record<keyof Brand, string> = {
  company: "Company name",
  sender: "Sender name",
  replyTo: "Reply-to",
  color: "Brand colour",
  radius: "Corners",
  button: "Buttons",
  illustrations: "Illustrations",
  footer: "Footer address",
};

const LIST_LAYOUTS = { notes: "With notes", compact: "Compact", totals: "Totals only" };

/** Diff the draft against what's live, grouped for the review screen. */
export function computeChanges(pub: StudioState, cur: StudioState): ChangeGroup[] {
  const groups: ChangeGroup[] = [];

  const brandItems = (Object.keys(BRAND_LABELS) as (keyof Brand)[])
    .filter((k) => pub.brand[k] !== cur.brand[k])
    .map((k) => ({ label: BRAND_LABELS[k], before: String(pub.brand[k]), after: String(cur.brand[k]) }));
  if (brandItems.length) groups.push({ key: "brand", title: "Brand kit", sub: "All modules", scope: "Brand", items: brandItems });

  const layoutItems: ChangeItem[] = [];
  const names = (ids: string[]) => ids.map((id) => SLOT_NAMES[id] || id).join(" → ") || "None";
  if (!same(pub.layout.order, cur.layout.order)) layoutItems.push({ label: "Block order", before: names(pub.layout.order), after: names(cur.layout.order) });
  if (!same(pub.layout.off, cur.layout.off))
    layoutItems.push({ label: "Hidden in every email", before: pub.layout.off.map((id) => SLOT_NAMES[id]).join(", ") || "None", after: cur.layout.off.map((id) => SLOT_NAMES[id]).join(", ") || "None" });
  if (layoutItems.length) groups.push({ key: "layout", title: "All emails", sub: "Every module", scope: "All emails", items: layoutItems });

  cur.modules.forEach((m) => {
    const pm = pub.modules.find((x) => x.id === m.id)!;
    if (pm.on !== m.on)
      groups.push({
        key: "mod-" + m.id,
        title: m.name,
        sub: "Module",
        scope: "Delivery",
        items: [{ label: "Module emails", before: pm.on ? "On" : "Off", after: m.on ? "On" : "Off" }],
      });

    m.emails.forEach((e) => {
      const pe = pm.emails.find((x) => x.id === e.id)!;
      if (same(pe, e)) return;
      const it: ChangeItem[] = [];

      if (pe.on !== e.on) it.push({ label: "Sending", before: pe.on ? "On" : "Off", after: e.on ? "On" : "Off" });
      if (pe.subject !== e.subject) it.push({ label: "Subject", before: pe.subject, after: e.subject });
      if (pe.pre !== e.pre) it.push({ label: "Preheader", before: pe.pre, after: e.pre });
      if (!same(pe.timing, e.timing)) it.push({ label: "Timing", before: timingText(pe.timing), after: timingText(e.timing) });
      if (!same(pe.quiet, e.quiet)) {
        const q = (x: typeof e.quiet) => `${x.weekends ? "Skips" : "Includes"} weekends · from ${x.time}`;
        it.push({ label: "Quiet hours", before: q(pe.quiet), after: q(e.quiet) });
      }
      if (!same(pe.channels, e.channels)) {
        const ch = (x: typeof e.channels) => ["Email", x.inapp && "In-app", x.slack && "Slack"].filter(Boolean).join(", ");
        it.push({ label: "Channels", before: ch(pe.channels), after: ch(e.channels) });
      }


      e.blocks.forEach((b) => {
        const pb = pe.blocks.find((x) => x.id === b.id);
        if (!pb) {
          it.push({ label: "Added " + blockName(b).toLowerCase(), after: b.props.text || "" });
          return;
        }
        if (pb.hidden !== b.hidden) it.push({ label: blockName(b), before: pb.hidden ? "Hidden" : "Shown", after: b.hidden ? "Hidden" : "Shown" });
        if (same(pb.props, b.props)) return;
        const a = pb.props,
          z = b.props;
        switch (b.type) {
          case "headline": {
            if (a.text !== z.text) it.push({ label: "Headline", before: a.text, after: z.text });
            if (a.sub !== z.sub) it.push({ label: "Headline subtext", before: a.sub, after: z.sub });
            if (!same(a.cases, z.cases)) {
              const cs = (c: typeof a.cases) => c.map((x) => CASES[x.when] + ": " + x.text).join(" · ") || "None";
              it.push({ label: "Headline cases", before: cs(a.cases), after: cs(z.cases) });
            }
            if (a.align !== z.align) it.push({ label: "Headline alignment", before: a.align, after: z.align });
            break;
          }
          case "list": {
            const desc = (p: typeof a) =>
              `${p.heading} · ${LIST_LAYOUTS[p.layout]} · ${Object.entries(p.fields)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(", ")} · first ${p.max} · empty: ${p.empty === "hide" ? "hide" : "message"}`;
            it.push({ label: blockName(pb), before: desc(a), after: desc(z) });
            break;
          }
          case "details": {
            const rows = (p: typeof a) => p.rows.filter((r) => r.on).map((r) => r.label).join(", ") || "None";
            it.push({ label: "Details", before: rows(a), after: rows(z) });
            break;
          }
          case "button":
            it.push({ label: "Button label", before: a.label, after: z.label });
            break;
          case "note":
            it.push({ label: "Paragraph", before: a.text, after: z.text });
            break;
          case "illustration":
            it.push({ label: "Illustration", before: a.kind, after: z.kind });
            break;
          case "amount":
            it.push({ label: "Amount", before: a.label + (a.breakdown ? " + breakdown" : ""), after: z.label + (z.breakdown ? " + breakdown" : "") });
            break;
          case "digest":
            it.push({ label: "Digest updates", before: `${a.heading}${a.showTime ? " · with times" : ""}`, after: `${z.heading}${z.showTime ? " · with times" : ""}` });
            break;
          case "timeline":
            it.push({ label: "Timeline", before: a.dates ? "With dates" : "Steps only", after: z.dates ? "With dates" : "Steps only" });
            break;
        }
      });
      pe.blocks.forEach((pb) => {
        if (!e.blocks.some((x) => x.id === pb.id)) it.push({ label: "Removed " + blockName(pb).toLowerCase(), before: pb.props.text || "" });
      });

      if (it.length) groups.push({ key: m.id + "/" + e.id, mid: m.id, eid: e.id, title: e.name, sub: m.name + " · " + AUD[e.aud].toLowerCase(), scope: "Email", items: it });
    });
  });
  return groups;
}
