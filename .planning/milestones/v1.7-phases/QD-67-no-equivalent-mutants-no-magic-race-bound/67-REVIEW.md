---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
reviewed: 2026-11-21T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/core/src/DecisionCache.ts
  - packages/core/src/SharedComputation.ts
  - packages/core/src/TraceDiff.ts
  - packages/core/test/DecisionCache.test.ts
  - packages/core/bench/DecisionCache.bench.ts
  - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/ab.sh
  - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/analyze.mjs
  - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs
  - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-DISPATCH.md
  - AGENTS.md
  - spec/process/house-rules-evidence.md
  - spec/behaviors/21-decision-cache.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
  necessity: 0
status: clean
---

# Phase QD-67: Code Review Report

**Reviewed:** 2026-11-21
**Depth:** standard (re-review after the fixes in 4dce107b, 36036666 and e5c18e6f)
**Files Reviewed:** 15 (the `TraceDiff.ts` change is a comment only; the source files are unchanged since the first review)
**Status:** clean (no Critical or Warning remains; four Info items)

## Summary

The first review found no Critical, one Warning (WR-01) and four Info items. WR-01, IN-03 and IN-04 are fixed and each fix
holds. IN-01 and IN-02 are carried forward as deliberately skipped. The fixes add two small Info items of their own and no
Critical or Warning.

**No executable change since the bench of record.** `git diff 0e3f9cbd..HEAD -- packages scripts package.json` is empty, and so
is the same range for `pnpm-workspace.yaml`, `pnpm-lock.yaml` and `stryker.config.mjs`. The files changed in that range outside
`.planning/phases/QD-67-*` are `.planning/{REQUIREMENTS,ROADMAP,STATE}.md`, `AGENTS.md` and five `spec/` documents. The bench of
record therefore still describes the shipped source. The three source files are clean in `git status`.

**Re-run:** `67-mutation.mjs --self-test` (11 passed, was 10), `67-mutation.mjs compare` (passes), `analyze.mjs --self-test` (7
passed), `check-house-style.mjs` (560 files clean), `spec-revise.mjs --check` (clean).

### WR-01 fixed: the scorer refuses a dirty `FILES` set

`record` and `evidence` both call `refuseDirty()` first (`67-mutation.mjs:37-42, 166, 179`). It runs
`git status --porcelain -- <FILES>` over all three scored files (`DecisionCache.ts`, `Lifecycle.ts`, `SharedComputation.ts`), so
a modified, staged or untracked file fails the record before any report is read. `dirtyReasons` is pure, exported and
returns one reason naming the status lines. The self-test plants ` M packages/core/src/DecisionCache.ts` and checks that it is
refused and that an empty status is not. Together with `tally`'s check that the report's `source` equals the file on disk,
the line numbers a record stores now belong to the commit it names. The ordering is sound: the check runs before the config
import and before the evidence-file refusal, so the cheap failure comes first. `git status --porcelain` is empty for the three
files in this tree, so the committed records are not in conflict with the new rule. One residual, see IN-03.

### IN-03 fixed: the §5a paragraph cites durable evidence, and the numbers match

`AGENTS.md:329-335` now says the arm table is a third dispatch form, taken over the hoisted `Match` form because that form
failed a gate fixed in advance and the table passed it, and cites `spec/process/house-rules-evidence.md` §2 (CCR-QD-458). The
cited section exists (heading at line 92, under §2) and the target is a normative document, not `.planning/`. Every figure in
that subsection agrees with `67-DISPATCH.md` and `67-BENCH.md`:

- Match deltas -3.6, -0.5, -0.9, +7.2, +7.7; two workloads slower; geometric mean +1.87; gate fail. All five match.
- Table deltas -8.4, -6.3, -6.9, +0.3, +0.9; none slower; geometric mean -4.15; gate pass. All five match.
- Base spreads 15.0, 12.7, 6.0, 7.6, 6.0 (6.0% to 15.0%) for the `Match` run and 1.6, 1.8, 1.1, 3.1, 1.8 (1.1% to 3.1%) for the
  table run. Both match, and the spread's definition (largest minus smallest per-run minimum over the median) is
  `analyze.mjs:38`.
- Load 3.86 at the `Match` start, 10.22 rising to 16.09 for the table run, `mds` at 207.9% between two `Match` runs. All match
  the load tables.
- The later run: `miss` +2.8%, `miss, capacity-bound` +1.0%, geometric mean -2.51%, every workload inside the band. All match
  `67-BENCH.md`.
- The rule (median of per-run minima, 5% band, geometric mean at most +2%, `Match` first, then table, no re-run, five
  workloads, 3 + 3 interleaved) matches the "The rule" section of `67-DISPATCH.md`.

### IN-04 fixed: spreads and load stand beside the verdict, and no cost is claimed for `Match`

