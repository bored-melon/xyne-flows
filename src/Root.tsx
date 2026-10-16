import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import AppV2 from "./v2/AppV2";

/** Account Payables opens on Payables › Procurement. The DialKit panel (bottom-left) switches its version. */
export default function Root() {
  return (
    <>
      <AppV2 />
      <DialRoot position="bottom-left" defaultOpen={false} theme="light" productionEnabled />
    </>
  );
}
