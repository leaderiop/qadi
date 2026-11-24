---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 05
subsystem: devtools-feed-test-migration
tags: [configure, bare-build, built-feeds, pinned-tests, devtools]
requires: ["79-04"]
provides:
  - 79-pinned-check.mjs, which holds fifteen pinned tests to their assertions by comparing each with its text at phase_base
  - the timeline, diagnostics and gates feed tests built through the built-feed helpers (bare, then configured)
affects: [79-06, 79-08, 79-12, 79-16]
key-files:
  created:
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-pinned-check.mjs
  modified:
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/model/GatesFeed.test.ts
key-decisions:
  - "The pinned check cuts a block from its `it.effect(` line (label followed by a space, colon or parenthesis) to the line before the next `  it`/`  describe` or a column-0 `});`, maps the four helpers back to their constructors on both sides, and fails on any remaining difference or on a label that opens zero or two tests"
  - "`dockModelOf` is already in the check's helper map, so it holds for 79-06's migration of M55 and M56 without a change"
  - "Imports are additive: one `builtFeeds.ts` import line per file, each constructor import kept because every file still has bare calls"
requirements-completed: []
metrics:
  duration: 15min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 5f70880bf3c4f5896c0cde542724ebb730aabb88
plan_head_after: aec70762830a4cea549ed26ac2797491dc5858cd
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
coverage:
  - deliverable: "79-pinned-check.mjs names the fifteen pinned tests, passes the tree, ends its self-test `self-test: 3 passed`, is oxlint-clean and sits alone in its commit"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-05-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
  - deliverable: "the three feed test files hold no construction with an argument; every changed line is an import or names a constructor or helper; the pinned check passes; the files are green on the unchanged source"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-05-PLAN.md (exit 0); pnpm exec vitest run --project devtools on the three files (3 files, 102 tests passed); pnpm typecheck (exit 0)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 05: The feed tests built bare and configured, on the base

**The timeline, diagnostics and gates feed tests build every feed that took inputs through `timelineFeedOf`, `diagnosticsFeedOf` and `gatesFeedOf`, and `79-pinned-check.mjs` shows the fifteen pinned tests changed by construction lines only.**

## Accomplishments

- `79-pinned-check.mjs` (commit 927d7776): `PINNED` names TF4, TF14, TF26, TF27, TF29, TF30 to TF36 (`TimelineFeed.test.ts`), G43 (`GatesFeed.test.ts`) and M55, M56 (`DockModel.test.ts`); `judge` compares a block as checked out with the block at `phase_base` after mapping helpers back to constructors. `--self-test` judges a construction-only move (passes), an edited assertion (fails, naming `TF4`) and a missing test (fails). Run on the tree it prints `pinned: 15 tests hold their assertions`.
- The three migrated files (commit aec70762): 30 constructions with an argument in `TimelineFeed.test.ts`, 28 in `DiagnosticsFeed.test.ts` and 35 in `GatesFeed.test.ts` became the same call through the helper, argument text unchanged. Bare calls stay bare. The diff is 96 insertions and 93 deletions: the 93 construction lines plus three import lines added.
- The three files and `pnpm typecheck` pass on the unchanged source: a bare build followed by `configure(i)` reaches what `make...(i)` reached over every case those suites hold, with no migrated test failing, so no difference between build inputs and a first configure was found here.

## Deviations from Plan

None. `pnpm exec oxlint packages/devtools/test` reports two pre-existing `prefer-as-const` warnings in `HeldChoice.test.ts` (a file this plan does not touch) and exits 0.

## Known Stubs

None.

## Self-Check: PASSED

- `79-pinned-check.mjs`, the three test files and this summary exist.
- Commits 927d7776 and aec70762 are on `arch-wave-14`, each with the one trailer; `packages/devtools/src` is unchanged from `phase_base`.
