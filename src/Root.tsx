import { useState } from "react";
import { Tuning, type ProtoVersion } from "@/lib/tuning";
import App from "./App";
import AppV2 from "./v2/AppV2";

/** Picks the prototype version from the DialKit panel (Prototype → version). */
export default function Root() {
  const [version, setVersion] = useState<ProtoVersion>("2");
  return (
    <>
      {version === "1" ? <App /> : <AppV2 />}
      <Tuning onVersion={setVersion} />
    </>
  );
}
