---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
plan: 01
subsystem: testing
tags: [devtools, external-store, listeners, mutation, tdd-red]
phase_base: 8f3cb792c3a92acefadcd32be0f38b0df8f46641
plan_head_before: 8f3cb792c3a92acefadcd32be0f38b0df8f46641
plan_head_after: 0cf59b8bde89ab2edd7d9f186a156ae6c687e6a0
requires: []
provides:
  - the phase's mutation scorer and the Stryker base record of the four model files
  - nine store cases (five red, four green on the base) and one red case per feed through the package root
  - the RED evidence of both runs
affects: [QD-64-02, QD-64-03, QD-64-04, QD-64-05]
actuals:
  tokens: 5800
  tasks: 3
  commits: 4
tech-stack:
  added: []
  patterns:
    - "thrownBy reports whether a call threw and what, so a falsy thrown value still counts as a throw"
    - "the mutation base is recorded by a committed scorer before any test of the phase exists"
key-files:
  created:
    - .planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-mutation.mjs
    - .planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-mutation-base.json
    - .planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-RED-EVIDENCE.md
  modified:
    - packages/devtools/test/helpers.ts
    - packages/devtools/test/model/ExternalStore.test.ts
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/model/GatesFeed.test.ts
key-decisions:
  - "The Stryker base was measured and recorded before the first red test, because a red test aborts Stryker's initial run."
requirements-completed: [LSTN-01, LSTN-02, WX-05, WX-06, WX-07]
status: complete
---

# Phase QD-64 Plan 01: The phase base measured and the new listener contract pinned RED Summary

The Stryker score of the four model files is recorded at the phase base by a committed scorer, and the new listener contract is pinned by nine store cases and one case per feed, each shown failing on the old loop for the reason it names.

Duration: about 25 min. Tasks: 3. Files: 8 (5 tests, 3 phase artifacts). No `packages/*/src` file changed.

## Accomplishments

- `64-mutation.mjs` (`record base|close`, `compare`) and `64-mutation-base.json`, made at `phase_base` by one recorded invocation: ExternalStore.ts 29/30 (ignored 1), TimelineFeed.ts 49/49 (ignored 10), DiagnosticsFeed.ts 72/73 (ignored 13), GatesFeed.ts 118/118 (ignored 4). The two open survivors are `ExternalStore.ts:66 ConditionalExpression -> false` and `DiagnosticsFeed.ts:158 ConditionalExpression -> false`. All four counts equal the plan-time measurement.
- `thrownBy` in `packages/devtools/test/helpers.ts`.
- Nine `makeExternalStore` cases: R1 to R5 fail on the base, C1 to C4 and the five existing cases pass (14 tests).
- TF25, F30 and G48, one per feed through `@qadi/devtools`' root; on the base each fails with `AssertionError: expected [] to deeply equal ...` (the second listener never ran) and the other 84 cases of the three files pass (87 tests).

## Base facts

```
house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
api-surface: 939 export(s) documented across 9 package(s)
dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 117 block(s) compile
spec-revise --check exit 0
old-contract lines: 7
packages/devtools/README.md:164
packages/devtools/src/model/DiagnosticsFeed.ts:97
packages/devtools/src/model/GatesFeed.ts:8
packages/devtools/src/model/GatesFeed.ts:77
packages/devtools/src/model/TimelineFeed.ts:57
packages/devtools/src/model/TimelineFeed.ts:66
spec/behaviors/28-devtools-screens.md:2548
aggregateerror count (outside .planning): 0
throw lines near subscribe(() => { in devtools tests: 0
devtools suite: files 70, tests 1647, failed 0
```

The last two zero counts confirm that no existing devtools test asserts a message from a second throw, which the seam change in the next plan would otherwise break.

## RED evidence

`64-RED-EVIDENCE.md` (`## RED on the base`) holds both runs as tables of case, title, status and first failure line.

## Commits

- 2c1387a9 docs(64-01): record the mutation base of the four model files
- 1bb27bd1 test(64-01): the store calls every listener and rethrows what they threw, red on the base
- ee7e1a24 test(64-01): each feed calls a second listener after a first one throws, red on the base
- 0cf59b8b docs(64-01): RED evidence on the base

## Verification

- The three task verifies exit 0 (`base measured and recorded`, `the store suite is red on exactly the five planned cases`, `each feed is red on exactly its planned case`).
- `pnpm typecheck` and oxlint on every touched test file are clean.
- `git diff phase_base..HEAD -- packages/*/src` is empty.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

All created files exist and the four commits are ancestors of HEAD.
