---
phase: QD-60-devtools-headless-interface-is-the-feeds
plan: 03
subsystem: devtools
tags: [green, interface, feeds, diagnostics-options, breaking]
phase_base: 35a48554388da6c68940c1b94a1cc526b3111eae
requires: [60-02]
provides:
  - "@qadi/devtools' root exports makeTimelineFeed, makeDiagnosticsFeed, makeGatesFeed, their four tagged enums and nine handle and input types; the six runner and store names are gone"
  - "one non-generic DiagnosticsOptions { layer?, collector?, intervalMillis? } in DiagnosticsStore.ts, exported from the root and the React entry"
  - "configure(undefined) calls off() unguarded (D-16)"
affects: [60-04, 60-05, 60-06, 60-07, 60-08]
actuals:
  tokens: 14000
  tasks: 3
  commits: 2
plan_head_before: 8b5533b9541ee33cdc8e7489b682a1a723d62c7c
plan_head_after: 6ad68e6da3fe271dffc0231d7edee2840dc675b7
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-60 Plan 03: The feeds are devtools' headless interface, one DiagnosticsOptions

**The root now names the three feeds a shell builds in a scope and one `DiagnosticsOptions` configures the poll; the seven RED files of 60-02 pass, and the whole devtools project is green.**

## Commits

| Task | Commit | Subject | Files |
| ---- | ------ | ------- | ----- |
| deviation | `5d297faf` | `test(60-03): call the feed through its Effect, not toBeCallableWith` | `test/model/DiagnosticsStore.tst.ts`, `test/surface.tst.ts` |
| 1-3 | `6ad68e6d` | `feat(60-03)!: the feeds are devtools' headless interface, one DiagnosticsOptions` | ten src files, five renamed tests, `Counters.tsx` |

`commits: 2` is measured from the ledger (`8b5533b9..6ad68e6d`); the SUMMARY commit is separate. `6ad68e6d` is the first
src commit after `phase_base`, holds exactly the ten src files the plan names (`src/index.ts`, `model/{DiagnosticsFeed,
DiagnosticsStore,DockModel,GatesFeed,TimelineFeed}.ts`, `react/{DevtoolsDock.tsx,index.ts,useDiagnostics.ts,
useDockModel.ts}`) and the six renamed files, and ends with the trailer.

## Deviations from Plan

**1. [Rule 9 - Plan error] Two positive `toBeCallableWith` pins in 60-02's RED type files can never pass**
- **Found during:** Task 1 (`DiagnosticsStore.tst.ts`) and Task 2 (`surface.tst.ts`).
- **Issue:** `expect(runDiagnostics).type.toBeCallableWith(store, { intervalMillis: 500 })` and
  `expect(makeDiagnosticsFeed).type.toBeCallableWith({ intervalMillis: 1_000 })` fail with "Expression is not callable
  with the given arguments", whose body is the Effect language service's `effect(floatingEffect)`: tstyche synthesizes
  the call, and the plugin reports it as an unused Effect. A scratch file proved it needs no option at all
  (`toBeCallableWith(store)` fails the same way on the post-change code); the negative pins and
  `toBeCallableWith(wiringRead)` on a non-Effect function are unaffected. So no implementation could make these pass.
- **Fix:** each now calls the function inside `expect(...)` and pins the Effect it returns
  (`expect(runDiagnostics(store, { intervalMillis: 500 })).type.toBe<Effect.Effect<void, never, never>>()` and
  `expect(makeDiagnosticsFeed({ intervalMillis: 1_000 })).type.toBe<Effect.Effect<DiagnosticsFeed, never, Scope.Scope>>()`),
  which states the same intent (the option is accepted, the result is the feed's Effect) and still fails on an
  option the type does not have. Done in a separate commit, `5d297faf`, so the `feat(60-03)!` commit still touches none of
  the seven RED files (its verify checks that).
- **Commit:** `5d297faf`.

## Verifies (all exit 0)

```
Task 1  vitest DiagnosticsFeed + DiagnosticsStore:  Test Files 2 passed (2)  Tests 56 passed (56)
        tstyche DiagnosticsStore.tst.ts:            Tests 9 passed, Assertions 15 passed
        shape script:                               ok
Task 2  vitest TimelineFeed GatesFeed DiagnosticsFeed DiagnosticsStore surface:  Test Files 5 passed  Tests 112 passed
        tstyche surface.tst.ts + DiagnosticsStore.tst.ts:  Tests 15 passed, Assertions 26 passed
        barrels-named script:                       ok (the kept Effect.fn, Unwatched and subscribe lines intact)
Task 3  vitest --project devtools:   Test Files 70 passed (70)   Tests 1646 passed (1646)
        pnpm typecheck:                                          rc=0
        pnpm --filter @qadi/example-nextjs typecheck:            rc=0
        pnpm lint:                                               rc=0, house-style: 560 file(s) clean (3 declared switch(es))
        pnpm circular:                                           No circular dependency found!
        commit script:                                           ok 6ad68e6d
```

The cascade codes 60-02 recorded (TS18046, TS2375, TS377004, TS7006) all disappear: `pnpm typecheck` is clean. The
lint run's oxlint warnings are pre-existing and outside this plan's files.

## What changed

- `DiagnosticsStore.ts`: `DiagnosticsOptions` is non-generic with `intervalMillis`; `runDiagnostics` and `wiringReader`
  lose their type parameters and the repeat is `Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)`.
- `DiagnosticsFeed.ts`: `DiagnosticsDockOptions` and `runOptions` deleted, the fork is `runDiagnostics(marking, next)`,
  the `next === undefined` branch is `off(); return;` (F26 still passes), four imports gone.
- Root and React barrels as in the plan; `useDiagnostics.ts` no longer re-exports a type.
- Docs: the three feed modules say they are exported (ADR-QD-173) and the three `Stopped`/`Failed` reasons say a
  `Cause.pretty` trace must not cross a trust boundary (T-60-04, D-17).

## Known gates (expected red)

- `node scripts/check-api-surface.mjs`: 20 drifts (the `spec/overview.md` rows, `noDiagnostics`, `DiagnosticsDockOptions`,
  the retired runners, and the new names), closed by 60-07.
- `node scripts/check-doc-examples.mjs` (the spec-28 `sampleOnce` fence) and
  `node scripts/check-website-doc-examples.mjs` (the 0.12 "After" fence): closed by 60-06.
- `pnpm check:pr` was not run; it stays red until 60-06 and 60-07 land.

## Next plan must know

- A positive `toBeCallableWith` on an Effect-returning function cannot pass in this repo (floatingEffect); 60-04 onward
  should call it inside `expect(...)`.
- The Task 3 commit script's RED list still names the two `.tst.ts` files; they are not in the feat commit, only in
  `5d297faf`.
- `.planning/config.json`, `.planning/state.json` and the `*.iter*.md` files remain untouched and unstaged.

## Known Stubs

None.

## Self-Check: PASSED

Commits `5d297faf` and `6ad68e6d` are ancestors of `HEAD`; the ten src files, the six renamed files and this SUMMARY
exist; every task verify exited 0.
