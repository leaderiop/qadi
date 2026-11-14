---
phase: QD-38-the-sink-wire-version-stated-once
plan: 04
subsystem: sink-wire
tags: [phase-close, gate-integrity, mutation-compare, check-pr]
requires: [38-03]
provides:
  - "38-mutation-after.json: SinkCodec.ts 0.9752, SinkWire.ts 1, both at or above base"
  - "two boundary tests pinning the depth bound at exactly MAX_DECODE_DEPTH"
  - "pnpm check:pr exit 0 on the final committed tree"
affects: []
tech-stack:
  added: []
  patterns: ["a conversion that removes killed mutants lowers a ratio score; close the drop with a boundary test, never a re-baseline"]
key-files:
  created:
    - .planning/phases/QD-38-the-sink-wire-version-stated-once/38-mutation-after.json
  modified:
    - packages/core/test/SinkCodec.test.ts
decisions:
  - "The mutation drop was a denominator effect (three killed mutants removed by the conversion, the same six survivors), closed by a test that kills one more survivor, not by touching the baseline"
metrics:
  duration: ~25 minutes
  completed: 2026-11-14
status: complete
commits: 2
plan_head_before: 84bb549f7e0c5bed47d545062ae06fa03927d346
plan_head_after: 7f74dbef49768b653762a341b7363fddd18ed017
actuals:
  tokens: 1200
  tasks: 3
  commits: 2
requirements-completed: [WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07, WIRE-01, WIRE-05]
---

# Phase 38 Plan 04: The sink wire version stated once, the close Summary

The phase holds against the base and the gates: the version is written once in code, no judging file moved, the one mutation drop was closed with a boundary test, and `pnpm check:pr < /dev/null` exits 0 on the final committed tree.

## Task 1: gate integrity, scan, order, scope, greps

Run from `phase_base` `b1e8ecbf8a10c34830ae84e9c464aaa6cc6b61d3`, first on the tree after 38-03, then again after the `test(38-04)` commit. Every exit status:

| Check | Exit |
|---|---|
| 1 judging files and AGENTS.md unchanged since the base | 0 |
| 2 added-line forbidden-construct scan, suppressions, budget file | 0 |
| 3 commit order (chore(38-01), test(38-01) first and alone; refactor(38-02) carries the two source files; test(38-02) is SinkWire.tst.ts alone; no core test between) | 0 |
| 4 packages diff within the four planned files, SinkCodec.test.ts only gaining lines, hydration and audit versions, both retype-to-3 records | 1 as written, 0 with the defect below isolated |
| 5 version written once (`export const WIRE_VERSION = 2 as const;` is the only code hit; the codec derives from it) | 0 |
| 6 reserved ids only; BEH-QD-526..530 and INV-QD-321..322 only in the CCR row | 0 |
| 7 `pnpm spec:api && pnpm circular` | 0 |

## Task 2: mutation

Invocation (identical to 38-01): `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/SinkCodec.ts,packages/core/src/SinkWire.ts'`, run alone, exit 0.

| File | Base | After | Detected/scored |
|---|---|---|---|
| packages/core/src/SinkCodec.ts | 0.9634146341463414 (158/164) | 0.9751552795031055 | 157/161 |
| packages/core/src/SinkWire.ts | 1 (0/0) | 1 | 0/0 |

First run, before any change: SinkCodec.ts 0.9627329192546584 (155/161), a DROP against 0.9634. Cause: the conversion removed three killed mutants (the `===` comparison and the `some` read it replaced) and left the same six survivors, so the ratio fell while nothing the base killed survived. Closed under the prohibition, by a test, not a baseline: two cases appended to `SinkCodec.test.ts` (commit `72d4a0e2`), a policy and a trace exactly `MAX_DECODE_DEPTH` deep, each passing the pre-check and refused by the final walk deeper than the pre-check's own path. They kill the `frame.depth >= maxDepth` (trace) and `depth.success >= MAX_DECODE_DEPTH` (policy) boundary mutants.

Survivors, base (six): 327:10 EqualityOperator, 329:9 ConditionalExpression, 330:9 EqualityOperator, 353:11 EqualityOperator, 392:7 ConditionalExpression, 396:7 ConditionalExpression.
Survivors, after (four): 326:10 EqualityOperator (`stack.length >= 0`), 328:9 ConditionalExpression (`frame === undefined` to false), 391:7 ConditionalExpression, 395:7 ConditionalExpression (the `before` and `encoded` failure branches). Lines are one lower than the base, as the removed private constant and import shifted them; none is a version expression.

The baseline `38-mutation-base.json` is in exactly one commit (`cf854f3a`) and untouched. `38-mutation-after.json` is a flat path-to-score map, committed alone as `7f74dbef`. After the `test(38-04)` commit the Stryker run, this comparison and Task 1's checks were re-run: all exit 0.

## Task 3: the merge gate

- `pnpm check:pr < /dev/null` ran on commit `7f74dbef49768b653762a341b7363fddd18ed017`, the final committed tree (only the four intentionally uncommitted paths dirty).
- Exit 0, 16 of 17 steps (`pnpm mutation` skipped by design; Task 2 ran it directly), 118 seconds. Log: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bea2edc6-796f-4f45-9f14-5cbd1f92cfb8/scratchpad/checkpr38-04.log`.
- Coverage, core/src: statements 99.4, branches 98.08, functions 99.43, lines 99.84 (95 required). SinkCodec.ts 97.91 / 94.64 / 100 / 100. Whole repo: 99.49 / 98.05 / 99.3 / 99.75.
- SinkWire.tst.ts passed in the tstyche step.
- Constraint check: exit 0. 38-04's commits touched only SinkCodec.test.ts and planning records and removed no test line; both changesets (`superseding-run.md`, `sink-wire-version-stated-once.md`) are present; no version-packages commit or tag since the base; no tool-managed file staged or committed; every phase commit that touches more than records ends with the Co-Authored-By trailer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Mutation drop] SinkCodec.ts 0.9627 under its 0.9634 base**
- **Found during:** Task 2
- **Issue:** see the mutation section; a denominator effect of the conversion, not a lost kill.
- **Fix:** two appended boundary tests, `test(38-04)`; no config, threshold or baseline change.
- **Files modified:** packages/core/test/SinkCodec.test.ts (12 added lines, none removed)
- **Commit:** `72d4a0e2`

**2. [Verify defect] Task 1 check 4's id regex over `spec/README.md`**
- **Found during:** Task 1
- **Issue:** `/\bD-\d{2}\b(?!-[a-z])|\b38-0\d\b/` run over `git diff -U0` flags the whole Change History line of `spec/README.md` (the 38-03 rows are prepended to one very long existing line) because that line's untouched tail already says "D-01 approved" (CCR-QD-392).- **Fix:** none to the spec. Re-run with `git diff --word-diff=porcelain -U0` so only genuinely added words are scanned: exit 0, and a direct grep of the added words for a plan or decision id finds nothing.
- **Files modified:** none.

**Total deviations:** 1 auto-fixed (mutation drop closed by a test), 1 plan-verify defect recorded. **Impact:** none on scope; no source, spec or config change.

## Known Stubs

None.

## Threat Flags

None.

## Commits

- `72d4a0e2` test(38-04): pin the depth bound at exactly MAX_DECODE_DEPTH for a policy and a trace
- `7f74dbef` chore(38-04): mutation result for the sink wire version

## Self-Check: PASSED

- 38-mutation-after.json and SinkCodec.test.ts changes exist; commits `72d4a0e2` and `7f74dbef` are ancestors of HEAD; `git rev-list --count 84bb549f..HEAD` was 2 before this SUMMARY.
