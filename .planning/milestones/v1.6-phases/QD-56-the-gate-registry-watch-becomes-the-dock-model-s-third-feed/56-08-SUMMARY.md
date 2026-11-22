---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 08
subsystem: react
tags: [devtools-feed, questions, diagnostics, gfed-05, breaking]
requires: ["56-07"]
provides:
  - useDevtoolsFeed returning { gates, onInvalidate, questions, diagnostics }, with questions (atoms.asked) at the top level
  - DevtoolsDiagnosticsFeed reduced to the layer; FeedOwnedKey as the closed union "layer" | "questions"
  - tstyche pins for feed.questions, the lack of it on diagnostics, and the two refused extra keys
  - the newsroom example's prose naming ten dock fields and the feed's questions beside gates
affects: [56-09, 56-10, 56-11, 56-12, 56-13]
actuals:
  tokens: 4500
  tasks: 2
  commits: 3
plan_head_before: 2a883fbc996b4da7e190c81c3f41b77532f534d7
plan_head_after: 39f33df5503ef8936d0f223767aaeef6f712c339
tech-stack:
  added: []
  patterns: ["a feed whose shape follows the dock's props, with the refused extra keys a closed union rather than keyof"]
key-files:
  created: []
  modified:
    - packages/react/src/DevtoolsFeed.ts
    - packages/react/test/DevtoolsFeed.test.tsx
    - packages/react/test/DevtoolsFeed.tst.ts
    - examples/nextjs-newsroom/src/client/Dock.tsx
    - examples/nextjs-newsroom/README.md
key-decisions:
  - "FeedOwnedKey is written as the closed union of the two names, not keyof DevtoolsDiagnosticsFeed, so useDevtoolsFeed({ questions }) stays a compile error after questions leaves diagnostics (T-56-13)"
requirements-completed: [GFED-05, WX-04, WX-06]
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 08: The feed hands questions beside gates

`useDevtoolsFeed` now returns `questions` (`atoms.asked`) at the top level and `diagnostics` holds the layer only, so `<DevtoolsDock {...feed} />` hands the dock's `questions` prop what the provider was asked instead of silently listing nothing.

## RED

Run after the `test(56-08)` edits and before the source change:

- `pnpm exec vitest run --project react packages/react/test/DevtoolsFeed.test.tsx`: 11 cases, 1 failing, 10 passing. The failure was `questions is atoms.asked, beside gates, and lists what a guard asked`: `expected undefined to be [Function asked]` at `feed.questions`.
- `pnpm test:tstyche`: 1 target failed, 2 assertions failed (326 tests, 325 passing): `extra keeps its types on diagnostics, next to the layer the feed owns` (`feed.diagnostics` still had `questions`, and `feed.questions` did not exist).

## Task Commits

1. Task 1 RED: `3b701f32` `test(56-08): the devtools feed hands questions beside gates, written RED`, the two test files.
2. Task 1 GREEN: `b22d0e39` `feat(56-08)!: useDevtoolsFeed returns questions beside gates, and diagnostics holds the layer`, `DevtoolsFeed.ts` alone.
3. Task 2: `39f33df5` `docs(56-08): the newsroom dock's prose names questions beside gates`, `Dock.tsx` (comment lines only) and the README row.

## Results

- React project: 518 tests passed (518), nothing excluded. `pnpm typecheck` clean, `pnpm lint` clean (`house-style: 555 file(s) clean`), `pnpm test:tstyche` 62 files, 326 tests, 685 assertions passed.
- Example: `pnpm --filter @qadi/example-nextjs typecheck` clean; its unit tests 7 files, 43 tests passed. `pnpm example` (Next build and Playwright) not run here, per the plan's flagged assumption; 56-13's `check:pr` runs it.
- `@qadi/react` has no dependency on `@qadi/devtools`; no export was added or removed.
- The `as` scan over the three edited react files found only prose "as a ..." in comments (no construct).
- Plan verify scripts: both node checks printed their success lines. The plan's `Dock.tsx` check confirmed only comment lines changed. The orchestrator's two known-broken patterns did not apply (no `packages/*/src` pathspec diff; the `as` scan was applied by hand with import lines excluded).

## Deviations from Plan

None - plan executed exactly as written. One cosmetic addition: the `FeedOwnedKey` doc comment was extended to say why `questions` is refused in `extra`.

## Known Stubs

None.

## Threat Flags

None. T-56-13 mitigated: `FeedOwnedKey` is `"layer" | "questions"` and the tstyche pin `useDevtoolsFeed` not callable with `{ questions }` holds.

## Self-Check: PASSED

All five modified files exist; `3b701f32`, `b22d0e39` and `39f33df5` are ancestors of HEAD; the example check, react project, typecheck, lint and tstyche all exit 0.
