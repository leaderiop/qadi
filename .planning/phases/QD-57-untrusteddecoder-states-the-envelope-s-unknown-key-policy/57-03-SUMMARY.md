---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 03
subsystem: audit
tags: [characterisation, red-tests, audit-row, audit-archive, hydration, unknown-key-policy]
requires: [57-02]
provides:
  - the audit row's per-policy matrix A1..A12 and the archive's V1..V9 on the base
  - the hydration payload's per-policy matrix H1..H5 on the base
  - four RED rows for D-20 (A6, A7, A8, V8), committed before any packages/*/src change
affects: [57-05, 57-06, 57-07, 57-11]
actuals:
  tokens: 4500
  tasks: 3
  commits: 3
plan_head_before: 6050ca475c723c46ceb09977e05148966a98a5e7
plan_head_after: bcadf99a107da80ff12af9fbfeb2aec523aa39b9
tech-stack:
  added: []
  patterns: ["characterise on the base, then RED rows appended beside the pins they move, each commit touching one test file"]
key-files:
  created: []
  modified:
    - packages/audit/test/UntrustedSeams.test.ts
    - packages/react/test/UntrustedSeams.test.ts
key-decisions:
  - "Messages the plan's verify greps in escaped form (`\\\"sneaky\\\"`, `\\\"archiveVersion\\\"`) are written as double-quoted strings with escaped quotes"
  - "H4 (an excess key inside an entry policy) is pinned as UndecodablePolicy, the reason the base gives"
requirements-completed: [KEYP-01, KEYP-04, KEYP-05, WX-06]
duration: 4min
completed: 2026-11-18
status: complete
---

# Phase QD-57 Plan 03: The audit row, the archive and the hydration payload per policy

Three `describe` blocks pin what the audit row, the audit archive and the hydration payload answer for every input class D-11 names: 17 audit rows and 5 hydration rows green on the base, plus four D-20 rows that fail on the base by assertion. No `packages/*/src` file changed.

## Measured messages pinned (on the base)

- A2, V2 (a shallow unknown row or envelope key): `Expected no excess property\n  at ["sneaky"]`.
- A9 (an excess key in the record policy): `Expected no excess property\n  at ["policy"]["sneaky"]`.
- A10 (`sequenceNumber` `"x"`): `Expected number | undefined\n  at ["sequenceNumber"]`.
- A11 (`5`, `null`, `[]`, `{}`): `an audit row has no record`.
- A12 (`record` 5 and `record` null): `Expected { readonly "_tag": "Decision", readonly "version": 2, ... } | { readonly "_tag": "Obligations", readonly "version": 2, ... }`.
- V5 (an excess key in `metadata`): `Expected no excess property\n  at ["metadata"]["note"]`.
- V9 (`5`, `null`, `[]`): `Expected object`; `{}`: `Missing key\n  at ["archiveVersion"]`.
- A3, A4, V3, V4: `TooDeep` with `maxDepth: 256`, A4 and V4 inside `assert.doesNotThrow` at 60,000 levels.
- H1..H5: `MalformedPayload` (H1, H5), `PayloadTooDeep` (H2), `MalformedEntry` (H3), `UndecodablePolicy` (H4).

## RED on the base

`pnpm exec vitest run --project audit packages/audit/test/UntrustedSeams.test.ts -t '\(D-20\)' < /dev/null`: `Tests  4 failed | 35 skipped (39)`. Every row fails on an assertion; no resolve error, TypeError or RangeError.

```
FAIL |audit| test/UntrustedSeams.test.ts > the audit row per policy: refuse (KEYP-05, D-11) > A6 an unknown key 266 deep inside the row record -> success (D-20)
AssertionError: expected false to be true
FAIL |audit| test/UntrustedSeams.test.ts > the audit row per policy: refuse (KEYP-05, D-11) > A7 an unknown key 60,000 deep inside the row record -> success, no throw (D-20)
AssertionError: expected [Function] to not throw an error but 'AssertionError: expected false to be …' was thrown
FAIL |audit| test/UntrustedSeams.test.ts > the audit row per policy: refuse (KEYP-05, D-11) > A8 a deep unknown key and version 3 inside the row record -> UnsupportedVersion carrying 3 (D-20)
AssertionError: expected 'TooDeep' to equal 'UnsupportedVersion'
FAIL |audit| test/UntrustedSeams.test.ts > the audit archive per policy: refuse (KEYP-05, D-11) > V8 entry 0 whose record holds an unknown key 266 deep -> success (D-20)
AssertionError: expected false to be true
```

A7's failure is the success assertion inside `assert.doesNotThrow`: the decode returns a `TooDeep` failure rather than throwing, so the 60,000-deep value is already refused without a `RangeError`.

## Commits

- `620b090c` test(57-03): characterise the audit row and the archive per policy on the base (rows A1..A5, A9..A12, V1..V7, V9)
- `5487ac51` test(57-03): characterise the hydration payload per policy on the base (H1..H5)
- `bcadf99a` test(57-03): RED, a deep unknown key inside an audit record is ignored (D-20) (A6, A7, A8, V8)

## Deviations from Plan

None - plan executed exactly as written. (The first audit commit was amended once, before the next task, to write two grepped messages as escaped double-quoted strings so the plan's own verify matched; no behaviour changed.)

## Flagged assumption

The coverage probe could not classify KEYP-04. It is read as: the audit row, the archive and the hydration payload state `refuse` explicitly and their answers are unchanged, except that a deep unknown key inside a row's or entry's record is ignored (D-20). This plan supplies the base half of that proof; 57-05's call sites and 57-11's scan supply the rest. Left unresolved in the edge report.

## Known Stubs

None.

## Threat Flags

None. T-57-05 (the row's and archive's own unknown keys stay refused) is pinned by A2, A3, A4 and V2..V4, which pass on the base and must pass unedited after 57-05; T-57-06 (60,000-deep keys) is pinned by A4, A7 and V4 inside `assert.doesNotThrow`.

## Self-Check: PASSED

- `packages/audit/test/UntrustedSeams.test.ts` and `packages/react/test/UntrustedSeams.test.ts` exist; the three commits above are ancestors of HEAD.
- The filtered audit run (`-t '^(?!.*\(D-20\))'`) and the react seam file are green; the four `(D-20)` rows fail by assertion; no `packages/*/src` file and not `AuditEntryDifferential.test.ts` differs from `phase_base`.