The evidence document's "What the runs do not hold" block, the new "What the runs hold" section of `67-DISPATCH.md` and the
CCR-QD-458 row all state the spread above the 5% band and the load rise, and all three end on the same limit: the choice follows
the gate as fixed and holds no figure for what the `Match` form costs. The `AGENTS.md` paragraph says "failed a gate fixed in
advance" and does not state a percentage. No text claims a `Match` cost beyond the two failing deltas of that one run. One
imprecision remains in the third bullet, see IN-04 below.

### CCR-QD-458 row cites every revised document at its current Revision

Line 8 of each document, against the row (`spec/README.md:395`):

| Document | Line 8 | Row |
| --- | --- | --- |
| `spec/behaviors/21-decision-cache.md` | 1.12 | Rev 1.12 |
| `spec/invariants.md` | 1.166 | Rev 1.166 |
| `spec/traceability.md` | 1.233 | Rev 1.233 |
| `spec/README.md` | 1.271 | Rev 1.271 |
| `spec/process/house-rules-evidence.md` | 1.2 | Rev 1.2 |

These are the five `spec/` files changed since `eacf89b4`, and `AGENTS.md` §5a is cited without a revision because it carries
none. `spec-revise.mjs --check` agrees that each Revision matches its newest Change History entry, and the new entries (1.270,
1.271 and evidence 1.2) are present.

## Info

### IN-01: The negative-capacity test, the NaN test and the fractional test still describe the deleted loop (carried forward, deliberately skipped)

**File:** `packages/core/test/DecisionCache.test.ts:1052`, `:1054-1056`, `:1077-1078`, `:1095-1096`
**Issue:** Unchanged from the first review. The title and three comments name the eviction loop that `Chunk.splitAt` replaced.
No assertion is wrong. Deferred to the milestone audit, because the phase keeps every test outside the race test unedited
(WX-06).
**Fix:** At the milestone audit, retitle to "rejects a negative capacity rather than retaining nothing" and restate the three
comments in terms of the split. No assertion changes.

### IN-02: The trailing `oneSided` assertion in the race test is dead (carried forward, the owner's decision)

**File:** `packages/core/test/DecisionCache.test.ts:1249, 1316-1320`
**Issue:** Unchanged from the first review. After `capped` passes, `oneSided` is empty by construction. 67-CONTEXT records the
owner's decision to keep the final "both sides at every budget" assertion, so it stays.
**Fix:** None under this phase.

### IN-03: The scorer's self-test covers the refusal's predicate but not its call sites

**File:** `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs:37-42, 227-229`
**Issue:** The planted case drives `dirtyReasons`, the pure function. Nothing in `--self-test` fails if `refuseDirty()` is
deleted from `record` or `evidence`, or if `git status` is given the wrong paths, because those two lines are the part that
touches git and the process. The fixer checked the wiring by hand (a one-line edit made `evidence` exit 1) and the code reads
correctly now, so this is not a defect. It means the guard the self-test advertises could be removed later without the test
noticing. The scorer is phase-local evidence tooling run once per record, so the risk is small.
**Fix:** Optional. Pass the `git status` reader into `refuseDirty` as a parameter, or call `dirtyReasons` through a single helper
both entry points share, and plant a stub that returns a modified line. Or leave as is and note the limit in the header comment.

### IN-04: The "later run" bullet compares a different change set to the `Match` deltas

**File:** `spec/process/house-rules-evidence.md` (third bullet of "What the runs do not hold"); `67-DISPATCH.md` (third bullet of "What the runs hold")
**Issue:** The `Match` and table candidates were built on the base source and changed only the claim dispatch. They were
measured before the eviction commit (`570d76b1`). The "later run of the committed source" (`67-BENCH.md`) carries the eviction
rewrite (`Chunk.splitAt`, `HashMap.removeMany`) as well as the table dispatch. The bullet says its `miss` +2.8% and
`capacity-bound` +1.0% are "the same direction as the `Match` deltas, smaller", which reads as if the table or the dispatch
alone moved the miss workloads that way. The figures are correct. The comparison does not say that the run includes the other
half of the phase, so the +2.8% cannot be attributed to the dispatch from this text. It does not claim a cost for `Match`, so it
does not break IN-04's requirement. It could mislead a reader reopening the choice.
**Fix:** Add a clause to both bullets: "that run also carries the eviction rewrite, so its deltas are not the dispatch's alone".

---

_Reviewed: 2026-11-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_


> **Orchestrator, after iteration 2:** the new IN-04 is resolved in 82f87b4f (one clause in `spec/process/house-rules-evidence.md` and `67-DISPATCH.md`; evidence doc Rev 1.3, README Rev 1.272, CCR-QD-458 row re-aligned, `ccr-row.mjs` 5/5). The new IN-03 (the self-test covers `dirtyReasons`, not its call sites) goes to the milestone audit.
