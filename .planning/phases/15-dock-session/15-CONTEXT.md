# Phase 15: The dock's log, inspector and replay state is a headless session - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-63 · review candidate #4 (Strong, defect)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`

<domain>
## Phase Boundary

`@qadi/devtools`' dock stops holding the log's filters, the active tab, the selected row and the replay seed in
React state. A dock-owned headless session (the same shape as `ExplorerSession`, ARCH-50/58, and `HeldChoice`)
owns that state and the rules around it:
- pair the whole timeline, then filter;
- count the whole timeline, never the filtered rows;
- `select(key)` moves to the inspector;
- `replay(entry)` moves to the simulator and **commands** the simulation session to seed.

`DevtoolsDock.tsx` becomes a view of that session. Replaying the same row a second time re-seeds the simulator.
</domain>

<evidence>
## Evidence (confirmed by reading at 1721a42)
- `packages/devtools/src/react/DevtoolsDock.tsx:166-219` — `useState` for `filters`, `tab`, `selectedKey` and `seed`.
  The `rows` memo (:181-184) pairs, then filters. `counts` comes from the whole timeline (:187). `select` (:207-210)
  and `replay` (:214-217) are `useCallback`s. The comment at :169-175 says seeding is "an act rather than a
  consequence", but the code implements it as a prop.
- `packages/devtools/src/react/useSimulationSession.ts:80-84` — a layout effect calls `session.seed(input.seed)` when the prop changes.
- `packages/devtools/src/model/SimulationSession.ts:506-507` — `seed` returns early when `entry === seedEntry`.
  `choosePolicy` (:487-503) clears `seeded` but leaves `seedEntry` alone.
- **Defect:** replay row A, choose another policy from the rail (or edit the form), then replay A again. React
  skips the identical `seed`, and even if the effect ran, the session guard would return. The simulator keeps the
  other policy under a button that promised a re-seed. ARCH-20 T9 step 2 introduced "re-seeds through its effect,
  once". No test replays the same row twice (`test/react/DevtoolsDock.test.tsx:997-1007`).
- This state is reachable only by rendering: `test/react/DevtoolsDock.test.tsx` is 1348 lines.
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first):** a RED test in `DevtoolsDock.test.tsx` covering replay A, then choose another policy,
  then replay A, and expecting the simulator to show A's policy and form. Also a RED model-level test once the
  session exists. The dock test is the one that must be red on `1721a42`.
- **D-02:** a new headless module in `packages/devtools/src/model/` (name at the planner's discretion, e.g.
  `DockSession.ts`), made with `make…` and following `ExplorerSession.ts`'s construction, subscription and
  disposal pattern. It owns `tab`, `filters`, `selectedKey`, and the derived `rows`, `counts`, `environments`
  and `selection` readings, and the commands `select`, `replay`, `setFilters` and `setTab`.
- **D-03:** replay is a command on the simulation session (e.g. `session.replay(entry)`, or `seed(entry, { force: true })`).
  It re-seeds even for the same entry. The prop-driven effect path in `useOwnedSimulationSession` stays only for
  the initial seed, or is removed if nothing else needs it. The session's same-entry guard keeps its purpose
  (an effect re-run must not wipe a half-filled form). The command and the effect re-run are told apart in the
  interface, not by comparing identities.
- **D-04:** `TabId` stays a closed union. The session's interface exposes no React types. It is tested in
  `test/model/` under the model's coverage and mutation bar, without rendering.
- **D-05:** the export surface follows ADR-QD-047 (`@qadi/devtools`' named barrel, ARCH-40). If the session is
  exported, gate 13 needs `spec/overview.md` rows. Recommend keeping it package-private unless the headless
  entry needs it.
- **D-06:** Spec: INV-QD-107 (what a screen shows survives leaving and coming back) covers the tab state. Add a
  BEH for "replay is an act: replaying a row always re-seeds" in `spec/devtools-spec/` / behaviors as fits.
  Make sure `check-devtools-claims.mjs` (gate 12) stays green. Add a CCR row and a changeset
  (`@qadi/devtools` patch: a bug fix plus an internal move).
- **D-07:** ARCH-20 D-20-g ("seed as a prop") is reversed for replay only. Record this in the plan and in an ADR
  addendum if ARCH-20 has an ADR (the planner checks `spec/decisions/index.yaml`).

### Claude's Discretion
- The session's name, and whether `selection`/`sightings` derivations move with it or stay where they are.
</decisions>

<canonical_refs>
## Canonical References
- `packages/devtools/src/react/DevtoolsDock.tsx`, `useSimulationSession.ts`, `useExplorerSession.ts` (or wherever ARCH-58 put the owned hook)
- `packages/devtools/src/model/SimulationSession.ts`, `ExplorerSession.ts`, `HeldChoice.ts`, `Filters.ts`, `Timeline*.ts`
- `packages/devtools/test/react/DevtoolsDock.test.tsx`, `test/model/*Session*.test.ts`
- commit `1721a42` (ARCH-58), `.planning/milestones/archive-pre-gsd/architecture/ARCH-20-simulation-session.md`, `ARCH-50-explorer-session.md`
- `spec/devtools-spec/`, ADR-QD-047, INV-QD-107
</canonical_refs>

<deferred>
## Deferred Ideas
- Moving the Simulator's `Chips`/`Pairs` typing buffers out of React (ARCH-20 kept them in React on purpose).
</deferred>

---
*Phase: 15-dock-session · Context gathered: 2026-11-10*
