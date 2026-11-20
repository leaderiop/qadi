---
phase: QD-62-type-pins-that-can-fail
plan: 01
subsystem: testing
tags: [tstyche, effect-language-service, floatingEffect, type-tests]
phase_base: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_before: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_after: 77775bbd0fa6fa701c3a46ffa118dc9f041ac714
requires: []
provides:
  - tsconfig.tstyche.json (tstyche's own compilation, floatingEffect off)
  - FloatingEffectPins.tst.ts (characterisation of tstyche's reading under both settings)
affects: [62-02, 62-03, 62-04, 62-05, 62-06, 62-07, 62-08]
tech-stack:
  added: []
  patterns: ["tstyche compiles under a child tsconfig that restates the whole language-service plugin entry"]
key-files:
  created:
    - packages/core/test/FloatingEffectPins.tst.ts
    - tsconfig.tstyche.json
  modified:
    - tstyche.json
    - packages/core/test/DecisionCache.tst.ts
    - packages/core/test/PortAccess.tst.ts
    - packages/devtools/test/model/DiagnosticsStore.tst.ts
    - packages/core/test/Qadi.tst.ts
    - packages/core/test/DecisionStream.tst.ts
decisions:
  - "tstyche gets its own tsconfig with floatingEffect off; the in-file position directive turns the rule back on for the rule-on half of the characterisation"
requirements: [PIN-01, PIN-02, WX-04, WX-05, WX-06, WX-07]
metrics:
  duration: ~20min
  completed: 2026-11-20
status: complete
actuals:
  tokens: 4500
  tasks: 2
  commits: 2
---

# Phase QD-62 Plan 01: tstyche's own tsconfig with floatingEffect off Summary

tstyche now compiles under `tsconfig.tstyche.json` (`tsconfig.test.json` plus the full language-service entry with `floatingEffect: "off"`), and one committed characterisation file pins tstyche's reading of an Effect-returning call under both settings of the rule.

## Base facts

HEAD before the first commit: `4cab2e74afd9487e19d9f025dd7a6436e459ba5c` (the plan's text cites `8b99561e` as plan-time HEAD; the facts are unchanged).

- `house-style: 560 file(s) clean (3 declared switch(es))`
- `dod-table: 25 step(s) match pnpm check, 150 reference(s) resolve`
- `api-surface: 939 export(s) documented across 9 package(s)`
- 65 type-test files (`git ls-files '*.tst.*'`)
- 81 negative callable plus 7 negative constructable pins in 28 files (comment-skipping line scan)

## RED evidence

Task 1 step 3, file under tstyche with `tstyche.json` still naming `tsconfig.test.json` (exit 1):

```
uses TypeScript 6.0.3 with ./tsconfig.test.json
  × an Effect, a Stream or a constructed Effect is callable with valid arguments
Error: Expression is not callable with the given argument.      (x2, f and s)
Error: Expression is not constructable with the given argument. (C)
Error: The 'expect()' was supposed to fail, but it passed.      (x3)
Targets:    1 failed, 1 total
Test files: 1 failed, 1 total
Tests:      1 failed, 3 passed, 4 total
Assertions: 3 failed, 8 passed, 11 total
```

Green under the new config: `uses TypeScript 6.0.3 with ./tsconfig.tstyche.json`, `Tests: 4 passed`, `Assertions: 8 passed, 3 fixme, 11 total`.

Rule-on pass with `--skip "under the tstyche tsconfig"`: green. Unskipped rule-on run (`--tsconfig tsconfig.test.json`), the permanent RED twin, exit 1 with exactly three `was supposed to fail, but it passed` and `Assertions: 3 failed, 8 passed, 11 total`.

`pnpm test:tstyche`: `Test files: 66 passed, 66 total`, `Assertions: 745 passed, 3 fixme, 748 total`.

## Re-grep

`floating|vacuous|language service|synthes` over `packages/*/test/**/*.tst.ts` hit exactly the five reworded spans (`DecisionCache.tst.ts:11`, `PortAccess.tst.ts:33`, `Qadi.tst.ts:172`, `DecisionStream.tst.ts:50`, `DiagnosticsStore.tst.ts:22-23`) plus the three that stay (`Qadi.tst.ts:95`, `Facade.tst.ts:9-10`, and `FloatingEffectPins.tst.ts` itself). No new hit.

## Typecheck

`pnpm typecheck` (`tsc -b tsconfig.json && tsc -p tsconfig.test.json`, TypeScript 7.0.2 with effect-tsgo) accepts the file and its in-file directive: exit 0. `pnpm lint` exit 0.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: packages/core/test/FloatingEffectPins.tst.ts, tsconfig.tstyche.json, tstyche.json
- FOUND commits f72593b1 (test(62-01)) and 77775bbd (docs(62-01))
