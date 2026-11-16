---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
plan: 01
subsystem: devtools
tags: [adr-check, mutation-baseline, evidence]
phase_base: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_before: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_after: 53e36fade85003a7ca88c03cb67b2b4783e24eba
commits: 1
requires: []
provides:
  - "## ADR check: ADR-QD-047, 053, 080, 137, 152 quoted against the design (input to ADR-QD-162); verdict: none forbids"
  - "49-mutation-base.json, the Stryker baseline of the five touched measurable files"
affects: [49-02, 49-03, 49-04, 49-05, 49-06, 49-07, 49-08, 49-09]
key-files:
  created:
    - .planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-mutation-base.json
key-decisions:
  - "No ADR forbids the design; ADR-QD-053's two wiring sentences become historical and are noted by ADR-QD-162, not reversed"
metrics:
  tasks: 2
  files: 2
actuals:
  tokens: 14000
  tasks: 2
  commits: 1
status: complete
---

# Phase QD-49 Plan 01: ADR check, reserved ids and mutation baseline Summary

Evidence only, taken on the untouched phase base before any code: the five ADRs read against the design by quotation, the ten reserved numbers confirmed free, and the Stryker baseline of the touched model and react files.

## ADR check

The passages are quoted from the ADR files at the phase base (`76330fbd`); line numbers are the source files' own.

### ADR-QD-047

`spec/decisions/047-a-headless-devtools-model.md:396-400` (the 2026-11-12 amendment, CCR-QD-425):

> **Amended 2026-11-12 (CCR-QD-425): diagnostics are the dock model's seventh store.** The
> dock forked its diagnostics poll from a React effect through `useRunningStore`, with a
> hand-written dependency list, and merged the supplied reading in a `useMemo`. It was the
> one place the dock still broke the 2026-11-11 amendment's "one owned-model hook, and it
> forks nothing", and it had a defect the rest did not:

`:470-471` (the 2026-11-12 amendment, CCR-QD-427):

> - **`DockModel.timelineStatus` is the eighth readout.** It is the feed's own status and
>   restart, not merged with anything.

Forbids: a screen of the dock owning a store, a fork or a subscription outside the dock model, and a second owner of what the model owns; the model's state is the model's, read through one store-snapshot hook.
Does not forbid: the model taking one more input and one more store, nor its subscribing to that input inside its own scope. The amendments count seven stores and name `timelineStatus` the eighth readout, so a gates store is a new store on the same footing, and the header recount is an amendment, not a reversal.

### ADR-QD-053

`spec/decisions/053-a-gate-can-be-found.md:160-164` (a correction):

> **Correction.** This paragraph previously went on to say present-tense "and
> it is `@qadi/devtools`, a DOM package already, that subscribes." `@qadi/devtools`
> has no dependency on `@qadi/react` — `GateRegistry.ts` lives in `@qadi/react` —
> and `DevtoolsDock.tsx` takes `gates` as a plain, one-shot prop, not a
> subscription.

`:221-223` (the 2026-10-08 amendment, CCR-QD-240):

> reads off an atom set. `useDevtoolsFeed(extra)` returns `gates` (the provider's
> effective registry, read through `useGateInstances`), `onInvalidate`, and a
> `diagnostics` whose `layer` is the registry's own built runtime context and whose

`:231-232`:

> whether any gate exists, and `@qadi/devtools` takes all of it structurally with no
> dependency on `@qadi/react`, because `DiagnosticsDockOptions.layer` is a

Forbids: `@qadi/devtools` depending on `@qadi/react`, a registry type that only `@qadi/react` can name, and the feed reading a decision or writing a gate.
Does not forbid: the dock model subscribing to a structural registry (`GateRegistryLike`, a type `@qadi/devtools` states itself). The two wiring sentences, "a plain, one-shot prop, not a subscription" and `gates` "read through `useGateInstances`", describe today's wiring; they become historical under D-09 and D-18 and ADR-QD-162 notes them without reversing ADR-QD-053's decision, which is the structural, dependency-free seam.

### ADR-QD-080

`spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md:86-88`:

> **Both AGENTS.md §13 rules still hold, and are checked.** Decisions are not in React
> state: a registry holds who is asking and what each guard rendered, never a verdict
> (ADR-QD-017), and `useGateInstances()` puts guard *instances* into a host's render,

Forbids: a registry holding a verdict (a decision, an allow or a deny); a registry outside its atom set.
Does not forbid: reading the registry's instances, their policy, resource and render state, as an input to a derived view. The new gate state vocabulary names what a guard rendered, which is the registry's existing field, not a verdict.

### ADR-QD-137

`spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md:56-59`:

> 1. **A session is constructed in a scope.**
>    `makeSimulationSession: (init?) => Effect<SimulationSession, never, Scope.Scope>`.
>    The session builds one `effect/FiberHandle` and the runtime that forks into it, and
>    registers a finalizer on the scope.

Forbids: a session or store whose subscription outlives the scope that built it, and one built outside a scope.
Does not forbid: the dock model taking a registry subscription in its own scope and releasing it with a finalizer; that is this decision's shape applied to one more store, so a hide and a show of the dock (an `Activity`) rebuilds and resubscribes.

### ADR-QD-152

`spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md:48-51`:

> 3. **The guard, the list and the meaning are read off it.** `isHydrationDropReason` tests an own
>    key with `Object.hasOwn`, so an inherited name such as `toString` is not a reason.
>    `hydrationDropReasons` is `Object.keys` of the table narrowed by that guard, so it needs no cast
>    and keeps declaration order.

