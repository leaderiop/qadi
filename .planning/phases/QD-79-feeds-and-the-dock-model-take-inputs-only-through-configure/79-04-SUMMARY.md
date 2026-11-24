---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 04
subsystem: devtools-dock-configure-rule-tests
tags: [configure, no-op, bare-build, moved-alone, pre-subscribed-reader, red-evidence, devtools]
requires: ["79-03"]
provides:
  - the dock cells (CR16 to CR22) of the per-field rule, written on the phase base
  - the two dock no-op cells RED on the base on the registry read count, every other dock cell shown failing once
  - the notification counts a reader subscribed before the first configure hears, pinned for both a building and a built diagnostics layer
affects: [79-05, 79-06, 79-09, 79-12, 79-13, 79-14]
key-files:
  created: []
  modified:
    - packages/devtools/test/model/ConfigureRule.test.ts
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-RED-EVIDENCE.md
key-decisions:
  - "The dock's moved-alone table reuses 79-03's `Mover<I, F, O>`: `Record<keyof Required<DockModelInputs>, DockMover>` with eight rows, each row a `pair()` over a fresh `dockProbe()` that holds all eight inputs, so a row moves one input with the other seven held and the counts (source reads, registry reads and subscriptions, thunk calls, samples, builds, releases) belong to that pair alone"
  - "The observation of a dock is the nine store snapshots plus the timeline ids, the sighting labels, the asking ids of the questions join and the probe tally. The bare-versus-built comparison (CR21) compares it with the simulation's `plan` blanked: that field is built anew per model and compares by identity, so two equal docks never deep-equal on it"
  - "The two ports layers are module-scope values (a held one and another one), because a snapshot holds its layer and CR21 builds two models that must be handed the same one; every cell that depends on counts builds its fixtures inside the `it`"
  - "CR22 pins two measured counts. Run 5's counts (timeline 2, dock 2, explorer 3, simulation 3, roles 0, diagnostics 1, timelineStatus 0, questions 2, services 1) hold while the poll layer is still building (`Layer.effectDiscard(Effect.never)`); a layer that builds at once adds the poll's `Live` publish on the diagnostics, questions and services stores (2, 3, 2). Both are asserted, so the ADR can quote either"
requirements-completed: []
metrics:
  duration: 30min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: f894cd7cea82cd07aaf8e78fcefbb870ae91c1cd
plan_head_after: af5550a3aacf1eea803a4764e9995cabbe8a4378
actuals:
  tokens: 30000
  tasks: 2
  commits: 1
coverage:
  - deliverable: "ConfigureRule.test.ts holds a `the dock model` describe with CR16 to CR22; on the base exactly CR11, CR12, CR16 and CR17 fail"
    verification:
      - kind: command
        ref: "pnpm exec vitest run --project devtools packages/devtools/test/model/ConfigureRule.test.ts (18 passed, 4 failed: CR11, CR12, CR16, CR17); the Task 2 verify"
        status: pass
    human_judgment: false
  - deliverable: "CR20's table is a complete `Record<keyof Required<DockModelInputs>, Mover>`; CR21 is titled for removal; CR22 names the nine stores"
    verification:
      - kind: command
        ref: "pnpm typecheck; the Task 1 verify (describe, seven titles, complete table, removal title, nine stores, no id or phase wording)"
        status: pass
    human_judgment: false
  - deliverable: "every green dock cell (CR18 to CR22) shown failing once; CR16 and CR17 red on the base"
    verification:
      - kind: command
        ref: "79-RED-EVIDENCE.md section `79-04 the dock cells of the rule` (twelve scratch edits K1 to K12); the Task 2 verify checks every title has a `- failed:` line"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 04: The dock half of the configure rule, on the base

**The dock model's no-op, presence, bare-equivalence, moved-alone and pre-subscribed-reader cells are written against today's API; a dock configure that moves nothing still reads the registry, and both cells that say so are RED.**

## Accomplishments

