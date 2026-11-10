---
phase: 13-lost-wave-gaps
plan: 13
subsystem: docs
tags: [comments, spec-text, citations, lost-wave-port]

phase_base: 0925c2f
requires: ["13-05", "13-10", "13-11"]
provides:
  - "GAP-11's doc defects other than the placeholders: `PredicatePortName`'s comment on `PredicatePortName`, BEH-QD-076's real listing, `MissingResourceId`'s scope and `HasSignature`"
  - "The seven stale test-file citations and two tense fixes from lost `4b1ed49`"
  - "BEH-QD-166, `decisionCacheLayer` and `InvalidBoundedPermits` say why a bad `capacity` is a defect and a bad `…Bounded(permits)` is typed"
  - "CCR-QD-403 extended (`spec/README.md` 1.136)"
affects: [13-12]

actuals:
  tokens: 20000
  tasks: 2
  commits: 4

key-files:
  modified:
    - packages/core/src/PortMetrics.ts
    - packages/core/src/Errors.ts
    - packages/core/src/DecisionCache.ts
    - packages/core/src/Role.ts
    - packages/devtools/src/model/Verdict.ts
    - packages/core/test/helpers.ts
    - packages/predicate-prisma/test/generators.ts
    - packages/predicate-prisma/test/CompilePrismaWhere.test.ts
    - packages/predicate-sql/test/CompileSql.test.ts
    - packages/react/test/DevtoolsFeed.test.tsx
    - packages/devtools/test/react/QuestionsPanel.test.tsx
    - spec/behaviors/10-actions.md
    - spec/behaviors/21-decision-cache.md
    - spec/README.md

requirements-completed: [GAP-11]
---

# 13-13: the remaining doc defects, comments and spec text only

`phase_base: 0925c2f`. It ran before 13-12, as the orchestrator ordered, so it is not the phase's last plan. The phase
row is now 12/13 and is not marked Complete.

## Decisions applied

There is no `checkpoint:decision` in this plan and no 13-13 row in `_DECISIONS.md`. D-57-j option A is the plan's own
choice: keep the asymmetry and document it.

## Task 1 (caac29a)

Every anchor was re-checked on the tree and every line number still matched. Every replacement target exists (`ls`).

| Defect | Before | After |
|---|---|---|
| `Role.ts` cites `` `Role.test.ts` `` | 1 | 0 (→ `RolesAndDepth.test.ts`) |
| `predicate-prisma/test/generators.ts` cites `` `Agreement.test.ts` `` | 1 | 0 (only `EngineAgreement.test.ts` left), plus the tense fix at :45 |
| `core/test/helpers.ts` cites `` `AttributeResolver.test.ts` `` | 1 | 0 |
| `DevtoolsFeed.test.tsx` cites `` `dock-wiring.test.ts` `` | 1 | 0 (→ `examples/nextjs-newsroom/test/dock-wiring.test.tsx`) |
| `QuestionsPanel.test.tsx` cites `` `GatesPanel.test.tsx` `` | 1 | 0 (→ `QuestionsPanel.gates.test.tsx`) |
| `Verdict.ts` cites `` `WhatIfTable.test.ts` `` | 1 | 0 (→ `.tsx`) |
| `CompileSql.test.ts` presents `interpretSqlFragment` as live and cites `Agreement.test.ts` | 1 | 0 ("the retired `interpretSqlFragment` (ARCH-03 T7)") |
| `CompilePrismaWhere.test.ts:235` tense | "that reader computes" | "the retired reader computed" |
| `10-actions.md` shows `Data.TaggedError("MissingAction")` | 1 | 0 (real `Schema.TaggedError` + `Schema.optional`, with a one-line comment) |
| `Errors.ts` `scope: "Resource"` | 0 | 1 |
| `PortMetrics.ts` `PredicatePortName` comment | above `servedPortCallsTotal`'s comment | moved unchanged onto `export type PredicatePortName` |

`MissingResourceId`'s comment now reads "Raised by `HasRelationship`, and by `HasActed`/`HasNotActed`/`HasSignature`
under `scope: "Resource"`". The comment originally listed `HasSignature` on its own, but `askSignature`
(`PortAccess.ts:448`) only calls `requireResourceId` under `scope === "Resource"`, so it was grouped with the scoped
nodes.

`10-actions.md` went from 1.0 to 1.1 through `spec-revise --date 2026-11-10`.

