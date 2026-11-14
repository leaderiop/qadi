---
phase: QD-39-each-hydration-drop-reason-stated-once-with-its-kind
plan: 01
subsystem: hydration
tags: [hydration, drop-reasons, mutation-baseline, characterisation, tstyche]
phase_base: b3b8cdcdb7843944a5795c117b82c8dada530c61
requires: []
provides:
  - 39-mutation-base.json (HydrationMetrics.ts, HydrationEvent.ts at the phase base)
  - the nine drop reasons written out and read off the metric through a fresh registry
  - the three reason unions and react's payload and entry groups written out at type level
  - the base-side new-reason record
affects: [39-02, 39-03, 39-04, 39-05]
tech-stack:
  added: []
  patterns: [hand-written expected values read against a fresh registry]
key-files:
  created:
    - .planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-mutation-base.json
  modified:
    - packages/core/test/HydrationMetrics.test.ts
    - packages/core/test/HydrationMetrics.tst.ts
    - packages/react/test/Hydration.tst.ts
decisions:
  - "The new-reason experiment uses an entry reason (ThrowawayEntry), the kind whose react group feeds the exhaustive bucketOf map, so 39-03's after-record compares like with like"
metrics:
  duration: ~10 minutes
  completed: 2026-11-14
status: complete
commits: 2
plan_head_before: b3b8cdcdb7843944a5795c117b82c8dada530c61
plan_head_after: d84cc614a5c2afb1d14a1de5d3e220fe2265297d
actuals:
  tokens: 1500
  tasks: 3
  commits: 2
requirements-completed: [DROP-03, DROP-04, WX-02, WX-05, WX-06]
---

# Phase 39 Plan 01: Baseline, written-out nine and the new-reason harm Summary

The evidence is recorded on the untouched base: a Stryker baseline of the two files the phase edits, the nine drop reasons and their unions and groups written out (green on the base), and the throwaway new reason on the base, which shows two edits compile clean while the reason never reaches the metric or the panel. No `packages/*/src` change is committed.

## Reserved numbers

ARCH-86, ADR-QD-152, CCR-QD-430, BEH-QD-531 to 535 and INV-QD-323 to 324 are free: every `git grep` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts printed nothing, and `spec/decisions` has no `152-*` file. `next-id.mjs` was not run.

## Mutation baseline (`cd5ea7f7`)

Both runs alone, one after the other, exit 0, with the plan's invocations:

- `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/HydrationMetrics.ts'`
- `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEvent.ts'`

Printed by the writer:

- `packages/core/src/HydrationMetrics.ts 1 (5/5) ignored 72`
- `packages/react/src/HydrationEvent.ts 1 (33/33) ignored 8`
- `{"measured":{"packages/core/src/HydrationMetrics.ts":1,"packages/react/src/HydrationEvent.ts":1},"unmeasured":{},"new":[],"deleted":{}}`

No survivor and no NoCoverage mutant in either file. Only 5 mutants in HydrationMetrics.ts are scored: the reason table, the list and the metric are module scope, which `ignoreStatic` hides (72 ignored), so mutation cannot guard this phase and the snapshot, the type pins and the experiment carry it.

## The written-out cases (`d84cc614`)

- core vitest: `HydrationMetrics.test.ts` 25 passed (25), two of them in `the drop reasons, written out: nine words in their order and no others`; the file still mentions `qadi_` 10 times.
- tstyche core `HydrationMetrics.tst`: 4 passed, 4 total (9 assertions), new test `each reason union, written out`.
- tstyche react `Hydration.tst`: 8 passed, 8 total (19 assertions), new test `the payload and entry groups, written out`.
- `pnpm typecheck` exit 0; `pnpm lint` finished with `house-style: 496 file(s) clean`.

## New reason on the base

Throwaway entry reason `ThrowawayEntry` added by hand to the base source, then restored with `git checkout -- packages/core/src/HydrationMetrics.ts` and the scratch devtools test deleted.

- edit 1: in `ClientHydrationDropReason`, the last member `| "PayloadTooDeep";` followed by `| "ThrowawayEntry";`.
- tsc after edit 1: `pnpm exec tsc -p tsconfig.test.json` failed with one error, `TS2741` at `HydrationMetrics.ts(167,7)`: property `ThrowawayEntry` missing from the `MEANINGS` object. Nothing in react.
- edit 2: the row `ThrowawayEntry: { summary: "a throwaway entry reason", remedy: "a throwaway remedy" },` as the last row of `MEANINGS`.
- tsc after edit 2: exit 0, no diagnostics.
- compiles when missed: `hydrationDropReasons` (`packages/core/src/HydrationMetrics.ts:130-140`, a `ReadonlyArray`, so a missing word compiles), react's `EntryDropReason` (`packages/react/src/HydrationEvent.ts:92`, a literal union restated by hand), and `bucketOf: Record<EntryDropReason, Array<unknown>>` (`packages/react/src/HydrationEngine.ts:517`, which only demands a key once `EntryDropReason` gains the member).
- core vitest: `HydrationMetrics.test.ts` 25 of 25 green, including both written-out lists and the new snapshot, because the list and the metric were not touched.
- devtools panel: the scratch read of `hydrationActivity` failed (`expected undefined to equal +0`, no row for the reason), while the 15 existing devtools Hydration cases, including the `length === 9` pin, stayed green. The reason never reached the metric's words or the panel.
- tstyche: react `Hydration.tst` 1 failed of 8 (`the client's reasons are partitioned into whole-payload and per-entry`: `PayloadRefusalReason | EntryDropReason` is not `ClientHydrationDropReason`) and core `HydrationMetrics.tst` 1 failed of 4 (`each reason union, written out`); every other test green. Only the tstyche partitions notice the missed edits.
- edits a whole reason needs: 5 sites in 3 files (`HydrationMetrics.ts` for the union, `MEANINGS` and the list; `HydrationEvent.ts` for `EntryDropReason`; `HydrationEngine.ts` for `bucketOf`, which follows `EntryDropReason`). The compiler asks for 1 of the 5 on its own (`MEANINGS`, after the union); the list and `EntryDropReason` it never asks for, and `bucketOf` it asks for only after `EntryDropReason` is edited.
- reverted: `git status --porcelain -- packages` printed nothing; `git diff --name-only <phase_base> -- packages/core/src packages/react/src packages/devtools` printed nothing. The mechanical repeat of the experiment (the plan's second verify) printed `EXPERIMENT VERIFY OK` and restored the files itself.

## Deviations from Plan

None - plan executed exactly as written.

Two verify notes, neither a plan defect: the writer was run from a scratchpad file (same code, run from the repository root) rather than as an inline `node -e`; and the first Task 2 verify's `-` line scan reports the one removed `import type` line of `HydrationMetrics.tst.ts`, which the plan allows (import block).

Commit trailer: the plan and the dispatch brief name `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, which the commits carry; the harness reminder names a different model, and this was followed as the plan states.

## Known Stubs

None.

## Threat Flags

None. No file under `packages/*/src` changed.

## Self-Check: PASSED
