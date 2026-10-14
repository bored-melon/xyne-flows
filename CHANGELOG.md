# Changelog

## 3.0.0 — 14 Oct 2026

Version 3, "Focus canvas", from the Figma direction in Section 6. It is the default in DialKit; versions 2 and 1 are still there.

- **Product page before editing.** A product opens on a list of its notifications instead of the editor. Two layouts, chosen in DialKit (Prototype → productPage) or on the page:
  - **List:** a chronological table with a stage rail, a short line on what each stage means, the event that sends each notification, and a filter by person.
  - **Timeline:** one line per person across the stages, with a stop for each notification; off notifications are dashed and summaries sit in their own column.
- **Focus editor.**
  - Full screen.
  - A person picker and a stage stepper in the top bar.
  - Every notification for that person on a canvas you can pan, bounded to the content. Each notification shows E-mail, Slack and App side by side, with a switch per channel and versions or the reminder as rows.
  - The selected notification's settings on the left.
- **Undo and redo** in the editor. Typing in one field counts as one step.
- Email previews can show subject and preheader as labelled fields.

## 2.3.0 — 13 Oct 2026

- **App navigation.** The left nav now has the app's two states:
  - **Main:** Home, Assistant, Operations, Payables, Spend, Insights and Settings.
  - **Settings:** ← Settings, then Company, Controls, Workspace and Configuration.

  Groups collapse, and blue dots mark new items. Settings opens on Notifications, and ← goes back to the app. Modules that aren't built yet show a placeholder page.
- **Notifications page.** The Settings tabs are gone, since the Settings nav replaces them. The page is titled "Notifications".

## 2.2.0 — 13 Oct 2026

- **Layout.** The right panel runs the full height of the editor, and the workspace and journey share the width to its left. The journey keeps the persona column pinned and scrolls sideways when space is tight.
- **Resizable journey.** Hover the journey's top edge and drag to resize it. Double-click resets it, and ↑/↓ work when the edge is focused.
- **Panel section headers.** Bigger and darker (16px, dark), matching the section headers elsewhere.
- **Settings page.** The content is centred.

## 2.1.0 — 13 Oct 2026

Version 2 refinements.

- **Editable wording is obvious.** In the selected frame, everything you can change has a dashed blue outline, and a "Click any highlighted text to change it" pill sits at the bottom of the workspace. More of the email can now be edited: the line under the headline, the amount label, section titles, notes and the button.
- **Dotted canvas.** The workspace has a dotted background, so it no longer blends into the panel and the journey.
- **Pan by dragging.** Drag the workspace to move around, but only within the area that has frames. ⌘/Ctrl + scroll zooms.
- **Collapsed journey.** The collapsed bar now matches the Figma design: Journey · persona · stages, with the current stage named.
- **Empty states.** Fixed the icons: the icon was picking up the badge's style.
- **Review changes.** Every change in a list. Each one shows the before and after of its settings, its wording, and side-by-side template previews with the changed text marked. A change can be discarded on its own.

## 2.0.0 — 13 Oct 2026

Version 2, "Notifications". Version 1 is still available from the DialKit panel (Prototype → version).

- **One module for email, Slack and in-app/mobile.** Channels are connected once in Settings, with Connect / Connected and Pause / Disconnect menus that explain the consequences.
- **Products list.** Neutral icons with "Default" or "Edited …" tags. Branding replaces the brand kit.
- **Journey at the bottom.** Lanes × stages of read-only cards that reflect the panel. Notifications on no channel are marked Off. The journey collapses to a bar.
- **Workspace.** Versions and reminders sit side by side like frames. Emails show their subject and preview text. Wording is edited in place, with per-person details.
- **Right panel by channel.** Send switch, instant and/or periodic summary, summary schedules, reminders, versions, and reset to default.
- **Removed:** the pannable canvas, content/delivery tabs, block-level layout and quiet hours.
- **Publish.** Publishing lists every change first.

## 1.0.0 — 12 Oct 2026

The first version of the Email Studio prototype.

- **Overview.** A module list with on/off switches, a global brand kit, and a table of each module's templates grouped by persona. Each persona group ends with its digest.
- **Brand kit.** Company, sender, brand colour with a contrast check, corners, button style, illustrations and footer, with a live wall of sample emails.
- **Content canvas.** A pannable, zoomable canvas with one section per persona. Templates with several states show every state side by side. Layers list templates and their states. Properties follow the selection: all templates, one template, or one block. Templates can be switched on and off from the canvas.
- **Universal block order.** One shared block order for every email, editable from "All emails".
- **Digests and summaries.** One digest per persona with hourly, daily, weekly and monthly summaries. A template can be sent instantly and be part of any summaries at the same time.
- **Delivery.** A journey map by stage and persona with a Summaries column, timing, quiet hours and channels.
- **Review & publish.** Before/after diff, discard per group, undo/redo.
- **Design tuning.** A DialKit panel for live tuning of the canvas and interface.
