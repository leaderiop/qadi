---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 01
subsystem: devtools
tags: [stryker, mutation-baseline, evidence, reserved-ids, api-surface]
phase_base: 0c349d6fc46978fe546dcb4767b94c17cbf7b03c
requires: []
provides:
  - phase_base and the re-verified base facts
  - ten reserved ids confirmed free at the base
  - the 935-export API surface baseline
  - 55-mutation.mjs and 55-mutation-base.json (D-15's rule and baseline, fixed before the change)
affects: [55-02, 55-03, 55-04, 55-05, 55-06, 55-08, 55-09]
actuals:
  tokens: 4500
  tasks: 2
  commits: 1
plan_head_before: 0c349d6fc46978fe546dcb4767b94c17cbf7b03c
plan_head_after: 17e733d2e7076ae87dd4bbe8c9c7cb24c4e6d06a
tech-stack:
  added: []
  patterns: ["mutation baseline committed alone as the phase's first commit, rule constants fixed before the change"]
key-files:
  created:
    - .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation.mjs
    - .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation-base.json
  modified: []
key-decisions:
  - "MOVED is empty: a fall in DockModel.ts or Wiring.ts at the close is closed with a test, never explained as a move"
requirements-completed: [WX-02, WX-05, WX-06]
duration: 8min
completed: 2026-11-18
status: complete
---

# Phase QD-55 Plan 01: Evidence on the untouched base

**Stryker baseline of DockModel.ts (123/123) and Wiring.ts (50/50) with no survivors, committed alone with the D-15 comparer, plus the base facts, ten free reserved ids and the 935-export API surface line, all at `phase_base` 0c349d6f.**

Note: the plan asks that no WX requirement be marked Complete here (they close with the milestone); `requirements-completed` copies the plan's ids per the template, but `REQUIREMENTS.md` is left untouched.

## Base facts

Read at `phase_base` (`0c349d6f`; the source tree is `3a7c994e`'s, Phase 54's close). Every site matched; the first verify recounts them from `phase_base`.

`packages/devtools/src/react/ServicesPanel.tsx`:

- `NO_ACTIVITY_READING = "no activity reading"` `:28`; `SHOWN_PER_PORT = 5` `:37`.
- `wiringView` (hoisted `Match.type<WiringRead>()`) `:81`; `isUnsampled(diagnostics.status)` `:125`.
- `PortCard` `:143-193`: the activity template, three suffixes (`from translation`, `retried`, `timed out`), `never called` / `NO_ACTIVITY_READING` for no entry.
- `RecentCalls`: newest first `[...calls].reverse().slice(0, SHOWN_PER_PORT)` `:224`; interpreter comparisons `:235` and `:241` (`toPredicate` / `remote`); `in flight` `:247`; `and N earlier` `:254`.
- `callsFor` `:272`: `log.calls.filter((call) => call._tag === port)` (`port: string`).
- `stateOf` `:281-288`, three rules in order: not present (`not provided to this reader` / `absent`), `defaulted === true` (`defaulted — <name>`), else `name ?? "wired, unnamed"`.
- `activityFor` `:322-325`: `activity.find((entry) => entry.port === port)` (`port: string`).

`packages/devtools/src/model/Wiring.ts`:

- `readonly port: string;` `:142` (`PortActivity`); `portActivity` `:185`: a `Set` of the four metrics' string keys `:197-202`, the `> 0` filter `:211-217`; `forEveryPort(` appears once, at `:99`.

`packages/devtools/src/model/DockModel.ts`: header `**Eight stores, counted once.**` `:24`; no `readonly services` store.

`packages/devtools/src/react/DevtoolsDock.tsx:330-337`: the Services lambda passes `wiring={props.shown.wiring}`, `activity`, `portCalls`, `diagnostics={notice}`.

Narrowing break sites: `packages/devtools/test/model/DockModel.test.ts:787` (`suppliedActivity`, port `"AttributeResolver"`), `features/features/devtools-screens/devtools-screens.steps.test.ts:419` (`activity.find((entry) => entry.port === "EvaluationId")`).

Absent at the base: `PortCards.ts`, `PortCards.test.ts`, `PortCards.tst.ts`, `ServicesPanel.characterisation.test.tsx`, `servicesInput.ts`.

## Reserved ids

`ARCH-102`, `ADR-QD-168`, `CCR-QD-446`, `BEH-QD-611`..`BEH-QD-615`, `INV-QD-355`, `INV-QD-356`: `git grep -lwF` at `phase_base` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts prints nothing for any of the ten. No `spec/decisions/168-*` exists at `phase_base`. The reservation file reads `{"CCR":452,"ADR":174,"BEH":645,"INV":368}`. `node scripts/next-id.mjs` was not run.

## API surface base

`pnpm -s spec:api` at `phase_base`:

```
api-surface: 935 export(s) documented across 9 package(s)
```

(55-08 and 55-09 require the same line.)

## Mutation base

`pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/Wiring.ts' < /dev/null`, run alone on the untouched green tree (no test written yet), exit 0, 49 seconds, 27.61 tests per mutant. `node .../55-mutation.mjs base` printed:

```
packages/devtools/src/model/DockModel.ts 1 (123/123) ignored 2
packages/devtools/src/model/Wiring.ts 1 (50/50) ignored 4
wrote .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation-base.json
```

- `DockModel.ts`: 123 Killed, 0 Timeout, 0 Survived, 0 NoCoverage, 2 Ignored (`:117:39` ArrayDeclaration, `:120:40` StringLiteral). Score 1.
- `Wiring.ts`: 50 Killed, 0 Timeout, 0 Survived, 0 NoCoverage, 4 Ignored (ArrowFunction `:128:17`, `:220:16`, `:223:18`, `:230:18`). Score 1.
- Survivors: none in either file. The close's bar for `BASE` is therefore "not lower", with no survivor to excuse.

Committed alone as `chore(55-01)` `17e733d2`, parent `phase_base`.

## Task Commits

1. Task 1 (evidence, no commit): base facts, reserved ids, API surface base; both verifies exit 0.
2. Task 2: `17e733d2` `chore(55-01): mutation baseline for DockModel and Wiring` (55-mutation.mjs, 55-mutation-base.json).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `55-mutation.mjs` and `55-mutation-base.json` exist on disk; `17e733d2` is an ancestor of HEAD; its parent is `phase_base`.
- Task 2's two verifies exit 0 (the second after the commit: the first plan commit carries only the two files and ends with the trailer).
- `git status` shows no change under packages, spec, scripts, .changeset, features, apps, examples, AGENTS.md or stryker.devtools.mjs.
