import { useState } from "react";
import { Tuning, type ProtoVersion } from "@/lib/tuning";
import App from "./App";
import AppV2 from "./v2/AppV2";

/** Picks the design direction from the DialKit panel (Email Studio → version). */
export default function Root() {
  const [version, setVersion] = useState<ProtoVersion>("3");
  return (
    <>
      {version === "1" ? <App /> : <AppV2 key={version === "3" ? "v3" : "v2"} v3={version === "3"} />}
      <Tuning onVersion={setVersion} />
    </>
  );
}
