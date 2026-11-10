---
phase: 15-dock-session
plan: 02
subsystem: devtools
tags: [devtools, dock, headless-session, model, mutation]

requires: ["15-01"]
provides:
  - "Package-private `packages/devtools/src/model/DockSession.ts`: `TabId`, `DockSnapshot`, `DockSession`, `DockSessionInit`, `makeDockSession`"
  - "`packages/devtools/test/model/DockSession.test.ts`: the dock's rules tested without rendering (21 tests)"
affects: [15-03, 15-04]

actuals:
  tasks: 2
  commits: 2

key-files:
  created:
    - packages/devtools/src/model/DockSession.ts
    - packages/devtools/test/model/DockSession.test.ts
  modified: []

key-decisions:
  - "`replay(entry)` always calls the injected `simulation.replay(entry)`, but publishes only when the tab changes: on the simulator already, the snapshot is unchanged, so readers do not re-render"
  - "`select(key)` is a no-op only when the key is the same AND the tab is already `inspector`; the same key from another tab moves back to the inspector"
  - "`paired`, `counts`, `environments` are recomputed in `setTimeline` only; `rows` in `setTimeline` and `setFilters`; `selection` per build (cheap `find`)"

requirements-completed: [DOCK-03]

completed: 2026-11-10
status: complete
---

# 15-02 — The dock's rules as a headless session

`_DECISIONS.md` pre-answers no checkpoint for Phase 15, and this plan had none. D-02, D-03, D-04 and D-05 of
`15-CONTEXT.md` applied as written.

## Exported names (package-internal; in neither barrel)

From `packages/devtools/src/model/DockSession.ts`:

- `type TabId = "log" | "inspector" | "policies" | "roles" | "services" | "simulator" | "questions"` (closed, written out)
- `interface DockSnapshot { tab; filters; selectedKey; rows: ReadonlyArray<PairedEntry>; counts: Counts; environments: ReadonlyArray<string>; selection: Selection }`
- `interface DockSession { subscribe; getSnapshot; setTimeline; setTab; setFilters; select; replay }`
- `interface DockSessionInit { timeline: Timeline; simulation: { replay: (entry: TimelineEntry) => void } }`
- `const makeDockSession: (init: DockSessionInit) => DockSession`

It is built the way `ExplorerSession` is: closure state, `build()`, `makeExternalStore(build())`,
`commit = () => store.publish(build())`. No React import and no `SimulationSession` import: the replay reaches the
simulation through the structural `{ replay }` handed in at construction. Filter equality is the local
`sameFilters`, which compares text, environment and verdict field by field.

## Task 1 — tests first, then the module

- RED: `Failed to resolve import "../../src/model/DockSession.ts"`, committed as `352b3ed`.
- GREEN: 21/21. The tests cover:
  - the initial snapshot, and that `TabId` admits exactly the seven screens (`// @ts-expect-error` on `"timeline"`);
  - pair-then-filter: the `Client` half of a Server/Client pair, filtered to `Client`, keeps role `Continuation` and its Server partner;
  - count-whole: a text filter `alice` hides the error and the denial, and both are still counted;
  - after a filter keystroke, `counts` and `environments` keep the same reference; after a tab switch, `rows` keeps the same reference;
  - `setTimeline` re-reads everything and keeps the filters;
  - `select` gives `Selected`; a key the timeline later drops gives `Evicted`; a selection survives a filter that hides its row;
  - `replay` calls the simulation every time (twice for the same entry) and leaves the selection alone;
  - every no-op publishes nothing: same tab, field-wise equal filters, same key on the inspector, same timeline object, a replay while already on the simulator. For filters, each single field that differs does publish.

## Task 2 — mutation bar

`pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/DockSession.ts`: 53 mutants,
53 killed, 0 survived, 0 NoCoverage, score **100.00**. The file was absent at `e9d1104`, so it has no base to
compare against and the new-file rule applies (0 NoCoverage, score ≥ 90). No survivors, so no tests were added and
no code was removed. Comparison output:

```
packages/devtools/src/model/DockSession.ts new 100.00 ok
```

`15-mutation-base.json` is unchanged. It is the phase base, and DockSession.ts had nothing to measure there.

## Task Commits

1. `352b3ed` test(15-02): RED — the dock's rules as a headless session
2. `bd3a33e` feat(15-02): DockSession — the dock's tab, filters and selection as a store

## Deviations from Plan

- Task 2 made no commit of its own. Stryker left no survivors, so nothing needed a test.
- The plan's no-op list did not name "replay while already on the simulator". I added it, because the same
  rule applies ("a command that changes nothing publishes nothing"). The simulation is still commanded.

## Gate results

- `pnpm vitest run --project devtools packages/devtools/test/model/DockSession.test.ts`: 21/21 ✓
- `pnpm exec tsc -p tsconfig.test.json`: exit 0 ✓
- `pnpm lint:style`: 430 files clean ✓
- `pnpm circular`: no cycles ✓
- oxlint on both files: 0 ✓
- Barrel and import greps: neither barrel names `DockSession`; no `react` or `SimulationSession` import ✓
- Mutation compare: DockSession.ts new, 100.00, ok ✓
- Full `pnpm vitest run --project devtools`: 41 files, 1110 tests ✓

## Deferred to later plans in this phase

- 15-03:
  - `DevtoolsDock` owns a `DockSession` (an owned hook in `src/react/`, like `useOwnedExplorerSession`), with `simulation` from `useOwnedSimulationSession` passed as the `{ replay }` dependency.
  - The dock's `filters`, `tab` and `selectedKey` `useState`s and its `rows`/`counts`/`environments`/`selection` memos are removed.
  - The dock's local `TabId` is replaced by `DockSession`'s, so `TABS` must type its ids against it.
  - `setTimeline` is dispatched from a layout effect.
  - The BDD scenario pins the replay fix at the public seam.
- 15-04: the spec records (ADR-QD-047 amendment, D-07 reversal note, BEH-QD-389/390, INV-QD-107 sources, traceability), CCR-QD-405, `.changeset/dock-session.md`, overview rows if gate 13 needs them, and the phase-close mutation compare (DockSession.ts compares as "new": 0 NoCoverage, ≥ 90) plus `pnpm check:pr`.
- DOCK-02 is half done: the model exists, but the dock is not yet a view of it. It is ticked when 15-03 lands.
