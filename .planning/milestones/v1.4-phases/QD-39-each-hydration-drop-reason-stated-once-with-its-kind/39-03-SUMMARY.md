---
phase: QD-39-each-hydration-drop-reason-stated-once-with-its-kind
plan: 03
subsystem: hydration
tags: [hydration, drop-reasons, react, type-level, derivation]
phase_base: b3b8cdcdb7843944a5795c117b82c8dada530c61
requires: [39-02]
provides:
  - react's PayloadRefusalReason and EntryDropReason read off core's drop-reason table by kind
  - the after-change new-reason record, beside 39-01's base record
affects: [39-04, 39-05]
tech-stack:
  added: []
  patterns: [kind subset of a keyed table as a type alias, record total over a derived union]
key-files:
  created: []
  modified:
    - packages/react/src/HydrationEvent.ts
key-decisions:
  - "A payload row compiles everywhere: react's payload refusal map is keyed by the decoder's refusal tags, not by reason, so only an entry row is a compile error (at bucketOf)"
requirements-completed: [DROP-02, DROP-04, WX-04, WX-06]
duration: ~15 minutes
completed: 2026-11-14
status: complete
commits: 1
plan_head_before: 518aa6840d59edcf6e03e5abc696992a59a29ef3
plan_head_after: 32bca17747e536d511fd6f1ff91e0988c4464d6a
actuals:
  tokens: 6000
  tasks: 2
  commits: 1
---

# Phase 39 Plan 03: React's groups read off core's table Summary

React no longer restates any hydration drop reason: `PayloadRefusalReason` is `HydrationDropReasonOf<"payload">` and `EntryDropReason` is `HydrationDropReasonOf<"entry">`, the hand-placement doc is gone, and `HydrationEngine.ts` and `DeveloperSignals.ts` are byte-identical to the phase base.

## Accomplishments

- `packages/react/src/HydrationEvent.ts` (commit `32bca177`, the only source change): type import of `HydrationDropReasonOf` from `@qadi/core`, both groups derived, docs rewritten to say they are read off core's table by kind and cite ADR-QD-152; `EntryDropReason`'s doc says the engine's bucket record is total over it.
- First verify (scan, one changed file, diff stops at base line 92, no cast/any/switch, ADR-QD-152 cited, no other id): rc 0. The react code-only scan for a reason word beside `|` counts 0 (7 at the base). `HydrationEvent.ts` is the only react source file changed since the phase base.
- Second verify: core 25 of 25, devtools 15 of 15, react hydration and signal suites all green, react tstyche `Hydration.tst` `Tests: 8 passed, 8 total`, no test changed since `test(39-02)`, devtools and examples unchanged since the base.
- Third verify: `pnpm test:tstyche`, `pnpm typecheck`, `pnpm lint` (66 pre-existing warnings, no errors), `pnpm circular` (no cycle), `pnpm run build`, example typecheck and the example's `vitest run` (`Test Files 7 passed (7)`, `Tests 42 passed (42)`) all exit 0.

## New reason after the change

Throwaway entry reason `ThrowawayEntry` added by hand to the converted source, then restored with `git checkout -- packages/core/src/HydrationMetrics.ts`; the scratch devtools test was written and deleted by the mechanical repeat (the plan's second verify of Task 2, which printed no error and restored the files itself).

- edit: one row, `ThrowawayEntry: { kind: "entry", summary: "a throwaway entry reason", remedy: "a throwaway remedy" },`, the table's last row, directly above its closing `} as const satisfies` line.
- tsc: `pnpm exec tsc -p tsconfig.test.json` fails with exactly one error, `TS2741` at `packages/react/src/HydrationEngine.ts(517,9)`: property `ThrowawayEntry` is missing in type `{ EntryTooDeep: unknown[]; MalformedEntry: unknown[]; UndecodablePolicy: unknown[]; }` but required in `Record<EntryDropReason, unknown[]>` (`bucketOf`). Nothing in core.
- metric preregistered words: the scratch case `the throwaway reason is a preregistered word of the metric, at zero` is green (`occurrences.get("ThrowawayEntry")` is 0); core's `HydrationMetrics.test.ts` is red in exactly three oracles of 25, each noticing a tenth word (`names every drop reason, in order`, `covers every reason, with a distinct non-empty sentence of each kind`, `the metric preregisters the nine words, in order, at zero`); `a name every object inherits is not a reason` stays green.
- devtools panel: the scratch case `the throwaway reason reaches the panel at zero` is green (the row has `count` 0 and `meaning` `a throwaway entry reason`); only the length pin `reports every reason, including the ones that never fired` is red, of 15.
- react reporters: the compile error at `bucketOf` is where react must say something (a bucket for the new entry reason); react's runtime suites (hydration files and `DeveloperSignals.test.ts`) stay green, because the reporters read the meaning from the row.
- tstyche: react `Hydration.tst` red only in `the payload and entry groups, written out` (1 of 8); core `HydrationMetrics.tst` red only in `each kind holds exactly its reasons, written out` and `each reason union, written out` (2 of 9), its three suppressed errors still matched.
- a payload row instead: `ThrowawayPayload: { kind: "payload", ... }` compiles (tsc exit 0), because react's payload refusal map goes from the decoder's refusal tags (`TooDeep`, `Malformed`, `UnsupportedPayloadVersion`) to a reason and nothing in react is total over `PayloadRefusalReason`; the row reaches the reporters with its meaning and is emitted by nothing until a refusal that produces it is written. Carried into ADR-QD-152's consequences by 39-04.
- against the base: on the base a whole reason needed 5 edits in 3 files and the compiler asked for 1 of them on its own (`MEANINGS`) and the metric, the panel and react's bucket record saw none of it (`compiles when missed:` was the list, `EntryDropReason`, and `bucketOf` until `EntryDropReason` was edited); now it needs 1 row edit, and the list, the metric's words, the panel row and react's bucket record all see it, with the compiler naming the one remaining thing (`bucketOf`) for an entry reason.
- reverted: `git status --porcelain -- packages` prints nothing and nothing in packages differs from the `refactor(39-03)` commit.

## Deviations from Plan

None - plan executed exactly as written. One flagged finding recorded as found, not corrected (D-10): a `payload` row is not a compile error in react, only an `entry` row is (see `- a payload row instead:` above); the dispatchers stay untouched by design and 39-04 states it in ADR-QD-152's consequences.

**Total deviations:** 0 auto-fixed. **Impact:** none.

## Decisions Made

- A payload row compiles everywhere; making it a compile error would need a reason-keyed construct in `HydrationEngine.ts`, which D-10 and the Phase 42 edge forbid.

## Known Stubs

None.

## Threat Flags

None. T-39-06 is mitigated by the derivation (a new entry reason without a bucket is TS2741); T-39-07 by the restored tree (verified clean).

## Next Phase Readiness

Ready for 39-04 (ADR-QD-152, spec rows, changesets, including the payload finding). Gate 13 (`pnpm spec:api`) is expected red until then and was not run.

## Self-Check: PASSED

- `packages/react/src/HydrationEvent.ts` present; commit `32bca17747e536d511fd6f1ff91e0988c4464d6a` is an ancestor of HEAD.
- Task 2's two automated verifies pass (record sections present; mechanical repeat green; tree clean).
