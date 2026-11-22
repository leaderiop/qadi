---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
verified: 2026-11-22T23:30:00Z
status: passed
score: 4/4 roadmap success criteria verified (13/13 goal-backward truths)
covered_files:
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-01-PLAN.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-01-SUMMARY.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-02-PLAN.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-02-SUMMARY.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-03-PLAN.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-03-SUMMARY.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-04-PLAN.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-04-SUMMARY.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-05-PLAN.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-05-SUMMARY.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-06-PLAN.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-06-SUMMARY.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-07-PLAN.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-07-SUMMARY.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-08-PLAN.md"
  - ".planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-08-SUMMARY.md"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/ExternalStore.ts"
  - "packages/devtools/test/model/DockModel.characterisation.test.ts"
  - "packages/devtools/test/model/DockModel.test.ts"
  - "packages/devtools/test/model/ExternalStore.test.ts"
  - "packages/devtools/test/model/ExternalStore.tst.ts"
covered_digest: "v4:sha256:494feb1383468611b6f5999cb5b36e4bd10b3eb53a47c743a9dceb616f011b4c"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 72: A derived store behind the dock model's stores Verification Report

**Phase Goal:** `ExternalStore` offers a store derived from parent stores that owns key equality, stopping after close and notifying once, so the dock model states only each computed store's key and compute function and a key field cannot be left out of a compare.
**Verified:** 2026-11-22
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1 | `makeDerivedStore` owns key equality over every own enumerable string-keyed key field through one generic `sameFields`; `K extends object & Required<K>` refuses an optional key field; `compute: (key: K) => A` refuses a read outside the key | VERIFIED | `ExternalStore.ts` `sameFields` compares `Object.entries` of both keys (a field on one side only counts as a change); signature is `K extends object & Required<K>`. `ExternalStore.tst.ts` pins three refusals (optional field, empty parent tuple, compute reading `key.other`), each beside a positive twin. `pnpm test:tstyche` passes in both passes (69 files, 370 tests) |
| 2 | Key committed only after compute returns; unchanged key runs nothing; one notify per moved key; same-reference compute notifies nothing | VERIFIED | `refresh`: `sameFields(held,next)` returns early, then `compute(next)`, then `held = next`, then `store.set(value)`. Tests: "a throwing compute commits nothing and the next trigger recomputes", "an unchanged key calls neither the compute nor any listener", "a compute that returns the held reference notifies nothing", "a listener that calls refresh during its notification hears it once" |
| 3 | Stops when its scope closes; finalizer is registered before parents are subscribed; releases every parent even when a release throws, then rethrows (one value as itself, more as `AggregateError`, shared with `notify` via `throwCollected`) | VERIFIED | Source order: `Effect.addFinalizer` precedes the `for (const parent ...) releases.push(parent.subscribe(refresh))` loop; `stopped` guards `refresh`; finalizer loops all releases in try/catch and calls `throwCollected`. `notify` calls the same `throwCollected`. Tests: "after the scope closes nothing is read or computed and each parent is released", "a parent whose subscribe throws leaves no earlier parent subscribed after close", "a release that throws leaves no later parent subscribed and fails the close", "two throwing releases fail the close with one AggregateError holding both" |
| 4 | ADR-QD-177 (every listener runs, rethrow after) holds for the derived store | VERIFIED | Store is built on `makeExternalStore`; tests "one throwing listener: the rest run and the parent rethrows that value" and "two throwing listeners: the rest run and the parent rethrows one AggregateError"; characterisation row for a throwing questions listener passes |
| 5 | Its rules are tested against `ExternalStore` alone | VERIFIED | `ExternalStore.test.ts` `describe("makeDerivedStore")` (693 lines added) uses only `makeExternalStore` parents, no `makeDockModel`; RED evidence on the base: 15 pass, 16 fail because the export was missing (`72-RED-EVIDENCE.md`) |
| 6 | `DockModel.ts` builds shownReading, questions and services with it; no `let last`, field-by-field key compare or `closed` flag remains | VERIFIED | Three `makeDerivedStore` calls at lines 217, 236, 250; `/usr/bin/grep` for `closed`, `last[A-Z]` and `===` finds only `merged === key.fed.reading` (the merge's own identity check inside the compute, not a key compare); the only `let`s are `inputs`, `shown`, `rail` (model inputs, not last keys). Diff shows `fed`, `supplied`, `lastJoin`, `lastServices`, `closed`, `rejoin`, `reservice`, `remerge` removed |
| 7 | `DockModel.test.ts` keeps one test per store showing its key and its order relative to host listeners (assertions, not titles) | VERIFIED | "the diagnostics store moves once per key field and not for gates or questions" (the supplied-reading row asserts `told` equals the new activity: a host listener reads the merged snapshot); "the questions store moves once per key field" with J1 asserting a host listener on the registry and on diagnostics reads a joined snapshot; "the services store moves once per key field" (`heardAfter` asserts a diagnostics listener reads the new wiring state). Each asserts counts per key field with `assert.strictEqual(..., 1/0, row.field)` |
| 8 | Characterisation `DockModel.characterisation.test.ts` (first commit 66ba2bdf, 15 rows) holds its inputs and expected values and passes | VERIFIED | 15 `it` rows. Diff since 66ba2bdf changed only: a title reworded ("a guard, two moving configures and a repeat ..."), shared helper imports, and the close row's single summed counter split into three per-store counters (strictly stronger, same expected 0). No expected value changed. Recorded green on the base (`72-RED-EVIDENCE.md`: 15 passed on 74f631ad). Passes now |
| 9 | Stryker: `DockModel.ts` score 1 and `ExternalStore.ts` not below base | VERIFIED | `72-mutation.mjs compare` exits 0: DockModel.ts 114/114 -> 70/70, survived 0 -> 0; ExternalStore.ts 41/42 -> 77/78, survived 1 -> 1 (the base's own `sameElements` survivor); no new open mutant. One new Ignored mutant (the static span-name `StringLiteral ""`) is covered by the examined table and killed by hand with `ignoreStatic: false` (79 Killed, 1 Survived, per orchestrator). The base was written by `0df84562`, the first commit after the phase base, before any source change. Stryker not re-run here by instruction |
| 10 | Spec text present, consistent with code, store count stated once, says plainly what compiler and tests enforce | VERIFIED | ADR-QD-185 Rev 1.2 (decisions 3, 7, 9, 10); BEH-QD-696..700; INV-QD-389/390; CCR-QD-464 row in `spec/README.md` cites matching revisions (185 Rev 1.2, 047 Rev 1.21, 162 Rev 1.7, 168 Rev 1.2, 169 Rev 1.2, behaviours 1.51, invariants 1.180, traceability 1.254), each equal to the document's own header. Dated amendment notes on ADR-047/162/168/169; earlier ordinals preserved as history. BEH-QD-700 is the one live statement of the count (nine members); BEH-QD-700's list equals the members the store-list test asserts and the `DockModel` interface. ADR-185 decision 3 and the `makeDerivedStore` doc comment say the compiler refuses optional fields, an empty parent list and an out-of-key read, tests pin per-field recompute, and that a compute closing over outside state is checked by neither; the store-list/BEH-QD-700 equality is stated as kept by review, not by a gate |
| 11 | No new export reached the devtools barrels (check-api-surface 941) | VERIFIED | `node scripts/check-api-surface.mjs`: 941 exports documented; no diff to the devtools barrels or `spec/overview.md` since the base |
| 12 | The React panels' change is type-only (`ReadableStore`) | VERIFIED | `QuestionsPanel.tsx`, `ServicesPanel.tsx`, `useStoreSnapshot.ts`: only `import type` and the prop/parameter type changed from `Pick<ExternalStore<A>, ...>` to `ReadableStore<A>` |
| 13 | WX-01..07 contribution | VERIFIED (contribution) | WX-01: `pnpm check:pr` exit 0 at ed8d487f (orchestrator, 17 of 18, mutation skipped by design). WX-02: ADR-185, CCR-464, BEH-696..700, INV-389/390 only, reserved numbers. WX-03: no export added or removed, gate 13 at 941. WX-04: added lines hold no `as` cast, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, ambient `console`/`process.env`, `Record<string, unknown>` or `Stryker disable` (scan of the added lines; the only matches were the words "as" and "await" in comments and `import * as`); `house-style` 571 files clean; no negative pin added so no budget moved. WX-05: mutation compare exit 0, no drop that loses a non-killed mutant. WX-06: characterisation green on base, the closed-model regression RED on base (`a model whose scope closed merges no reading a later configure hands it` fails on 74f631ad), derived-store rules RED on base (16 fail), type pins RED on base. WX-07: no D-number, plan id, requirement id or phase number in added source or test lines; only ADR/BEH/CCR citations as the house rules allow. Nothing released. WX-01..07 stay Pending in REQUIREMENTS.md as designed |

**Score:** 13/13 truths verified, 0 present-but-behavior-unverified.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/devtools/src/model/ExternalStore.ts` | `makeDerivedStore`, `sameFields`, `throwCollected`, `ReadableStore`, `DerivedStore`, `Parent` | VERIFIED | substantive, wired (used by `DockModel.ts` and the three panel type imports) |
| `packages/devtools/src/model/DockModel.ts` | three stores on `makeDerivedStore`; module-scope `mergedOf` and `MergeKey` | VERIFIED | wired; `configure` calls `shownReading.refresh()` |
| `packages/devtools/test/model/ExternalStore.test.ts` | derived-store rules against `ExternalStore` alone | VERIFIED | 16 derived-store tests plus the span test |
| `packages/devtools/test/model/ExternalStore.tst.ts` | negative type pins with positive twin | VERIFIED | passes under both tstyche passes |
| `packages/devtools/test/model/DockModel.test.ts` | one key test per store plus store-list test | VERIFIED | |
| `packages/devtools/test/model/DockModel.characterisation.test.ts` | 15 rows from the base | VERIFIED | |
| `spec/decisions/185-...md`, BEH-QD-696..700, INV-QD-389/390, CCR-QD-464 | records | VERIFIED | |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `DockModel.ts` shownReading | diagnostics feed | `parents: [diagnosticsFeed]` | WIRED |
| `DockModel.ts` questions | gates feed, shownReading | `parents: [gatesFeed, shownReading]`, built after both and before any host listener | WIRED |
| `DockModel.ts` services | shownReading | `parents: [shownReading]` | WIRED |
| `configure` | shownReading | `shownReading.refresh()` replaces the hand `remerge` | WIRED |
| `DerivedStore` finalizer | parents | registered before `parent.subscribe(refresh)`; releases all, rethrows collected | WIRED |

### Data-Flow Trace (Level 4)

Not applicable beyond the key links: the stores' values come from the compute functions `mergedOf`, `joinQuestions` and `portCards` over the live feeds' snapshots, not from static values.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Derived-store rules, dock model, characterisation, gates feed | `pnpm exec vitest run --project devtools` on `ExternalStore.test.ts`, `DockModel.test.ts`, `DockModel.characterisation.test.ts`, `GatesFeed.test.ts` | 4 files, 145 tests passed | PASS |
| Type pins | `pnpm test:tstyche` | 69 files, 370 passed, 2 skipped (both passes) | PASS |
| House style | `node scripts/check-house-style.mjs` | 571 files clean | PASS |
| API surface | `node scripts/check-api-surface.mjs` | 941 exports documented | PASS |
| Mutation record | `node .../72-mutation.mjs compare` | exit 0 | PASS |

### Probe Execution

No phase-declared probe scripts; SKIPPED.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| DERV-01 | Characterisation written on the base, stays green | SATISFIED | Truth 8 |
| DERV-02 | Derived store owns key equality, stop after close, notify once, ADR-QD-177 holds | SATISFIED | Truths 1-4 |
| DERV-03 | `DockModel.ts` builds its three stores with it; no `let last`, field compare or `closed` flag | SATISFIED | Truth 6 |
| DERV-04 | Rules tested against `ExternalStore` alone; one dock test per store | SATISFIED | Truths 5, 7 |
| DERV-05 | Stryker scores kept; ADR-QD-185 extends 168 and states the count once | SATISFIED | Truths 9, 10 |
| WX-01..WX-07 | Cross-cutting, milestone-wide | Contribution verified; stay Pending until the milestone closes | Truth 13 |

No orphaned requirements: REQUIREMENTS.md maps DERV-01..05 to Phase 72 and all appear in the plans.

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX` markers in the changed files; no stubs; `let held`/`let stopped` are function-local, so the module-state budget is untouched.

### Deferred Items

None.

### Human Verification Required

None. Every truth is covered by a passing test, type pin, gate or record check. The one item the spec says is not machine-enforced (the store list in `DockModel.test.ts` equals BEH-QD-700, kept by review) is stated plainly in ADR-QD-185 and BEH-QD-700 and was checked by hand here: the nine names match.

### Gaps Summary

No gaps. Notes, none blocking: (1) ExternalStore.ts's recorded close shows one more Ignored mutant than the base (the static span-name string literal); the comparison script admits it only because the by-hand `ignoreStatic: false` run killed it. (2) The shown reading now stops after close, an intentional behaviour change recorded in ADR-QD-185 decision 7, pinned by a regression test that was RED on the base. (3) Coverage and the full 17-step gate rest on the orchestrator's `pnpm check:pr` run at ed8d487f; only `.planning` files changed after it (confirmed: no `packages`, `spec` or `scripts` diff between ed8d487f and HEAD).

---

_Verified: 2026-11-22_
_Verifier: Claude (gsd-verifier)_
