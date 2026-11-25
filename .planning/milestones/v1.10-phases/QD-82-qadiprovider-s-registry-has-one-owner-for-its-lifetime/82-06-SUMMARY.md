---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 06
subsystem: spec-records
tags: [adr, spec, traceability, amendment, activity, registry-lease]
requires: [82-05]
provides:
  - spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md (ADR-QD-195, Rev 1.0, Accepted, amends ADR-QD-014, ADR-QD-148 and ADR-QD-149)
  - dated amendments of ADR-QD-014 (header line and a note under its consequence), ADR-QD-148 (Rev 1.2) and ADR-QD-149 (Rev 1.2); ADR-QD-103 read and left unchanged
  - the ADR-QD-195 index entry and §3 row, the amended §3 rows, and the CCR-QD-474 row begun in spec/README.md
  - Pitfall 82-D corrected in the research notes
affects: [82-07, 82-08, 82-09, 82-10]
key-files:
  created:
    - spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/014-react-via-atoms.md
    - spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md
    - spec/decisions/149-a-seed-is-held-by-its-question.md
    - spec/traceability.md
    - spec/README.md
    - .planning/research/PITFALLS.md
key-decisions:
  - "ADR-QD-195 quotes the commit order as observed on React 19.3.1 (the three ORDER lines from the base and the three with the lease), and states the rule from them: setup runs children before the provider, cleanup runs the parent before its children, and the provider's hold is the last effect a reveal runs"
  - "Never releasing is rejected for retention, not for leaked fibers: idle removal already releases an unsubscribed runtime layer, so an unreleased registry holds the keepAlive subject, the seed grants, the runtime's layer atom and host initialValues atoms past the provider's life"
  - "The lease's matchers are built once per lease because a module-scope matcher's arms are mutants ignoreStatic leaves unjudged"
  - "Decided autonomously: ADR-QD-148's amendment states what the spike observed (the book's live counts are already zero from idle removal when a recycle runs, and reset() forks nothing) rather than the plan's wording that the book sees every reader released"
  - "Decided autonomously: ADR-QD-014 has no Document Control table, so its amendment is a dated header line plus a note, the form its earlier amendments take; scripts/spec-revise.mjs cannot revise it"
requirements-completed: [LEASE-05, WX-02]
duration: 22min
completed: 2026-11-25
status: complete
commits: 2
plan_head_before: 2a42291b8fbe3ed4c605daedb723244456cda7cd
plan_head_after: 4b19b30c3a33ea0173972aadda66363b34a8c431
actuals:
  tokens: 68000
  tasks: 2
  commits: 2
---

# Phase QD-82 Plan 06: ADR-QD-195 and its amendments Summary

**ADR-QD-195 records the provider's lifetime rule (one registry for the provider's life, recycled in place by a one-macrotask lease with `reset()` and the latest subject written back, never `dispose()`, seeds not re-applied), quotes React's observed commit order, and ADR-QD-014, ADR-QD-148 and ADR-QD-149 carry dated amendments pointing at it with their past text kept.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-11-25T01:23:00Z
- **Completed:** 2026-11-25T01:45:00Z
- **Tasks:** 2
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments

- Task 1 (tracer): ADR-QD-195 has its Document Control table, the six sections (Context, Decision, Alternatives considered, Consequences, What enforces it, Related) and a before/after table pinned by LT1 to LT15. The Context quotes the three observed ORDER lines on the provider as it was and the Decision quotes the three with the lease, without naming the evidence file. The Decision states the lease (closed union `Unheld | Held | Releasing`, `cancel` the only cancellation), the provider that only holds and releases, the recycle (`registry.reset()` then the latest committed subject, read from a ref written in an effect), the seeds not written back, the lease never touching the sweep, and the matchers built per lease. The Alternatives name each rejected shape with its reason, including never releasing as corrected. The Consequences record the accepted trade (a straggling read recreates a node nothing holds), the seeds not re-applied (an unanswered gate, and a subjectless seed, render `Pending`; a long hide with a re-render now paints `Pending` and reports once where it painted the superseded allow and reported twice), a host's own subscription detached, and `initialValues` seeding construction only. It is indexed, has its §3 row and the CCR-QD-474 row, and Pitfall 82-D carries a dated correction. `spec-revise --check`, strict traceability (`PASS: 21 FAIL: 0`) and `scan-ids` pass.
- Task 2: ADR-QD-014 has a dated `> **Amended:**` header line and a note under the registry-lifetime consequence; ADR-QD-148 and ADR-QD-149 each have a `## Amendment (2026-11-25, ADR-QD-195, CCR-QD-474)` section; no past line was removed from any of them (only the Revision and Change History rows changed). ADR-QD-103 was read, holds no "dispos" text, and is byte-identical to the phase base. The three §3 rows name their amendment and the CCR-QD-474 row lists the three ADRs at their revisions and says ADR-QD-103 was read and is unchanged.

