---
phase: 31-a-reset-supersedes-its-claims
fixed_at: 2026-11-12T00:00:00Z
review_path: .planning/phases/31-a-reset-supersedes-its-claims/31-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 3
skipped: 2
status: partial
---

# Phase 31: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/31-a-reset-supersedes-its-claims/31-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (fix_scope: all)
- Fixed: 3
- Skipped: 2

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), so every number below is reproducible from the current tree.

## Fixed Issues

### WR-01: Property test can only ever pick the first two candidates

**Files modified:** `packages/core/test/SharedComputation.test.ts`
**Commit:** a1475c57
**Applied fix:** `pick` is now `FastCheck.nat(15)` (at least the 16-command maximum), and the Settle and Leave handlers guard an empty list explicitly (`list.length === 0 ? undefined : list[pick % list.length]`) rather than indexing with `NaN`. Seed 3101 and 300 runs unchanged; no floor lowered.
**Floor counts after the change** (before it: 81 / 46 / 35):
- settles that completed a superseded compute: 83 (floor 30)
- leaves that were a superseded compute's last waiter: 44 (floor 30)
- runs that claimed beside a running superseded compute: 36 (floor 30)

**Sabotage check** (31-03-PLAN.md: Live guard changed to `entry.standing !== "Abandoned"`): the property failed as required. `SharedComputation.ts` was restored; `git status --porcelain -- packages/core/src/SharedComputation.ts` is empty.
**Status note:** a test-logic change; the generator's reach was verified by the counters and the sabotage run, but the choice of 15 as the pick bound is a judgment worth a glance.

### IN-02: Property runner dispatched on `_tag` with an if/else chain

**Files modified:** `packages/core/test/SharedComputation.test.ts`
**Commit:** b7da31c4
**Applied fix:** each command's body became a named step, and the loop dispatches through `Match.type<Command>().pipe(Match.tagsExhaustive({ Run, Reset, Settle, Leave }))`. A fifth command is now a compile error instead of a silent Leave. The matcher is built once per program run, because its handlers close over per-run state. Added `import * as Match from "effect/Match"`.
**Status note:** a structural refactor of the property runner, behaviour-preserving; the property still passes at the same seed.

### IN-03: File header misstated what a superseded exit does and misattached issue #64

**Files modified:** `packages/core/src/SharedComputation.ts`
**Commit:** bb637525
**Applied fix:** the header now says an abandoned or superseded compute's exit never reaches the adapter and that a superseded one still answers its waiters. The `(issue #64)` reference moved to the abandonment half. No plan or decision ids in the comment.

## Skipped Issues

### IN-01: Superseded and Abandoned are never observably different; the lookup tables carry unreachable rows

**File:** `packages/core/src/SharedComputation.ts:82-99, 245, 390, 412`
**Reason:** skipped by design, no change. D-01 locks Superseded as a state distinct from Abandoned (BEH-QD-439 and INV-QD-307 name both), and the transition tables were chosen to keep the mutation score at or above its base (D-12). Collapsing them would reintroduce the unkillable (equivalent) mutants the tables removed.
**Original issue:** The only reader of `standing` is the Live check, so the two states are indistinguishable to consumers, and the two 3-row transition tables carry unreachable rows.

### IN-04: Stale `generation` comment in `DecisionCache.test.ts`

**File:** `packages/core/test/DecisionCache.test.ts:864`
**Reason:** skipped by design, no change. The file is frozen byte-identical to the phase base for this phase; the stale comment is carried debt for the milestone's carried-debt phase (suggested wording: "Supersedes ask 1's claim and empties `inFlight`").
**Original issue:** The comment says the flush "Advances `generation`", a counter that no longer exists.

## Verification

- `pnpm vitest run --project core` on `SharedComputation.test.ts` and `DecisionCache.test.ts`: 57 passed.
- `pnpm typecheck`: clean.
- `pnpm lint`: no errors. Only warnings in files this fix did not touch. House-style gate: 465 files clean, 3 declared switches.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
