---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
plan: 06
subsystem: audit
tags: [adr, changeset, upgrade-guide, spec, arch-95]
phase_base: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
requires: [48-05]
provides:
  - "ADR-QD-161 (QADI-ADR-161, Rev 1.0), indexed and traced"
  - "ADR-QD-056 Rev 1.14 and ADR-QD-095 Rev 1.8: dated amendments, old text kept"
  - ".changeset/audit-refusal-is-cores.md: @qadi/audit minor, Breaking"
  - "the 0.13 upgrade entry with a compiled After fence"
affects: [48-07, 48-08]
key-files:
  created:
    - spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md
    - .changeset/audit-refusal-is-cores.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/056-audit-companion-package.md
    - spec/decisions/095-sinkcodec-owns-both-directions.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - packages/audit/README.md
    - apps/website/src/content/docs/docs/packages/audit/capabilities.md
decisions:
  - "ADR-QD-161 records D-01..D-10a after the ADR check: ADR-QD-054 and ADR-QD-056 forbid nothing here; their 'own error' sentences are what it amends"
status: complete
plan_head_before: 275b0c790deb7358c5bb9bda5a2608e3ed37d3f6
plan_head_after: c836d423b804ad19b24cfb43a71b7027a38c8878
commits: 3
actuals:
  tokens: 16000
  tasks: 3
  commits: 3
---

# Phase QD-48 Plan 06: The record of the decision and the break Summary

ADR-QD-161 records, from 48-01's quoted ADR check, that `@qadi/audit` reports `@qadi/core`'s `SinkRecordNotEncodable` and decides "lost" once; ADR-QD-056 and ADR-QD-095 are amended in dated text; and the break is in a **Breaking** `@qadi/audit` minor changeset and the last 0.13 section of the upgrade guide, whose After fence compiles.

## Commits

- `b3a1fbfa` docs(48-06): ADR-QD-161, audit reports core's refusal and decides lost once
- `673ac45d` docs(48-06): ADR-QD-056 and ADR-QD-095 amended for core's refusal
- `c836d423` docs(48-06): the Breaking audit changeset and the 0.13 upgrade entry for core's refusal

## Revisions `spec-revise.mjs` printed

- `spec/traceability.md` 1.199 -> 1.200
- `spec/README.md` 1.207 -> 1.208 (Task 1), 1.208 -> 1.209 (Task 2); the CCR-QD-439 row names Rev 1.209
- `spec/decisions/056-audit-companion-package.md` 1.13 -> 1.14
- `spec/decisions/095-sinkcodec-owns-both-directions.md` 1.7 -> 1.8
- ADR-QD-161 is new at Rev 1.0

## Results

- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0` after Task 1 and after Task 2.
- `pnpm spec:website-examples`: `66 block(s) compile`, exit 0 (the new After fence is one of them).
- Task 1, 2 and 3 node checks: `ok` (against `phase_base`, ADR-QD-056 and ADR-QD-095 lose no line except their Revision and Change History rows; exactly one changeset added this phase, none edited; the entry is the last section of `upgrading.md`; the After fence reads only `evaluationId` and core's sentence).
- AREF-04's record half is complete (ADR plus Breaking changeset); WX-02 and WX-07 hold for this plan's files.

## Deviations from Plan

None - plan executed as written. Two notes:

- 48-05 left the `StageResult` doc comment without an ADR-QD-161 citation because the ADR did not yet exist. This plan's task list does not call for adding it, so the comment is unchanged; 48-07 or 48-08 may cite it if wanted.
- The plan names the Decision paragraph of ADR-QD-056 as ending at `:102`; it ends at `:103` (the pointer follows its last sentence).

## Known Stubs

None. ADR-QD-161 and the ADR-QD-161 traceability row name BEH-QD-576 to BEH-QD-580 and INV-QD-341 and INV-QD-342 in plain text on purpose; 48-07 writes them and links them.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md, .changeset/audit-refusal-is-cores.md
- FOUND commits: b3a1fbfa, 673ac45d, c836d423 (ancestors of HEAD, trailer present)
