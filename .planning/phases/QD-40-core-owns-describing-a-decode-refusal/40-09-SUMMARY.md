---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 09
subsystem: phase-close-out
tags: [decode-refusal, mutation, merge-gate, release-check]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_before: a1f882dfd564a73d4aee9c893a0346cb3996c7b7
plan_head_after: 7c5dabbc
requires: [40-08]
provides:
  - "40-mutation-after.json: the four measured files' scores, none below its base"
  - "the phase's gate-integrity, forbidden-construct, scope, vocabulary and id checks run over the whole phase"
  - "pnpm spec:website-examples, pnpm example and pnpm check:pr < /dev/null green on the final committed tree; nothing released"
affects: []
requirements-completed: [WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07]
actuals:
  tokens: 1000
  tasks: 3
  commits: 1
duration: ~10 min
completed: 2026-11-14
status: complete
commits: 1
---

# Phase 40 Plan 09: Phase close-out Summary

The phase's claims were checked, not asserted: no judging file changed beyond the budgeted lines, no forbidden construct entered, no measured file's mutation score fell (SinkWire.ts stays at exactly 1 with 60 scored mutants all killed), the merge gate is green with stdin closed, and nothing was released.

## Commits

- `7c5dabbc` chore(40-09): mutation result for the decode refusal and the single decode (`40-mutation-after.json` alone). No fix commit was needed: no source or test file changed in this plan.

## Task 1: gate integrity, scan, order, scope, vocabulary, ids

Each automated block of the plan was run from the repository root.

| Check | Exit | Notes |
| ----- | ---- | ----- |
| 1. judging files vs base, house-style and AGENTS.md allowlist, token regex | 0 | |
| 2. forbidden constructs, suppressions, `Schema.is`, `Schema.encodeTo` | 0 | |
| 3. commit order, shapes, trailers | 1 on trailers only | see Deviation 1; every order, shape, file-set and `BREAKING CHANGE:` finding passed; `no chore(40-09) mutation result` cleared once Task 2 committed; re-run after Task 2 reports nothing but the nine trailer pairs |
| 4. scope, characterisation, leftover words, records, plan/decision ids | 1 on three plan-verify defects | see Deviation 2; scope, characterisation (audit differential, 40-02 Malformed table), records and every other word passed |
| 5. ids: only reserved numbers new, unused ones only in CCR rows | 0 | |
| 6. `pnpm spec:api && pnpm circular` | 0 | no cycle (220 files), api surface agrees |

## Task 2: mutation result

Three invocations, one at a time, each exit 0 with a fresh report, run with the plan's writer changed only so a file with no entry in the report defaults to an empty mutant list (the same change 40-01 recorded for SinkWire.ts; here SinkWire.ts now has an entry). Comparison exit 0.

| File | Base | After | Detected/scored | Ignored |
| ---- | ---- | ----- | --------------- | ------- |
| packages/core/src/SinkCodec.ts | 0.9751552795031055 | 0.9754601226993865 | 159/163 | 38 |
| packages/core/src/SinkWire.ts | 1 | 1 | 60/60 | 13 |
| packages/devtools/src/model/Source.ts | 1 | 1 | 66/66 | 4 |
| packages/audit/src/AuditEntry.ts | 0.9130434782608695 | 1 | 19/19 | 8 |

Survivors, after: SinkCodec.ts 326:10 EqualityOperator, 328:9 ConditionalExpression, 391:7 ConditionalExpression, 395:7 ConditionalExpression (the same four the base listed; the count scored rose by two, both killed). Base survivors: SinkCodec.ts the same four; AuditEntry.ts 162:57 ObjectLiteral and 207:7 ConditionalExpression, both in code the phase deleted. SinkWire.ts and Source.ts: none. No drop, so nothing was closed; `40-mutation-base.json` is in one commit and untouched.

## Task 3: merge gate and release check

| Run | Exit | Duration |
| --- | ---- | -------- |
| `pnpm spec:website-examples` (59 blocks compile) | 0 | 1 s |
| `pnpm example` (30 Playwright tests passed) | 0 | 12 s |
| `pnpm check:pr < /dev/null` (16 of 17 steps; mutation skipped by design) | 0 | 106 s |
| release check (branch `arch-wave-9`, no tag contains the base, no release commit, no version/CHANGELOG change, all base changesets and the three new ones present, no forbidden path committed, nothing staged, tree clean outside `.planning/`, `.agents/`, `.codex/`) | 0 | |

## Deviations from Plan

**1. [Plan-verify defect / attribution] The commit-order check's trailer test fails for nine commits**
- **Found during:** Task 1, check 3
- **Issue:** the check requires every plan commit to end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and to never name Sonnet. Commits 53628f75 (feat 40-05), 6ce8f60f, a781a2ee, fe561cf0, 398195d3, 2e8947f1, 4e971679, 12a9cd6b and 82bb49a1 end with the Sonnet 5.5 line, as the 40-05 to 40-08 SUMMARYs recorded. This executor is Sonnet 5.5, so the Opus line would misstate the author; 40-09's own commit uses the Sonnet line too.
- **Fix:** none; history is not rewritten (plan prohibition). Every other part of check 3 (order, shapes, file sets, `BREAKING CHANGE:` on feat(40-05), the tail rule) passes. If a uniform trailer matters, amend the ten commits before anything is pushed.

**2. [Plan-verify defect] Check 4's vocabulary scan matches three lines this phase owns as negative pins or pre-existing text**
- **Found during:** Task 1, check 4
- **Issue:** (a) `packages/devtools/test/model/Source.test.ts:555` and `:580` are `assert.isUndefined(annotationOf(…, "qadi.reason"))`, the 40-05 assertion that the removed annotation is absent; (b) `packages/devtools/test/surface.tst.ts:116` is `// @ts-expect-error no exported member` over `export type { MalformedReason }`, the surface pin that the removed export stays removed; (c) `added words name a plan or decision id: D-01` is text already on the `spec/README.md` change-history line (`ARCH-53 ... D-01 approved`), which counts as a diff line only because the line changed.
- **Fix:** none; these are the removal's own pins and old history, not current statements of the old vocabulary. Not edited.

**Total deviations:** 2 plan-verify defects, 0 auto-fixes. **Impact:** none on content; the findings are the checks' own over-matching and an attribution choice.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-40-20: only allowlisted house-style and AGENTS.md lines changed, token regex pinned. T-40-21: base JSON in one commit, reports fresh, no suppression. T-40-22: no tag, release commit, version change or consumed changeset. T-40-SC: no manifest or lockfile change.

## Self-Check: PASSED

- `40-mutation-after.json` exists and commit `7c5dabbc` is an ancestor of HEAD.
- Checks 1, 2, 5, 6, the mutation comparison, `pnpm spec:website-examples`, `pnpm example`, `pnpm check:pr < /dev/null` and the release check exit 0; checks 3 and 4 exit 1 only on the two plan-verify defects above.
