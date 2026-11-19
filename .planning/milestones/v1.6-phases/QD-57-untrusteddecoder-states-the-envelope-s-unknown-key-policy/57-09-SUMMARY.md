---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 09
subsystem: spec
tags: [spec, behaviours, invariants, traceability, unknown-key-policy]
requires: [57-08]
provides:
  - BEH-QD-621..623 (08), BEH-QD-624 (26), BEH-QD-625 (33), the BEH-QD-486 carve-out and the amended 25 envelope paragraph
  - INV-QD-359, INV-QD-360 and the INV-QD-305/306 carve-outs
  - traceability rows for every new id, EnvelopeKeys.ts and ADR-QD-170
affects: [57-10, 57-11]
actuals:
  tokens: 14000
  tasks: 2
  commits: 1
plan_head_before: 552cb3ff4410e5482616506a0613c4106c51ba81
plan_head_after: 21bab19bfae00e41ab61def6693dea61236fe919
tech-stack:
  added: []
  patterns: ["revisions moved only by spec-revise, once per document"]
key-files:
  created: []
  modified:
    - spec/behaviors/08-serialization.md
    - spec/behaviors/25-inspection.md
    - spec/behaviors/26-decision-stream.md
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/traceability.md
key-decisions:
  - "BEH-QD-486's signature fence now shows the required options with S[\"Encoded\"], the type the code uses, in place of S[\"Type\"]"
requirements-completed: [KEYP-01, KEYP-02, KEYP-03, KEYP-04, KEYP-05, WX-02]
duration: 14min
completed: 2026-11-19
status: complete
---

# Phase QD-57 Plan 09: BEH-QD-621..625 and INV-QD-359..360 Summary

The unknown-key policy is now normative: five new behaviours, two new invariants, the BEH-QD-486 / INV-QD-305 / INV-QD-306 carve-outs, and traceability rows joining each id to the tests that pin it.

## Accomplishments

- `08-serialization.md` (Rev 1.3 to 1.4): BEH-QD-486 shows required `options` with `unknownKeys: UnknownKeyPolicy`, orders the recipe project, guard, `prepare`, decode, and carves out an undeclared top-level key under `ignore` (BEH-QD-622) from "no option loosens". BEH-QD-621 (policy required, closed, table-read; record wire and stored envelope `ignore`, the rest `refuse`), BEH-QD-622 (an ignored key is dropped before the guard; declared keys keep the precedence), BEH-QD-623 (keys from the encoded side by `_tag`; build-time refusal) follow BEH-QD-487.
- `26-decision-stream.md` (1.16 to 1.17): BEH-QD-624 before BEH-QD-315, with the was/is message table from 57-06 and D-18's deep `environment`; the bare-record requirement gains the CCR-QD-448 amendment line.
- `33-audit-pipeline.md` (1.25 to 1.26): BEH-QD-625 after BEH-QD-489 (D-20).
- `25-inspection.md` (1.38 to 1.39): the envelope paragraph says the decoder's stated `ignore` projects before the guard.
- `invariants.md` (1.154 to 1.155): INV-QD-359 and INV-QD-360 close the file; INV-QD-305 and INV-QD-306 gain the carve-out and Related links to both.
- `traceability.md` (1.217 to 1.218): section 1 rows for 08, 26 and 33; section 2 rows for INV-QD-359 and INV-QD-360; a section 3 row for ADR-QD-170; section 4 rows for `UntrustedDecode.test.ts`, `UntrustedDecode.tst.ts`, the three `UntrustedSeams.test.ts`, `SinkCodec.test.ts` and `AuditEntryDifferential.test.ts`.

## Task Commits

Both tasks land in one commit by design (the plan's single-commit rule): `21bab19b` `docs(57-09): BEH-QD-621..625 and INV-QD-359..360, the unknown-key policy stated and traced` (six files, trailer last).

## Strict traceability output

`pnpm spec:examples`: 116 blocks compile. `spec-revise --check` passes. `verify-traceability.sh --strict`: PASS 20, FAIL 1, SKIP 0. The one FAIL is `CCR register coverage`, drift from `KNOWN_GAPS` with only `448` extra, which 57-10 closes by adding CCR-QD-448's register row. `invariants -> traceability` (all 141 traced) and `decisions -> traceability` (132 ADRs traced) now pass.

## Deviations from Plan

**1. [Orchestrator-authorised - verify-script defect] The strict-check filter matched the wrong string**
- **Found during:** Task 2, third verify.
- **Issue:** the script keeps FAIL rows only if they contain `CCR-QD-448`, but the FAIL row names the gap as a bare `448` inside a list, so the verify rejected the expected row.
- **Fix:** applied the narrowest filter, `grep -v "got \[.* 448\]"`, so only that one expected drift is excused; every other FAIL or SKIP still fails the check. The rest of the verify (one commit, exactly the six files, trailer last) ran unchanged and passed.
- **Files modified:** none (a command-only change).

**2. [Rule 1 - accuracy] The test-row range is U1 to U19, not U1 to U16**
- **Found during:** Task 2.
- **Issue:** the plan cites U1..U16 for the `unknownKeys` describe, but 57-07's gap tests added U17 to U19.
- **Fix:** INV-QD-359's Enforcement and the traceability rows say U1 to U19.
- **Commit:** `21bab19b`.

**Total deviations:** 1 orchestrator-authorised, 1 auto-fixed. **Impact:** none on scope.

## Known Stubs

None.

## Threat Flags

None. T-57-19 is mitigated: BEH-QD-486's carve-out names one exception (an undeclared top-level key under `ignore`) and restates that a declared key is never loosened; INV-QD-306 says the same.

## Next Phase Readiness

Ready for 57-10 (changesets, upgrading section, CCR-QD-448 and ARCH-104). Strict traceability will pass once CCR-QD-448's register row exists.

## Self-Check: PASSED

- `spec/behaviors/08-serialization.md`, `spec/behaviors/25-inspection.md`, `spec/behaviors/26-decision-stream.md`, `spec/behaviors/33-audit-pipeline.md`, `spec/invariants.md` and `spec/traceability.md` exist; commit `21bab19b` is an ancestor of HEAD.
