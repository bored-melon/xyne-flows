# Email Studio → Notifications

Version 3.0.0. See `CHANGELOG.md`.

The prototype holds three versions. Switch between them from the DialKit panel (the round button in the bottom-left corner) under **Prototype → version**. Version 3 opens by default; **Prototype → productPage** picks its product page layout (Table or Timeline), which can also be switched on the page.

## Version 3 · Focus canvas

Same Settings › Notifications page as version 2. What changes is what happens after you open a product.

- **Product page (before the editor).** Lists every notification before you see any editing. Two layouts:
  - **List:** one table in the order a request moves. Each stage is a header on a timeline rail, with a short line on what happens at that stage. Rows show:
    - the notification and the event that sends it;
    - who’s told;
    - its channels;
    - when it goes out;
    - whether it’s on.

    Filter by Everyone, Employees, Approvers or Admins. Hovering a row shows **Open**.
  - **Timeline:** stages across the top. Below them, one line per person, with a stop at each notification they get. Notifications that are off show as dashed stops, and summaries sit in an "Every morning" column.
- **Focus editor.** Full screen, from your Figma focus editor:
  - **Top bar:** close (back to the list), the product, a person picker (Employee / Approver / Admin) and a stage stepper. A step jumps to that person's notification at that stage, and steps where they hear nothing are disabled. Also undo/redo (⌘Z, ⇧⌘Z), Send test and Review & publish.
  - **Canvas:** every notification for that person, in order. Each sits in its own box with E-mail, Slack and App notifications side by side, and a switch per channel. Versions and the reminder are rows inside the box. Drag to pan, but only as far as there is content; ⌘/Ctrl + scroll zooms. Click a box to select it; its editable text gets dashed outlines.
  - **Panel (left):** the selected notification's settings.
    - Channel switches.
    - When: instantly and/or a periodic summary. Summaries get a schedule instead.
    - Reminders, versions, and Back to default settings.

Code: `src/v3/` (`Product.tsx`, `Focus.tsx`, `journey.ts`, `v3.css`). It reuses version 2's data, store, previews, review and controls; `AppV2` takes a `v3` flag.

## Version 2 · Notifications

A calmer, progressive-reveal take for admins who aren't technical. One module covers email, Slack and in-app/mobile notifications. It is styled like the Unifying Account Payables web app: grey app background, sidebar, white content card and blue switches.

- **Left nav.** Two states, defined in `src/v2/ui.tsx` (`MAIN_NAV`, `SETTINGS_NAV`):
  - **Main:** the app's modules, with Settings at the bottom.
  - **Settings:** opened from that Settings item, with ← to go back.

  Every item except Notifications opens a placeholder page until its module is built. In the notification editor, the nav collapses to icons.
- **Settings › Notifications.** Three blocks:
  - **Where people get notified.** Email, Slack and the Expense app each have a **Connect** button. Once connected, the button becomes **Connected ▾**, with Pause / Resume and Disconnect. Each menu item explains what happens. The card footer says how many notifications use the channel.
  - **What people are notified about.** Products with neutral icons and a tag: "Default", "Edited 2 days ago" or "Edited just now". Procurement shows as not used by the company.
  - **Branding.** Company name, sender, brand colour and email footer, used on every channel.
