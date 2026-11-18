---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 02
subsystem: core
tags: [characterisation, red-tests, record-wire, stored-envelope, unknown-key-policy]
requires: [57-01]
provides:
  - the record wire's per-policy matrix R1..R14 and the stored envelope's S1..S15 on the base
  - ten RED rows for D-01, D-17 and D-18, committed before any packages/*/src change
affects: [57-05, 57-06, 57-07]
actuals:
  tokens: 3500
  tasks: 2
  commits: 2
plan_head_before: 40bfef0d5d7b99be097442609092c22888e9ba93
plan_head_after: c0de5d80446305441419ef391789f124436859fb
tech-stack:
  added: []
  patterns: ["characterise on the base, then RED rows beside the pins they move, each committed alone"]
key-files:
  created: []
  modified:
    - packages/core/test/UntrustedSeams.test.ts
key-decisions:
  - "Row messages are written as double-quoted strings with escaped quotes (the plan's verify greps the escaped form); the helper tests compare `message` with `assert.strictEqual`"
requirements-completed: [KEYP-01, KEYP-03, KEYP-05, WX-06]
duration: 14min
completed: 2026-11-18
status: complete
---

# Phase QD-57 Plan 02: The record wire and the stored envelope per policy

Two per-policy `describe` blocks in `packages/core/test/UntrustedSeams.test.ts`: 19 characterisation rows green on the base, then ten RED rows for D-01, D-17 and D-18 that fail by assertion.

## Measured messages pinned (on the base)

- Record wire, `5`, `null`, `[]` and an unknown `_tag` (R8, R10), and the stored envelope's `record: null` (S8): `Expected { readonly "_tag": "Decision", readonly "version": 2, ... } | { readonly "_tag": "Obligations", readonly "version": 2, ... }`.
- R11 (no `_tag`): `Missing key\n  at ["_tag"]\nExpected no excess property\n  at ["policy"]`.
- R7 and S5 (an excess key in the policy): `Expected no excess property\n  at ["policy"]["sneaky"]`.
- R9 and R13: `UnsupportedVersion` carrying `undefined`, `supported: [2]`.
- R6, S6: `TooDeep` with `maxDepth: 256`.
- R12: an Obligations record carrying `policy` is accepted on all three entry points.

## RED on the base

`pnpm exec vitest run --project core packages/core/test/UntrustedSeams.test.ts -t '\((D-01|D-17|D-18)\)' < /dev/null`: `Tests  10 failed | 60 skipped (70)`. Every row fails on an assertion; no resolve error, TypeError or RangeError.

```
FAIL R3 an unknown top-level key 266 deep -> success on all three entry points (D-01)
  AssertionError: expected { maxDepth: 256, _tag: 'TooDeep' } to equal undefined
FAIL R4 an unknown top-level key 60,000 deep -> success, no throw (D-01)
  AssertionError: expected { maxDepth: 256, _tag: 'TooDeep' } to equal undefined
FAIL R5 a deep unknown key and version 3 -> UnsupportedVersion carrying 3 (D-01)
  AssertionError: expected 'TooDeep' to equal 'UnsupportedVersion'
FAIL R14 an own __proto__ key holding a value 266 deep -> success (D-01)
  AssertionError: expected { maxDepth: 256, _tag: 'TooDeep' } to equal undefined
FAIL S10 5, null, [] and a string -> Malformed, expected object (D-17)
  AssertionError: expected 'a stored record is a JSON object { en…' to equal 'Expected object'
FAIL S11 {}, { cursor } and a bare record -> Malformed, missing environment (D-17)
  AssertionError: expected 'a bare record, not a stored-record en…' to equal 'Missing key\n  at ["environment"]'
FAIL S12 { environment } with no record -> Malformed, missing record (D-17)
  AssertionError: expected 'a stored record names no record' to equal 'Missing key\n  at ["record"]'
FAIL S13 { record } and an inherited environment -> Malformed, missing environment (D-17)
  AssertionError: expected 'a stored record\'s environment is not…' to equal 'Missing key\n  at ["environment"]'
FAIL S14 { environment: 1, record } -> Malformed, environment not a string (D-17)
  AssertionError: expected 'a stored record\'s environment is not…' to equal 'Expected string\n  at ["environment"]'
FAIL S15 an environment nested past the bound -> TooDeep naming 256 (D-18)
  AssertionError: expected { …(2) } to deeply equal { _tag: 'TooDeep', maxDepth: 256 }
```

The filtered run that excludes those tags (`-t '^(?!.*\((?:D-01|D-17|D-18)\))'`) is green: `60 passed | 10 skipped`.

## Task Commits

1. Task 1: `9572df5d` `test(57-02): characterise the record wire and the stored envelope per policy on the base` (R1, R2, R6..R13, S1..S9; the file alone).
2. Task 2: `c0de5d80` `test(57-02): RED, an ignored record key is not walked and the stored envelope's refusals are the decoder's (D-01, D-17, D-18)` (R3, R4, R5, R14, S10..S15; additive, the file alone).

No `packages/*/src` file changed since `phase_base`; the `:195` pin, `SinkCodec.test.ts`, `Source.test.ts` and `AuditEntryDifferential.test.ts` are byte-identical to `phase_base`. The file typechecks (`tsc -p tsconfig.test.json`) and passes `oxlint`.

## Deviations from Plan

**1. [Rule 3 - Blocking] The first commit was amended once.** The Task 1 verify greps the pinned message in its escaped form (`at [\"policy\"][\"sneaky\"]`), which a single-quoted TypeScript literal does not contain. R7 and S5 were rewritten as double-quoted literals and the unpushed Task 1 commit amended (`0eeb91b8` to `9572df5d`) so the first `test(57-02)` commit satisfies its own verify. Same assertions, same messages.

Total deviations: 1 (blocking, no behaviour change). Impact: none.

## Known Stubs

None.

## Self-Check: PASSED

- `packages/core/test/UntrustedSeams.test.ts` exists; `9572df5d` and `c0de5d80` are ancestors of HEAD.
- Task 1's two verifies exit 0; Task 2's RED check prints `checked` with all ten ids failing by assertion.
- No src change, no `Record<string, unknown>` added, `.planning/config.json` not staged.
