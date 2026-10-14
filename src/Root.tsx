import { useState } from "react";
import { Tuning, type ListLayout, type ProtoVersion } from "@/lib/tuning";
import App from "./App";
import AppV2 from "./v2/AppV2";

/** Picks the prototype version from the DialKit panel (Prototype → version). */
export default function Root() {
  const [version, setVersion] = useState<ProtoVersion>("3");
  const [layout, setLayout] = useState<ListLayout>("table");
  return (
    <>
      {version === "1" ? <App /> : <AppV2 key={version === "3" ? "v3" : "v2"} v3={version === "3"} layout={layout} />}
      <Tuning onVersion={setVersion} onLayout={setLayout} />
    </>
  );
}
