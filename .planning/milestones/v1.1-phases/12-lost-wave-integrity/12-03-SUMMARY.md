---
phase: 12-lost-wave-integrity
plan: 03
subsystem: hydration
tags: [integrity, hydration, metrics, developer-signals, test-first, lost-wave-port]

requires: ["12-01"]
provides:
  - "`packages/react/src/HydrationEvent.ts` (package-private): closed `HydrationEvent` (Dehydrated, LeftOut, PayloadRefused, EntriesDropped, Seeded, Rechecked), `DecisionEntry` (moved from the engine), `PayloadRefusalReason` and `EntryDropReason` written out as literal unions, `HydrationHooks`, `emitHydration`; the five off-fiber `Context.empty()` metric writes and their confinement doc (INT-06)"
  - "`HydrationCounts.ts` deleted; the engine calls no counter directly"
  - "Module-private `planDehydration` / `planHydration` inside `HydrationEngine.ts` return events; `dehydrateWith`, `hydrateWith` and `makeSeededQuestion` emit them after the work"
  - "A zero-entry `PayloadSubjectMismatch` counts 1 (INT-05, INV-QD-045): the `PayloadRefused` arm owns the at-least-one rule"
  - "`DeveloperSignals.ts`: `ReporterThrew { reporter, error }` + module-private `contain(reporter, supplied)` in all five resolvers; a throwing host hook changes nothing (INT-04)"
affects: [12-04, 12-05]

actuals:
  tokens: 95000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns: ["hoisted Match.tagsExhaustive whose arms return a (hooks) => void closure: count first, announce second"]

key-files:
  created:
    - packages/react/src/HydrationEvent.ts
    - packages/react/test/HydrationEvent.test.ts
  deleted:
    - packages/react/src/HydrationCounts.ts
  modified:
    - packages/react/src/HydrationEngine.ts
    - packages/react/src/Hydration.ts
    - packages/react/src/DeveloperSignals.ts
    - packages/react/test/HydrationEngine.test.ts
    - packages/react/test/DeveloperSignals.test.ts
    - packages/devtools/src/model/Hydration.ts
    - packages/devtools/src/react/Lens.ts
    - packages/devtools/test/model/Hydration.test.ts
    - scripts/check-house-style.mjs

key-decisions:
  - "12-03 T1 (D-53-b/g) answered in `_DECISIONS.md`: `option-a` — \"One `HydrationDrop` type for both ends (Breaking dehydrate `onDropped`); `HydrationEvent.ts` joins the react Stryker run\". Not re-asked. Per the plan, the dehydrate hook keeps its bare-array type here; 12-04 implements the `HydrationDrop` shape and adds `HydrationEvent.ts` to `stryker.react.mjs`'s mutate list."
  - "D-53-a (b) split closed union; D-53-c (a) adapted per D-03 (planners module-private inside the engine, ARCH-51 privacy kept); D-53-e (a) contain in every resolver, said in every environment."
  - "Not ported from f27d049 (deferred to 12-04 or left out): `UnencodablePolicy`/`Schema.encodeOption`, the `HydrationDrop<A, R>` reason parameter, `serverDropReporter`/`clientDropReporter` renames, `DehydrationDropped` replacing `PayloadMixedSubjects`, exported `dehydrationHooks`/`hydrationHooks`/`recheckHooks`/`emitAll`/`describeHydrationEvent` (hooks are resolved at the call site; `emitAll` is a private loop in the engine), the 200-char truncation in `errorLine`."

requirements-completed: [INT-04, INT-05, INT-06]

