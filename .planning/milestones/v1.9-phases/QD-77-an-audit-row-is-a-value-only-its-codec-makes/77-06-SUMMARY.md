---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
plan: 06
subsystem: spec
tags: [spec, behaviours, invariants, traceability, changeset, upgrade-guide, audit]
requires:
  - phase: QD-77 plan 05
    provides: ADR-QD-190, its index and traceability rows and the CCR-QD-469 row the records complete
provides:
  - BEH-QD-721 and BEH-QD-722, INV-QD-399 and INV-QD-400 written and traced
  - BEH-QD-250, BEH-QD-253, BEH-QD-254 and BEH-QD-312 and INV-QD-053, INV-QD-054 and INV-QD-101 restated for the codec-made row
  - the CCR-QD-469 row naming every document of the change with its revision and the three unused ids
  - the Breaking minor changeset, the 0.13 upgrade-guide section, and the audit README and website prose
affects: [QD-77 plan 07]
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
plan_head_before: 1ae8d2b16c3049e60431472f46f9b721338e3077
plan_head_after: 1c310f93888920d5b0a3dd0c83ea06a4f8d057e8
key-files:
  created:
    - .changeset/audit-row-made-only-by-its-codec.md
  modified:
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - packages/audit/README.md
    - apps/website/src/content/docs/docs/packages/audit/capabilities.md
key-decisions:
  - "BEH-QD-723 to BEH-QD-725 are named only in the CCR-QD-469 row's unused list; no other file cites them"
  - "The upgrade guide's new fence is a compiled typescript example of a numbered row read through decodeAuditEntry; the 0.10 migration fence is byte-identical to the base"
  - "BEH-QD-489 and BEH-QD-625 were read and left unchanged: neither names the removed pre-check or a removed export"
requirements-completed: [AROW-06, WX-02, WX-03, WX-07]
coverage:
  - id: D1
    description: "BEH-QD-721, BEH-QD-722, INV-QD-399 and INV-QD-400 exist with REQUIREMENT lines or statements, Source, Enforcement and Related, and are traced in sections 1 to 4"
    requirement: "AROW-06"
    verification:
      - kind: other
        ref: "plan Task 1 verify (exit 0) and bash spec/scripts/verify-traceability.sh --strict -> PASS: 21 FAIL: 0, 172 invariants traced (base 170)"
        status: pass
    human_judgment: false
  - id: D2
    description: "BEH-QD-250, 253, 254 and 312 and INV-QD-053, 054 and 101 state the codec-made row; document 33 and INV-QD-054 and INV-QD-101 name no removed thing as current; the CCR-QD-469 row names every document and the unused ids"
    requirement: "WX-02"
    verification:
      - kind: other
        ref: "plan Task 2 verify (exit 0); node scripts/check-doc-examples.mjs -> 118 block(s) compile"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Breaking changeset, the 0.13 upgrade-guide section and the audit README and website prose name each replacement; gate 13 prints 940 and gate 14's script is unchanged"
    requirement: "WX-03"
    verification:
      - kind: other
        ref: "plan Task 3 verify (exit 0); check-website-doc-examples.mjs -> 72 block(s) compile; check-api-surface.mjs -> 940 export(s) documented across 9 package(s)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Spec text, the changeset and the prose carry no plan-local id or phase-relative wording (WX-07)"
    requirement: "WX-07"
    verification:
      - kind: other
        ref: "the added-line scan of each task verify, excluding the Change History rows (see Deviations)"
        status: pass
    human_judgment: false
duration: 36min
completed: 2026-11-24
status: complete
---

# Phase QD-77 Plan 06: An audit row is a value only its codec makes Summary

**The two new behaviours and two new invariants, the restated audit records, the completed CCR-QD-469 row, the Breaking minor changeset and the 0.13 upgrade-guide section state the codec-made row and the read-back archive, with the strict traceability check at `FAIL: 0`.**

## Performance
- Duration: 36 min. Tasks: 3. Files: 8 (1 created). Commits: `793e71d2`, `6566ef69`, `1c310f93`.

