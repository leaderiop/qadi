---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 06
subsystem: devtools-dock-test-migration
tags: [configure, bare-build, built-feeds, pinned-tests, devtools, dock-model]
requires: ["79-05"]
provides:
  - the dock model tests and its characterisation built through dockModelOf (bare, then configured)
  - the migrated base's failing set, the starting line of the source change
affects: [79-09, 79-12, 79-16]
key-files:
  modified:
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/model/DockModel.characterisation.test.ts
key-decisions:
  - "Same method as the feed tests: argument text unchanged, one added `../builtFeeds.ts` import, bare calls stay bare; M55 and M56 move by construction lines only"
  - "DockModel.test.ts keeps its `makeDockModel` import for its 21 bare calls; the characterisation has no bare call, so its `makeDockModel` import is replaced by the helper import"
  - "Hand-wrapped argument lines are left as they were: the helper name is two characters shorter, argument text is byte-identical"
requirements-completed: []
metrics:
  duration: 8min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: c34d2aa113782990de3171bc51a9f7d61ee3ca80
plan_head_after: 388301191714d83b3583725a8bc2585374539d74
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
coverage:
  - deliverable: "no `makeDockModel(` with an argument is left; 58 helper calls in DockModel.test.ts and 15 in the characterisation; the 21 bare calls stay; every changed line is an import or a construction; M55 and M56 pass the pinned check; both files green on the unchanged source"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-06-PLAN.md (exit 0); 79-pinned-check.mjs printed `pinned: 15 tests hold their assertions`; pnpm exec vitest run --project devtools on the two files (2 files, 78 tests passed); pnpm typecheck and oxlint on packages/devtools/test (exit 0)"
        status: pass
    human_judgment: false
  - deliverable: "the whole devtools project on the migrated base fails exactly CR11, CR12, CR16 and CR17; one commit holds exactly the two files with the one trailer"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-06-PLAN.md; JSON reporter run of the whole devtools project"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 06: The dock model tests built bare and configured, on the base

**The dock model tests and its characterisation build every dock that took inputs through `dockModelOf`, with every assertion, title and comment where it was, and the migrated base fails exactly the four RED cells.**

migrated base failing: CR11, CR12, CR16, CR17

The whole devtools project, run alone with the JSON reporter on the migrated base: 1852 tests, 1848 passed, 4 failed (CR11, CR12, CR16, CR17), none skipped or otherwise.

## Accomplishments

- Commit 38830119: 58 constructions with an argument in `DockModel.test.ts` and 15 in `DockModel.characterisation.test.ts` became the same call through `dockModelOf`, argument text unchanged. The 21 bare `makeDockModel()` calls in `DockModel.test.ts` stay bare. The diff is 75 insertions and 74 deletions: the 73 construction lines, one added import in `DockModel.test.ts`, and in the characterisation one import swapped for another.
- `79-pinned-check.mjs` prints `pinned: 15 tests hold their assertions`, so M55 and M56 moved by construction lines only.
- Both files and `pnpm typecheck` pass on the unchanged source, and `oxlint` is clean on `packages/devtools/test`: a bare dock configured with `i` reaches what `makeDockModel(i)` reached over every dock case, with no migrated test failing. No difference between build inputs and a first configure was found over the dock suites.
- No source file changed (`git diff phase_base -- packages/devtools/src` is empty).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next

79-07 starts the source change from the four RED cells above.

## Self-Check: PASSED

- `packages/devtools/test/model/DockModel.test.ts` and `DockModel.characterisation.test.ts` exist and contain `dockModelOf(`.
- Commit 38830119 is an ancestor of HEAD and holds exactly the two files with one trailer.
