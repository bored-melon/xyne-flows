# Working on the Xyne Flow prototypes

Two projects are built in this repository at the same time. Each has its own **branch**, its own **folder** and its own **port**, so both can be edited and previewed together without getting in each other's way.

| Project | Branch | Folder | Preview |
| --- | --- | --- | --- |
| Email Studio (Settings › Notifications) | `email-studio` | `~/Downloads/xyne-flows` | http://localhost:8090 |
| Account Payables (Payables › Procurement) | `account-payables` | `~/Downloads/xyne-flows-account-payables` | http://localhost:8080 |

`main` is the shared starting point: the Xyne Flow app shell both projects grew from. Project work never goes straight onto `main`.

## Run both

Use two terminal tabs:

```bash
cd ~/Downloads/xyne-flows && npm run dev                     # Email Studio → http://localhost:8090
cd ~/Downloads/xyne-flows-account-payables && npm run dev    # Account Payables → http://localhost:8080
```

Each port is fixed. If one is already in use, that server stops with an error instead of quietly moving to another port, so a URL always shows the project you expect.

## Versions: comparing design directions

Directions live side by side in the code rather than on separate branches, so you can flip between them in one browser tab. The **DialKit** panel (round button in the bottom-left corner) has a single control per project, **version**. The newest version opens by default. DialKit holds nothing else unless it's asked for.

**Email Studio**

| Version | Direction | Code |
| --- | --- | --- |
| 3 | Focus canvas: product page (list or timeline), then one person's notifications on a pannable canvas | `src/v3/` |
| 2 | Notifications: journey at the bottom, channel tabs in the right panel | `src/v2/` |
| 1 | Email studio: pannable canvas of email templates | `src/App.tsx`, `src/components/` |

**Account Payables (Procurement)**

| Version | Direction | Code |
| --- | --- | --- |
| 2 | Card header kanban: four tiles grouping work by who holds it | `src/ap/Procurement.tsx` |
| 1 | Sentence header kanban: one sentence with clickable numbers | `src/ap/Procurement.tsx` |

To try a new direction, add it as the next version in that project's DialKit list and keep the earlier versions working.

## Git

- The two folders are git worktrees of one repository, so every branch and commit is visible from either folder.
- Commit each project's work only on its own branch, from its own folder.
- Each finished round is tagged `<project>-<version>`, for example `email-studio-3.1.0`.
- Nothing is pushed to GitHub unless asked.
