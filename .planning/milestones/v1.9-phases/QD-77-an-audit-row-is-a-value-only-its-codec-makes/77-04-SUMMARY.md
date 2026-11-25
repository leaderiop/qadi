---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
plan: 04
subsystem: audit
tags: [audit, type-pins, property-tests, writer-guards, purge-cost, tstyche]
requires:
  - phase: QD-77 plan 03
    provides: the nominal AuditEntry class, envelope-first decode, the writer guards
provides:
  - AuditEntry.tst.ts, six negative pins each with a positive twin, seen failing without the brand
  - a whole-archive property and a record-domain property, plus exact assertions for the now guard and keyMaterial projection
  - each new check seen failing once, recorded in 77-RED-EVIDENCE.md
  - planPurge's cost sentence restated from a recorded measurement
affects: [QD-77 plans 05 to 07]
actuals:
  tokens: 6500
  tasks: 3
  commits: 3
plan_head_before: aa0e3d74084a023b6671ac78547a95e137c50dde
plan_head_after: df701cc2642852d9b1b2774ee5626e9168ab8ed8
key-files:
  created:
    - packages/audit/test/AuditEntry.tst.ts
  modified:
    - packages/audit/test/ArchiveRoundTrip.test.ts
    - packages/audit/test/AuditArchive.test.ts
    - packages/audit/src/Retention.ts
    - .planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-RED-EVIDENCE.md
key-decisions:
  - "The record-domain gut writes a record the codec cannot read back (an encoder that writes `at: NaN`), because the plan's named gut, sequenceNumber 0, round-trips and cannot fail that property"
  - "planPurge's doc keeps the phrase one structural hash per row and says the 22 us is the whole call, because Hash.hash alone measured 6 to 10 us"
requirements-completed: [AROW-01, AROW-02, AROW-05, WX-06, WX-07]
coverage:
  - id: D1
    description: "A literal, a spread of an encode-made or decode-made row, and a plain row given to the writer are not an AuditEntry; the class is neither a value nor a schema"
    requirement: "AROW-02"
    verification:
      - kind: other
        ref: "pnpm test:tstyche -> packages/audit/test/AuditEntry.tst.ts (6 suppressed errors matched, both passes)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Over any entries, finite now and keyMaterial, the writer fails SequenceIntegrityError or its bundle reads back; a non-finite now is ArchiveInputInvalid with the same value"
    requirement: "AROW-01"
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveRoundTrip.test.ts#PROPERTY: every archive the writer returns is read back"
        status: pass
    human_judgment: false
  - id: D3
    description: "Over any record with hostile values, the codec refuses it or reads it back with its own bytes and a fixed point"
    requirement: "AROW-05"
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveRoundTrip.test.ts#PROPERTY: over any record, the codec refuses it or reads it back"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every new check was seen failing with its source removed"
    requirement: "WX-06"
    verification:
      - kind: other
        ref: ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-RED-EVIDENCE.md (the brand, the now guard, the keyMaterial projection, the decode order, the record-domain oracle)"
        status: pass
    human_judgment: false
  - id: D5
    description: "planPurge's cost sentence states a figure with its method recorded"
    requirement: "WX-07"
    verification:
      - kind: other
        ref: "77-RED-EVIDENCE.md ## The purge cost (15 counted rounds, median 22.36 us per row)"
        status: pass
    human_judgment: false
duration: 14min
completed: 2026-11-24
status: complete
---

# Phase QD-77 Plan 04: An audit row is a value only its codec makes Summary

**Six type pins that only the codec makes a row, a whole-archive property and a record-domain property over hostile values, exact writer-guard assertions, each seen failing once, and a re-measured purge cost (22 us per row).**

## Performance
- Duration: 14 min. Tasks: 3. Files: 5 (1 created). Commits: `e3c9f469`, `39773e68`, `df701cc2`.

