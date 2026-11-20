---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
plan: 02
subsystem: devtools
tags: [devtools, external-store, listeners, aggregate-error, variants]
phase_base: 8f3cb792c3a92acefadcd32be0f38b0df8f46641
plan_head_before: c0d66f1a30674f96c72748c804ba87259f41f56c
plan_head_after: 0cda2323c66c63db2dae050bf471d9514fb866f6
commits: 2
requires:
  - phase: QD-64-one-throwing-listener-cannot-silence-the-rest
    provides: "plan 01's nine store cases and three feed cases, red on the base"
provides:
  - "ExternalStore.ts notify: every listener called, what they threw rethrown by count"
  - "the listener contract paragraph and subscribe's doc"
  - "the seam's variant matrix (v0 to v8) in 64-RED-EVIDENCE.md"
affects: [QD-64-03, QD-64-04, QD-64-05]
actuals:
  tokens: 900
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns:
    - "a notification collects what its listeners threw and decides by count alone: none, the value itself, or one AggregateError"
key-files:
  created: []
  modified:
    - packages/devtools/src/model/ExternalStore.ts
    - .planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-RED-EVIDENCE.md
key-decisions:
  - "The zero check comes first, then the one, then the aggregate, so a mutant turning the single-value check into >= 1 changes an observable result."
  - "The AggregateError message is written inline in the throw, not as a module-scope constant, because stryker.devtools.mjs ignores static initialisers."
requirements-completed: [LSTN-01, LSTN-02, LSTN-04, WX-04, WX-06]
duration: 9 min
completed: 2026-11-20
status: complete
---

# Phase QD-64 Plan 02: The seam Summary

**`makeExternalStore`'s `notify` now calls every listener of the live set and then rethrows what they threw, decided by count (none, the thrown value itself, or one `AggregateError` of all), with each part of that contract shown pinned by a one-edit variant.**

## Performance

- **Duration:** 9 min
- **Completed:** 2026-11-20T14:44:43Z (before this summary)
- **Tasks:** 2
- **Files modified:** 2 (plus this summary)

## Accomplishments

- One function body changed in `packages/devtools/src/model/ExternalStore.ts`; every store and feed built on it inherits the contract. `set`'s identity check, `publish`'s always-notify and the value assigned before `notify` are unchanged.
- Every RED case from plan 01 is green on the one seam commit: model suites 101 of 101, the whole devtools project 1659 of 1659.
- The dock characterisation tests pass 49 of 49 (`QuestionsPanel.characterisation`, `QuestionsPanel.feed.characterisation`, `ServicesPanel.characterisation`, `useStoreSnapshot`) and the diff of those four files against `phase_base` is empty.
- `pnpm typecheck`, `npx oxlint` on the file and house-style (`house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`, unchanged) are clean; the seam adds no `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, console, `process.env` or clock.
- The variant matrix printed `variants: 9 of 9 as expected` and left `ExternalStore.ts` equal to HEAD.

## Variant table

| Variant | Edit | Tests | Failed | Result |
| --- | --- | --- | --- | --- |
| v0 | unedited | 14 | 0 | as expected |
| v1 | iterate a snapshot of the set | 14 | 2 | as expected |
| v2 | notify before the value is assigned | 14 | 1 | as expected |
| v3 | decide by the first thrown value's truthiness | 14 | 2 | as expected |
| v4 | flatten a nested AggregateError | 14 | 1 | as expected |
| v5 | count in the message | 14 | 1 | as expected |
| v6 | no early return when nothing threw | 14 | 6 | as expected |
| v7 | swallow what a listener throws | 14 | 6 | as expected |
| v8 | rethrow the first of several | 14 | 3 | as expected |

## Task Commits

1. **Task 1: the seam (tracer)** - `1d3207a4` (fix) - only `ExternalStore.ts`, after both `test(64-01)` commits. Tracer verify re-run end to end: passed.
2. **Task 2: the seam's variant matrix** - `0cda2323` (docs) - only `64-RED-EVIDENCE.md`.

**Plan metadata:** the `docs(64-02): summary` commit.

## Files Created/Modified

- `packages/devtools/src/model/ExternalStore.ts` - `notify` collects what each listener threw, then returns, rethrows the one value, or throws `new AggregateError(thrown, "More than one of the store's listeners threw.")`; the module doc gains the listener-contract paragraph (ADR-QD-177) and `subscribe` a three-line doc.
- `.planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-RED-EVIDENCE.md` - `## The seam's variants`.

## Decisions Made

- Assumption-delta decision: `no-change`. A second throw is the multi-error case the plan's D1 already models; it names no new plural entity.
- The checks run in the order zero, one, aggregate, and the message is an inline literal; both choices are the plan's, for the reasons in `key-decisions`.

## Deviations from Plan

None - plan executed exactly as written.

The Stryker run over the four model files that the plan cites as plan-time evidence was not repeated here; the plan assigns the close-out measurement to a later plan, so this summary claims nothing about mutation scores.

## Issues Encountered

None. The plan's verify commands are single-line `bash -c` scripts; they were extracted verbatim from the plan into scratch files and run as written.

## Known Stubs

None.

## Threat Flags

None. T-64-04 to T-64-07 are mitigated as the plan states (nothing swallowed: v7 fails six cases; every listener called: R1 and the feed cases; fixed message: v5; the variant script restores the file and the verify checks it equals HEAD).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The seam is committed and pinned; plan 03 (feed listener texts, README paragraph, changeset) and plan 04 (ADR-QD-177 and the other records) can cite it. `.planning/REQUIREMENTS.md` ticks stay with plan 64-05 per the orchestrator.

## Self-Check: PASSED

- `packages/devtools/src/model/ExternalStore.ts`: FOUND
- `64-RED-EVIDENCE.md` section `## The seam's variants`: FOUND
- Commits `1d3207a4`, `0cda2323` are ancestors of HEAD: FOUND
- Both task verifies exit 0.

---
*Phase: QD-64-one-throwing-listener-cannot-silence-the-rest*
*Completed: 2026-11-20*