Forbids: a word list written twice, a guard that accepts an inherited name, and a list that needs a cast.
Does not forbid: a second closed vocabulary built the same way. The five gate words as one core table read by react and devtools (`isGateState` on `Object.hasOwn`, `gateStates` as `Object.keys` narrowed by the guard) is this decision's shape, applied to one more table.

Verdict: no ADR forbids the design: the registry as a dock-model input subscribed in the model's scope (ADR-QD-047's seventh store and eighth readout, ADR-QD-137's scoped construction), the panel rendering one snapshot, and the five words in a core table read by react and devtools (ADR-QD-152's shape) all stand. ADR-QD-053's two wiring sentences become historical under D-09 and D-18 and are noted by ADR-QD-162 in 49-07; ADR-QD-080's "never a verdict" is kept, since the registry still holds no verdict. No decision checkpoint is needed.

## Reserved ids

`git grep -lwF` at `phase_base` over `spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts` printed nothing for each of `ARCH-96`, `ADR-QD-162`, `CCR-QD-440`, `BEH-QD-581`, `BEH-QD-582`, `BEH-QD-583`, `BEH-QD-584`, `BEH-QD-585`, `INV-QD-343` and `INV-QD-344`, and no `spec/decisions/162-*` exists at the base. All ten are free. `node scripts/next-id.mjs` was not run.

## Mutation base

Two Stryker runs, one after the other (ADR-QD-098), each to completion before the writer read its report, on the untouched tree (no file under `packages/` changed). These exact strings are the close's invocations (49-09); no config was edited.

| Run | Invocation | Exit | Wall time |
|---|---|---|---|
| devtools | `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/Gates.ts'` | 0 | 40 s |
| react | `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/GateWriter.ts,packages/react/src/DevtoolsFeed.ts,packages/react/src/DecisionOutcome.ts'` | 0 | 59 s |

Scores as printed by the writer, `(detected/scored)`, unrounded:

| File | Score | Detected / scored | Ignored (static) |
|---|---|---|---|
| `packages/devtools/src/model/DockModel.ts` | 1 | 48/48 | 2 |
| `packages/devtools/src/model/Gates.ts` | 1 | 44/44 | 13 |
| `packages/react/src/DecisionOutcome.ts` | 1 | 8/8 | 11 |
| `packages/react/src/DevtoolsFeed.ts` | 0.7777777777777778 | 7/9 | 1 |
| `packages/react/src/GateWriter.ts` | 0.9795918367346939 | 48/49 | 3 |

Survivors:

- `packages/react/src/DevtoolsFeed.ts:117:62` ArrayDeclaration, Survived, `[atoms, registry]` becomes `[]` (a memo dependency list).
- `packages/react/src/DevtoolsFeed.ts:121:5` ArrayDeclaration, Survived, `[extra, layer, questions]` becomes `[]` (a memo dependency list).
- `packages/react/src/GateWriter.ts:178:3` ConditionalExpression, Survived, `a.id === b.id` becomes `true`: the pre-existing survivor named in RESEARCH Q8 (it was 48/49 at research time and still is).

The printed JSON, as written to `49-mutation-base.json`:

```json
{"measured":{"packages/devtools/src/model/DockModel.ts":1,"packages/devtools/src/model/Gates.ts":1,"packages/react/src/DecisionOutcome.ts":1,"packages/react/src/DevtoolsFeed.ts":0.7777777777777778,"packages/react/src/GateWriter.ts":0.9795918367346939},"unmeasured":{"packages/core/src/index.ts":"a barrel: export-star lines only, no mutant","packages/devtools/src/index.ts":"a barrel: named re-exports only, no mutant","packages/devtools/src/react/DevtoolsDock.tsx":"not instrumentable: stryker.devtools.mjs mutates packages/devtools/src/model/**/*.ts only","packages/devtools/src/react/QuestionsPanel.tsx":"not instrumentable: stryker.devtools.mjs mutates packages/devtools/src/model/**/*.ts only","packages/devtools/src/react/useDockModel.ts":"not instrumentable: stryker.devtools.mjs mutates packages/devtools/src/model/**/*.ts only"},"new":["packages/core/src/GateState.ts"],"deleted":{},"moved":{}}
```

`GateState.ts` is a static table, listed `new` and never scored against a base. The view files and barrels are recorded unmeasured with their reasons (their behaviour is held by 49-02's characterisation).

## Task commits

| Task | Name | Commit |
|---|---|---|
| 1 | Preconditions, the ADR check and the reserved numbers | none (SUMMARY only, by the plan) |
| 2 | The mutation baseline | `53e36fad` `chore(49-01)` (parent: `phase_base`, carries only `49-mutation-base.json`, ends with the trailer) |

## Deviations from Plan

None - plan executed exactly as written. One line-number note: the plan's `047:458-470` for "eighth readout" is `:470-471` at the base (the amendment's heading is at `:458`); the quotes are verbatim and their line numbers above are the files' own.

## Known Stubs

None.

## Threat Flags

None. No file outside `.planning/` changed.

## Self-Check: PASSED

- `49-mutation-base.json` exists and is the only file in `53e36fad`; its parent is `phase_base`.
- Both Task 1 verifies and both Task 2 verifies exited 0.
- No change under `packages`, `spec`, `scripts`, `.changeset`, `apps`, `examples`, `features` or `AGENTS.md`; `node scripts/next-id.mjs` never ran.
