import { DialRoot, useDialKit } from "dialkit";
import "dialkit/styles.css";
import { useEffect } from "react";

/**
 * DialKit panel (https://github.com/joshpuckett/dialkit): the round button in the bottom-left corner.
 * It holds one control, the design direction to show. Add other controls only when asked.
 */

/** Version 1's canvas reads these on every pan and zoom. Fixed values; they used to be dials. */
export const tune = {
  dotGap: 18,
  labelMax: 2.2,
  zoomSpeed: 2.5,
  startZoom: 0.45,
  panMs: 350,
};

export type ProtoVersion = "1" | "2" | "3";

const CONFIG = {
  version: {
    type: "select" as const,
    options: [
      { value: "3", label: "Version 3 · Focus canvas" },
      { value: "2", label: "Version 2 · Notifications" },
      { value: "1", label: "Version 1 · Email studio" },
    ],
    default: "3",
  },
};

function Dials({ onVersion }: { onVersion: (v: ProtoVersion) => void }) {
  const p = useDialKit("Email Studio", CONFIG, { id: "email-studio", persist: { key: "email-studio:version" } });
  useEffect(() => onVersion((p.version as ProtoVersion) || "3"), [p.version, onVersion]);
  return null;
}

/** Mount once. "Email Studio → version" switches between the three directions; the newest opens by default. */
export function Tuning({ onVersion }: { onVersion: (v: ProtoVersion) => void }) {
  return (
    <>
      <Dials onVersion={onVersion} />
      <DialRoot position="bottom-left" defaultOpen={false} theme="light" productionEnabled />
    </>
  );
}
