---
phase: QD-69-one-total-thrown-value-to-message-module
plan: 01
subsystem: testing
tags: [stryker, mutation-base, red-tests, thrown-value, core]
phase_base: 19fe6244bc8b3494823732b1fbf87f3947852fd8
plan_head_before: 19fe6244bc8b3494823732b1fbf87f3947852fd8
plan_head_after: 84ba1d3c41268eec7bc05fd4b54e6575aa083775
requires: []
provides:
  - "69-mutation.mjs: the phase's mutation scorer (record base|close, compare, judge with the removed-mutant rule, judgeNew, self-test)"
  - "69-mutation-base.json: base counts and open/Ignored mutants of the core, http, devtools and react groups, measured at phase_base"
  - "nine core RED cases (R1 to R9), each failing on the base for the reason it names"
affects: [69-02, 69-03, 69-04, 69-05, 69-06, 69-09]
actuals:
  tokens: 20600
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["hostile-value fixtures (toString and message getter both throw; an Error whose message getter throws)", "red-check multiset of failed titles from vitest JSON"]
key-files:
  created:
    - .planning/phases/QD-69-one-total-thrown-value-to-message-module/69-mutation.mjs
    - .planning/phases/QD-69-one-total-thrown-value-to-message-module/69-mutation-base.json
  modified:
    - packages/core/test/PortWire.test.ts
    - packages/core/test/PortKey.test.ts
    - packages/core/test/PortDescription.test.ts
    - packages/core/test/SinkCodec.test.ts
    - packages/core/test/PortConformance.test.ts
    - packages/core/test/Evaluate.test.ts
key-decisions:
  - "The scorer's per-file survived and no-coverage counts are recorded in the base, so the close can tell removed killed mutants from a weakened test (D-17)"
  - "A close-only group (`thrown`) is judged by judgeNew: no open mutant, Ignored allowed; `record base thrown` is refused through usage()"
requirements-completed: [THRW-01, WX-05, WX-06, WX-07]
status: complete
duration: ~40 min
completed: 2026-11-22
---

# Phase 69 Plan 01: Mutation base and core RED cases Summary

The phase base is measured in four Stryker groups by a committed scorer, and nine core cases are pinned red on that base through their own entries before any source changes.

## Base facts

Contents of `<S>/base-facts.txt` (`<S>` is `$TMPDIR/qd69`), taken at `phase_base` 19fe6244:

```
house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
api-surface: 939 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 153 reference(s) resolve
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 117 block(s) compile
spec-revise: every Revision matches its newest Change History entry
| PASS   | invariants -> traceability                 | all 154 invariant(s) traced
| PASS   | decisions -> traceability                  | 138 ADR(s) traced
| PASS   | ADR Document ID = file number              | 114 ADR(s) agree
6
7
reservation-sha256: 07a779c95ed6f98639077d67dedd68179830521c7aeb5adf925ad6b21749836f
```

The two bare numbers are the inline `instanceof Error ? … : String(…)` copies (6) and the `Cause.pretty(` calls (7) in `packages/*/src`.

## Mutation base (`record base` output)

Format: detected/valid, survived, no coverage, ignored. Every group has `head` = `phase_base`.

| File | Score | Survived | No coverage | Ignored |
| --- | --- | --- | --- | --- |
| core `CustomPredicate.ts` | 36/37 | 1 | 0 | 34 |
| core `JsonHazard.ts` | 192/213 | 19 | 2 | 46 |
| core `PortDerivation.ts` | 49/50 | 1 | 0 | 14 |
| core `PortKey.ts` | 168/168 | 0 | 0 | 4 |
| core `PortWireEncode.ts` | 25/29 | 4 | 0 | 19 |
| core `SinkCodec.ts` | 123/127 | 4 | 0 | 45 |
| http `RemotePorts.ts` | 5/6 | 1 | 0 | 2 |
| devtools `Capture.ts` | 51/51 | 0 | 0 | 5 |
| devtools `DiagnosticsFeed.ts` | 73/73 | 0 | 0 | 13 |
| devtools `DiagnosticsStore.ts` | 57/57 | 0 | 0 | 6 |
| devtools `ExplorerSession.ts` | 167/175 | 8 | 0 | 4 |
| devtools `GatesFeed.ts` | 118/118 | 0 | 0 | 4 |
| devtools `TimelineFeed.ts` | 50/50 | 0 | 0 | 10 |
| react `DeveloperSignals.ts` | 86/89 | 3 | 0 | 23 |

The new `ThrownMessage.ts` is the close-only `thrown` group and has no base.

## RED runs

- Conversions (`PortWire`, `PortKey`, `PortDescription`, `SinkCodec` tests): exit 1, `red-check: 6 failed as named, 271 passed`. Failure reasons seen: R1, R2, R3, R4 throw `Error: toString threw` out of the documented-total function; R5 gives `'Error: boom'` where `'boom'` is wanted; R6 gives the number `42` where `'Error: 42'` is wanted.
- Custom predicate (`PortConformance`, `Evaluate` tests): exit 1, `red-check: 3 failed as named, 331 passed`. R7 gives `'<unrenderable cause>'` for the plain hostile value (and throws for the hostile `Error`); R8 and R9 throw `message threw` out of `Cause.pretty`, which ends the evaluation in a defect.
- `a defect is rendered with Cause.pretty and names the same predicate` and `is a placeholder for a value that cannot be rendered` pass on the base, as planned.
- `pnpm typecheck`, `npx oxlint` on every touched file and `node scripts/check-house-style.mjs` (560 files clean) are green; no `packages/*/src` file differs from `phase_base`.
- Scorer: `node 69-mutation.mjs --self-test` ends `self-test: 23 passed`; oxlint clean.

## Task commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | dddbb52a | `docs(69-01)`: the scorer and the four-group base record |
| 2 | 1b8d218d | `test(69-01)`: R1 to R6, core conversions |
| 3 | 84ba1d3c | `test(69-01)`: R7 to R9, the custom predicate |

The tracer gate: Task 1's verify was re-run end to end and passed before the expansion tasks; nothing to expand over a broken base.

## Deviations from Plan

None - plan executed exactly as written.

One environmental note: while the four Stryker base runs executed, an unrelated vitest process from another project on the machine was running (a different repository, not this tree), so the "no vitest or Stryker process" precondition held for this repository only. All four Stryker runs finished with exit 0 and a final score, so the base is unaffected.

## Known Stubs

None.

## Threat Flags

None. No source, endpoint or schema was touched.

## Self-Check: PASSED

- 69-mutation.mjs, 69-mutation-base.json and the six test files exist; commits dddbb52a, 1b8d218d and 84ba1d3c are ancestors of HEAD; each task verify exited 0.