coverage:
  - id: D1
    description: "A zero-entry subject-mismatch payload adds exactly 1 to PayloadSubjectMismatch and reports wholePayload true"
    requirement: INT-05
    verification:
      - kind: test
        ref: "HydrationEngine.test.ts > a refused payload is always counted (RED 3c0daa4, green 28c8d36)"
        status: pass
    human_judgment: false
  - id: D2
    description: "One closed HydrationEvent, one arm per tag: exact deltas on all five metrics and the exact hook argument; counts before it announces"
    requirement: INT-06
    verification:
      - kind: test
        ref: "HydrationEvent.test.ts (14 tests, one describe per tag); Stryker on HydrationEvent.ts 100.00 (30 killed, 1 timeout)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Throwing onDropped (hydrate, dehydrate) and onHydrationMismatch leave seeds, payload, counts and the re-check unchanged; every resolver says one ReporterThrew naming the hook and the error, in development and production"
    requirement: INT-04
    verification:
      - kind: test
        ref: "HydrationEngine.test.ts > a throwing reporter changes nothing; DeveloperSignals.test.ts > a supplied reporter that throws (RED c292760, green 9100d00)"
        status: pass
    human_judgment: false
---

# Phase 12 Plan 03: A hydration outcome is one value — Summary

Every exit from hydration is now one `HydrationEvent`, built inside the merged engine and turned into a count and a
report in exactly one place (`emitHydration`, `HydrationEvent.ts`), which absorbed and replaced `HydrationCounts.ts`.
That fixed the zero-entry subject-mismatch counting 0, and every resolver in `DeveloperSignals.ts` now contains a
throwing host hook, so a reporter cannot stop a seed, a count, a payload or a re-check. Port of lost ARCH-53 (`f27d049`),
event, projection and resolver code; wiring rebuilt in the current engine.

## Decision applied

`_DECISIONS.md`, row "12-03 T1 (D-53-b/g)": **`option-a`** — "One `HydrationDrop` type for both ends (Breaking dehydrate
`onDropped`); `HydrationEvent.ts` joins the react Stryker run". Task 1 (the checkpoint) was not re-asked. **12-04
implements it**: the `HydrationDrop` shape for `DehydrateOptions.onDropped` (and `LeftOut`'s hook in `HydrationHooks`,
today `DroppedEntriesReporter<DecisionEntry>`), and `packages/react/src/HydrationEvent.ts` in `stryker.react.mjs`.

## Commits

| sha | subject |
|---|---|
| 3c0daa4 | test(12-03): RED — a zero-entry subject mismatch is counted at least once |
| 28c8d36 | feat(12-03): a hydration outcome is one HydrationEvent, counted and reported once |
| c292760 | test(12-03): RED — a supplied reporter that throws changes the outcome |
| 9100d00 | fix(12-03): a supplied reporter cannot change the outcome it observes |

## RED evidence (XC-06)

- 3c0daa4: "a payload naming another subject with no entries adds exactly one PayloadSubjectMismatch" failed
  `expected +0 to equal 1`.
- c292760: 16 tests failed, each because the hook's throw propagated (`Error: host boom` / `TypeError: host boom` /
  `Unknown Error: plain string`): both engine probes, and in DeveloperSignals.test.ts the five resolver rows, the
  non-Error row and the `makeQadiAtoms` re-check probe, each in development and production.

## DeveloperSignal tag added (sentence verbatim)

`ReporterThrew { reporter: ReporterName; error: unknown }`, `ReporterName = "onHydrationMismatch" | "onGateIdCollision" |
"onDropped" | "onDeveloperSignal"`:

```
[qadi] the ${reporter} reporter you supplied threw (${errorLine(error)}). The outcome it was told about stands — nothing was skipped, seeded differently or left uncounted. Fix the reporter.
```

`errorLine` is `name: message` for an `Error`, else `String(error)`. Tests assert the line never contains the
entry's subject id or the policy tag. `PayloadMixedSubjects` is unchanged here (12-04 replaces it per option-a).

## DECISION_READ_BUDGET and AGENTS.md

