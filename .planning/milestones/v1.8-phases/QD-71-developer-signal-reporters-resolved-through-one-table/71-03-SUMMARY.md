---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
plan: 03
subsystem: react-developer-signals
tags: [signal-table, one-resolver, gate-registry, type-pins, gutting-evidence]
phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939
requires: ["71-02"]
provides:
  - "DeveloperSignals.ts: SIGNALS (one row per developer signal, satisfies SignalTable), SignalTable, SignalTag, a derived ReporterName, defaultOf, once and reporterFor, the one resolver"
  - "GateWriter.ts: buildGateRegistry(report), the registry closure given an already-resolved reporter, replacing makeOwnedGateRegistry"
  - "makeGateRegistry resolves onIdCollision under its own name; makeQadiAtoms resolves onGateIdCollision under its own name and hands the registry the resolved reporter"
  - "71-RED-EVIDENCE.md: the regression pair green, and five type guarantees plus the throwaway signal each seen failing once"
affects: [71-04]
tech-stack:
  added: []
  patterns: ["a table that satisfies a mapped type over the signal union, so a missing, extra or second-latch row does not compile", "a resolver generic in the row's told type with the entry point NoInfer'd, so a slot paired with the wrong row or a row's foreign entry point does not compile", "the registry closure takes an already-resolved reporter, so each entry point names it by its own option and no throw is contained twice"]
key-files:
  created: []
  modified:
    - packages/react/src/DeveloperSignals.ts
    - packages/react/src/GateWriter.ts
    - packages/react/src/GateRegistry.ts
    - packages/react/src/QadiAtoms.ts
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: defaultOf reads only the three fields it uses (a Pick of SignalRow), not the whole row, so ReporterThrew's row with no entry point and every other row pass without a cast or a placeholder option; reporterFor takes the whole row because it reads its entries."
  - "Decided autonomously: sayProviderSignal's latch is once(SIGNALS.InstrumentedInProduction.says), built once at module load, so the one latch has one writer (once) and the sentence is written once (the row); the provider's other two handlers and the three resolvers stay for 71-04 to delete."
  - "Decided autonomously: the table block sits after the hydration drop types (the rows' says mention them) and the reporters 71-04 will delete stay above it, reading it only when called; no declaration is read at module load before it is defined."
patterns-established:
  - "Entry-point name decided by the caller's own resolution: a package-private builder taking the resolved reporter, never a public option or a second containment."
requirements-completed: []
duration: 28 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: f9a9504c24cd99dcb59c7d63ffacf2681023b650
plan_head_after: 5e6200a5d1ca2ed8962b37736c0c268ce824676e
actuals:
  tokens: 9500
  tasks: 2
  commits: 2
---

# Phase 71 Plan 03: The table, the one resolver and both collision entry points Summary

A throwing `onIdCollision` passed to `makeGateRegistry` is now announced under `onIdCollision`, while `makeQadiAtoms`' `onGateIdCollision` is still announced under its own name, both through one total signal table and one resolver, with every type guarantee of the table seen failing once.

## Accomplishments

- `DeveloperSignals.ts`: `SIGNALS` has one row per member of the signal union, in the union's order, `satisfies SignalTable` (no `as const`). Each row states where its default speaks (`Development`, `Production`, `Everywhere`), how often (`OncePerProcess` for `InstrumentedInProduction` alone, enforced by `OftenOf`), the default's `says` inline, and per entry point its option and when it is resolved. `GateIdCollision` carries two entry points (`makeQadiAtoms`: `onGateIdCollision`, `makeGateRegistry`: `onIdCollision`); `ReporterThrew` carries none. `ReporterName` is read off the table (five names, `onIdCollision` among them); the hand-kept union is gone. `reporterFor(row, entry, supplied)` contains a supplied reporter under the row's option for that entry point, else returns the row's default under its condition (`defaultOf`, with `once` for a latching row); `contain` now announces a throw through `ReporterThrew`'s own row. `saysDehydrationDropped`, `saysHydrationDropped` and the latch in `sayProviderSignal` read the table, so no sentence or latch is written twice.
- `GateWriter.ts`: `buildGateRegistry(report)` is the former `makeGateRegistry` closure moved whole (every local and both comments), returning `new OwnedGateRegistry(...)`; `makeOwnedGateRegistry` is deleted. It imports neither `GateRegistry.ts` nor `DeveloperSignals.ts` (madge reports no cycle) and stays out of the barrel.
- `GateRegistry.ts`: `makeGateRegistry = (options?) => buildGateRegistry(reporterFor(SIGNALS.GateIdCollision, "makeGateRegistry", options?.onIdCollision))`; `GateRegistryOptions` and its doc are byte-for-byte unchanged, and the header names where the closure now lives. `QadiAtoms.ts` resolves under `"makeQadiAtoms"` and hands the result to `buildGateRegistry`, so the one throw is contained once.
- The type pins of 71-02 pass unchanged (the directive fragments `is not assignable to` matched the compiler's wording, so the pin file is untouched). Five guts and the throwaway signal each failed for the reason named, recorded in `71-RED-EVIDENCE.md`, none committed.

## Verification

- Task 1 verify (`both collision entry points name their own option`): exit 0. It covered the structure greps, `pnpm typecheck`, `pnpm test:tstyche DeveloperSignals` (6 pins, 11 assertions, both passes), the react project (`617 passed, 0 failed`, the two `makeGateRegistry` regression rows and the 35 characterisation rows green), house-style (`567 file(s) clean (3 declared switch(es), 68 type-test file(s))`), `api-surface: 941 export(s) documented across 9 package(s)`, madge, the characterisation unedited, the commit holding exactly the four files with the trailer, and a clean tree.
- Task 2 verify (`every type guarantee seen failing once`): exit 0. Statuses: gut 1 `1` (`a table missing a row is refused`), gut 2 `1` (`only InstrumentedInProduction may speak once per process`), gut 3 `1` (`ReporterName is every option an entry point reports under, written out`), gut 4 `1` (`a row refuses an entry point it does not name`), gut 5 `1` (`the hydrate row refuses the dehydrate reporter`), the throwaway `2` with a `TS2741` naming `Throwaway` at the table.
- `pnpm exec oxlint packages/react/src`: one warning, `QadiAtoms.ts:321` (`Parameter '_' is declared but never used`), in a line this plan did not touch.
- Not run, by design: the full `pnpm test:tstyche` and the other packages' suites; the plan's verifies run the pins for this file and the react project. 71-04 runs the whole gate after the remaining resolvers move.

## Deviations from Plan

None - plan executed exactly as written. The table, the types and the resolver compiled as the plan's interfaces described, so no pin fragment changed. Two comments cite ADR-QD-184 (the plan names it, the number is reserved and 71-08 writes the record); no D-number, plan id, requirement id or phase number is in shipped source.

## Known Stubs

None.

## Threat Flags

None. T-71-06 (a supplied reporter's throw escaping) is held by `contain` and the regression rows asserting both entries are still listed; T-71-07 by `buildGateRegistry` living in `GateWriter.ts` with the barrel at 941; T-71-08 by the atom set handing `buildGateRegistry` its resolved reporter, never through `makeGateRegistry`, with the rows asserting exactly one line.

## Commits

- `9b8645ee` fix(71-03): name a throwing collision reporter by the option it was passed through
- `5e6200a5` docs(71-03): record every type guarantee failing once when gutted

## Self-Check: PASSED

The four source files, `71-RED-EVIDENCE.md` and this summary exist, both commits are ancestors of HEAD, and both task verifies exit 0.
