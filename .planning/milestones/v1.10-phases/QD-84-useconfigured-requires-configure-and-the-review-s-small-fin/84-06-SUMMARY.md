---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 06
subsystem: devtools
tags: [useConfigured, type-test, constraint]
requires: ["84-05"]
provides:
  - "Configurable<I> and useConfigured(make, inputs): the value's own configure is the rule, no adapter"
  - "useConfigured.tst.ts: the constraint's positive pins, the hooks' return types and the one refusal"
  - "surface.tst.ts: Configurable refused from the root and the React entry"
affects: [84-07]
key-files:
  created:
    - packages/devtools/test/react/useConfigured.tst.ts
  modified:
    - packages/devtools/src/react/useConfigured.ts
    - packages/devtools/src/react/useDockModel.ts
    - packages/devtools/src/react/useTimeline.ts
    - packages/devtools/src/react/useDiagnostics.ts
    - packages/devtools/test/react/useConfigured.test.tsx
    - packages/devtools/test/surface.tst.ts
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md
status: complete
completed: 2026-11-25
commits: 2
plan_head_before: af5097fb
plan_head_after: 1b2ad05a
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
requirements-completed: []
---

# Phase QD-84 Plan 06: useConfigured takes a value that has configure Summary

`useConfigured<A extends Configurable<I>, I>(make, inputs)` replaces the three-argument form; `configureDock`,
`configureTimeline` and `configureDiagnostics` are deleted and the three hooks call it with no type argument. The type
test pins the constraint from both sides and `Configurable` stays out of both barrels.

## What was built

- `Configurable<I>` (`readonly configure: (inputs: I) => void`) declared once in `useConfigured.ts`; both `configure`
  calls (the tap on the scoped build, the layout effect keyed `[value, inputs]`) are where they were.
- `useConfigured.test.tsx`: the harness call is `useConfigured(make, inputs)`, the one declared edit; U1 to U4 green.
- `useConfigured.tst.ts`: three tests (assignability over each value's inputs, hook return types, one
  `@ts-expect-error Property 'configure' is missing in type` with its accepted twin). No callable or constructable pin.
- `surface.tst.ts`: two `no exported member` refusals for `Configurable`, root and React entry.

## Seen failing (84-RED-EVIDENCE.md)

- `configure-returns`: the assignability test, `Type 'DockModel' is not assignable to type 'Configurable<DockModelInputs>'`.
- `widened-return`: the return-type test, `'DockModel | null | undefined' is not the same as type 'DockModel | undefined'`.
- `loosened-constraint` (`<A, I>`): the refusal test, `Unused '@ts-expect-error' directive. ts(2578)`.
- Barrel export of `Configurable` in either index: `Unused '@ts-expect-error' directive. ts(2578)` in `surface.tst.ts`.

## Checks

Nine consumer test files green (56 tests); `pnpm typecheck` clean; `pnpm test:tstyche` both passes, 78 files, which
`run-tstyche` verifies against `--listFiles`; house-style reads 78 type-test files, `AGENTS.md` and
`check-house-style.mjs` equal `phase_base`; `no-adapter`, `seen-failing`, `scan-ids`, `scan-forbidden`, `commit`,
`trailers` pass; `84-pinned-check.mjs`: `useConfigured.test.tsx ... 1 of 1 edits applied`, `2 of 8 refusals added`.

## Commits

- 7f3a9c68: refactor(84-06): useConfigured takes a value that has configure
- 1b2ad05a: test(84-06): pin the configurable constraint and refuse it from both entries

## Deviations from Plan

- The task 1 verify's tree-clean and `commit` steps ran after the commit; the tests, typecheck, `no-adapter`, pinned
  check and scans ran before it. Same for task 2's `commit`, `trailers` and clean-tree checks.
- The accepted twin uses a `declare const configurable: { x: number; configure: (inputs: number) => void }` instead of an
  inline `(_: number) => {}`, which oxlint flagged as an unused parameter; the refused call is unchanged, so the twin
  still differs only in having `configure`. The `loosened-constraint` edit was seen failing again on the final file.
- The fragment `Property 'configure' is missing in type` matched as planned.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `useConfigured.tst.ts`, 7f3a9c68 and 1b2ad05a on `arch-wave-15` with the one trailer; scratch edits restored (`git diff --quiet HEAD -- packages/devtools/src`).