`packages/react/src/HydrationEngine.ts`: **3 → 2** (one `isInitial`, one `isSuccess`; the `Rechecked` event carries
the mismatch, so the second `isSuccess` went). Measured with
`/usr/bin/grep -cE 'AsyncResult\.(isInitial|isSuccess|isFailure|isWaiting)\(|\.waiting\b'` → 2; the budget comment
was updated. AGENTS.md §13 names the budgeted files, not counts, so its wording stays true: **AGENTS.md unchanged**.
The `Context.empty()` confinement now lives in `HydrationEvent.ts` (the paragraph moved verbatim); the console
exemption is still `DeveloperSignals.ts` alone (no `console.` elsewhere in `packages/react/src`).

## Deviations

1. **[Ordering] The budget change landed in Task 2 (28c8d36), not Task 3.** Task 2 builds `Rechecked`, and with one
   `isSuccess` read the house-style gate inside `pnpm lint` (Task 2's verify) fails unless the budget moves with it.
2. **[Test edit, Task 3] `DeveloperSignals.test.ts`'s "a supplied reporter replaces them" asserted
   `toBe(mine)` identity.** Containment wraps the supplied hook, so it now asserts the hook hears exactly what it is
   handed and nothing is said. The plan's "every existing react test passes unedited" was Task 2's rule, and held there.
3. **`HydrationEngine.ts` re-exports `DecisionEntry` (type) from `HydrationEvent.ts`**, as it already re-exports
   `HydrationMismatch`, so `HydrationEngine.test.ts`'s existing import kept working unedited. `Hydration.ts`'s public
   re-export now points at `HydrationEvent.ts`; public name unchanged.
4. **`Dehydrated`/`Seeded` are emitted even with count 0** (as `countDehydrated(0)`/`countSeeded(0)` were called
   before), so no observable count changed for a non-throwing hook.
5. **`onGateIdCollision` names both entry points.** `makeGateRegistry`'s own option is `onIdCollision`; the resolver
   cannot tell which one it came through, so `ReporterThrew` says `onGateIdCollision` (makeQadiAtoms' name) for both.

## Gate results

- Task 2 verify: the five hydration suites (136 tests), `pnpm typecheck`, `pnpm lint` (house-style clean),
  `pnpm circular`, and the four grep gates (HydrationCounts non-comment lines in react/devtools src 1 → 0; devtools
  `HydrationCounts.ts` mentions 3 → 0; engine count-function lines 6 → 0; file deleted): green.
- Task 3 verify: `vitest --project react packages/react/test` 396/396, typecheck, lint, circular, `ReporterThrew`
  present, console outside DeveloperSignals.ts 0, engine reads (2) = budget (2): green.
- Extra: `--project react --project devtools` 1363/1363 (after Task 2), `pnpm test:bdd` 563/563, `pnpm test:tstyche`
  175/175.
- Mutation (XC-05): `pnpm exec stryker run stryker.react.mjs --mutate packages/react/src/HydrationEvent.ts` →
  **100.00** (30 killed, 1 timeout); `12-mutation-score.mjs compare` all ok. No other mutated file was touched.
  (This scoped run overwrote `reports/mutation-react/mutation.json`.)
- `pnpm spec:api` not run (known red, 9 drifts, until 12-05). No public export added or removed by this plan.

## Notes for the next plans

- 12-04: implement option-a on top of `HydrationHooks.leftOut` and `LeftOut.reason: DehydrationDropReason`
  (`droppedEntriesReporter` → the `HydrationDrop` shape; `PayloadMixedSubjects` → a reason-carrying signal);
  `UnencodablePolicy` drops via `LeftOut`, so the arm already counts it; add `HydrationEvent.ts` to
  `stryker.react.mjs` (it scores 100 today with `HydrationEvent.test.ts`).
- 12-05: spec records for INV-QD-045 (zero-entry refusal now counted), BEH-QD-230/231 (ReporterThrew, every
  environment), ADR-QD-052 amendment (confinement file is now `HydrationEvent.ts`), ADR-QD-041 amendment
  (ReporterThrew). No export changed in 12-03.
