---
phase: QD-65-only-admit-builds-an-admitted
plan: 01
subsystem: testing
tags: [stryker, tstyche, vitest, admission, ts-expect-error]
phase_base: d1ac1df0629e95797f406c5c46da364e6542dce2

requires:
  - phase: QD-59-admission-produces-the-one-walk-environment
    provides: Admission.ts, its mutation record and the SUPPLIED table this phase rewrites
provides:
  - the mutation base of Admission.ts, Predicate.ts and Walk.ts and the scorer the close repeats
  - two construction pins on Admitted, red on the base
  - four getter cases (E7 to E10), three red on the base
  - the pin-code reader and the RED evidence
affects: [QD-65-02, QD-65-03, QD-65-06]

actuals:
  tokens: 11000
  tasks: 3
  commits: 4
plan_head_before: d1ac1df0629e95797f406c5c46da364e6542dce2
plan_head_after: b6b0837259c79f1cda6ffe2fb73f880944f45521
commits: 4

tech-stack:
  added: []
  patterns:
    - "a construction refusal is a reason-bearing @ts-expect-error beside a positive control, with its code read by number from a blanked-directive compile"

key-files:
  created:
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-mutation.mjs
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-mutation-base.json
    - .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-RED-EVIDENCE.md
  modified:
    - packages/core/test/WalkEnvironment.tst.ts
    - packages/core/test/Admission.test.ts

key-decisions:
  - "Each construction refusal is a @ts-expect-error whose text is the reason's own message, not a toRaiseError: one expression cannot carry both (see Flagged for the owner)"

requirements-completed: [ADMT-01, ADMT-03, WX-05, WX-06, WX-07]

duration: 15min
completed: 2026-11-20
status: complete
---

# Phase 65 Plan 01: Measure the base and pin both halves RED Summary