## Task 2 (1672afc)

Three hunks ported from lost `4b1ed49`:
- `decisionCacheLayer`'s comment;
- `InvalidBoundedPermits`'s comment;
- BEH-QD-166's paragraph.

The CCR citation was renumbered to CCR-QD-403 and the tracker to ARCH-61. No lost id appears in the text. The premises
were checked first: `PortDerivation.ts:81-84` still returns a typed `InvalidBoundedPermits`, and `DecisionLog.ts:203`
still throws for a bad `capacity`. `21-decision-cache.md` went from 1.6 to 1.7.

## Register (7208b4b)

The CCR-QD-403 row was extended in place, with no second row. It now lists 13-13's documents and revisions
(`10-actions.md` 1.1, `21-decision-cache.md` 1.7, README 1.135 and 1.136, and the code files) and states what was
fixed. `spec-revise` was run once on `spec/README.md` (1.135 → 1.136).

No traceability change: BEH-QD-166's requirement text is unchanged. Only its rationale paragraph grew, and behaviour
21's row (`DecisionCache.ts`, `Evaluate.ts`) is still right.

## Only comments changed

`git diff 0a40da4 -U0 -- packages` filtered to non-comment, non-blank changed lines returns nothing. The plan's own
filter over the base diff also returns nothing.

No changeset, because no package behaviour or type changed.

## Mutation (XC-05)

| File | Base | Base source | After |
|---|---|---|---|
| `DecisionCache.ts` | 91/96 = .9479 | `13-mutation-base.json` | 91/96 = .9479 |
| `Errors.ts` | 1/1 | `0925c2f` | 1/1 |
| `PortMetrics.ts` | 0/0 (no mutants) | `0925c2f` | 0/0 |
| `Role.ts` | 146/157 = .9299 | `0925c2f` | 146/157 = .9299 |
| devtools `Verdict.ts` | 14/14 | `0925c2f` | 14/14 |

How it was measured:
- Every file without a recorded base was measured at `0925c2f` in a temporary detached worktree
  (`scratchpad/qadi-base-1313`), which was then removed.
- The runs were `stryker.config.mjs --mutate` with the four core files and `stryker.devtools.mjs --mutate Verdict.ts`
  (script `scratchpad/m1313.sh`, adapted from 13-10's).

No file's score dropped.

## Gates

| Gate | Result |
|---|---|
| Task 1 verify (spec-revise --check, typecheck, lint, `ls` of targets, nine grep checks) | VERIFY-OK |
| Task 2 verify (spec-revise --check, two greps, comment-only filter, `DecisionCache.test.ts` 38/38) | pass |
| `pnpm vitest run --project core --project devtools --project react --project predicate-sql --project predicate-prisma` | 129 files, 3570 tests, pass |
| `pnpm spec:api` | 882 exports, 9 packages |
| `pnpm spec:verify` / `spec:verify:strict` | 21 pass, 0 fail, 0 skip |
| `node scripts/spec-revise.mjs --check` | green |
| `pnpm spec:examples` | 103 blocks compile |
| `pnpm spec:claims` | 8 claims |

## Deviations

1. **[Accuracy]** `HasSignature` is placed under the `scope: "Resource"` clause instead of being listed on its own;
   the code raises the error only under that scope.
2. **[Ordering]** As instructed, this ran before 13-12. ROADMAP is 12/13 and In progress, `completed_phases` is not
   bumped, and only GAP-11 is ticked.

## Ids

- Used: none new. Cited: CCR-QD-403 (already allocated by 13-10), BEH-QD-076, BEH-QD-166.
- Left free: ADR-QD-121, 122, 124, 125; BEH-QD-360..367 and 369..378; INV-QD-255, 256, 258 and 260..264.

## For 13-12

- GAP-10 is now fully met: every lost ARCH-57 item is ported or recorded, and the last two (citations, capacity docs)
  landed here. It is not ticked; it is the phase close's to tick with the rest.
- REQUIREMENTS' traceability row `GAP-01..12 | Phase 13 | Pending` is unchanged.

## Commits

| sha | subject |
|---|---|
| caac29a | docs(13-13): GAP-11 doc defects and the seven stale test-file citations |
| 1672afc | docs(13-13): why a bad capacity is a defect and a bad permits count is typed |
| 7208b4b | docs(13-13): CCR-QD-403 extended with the remaining doc defects |
