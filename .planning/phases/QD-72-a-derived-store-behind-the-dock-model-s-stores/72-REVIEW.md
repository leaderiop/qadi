---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
reviewed: 2026-11-22T23:55:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/ServicesPanel.tsx
  - packages/devtools/src/react/useStoreSnapshot.ts
  - packages/devtools/test/dockModelFixtures.ts
  - packages/devtools/test/helpers.ts
  - packages/devtools/test/model/DockModel.characterisation.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/ExternalStore.test.ts
  - packages/devtools/test/model/ExternalStore.tst.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md
  - spec/decisions/168-a-port-card-is-a-model-row.md
  - spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md
  - spec/decisions/index.yaml
  - spec/behaviors/28-devtools-screens.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 1
  info: 6
  total: 7
status: issues_found
---

# Phase QD-72: Code Review Report

**Reviewed:** 2026-11-22
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Iteration 3. The source is correct and the iteration 1 and 2 fixes hold. What I verified rather than read:

- `throwCollected` keeps `notify` as it was at the phase base: the same `if` ladder moved out whole, the same message string `"More than one of the store's listeners threw."`, the same order. The finalizer's release loop runs every release and rethrows through the same function.
- Both new finalizer tests fail for the reason their titles name. The first needs the loop to keep going past a throwing release, the second needs the `AggregateError` and its fixed message.
- Run in a scratch script against the installed `effect`: a throw inside the `Effect.fn` generator and a throw inside the `Effect.sync` finalizer are both defects (`Cause.hasDies` true for each). BEH-QD-698, ADR-QD-185 decision 7, INV-QD-389 and the doc comment state that correctly.
- `ReadableStore.subscribe` says its release must not throw. Every parent of the dock's three stores is a feed view over an `ExternalStore` or a no-op, so that holds.
- The helper move is clean. `heardOn`, `guard` and `tick` are each defined once, in `helpers.ts`. `GatesFeed.test.ts` and `ExternalStore.test.ts` import only from `helpers.ts`. `dockModelFixtures.ts` has two readers and its header says so. I found no dead export and no leftover local copy of a moved helper.
- The store-list test uses `assert.sameMembers`, so it still fails on an added or removed store. BEH-QD-700 and INV-QD-390 claim membership only.
- Every title quoted in a "Pinned by" or Enforcement paragraph for BEH-QD-696 to BEH-QD-700 and INV-QD-389 and INV-QD-390 exists verbatim in a test file (checked by script).
- The CCR-QD-464 row cites each document at the revision its header carries (185 at 1.2, 047 at 1.21, 162 at 1.7, 168 at 1.2, 169 at 1.2, 28 at 1.48, invariants at 1.180, traceability at 1.252, README at 1.295), and its file list equals `git diff --name-only` for the phase, with one punctuation slip (IN-05).
- No `as`, `!`, `any`, `switch` or `Record<string, unknown>` was added.
- `tsc -p tsconfig.test.json`, `pnpm lint` (the house-style script reports 571 files clean), `spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:api` and `spec:examples` pass.
- `vitest` on `packages/devtools/test/model` failed in one test on its first run (a `FastCheck.sample` simulation test, nothing the phase touched) and passed fully on the second.

One test does not pin a requirement that the spec text attaches to it (WR-01). The rest is polish: test-file duplication, two over-long title lines, a title that claims more than it checks, an incomplete traceability row, a punctuation slip in the change register, and one spec clause pinned for two of its three cases.

## Warnings

### WR-01: the build-failure test does not pin that the build fails with the parent's throw, as a defect

**File:** `packages/devtools/test/model/ExternalStore.test.ts:830-857`
**Issue:** BEH-QD-698's second requirement, ADR-QD-185 decision 7, INV-QD-389 and the `makeDerivedStore` doc comment all say that a parent whose `subscribe` throws while the store is built "fails the build with that throw as a defect". The only test listed for it, "a parent whose subscribe throws leaves no earlier parent subscribed after close", asserts `Exit.isFailure(exit)`. A build that failed for another reason (a typed failure, a wrapped error, a different throw) passes it. The sibling release tests do pin identity through `Cause.squash`, so the asymmetry is visible. The requirement is stated precisely and the owner asked for the build-failure-is-a-defect claim to be stated exactly, so it should be pinned as exactly.
**Fix:** After `const exit = yield* Effect.exit(...)`, add:
```ts
assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
assert.strictEqual(Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined, refused);
```
The title can stay as it is, since three documents quote it. If the title should name what it now pins, change it and the BEH-QD-698 "Pinned by" paragraph together.

## Info

### IN-01: two test-title lines the phase wrote are past 90 columns

**File:** `packages/devtools/test/model/ExternalStore.test.ts:862` (99 characters) and `:895` (91 characters)
**Issue:** Both are string literals that cannot be wrapped, so they read as over-width lines. The first is "a parent whose release throws leaves no later parent subscribed, and the close fails with it". The second is "two parents whose release throws fail the close with one AggregateError holding both". BEH-QD-698 quotes both verbatim, and the rest of the phase's code is within 90.
**Fix:** Shorten both and change the BEH-QD-698 "Pinned by" paragraph with them. For example "a release that throws leaves no later parent subscribed and fails the close" (74 plus indent and quotes) and "two throwing releases fail the close with one AggregateError holding both" (73 plus indent and quotes).

