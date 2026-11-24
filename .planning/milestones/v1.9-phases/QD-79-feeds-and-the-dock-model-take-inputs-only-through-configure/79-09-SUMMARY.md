---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 09
subsystem: devtools-dock
tags: [configure, normaliser, dock-model, feed-inputs, type-pins, devtools]
requires: ["79-08"]
provides:
  - completeDockInputs, the one normaliser of the dock model's inputs, refusing a bad capacity before anything moves
  - feedInputsOf, the one mapping of the dock's inputs onto its three feeds, the interval crossing from diagnostics to gates there
  - the dock built from bare feeds, a handed init applied through its own configure, the dispatch order written once
  - the dock's input record pinned by type in ConfigureInputs.tst.ts
affects: [79-10, 79-12, 79-16]
key-files:
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/ConfigureRule.test.ts
    - packages/devtools/test/model/ConfigureInputs.tst.ts
key-decisions:
  - "The dock's configure has no guard of its own: each feed's rule decides"
  - "The init applied at the end of the build goes through configure, so build and configure share one path"
  - "feedInputsOf's return type is a non-exported FeedInputs interface; the type pin states its three records literally"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 4
plan_head_before: ba0e87ae65d4beae3c9a675e09b1697dd14804f3
plan_head_after: 14d20f955b9b206f6e80c1aa557a5ed5e9d3b167
actuals:
  tokens: 9000
  tasks: 2
  commits: 4
coverage:
  - deliverable: "completeDockInputs, feedInputsOf, bare feeds and one dispatch through configure; CR24 shown failing against feedInputsOf reading the gates interval from nowhere; whole devtools project green"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-09-PLAN.md (exit 0); devtools project 1858 tests, none failing; pinned and characterisation checks pass"
        status: pass
    human_judgment: false
  - deliverable: "the dock's golden Required<DockModelInputs>, normaliser and mapping return types, a refused record with its twin; compile force shown once (T4)"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-09-PLAN.md (exit 0); pnpm test:tstyche 76 files"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 09: The dock maps its inputs onto its feeds in one place

**The dock model holds one complete input record, maps it onto its three feeds through one function, is built from bare feeds, and leaves the decision whether anything moved to each feed's own rule.**

## Accomplishments

- `DockModel.ts`: `completeDockInputs(inputs): Required<DockModelInputs>` (capacity through `effectiveCapacity`, so a refused bound throws before anything moves), the `FeedInputs` interface and `feedInputsOf`. The interval is read from `diagnostics` in that one place.
- `makeDockModel` builds `makeTimelineFeed()`, `makeDiagnosticsFeed()` and `makeGatesFeed()` bare, holds `completeDockInputs({})`, and ends with `if (init !== undefined) configure(init)`. `configure` is a named const: normalise, `held = wanted`, then `try { timeline } finally { catalogue and roles, ports, gates, diagnostics, shown reading refresh }`, each feed dispatched once through `feedInputsOf`. M55 and M56 pass unedited.
- The initial `simulation.setPorts(inputs.ports)` call is gone from the build; the configure at the end of the build supplies it.
- CR24 pins `feedInputsOf` over a complete record with and without diagnostics.
- `ConfigureInputs.tst.ts` gained one test for the dock: the eight-field golden, the return types of `completeDockInputs` and `feedInputsOf`, a refused record and its twin.
- Whole devtools project 1858 tests green; `pnpm typecheck`, `pnpm test:tstyche` (76 files), `oxlint` (no errors, existing warnings only), house-style, the pinned and characterisation checks pass.

CR16 and CR17 were already green at plan start (the dock's configure reached each feed's own no-op after 79-08); their RED run on the base is recorded in 79-04. They stay green.

Red evidence (`79-RED-EVIDENCE.md`): `79-09 the dock maps its inputs in one place`: D1 (CR24 fails with the gates interval read from nowhere) and T4 (a scratch field on `DockModelInputs` fails tsc TS2741 in `DockModel.ts` and the dock's tstyche test).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two verify one-liners failed on their own text, not on the code**
- **Task 1 verify:** its raw-inputs scan read the whole file, matching the normaliser's own parameter, which the plan names `inputs`. The scan now reads from `makeDockModel` on. Commit 9b3ef1c6.
- **Task 2 verify:** `grep -qxF "- failed: tsc ..."` took the pattern for an option; it now ends the options with `--`. Commit 7bd0b288.
- Both are `docs(79-09): fix verify quoting`, changing PLAN text only.

**2. [Rule 3 - Blocking] The CR24 import was a separate line**
- The plan's check refuses a removed line in the cell file, so the new names come in a second `import … from "../../src/model/DockModel.ts"` line instead of widening the existing one. Lint is clean.

No other deviation.

## Decisions Made (autonomous)

- No guard in the dock's `configure`, as the plan prohibits; a same-input configure returns inside each feed.
- The roles store and the initial rail are built from the empty held record (`NO_ROLES`, `held.catalogue`), since the handed init arrives through `configure`.

## Risks for 79-16 (mutation close)

- `DockModel.ts` mutants on `completeDockInputs` and `feedInputsOf` are covered by CR24 and the CR16 to CR22 cells; not measured here.
- The `wanted.catalogue !== before.catalogue` comparison is the dock's one remaining comparison of its own, kept because it moves the dock's rail and roles, not a feed.

## Known Stubs

None.

## Threat Flags

None. T-79-15 holds because a same-input configure returns inside each feed (CR16, CR17); T-79-16 holds because `completeDockInputs` refuses the capacity first (M55 unedited).

## Self-Check: PASSED

- `completeDockInputs` and `feedInputsOf` are declared in `DockModel.ts`; `ConfigureInputs.tst.ts` pins both.
- Commits 9b3ef1c6, 627b5a76, 7bd0b288 and 14d20f95 are ancestors of HEAD, each with the one trailer.
