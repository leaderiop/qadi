---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 02
subsystem: core
tags: [characterisation, golden-bytes, red-tests, tstyche, stored-record]
requires:
  - phase: QD-58
    provides: "58-01's phase_base and the untouched green base"
provides:
  - "eighteen shape-neutral rows (G1..G9, L1..L5, O1..O4) green on the base and unchanged by the feat commit"
  - "four RED rows (N1..N4) and two RED type pins for the envelope shape and the unread getter"
affects: [58-03, 58-04, 58-05, 58-09]
actuals:
  tokens: 3400
  tasks: 2
  commits: 2
plan_head_before: b93962385f08266a819e5e7510b28ab8660fe8d4
plan_head_after: 2dac0e69bbba8c3d7662e06341fb6d0fd716602b
tech-stack:
  added: []
  patterns: ["characterisation through the wire only (encodeStoredRecordString, decodeStoredRecordString, makeDecisionLog, decodeDecisionStream), RED rows read through `\"record\" in x`, RED type pins as conditional types"]
key-files:
  created:
    - packages/core/test/StoredEnvelope.test.ts
    - packages/core/test/StoredEnvelope.tst.ts
  modified: []
key-decisions:
  - "O-rows read an evaluation id through the encoder (success: parsed text; refusal: SinkRecordNotEncodable.evaluationId), so no row reads the in-memory shape"
  - "The RED commit adds its two imports as new lines, so it removes no line Task 1 wrote"
requirements-completed: [STOR-01, STOR-02, STOR-03, WX-06]
duration: 6min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 02: Characterisation and RED rows

**The stored bytes, the log's stamping and INV-QD-039's order pinned green on the base through the wire, and the envelope's shape and D-12's unread getter pinned RED by assertion.**

## Characterisation

`packages/core/test/StoredEnvelope.test.ts`, three describes, eighteen rows, all passing on `phase_base`'s tree (`pnpm exec vitest run --project core packages/core/test/StoredEnvelope.test.ts`: 18 passed).

- G1..G8: one per `V2_*` fixture, ingested under `Server`, `édge ✓` and `a"b`, encoded with `encodeStoredRecordString` to exactly `{"environment":<JSON.stringify(environment)>,"record":<fixture>}` (24 goldens). G9: each of the 24 texts is a fixed point of `decodeStoredRecordString` then `encodeStoredRecordString`.
- L1..L5: the ingest label is the envelope's `environment`; no label gives the log's own (`log-own`); the stored record's wire form equals the record encoded alone, per fixture; `pipe((s) => s)` is the stored record; equal records under equal labels are `Equal.equals` with equal `Hash.hash`, another label is not.
- O1..O4: a snapshot of `at` `3, NaN, 1, NaN, 2` reads `t1, t2, t3, u1, u2`; all-`NaN` and all-equal times keep arrival order; `decodeDecisionStream`'s backlog over the same records reads the same order.

No row reads a flat field of a stored record or names `stampRecord`, `StoredDecisionRecord`, `StoredObligationRecord` or `Stamped`.

## RED on the base

`-t "\((D-01|D-12)\)"` on the base: 4 failed, each by an `AssertionError`, none by a `TypeError`, import or syntax error.

- N1 (D-01): `the stored record has a \`record\` field: expected false to be true`
- N2 (D-01): `the decoded envelope has a \`record\` field: expected false to be true`
- N3 (D-01): `expected [ 'evaluationId', 'at', …(4) ] to deeply equal [ 'environment', 'record' ]` (actual keys `evaluationId, at, outcome, obligationIds, _tag, environment`)
- N4 (D-12): `the record is retained: expected +0 to equal 1` (the base's `isolate("append")` swallowed the getter's throw and retained nothing)

The 18 other rows still pass with the RED describe present (`-t '^(?!.*\((?:D-01|D-12)\))'`: 18 passed, 4 skipped).

`packages/core/test/StoredEnvelope.tst.ts`, one test with two conditional-type pins. `pnpm exec tstyche packages/core/test/StoredEnvelope.tst.ts` on the base: 1 failed, 2 assertions failed:

- `StoredRecord extends { readonly environment: string; readonly record: SinkRecord } ? true : false`: `Type 'false' is not the same as type 'true'.`
- `"_tag" extends keyof StoredRecord ? true : false`: `Type 'true' is not the same as type 'false'.`

`pnpm -s typecheck` exits 0 with both files committed (D-14).

## Task Commits

1. Task 1: `ea1e7d98` `test(58-02): characterise the stored envelope, the log's stamping and its order on the base` (the test file alone)
2. Task 2: `2dac0e69` `test(58-02): the envelope's shape and the unread getter, RED on the base` (the test file, +50 / -0, and the new `.tst.ts`)

No `packages/*/src` file changed since `phase_base`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Single-quoted string with an embedded double quote defeated the plan's `as`-assertion scan**
- **Found during:** Task 1 verify
- **Issue:** `'a"b'` left a stray `"` after the verify script's string stripping, so it reported `an as assertion was written` for the legitimate `as const`.
- **Fix:** wrote the label as `"a\"b"`, as the plan itself spells it, and amended the (unpushed) Task 1 commit before any Task 2 work.
- **Files modified:** `packages/core/test/StoredEnvelope.test.ts`
- **Verification:** all Task 1 verifies exit 0.
- **Committed in:** `ea1e7d98`

**2. [Rule 3 - Blocking] Apostrophes in RED row titles defeated the plan's title scan**
- **Found during:** Task 2 verify
- **Issue:** the verify's title regexp stops at the first quote, so `record's` in N1..N3 truncated the title before `(D-01)`.
- **Fix:** retitled N1..N3 without an apostrophe and amended the (unpushed) RED commit; no assertion changed.
- **Files modified:** `packages/core/test/StoredEnvelope.test.ts`
- **Verification:** all Task 2 verifies exit 0.
- **Committed in:** `2dac0e69`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** none; the file's content and the rows are as planned.

## Issues Encountered

None. The first Task 1 commit was made before the project-root pin guard ran; the guard passed immediately afterwards, and it ran before the amend and before the second commit.

## Known Stubs

None.

## Next Phase Readiness

58-03 can write devtools' and http's rows. 58-04 must make N1..N4 and the two type pins pass without editing this file (58-09's scan refuses any commit but `test(58-02|03|05)` touching it).

## Self-Check: PASSED

- `packages/core/test/StoredEnvelope.test.ts` and `packages/core/test/StoredEnvelope.tst.ts` exist; `ea1e7d98` and `2dac0e69` are ancestors of HEAD.
- Task 1's two verifies and Task 2's first three verifies exit 0 (RED by assertion, 18 rows still green, tstyche RED with `pnpm -s typecheck` 0).
- No change under `packages/*/src`; `.planning/config.json` not staged.