## Task Commits

1. **Task 1: ADR-QD-195 written, indexed, traced, CCR row begun** - `83caf6f5` (docs)
2. **Task 2: ADR-QD-014, ADR-QD-148 and ADR-QD-149 amended** - `4b19b30c` (docs)

**Plan metadata:** the commit that carries this file, STATE.md and ROADMAP.md.

## Files Created/Modified

- `spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md` - ADR-QD-195, Rev 1.0
- `spec/decisions/index.yaml` - the ADR-QD-195 entry
- `spec/decisions/014-react-via-atoms.md`, `148-the-atom-set-owns-its-eviction-sweep.md` (Rev 1.2), `149-a-seed-is-held-by-its-question.md` (Rev 1.2) - dated amendments
- `spec/traceability.md` (Rev 1.315) - the ADR-QD-195 row and the three amended rows
- `spec/README.md` (Rev 1.393) - the CCR-QD-474 row
- `.planning/research/PITFALLS.md` - Pitfall 82-D's correction

## Decisions Made

See `key-decisions`. The behaviours and invariants that state the change (BEH-QD-746 to BEH-QD-750, INV-QD-409 and INV-QD-410) are 82-07's, and the ADR links BEH-QD-067 and BEH-QD-516 only until then.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Accuracy] ADR-QD-148's amendment states the observed fact, not "every reader released"**
- **Found during:** Task 2
- **Issue:** the plan says a recycle "the question book sees as every reader released". The research spike (Run 4) observed that by the time the timer fires the book's live counts are already zero from idle removal, and `reset()` adds no forks and starts no pressure episode.
- **Fix:** the amendment says that, and cites LT12 for one fork and one sweep per episode across a long hide.
- **Files modified:** `spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md`
- **Committed in:** `4b19b30c`

**2. [Rule 3 - Blocking] `spec-revise.mjs` cannot revise ADR-QD-014**
- **Found during:** Task 2
- **Issue:** the plan runs it once for each of the three ADRs, but ADR-QD-014 has no Document Control table (exit 2: "no Revision / Change History rows").
- **Fix:** ADR-QD-014 is amended the way its earlier amendments were, by a dated header line and a note, with no table added. ADR-QD-148 and ADR-QD-149 were revised with the script (1.1 to 1.2). The CCR row says ADR-QD-014 carries no revision table.
- **Files modified:** `spec/decisions/014-react-via-atoms.md`, `spec/README.md`
- **Committed in:** `4b19b30c`

**3. [Plan detail] The test list names RL1 to RL10**
- **Issue:** the plan says RL1 to RL9; RL10 was added by 82-05 to close the one lease survivor.
- **Fix:** ADR-QD-195's "What enforces it" says RL1 to RL10.

---

**Total deviations:** 3 (1 accuracy, 1 blocking, 1 plan detail). **Impact:** none on scope; each makes a record state what the code and the evidence show. No `packages/*/src` file changed.

## Issues Encountered

None. `82-check.mjs commit` is a post-commit check, so each commit was made with `git commit` and then confirmed by it.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. Spec text only. T-82-18 (the order quoted from the instrumented runs, not reasoned) and T-82-19 (amendments beside the past text, no removed line other than the Revision and Change History rows) are mitigated and checked by the task verifies; T-82-SC: no package installed, no manifest or lockfile changed.

## Self-Check: PASSED

- FOUND: `spec/decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md` (`QADI-ADR-195`, six sections, every fact the verify greps for)
- FOUND: commits 83caf6f5 and 4b19b30c on `arch-wave-15`; `git rev-list --count 2a42291b..HEAD` read 2
- `node scripts/spec-revise.mjs --check` passes; `bash spec/scripts/verify-traceability.sh --strict` prints `PASS: 21 FAIL: 0 SKIP: 0` (both tasks); `82-check.mjs scan-ids` passes; `82-check.mjs commit` confirmed both subjects and their paths; `82-check.mjs trailers` reports each plan commit with one Claude trailer

## Next Phase Readiness

Ready for 82-07: ADR-QD-195 exists and is traced, and its Related list links BEH-QD-067 and BEH-QD-516. The behaviours (BEH-QD-746 to BEH-QD-750), the invariants (INV-QD-409, INV-QD-410), the restated BEH-QD-067 and its note, and the links from the ADR to them are 82-07's.

---
*Phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime*
*Completed: 2026-11-25*
