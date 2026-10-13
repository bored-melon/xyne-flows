import { createContext, useContext } from "react";
import type { Channel, Notif, Product, State2 } from "./model";

export interface UI2 {
  /** Which left nav is showing: the app's modules, or Settings */
  nav: "main" | "settings";
  /** The page open in that nav, by its label */
  page: string;
  /** Inside Settings › Notifications: the overview, or a product's editor */
  view: "home" | "editor";
  productId: string;
  /** Selected notification in the editor (null = none yet) */
  notifId: string | null;
  /** Channel tab in the right panel; the workspace previews the same channel */
  channel: Channel;
  /** Selected frame in the workspace */
  variantId: string | null;
  journeyOpen: boolean;
  /** Height of the open journey, set by dragging its top edge */
  journeyH: number;
  zoom: number;
  modal: null | "branding" | "publish";
}

export interface Ctx2 {
  S: State2;
  pub: State2;
  DEF: State2;
  ui: UI2;
  setUi: (p: Partial<UI2> | ((u: UI2) => Partial<UI2>)) => void;
  /** Edit the draft */
  up: (fn: (d: State2) => void) => void;
  /** Edit one notification of the open product */
  upNotif: (id: string, fn: (n: Notif) => void) => void;
  product: Product;
  notif: Notif | null;
  changed: { product: string; name: string }[];
  toast: (msg: string) => void;
}

export const Ctx = createContext<Ctx2 | null>(null);
export const use2 = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("use2 outside provider");
  return c;
};
