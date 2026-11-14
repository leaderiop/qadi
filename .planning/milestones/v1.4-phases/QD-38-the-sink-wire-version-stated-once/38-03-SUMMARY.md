---
phase: QD-38-the-sink-wire-version-stated-once
plan: 03
subsystem: spec
tags: [adr, ccr, invariant, changeset, gate-13]
requires: [38-02]
provides:
  - "ADR-QD-151, amending ADR-QD-096, with its index entry and traceability rows"
  - "INV-QD-096 amended in place; BEH-QD-199's listing restated"
  - "spec/overview.md names WIRE_VERSION (gate 13 green)"
  - ".changeset/sink-wire-version-stated-once.md, @qadi/core minor"
affects: [38-04]
tech-stack:
  added: []
  patterns: ["amend an invariant in place rather than adding one", "a CCR row naming every changed file with each spec document's final revision"]
key-files:
  created:
    - spec/decisions/151-the-sink-wire-version-is-stated-once.md
    - .changeset/sink-wire-version-stated-once.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md
    - spec/traceability.md
    - spec/README.md
    - spec/invariants.md
    - spec/behaviors/25-inspection.md
    - spec/overview.md
decisions:
  - "The write version WIRE_VERSION and the decoder's read set WIRE_VERSIONS are distinct ideas, recorded as such in ADR-QD-151"
  - "The WIRE_VERSIONS narrowing to readonly [2] is source-compatible; the changeset is minor with no Breaking marker"
metrics:
  duration: ~20 minutes
  completed: 2026-11-14
status: complete
commits: 3
plan_head_before: b42ad3b27f00ea9e10d99085e95ee2bb6ac797f2
plan_head_after: 74196d10a283d7850f51b0e86bf8eb802e990393
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
requirements-completed: [WIRE-04, WIRE-05, WX-02, WX-03, WX-07]
---

# Phase 38 Plan 03: The sink wire version stated once, recorded Summary

ADR-QD-151 records that the record-wire version is written once in `SinkWire.ts` with the read set distinct from the write version; INV-QD-096 and BEH-QD-199 are restated in place, the overview names `WIRE_VERSION` (gate 13 green), and a `@qadi/core` minor changeset records the source-compatible narrowing. No source or test file changed.

## Commits

- `9aceef3e` docs(38-03): ADR-QD-151, the sink wire version stated once, amending ADR-QD-096 (ADR-QD-151, index.yaml, ADR-QD-096, traceability, README)
- `05f20193` docs(38-03): INV-QD-096 amended; BEH-QD-199 and the overview name WIRE_VERSION (invariants, 25-inspection, overview, traceability)
- `74196d10` docs(38-03): @qadi/core minor changeset; the CCR-QD-429 row completed (changeset, README)

All three end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Revisions (before -> after), date 2026-11-14

| Document | Before | After |
|---|---|---|
| spec/decisions/151-the-sink-wire-version-is-stated-once.md | (new) | 1.0 |
| spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md | 1.4 | 1.5 |
| spec/invariants.md | 1.118 | 1.119 |
| spec/behaviors/25-inspection.md | 1.26 | 1.27 |
| spec/overview.md | 1.100 | 1.101 |
| spec/traceability.md | 1.166 | 1.168 (1.167 after Task 1) |
| spec/README.md | 1.170 | 1.172 (1.171 after Task 1) |

## Evidence

- Id check (every added line against the phase base `b1e8ecbf`; reserved set ARCH-85, ADR-QD-151, CCR-QD-429 and the unused BEH-QD-526..530, INV-QD-321..322): passed after Task 1, Task 2 and Task 3; the unused numbers appear only in the CCR-QD-429 row.
- `pnpm spec:api` after Task 2: `api-surface: 918 export(s) documented across 9 package(s)`, green (red since 38-02's refactor).
- `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict` (PASS 21, FAIL 0), `pnpm spec:examples` (113 blocks compile), `pnpm spec:gates` (dod-table 25 steps), `pnpm lint` (exit 0, house-style 496 files clean): all passed.
- ADR-QD-096 diff against the base changes exactly its two header rows (Revision, Change History) plus the appended amendment; INV-QD-097 and INV-QD-098 byte-identical; invariant and behaviour counts unchanged.
- Changeset is the only new one; `superseding-run.md`, `upgrading.md` and every CHANGELOG unchanged.

## Deviations from Plan

None - plan executed exactly as written. Note for the record: the plan's interfaces block cites phase base `93bcc8e0`, while the executable verifies read `phase_base` from the 38-01 summary (`b1e8ecbf8a10c34830ae84e9c464aaa6cc6b61d3`); the verifies were run as written against that value.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `spec/decisions/151-the-sink-wire-version-is-stated-once.md` and `.changeset/sink-wire-version-stated-once.md` exist; commits `9aceef3e`, `05f20193`, `74196d10` are ancestors of HEAD.