**The mutation base of the three admission files is recorded before any test of the phase exists, and both halves of ARCH-112 (the private constructor and nominal brand refusals, and the single read of the question's resource and action, E7 to E9) are seen failing on the base for the one reason each names.**

## Performance

- **Duration:** about 15 min
- **Completed:** 2026-11-20T18:41:09Z
- **Tasks:** 3
- **Files modified:** 6 (4 created, 2 modified); no `packages/*/src` file

## Accomplishments

- Phase base `d1ac1df0629e95797f406c5c46da364e6542dce2` measured through every gate the phase will move; the Stryker base of `Admission.ts`, `Predicate.ts` and `Walk.ts` recorded by a committed scorer, `head` equal to `phase_base`.
- Two construction pins in `WalkEnvironment.tst.ts`, each beside a positive control on `admit`: red in both tstyche passes (`Tests:      2 failed, 4 passed, 6 total`, each failing on `Unused '@ts-expect-error' directive. ts(2578)`), two `error TS2578` from `pnpm typecheck`, nothing read by `pin-codes.mjs`.
- Getter cases E7 to E10 in a new `describe` of `Admission.test.ts`: E7, E8 and E9 fail with `AssertionError: expected undefined to equal`, E10 and the other 18 tests pass. `Admission.test.ts` gained lines only; `LeafMatrix.test.ts` is untouched.

## Base facts

The contents of `<S>/base-facts.txt` (`<S>` is `$TMPDIR/qd65`, outside the repository):

```text
house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
api-surface: 939 export(s) documented across 9 package(s)
dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 117 block(s) compile
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
spec-revise: 0
old-contract: packages/core/src/Admission.ts:59: * question carries the value) is pinned by the tests, not the type.
old-contract: packages/core/src/Admission.ts:62:  asked: (question) => ({
old-contract: packages/core/src/Admission.ts:66:  row: (question) => ({ action: question.action !== undefined, resource: true }),
old-contract: packages/core/src/Admission.ts:108:          SUPPLIED[rowSource](question),
old-contract: spec/decisions/172-admission-produces-the-one-walk-environment.md:55: (the `SUPPLIED` table sentence)
construction: packages/audit/src/CircuitBreaker.ts:484:    return new Admitted({ probe, generation, attempt });
construction: packages/core/src/Admission.ts:104:        new Admitted(
core: 82 files, 2649 tests, 0 failed
```

(The ADR line is shortened here; the scratch file holds it whole.)

### Mutation base

`65-mutation-base.json`, made by `pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/Admission.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts` (about 56 s):

| File | Detected / valid | Ignored |
| ---- | ---------------- | ------- |
| `Admission.ts` | 18/18 | 4 |
| `Predicate.ts` | 280/280 | 22 |
| `Walk.ts` | 260/273 | 27 |

Open mutants: 11 in `Walk.ts` (2 `NoCoverage` string literals at `:434` and `:486`, 9 `Survived`: seven `depth - 1` arithmetic mutants and two `{}` object-literal mutants at `:705` and `:812`).

Differences from Phase 59's last record of these unchanged files (15/15, 280/280, 261/273): `Admission.ts` holds 18 valid mutants where Phase 59 recorded 15, so the Stryker or ignore handling counted three more there; `Walk.ts` detected 260 where Phase 59 recorded 261 of the same 273. `Predicate.ts` is equal. The differences were not investigated further; the base is what this run found, as the plan asks.

## RED evidence

See `65-RED-EVIDENCE.md` (`## RED on the base`): the two tstyche passes, the empty `pin-codes.mjs` output, the two `error TS2578` lines, and E7 to E10 with the 18 others.

## Task Commits

1. **Task 1 (tracer): the base measured and recorded** - `9cc5b766` (docs)
2. **Task 2: the two construction refusals, red on the base** - `5c71ddea` (test)
3. **Task 3: the getter cases E7 to E10 and the RED evidence** - `4f5a50ef` (test) and `b6b08372` (docs)

The tracer gate was the task's own `<verify>`, re-run end to end after the commit: it passed.

## Files Created/Modified

- `.planning/phases/QD-65-only-admit-builds-an-admitted/65-mutation.mjs` - the phase's mutation scorer (`record base|close`, `compare`)
- `.planning/phases/QD-65-only-admit-builds-an-admitted/65-mutation-base.json` - the base record
- `.planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs` - reads each pin's diagnostic by code, a phase record `pnpm check:pr` does not run
- `.planning/phases/QD-65-only-admit-builds-an-admitted/65-RED-EVIDENCE.md` - the RED runs
- `packages/core/test/WalkEnvironment.tst.ts` - the two refusals, `Admitted` imported as a value (SHA-256 `18fd71fa...`)
- `packages/core/test/Admission.test.ts` - E7 to E10 in a new block (SHA-256 `6186c349...`)

## Decisions Made

None beyond the plan; the pin form is the one the plan chose and is flagged below.

## Deviations from Plan

One cosmetic difference in a record, no behavioural deviation.

- **[Record wording] The `core:` file count.** The plan writes `core: <numTotalTestSuites> files, ...` but vitest's JSON `numTotalTestSuites` counts `describe` suites (573 here), not files. The recorded line uses `testResults.length` (82), which matches the plan's stated expectation of 82 files, 2649 tests, 0 failed. Nothing else depends on the figure.

**Total deviations:** 0 behavioural, 1 recording note. **Impact:** none.

## Issues Encountered

None. The plan's own verifies passed on the first run of each task.

## Flagged for the owner

The context locked the pin form as a `@ts-expect-error` plus a tstyche `toRaiseError(<code>)`. One expression cannot carry both: tstyche's suppressed-error check consumes the diagnostic the directive suppresses, so `toRaiseError` on that expression reports "Expression did not raise a type error", and a `toRaiseError` on a second copy of the expression without a directive is a real error under `pnpm typecheck`. Each refusal is therefore the form `PolicyArity.tst.ts:1-18` already uses: a directive whose text is the reason's own message (TS2673's and TS2741's), which `pnpm typecheck` holds by TS2578 when unused and tstyche's suppressed-error check holds by matching the message in both passes. The code is read by number by `pin-codes.mjs`, the compiler with the directives blanked in memory. That reader is committed in the phase directory, not under `scripts/`, so `pnpm check:pr` does not run it.

## Known Stubs

None.

## Threat Flags

None.

## Next Phase Readiness

Ready for 65-02. `pnpm typecheck` stays red with exactly the two `error TS2578` lines in `WalkEnvironment.tst.ts` until 65-02's class commit; E7 to E9 stay red until 65-03's derivation. No `packages/*/src` file differs from `phase_base`.

## Self-Check: PASSED

Created files exist, and commits `9cc5b766`, `5c71ddea`, `4f5a50ef` and `b6b08372` are on `arch-wave-12` after `phase_base`; all three task verifies exited 0.
