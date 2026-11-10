---
phase: 12-lost-wave-integrity
plan: 04
subsystem: hydration
tags: [integrity, hydration, metrics, developer-signals, test-first, lost-wave-port, breaking]

requires: ["12-03"]
provides:
  - "`dehydrateDecisions` is total: `Schema.encodeOption(PolicySchema)`; an entry whose policy does not encode is a `LeftOut` `UnencodablePolicy` event (INT-03)"
  - "`DehydrationDropReason = \"ForeignSubject\" | \"UnencodablePolicy\"`; `hydrationDropReasons` has 8 values, each with a meaning row"
  - "One `HydrationDrop<A, R = ClientHydrationDropReason>` / `HydrationDropReporter<A, R>` for both ends; `DehydrateOptions.onDropped: HydrationDropReporter<DecisionEntry, DehydrationDropReason>`, called once per reason with `wholePayload: false` (D-53-b option-a)"
  - "`DroppedEntriesReporter` / `droppedEntriesReporter` deleted; `PayloadMixedSubjects` → `DehydrationDropped { reason, count }`"
  - "`HydrationEvent.ts` in `stryker.react.mjs`'s mutate list (D-53-g)"
affects: [12-05]

actuals:
  tokens: 90000
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns: ["a resolver generic in the reason, handed the default sentence of the hook slot the event's tag selects"]

key-files:
  created: []
  modified:
    - packages/core/src/HydrationMetrics.ts
    - packages/core/test/HydrationMetrics.test.ts
    - packages/react/src/DeveloperSignals.ts
    - packages/react/src/HydrationEngine.ts
    - packages/react/src/HydrationEvent.ts
    - packages/react/src/Hydration.ts
    - packages/react/test/Hydration.tst.ts
    - packages/react/test/HydrationEngine.test.ts
    - packages/react/test/HydrationEvent.test.ts
    - packages/react/test/HydrationPayload.test.ts
    - packages/react/test/Hydration.test.ts
    - packages/react/test/DeveloperSignals.test.ts
    - packages/devtools/test/model/Hydration.test.ts
    - stryker.react.mjs
    - features/features/hydration-counts/hydration-counts.feature
    - features/features/hydration-counts/hydration-counts.steps.test.ts
    - examples/nextjs-newsroom/src/server/decide.ts
    - examples/nextjs-newsroom/app/edge/mixed-payload/page.tsx
    - examples/nextjs-newsroom/test/hydration.test.ts

key-decisions:
  - "12-03 T1 (D-53-b/g) from `_DECISIONS.md`: `option-a` — \"One `HydrationDrop` type for both ends (Breaking dehydrate `onDropped`); `HydrationEvent.ts` joins the react Stryker run\". Implemented here; not re-asked."
  - "D-53-d (a): `UnencodablePolicy` is a `DehydrationDropReason`, reached through `encodeOption`."
  - "The default sentence is chosen by the hook slot, not by the reason string: `hydrationDropReporter(supplied, byDefault)` is generic in R; the engine passes `saysDehydrationDropped` for `leftOut` (the slot `LeftOut` is announced to) and `saysHydrationDropped` for `dropped` (`PayloadRefused`/`EntriesDropped`)."
  - "An entry both foreign and unencodable is `ForeignSubject`: the subject filter runs first and a foreign entry is never encoded."

requirements-completed: [INT-03, INT-06]

coverage:
  - id: D1
    description: "dehydrateDecisions never throws on gte(-Infinity), gte(NaN), hasRelationship(…, { depth: 1.5 }); the entry is left out as UnencodablePolicy, counted once and reported once; the rest is written"
    requirement: INT-03
    verification:
      - kind: test
        ref: "HydrationEngine.test.ts > dehydrate never throws (INT-03) (RED 8868c29 SchemaError, green 36648c3)"
        status: pass
      - kind: acceptance
        ref: "hydration-counts.feature > A policy that cannot cross the network is left out and counted"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both ends' onDropped take one HydrationDrop shape; a bare-array hook no longer compiles; reason partition pinned"
    requirement: INT-06
    verification:
      - kind: test
        ref: "Hydration.tst.ts (RED 4ec6800 ts(2314), green e7faccc)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A zero-entry subject-mismatch payload counts once (acceptance)"
    requirement: INT-05
    verification:
      - kind: acceptance
        ref: "hydration-counts.feature > A payload refused for another subject counts even with no entries (RED evidence: 12-03's 3c0daa4)"
        status: pass
    human_judgment: false
