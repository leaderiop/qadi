---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
plan: 02
subsystem: testing
tags: [audit, regression, characterisation, api-surface, red-green]
requires:
  - phase: QD-77 plan 01
    provides: the mutation base and phase_base
provides:
  - the writer-input regression, RED on the base for seven rows, with its committed evidence
  - the decode refusal matrix and the bytes, key set and equality of encode-made and decode-made rows, green on the base
  - the numbered test helper, through decodeAuditEntry
  - gate 13 reading a local export list
affects: [QD-77 plans 03 to 07]
actuals:
  tokens: 28000
  tasks: 3
  commits: 3
plan_head_before: 0e8e482c732cb5e007f76a4c26ad407cc3ce36bf
plan_head_after: 759dfa564ec2f4a9207c2f748c47daded240b804
key-files:
  created:
    - packages/audit/test/ArchiveWriterInputs.test.ts
    - packages/audit/test/AuditEntry.characterisation.test.ts
    - .planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-RED-EVIDENCE.md
  modified:
    - packages/audit/test/helpers.ts
    - scripts/check-api-surface.mjs
key-decisions:
  - "The inconsistent-record matrix row is an evaluationId that disagrees with the record's decision, since no allow-beside-denying-trace builder exists in the audit tests"
  - "A fifteenth writer-input test (two rows encoded from one record) pins the ordering edge; it passes on the base and is listed as refuted"
requirements-completed: [AROW-01, AROW-04, WX-06, WX-07]
duration: 25min
completed: 2026-11-24
status: complete
---

# Phase QD-77 Plan 02: Base-side tests Summary

**Writer-input regression RED on the base (7 of 15 rows, evidence committed before any source edit), decode matrix and row identity characterised green, and gate 13 taught to read `export type { A };`.**

## Accomplishments
- `ArchiveWriterInputs.test.ts`: 15 tests, one per writer input. On the unchanged source 7 fail and 8 pass. The failing set equals the evidence's RED list: `at: NaN`, an extra top-level key, a record that disagrees with its decision, `now` NaN, `now` +Infinity, `now` -Infinity, a `keyMaterial` item with an extra key. The eight refuted rows pass (`sequenceNumber` 1.5 fails a typed error; `now` -0 reads back as `createdAt: 0`; empty `keyMaterial`; lone surrogate, `-0`, own `__proto__` key and `Date` in `resource`; two rows from one record). No `as`, `!`, skip, todo or fails.
- `AuditEntry.characterisation.test.ts`: 21 tests, green on the base. A 16-row matrix pins each stored-row input as an exact `DecodeRefusal` (the both-bad row reads the record's `Malformed "Missing key at ["_tag"]..."` today). Five twin checks (JSON bytes, `Object.keys`, `Equal.equals`, `Hash.hash`, `MutableHashMap` lookup, `assert.deepStrictEqual`) hold for an encode-made row and its decode-made twin, for a decision and an obligation record, numbered and not; differently numbered rows are not equal.
- `numbered(entry, n)` in `helpers.ts` makes a numbered row only through `decodeAuditEntry` and fails the test on a refusal.
- `check-api-surface.mjs` reads a local export list by its names. A planted `export type { GateProbe };` failed `[unsupported]` before and `[missing] GateProbe` after; without the plant the gate prints `api-surface: 940 export(s) documented across 9 package(s)`.

## Task Commits

1. **Task 1: writer-input regression and RED evidence** - `c4fd276e` (test)
2. **Task 2: decode characterisation, row bytes and equality, `numbered`** - `d233f22e` (test)
3. **Task 3: gate 13 reads a local export list** - `759dfa56` (chore)

`git diff --quiet 4d0d3627b93d344efa880be83430166698864600 HEAD -- packages/audit/src` holds: no source file changed. The two commits holding tests precede, in `git log`, every future commit that changes `packages/audit/src`.

## Deviations from Plan

None - plan executed exactly as written. Two choices inside the plan's latitude are recorded under key-decisions. The wide-row title "a row whose record disagrees with its own decision" names the same input as the plan's "evaluationId disagrees with the rest of the record".

## Known Stubs
None.

## Issues Encountered
None. Note for 77-03: `ArchiveWriterInputs.test.ts` is RED by design on the base and stays failing until the writer guards and the brand land; the rest of the audit suite is unaffected by this plan.

## Next Phase Readiness
Ready for 77-03: the RED file and its evidence, the matrix and the twins are committed, so the brand, decode order, writer guards and dead-check removal can now edit `packages/audit/src` and move exactly the matrix rows whose message or precedence changes.

## Self-Check: PASSED
- FOUND: packages/audit/test/ArchiveWriterInputs.test.ts, packages/audit/test/AuditEntry.characterisation.test.ts, 77-RED-EVIDENCE.md, scripts/check-api-surface.mjs
- FOUND commits: c4fd276e, d233f22e, 759dfa56 (ancestors of HEAD); all three task verifies exit 0