- **A product's editor.** Three areas:
  - **Journey (bottom).** Lanes per persona × stages of the request, plus a Summaries column. The cards are read-only. They show timing, channel icons, versions, reminders, and what a summary collects. A notification on no channel shows a clear **Off** tag. Drag its top edge to make it taller or shorter (double-click resets), or collapse it to a one-line bar: the persona, then the stages, with the current stage named. With a notification selected, the right panel runs the full height and the journey fills the width to its left.
  - **Workspace (centre).** A dotted canvas showing the selected notification's versions and reminder side by side, like Figma frames.
    - Emails show the inbox line (sender, subject, preview text) above the email.
    - In the selected frame, every piece of wording that can change has a dashed blue outline: subject, preview text, headline, the line under it, section titles and the button. Click one to change it, and use "Add a detail" for per-person values.
    - Drag the background to pan, but only as far as there are frames to see. ⌘/Ctrl + scroll zooms, and the zoom control sits in the bottom-right.
  - **Panel (right).** Channel tabs (Email / Slack / App, with a green dot where it's on) at the top. Below them:
    - The send switch.
    - **When:** instantly and/or a periodic summary. Summary notifications get a schedule instead.
    - Reminders.
    - Which versions are sent.
    - Back to default settings.
- **Review changes** (from "Publish N changes") lists every change on the left. On the right:
  - settings show as before → after;
  - wording shows as a before/after table plus side-by-side previews of the template, with the changed text marked.
  - Each change can be discarded on its own. "Send me a test" only shows a confirmation.

The code is in `src/v2/`:

| File | Contents |
| --- | --- |
| `model.ts` | Data built from the version 1 sample data |
| `store.tsx` | Context |
| `Home.tsx` | Settings page |
| `Editor.tsx` | Journey, workspace and panel |
| `Previews.tsx` | Email, Slack and phone previews |
| `Review.tsx` | Review changes |
| `ui.tsx` | Controls |
| `v2.css` | Styles |

`src/Root.tsx` picks the version.

## Version 1 · Email studio

A clickable prototype for customising the expense app's notification emails across Reimbursements, Travel, Cards, Procurement and Petty cash.

It covers four screens:

- **Overview** (Settings → Email notifications). The modules are listed on the left with an on/off switch each, and the global **Brand kit** card sits below them. The selected module's emails are listed in a table, grouped by who receives them (employee, approver, admin), with when each one sends, its channels, a status tag and an on/off switch. Each persona group ends with its digest. Click a row to open that email in the studio. Filters: All, Sending, Draft, Off.
- **Brand kit.** Set the company name, sender, reply-to, brand colour (with a contrast check), corners, button style, illustrations and footer once. A wall of sample emails from several modules updates as you edit.
- **Studio → Content.** A pannable canvas, like Figma. Drag anywhere to move around, scroll to pan, and use ⌘/Ctrl + scroll (or the zoom bar: −, %, +, Fit all) to zoom. Templates are grouped into one rectangular section per persona (employee, approver, admin). A template with several states (1 claim, 3 claims, many claims…) is drawn as a dashed group with every state side by side, so there is no preview picker. Each template header has its name, status tag and an on/off switch.
  - **Layers (left).** Templates per persona. Selecting one pans the canvas to it. Templates with states expand to show the states as children; selecting a state pans to that frame.
  - **Properties (right)** follow the selection:
    - **Nothing selected → All emails.** The shared **block order** (one order for every email in every module), switches to hide a block everywhere, the brand summary, and the module's digests.
    - **A template selected → that template.** Send on/off, subject and preheader (with variable chips), its states, which blocks it shows, what goes into each summary (for digests), and its delivery.
    - **A block selected → that block.** Copy with variables and cases ("exactly 1 claim"…), or, for data blocks, the layout and fields (never the numbers).
  - Esc goes up one level (block → template → all).
- **Digests.** Each persona has one digest template (Employee digest, Approver digest, Admin digest). It lives inside that persona everywhere: the table, layers, canvas and journey. A digest's schedule can turn on hourly (every N hours between two times), daily, weekly and monthly summaries, and each enabled summary appears as a state on the canvas.
- **Studio → Delivery.** This is the journey map. Each email sits under the stage of the request it belongs to, in the lane of whoever receives it, with a "Summaries" column for the digests. For an event email, timing is **Send instantly** (on/off) plus any of **Hourly / Daily / Weekly / Monthly summary**, so a template can be instant and part of repeating summaries at the same time. Links jump to the summary, with a warning if that summary is off in the digest. Reminders and before-deadline emails keep their own cadence. Quiet hours and channels are set here too. Triggers are locked because they follow the workflow.

- **Design tuning (DialKit).** The round button in the bottom-left corner opens a [DialKit](https://github.com/joshpuckett/dialkit) panel to tune the studio live: canvas colour and dot grid, persona section spacing, radius and fill, gaps between templates and states, zoom behaviour, accent colour, panel widths and the email shadow. Values are kept per browser, and the panel's preset menu can save named presets. The dials are defined in `src/lib/tuning.tsx`, and visual values are applied as CSS variables, so `styles.css` holds the defaults.

**Review & publish** lists every draft change as before/after. You can discard any group, then publish to make the draft live. Undo and redo work everywhere, and ⌘Z / Ctrl+Z work outside text fields.

## Run it

```bash
npm install
npm run dev      # http://localhost:8090 (Account Payables uses 8080, so both can run at once)
npm run build    # type-check + production build
```

## Stack

- Vite + React 18 + TypeScript. There are no UI libraries, and the icons are inlined. DialKit (with Motion) is used only for the design-tuning panel.
- Styling is plain CSS in `src/styles.css`, with design tokens on `:root` (light theme only). The email preview has its own `--e-*` tokens and is always rendered on white, as it would be in an inbox.
- Tags use one style everywhere (the chip from the Figma email kit: soft tint, 13px text, pill). Use `<Tag tone="green" | "amber" | "red" | "blue" | "purple" | "gray">` from `components/ui.tsx`.
- The studio canvas has a dot-grid background so it reads as an editing surface.
- The font is Host Grotesk from Google Fonts (linked in `index.html`).
- All data is in-memory sample data, with no backend. "Send test" only shows a confirmation.

## Where things live

```
src/
  App.tsx                    state, undo/redo, publish, routing between overview and studio
  styles.css                 all styles + tokens
  data/
    types.ts                 Email, Block, Module, Brand… types
    modules.ts               sample emails for all 5 modules (Reimbursements is the detailed one)
    scenarios.ts             preview scenarios, variables, headline cases
  state/
    StudioContext.tsx        shared context + useStudio() hook
    history.ts               undo/redo reducer
  lib/
    utils.ts                 helpers (formatting, labels, contrast check…)
    tuning.tsx               DialKit design-tuning panel
    changes.ts               draft vs live diff for the review screen
    icons.tsx                icon set
  components/
    ui.tsx                   Toggle, Seg (segmented control), Scope badge
    chips.tsx                variable chips + rich text editor + variable picker
    email/                   MailView (renders an email from blocks) + illustrations
    overview/                Overview, ModuleEmails, BrandKit
    studio/                  Studio shell, ContentTab (pannable canvas + layers), GlobalPanel, EmailPanel, BlockPanel, DeliveryTab
    review/                  Review & publish dialog
```

## How an email is modelled

Each email is a set of **blocks**: logo, illustration, headline, timeline, amount, digest updates, claims lists, details, paragraph, button and footer. Their order comes from one shared layout (`S.layout`, default in `DEFAULT_LAYOUT` in `src/data/modules.ts`), so every email in every module has the same structure. An email can hide blocks but not reorder them.

- Logo and footer come from the brand kit and are locked per email.
- Copy is stored as text with `{tokens}`, for example `"{flagged} claims flagged, {rejected} rejected"`, and resolved against each state's sample request.
- A template's states are `email.states` (`{id, label, scenario}`) in `modules.ts`. Digests derive their states from the summaries turned on in `timing.schedule`.
- Timing is `{type: "event", instant, freqs}` for event emails, `reminder`/`before` for cadences, and `{type: "digest", schedule}` for digests.
- Data blocks (timeline, amount, list, details) store display options only. Their values come from the request.

To add an email or change sample content, edit `src/data/modules.ts`.