---

# Phase 12 Plan 04: Dehydration is total, one drop shape for both ends — Summary

`dehydrateDecisions` no longer throws on a policy the public constructors accept and the schema refuses: such an
entry is left out as `UnencodablePolicy`, counted and reported once, and the rest of the payload is written. The
dehydrate drop hook now takes the same `HydrationDrop` record the hydrate hook does (option-a), the example and the
acceptance suite moved to it, and `HydrationEvent.ts` joined the react mutation run.

## Decision applied

`_DECISIONS.md`, row "12-03 T1 (D-53-b/g)": **`option-a`** — "One `HydrationDrop` type for both ends (Breaking
dehydrate `onDropped`); `HydrationEvent.ts` joins the react Stryker run". All option-a branches of this plan were
taken; the option-b/option-c branches were not.

## Commits

| sha | subject |
|---|---|
| 4ec6800 | test(12-04): RED — one HydrationDrop shape for both ends' onDropped |
| e7faccc | feat(12-04): one HydrationDrop shape for both ends' onDropped |
| 8868c29 | test(12-04): RED — dehydrateDecisions throws on a policy the schema rejects |
| 36648c3 | fix(12-04): dehydrateDecisions is total — an unencodable policy is left out |
| 70a4dc1 | feat(12-04): callers and acceptance on the HydrationDrop hook; HydrationEvent.ts mutated |

## RED evidence (XC-06)

- 4ec6800: `tstyche packages/react/test/Hydration.tst.ts` — 2 failed, `Generic type 'HydrationDrop<A>' requires 1
  type argument(s). ts(2314)`.
- 8868c29: `vitest --project react HydrationEngine.test.ts -t "never throws"` — 5 failed with
  `SchemaError: Expected a finite number` (both `gte` probes and the two-reason test) and `SchemaError: Expected an
  integer` (depth 1.5 and the default-sentence test).
- The zero-entry refusal scenario passes on arrival; its RED is 12-03's 3c0daa4 (`expected +0 to equal 1`).

## Public-surface diff (for 12-05's gate-13 rows, upgrading.md and changesets)

- `@qadi/react` **Breaking**: `DehydrateOptions.onDropped` was `(dropped: ReadonlyArray<DecisionEntry>) => void`; now
  `HydrationDropReporter<DecisionEntry, DehydrationDropReason>` — called once per reason with
  `{ reason, entries, wholePayload: false }`. Migration: `(entries) => …` → `(drop) => …drop.entries…`.
- `@qadi/react`: `HydrationDrop<A>` → `HydrationDrop<A, R extends HydrationDropReason = ClientHydrationDropReason>`;
  `HydrationDropReporter<A>` → `HydrationDropReporter<A, R … = ClientHydrationDropReason>`. One-argument spellings
  are unchanged (pinned in `Hydration.tst.ts`).
- `@qadi/core`: `DehydrationDropReason` gains `"UnencodablePolicy"` (so `HydrationDropReason` does too);
  `hydrationDropReasons` 7 → 8 values; `hydrationDropMeaning("UnencodablePolicy")` added. A new key on
  `qadi_hydration_dropped_total`. An exhaustive consumer `switch`/`Match` over the reason union needs an arm.
- **No public export added or removed.** `DroppedEntriesReporter`/`droppedEntriesReporter` lived in
  `DeveloperSignals.ts`, which is out of the barrel and never re-exported by `Hydration.ts`, so their deletion is
  package-private. New package-private exports in `DeveloperSignals.ts`: `saysDehydrationDropped`,
  `saysHydrationDropped`.

## DeveloperSignal tag renamed (sentences verbatim)

`PayloadMixedSubjects { count }` → `DehydrationDropped { reason: DehydrationDropReason; count }`:

```
[qadi] dehydrateDecisions dropped ${count} decision(s): ${hydrationDropMeaning(reason).remedy}.
```

ForeignSubject: `[qadi] dehydrateDecisions dropped 1 decision(s): a payload mixing subjects has no safe reading, so
the others were discarded — check what fed this call.`
UnencodablePolicy: `[qadi] dehydrateDecisions dropped 1 decision(s): a policy built in code does not satisfy the
policy schema — a matcher bound that is not finite, or a relationship depth that is not an integer — so it cannot
cross the network. The entry was left out and the client will ask the question itself; fix the policy.`

