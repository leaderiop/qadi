---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 06
subsystem: devtools
tags: [react, diagnostics, usediagnostics, breaking, changeset, upgrading]
status: complete

requires:
  - phase: 34-05
    provides: the dock reads the model's diagnostics store and no longer calls useDiagnostics
  - phase: 34-02
    provides: makeDiagnosticsFeed, idleDiagnostics, DiagnosticsStatus, DiagnosticsSnapshot
provides:
  - useDiagnostics as an adapter over the scoped feed, returning { status, reading }
  - useRunningStore deleted; useSyncExternalStore only in useStoreSnapshot.ts
  - React entry exports DiagnosticsStatus (value and type), DiagnosticsSnapshot and DiagnosticsDockOptions from the model
  - spec/overview.md Rev 1.99
  - second Breaking lead in .changeset/dock-diagnostics-feed.md, the upgrading.md section and the website page
affects: [34-07, 34-08, 34-09]

actuals:
  tokens: 14000
  tasks: 3
  commits: 3
plan_head_before: 57c880d437fbb88fe3bf2d836f3f2f9a74703f43
plan_head_after: d598c15ab6f1f343c6cb8884870873d3a3fe3c86
commits: 3

tech-stack:
  added: []
  patterns:
    - "a public hook is useScoped(feed) + configure in a layout effect + useStoreSnapshot over the feed or an idle readout"

key-files:
  created: []
  modified:
    - packages/devtools/src/react/useDiagnostics.ts
    - packages/devtools/src/react/index.ts
    - packages/devtools/src/react/useScoped.ts
    - packages/devtools/test/react/useDiagnostics.test.tsx
    - packages/devtools/test/react/DiagnosticsLifetime.test.tsx
    - packages/devtools/test/surface.test.ts
    - packages/devtools/test/surface.tst.ts
    - spec/overview.md
    - .changeset/dock-diagnostics-feed.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - apps/website/src/content/docs/docs/packages/devtools.md
    - examples/nextjs-newsroom/src/client/Counters.tsx
    - examples/nextjs-newsroom/test/dock-wiring.test.tsx
  deleted:
    - packages/devtools/src/react/useRunningStore.ts

key-decisions:
  - "DiagnosticsStatus is exported once, as `export { DiagnosticsStatus }`, which carries both the value and the type; the plan's extra type-line name is a duplicate-identifier error"

requirements-completed: [DIAG-03, DIAG-04, WX-07]

duration: 12min
completed: 2026-11-12
---

# Phase 34 Plan 06: useDiagnostics as an adapter over the scoped feed Summary

`useDiagnostics(options?)` now builds the same diagnostics feed the dock model builds, in a scope the component holds, and returns `{ status, reading }`, so a standalone host sees a stopped sampler instead of a frozen reading; `useRunningStore` is gone and the break is recorded in the example, the changeset, `upgrading.md`, the website page and the overview.

## Commits

| Task | Commit | Subject |
|---|---|---|
| 1 | `62bea37e` | feat(34-06): useDiagnostics is an adapter over the scoped diagnostics feed |
| 2 | `8b136ebd` | feat(34-06): the React entry names the diagnostics status and snapshot |
| 3 | `d598c15a` | docs(34-06): record the useDiagnostics return change |

## Changed lines in the two pinned test files (old -> new)

`useDiagnostics.test.tsx`
- `Probe`: `diagnostics.hydration` -> `diagnostics.reading.hydration`; `diagnostics.wiring._tag` -> `diagnostics.reading.wiring._tag`; added `<span data-testid="status">{diagnostics.status._tag}</span>`.
- Appended: `states Off when no options were handed over`, `states Starting until an asynchronous layer's first sample, then Live`, `reports a sampler that died as Stopped and keeps the last reading`.

`DiagnosticsLifetime.test.tsx`
- `Probe`: `return <span data-testid="wiring">{diagnostics.wiring._tag}</span>;` -> a fragment holding `diagnostics.reading.wiring._tag` and the status span; added a `status()` helper beside `wiring()`.
- H2 title: `H2 a hidden-then-shown hook shows the reading it held at once` -> `H2 a hidden-then-shown hook samples afresh: Starting and no reading until the first sample`.
- H2 right after the show: `assert wiring() === "Read"` and `builds === 1` -> `wiring() === "NotHanded"` and `status() === "Starting"`, then `vi.waitFor` on `Read`, then on builds reaching 2.
- H1, H3, K1..K5 unchanged.

Result: 16 passed (16) across the two files.

## Consumer grep

`git grep -l useDiagnostics -- ':!packages/devtools/src' ':!.planning' ':!**/CHANGELOG.md'` found the two return consumers the plan named (`Counters.tsx`, `dock-wiring.test.tsx`), moved in Task 1's commit; the other hits are prose, comments or spec text (website pages, README, `DevtoolsFeed.ts` comment, spec docs, `.changeset/diagnostics-store.md`, `DiagnosticsStore.test.ts`, `surface.test.ts`). No compiled fence read the return. `git grep -n useRunningStore -- packages apps examples spec/behaviors` prints nothing.

## Results at Task 1's commit

typecheck, lint, circular, the full devtools project, `pnpm build`, the example's typecheck and tests (7 files, 42 tests), `spec:examples` (110 blocks) and `spec:website-examples` (54 blocks) all passed. Task 2: typecheck, lint, tstyche (252 tests), surface test, `spec:api` (916 exports) and `spec-revise --check` passed; overview is Rev 1.99. Task 3: build and `spec:website-examples` (56 blocks) passed.

## Deviations from Plan

**1. [Rule 1 - Bug] DiagnosticsStatus exported once, not as value line plus type line**
- **Found during:** Task 2
- **Issue:** the plan asked for both `export { DiagnosticsStatus }` and `export type { DiagnosticsDockOptions, DiagnosticsSnapshot, DiagnosticsStatus }`; TypeScript rejects the pair as TS2300 Duplicate identifier.
- **Fix:** `export { DiagnosticsStatus }` already exports the merged value and type, so the type line names `DiagnosticsDockOptions` and `DiagnosticsSnapshot` only. Consequence: Task 2's first automated check reports `index.ts type line is wrong` on its three-name regex; everything it was guarding (the value export, no private name, the surface pins) holds and `surface.tst.ts` still lists `DiagnosticsStatus` as a React type.
- **Files modified:** `packages/devtools/src/react/index.ts`
- **Commit:** `8b136ebd`

**2. [Style] Barrel grouping**: the two model-path lines sit before `../model/Gates.ts`, the alphabetical module-path order; the plan's "replace in place" would have broken `[barrel-order]`.

Otherwise the plan executed as written. Task 1 touched six files as the plan flagged.

## Known Stubs

None.

## Threat Flags

None. T-34-12 is mitigated by case (c) and the example's stopped-sampler line; T-34-14 by the four new private-name refusals in `surface.tst.ts`.

## Requirements

`requirements.ready-ids` listed DIAG-03, DIAG-04 and WX-07, and they are marked complete. WX-03 and WX-06 are blocked (later plans still touch them) and stay open.

## Self-Check: PASSED

- 62bea37e, 8b136ebd and d598c15a are ancestors of HEAD; `useRunningStore.ts` is absent; the six Task 1 paths, the Task 2 paths and the three Task 3 paths exist.
