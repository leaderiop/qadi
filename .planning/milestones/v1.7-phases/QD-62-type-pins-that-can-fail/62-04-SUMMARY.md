---
phase: QD-62-type-pins-that-can-fail
plan: 04
subsystem: testing
tags: [tstyche, type-tests, house-style, budget, agents-md]
phase_base: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_before: a5b9bfa2765601bdb2cf7e754789a983d98e2f72
plan_head_after: 79dd5e69b4c440825e7789ba17432674ba16e375
requires: [62-03]
provides:
  - NOT_CALLABLE_PIN_BUDGET (28 files, 85 callable and 9 constructable pins), counted on tstyche's own file set in both directions
  - "[not-callable-pin] and [not-callable-pin-table] in scripts/check-house-style.mjs"
  - AGENTS.md section 6 rule paragraphs and the `| Type-test file | Callable pins | Constructable pins | Why |` table
affects: [62-05, 62-06, 62-07, 62-08]
tech-stack:
  added: []
  patterns: ["a budget over a gate's own walk of tstyche's default testFileMatch, with a template's ${...} read as code"]
key-files:
  created: []
  modified:
    - scripts/check-house-style.mjs
    - AGENTS.md
decisions:
  - "The budget and its AGENTS.md table land in one commit; the check that holds the table to the budget is the next commit"
requirements: [PIN-05, WX-04, WX-06]
metrics:
  duration: ~15min
  completed: 2026-11-20
status: complete
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase QD-62 Plan 04: Negative type pins counted, both directions Summary

A new negative `toBeCallableWith` or `toBeConstructableWith` pin is now a reviewed edit: `NOT_CALLABLE_PIN_BUDGET` counts them per file on tstyche's own file set, and AGENTS.md section 6 states the rule and the table the gate holds to the budget.

`node scripts/check-house-style.mjs` prints `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`; `tstyche --listFiles` also lists 66. Every budget count matched the tree at the first run, so no row moved.

## RED evidence

`[not-callable-pin]` (`red-pin-budget.mjs`, scratch in `/private/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/qd62-red`, not committed):

```
ok  added: exit 1
ok  removed: exit 1
ok  commented: exit 1
ok  line-split extra: exit 1
ok  constructor added: exit 1
ok  testFileMatch set: exit 1
ok  empty walk: exit 1
ok  pin inside a template interpolation: exit 1
ok  commented extra (twin, clean): exit 0
ok  string extra (twin, clean): exit 0
ok  template text extra (twin, clean): exit 0
red matrix: 11 scenario(s) as expected
```

`[not-callable-pin-table]` (`red-pin-table.mjs`):

```
ok  count edited: exit 1
ok  row removed: exit 1
ok  header renamed: exit 1
ok  row unreadable: exit 1
red matrix: 4 scenario(s) as expected
```

Both runs left `git status --porcelain -- packages tstyche.json` empty, and AGENTS.md hashed the same before and after the table matrix.

## Overload sentence

Added. 62-03 reported `askActed` (`PortAccess.ts:414`) as overloaded and read through `Params<F>`, so the second paragraph of AGENTS.md section 6 carries: `Params<F>` and `Parameters<F>` read only the last overload of an overloaded `F`, so a pin on one names the signature it means.

## Classification check

Each row's Why was checked against `62-PIN-CLASSIFICATION.md`: the 12 `Params<F> over an Effect` pins are `DecisionCache` (3), `PortAccess` (6) and `DiagnosticsStore` (3), the three rows the table words as "refused through `Params<…>`"; the rest are `plain return`. No difference to report. `DecisionLog.tst.ts` has no row, as its negative pin is now stated on the parameter type, not `toBeCallableWith`.

## Verification

- `pnpm lint` exit 0; `node scripts/check-dod-table.mjs` (gate 11): 25 steps match `pnpm check`, 150 references resolve; `[untrusted-decode-table]` still passes.
- Section 6 text check: the rule, both parameter forms, `new`, the positive twin and the characterisation exception are present; the table is 28 rows, 85 callable and 9 constructable, every row has a Why; no CCR id, no ordinal, no bare step or gate 6.
- `git diff --quiet 4cab2e74 -- 'packages/*/src'` holds.

## Deviations from Plan

None - plan executed exactly as written.

## Requirements

PIN-05 is satisfied by this plan; per the orchestrator REQUIREMENTS.md is untouched and the 62-08 sweep closes PIN-*. WX-04 and WX-06 are cross-cutting and untouched.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/check-house-style.mjs, AGENTS.md
- FOUND commits d80b9845, 79dd5e69 (`chore(62-04)`)
