---
phase: 15-dock-session
plan: 03
subsystem: devtools
tags: [devtools, dock, headless-session, react-adapter, bdd]

requires: ["15-01", "15-02"]
provides:
  - "Package-private `packages/devtools/src/react/useDockSession.ts`: `useOwnedDockSession(timeline, simulation)` and `useDockSnapshot(session)`"
  - "`DevtoolsDock` is a view of an owned `DockSession`: no `useState`, no pairing/filter/count/selection memos"
  - "BDD scenario \"Replaying the same row again re-seeds the question\" in `devtools-simulator.feature`"
affects: [15-04]

actuals:
  tasks: 2
  commits: 2

key-files:
  created:
    - packages/devtools/src/react/useDockSession.ts
  modified:
    - packages/devtools/src/react/DevtoolsDock.tsx
    - features/features/devtools-simulator/devtools-simulator.feature
    - features/features/devtools-simulator/devtools-simulator.steps.test.ts

key-decisions:
  - "The session is named `dock` in the view, per the plan's key-link pattern; the theme's `dock` style is imported as `dockStyle` (import renames have precedent: `Decision.ts`, `QadiProvider.tsx`)"
  - "`TABS` is `as const satisfies ReadonlyArray<{ readonly id: TabId; readonly label: string }>`; the local `TabId` derived from `TABS` is gone, so `Screen`'s `Record<TabId, …>` keys off the session's union"
  - "No new dock test: every behaviour the wiring adds is already exercised (see Task 1)"

requirements-completed: [DOCK-02, DOCK-05]

completed: 2026-11-10
status: complete
---

# 15-03 — The dock is a view of its session

`_DECISIONS.md` pre-answers no checkpoint for Phase 15, and this plan had none. D-02 of `15-CONTEXT.md` applied as
written.

## Task 1 — `useDockSession` and the dock as a view of it

- `useDockSession.ts` (`"use client"`, not in `react/index.ts`): `useOwnedDockSession` = `useState(() =>
  makeDockSession({ timeline, simulation }))` + `useLayoutEffect(() => session.setTimeline(timeline), [session,
  timeline])`; `useDockSnapshot` = `useRunningStore(session, undefined, [session])`. Same shape as
  `useOwnedExplorerSession`.
- `DevtoolsDock.tsx`: `const dock = useOwnedDockSession(timeline, simulation); const view = useDockSnapshot(dock);`
  after the simulation session. Deleted: the `filters`/`tab`/`selectedKey` `useState`s, the `rows`/`counts`/
  `environments`/`selection` memos, the `select`/`replay` callbacks, and the imports `useState`, `useCallback`,
  `applyFilters`, `environmentsOf`, `noFilters`, `Filters`, `pairedEntries`, `selectionOf`, `countsOf`. The
  "pair whole / count whole / replay is an act (E8.1, ARCH-63)" comments collapsed into one doc comment above the
  hook call that points at `DockSession.ts`. The misplaced "Data-driven…" comment moved back onto `TABS`.
- `sightings` and `shown` memos stay (not dock state).
- No dock test added. Already covered through the wiring: a new timeline reaching the session (`clearing empties
  the view`, capacity and live-source tests), the tab surviving a timeline change (`a timeline change after a
  replay keeps the replayed form` re-renders with a new source while on the simulator), the tab surviving a
  re-render (`the selected tab survives a re-render`), and the session being created once (a re-created session
  would reset the tab to `log` and fail both).

## Task 2 — BDD: replaying the same row again re-seeds

Scenario under the existing replay scenario:

```gherkin
Scenario: Replaying the same row again re-seeds the question
  Given a logged decision "ev-91" against the "doc:read" policy for "alice"
  And the log also saw a decision against the "doc:write" policy
  When that row is replayed
  And the reviewer chooses the "doc:write" policy from the rail
  And that row is replayed again
  Then the replayed policy is the logged one
```

- New steps: the Given (ingests a `doc:write` decision into the World's `timeline`), "the reviewer chooses …"
  (`session.choosePolicy`, asserting the snapshot is `Chosen` so the scenario has something to undo), "that row is
  replayed again" (`session.replay(entry)`).
- "that row is replayed" now calls `session.replay(entry)` and builds the session with
  `sightings: catalogueOf(s.timeline)` — empty for every older scenario, so their rail is unchanged.
- Discrimination: with `seed` in place of `replay` in the second replay, the scenario fails
  (`AssertionError … expected: 'Seeded'`, `Tests 1 failed | 19 passed (20)`); restored, 20/20.

## Task Commits

1. `417bb90` feat(15-03): the dock is a view of its DockSession
2. `c4d830a` test(15-03): BDD — replaying the same row again re-seeds the question

## Deviations from Plan

- [Rule 3 — blocker] Naming the session `dock` shadowed the theme's `dock` style (`TS2559` on `<section
  style={dock}>`, and the typography test failed). Fixed by importing the style as `dockStyle`.
- The scenario's second Given is "the log also saw a decision against the "doc:write" policy" and the choose step
  takes the policy name, so the choice comes from a real rail rather than an empty one (where it would be
  `Evicted`). Three new steps instead of the plan's two.

## Gate results

- `grep -c useState DevtoolsDock.tsx` = 0 ✓; `applyFilters|pairedEntries|countsOf|selectionOf` = 0 ✓;
  `useDockSession` not in `react/index.ts` ✓; key link `dock.setTab(` / `dock.setFilters(` present ✓.
- `pnpm vitest run --project devtools`: 41 files, 1110 tests ✓ (DOCK-05: `git diff e9d1104 --numstat --
  packages/devtools/test` deletes 0 lines).
- `pnpm typecheck` ✓; `pnpm exec tsc -p tsconfig.test.json` 0 ✓; `pnpm lint:style` 431 files clean ✓;
  `pnpm circular` ✓; oxlint on `packages/devtools` and the feature dir 0 ✓.
- `pnpm --filter @qadi/features exec vitest run features/devtools-simulator`: 20/20 ✓.
- `pnpm spec:verify`: 21 PASS ✓.
- Mutation: no file under `stryker.devtools.mjs`'s `src/model/**` changed in this plan (`DockSession.ts` 100 and
  `SimulationSession.ts` 96.46 untouched), so there is nothing to compare; 15-04 runs the phase-close compare.

## Deferred to 15-04

- Spec records: ADR-QD-047 amendment, D-07 reversal note (ARCH-20 D-20-g "seed as a prop" reversed for replay),
  BEH-QD-389/390, INV-QD-107 sources (now `DockSession.ts`, `useDockSession.ts`), traceability rows (behaviour 28's
  module lists gain `DockSession`/`useDockSession`; `DockSession.test.ts` row; the new BDD scenario), CCR-QD-405.
- `.changeset/dock-session.md` (patch), overview rows if gate 13 needs them for `SimulationSession.replay`.
- Phase-close mutation compare (DockSession.ts as "new": 0 NoCoverage, ≥ 90; SimulationSession.ts vs 96.44) and
  `pnpm check:pr`; tick DOCK-01..05 in REQUIREMENTS.md.
- Not in Phase 15: the `FieldEditor` chip typing buffer `useState`.
