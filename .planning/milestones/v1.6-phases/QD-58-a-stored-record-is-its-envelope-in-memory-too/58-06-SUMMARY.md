---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 06
subsystem: spec
tags: [adr, spec, stored-record, envelope, amendment, mutation-evidence]
requires:
  - phase: QD-58
    provides: 58-04 the envelope change and 58-05 the WX-05 mutation proof this ADR records
provides:
  - ADR-QD-171 and its index.yaml entry
  - ADR-QD-097 Rev 1.5, ADR-QD-135 Rev 1.1 and ADR-QD-159 Rev 1.8 amended
affects: [58-07, 58-08, 58-09]
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
plan_head_before: 00dc747ecbcb90dcbd2ae6aaecab9d7f820540e4
plan_head_after: fef44605993a39cfe0fe02664f794f831e86e945
tech-stack:
  added: []
  patterns: ["an amendment states what changed and the amended ADR's body stays as history", "an ADR's mutation table is computed from the evidence JSONs, not typed"]
key-files:
  created:
    - spec/decisions/171-a-stored-record-is-its-envelope-in-memory-too.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/097-a-decision-log-is-a-sink-and-its-own-history.md
    - spec/decisions/135-sink-record-fields-stated-once.md
    - spec/decisions/159-the-sink-emitter-reports-what-it-contains.md
key-decisions:
  - "ADR-QD-171 records D-01..D-06 and D-12..D-16, with the owner's D-12 quoted and the one ingest caller outside tests named"
requirements-completed: [STOR-04, WX-02]
duration: 6min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 06: ADR-QD-171 and the three amendments

**ADR-QD-171 records the stored-record envelope, its rejected alternatives, the owner's deletion of the log's `isolate` catches and the measured mutation table, and ADR-QD-097, 135 and 159 each say what it superseded.**

## ADR

`spec/decisions/171-a-stored-record-is-its-envelope-in-memory-too.md`, Revision 1.0, Document ID `QADI-ADR-171`, Status `Accepted — amends ADR-QD-097, ADR-QD-135, ADR-QD-159`. Its Decision cites D-01..D-06 and D-12..D-16; D-12 is quoted (`delete both \`isolate\` catches and test C4`) with where a defect now goes (the sink emitter, ADR-QD-159 Decision 1) and the one `ingest` caller outside tests, `examples/nextjs-newsroom/src/server/api.ts:156` (re-checked with `git grep`, it is the only one). The `## Mutation` table has the eight rows computed from `58-mutation-base.json` and `58-mutation-after.json`, and the sentence `The comparison printed \`WX-05 holds (D-16)\`.` BEH-QD-626..630 and INV-QD-361..362 appear as plain ids only. `index.yaml` carries the exact entry after ADR-QD-170's.

## Amendments

| Document | Old revision | New revision | Amendment |
|---|---|---|---|
| ADR-QD-097 | 1.4 | 1.5 | new top blockquote above the 2026-11-10 one: D-11-a, D-11-b, D-11-e, D-11-h |
| ADR-QD-135 | 1.0 | 1.1 | closing `## Amendment`: Alternative B's `StoredDecisionRecord` is gone, its other reasons stand |
| ADR-QD-159 | 1.7 | 1.8 | closing `## Amendment`: W6, W7 and C4 deleted (D-12), the rows and bullets are history |

All three Status cells gained `amended 2026-11-19 (…)`. Revisions moved only through `scripts/spec-revise.mjs`; no body line of an amended ADR was removed.

## Task Commits

1. **Task 1: ADR-QD-171 and its index entry** - `1a119db4` (docs)
2. **Task 2: ADR-QD-097, ADR-QD-135 and ADR-QD-159 amended** - `fef44605` (docs)

## Deviations from Plan

**1. [Tooling, orchestrator-authorised] `spec-revise` run with `--date 2026-11-19`**
- **Found during:** Task 2
- **Issue:** the script drops its document argument unless `--date` is passed.
- **Fix:** passed `--date 2026-11-19` on every call; the script was not edited.

**2. [Self-correction in Task 1] a line wrap split the quoted D-12 phrase**
- **Fix:** re-wrapped so `delete both \`isolate\` catches and test C4` is on one line, as the verify requires. Done before the commit.

**Total deviations:** 0 code deviations, 1 tooling note. **Impact:** none.

## Issues Encountered

None. The plan's raw `git log -1 --format=%B | tail -n 1` prints an empty last line (git appends a newline); the plan's own verify strips it through a command substitution, and both commits end with the trailer line.

## Known Stubs

None.

## Threat Flags

None. T-58-14 holds: `SinkEmit.ts`'s containment was read before D-12 was written, the `ingest` grep was re-run, and the mutation table was checked against the JSONs.

## Self-Check: PASSED

- Task 1 verify exit 0 (every required text, mutation rows equal the JSONs, index entry exact and after ADR-QD-170's).
- Task 2 verify exit 0 (revisions 1.5, 1.1 and 1.8, amendments at the end, no body line removed, links resolve); `spec-revise --check` passes.
- `1a119db4` and `fef44605` are ancestors of HEAD; the amendments commit carries exactly the three files; both end with the trailer. `.planning/config.json` not staged; nothing pushed or released; `next-id` not run.
