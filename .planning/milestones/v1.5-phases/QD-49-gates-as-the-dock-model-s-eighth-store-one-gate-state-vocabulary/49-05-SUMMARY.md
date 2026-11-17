---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
plan: 05
subsystem: devtools
tags: [dock-model, devtools-feed, questions-panel, gate-registry, arch-96, d-12a]
phase_base: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_before: 5e0bf15023c5b511b4111421ad02b488fd01b1f1
plan_head_after: e4faa9ed4540ffad04a61fd086ba3efe09bd19ca
commits: 3
requires: [49-04]
provides:
  - "react DevtoolsFeed.gates: GateRegistry, the provider's effective registry"
  - "devtools DevtoolsDockProps.gates: GateRegistryLike, handed to the model through useDockModel"
  - "QuestionsPanel rendering one QuestionsSnapshot read from the model's questions store"
affects: [49-06, 49-07, 49-08, 49-09]
tech-stack:
  patterns: ["hoisted Match.tagsExhaustive matchers returning a render closure over the view", "test seam builds the new input form so tests keep their expected values"]
key-files:
  modified:
    - packages/react/test/DevtoolsFeed.test.tsx
    - packages/react/src/DevtoolsFeed.ts
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/src/react/useDockModel.ts
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/test/react/gatesProp.ts
    - packages/devtools/test/react/questionsPanelInput.ts
    - packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx
    - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
key-decisions:
  - "The feed hands over the registry and no longer subscribes, so a host no longer re-renders on every guard change (D-18)"
  - "The dock's gates prop is GateRegistryLike only, with no array union (D-09)"
  - "The panel's row prop is named entry so it cannot shadow the module-scope row style (Pitfall 4)"
  - "D-12a is the only copy change, committed alone after the tracer so the tracer proves the markup unmoved"
metrics:
  tasks: 3
  files: 9
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
status: complete
---

# Phase QD-49 Plan 05: Hand the dock the registry, render the model's snapshot Summary

React's gate registry now flows from the provider through `useDevtoolsFeed().gates`, the dock's `gates` prop and the model's eighth store to `QuestionsPanel`, which renders one `QuestionsSnapshot` and whose markup did not move: the twelve-cell characterisation and the three panel tests passed unchanged through the tracer.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `7b9f3ef7` | `test(49-05)`: the devtools feed hands over the gate registry, RED |
| 2 | `b01d55d8` | `feat(49-05)`: the dock takes the gate registry, and the panel renders the model's one snapshot |
| 3 | `e4faa9ed` | `fix(49-05)`: the gates-absent message names the registry a host now hands over |

## RED proof (Task 1)

`vitest run --project react DevtoolsFeed.test.tsx` with the two assertions reading `.gates.instances()` and the feed still returning an array: 1 failed, 10 passed, the one failure "gates are the provider's effective registry: one per instrumented guard, none otherwise". `DevtoolsFeed.ts` was unchanged at that commit.

## What was built

- `DevtoolsFeed.gates` is `GateRegistry`, read from `useQadiContext("useDevtoolsFeed")`; `useGateInstances` and the `GateInstance` import are gone from the feed.
- `DevtoolsDock`: `gates?: GateRegistryLike`, destructured with `ports` and passed to `useDockModel` (build, `configure`, effect dependencies); `gates` is no longer a `HostProps` member; the questions screen passes `props.model.questions`.
- `QuestionsPanel`: the `questions` prop is the model's readout (`Pick<ExternalStore<QuestionsSnapshot>, "subscribe" | "getSnapshot">`), the `gates` prop is deleted, `useStoreSnapshot` reads it once, and `useLens` receives `snapshot.instances` (the registry's own array). The gates and questions blocks are two module-scope `Match.type<…>().pipe(Match.tagsExhaustive(…))` matchers; `Question` takes `entry: QuestionRow`. No `switch`, `as` or `try`.
- `gatesProp` builds a structural `GateRegistryLike`; `panelInput` builds a one-snapshot readout with `unsampled: false` (every routed render uses `liveNotice`).
- D-12a: the gates-absent sentence is now "No live guards were handed to the dock. Pass gates — usually atoms.gates, from @qadi/react — to list who is asking." in the panel, the two characterisation literals and the one assertion in `QuestionsPanel.gates.test.tsx`.

## Verification

- Tracer: `vitest --project react` 518 passed; `--project devtools` 1496 passed (twelve characterisation cells included); `tsc -p tsconfig.test.json`, `pnpm lint` (house-style: 532 files clean), `pnpm circular`, `tsc -b tsconfig.build.json` clean; example `typecheck` clean and its tests 42 passed (7 files). `examples/nextjs-newsroom/src/client/Dock.tsx` needed no edit: `<DevtoolsDock {...feed} />` compiles.
- The plan's source-shape check (feed, dock, `useDockModel`, panel tokens; characterisation and panel tests not in the tracer commit) printed `ok`; the D-12a check (characterisation equals the tracer's with the old sentence replaced twice; one panel line; one assertion line; the old sentence nowhere under `packages/devtools` tracked files) printed `D-12a ok`.
- Task 3's five-file vitest run: 121 passed.
- `pnpm check:pr < /dev/null`: **exit 0**, 16 of 17 steps (mutation skipped on a PR, by design).
- `git diff 76330fbd… -- scripts/check-house-style.mjs` is empty; `packages/react/test` differs from `phase_base` only in `DecisionOutcome.tst.ts` and `DevtoolsFeed.test.tsx`.

## Deviations from Plan

None - plan executed exactly as written. One tooling note: a first attempt to stage the six tracer files failed on zsh word-splitting of an unquoted variable and committed nothing; the retry staged them by explicit path.

## Known Stubs

None.

## Threat Flags

None. The feed hands over who is asking, never an answer, and `DECISION_READ_BUDGET` is untouched.

## Self-Check: PASSED

- FOUND: the three commits `7b9f3ef7`, `b01d55d8`, `e4faa9ed` are ancestors of HEAD
- FOUND: all nine files listed in key-files exist and are committed