(The old sentence began "…belonging to a different subject than the payload's. A payload mixing subjects…". The
module-private `sentence` capitaliser it used was deleted.) Meaning row: summary "a policy built in code that the
policy schema does not accept — a non-finite bound or a fractional depth", remedy as in the plan.

## Mutation scope

`packages/react/src/HydrationEvent.ts` **added** to `stryker.react.mjs`'s `mutate` (3 files; thresholds unchanged,
`HydrationEngine.ts` not added). `HydrationEvent.test.ts` gained LeftOut's `UnencodablePolicy` key and its zero-entry
count (vs `PayloadRefused`'s `max(1, n)`).

## Grep gates (all `/usr/bin/grep`)

- `droppedEntriesReporter|DroppedEntriesReporter|PayloadMixedSubjects` non-comment lines in `packages/react/src`
  (`… | /usr/bin/grep -vcE ':[0-9]+:[[:space:]]*(/\*|\*|//)'`): **9 → 0** (base measured on 1721a42 by `git show`).
- `encodeSync` non-comment lines in `packages/react/src`: **1 → 0**.
- `hydrationDropReasons` 7 → 8; `DehydrationDropReason` 1 → 2 members; `hydration-counts.feature` `Scenario:`
  15 → 17; `stryker.react.mjs` mutated files 2 → 3.

## Deviations

1. **[Rule 3 — blocker] `hydration-counts.feature`'s "all 7 drop reasons appear" → 8.** The eighth reason makes the
   existing scenario fail; the plan named the file but not this line.
2. **Resolver shape.** The plan said "make `hydrationDropReporter` generic in R" and "the default sentence is decided
   by the event tag, not by testing the reason string". A resolver cannot know the side from R at runtime, so it
   takes the default as a second argument (`byDefault`), and the engine hands each `HydrationHooks` slot its own
   default; the event tag picks the slot. Two small package-private defaults (`saysDehydrationDropped`,
   `saysHydrationDropped`) are exported from `DeveloperSignals.ts` for this. Not the lost wave's
   `serverDropReporter`/`clientDropReporter` rename (12-03 left those out).
3. **Example `onDropped` sum.** `/edge/mixed-payload` now sums `drop.entries.length` across calls, since the hook is
   called once per reason.

## Gate results

- Task 1 verify: `tstyche Hydration.tst.ts` 7/7, `vitest --project react packages/react/test` 396/396,
  `--project core` green, `pnpm typecheck`, `pnpm lint` (house-style 417 clean), `pnpm circular`: green.
- Task 2 verify: core `HydrationMetrics.test.ts` 22/22, react 401/401, devtools `model/Hydration.test.ts` 15/15,
  typecheck, lint, circular, `"UnencodablePolicy"` present, `encodeSync` non-comment 0: green.
- Task 3 verify: `pnpm --filter @qadi/example-nextjs typecheck` and `test` 42/42, `pnpm test:bdd` 565/565,
  `HydrationEvent.test.ts` 15/15, lint, stryker grep: green. Extra: `pnpm test:tstyche` 177/177.
- Mutation (XC-05): `pnpm exec stryker run stryker.config.mjs --mutate "…DecisionLog.ts,…DecisionStream.ts,…HydrationMetrics.ts"`
  and `pnpm exec stryker run stryker.react.mjs` (now 3 files), then `12-mutation-score.mjs compare`: **all ok** —
  `HydrationMetrics.ts` 100.00 → 100.00, `HydrationEvent.ts` 100.00 (32 killed, 1 timeout); react run 96.46
  (DecisionOutcome 100.00, QuestionBook 94.44, both untouched). The runs overwrote `reports/mutation/mutation.json`
  and `reports/mutation-react/mutation.json`.
- `pnpm spec:api` not run (known red until 12-05).

## Notes for 12-05

- Spec records: INT-03 (`dehydrateDecisions` total; `UnencodablePolicy`), the `onDropped` shape change (Breaking,
  upgrading.md entry), `DehydrationDropped` replacing `PayloadMixedSubjects` (ADR-QD-041's signal list),
  BEH-QD-232 (devtools shows the eighth key at zero, no source edit), `hydrationDropReasons` 8.
- Changesets: `@qadi/react` (Breaking `DehydrateOptions.onDropped`, `HydrationDrop`/`HydrationDropReporter` reason
  parameter), `@qadi/core` minor (`UnencodablePolicy`).
- Stryker for this phase runs in 12-05's final task; `stryker.react.mjs` now mutates `HydrationEvent.ts` by default.
