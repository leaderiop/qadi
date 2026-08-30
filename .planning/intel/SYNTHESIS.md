# Synthesis Summary

Re-run of doc synthesis after manual classification fix (see RE-RUN NOTE). All decisions.md, requirements.md, constraints.md, context.md, and INGEST-CONFLICTS.md were overwritten from scratch against the current classification files.

## Doc counts by type

- ADR: 50
- SPEC: 0
- PRD: 0
- DOC: 0
- UNKNOWN: 0

Total classified docs consumed: 50 (all from `spec/decisions/`, `ADR-QD-001` through `ADR-QD-050`).

## Decisions locked

- 50 of 50 ADRs are `locked: true`, status Accepted — every entry in `decisions.md` is a locked decision.
- Sources: `spec/decisions/001-effect-v4-as-effect-system.md` through `spec/decisions/050-a-simulation-is-sealed.md`.

## Requirements extracted

- 0 (no PRDs in this batch). See `requirements.md`.

## Constraints extracted

- 0 (no SPECs in this batch). See `constraints.md`. Note: `spec/invariants.md`, `spec/behaviors/*.md`, and `spec/models/*.md` are heavily cross-referenced by the ADRs but were not part of this classification batch.

## Context topics

- 0 (no DOCs in this batch). See `context.md`.

## Conflicts

- Cycle detection: re-run against all 50 docs' `cross_refs` graph, capped at depth 50 — 0 cycles (previously 3, resolved by orchestrator's classification edit and confirmed content-non-contradictory; see INGEST-CONFLICTS.md INFO section).
- Blockers: 0
- Competing variants (WARNING): 0
- Auto-resolved / informational (INFO): 5 — see `INGEST-CONFLICTS.md` for detail, including:
  - the resolved cycle history (ADR-QD-005/009/013/016/026)
  - ADR-QD-043's explicit, self-declared widening of ADR-QD-031's `DecisionCache` key shape
  - two dangling forward references to ADR-QD-053 and ADR-QD-054, which exist in `spec/decisions/` but were not part of this classification batch
  - the existence of ADR-QD-051 through ADR-QD-058 (8 further ADR files) not covered by this ingest

## Pointers

- Full conflict report: `.planning/INGEST-CONFLICTS.md`
- Decisions: `.planning/intel/decisions.md`
- Requirements: `.planning/intel/requirements.md` (empty this batch)
- Constraints: `.planning/intel/constraints.md` (empty this batch)
- Context: `.planning/intel/context.md` (empty this batch)

## Status

READY — safe to route. No blockers, no competing variants requiring user resolution.