- `packages/devtools/test/model/ConfigureRule.test.ts` gains `describe("the dock model")` after 79-03's blocks, which are unchanged (the commit's diff has no removed line):
  - CR16: a fresh literal holding all eight inputs notifies none of the nine stores, keeps every snapshot object and leaves the tally of source reads, registry reads, thunk calls, samples and layer builds as it was (RED on the base).
  - CR17: held `{ gates, source }`, then every field written with the other six `undefined`: the same three assertions (RED on the base).
  - CR18: held `{ source }`, then a capacity of `DEFAULT_TIMELINE_CAPACITY`, one of `undefined` and none: the timeline snapshot stays, nothing is notified, no read starts.
  - CR19: `makeDockModel()` reads what `dockModelOf({})` reads in all nine stores and in `sightings()`, and `configure({})` right after it notifies none.
  - CR20: each of the eight inputs moved alone makes the store it reaches react (capacity: the timeline's bound; source: the new record arrives and the old source is not read again; catalogue: the roles and the sightings; diagnostics: one more build and release; gates: the questions join asks `g2` after `g1`; questions: the thunk is read and the join changes; reading: the merged reading is another object and the poll is not restarted; ports: the simulation snapshot).
  - CR21 (titled `, while the constructor takes inputs`): each CR20 row given at build and given through `configure` reaches the same observation.
  - CR22: a reader subscribed to the nine stores of a bare dock before its first configure hears the counts above.

## RED and green evidence

On the base (`packages/devtools/src` unchanged from `phase_base`) exactly CR11, CR12, CR16 and CR17 fail. CR16 fails on the tally (registry reads 1 then 2): `DockModel.configure` hands the gates feed the registry on every call and the feed reads it again, as 79-03 found for the feed alone. No store is notified and no thunk or source is read again, so the cells go green when 79-09 compares the dock's inputs before it dispatches them. CR18 to CR22 are green on the base and each is shown failing by scratch edits of `DockModel.ts` (K1 to K12 in `79-RED-EVIDENCE.md`: a configure that drops the source, the ports, the catalogue, the gates, the questions, the diagnostics, the capacity or the reading refresh, hands the feeds the value held before, reads an omitted capacity as 7, builds a bare dock at 7, skips one dispatch to the explorer and adds one to the simulation). Each was restored with `git checkout -- packages/devtools/src`; `git status --porcelain -- packages/devtools/src` printed nothing and no source file differs from `phase_base`.

## Deviations from Plan

None in the files or the cells. Two points the plan left open, both decided here:

- **CR22 measured two counts.** The plan expects Run 5's counts and says to pin the measured ones when they differ. With a diagnostics layer that builds at once (the probe layer of the feed cells) the base measures diagnostics 2, questions 3 and services 2, the poll's `Starting` and then `Live`; with a layer still building it measures Run 5's 1, 2 and 1. Run 5 used the second. The cell asserts both, with the title naming the first, so the ADR and the BEH text can quote the counts for the layer they mean.
- **Imports are additive.** The cells' imports are new lines (`import { dockModelOf } from "../builtFeeds.ts"` beside the existing one, a value import from `@qadi/core` beside the existing type import), because the task's verify refuses any removed line in the file. They are not merged into the lines 79-03 wrote.

## Auth gates

None.

## Known Stubs

None.

## Threat Flags

None. The change is test-only: no network endpoint, auth path, file access or schema change.

## Decisions made autonomously

- CR20's `catalogue` row moves both a declared policy and the roles, and asserts the roles snapshot and the sighting count, because the two stores are what the input reaches.
- CR22 builds the questions thunk, the registry and the source inside the cell through one `firstConfigure` helper, so the building and the built model are configured by the same inputs and differ only in the layer.
- CR20 and CR21 iterate `Object.entries(dockMovers)` and name the field in each assertion, as the feed cells do, so a failing row says which input it is.

## Self-Check: PASSED

- FOUND: packages/devtools/test/model/ConfigureRule.test.ts
- FOUND: commit af5550a3 (test(79-04): pin the rule the dock model applies to its inputs), holding exactly the cells and the evidence, with the one trailer
- `packages/devtools/src` has no difference from `phase_base`
