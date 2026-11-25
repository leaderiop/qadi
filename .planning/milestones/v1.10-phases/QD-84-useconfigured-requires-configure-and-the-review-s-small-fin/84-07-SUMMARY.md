---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 07
subsystem: devtools
tags: [lens-session, external-store, ordering]
requires: ["84-06"]
provides:
  - "LensSession publishing every command through the store's set; move deleted"
  - "the arm-before-publish pin seen failing over set"
affects: [84-08]
key-files:
  modified:
    - packages/devtools/src/model/LensSession.ts
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md
status: complete
completed: 2026-11-25
commits: 2
plan_head_before: 77252970
plan_head_after: 452d89c2
actuals:
  tokens: 3000
  tasks: 2
  commits: 2
requirements-completed: []
---

# Phase QD-84 Plan 07: the lens session publishes through the store's set Summary

`move` is deleted: `toggle`, `hover`, `cancel` and `highlight` call `store.set(...)`, and `choose` keeps its early return,
its arming (with its comment) and `return true`, changing only `store.publish(next)` to `store.set(next)`. The module doc
now says every command publishes through the store's `set`.

## Seen failing (84-RED-EVIDENCE.md)

- `arm-after-set`: with `armed = pickedOf(next)` and `store.set(next)` swapped in `choose`, `a listener told of a pick can
  take its reveal` fails at `test/model/LensSession.test.ts:313:12`, `AssertionError: expected [ false ] to deeply equal
  [ true ]`. Reverted with `cp`; tree clean.

## Checks

Ten consumer test files green (163 tests); `pnpm typecheck` clean; `no-restated-set` prints its pass line;
`84-pinned-check.mjs` passes (16 held files, `LensSession.test.ts` unedited); `scan-ids`, `scan-forbidden`, `commit`
and `trailers` pass.

## Commits

- 7a357e93: refactor(84-07): the lens session publishes through the store's set
- 452d89c2: docs(84-07): the arm-before-publish pin seen failing over set

## Deviations from Plan

- The task 1 and task 2 verifies' clean-tree and `commit` steps ran after the commit; the tests, typecheck,
  `no-restated-set`, pinned check and scans ran before it. `84-check.mjs commit` judges an existing commit, so the
  commits were made with `git add <path>` and `git commit` and then checked.

## Known Stubs

None.
