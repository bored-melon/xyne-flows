export type Audience = "employee" | "approver" | "admin";
export type StepState = "done" | "now" | "todo" | "you" | "rejected";

export interface Step {
  label: string;
  sub: string;
  state: StepState;
}

export type BlockType =
  | "logo"
  | "illustration"
  | "headline"
  | "timeline"
  | "amount"
  | "list"
  | "details"
  | "note"
  | "button"
  | "footer"
  | "digest";

export interface HeadlineCase {
  when: CaseKey;
  text: string;
}

export interface DetailRow {
  icon: string;
  label: string;
  value: string;
  on: boolean;
}

export interface ListFields {
  logo: boolean;
  status: boolean;
  note: boolean;
  category: boolean;
  date: boolean;
}

/** Block props differ by type; kept loose so each block can carry its own options. */
export interface BlockProps {
  // headline
  text?: string;
  sub?: string;
  cases?: HeadlineCase[];
  align?: "left" | "center";
  // illustration
  kind?: string;
  // timeline
  steps?: Step[];
  dates?: boolean;
  // amount
  label?: string;
  breakdown?: boolean;
  // list
  heading?: string;
  source?: "all" | "need" | "rejected";
  layout?: "notes" | "compact" | "totals";
  fields?: ListFields;
  max?: number;
  empty?: "hide" | "message";
  // details
  rows?: DetailRow[];
  // digest
  showTime?: boolean;
}

export interface Block {
  id: string;
  type: BlockType;
  hidden: boolean;
  props: BlockProps;
}

export type Freq = "hourly" | "daily" | "weekly" | "monthly";

export interface Schedule {
  hourly: { on: boolean; every: number; from: string; to: string };
  daily: { on: boolean; time: string };
  weekly: { on: boolean; day: string; time: string };
  monthly: { on: boolean; date: number; time: string };
}

/**
 * When an email goes out.
 * - event: triggered by something happening. Can go out instantly AND be included in summaries.
 * - reminder: repeats until the person acts.
 * - before: a set number of days before a deadline.
 * - digest: the persona's summary template, sent on its schedule.
 */
export interface Timing {
  type: "event" | "reminder" | "before" | "digest";
  instant?: boolean;
  freqs?: Freq[];
  first?: number;
  every?: number;
  max?: number;
  days?: number;
  schedule?: Schedule;
}

/** One way a template can look, depending on the request (e.g. 1 claim vs many). */
export interface TemplateState {
  id: string;
  label: string;
  /** Preview scenario used to render it */
  scenario: string;
}

export interface Email {
  id: string;
  name: string;
  aud: Audience;
  stage: number;
  on: boolean;
  isNew?: boolean;
  /** "digest" = the persona's summary template that bundles emails set to go into summaries */
  kind?: "digest";
  /** States shown side by side on the canvas. Digests derive theirs from the schedule. */
  states?: TemplateState[];
  trigger: string;
  timing: Timing;
  channels: { inapp: boolean; slack: boolean };
  quiet: { weekends: boolean; time: string };
  subject: string;
  pre: string;
  blocks: Block[];
}

export interface Module {
  id: string;
  name: string;
  icon: string;
  on: boolean;
  stages: string[];
  emails: Email[];
}

export interface Brand {
  company: string;
  sender: string;
  replyTo: string;
  color: string;
  radius: "square" | "soft" | "round";
  button: "filled" | "outline";
  illustrations: "product" | "none";
  footer: string;
}

/** One block order shared by every email in every module, so all emails look alike. */
export interface Layout {
  /** Block slot ids, top to bottom. Logo stays first and footer last. */
  order: string[];
  /** Slots hidden in every email */
  off: string[];
}

export interface StudioState {
  brand: Brand;
  layout: Layout;
  modules: Module[];
}

export type CaseKey = "one" | "onlyRejected" | "none";

export interface Claim {
  m: string;
  amt: number;
  status: "Submitted" | "Approved" | "Flagged" | "Partly approved" | "Rejected";
  note: string;
  cat: string;
  date: string;
}

export interface Scenario {
  id: string;
  label: string;
  hint: string;
  claims: Claim[];
}

/** Resolved values for {variables}, plus the claim lists data blocks read from. */
export interface Vars {
  [key: string]: unknown;
  firstName: string;
  approver: string;
  count: number;
  flagged: number;
  rejected: number;
  total: string;
  deadline: string;
  payout: string;
  req: string;
  company: string;
  period: string;
  _all: Claim[];
  _need: Claim[];
  _rej: Claim[];
  _amtOk: number;
  _amtNeed: number;
  _amtRej: number;
}

export type View = "overview" | "studio";
export type StudioTab = "content" | "delivery";

export interface UIState {
  view: View;
  /** Overview: which module is open, or "brand" for the brand kit */
  side: string;
  moduleId: string;
  /** Email the Delivery tab and edits act on (last selected) */
  emailId: string;
  tab: StudioTab;
  /** Content tab selection: email (null = nothing selected → properties for all emails) */
  selEmail: string | null;
  /** Content tab selection: which state of selEmail */
  selState: string | null;
  /** Content tab selection: block inside selEmail */
  sel: string | null;
  /** Frame to pan the canvas to ("emailId" or "emailId:stateId"), then cleared */
  scrollTo: string | null;
  filter: "all" | "on" | "draft" | "off";
  review: boolean;
  tested: boolean;
  search: string;
}

export interface ChangeItem {
  label: string;
  before?: string;
  after?: string;
}

export interface ChangeGroup {
  key: string;
  mid?: string;
  eid?: string;
  title: string;
  sub: string;
  scope: "Brand" | "Email" | "Delivery" | "All emails";
  items: ChangeItem[];
}
