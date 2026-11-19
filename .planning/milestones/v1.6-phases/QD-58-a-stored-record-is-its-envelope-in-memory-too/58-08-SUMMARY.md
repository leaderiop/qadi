---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 08
subsystem: release-records
tags: [changeset, upgrade-guide, ccr, breaking, stored-record, envelope]
requires:
  - phase: QD-58
    provides: 58-04 the envelope change, 58-06 ADR-QD-171, 58-07 the behaviours, invariants and traceability rows
provides:
  - three Breaking changesets (core, http, devtools; minor)
  - the upgrade guide's 0.13 section for the stored envelope, with a compiled fence
  - the CCR-QD-449 row and spec/README.md Rev 1.252
affects: [58-09]
actuals:
  tokens: 11000
  tasks: 2
  commits: 2
plan_head_before: 5648e30ba29ad5acb6f3a203cf9881b8a701bcba
plan_head_after: d0377113c670c8eb84a9f921d161d0aebe98cb8b
tech-stack:
  added: []
  patterns: ["a Breaking change is recorded in a changeset, the upgrade guide and a CCR row together, with a compiled After fence"]
key-files:
  created:
    - .changeset/core-stored-record-is-its-envelope.md
    - .changeset/http-stored-record-is-its-envelope.md
    - .changeset/devtools-stored-record-is-its-envelope.md
  modified:
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - spec/README.md
key-decisions:
  - "http's changeset is Breaking although no http source changed, because DecisionLogReader's element type is core's StoredRecord (D-15)"
  - "The 0.13 section offers no alias for any removed name (D-02)"
requirements-completed: [STOR-04, WX-02, WX-03, WX-07]
duration: 10min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 08: Changesets, upgrade entry and CCR-QD-449

**Three minor Breaking changesets, a 0.13 upgrade section with a compiled migration fence, and the CCR-QD-449 row close the stored-envelope phase's records, with strict traceability green and gate 13 at 933 exports.**

## Changesets

- `.changeset/core-stored-record-is-its-envelope.md` (`@qadi/core` minor): one `**Breaking.**` paragraph naming `StoredRecord` as `{ environment, record }`, the move of `_tag` and the fields under `stored.record`, the four removed exports (`Stamped`, `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`), the new `sinkRecordOrder` and `storedRecordOrder` ordering envelopes, and the unchanged wire; a second paragraph for the removed `half failed` warnings.
- `.changeset/devtools-stored-record-is-its-envelope.md` (`@qadi/devtools` minor): `ingest` and a `Source`'s backlog and live stream carry the envelope.
- `.changeset/http-stored-record-is-its-envelope.md` (`@qadi/http` minor): rests on `DecisionLogReader`'s element type and states that no http source changed.

Each ends with the upgrade-guide line.

## Upgrade guide

`apps/website/src/content/docs/docs/reference/upgrading.md` gains `## 0.13: a stored record is its envelope in memory` as its last section: the three migrations as a list, a "Before" `ts` fence, an "After" `typescript` fence that builds an `ObligationRecord`, wraps it in `new StoredRecord`, reads `stored.record._tag` and sorts two envelopes with `storedRecordOrder`, the `sinkRecordOrder` note, the removed warnings, the http and devtools consequences, and the ADR-QD-171 link.

## CCR-QD-449

The row sits directly after CCR-QD-448's in `spec/README.md`, naming every changed document at its current revision, the changesets, the upgrade guide, the source and test files, D-12, the Breaking line and `Ids used: ARCH-105, ADR-QD-171, CCR-QD-449, BEH-QD-626..630, INV-QD-361..362. Unused: none.` README moved 1.251 to 1.252 through `spec-revise` with `--date 2026-11-19`.

## Gates

- `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0.
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry.
- `pnpm -s spec:api`: `api-surface: 933 export(s) documented across 9 package(s)`.
- `pnpm -s spec:website-examples`: 69 blocks compile.
- `git diff --name-only phase_base HEAD -- "**/CHANGELOG.md" "**/package.json" "package.json"`: empty. `pnpm changeset version` not run; nothing released, published or pushed.

## Task Commits

1. **Task 1: three Breaking changesets and the 0.13 upgrade entry** - `d48aff2f` (docs)
2. **Task 2: CCR-QD-449** - `d0377113` (docs)

## Deviations from Plan

None - plan executed exactly as written. The row's date is `2026-11-19` (the orchestrator's `--date`), where the plan's command said `$(date +%F)`; both are the same day.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-58-16 holds: each changeset's front matter is exactly one package at `minor`, and no `package.json` or `CHANGELOG.md` changed since `phase_base`. T-58-17 holds: the core changeset names the four removed exports and the removed warning, and the upgrade fence compiles.

## Self-Check: PASSED

- All three changesets and `58-08` outputs exist; `d48aff2f` and `d0377113` are ancestors of HEAD, each ends with the trailer; `.planning/config.json` not staged.
- Task 1 and Task 2 verifies exit 0.
