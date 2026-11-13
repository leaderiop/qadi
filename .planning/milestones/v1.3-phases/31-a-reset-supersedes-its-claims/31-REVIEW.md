---
phase: 31-a-reset-supersedes-its-claims
reviewed: 2026-11-12T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - packages/core/src/SharedComputation.ts
  - packages/core/src/DecisionCache.ts
  - packages/core/test/SharedComputation.test.ts
  - .changeset/shared-computation-reset-supersedes.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase 31: Code Review Report (iteration 2)

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 4
**Status:** clean

## Summary

Re-review after the iteration 1 fixes (a1475c57, b7da31c4, bb637525). Each fix verified against the current tree; none introduces a new problem. `SharedComputation.test.ts` re-run with `--project core`: 18 passed.

- **WR-01 (pick widened):** `FastCheck.nat(15)` covers the longest command list (maxLength 16, so at most 16 waiters or computes, indices 0..15), and the Settle and Leave handlers now guard an empty list explicitly. The three floors (30 each) are unchanged and the property still meets them (reported 83 / 44 / 36). The laws are still checked after every step, and the drain still completes what runs. No floor lowered, seed and run count unchanged.
- **IN-02 (Match dispatch):** `Match.tagsExhaustive` over `Run | Reset | Settle | Leave`; a fifth command is a compile error. Handlers are named steps, `Reset: () => resetStep` is correct since it takes no argument. No `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`. The matcher is built per program run because its handlers close over per-run state, consistent with the AGENTS.md reasoning for closures over per-call state.
- **IN-03 (header):** the wording now matches the behaviour documented at lines 50, 63, 76 and 388-392 (an abandoned or superseded exit never reaches the adapter; a superseded compute still answers its waiters). Issue #64 is attached to the abandonment half. No plan or decision ids in the doc comment.

## Accepted / carried (not counted, do not affect status)

- IN-01: Superseded vs Abandoned are not observably different to consumers and the transition tables carry unreachable rows. Kept by design (locked decision D-01; tables keep mutation score at or above base, D-12).
- IN-04: stale "Advances `generation`" comment at `packages/core/test/DecisionCache.test.ts:864`. The file is frozen byte-identical to the phase base; carried debt for the milestone's carried-debt phase.

---

_Reviewed: 2026-11-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
