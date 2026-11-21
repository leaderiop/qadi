---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
fixed_at: 2026-11-21T00:00:00Z
review_path: .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 3
skipped: 2
status: partial
---

# Phase QD-67: Code Review Fix Report

**Fixed at:** 2026-11-21
**Source review:** .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (the orchestrator selected WR-01, IN-03, IN-04 and named IN-01 and IN-02 as skipped)
- Fixed: 3
- Skipped: 2

Verification ran in the main checkout (`workflow.use_worktrees` is `false`; no worktree was created). No executable
change under `packages/*/src`, `packages/*/bench`, `packages/*/test`, `scripts/` or `package.json`. Stryker was not re-run.

## Fixed Issues

### WR-01: `67-mutation.mjs record` does not check that the working tree is the commit it records as `head`

**Files modified:** `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs`
**Commit:** 4dce107b
**Applied fix:** `record` and `evidence` call `refuseDirty()` first, which runs `git status --porcelain -- <FILES>` and fails
naming each file that differs from HEAD (`dirtyReasons`, pure and exported). `--self-test` gained a planted case (a modified
`DecisionCache.ts` is refused, a clean status is not); it reports 11 passed (was 10). Checked for real: a one-line edit to
`Lifecycle.ts` made `evidence` exit 1 with "record from a clean tree; these differ from HEAD: M packages/core/src/Lifecycle.ts",
and the edit was reverted with `git checkout --`. `compare` on the committed base, close and static records still passes.

### IN-03: AGENTS.md §5a paragraph does not point at its evidence

**Files modified:** `spec/process/house-rules-evidence.md`, `AGENTS.md`, `spec/README.md`
**Commit:** 36036666
**Applied fix:** Added a subsection to §2 of the evidence document: the rule fixed on 2026-11-20, the five workloads, both
candidates' per-workload deltas, the gate verdicts, the base spreads, the host load and the later run of the committed
source. The §5a paragraph now calls the arm table a third dispatch form, taken because the `Match` form failed a gate fixed
in advance, and cites `house-rules-evidence.md` §2 (CCR-QD-458). The evidence document went 1.1 to 1.2 and `spec/README.md`
went 1.269 to 1.270, both through `spec-revise --date 2026-11-21`. The CCR-QD-458 row cites the evidence document at Rev 1.2
and `spec/README.md` at Rev 1.270.

### IN-04: The dispatch choice rests on one noisy run per form, under different host load

**Files modified:** `spec/README.md`, `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-DISPATCH.md`
**Commit:** e5c18e6f
**Applied fix:** The CCR-QD-458 row now gives the failing deltas (+7.2% and +7.7%), the failing run's base spreads (6.0% to
15.0%, above the 5% band) and the table run's load rise (10.22 to 16.09, against 3.86 for the `Match` run), and says the choice
follows the gate as fixed and holds no figure for the `Match` form's cost. 67-DISPATCH.md gained a "What the runs hold"
section before "Choice". The evidence-document half of IN-04 (spreads and load beside the verdict) went in with IN-03's
subsection, in commit 36036666, because it is the same text. `spec/README.md` went 1.270 to 1.271 and the row cites Rev 1.271.
`ccr-row.mjs` prints that all 5 documents are cited at their current Revision.

## Skipped Issues

### IN-01: The negative-capacity test, the NaN test and the fractional test still describe the deleted loop

**File:** `packages/core/test/DecisionCache.test.ts:1052`, `:1054-1056`, `:1077-1078`, `:1095-1096`
**Reason:** skipped by the orchestrator: the phase keeps every test outside the race test unedited (WX-06), so the stale
comments go to the milestone audit.
**Original issue:** The test title and three comments name the deleted eviction loop. The behavior they pin still holds.

### IN-02: The trailing `oneSided` assertion in the race test is now dead

**File:** `packages/core/test/DecisionCache.test.ts:1249, 1316-1320`
**Reason:** skipped by the orchestrator: 67-CONTEXT records the owner's decision to keep the final "both sides at every
budget" assertion.
**Original issue:** After `capped` passes, `oneSided` is empty by construction, so the trailing assertion cannot fail on its own.

## Checks after the fixes

`verify-traceability.sh --strict` 21 pass, 0 fail; `spec-revise --check` clean; `check-doc-examples` 117 blocks compile;
`check-dod-table` clean; `check-api-surface` clean; `check-house-style` 560 files clean; `check-devtools-claims` clean;
`67-mutation.mjs --self-test` 11 passed; `67-mutation.mjs compare` passes; `ccr-row.mjs` 5 of 5 documents cited at their
current Revision. `pnpm check:pr` was not run (the orchestrator runs it).

---

_Fixed: 2026-11-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