## Accomplishments
- **Type pins** (`AuditEntry.tst.ts`, 7 `test` blocks, 6 `@ts-expect-error` negatives, no `not.toBeCallableWith` or `not.toBeConstructableWith`, so `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md table did not move; house-style counts 75 type-test files). Fragments read from the compiler: `nominal` for the literal, the two spreads and the writer given a plain row; `does not exist on type` for `new Row.AuditEntry(...)` and `Schema.decodeUnknownEffect(Row.AuditEntry)` (a type-only export is absent from the module's value namespace, not a TS1361). Positive twins: `takesRow` is callable with the encode-made and decode-made types, both are assignable to `archiveAuditTrail`'s entries parameter, `Encoded` and `Decoded` are exactly `AuditEntry`, `decodeAuditEntry` accepts `null`, and `planRetention`/`planPurge` accept codec-made rows.
- **Finding behind the spread pins.** Without the brand, `Data.Class`'s `pipe` already refuses a literal, but a spread of a real row keeps `pipe` and is assignable, so only the private `nominal` member refuses a spread. Seen failing: removing it gave two unused-directive errors (the spreads) and two message mismatches (`pipe` missing, not `nominal`).
- **Whole-archive property** (500 runs): over codec-made entries (some numbered, gaps and duplicates allowed), any finite `now` (`-0` included) and any `keyMaterial` (binary-unit strings, items with an extra key), the writer fails `SequenceIntegrityError` or its bundle reads back with the same `createdAt`, entry count and the three declared key fields. A second `it` pins NaN, +Infinity and -Infinity as `ArchiveInputInvalid` with `field: "now"` and the same value by `Object.is`.
- **Record-domain property** (500 runs): `at` from doubles and NaN, +-Infinity, -0; `resource` from a dictionary of a lone surrogate, -0, NaN, a bigint, an array with a hole, a value nested past `MAX_DECODE_DEPTH`, a `Date` and `undefined`, sometimes an own `__proto__` key. The codec fails `SinkRecordNotEncodable`, or the read-back has equal bytes and is its own fixed point, and `Equal`s the encoded row when no `Date` or `undefined` was drawn. A throwaway count of the 500 runs: 278 refused, 222 read back (210 asserted `Equal`, 12 bytes and fixed point only).
- **Guard assertions** (`AuditArchive.test.ts`): `ArchiveInputInvalid` exactly for NaN and +-Infinity (`field`, `Object.is` value), returned before a sequence break, `-0`, `0`, a negative and `Number.MAX_VALUE` archive and read back, and a `keyMaterial` item with an extra key is written as exactly `{ keyId, algorithm, publicKey }` (deep-equal, `Object.keys`, the secret absent from the bundle text) with empty and lone-surrogate values carried unjudged.
- **Purge cost.** Probe on Apple M3 Pro, arm64, node v26.13.0: the plan's cold method gave median 26.64 us per row but a spread of 2.73, over the factor-two limit; with one uncounted warm-up round three runs spread 1.39 to 1.57 and the fifteen counted rounds have median 22.36 us. `Hash.hash` alone is 6 to 10 us per row. The doc now reads "Cost is one structural hash per row (the whole call measured about 22 µs per row, ADR-QD-190), so a million-row run is a batch job." The probe was deleted; `git status --porcelain -- packages/audit/test` is empty.

## Task Commits
1. **Task 1 (tracer):** `e3c9f469` test(77-04): pin that only the codec makes an audit row
2. **Task 2:** `39773e68` test(77-04): pin the archive writer domain and its guards
3. **Task 3:** `df701cc2` docs(77-04): state the measured purge cost

The tracer's `<verify>` was re-run end to end after its commit (tstyche both passes, typecheck, house-style 75) before Task 2 started.

## Deviations from Plan

**1. [Rule 1 - Bug in the plan] The named record-domain gut cannot fail the property**
- **Found during:** Task 2
- **Issue:** the plan names `encodeAuditEntry` writing `sequenceNumber: 0` as the gut that fails the record-domain property. A `0` is a safe integer, so such a row round-trips with equal bytes and is `Equal` to its read-back; the property stays green. It was run (49 other sequence-sensitive tests failed, none of them the property).
- **Fix:** gutted instead with an encoder that writes a record the codec cannot read back (`record: { ...json, at: Number.NaN }`), which fails the property (`Property failed after 6 tests`, counterexample `[0, {"resource": undefined, "stable": true}]`) and the whole-archive property. Both runs are in the evidence.
- **Files modified:** none (source restored after each gut)
- **Commit:** `39773e68` (evidence)

**2. [Rule 3 - Method] The purge probe gained one uncounted warm-up round**
- **Found during:** Task 3
- **Issue:** the plan's five cold rounds spread 2.73, so by the plan's own rule no number could be stated.
- **Fix:** the probe was re-run three times with one discarded warm-up round before five counted ones; every spread is under two. Both the cold and the warmed runs are recorded, and the sentence says the figure is the whole call.
- **Commit:** `df701cc2`

**Total deviations:** 2 (one plan error in a named gut, one measurement method). **Impact:** none on scope; both are recorded in `77-RED-EVIDENCE.md`.

## Known Stubs
None.

## Threat Flags
None. Test files and one doc comment only; no `package.json` or lockfile changed (T-77-SC).

## Issues Encountered
None. `pnpm lint` warns once in the new tests were fixed (`new Array(3)` replaced by a sparse array built by index). The three tstyche budgets, `AGENTS.md` and `scripts/check-house-style.mjs` are unchanged from `phase_base`.

## Next Phase Readiness
Ready for 77-05 (ADR-QD-190, the ADR-QD-110 and ADR-QD-056 amendments). The ADR should record: the spread-versus-literal finding for the brand, the `holds()` retention of a row with a `Date` or `undefined` value (not `Equal` to its read-back, same bytes), and the 22 us measurement (the doc already cites ADR-QD-190).

## Self-Check: PASSED
- FOUND: packages/audit/test/AuditEntry.tst.ts, packages/audit/test/ArchiveRoundTrip.test.ts, packages/audit/test/AuditArchive.test.ts, packages/audit/src/Retention.ts, 77-RED-EVIDENCE.md
- FOUND commits e3c9f469, 39773e68, df701cc2 (ancestors of HEAD); the three task verifies from the plan exit 0
- `git diff --quiet -- packages/audit/src` holds apart from the Retention.ts doc commit; the probe is not in the tree
