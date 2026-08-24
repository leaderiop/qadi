# Devtools 01 — Shell: dock + lens

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-DVT-01                                    |
> | Revision       | 0.3 (draft)                                    |
> | Effective Date | 2026-08-24                                     |
> | Status         | Draft — pending CCR                            |
> | Author         | Qadi Engineering                               |
> | Classification | Design Specification (draft)                    |
> | Change History | 0.3 (2026-08-24): The non-page topologies now have a data path, though still no surface (CCR-QD-066)<br>0.2 (2026-08-24): The dock recorded as one surface among several, not the only one (CCR-QD-060)<br>0.1 (2026-08-22): Initial draft from devtools design session |

---


## Form factor

An **in-page overlay dock** sliding up from the bottom of the host
application, plus an **element-picking lens** merged into its toolbar.

**This is one surface, not the only one.** The dock presupposes a browser page
running the host application, and
[00-overview.md](./00-overview.md#environments--one-ui-several-topologies)
records three deployments where that does not hold — a backend-only service, a
serverless function, a replicated server. Their decisions are now *reachable* —
`/__decisions` serves them and `ingest` merges several processes into one
timeline — but a dock has nowhere to run, so they need a served dev UI, a CLI, or
an exporter. None of this document applies to those. What survives across all of
them is the **data plane** (`DecisionSink`, the wire form, the feed) and the
vocabulary rules; the dock is the presentation for the topologies that have a
page.

Rejected shells (kept as wireframes for the record):
- *Spine* — persistent timeline left, feature canvas right;
- *Dual lane* — server column / client column with hydration drawn across;
- *Lens-only* — popover-first with no full dock.

The dock won for familiarity (browser-devtools muscle memory) and because
the unified stream lives in the data (the pair concept), not the layout;
the dual-lane layout hard-codes one debugging posture. The lens survived as
a mode, not a shell.

## Dock anatomy

- **Toolbar**: product mark, SRV/CLI legend, live/paused indicator,
  element-pick (lens) toggle, clear.
- **Tabs**: Log · Inspector · Policies · Roles · Simulate · Services · React.
- **Body**: the active screen (02-screens.md).

## Lens mode

Toggling the crosshair enters element-picking mode over the host page:

- gates (`<Can>` / `<Cannot>`) and hook-driven elements are hoverable;
- picking one shows a popover: which gate, its verdict, the top of its
  explanation tree (pass/fail per node), and "Open in inspector →";
- opening the inspector exits lens mode and selects that decision.

The React panel's "highlight" action is the inverse mapping: from a gate in
the tree to its DOM element.

> **Gap.** Both directions of the lens need something `@qadi/react` does not
> have: a registry of live gate instances and a handle on their DOM nodes. The
> package never touches the DOM, and `Atom.family` keys structurally so several
> `<Can>` on one policy are a single atom — see
> [02-screens.md §7](./02-screens.md#7-react-panel-client-only). Lens mode is
> therefore blocked on a design change to `@qadi/react`, not on devtools work.

## Cross-links (must all be wired)

- log row → inspector (selects that evaluation)
- inspector → "Replay in simulator" (seeds subject + check)
- lens popover → inspector
- React panel gate → lens highlight
- pair badge (⇅) → the paired row, either direction
