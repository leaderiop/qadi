---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
plan: 03
subsystem: react-hydration
tags: [refactor, drop-buckets, hydration, derived-events]
phase_base: 3630e29865bbaed49126b214f0f6cc7006b6f4bc
requires: [70-01, 70-02]
provides:
  - "packages/react/src/HydrationBuckets.ts: DropBuckets, entryBuckets, dehydrationBuckets, dropEvents (package-private)"
  - "planHydration and planDehydration collect every drop through one bucket record each and emit through dropEvents"
affects: [70-04, 70-07]
tech-stack:
  added: []
  patterns: ["a mapped-type bucket record per side whose key order is the emission order", "one generic event derivation over Record.keys"]
key-files:
  created:
    - packages/react/src/HydrationBuckets.ts
  modified:
    - packages/react/src/HydrationEngine.ts
key-decisions:
  - "The module's doc names ADR-QD-183 and ADR-QD-152 although ADR-QD-183 is written by 70-05; the plan directs the citation and the id is reserved."
  - "entryDropReason keeps its malformed parameter unchanged (plan: it stays as it is)."
requirements-completed: []
duration: 12 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: 2d1fa7cb3abcc5fe5c40f628282ad8428d72c05c
plan_head_after: 9286fd7447cd49ed92bcf44fbc1a5e0728dfafb9
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
---

# Phase 70 Plan 03: Both sides' drop events derived from their buckets Summary

A reason with a bucket and no event can no longer exist: both planners collect every drop through a total, per-call bucket
record and their events come from one generic `dropEvents`, with every event, order and count unchanged.

## Module declarations (`HydrationBuckets.ts`, not in the barrel)

- `export type DropBuckets<R extends string, T> = { readonly [K in R]: Array<T> };`
- `export const entryBuckets = (): DropBuckets<EntryDropReason, unknown> => ({ EntryTooDeep: [], MalformedEntry: [], UndecodablePolicy: [] });`
- `export const dehydrationBuckets = (): DropBuckets<DehydrationDropReason, DecisionEntry> => ({ ForeignSubject: [], UnencodablePolicy: [] });`
- `export const dropEvents = <R extends string, T, E>(buckets, event) => Record.keys(buckets).filter(non-empty).map(event)`

The emission order is each constructor's key order, stated once per side; nothing reads `hydrationDropReasons`.

## Counts the verifies read (`HydrationEngine.ts`)

`bucketOf` 0, `malformed.push` 0, named hydrate arrays 0, `HydrationEvent.EntriesDropped(` 1, `entryBuckets()` 1,
`drops.MalformedEntry` 1, `entries.filter(` 0, `own`/`foreign`/`unencodable` arrays 0, `HydrationEvent.LeftOut(` 1,
`dehydrationBuckets()` 1, `drops.ForeignSubject` 1, `drops.UnencodablePolicy` 1, `dropEvents(drops` 2.

## Results

- `tsc -b tsconfig.json`: clean after each task.
- Characterisation: `char-check: 32 passed` after each task; file untouched (one commit since `phase_base`).
- Whole react project: 35 files, 567 tests passed (Task 2 run).
- oxlint and `check-house-style.mjs`: clean. `api-surface: 941 export(s) documented across 9 package(s)` (unchanged).
- Task 2 verify: exit 0 (`both sides derive their events from their buckets`), including the forbidden-construct and id scans over the phase's added lines.
- `pnpm typecheck` and tstyche were not run whole (the 70-02 pins stay red on `PAYLOAD_PRODUCERS` until 70-04).

## Task Commits

1. Task 1 (tracer): `072972da` refactor(70-03): derive the hydrate side's drop events from one record of buckets
2. Task 2: `9286fd74` refactor(70-03): derive the dehydrate side's left-out events from one record of buckets

Tracer gate: Task 1's verify passed end to end except the plan's own commit-file ordering check (below); expansion followed.

## Deviations from Plan

None to the code. Verification-only: Task 1's last commit check compares `git show --name-only | sort` with
`"$E $M "` (engine first), but the sorted order is `HydrationBuckets.ts` then `HydrationEngine.ts`, so it cannot pass as
written. The commit holds exactly those two files (checked by hand, with the trailer present and the tree clean), and
every earlier check of that verify passed. Nothing a gate checks was weakened.

## Known Stubs

None.

## Threat Flags

None. T-70-05 (an unreported reason), T-70-06 (foreign entry encoded or misreported) and T-70-07 (a refused entry seeded) are
held by the total constructors, the subject check running first with `continue`, and the unchanged characterisation.

## Self-Check: PASSED

- FOUND: packages/react/src/HydrationBuckets.ts; commits 072972da and 9286fd74 are ancestors of HEAD.