## Accomplishments
- **Task 1 (tracer).** `BEH-QD-721` (a stored row is read envelope first: untrusted decode with `record` unwalked, then the record; the envelope's refusal wins for a row bad in both places; every tag and the accept set unchanged) and `BEH-QD-722` (a non-finite `now` fails `ArchiveInputInvalid { field: "now", value }` before the sequence facts; each `keyMaterial` item is written as its three declared fields, unjudged; every returned bundle is read back) in document 33. `INV-QD-399` (every archive the writer returns is read back) and `INV-QD-400` (an audit row is made only by its codec) after INV-QD-398. Traced in section 1 (document 33's row), section 2 (two rows after INV-QD-398), section 3 (ADR-QD-190's row names both) and section 4 (`ArchiveWriterInputs.test.ts`, `AuditEntry.characterisation.test.ts`, `AuditEntry.tst.ts`, and the `ArchiveRoundTrip.test.ts` row extended). The strict check ran at `PASS: 21 FAIL: 0`, with 172 invariants traced (base 170).
- **Task 2.** BEH-QD-250's listing declares `AuditEntry` as the type of a class only the codec constructs, with a `declare class` and `export type { AuditEntry };` and no schema value. BEH-QD-312 states the envelope-first order and drops the pre-check wording; its closing prose says there is no schema value and that `decodeAuditEntry` is the one route for a store's number. BEH-QD-253's plan is `{ retained, expired }`. BEH-QD-254 names `ArchiveInputInvalid` then `SequenceIntegrityError` and states a row's number is a safe integer because the codec decoded it. Each of the four carries an `Amended by ADR-QD-190 (CCR-QD-469)` block. INV-QD-101 states the finite-age clause through the codec; INV-QD-054 drops `SequenceNumberInvalid` and `invalidSequenceNumber`; the INV-QD-053 and INV-QD-101 enforcement texts draw `at` from finite values and name the record-domain property. The traceability rows for INV-QD-101, INV-QD-054 and `UntrustedSeams.test.ts` say what their tests pin. The CCR-QD-469 row names `33-audit-pipeline.md` Rev 1.29, `invariants.md` Rev 1.208, `traceability.md` Rev 1.289, `README.md` Rev 1.351, `overview.md`, ADR-QD-190, ADR-QD-110, ADR-QD-056, `index.yaml`, the changeset and the three prose files, and says BEH-QD-723, BEH-QD-724 and BEH-QD-725 are unused.
- **Task 3.** `.changeset/audit-row-made-only-by-its-codec.md` is `"@qadi/audit": minor`, starts `**Breaking.**`, states the five changes and points at the upgrade guide. `upgrading.md` gains `## 0.13: an audit row is made only by its codec`: a Before/After table, a compiled `typescript` fence reading a numbered row through `decodeAuditEntry({ record, sequenceNumber })`, the handler changes, and a sentence that the 0.10 migration example is unchanged because it returns storage JSON. The audit README and the website capabilities page drop `undated`, `SequenceNumberInvalid` and the schema wording, and name `ArchiveInputInvalid` and the `keyMaterial` projection.

## Task Commits
1. **Task 1 (tracer):** `793e71d2` docs(77-06): state the codec-made row and the read-back archive
2. **Task 2:** `6566ef69` docs(77-06): restate the audit behaviours and invariants for the codec-made row
3. **Task 3:** `1c310f93` docs(77-06): changeset, upgrade guide and audit prose for the codec-made row

The tracer's verify was re-run end to end after its commit before Task 2 started.

## Deviations from Plan

**1. [Rule 1 - Bug in the plan] The added-line scan in all three verifies matches the Change History cell**
- **Found during:** Task 1 verify
- **Issue:** a document's Change History is one table row, so revising a document makes its whole row an added line, and that row quotes older entries containing "no longer" (document 33's 1.2 entry, README's older rows). The scan `grep "^+[^+]" | grep -nE "...no longer..."` therefore fails on text this plan did not write. The four hits are in lines `git diff` also shows as removed, byte-identical apart from the new entry prepended.
- **Fix:** each verify was run from a scratch copy that adds `grep -v "^+> | Change History"` before the phrase scan. No source or spec text changed for it; the text this plan wrote holds none of the scanned phrases (checked on the added lines excluding that row).
- **Files modified:** none (scratch copies under the scratchpad)
- **Commit:** none

**Total deviations:** 1 (a defect in the plan's own verify). **Impact:** none on the delivered text.

## Known Stubs
None.

## Threat Flags
None. Spec, changeset and prose files only; no `package.json` or lockfile changed (T-77-SC), nothing was versioned or published. The upgrade guide names `decodeAuditEntry({ record, sequenceNumber })` as the one route for a store's number (T-77-14), and the CCR row names the three unused BEH ids (T-77-15).

## Issues Encountered
`verify-traceability.sh --strict` takes more than two minutes; it ran in the foreground with a ten minute timeout. Gate 13 prints `940 export(s) documented across 9 package(s)` as the plan states, and `scripts/check-package-install.mjs` is unchanged from the phase base.

## Next Phase Readiness
Ready for 77-07: every record and page is written; the close scans can read the final text. The three unused ids appear only in the CCR-QD-469 row of `spec/README.md`.

## Self-Check: PASSED
- FOUND: `.changeset/audit-row-made-only-by-its-codec.md`, `spec/behaviors/33-audit-pipeline.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`, `packages/audit/README.md`, `apps/website/src/content/docs/docs/packages/audit/capabilities.md`
- FOUND commits `793e71d2`, `6566ef69`, `1c310f93` (ancestors of HEAD); the three task verifies exit 0
