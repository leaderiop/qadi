---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
plan: 01
subsystem: react-hydration
tags: [mutation-record, characterisation, hydration, drop-events]
phase_base: 3630e29865bbaed49126b214f0f6cc7006b6f4bc
requires: []
provides:
  - "70-mutation.mjs: the phase scorer (react group measured, buckets group close only)"
  - "70-mutation-base.json: HydrationEngine.ts measured on phase_base, 169/169 detected, 36 Ignored"
  - "HydrationDropEvents.test.ts: 32-row characterisation of every drop event, order and count"
affects: [70-02, 70-03, 70-04, 70-07]
tech-stack:
  added: []
  patterns: ["table-driven characterisation through hydrateWith/dehydrateWith with a reporter that snapshots counts at call time"]
key-files:
  created:
    - .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-mutation.mjs
    - .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-mutation-base.json
    - packages/react/test/HydrationDropEvents.test.ts
  modified: []
key-decisions:
  - "Characterisation compares reporter entries by reference identity, not deep equality, so input order is pinned and the 266-level-deep entries are never deep-compared."
  - "No row of the plan's table disagreed with the base; no expectation was corrected."
requirements-completed: [DRPE-04, WX-05, WX-06, WX-07]
duration: 10 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: 3630e29865bbaed49126b214f0f6cc7006b6f4bc
plan_head_after: b64345720cbe332a9202db49c091bee7563a4ade
actuals:
  tokens: 26000
  tasks: 2
  commits: 2
---

# Phase 70 Plan 01: Mutation base and drop-event characterisation Summary

The phase base is measured (gate lines plus a Stryker record of `HydrationEngine.ts`, 169/169 detected) by a committed
scorer, and every hydration drop event, its order and its counts are pinned by a 32-row characterisation that is green
on the untouched engine.

## Accomplishments

- `70-mutation.mjs`: a copy of Phase 69's scorer with groups `react` (`HydrationEngine.ts`) and `buckets` (close only);
  `--self-test` ends `self-test: 24 passed`; oxlint clean.
- `70-mutation-base.json`: `phase: "70"`, one group `react`, `head` = phase base, invocation
  `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/HydrationEngine.ts`.
- `packages/react/test/HydrationDropEvents.test.ts`: exactly the 32 titles of the plan's table, through `hydrateWith`
  and `dehydrateWith`; per row the reporter calls (reason, entries by reference, `wholePayload`) in order, the delta of
  all nine drop reasons, the seeded or dehydrated delta, and inside each reporter call that its reason is already counted
  while the seeded/dehydrated count has not moved. The whole react project (567 tests) and `tsc -p tsconfig.test.json`
  pass; oxlint is clean; no `packages/*/src` file changed.

## Base facts

HEAD at start and `phase_base`: `3630e29865bbaed49126b214f0f6cc7006b6f4bc`. `git diff --quiet f687ce51 HEAD -- packages
spec scripts .changeset` held (the plan-time HEAD `f687ce51` and this base differ by planning-only commits 7c55e2ec,
f68a6aaa, 2ce41b8e, 3630e298). `<S>/base-facts.txt`, verbatim:

```
house-style: 563 file(s) clean (3 declared switch(es), 66 type-test file(s))
api-surface: 941 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 154 reference(s) resolve
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 118 block(s) compile
spec-revise: every Revision matches its newest Change History entry
| PASS   | invariants -> traceability                 | all 156 invariant(s) traced
| PASS   | decisions -> traceability                  | 139 ADR(s) traced
| PASS   | ADR Document ID = file number              | 115 ADR(s) agree
reservation-sha256: 07a779c95ed6f98639077d67dedd68179830521c7aeb5adf925ad6b21749836f
```

The base per-file line the record printed:
`packages/react/src/HydrationEngine.ts 169/169 survived 0 no coverage 0 ignored 36`. Final Stryker score 100.00 (run took
32 s). The 36 Ignored mutants by kind: `ArrowFunction () => undefined` 18, `ObjectLiteral {}` 10, `StringLiteral ""` 6,
`ArrayDeclaration []` 2. (Phase 42's older report of this file showed 183 Killed / 18 Ignored; the base run is the truth.)

Scratch (outside the repository): `<S>` = `/private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd70`; it holds
`phase_base`, `char-check.mjs`, `base-facts.txt` and the logs.

## Task Commits

1. Task 1 (tracer): `0545ca41` docs(70-01): record the mutation base of the hydration engine
2. Task 2: `b6434572` test(70-01): characterise every hydration drop event, its order and its counts

Tracer gate: the Task 1 verify exited 0 (`base measured and recorded`) and was re-run end to end before expansion;
`Tracer verified end-to-end - expanding`.

## Deviations from Plan

None - plan executed exactly as written.

Characterisation rows corrected to the base: none. All 32 rows matched the engine's observed output on the first run.

Verification-only notes: the plan's two `<automated>` blocks were run verbatim (extracted from the plan, XML entities
decoded) and both exit 0. A first `tsc -p tsconfig.test.json` showed one error in the new test (`InitialValues` is an
`Iterable`, not an array, so `.length` does not exist); fixed to `[...initial].length` before the test commit.

## Known Stubs

None.

## Threat Flags

None.

## Issues Encountered

None.

## Self-Check: PASSED

- FOUND: 70-mutation.mjs, 70-mutation-base.json, HydrationDropEvents.test.ts
- FOUND: commits 0545ca41, b6434572 (ancestors of HEAD)
- `git status --porcelain -- packages spec scripts .changeset` empty.