### IN-02: the one-wiring reading and the hydration literal are written three times across the two files that share `dockModelFixtures.ts`

**File:** `packages/devtools/test/model/DockModel.characterisation.test.ts:49-53` (`oneReading`), `packages/devtools/test/model/DockModel.test.ts:1661` and `:1701-1705` (the same three fields inline, the second inside `heardAfter`), and the hydration literal at `DockModel.test.ts:1684` and `DockModel.characterisation.test.ts:227`
**Issue:** `{ wiring: wiringNamed("one"), activity: activityOf(1), portCalls: logOf("tier") }` is stated as `oneReading()` in one file and twice inline in the other. The `HydrationActivity` literal `{ dehydrated: 2, seeded: 1, rechecked: 0, mismatched: 0, drops: [] }` is stated once in each file. `dockModelFixtures.ts` exists so that "a fixture fixed in one file is fixed in the other" (its own header), and these are the fixtures it was made for. The phase reduced seven inline copies to three, but left the helper in the wrong file.
**Fix:** Move `oneReading` into `dockModelFixtures.ts` (exported), use it at `DockModel.test.ts:1661` and in `heardAfter`, and export the hydration literal beside it as `suppliedHydration`.

### IN-03: the questions and services store titles claim an order that one row of three checks

**File:** `packages/devtools/test/model/DockModel.test.ts:1442` and `:1748`
**Issue:** Both titles end "..., before a diagnostics listener". In each test only one row reads the store from inside a `model.diagnostics` listener: "the supplied questions" for the questions store (the `told` array) and "the wiring" for the services store (`heardAfter`'s `state` argument). The gates-feed, unsampled-flag, activity and call-log rows do not check order. Order is pinned elsewhere (J1, and the characterisation rows), so nothing is unpinned, but the titles overstate what the loop asserts.
**Fix:** Name the claim as the loop holds it ("moves once per key field, and reads joined to a diagnostics listener for a supplied-questions change"), or drop "before a diagnostics listener" from both titles and BEH-QD-699's "Pinned by" paragraph and rely on J1 and the characterisation order row for it.

### IN-04: the traceability row for `ExternalStore.test.ts` does not name the two new finalizer tests

**File:** `spec/traceability.md:551`
**Issue:** The row's last clause reads "after the scope closes nothing is read or computed and every parent is released, even when a later parent's `subscribe` threw". Iteration 2 added two tests for a release that throws (one value as itself, more than one as an `AggregateError`) and rewrote BEH-QD-698, INV-QD-389 and ADR-QD-185 decision 7 to say so. The row was not restated, so the map from test file to requirement is one rule behind the spec.
**Fix:** Append "; and a release that throws leaves no later parent subscribed and fails the close with what was thrown, one value as itself, several as one `AggregateError`", and bump `spec/traceability.md` and `spec/README.md` (the CCR-QD-464 row cites traceability at Rev 1.252).

### IN-05: the CCR-QD-464 file list lacks a separator

**File:** `spec/README.md:401`
**Issue:** The list ends "... `packages/devtools/test/model/GatesFeed.test.ts` `packages/devtools/test/dockModelFixtures.ts` and `packages/devtools/test/helpers.ts`". There is an "and" before `GatesFeed.test.ts` and none between it and `dockModelFixtures.ts`, so the items run together. The membership is correct (it equals the phase's changed files).
**Fix:** Join the whole tail with commas and one final "and": "..., `.../GatesFeed.test.ts`, `.../dockModelFixtures.ts` and `.../helpers.ts`". Bump `spec/README.md`'s revision with the change.

### IN-06: the spec says an inherited field is not compared, but the tests pin that only for its non-enumerable and symbol-keyed siblings

**File:** `packages/devtools/test/model/ExternalStore.test.ts:516-539` and `:540-570`, against BEH-QD-696 and INV-QD-389
**Issue:** BEH-QD-696 says a field that is "inherited, non-enumerable or symbol-keyed is not part of the key and is not compared: a key whose only such field differs recomputes nothing". The non-enumerable and symbol-keyed halves are pinned by a key whose such field moves between reads. The inherited half is pinned only by "a key with an inherited enumerable field compares equal to itself", which returns the same object each time. It is a good regression for the old `for...in` defect, but any comparison that is reflexive passes it, including one that does compare an inherited field. A key whose inherited field differs between reads is not tested.
**Fix:** Give the non-enumerable row a third field, inherited from a prototype that changes with `moved` (`Object.create({ inheritedField: moved })` with `shown: 1` own), or add one row, and assert `computed === 1` and `heard.calls === 0`. Then retitle the row "... differing only in an inherited, non-enumerable or symbol-keyed field does not recompute".

---

_Reviewed: 2026-11-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
