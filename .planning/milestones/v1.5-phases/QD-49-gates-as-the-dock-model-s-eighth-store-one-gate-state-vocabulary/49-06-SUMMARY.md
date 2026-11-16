---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
plan: 06
subsystem: devtools
tags: [gate-registry, surface, overview, lifetime, activity, strictmode, arch-96]
phase_base: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_before: 1dfa5101eab6ed61b1f451d3cc839e86018da9ae
plan_head_after: d0413f0ee9f3fbb796673f51088bba72595b98be
commits: 3
requires: [49-05]
provides:
  - "GateRegistryLike on the @qadi/devtools root entry, pinned and named by the overview"
  - "the dock's registry subscription lifetime pinned across Activity, StrictMode, a swap and an unmount"
  - "the cross-package fit of react's atoms.gates into GateRegistryLike, compiled and run in the example"
affects: [49-07, 49-08, 49-09]
key-files:
  modified:
    - packages/devtools/src/index.ts
    - packages/devtools/test/surface.tst.ts
    - spec/overview.md
    - spec/README.md
    - packages/devtools/test/react/DevtoolsDock.test.tsx
    - examples/nextjs-newsroom/test/dock-wiring.test.tsx
key-decisions:
  - "GateRegistryLike joins GateInstanceLike on the root entry only; joinQuestions, the views and the snapshot stay model-private"
metrics:
  tasks: 3
  files: 6
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
status: complete
---

# Phase QD-49 Plan 06: GateRegistryLike public, its lifetime and fit pinned Summary

`GateRegistryLike` is now a type export of `@qadi/devtools`' root entry, pinned by `surface.tst.ts` and named by the overview; the dock's registry subscription is shown to follow its scope through Activity, StrictMode, a swap and an unmount; and the example proves react's `atoms.gates` is what the dock's prop takes.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `4442d7a5` | `feat(49-06)`: GateRegistryLike, the shape the dock's gates prop takes, is public |
| 2 | `7b25eccc` | `test(49-06)`: the dock's gate registry subscription lives as long as its scope |
| 3 | `d0413f0e` | `test(49-06)`: the example hands the dock the provider's registry as it is |

## Note on test ordering

The Task 2 and Task 3 cases pin behaviour 49-05 shipped. They were written after it and passed at once; the base had no registry subscription in devtools to pin, and the RED commits that preceded the source changes are 49-04's and 49-05's.

## Listener counts observed

Counted by `makeGateRegistryDouble`'s `listeners()` after `act`:

| Case | Observed |
|------|----------|
| visible under `<Activity>` | 1 |
| hidden | 0 |
| shown again (a guard added while hidden) | 1, and the React tab lists both guards |
| `<StrictMode>` after mount | 1 |
| swap A to B | A 0, B 1, B's two guards listed at once |
| unmounted | 0 |
| no `gates` prop | 0 `subscribe` calls; `qadi-gates-absent` holds "atoms.gates, from @qadi/react"; no `qadi-pick` |

## What was built

- Barrel: `GateRegistryLike` added to the `model/Gates.ts` type export line; nothing else from that module crossed (`joinQuestions`, the views, the snapshot, `gateGroups`).
- `surface.tst.ts`: `GateRegistryLike` in the alphabetical type list; a `test` pinning the two-method shape by hand; a `joinQuestions` refusal beside `gateGroups`.
- `spec/overview.md` Rev 1.119: a `GateRegistryLike` row; the `useDevtoolsFeed` row says `gates` is the provider's effective registry the dock subscribes to; the `DevtoolsDock` row says `gates` takes a `GateRegistryLike`. `spec/README.md` Rev 1.219: the CCR-QD-440 cell extended.
- `DevtoolsDock.test.tsx`: one `describe` with five cases (appended; no existing line removed).
- `dock-wiring.test.tsx`: `const registryFits: GateRegistryLike = atoms.gates` (type imported from `@qadi/devtools`) and a case asserting the feed's `gates` is `atoms.gates` by identity. No example source changed.

## Verification

- `tstyche surface.tst.ts` 2 passed; `vitest --project devtools surface.test.ts` 2 passed; `pnpm spec:api` (932 exports documented); `spec-revise --check` clean; `pnpm spec:verify` 21 pass, 0 fail; `pnpm lint` (house-style: 532 files clean).
- `vitest --project devtools DevtoolsDock.test.tsx`: 68 passed.
- `tsc -b tsconfig.build.json`, example `typecheck` clean; example tests 43 passed (7 files).
- `pnpm check:pr < /dev/null`: **exit 0**, 16 of 17 steps (mutation skipped on a PR, by design).
- No budget, manifest or lockfile touched; devtools takes no `@qadi/react` dependency.

## Deviations from Plan

None - plan executed exactly as written. The "no `gates`" case asserts on a double that is never handed to the dock (`subscriptions()` 0), which is weak by construction; the sentence and the missing pick button are the substantive assertions.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: commits `4442d7a5`, `7b25eccc`, `d0413f0e` are ancestors of HEAD
- FOUND: all six files listed in key-files exist and are committed
