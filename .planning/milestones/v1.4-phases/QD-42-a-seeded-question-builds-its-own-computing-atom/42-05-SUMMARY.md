---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
plan: 05
subsystem: react-hydration
tags: [verification, mutation, milestone-recheck, merge-gate, no-release]
phase_base: 7e5dafdbf1cc266310586b1a3c5064346e0b8360
plan_head_before: cf786de287266199a32c2b3b15536dd214f03950
plan_head_after: 9b12415009e810f2eaf31ef88bb386451dc6d2f4
requires: [42-04]
provides:
  - 42-mutation-after.json (the phase run's three scores, flat path to score)
  - 42-milestone-mutation.json (the fifteen measured milestone files, each with the record its base came from, the base and the score at the final head)
  - the evidence that the gates, the commit order, the pins, the ids, the comment-only files, the sweep, the merge gate, the example and the no-release rule all hold on the final tree
affects: []
requirements-completed: [SEED-04, SEED-06, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07]
actuals:
  tokens: 6000
  tasks: 3
  commits: 1
tech-stack:
  added: []
  patterns: [one Stryker run at a time from the base's exact invocation, moved module judged by the survivors that moved with its code, milestone bases taken from the latest recorded score]
key-files:
  created:
    - .planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-mutation-after.json
    - .planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-milestone-mutation.json
  modified: []
key-decisions:
  - "No closing test was needed: HydrationEngine.ts rose to 1 and QadiAtoms.ts to 0.9 (both above base), SeededQuestion.ts carries exactly its five moved survivors, and all fifteen milestone files equal their latest recorded score"
duration: 17 min
completed: 2026-11-14
status: complete
commits: 1
---

# Phase 42 Plan 05: Phase Close and Milestone Re-check Summary

Every phase and milestone claim was checked by running it: no gate was edited beyond the two-key budget move and one AGENTS.md line, nothing forbidden entered, the ten plan commits ran in order, the phase's mutation scores rose or held, the moved module carries only its five moved survivors, all fifteen milestone files equal their latest recorded score, `pnpm check:pr < /dev/null` and `pnpm example` (30 passed) are green, and nothing was released. No source or test file changed in this plan; its one commit is the two result JSONs.

## Task 1: gate integrity, scan, order, scope, ids, comment-only (no commit; verify only)

All run from the repository root on the committed tree, all exit 0 (re-run after the mutation-result commit: integrity, order, scope, ids, sweep and the rest, all still 0).

| Check | Result |
| --- | --- |
| Gate integrity: only `scripts/check-house-style.mjs` (exactly the two `DECISION_READ_BUDGET`/`_NAMES` keys moved) and `AGENTS.md` (exactly the one §13 line) differ from the phase base | exit 0 |
| WX-04 scan over added lines (455 added code lines read; strings and comments stripped) | exit 0 |
| Commit order and trailers: 10 plan commits, then the one `chore(42-05)`; first run "mutation result not yet committed", after the commit "11 plan commits, mutation result committed" | exit 0 |
| Scope and pins: changes within the planned set, pinned react tests, `features/`, `examples/` untouched, both `test(42-02)` commits precede `refactor(42-03)` and their lines remain | exit 0 |
| Ids: only ARCH-89, ADR-QD-155, CCR-QD-433 new; BEH-QD-546 to 550 and INV-QD-329 to 330 appear only in spec/README.md; no added word names a plan, decision or placeholder id | exit 0 |
| Comment-only proof (TypeScript printer) for QuestionBook.ts, SeededDecision.ts, HydrationEvent.ts, Hydration.ts | exit 0 |
| `pnpm spec:api` (927 exports across 9 packages) and `pnpm circular` (222 files, no cycle) | exit 0 |

## Task 2: mutation result

Five Stryker invocations, one at a time in the background, each finished before the next; each exit 0 (no break-threshold failure). The phase report was copied to `reports/mutation-react/mutation.phase-42.json` before the react milestone run overwrote the path. The phase invocation was the base's exact string.

### Phase run (`42-mutation-after.json`), 58 seconds

| File | Base | After | Detected/scored | Ignored | Survivors |
| --- | --- | --- | --- | --- | --- |
| `packages/react/src/HydrationEngine.ts` | 0.9783549783549783 | 1 | 183/183 | 18 | none |
| `packages/react/src/QadiAtoms.ts` | 0.896551724137931 | 0.9 | 36/40 | 1 | 223:15 LogicalOperator, 223:34 ConditionalExpression, 223:15 ConditionalExpression (twice), all in `subjectsEqual`, the four of the base that stay |
| `packages/react/src/SeededQuestion.ts` | moved (region 0.9253731343283582, 62/67) | 0.9193548387096774 | 57/62 | 2 | 73:19 StringLiteral `"SeedGrant"`; 165:12 LogicalOperator and 165:12 ConditionalExpression on `Option.isSome(held) && held.value instanceof SeedGrant`; 186:13 ConditionalExpression `resource === undefined`; 196:36 ObjectLiteral `{ announced: false }` |

HydrationEngine.ts and QadiAtoms.ts are at or above their base, unrounded. SeededQuestion.ts's five survivors are exactly the five base survivors that moved with their code, matched by mutator and original text; no new survivor. `42-mutation-base.json` is in one commit and untouched. This equals the 1b spike (183/183, 36/40, 57/62).

### Milestone re-check (`42-milestone-mutation.json`)

Core 34 s, devtools 5 min 1 s, audit 11 s, react 29 s. Each measured file equals its latest recorded score (no drop). Where a phase's own review record exists it takes precedence over that phase's after JSON, as the plan's "Flagged risk" says; the after JSON's value is stated where it differs.

| File | Base | Record it came from | After | Survivors |
| --- | --- | --- | --- | --- |
| core `Explanation.ts` | 0.987012987012987 | 41-REVIEW-DISPOSITION.md (228/231); `41-mutation-after.json` says 0.9875 (237/240), written before the review fixes | 228/231 | 281:53, 538:64, 668:75 (the three equivalent ones) |
| core `HydrationMetrics.ts` | 1 | 39-mutation-after.json | 1 (0/0, no scored mutant) | none |
| core `SinkCodec.ts` | 0.9754601226993865 | 40-REVIEW-DISPOSITION.md (159/163), over Phase 38's | 159/163 | 328:10, 330:9, 393:7, 397:7 |
| core `SinkWire.ts` | 1 | 40-REVIEW-DISPOSITION.md (60/60), over Phase 38's | 60/60 | none |
| core `ValueText.ts` | 1 | 41-REVIEW-DISPOSITION.md (13/13) | 13/13 | none |
| devtools `DiagnosticsFeed.ts` | 0.9473684210526315 | 37-mutation-after.json | 90/95 | 181:9, 182:9, 183:9, 196:13, 223:11 |
| devtools `Filters.ts` | 1 | 41-REVIEW-DISPOSITION.md (75/75) | 75/75 | none |
| devtools `Remedies.ts` | 1 | 41-REVIEW-DISPOSITION.md (297/297) | 297/297 | none |
| devtools `SimulationForm.ts` | 0.9836660617059891 | 41-mutation-after.json | 542/551 | 105:7, 107:10, 142:69 (NoCoverage), 213:11 (x2), 213:25, 213:38, 227:23, 367:34 |
| devtools `SimulationSession.ts` | 0.9818731117824774 | 37-mutation-after.json | 325/331 | 395:17, 398:22, 398:35, 402:9, 404:9, 482:9 |
| devtools `Source.ts` | 1 | 40-REVIEW-DISPOSITION.md (80/80) | 80/80 | none |
| devtools `SupersedingRun.ts` | 0.9433962264150944 | 37-mutation-after.json | 50/53 | 94:29, 94:45, 121:13 |
| devtools `TimelineFeed.ts` | 1 | 37-mutation-after.json | 47/47 | none |
| audit `AuditEntry.ts` | 1 | 40-mutation-after.json | 19/19 | none |
| react `HydrationEvent.ts` | 1 | 39-mutation-after.json (measured against Phase 39, not the Phase 42 comment edit) | 33/33 | none |

Classified unmeasured files since `637c0601`: barrels `packages/core/src/index.ts` and `packages/devtools/src/index.ts`; comment-only `packages/http/src/DecisionStreamRoute.ts`, `packages/react/src/Hydration.ts`, `QuestionBook.ts`, `SeededDecision.ts`; the phase run's `HydrationEngine.ts`, `QadiAtoms.ts` and `SeededQuestion.ts` (judged by the phase comparison only). No `unclassified` or `unbaselined` file. The two JSONs were committed together and alone as `chore(42-05)` (`9b124150`), no `test(42-05)` after it.

## Task 3: sweep, merge gate, example, release check

| Check | Result |
| --- | --- |
| Stale names removed since `637c0601` (asDecodeRefusal, recordJsonOf, MEANINGS, reasonOf, MalformedReason) named in no live record, 149 files scanned | exit 0 |
| Overview rows for moved exports: `isMismatch`, `SeedSlot`, `SeededQuestion`, `makeSeededQuestion` moved HydrationEngine.ts to SeededQuestion.ts, none has an overview row (package-private) | exit 0 |
| Citations of milestone files resolve (26 checked) | exit 0 |
| `node scripts/spec-revise.mjs --check` and `pnpm spec:verify:strict` (21 PASS, 0 FAIL) | exit 0 |
| `pnpm check:pr < /dev/null` on the committed tree, 16 of 17 steps (mutation skipped by design), 280 seconds | exit 0 |
| `pnpm example` alone: 30 passed (38.9 s test time, 49 s wall), none failed, flaky or skipped | exit 0 |
| Release check: branch `arch-wave-9`, no tag after `637c0601`, no release commit, no version or CHANGELOG change, every changeset of `637c0601`, the phase base and the phase's own present, nothing forbidden committed, nothing staged, tree clean outside `.planning/`, `.agents/`, `.codex/` | exit 0 |

The `git status` after `check:pr` showed only `.planning/config.json`, `.agents/`, `.codex/`, `.planning/state.json` (intentionally uncommitted); the gates changed no tracked file.

## Deviations from Plan

**1. [Plan-verify defect] Precondition counts `docs(42-04):` commits by subject prefix**
- **Found during:** Task 1 precondition
- **Issue:** the precondition `grep -c "^docs(42-04):" = 3` reads 5, because the plan's own SUMMARY and state-progress commits also carry that prefix (the known 42-02 defect). The three content commits it guards (the comment commit, the ADR/records commit and the traceability/changeset commit) exist, as the order check proves.
- **Fix:** checked the fact the precondition guards directly (the other three conjuncts hold: changeset file present, no `(42-05` commit before this plan, no uncommitted file in packages, spec, scripts, AGENTS.md, .changeset, examples, features, apps); history not edited.
- **Files modified:** none.

**Total deviations:** 1 (plan-verify defect). **Impact:** none; no finding, no closing test, no source edit in this plan.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 42-mutation-after.json and 42-milestone-mutation.json exist; `9b124150` is an ancestor of HEAD; Task 1's seven checks, Task 2's comparison and commit check, and Task 3's sweep, merge gate, example and release check all exit 0.
