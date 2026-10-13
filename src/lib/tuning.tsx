import { DialRoot, useDialKit } from "dialkit";
import "dialkit/styles.css";
import { useEffect } from "react";

/**
 * Live design tuning with DialKit (https://github.com/joshpuckett/dialkit).
 *
 * Visual values are written to CSS variables on <html>, so styles.css stays the
 * source of truth for defaults. Values the canvas reads in JS (zoom speed,
 * label size cap…) live in `tune`, and a "studio:tune" event tells the canvas
 * to redraw. Values persist per browser, and DialKit can save presets.
 */

/** Read by the canvas on every pan/zoom. Defaults match the dials below. */
export const tune = {
  dotGap: 18,
  labelMax: 2.2,
  zoomSpeed: 2.5,
  startZoom: 0.45,
  panMs: 350,
};

export type ProtoVersion = "1" | "2";

const CONFIG = {
  Prototype: {
    version: {
      type: "select" as const,
      options: [
        { value: "2", label: "Version 2 · Notifications" },
        { value: "1", label: "Version 1 · Email studio" },
      ],
      default: "2",
    },
  },
  Canvas: {
    background: { type: "color" as const, default: "#F0F0F2" },
    dots: { type: "color" as const, default: "#C9C9D1" },
    dotSize: [1, 0.5, 3, 0.1] as [number, number, number, number],
    dotGap: [18, 8, 48, 1] as [number, number, number, number],
  },
  Sections: {
    personaGap: [160, 40, 400, 10] as [number, number, number, number],
    radius: [28, 0, 64, 1] as [number, number, number, number],
    padding: [56, 16, 160, 4] as [number, number, number, number],
    fill: [50, 0, 100, 5] as [number, number, number, number],
    border: { type: "color" as const, default: "#D4D4DC" },
    templateGapX: [64, 16, 200, 4] as [number, number, number, number],
    templateGapY: [140, 80, 300, 10] as [number, number, number, number],
    stateGap: [56, 16, 160, 4] as [number, number, number, number],
    statesBox: true,
  },
  Navigation: {
    startZoom: [0.45, 0.1, 1, 0.05] as [number, number, number, number],
    zoomSpeed: [2.5, 0.5, 6, 0.1] as [number, number, number, number],
    labelMaxScale: [2.2, 1, 4, 0.1] as [number, number, number, number],
    panDuration: [350, 0, 1000, 10] as [number, number, number, number],
  },
  Interface: {
    accent: { type: "color" as const, default: "#145DFB" },
    layersWidth: [264, 200, 360, 4] as [number, number, number, number],
    propertiesWidth: [352, 280, 480, 4] as [number, number, number, number],
    emailShadow: [8, 0, 30, 1] as [number, number, number, number],
    inboxStrip: true,
    _collapsed: true,
  },
};

const px = (n: number) => n + "px";

function Dials({ onVersion }: { onVersion: (v: ProtoVersion) => void }) {
  const p = useDialKit("Email Studio", CONFIG, { id: "email-studio", persist: { key: "email-studio:tuning-v2" } });
  useEffect(() => onVersion((p.Prototype.version as ProtoVersion) || "2"), [p.Prototype.version, onVersion]);

  useEffect(() => {
    const r = document.documentElement.style;
    const set = (k: string, v: string) => r.setProperty(k, v);
    const { Canvas: c, Sections: s, Navigation: n, Interface: i } = p;

    set("--canvas", c.background);
    set("--dot", c.dots);
    set("--dot-r", px(c.dotSize));

    set("--persona-gap", px(s.personaGap));
    set("--sec-r", px(s.radius));
    set("--sec-pad", px(s.padding));
    set("--sec-fill", s.fill + "%");
    set("--sec-line", s.border);
    set("--tpl-gap-x", px(s.templateGapX));
    set("--tpl-gap-y", px(s.templateGapY));
    set("--state-gap", px(s.stateGap));
    document.documentElement.classList.toggle("no-states-box", !s.statesBox);

    set("--accent", i.accent);
    set("--accent-soft", `color-mix(in srgb, ${i.accent} 8%, #fff)`);
    set("--accent-line", `color-mix(in srgb, ${i.accent} 32%, #fff)`);
    set("--layers-w", px(i.layersWidth));
    set("--insp-w", px(i.propertiesWidth));
    set("--mail-shadow", `0 ${Math.round(i.emailShadow * 0.75)}px ${i.emailShadow * 2.5}px -4px rgba(0,0,0,${i.emailShadow ? 0.1 : 0})`);
    document.documentElement.classList.toggle("no-inbox-strip", !i.inboxStrip);

    tune.dotGap = c.dotGap;
    tune.labelMax = n.labelMaxScale;
    tune.zoomSpeed = n.zoomSpeed;
    tune.startZoom = n.startZoom;
    tune.panMs = n.panDuration;
    window.dispatchEvent(new Event("studio:tune"));
  }, [p]);

  return null;
}

/**
 * Mount once. The panel opens from a small button in the bottom-left corner.
 * "Prototype → version" switches between version 1 (Email studio) and version 2 (Notifications);
 * the other dials tune version 1.
 */
export function Tuning({ onVersion }: { onVersion: (v: ProtoVersion) => void }) {
  return (
    <>
      <Dials onVersion={onVersion} />
      <DialRoot position="bottom-left" defaultOpen={false} theme="light" productionEnabled />
    </>
  );
}
