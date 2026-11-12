---
phase: 24-simulation-source-preparation
fixed_at: 2026-11-11T00:00:00Z
review_path: .planning/phases/24-simulation-source-preparation/24-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/24-simulation-source-preparation/24-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

Info findings (IN-01..IN-04) are out of scope for `critical_warning` and remain in REVIEW.md.
Edits were made in the main checkout (`workflow.use_worktrees` is `false`). Verification ran there:
`pnpm vitest run --project devtools` (44 files, 1163 tests pass), `pnpm typecheck`, `pnpm lint` (no errors).
No spec file changed, so the spec gates were not run.

## Fixed Issues

### WR-01: A Live run's preparation is built before the teardown yield

**Files modified:** `packages/devtools/src/model/SimulationSession.ts`, `packages/devtools/test/model/SimulationSession.test.ts`
**Commit:** 1ad24867
**Applied fix:** `runEffect` now calls `retire()`, reads `mine = generation`, then `reap()`s, and returns if
`mine !== generation`. The question, `prepareSource` and the clock are all read after that last yield, for both
the Refused and Ready paths (the Refused path's own retire/reap pair was folded into the single one). A ports
layer swapped during teardown therefore cannot contribute a recorder or leave a stale capture. Pinned by a new
TestClock test ("keeps no capture from an environment that was replaced while a run was starting"), confirmed to
fail on the old ordering before the fix. Status: fixed, requires human verification (logic/ordering change).
The same guard also closes the replay/seed-during-`reap` window logged in `deferred-items.md`, since `replay` and
`seed` call `retire()`; the existing disjunctive test for that window still passes and was left unchanged.

### WR-02: `SOURCE_ORDER` is a second, unclosed list of sources

**Files modified:** `packages/devtools/src/model/SimulationSource.ts`
**Commit:** 5977264c
**Applied fix:** `SOURCE_ORDER` is now `Object.values` of a record that `satisfies { [K in SourceChoice]: K }`,
so a fourth source is a compile error there as in `rowsOf` and a source cannot be listed twice. The code now
satisfies the BEH-QD-455 / ADR-QD-050 claim as written; no spec text changed.

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
