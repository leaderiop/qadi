---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
plan: 04
subsystem: react-developer-signals
tags: [signal-table, one-resolver, process-latch, table-facts-pin]
phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939
requires: ["71-03"]
provides:
  - "HydrationEngine.ts: leftOut from the DehydrationDropped row and dropped from the HydrationDropped row, both through reporterFor"
  - "QadiAtoms.ts: the mismatch reporter is reporterFor(SIGNALS.SeedSuperseded, \"makeQadiAtoms\", options?.onHydrationMismatch), resolved once at construction"
  - "DeveloperSignals.ts: providerSignalReporter as a projection of reporterFor over SIGNALS[signal._tag] with the entry point QadiProvider; the mismatch, collision, drop and provider-signal resolvers deleted"
  - "DeveloperSignals.test.ts: every sentence and condition through reporterFor, plus a describe pinning the table's stated facts against a written-out table"
affects: [71-05]
tech-stack:
  added: []
  patterns: ["a resolver read on every report for the provider and once per call or construction elsewhere, both the same reporterFor", "a facts pin that compares records, so no test reads the table's key order"]
key-files:
  created: []
  modified:
    - packages/react/src/HydrationEngine.ts
    - packages/react/src/QadiAtoms.ts
    - packages/react/src/DeveloperSignals.ts
    - packages/react/test/DeveloperSignals.test.ts
key-decisions:
  - "Decided autonomously: providerSignalReporter keeps its exported type and returns a reporter that calls reporterFor on every report, so an inline onDeveloperSignal stays current (QadiProvider.tsx reads it through a ref and is untouched); the row, not the provider, now decides whether a default speaks."
  - "Decided autonomously: the matrix of throwing hooks and the table-facts pin share one list of entry points (eight row and entry pairs), and the facts pin checks that list covers exactly the written-out table, so a new entry point cannot join the table without a case."
  - "Decided autonomously: the written-out table is typed Record<SignalTag, ...> over the closed tag union with plain strings for the facts, so a mutated literal in the source table fails a string comparison without the test importing the table's private literal types."
patterns-established:
  - "One environment gate (speaksHere), one containment (reporterFor), one latch read (once): each written once, checked by counting code lines."
requirements-completed: []
duration: 22 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: ed58d2fec0d8b1e52b789e6e2877c2f406dbde74
plan_head_after: 4854696a4536dfa03dce96865e6d636bd51e84c5
actuals:
  tokens: 6900
  tasks: 2
  commits: 2
---

# Phase 71 Plan 04: Every reporter through the table, the old resolvers removed Summary

Every developer-signal reporter (hydrate, dehydrate, mismatch, collision and the provider's three) is now resolved by `reporterFor` from its own row, and the five hand-written resolvers are gone, so the environment gate, the production-instrumentation latch and the containment of a supplied reporter's throw are each written exactly once.

## Accomplishments

- `HydrationEngine.ts`: `dehydrateDecisions` resolves `leftOut` from `SIGNALS.DehydrationDropped` and `hydrateDecisions` resolves `dropped` from `SIGNALS.HydrationDropped`, each under its own entry point name and option. The default sentence is no longer an argument, so the dehydrate default cannot be paired with the hydrate slot (the type pin of 71-03 refuses it at compile time).
- `QadiAtoms.ts`: the mismatch reporter is resolved once at construction from the `SeedSuperseded` row; the `hydrationMismatchReporter` import is gone and the public re-export of its type stays.
- `DeveloperSignals.ts`: `providerSignalReporter(supplied)(signal)` is `reporterFor(SIGNALS[signal._tag], "QadiProvider", supplied)?.(signal)`, read on every report. `hydrationMismatchReporter`, `gateIdCollisionReporter`, `GateIdCollisionReporter`, `hydrationDropReporter`, `saysDehydrationDropped`, `saysHydrationDropped` and `sayProviderSignal` are deleted. `isDevelopment()` is called once (in `speaksHere`), `contain(` once (in `reporterFor`), and the one module-scope `let` is declared, read and set in `once` only (three occurrences in code lines). The header's Resolution paragraph now says every reporter is resolved from its row and that the production-instrumentation latch is the one piece of process state.
- `DeveloperSignals.test.ts`: every sentence and condition test keeps its title and reaches its default through `reporterFor` or `providerSignalReporter`. The throwing-hook matrix grew from five hooks to eight, one per (row, entry point) pair, and a new `describe("the developer-signal table")` pins the table's `speaks`, `often` and per-entry `option` and `resolved` against a written-out table, and checks the matrix covers exactly the written-out pairs. Three by-hand mutations of the source table (an option renamed, `ReporterThrew`'s `speaks` changed, a `resolved` changed) failed 6, 17 and 1 tests respectively; the source was restored each time.

## Verification

- Task 1 verify (`hydration and mismatch reporters read the table`): exit 0, run after the commit. It covered the call-site greps, `pnpm typecheck`, the react project with the 35 characterisation rows green, house-style (`567 file(s) clean (3 declared switch(es), 68 type-test file(s))`), madge, the commit holding exactly `HydrationEngine.ts` and `QadiAtoms.ts` with the trailer, and a clean tree.
- Task 2 verify (`every reporter reads the table`): exit 0, run after the commit. It covered no old resolver named in `packages/react`, the projection grep, one `isDevelopment()` call, one `contain(` call, three latch occurrences, exactly one module-scope `let` in `packages/*/src`, the facts describe present, `QadiProvider.tsx`, the barrel and the two provider test files unchanged against `phase_base`, `pnpm typecheck`, the whole `pnpm test:tstyche`, the react project (35 characterisation rows, the production latch file passing), house-style, `api-surface: 941 export(s) documented across 9 package(s)`, madge, the commit holding exactly `DeveloperSignals.ts` and its test with the trailer, no forbidden token in the test diff, and a clean tree.
- `DeveloperSignals.test.ts` alone: 43 passed.
- `pnpm exec oxlint packages/react`: three warnings, all `no-unused-vars` for a `_` parameter, one in `QadiAtoms.ts:321` (on the phase base, not this plan's line) and two in `v4-reactivity-smoke.test.ts` (untouched).

## Deviations from Plan

None - plan executed exactly as written. Two verification-only notes: the plan's verify scripts were extracted from the plan file and run verbatim after each commit rather than before it (the scripts check the commit they follow); and the two engine call sites exceeded the file's hand-wrapped width as a single line, so each `emitAll` call was wrapped across lines before the commit, which changes layout only.

## Known Stubs

None.

## Threat Flags

None. T-71-09 is held by each engine call site naming its own row (a mutant pairing is a compile error under the 71-03 type pin, and the characterisation pins every default sentence whole); T-71-10 by `QadiProvider.production.test.tsx` passing unchanged and the verify counting one module-scope `let` read only in `once`; T-71-11 by `contain` being called once, in `reporterFor`, with the characterisation's throwing rows green in both environments and the new matrix asserting the same through all eight entry points.

## Commits

- `b8566b76` refactor(71-04): resolve the hydration and mismatch reporters through the developer-signal table
- `4854696a` refactor(71-04): resolve every developer-signal reporter through the table and remove the hand-written resolvers

## Self-Check: PASSED

`HydrationEngine.ts`, `QadiAtoms.ts`, `DeveloperSignals.ts`, `DeveloperSignals.test.ts` and this summary exist, both commits are ancestors of HEAD, and both task verifies exit 0.
