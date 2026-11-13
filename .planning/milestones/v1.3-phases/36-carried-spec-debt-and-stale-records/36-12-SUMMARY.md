---
phase: 36-carried-spec-debt-and-stale-records
plan: 12
subsystem: spec
tags: [spec, adr, hydration, seed, subject, traceability]
requires:
  - phase: 36-09
    provides: the subject keepAlive and the seed grant code this plan records
  - phase: 36-11
    provides: the CCR-QD-427 row this plan completes for the hydration half
provides:
  - ADR-QD-149 (a seed is held by its question; a registry holds only a grant to it) and its index entry
  - dated amendments of ADR-QD-039, ADR-QD-103 and ADR-QD-014
  - BEH-QD-516, BEH-QD-517, BEH-QD-518 and INV-QD-317, INV-QD-318
  - BEH-QD-067, -149, -151, -152, -198 and INV-QD-028, -105 restated in place
  - traceability rows for the new ids and three new react test files
  - the CCR-QD-427 row's subject and seed half
affects: [36-13, 36-14]
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["a correction is a dated amendment under the text it corrects; the original stays as history"]
key-files:
  created:
    - spec/decisions/149-a-seed-is-held-by-its-question.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/039-a-seed-is-not-an-authority.md
    - spec/decisions/103-a-question-is-opened-once.md
    - spec/decisions/014-react-via-atoms.md
    - spec/behaviors/09-react.md
    - spec/behaviors/19-hydration.md
    - spec/behaviors/25-inspection.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-039 and ADR-103 keep their Status cells and index statuses (ADR-014's precedent); ADR-039's third consequence (a seed does not survive its own node) is named as no longer holding in the amendment, not rewritten"
  - "BEH-QD-151's third requirement restates what held only because the seed node was gone, and is now enforced by the announced guard"
requirements-completed: [WX-02, DEBT-04]
status: complete
commits: 3
plan_head_before: ab5fe2f0c6f8db7defe84dc0e95e3ee2422e355d
plan_head_after: b2c4d0347add4bb3bff2bfd48115491bc8af0763
duration: 25min
completed: 2026-11-13
---

# Phase 36 Plan 12: The seed and the subject, recorded Summary

**ADR-QD-149 records that a seed is held by its question and a registry holds only a keepAlive grant to it, with BEH-QD-516..518, INV-QD-317..318, the restated requirements, and the CCR-QD-427 row's subject and seed half, every cited test passing.**

## Commits

| Commit | What |
| ------ | ---- |
| `acd95120` | Task 1: ADR-QD-149, its index entry, the ADR-039 (1.1 to 1.2), ADR-103 (1.3 to 1.4) and ADR-014 amendments, traceability 1.160 to 1.161 |
| `87fd8e5a` | Task 2: BEH-QD-516..518, INV-QD-317..318, the restatements, the traceability rows |
| `b2c4d034` | Task 3: the CCR-QD-427 row, README 1.164 to 1.165 |

## Revisions

| Document | Before | After |
| -------- | ------ | ----- |
| `spec/decisions/149-...md` | none | 1.0 |
| `spec/decisions/039-...md` | 1.1 | 1.2 |
| `spec/decisions/103-...md` | 1.3 | 1.4 |
| `spec/decisions/014-react-via-atoms.md` | no Revision cell | amendment line only |
| `spec/behaviors/09-react.md` | 3.6 | 3.7 |
| `spec/behaviors/19-hydration.md` | 1.17 | 1.18 |
| `spec/behaviors/25-inspection.md` | 1.25 | 1.26 |
| `spec/invariants.md` | 1.115 | 1.116 |
| `spec/traceability.md` | 1.160 | 1.162 (1.161 after Task 1) |
| `spec/README.md` | 1.164 | 1.165 |

Numbers used: ADR-QD-149, BEH-QD-516..518, INV-QD-317..318. Not used and not cited in this plan: BEH-QD-519..520.

## D-20 records (beyond the written tasks)

- `spec/behaviors/19-hydration.md` BEH-QD-151: an `> **Amended 2026-11-12 (CCR-QD-427).**` note after the requirements reads "a re-check" in the second requirement as the `Success(previous, waiting)` result of an invalidation (ADR-QD-039's own wording) and keeps that a seed covers any `Initial` result, in flight or not, until this client answers. The requirement's text is unchanged. The Change History row for 1.18 records it.
- `spec/decisions/014-react-via-atoms.md`: an `> **Amended:** 2026-11-12 (CCR-QD-427).` blockquote under the paragraph that pins `"Success,Initial+waiting,Success"` states the pin is now `"Success(SeededAllow),Success(Deny)"` (the recorder keeps the decided tag beside `Success`) and that the middle state was the registry dropping the seed, fixed by ADR-QD-149. The paragraph stays as history. ADR-014 has no Document Control table, so it takes no Revision bump; it is in the Task 1 commit with the other ADR amendments. Its traceability row says the pin is amended.
- The CCR-QD-427 row names both.

## Verification

- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry.
- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0`.
- `pnpm spec:gates`: `dod-table: 25 step(s) match pnpm check, 141 reference(s) resolve`.
- `pnpm vitest run --project react` over `QadiProvider.subject`, `QadiProvider.seed`, `Hydration.lifetime`, `HydrationEngine`, `v4-reactivity-smoke`: 5 files, 58 tests passed, so every enforcement test the new text cites exists and passes.
- Each task's plan-supplied static check (ADR, requirements and invariants, CCR row) printed OK at its commit.
- `pnpm spec:api` (gate 13) was not run; it stays red until 36-13 Task 2, and this plan adds no public export.

## Deviations from Plan

**1. [Scope, D-20] ADR-QD-014 edited.** `spec/decisions/014-react-via-atoms.md` is not in the plan's `files_modified`. D-20 (the user's decision during 36-09) adds the amendment to this plan, so it went in the Task 1 commit with the other ADR amendments, and its traceability §3 row gained a clause.

**2. [Wording] ADR-039's third consequence.** The Decision's third consequence ("A seed does not survive its own node") is false once a registry holds a grant. The amendment says so in terms and leaves the original paragraph; the plan's text did not name it.

**3. [Note] Task 1's static check checks traceability Revision 1.161.** After Task 2 the Revision is 1.162, so that check no longer passes by design; it ran green at the Task 1 commit.

## Known Stubs

None.

## Threat Flags

None. T-36-24 is mitigated in BEH-QD-518 and INV-QD-318 (the cross-request case on a server named; HL3, HL5, HL7 cited and passing). T-36-25 is mitigated by running every cited test file and `spec:verify:strict` checks 2 and 6.

## Self-Check: PASSED

`spec/decisions/149-a-seed-is-held-by-its-question.md` exists; commits `acd95120`, `87fd8e5a`, `b2c4d034` are ancestors of HEAD; `git rev-list --count ab5fe2f0..HEAD` is 3 and matches `commits: 3`.
