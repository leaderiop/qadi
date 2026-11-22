---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
reviewed: 2026-11-22T23:30:00Z
depth: standard
iteration: 2
files_reviewed: 24
files_reviewed_list:
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/ServicesPanel.tsx
  - packages/devtools/src/react/useStoreSnapshot.ts
  - packages/devtools/test/dockModelFixtures.ts
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
  info: 5
  total: 6
  necessity: 0
status: issues_found
---

# Phase QD-72: Code Review Report (iteration 2)

**Reviewed:** 2026-11-22
**Depth:** standard
**Files Reviewed:** 21 (the three React panels and hooks count as one rename)
**Status:** issues_found

## Summary

All 12 findings of iteration 1 are fixed correctly and completely. I re-verified each against source rather than the fix
report, and I ran the gates that bear on this change. Results: `check-house-style.mjs` clean (571 files), the devtools model
vitest suite 1326/1326, `run-tstyche.mjs` green in both passes (69 files, 807 assertions, 71 suppressed matched),
`tsc -p tsconfig.test.json` clean, `spec:verify:strict` 21/21, `spec:examples` 118 blocks compile, and `oxlint` reports
nothing in any phase file.

What I checked and found sound:

- `sameFields` is exactly own enumerable string-keyed identity. `Object.entries` plus a `Map` has no cast, handles a
  field present on one side only, and treats `undefined` versus absent as a change. The three new rows can each fail for the
  reason their title names. The "gains/loses/swaps" rows kill the `has` check, and the inherited row exercises a key whose
  prototype carries an enumerable field.
- The finalizer is registered before the parents are subscribed, and the throwing-`subscribe` test proves close releases the
  earlier parent. The effect dies, so no half-built store is ever returned.
- Each negative pin in `ExternalStore.tst.ts` differs from its twin in one thing. `WithOptional` now differs from `Three`
  only by the `?`, and the `@ts-expect-error` fragments (`is optional in type`, `but target requires 1`,
  `does not exist on type`) are the reasons the pins name. The annotations stop the refusals from passing through an
  `unknown` result.
- No `as`, `!`, `any`, `switch` or `Record<string, unknown>` in anything the phase wrote. No phase-written code line is
  past 90 columns (measured by character).
- Every "Pinned by" title quoted in BEH-QD-696 to BEH-QD-700 exists verbatim in the test files. The CCR-QD-464 row's cited
  revisions equal each document's header (185 at 1.1, 047 at 1.21, 162 at 1.7, 168 at 1.2, 169 at 1.2, BEH-28 at 1.46,
  invariants 1.179, traceability 1.252, README 1.292), and its file list equals the phase's changed files.
- No duplicate of a moved helper remains in the devtools tests. The same-named `logOf`, `activityOf`, `rowOf` and `guard`
  elsewhere differ in shape or value, and `Gates.test.ts`'s `askingIds` returns a different type.

One warning remains (the spec text for the finalizer change is not exact), and five small cleanliness items.

## Warnings

### WR-01: BEH-QD-698, ADR-QD-185 decision 7 and INV-QD-389 do not state what the finalizer does exactly

**File:** `spec/behaviors/28-devtools-screens.md:2813-2832` (BEH-QD-698), `spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md` (decision 7), `spec/invariants.md` (INV-QD-389)
**Issue:** Three statements differ from what `ExternalStore.ts:174-181` does.

1. The BEH-QD-698 requirement says the store MUST "keep its last snapshot, including when a parent's `subscribe` threw
   while the store was being built". A store whose `subscribe` threw is never returned: `makeDerivedStore` dies, so there is
   no store and no snapshot to keep. The clause cannot be observed, and the requirement reads as though a usable store
   exists after a failed build.
2. The sentence "a store that failed to build leaves nothing subscribed" is only true once the scope has closed. Until
   then every parent before the throwing one is still subscribed. The test pins exactly this (`heldBefore` is 1, then 0
   after close). ADR-QD-185 decision 7 words it correctly ("released when the scope closes"), so the two texts disagree.
3. None of the three says what a release that throws does, which the owner brief required them to state. The code loops
   `for (const release of releases) release()` inside one `Effect.sync`. A throwing release aborts the loop, so the parents
   after it stay subscribed, and the throw surfaces as a defect from `Scope.close`. The code comment and `ReadableStore`'s
   doc say "must not throw", but the spec is silent. Elsewhere BEH-QD-638 and `GatesFeed` swallow a release that throws, so
   a reader of the spec would assume the same here.

**Fix:** Split the requirement and state the precondition.
```
REQUIREMENT: After the scope that built a derived store closes, it MUST read no key, call
             no compute, release every parent, ignore `refresh` and keep its last snapshot.
REQUIREMENT: When a parent's `subscribe` throws while the store is being built, the build
             MUST fail with that throw as a defect and return no store, and closing the
             scope MUST release every parent subscribed before it.
```
Add one sentence to the prose and to ADR decision 7: "A parent's release is not guarded. One that throws stops the
releases after it and fails the close, so a parent's `subscribe` must return a release that cannot throw; every parent here
is an `ExternalStore`, whose release is a `Set` delete." Reword "leaves nothing subscribed" to "leaves nothing subscribed once
the scope closes". Bump the revisions through `spec-revise.mjs` and re-cite them in the CCR-QD-464 row.

## Info

### IN-01: `sameFields` doc comment is ungrammatical and words the exclusion differently from the spec

**File:** `packages/devtools/src/model/ExternalStore.ts:122-123`
**Issue:** "An inherited, a non-enumerable and a symbol-keyed field is not compared." The singular verb with three subjects
reads as a typo. ADR-QD-185 decision 2, BEH-QD-696 and INV-QD-389 all say "A field that is inherited, non-enumerable or
symbol-keyed is not part of the key and is not compared", so the source is the one place that words it differently.
**Fix:** "A field that is inherited, non-enumerable or symbol-keyed is not part of the key and is not compared."

### IN-02: the fixtures header understates its readers, and `heardOn` is not a dock fixture

**File:** `packages/devtools/test/dockModelFixtures.ts:1-7`, `packages/devtools/test/model/ExternalStore.test.ts:8`
**Issue:** The header says `DockModel.test.ts` and the characterisation share these fixtures. `GatesFeed.test.ts` imports
`guard` and `tick`, and `ExternalStore.test.ts` imports `heardOn`. `heardOn` depends only on `Parent`, nothing of the dock.
A unit test of the package-private store primitive importing from a file named for the dock model, which pulls in
`DiagnosticsStore`, `Wiring`, `PortCards` and `DockModel`, couples the lowest-level test to the highest-level fixtures.
**Fix:** Name the real readers in the header ("the dock model's tests, the gates feed's and the store's"), or move
`heardOn` to `test/helpers.ts` beside `settleTurns` and `thrownBy` and have `heardOf` import it from there.

### IN-03: the closing-scope characterisation hand-rolls the counter `heardOn` replaced

**File:** `packages/devtools/test/model/DockModel.characterisation.test.ts:366-392`
**Issue:** This phase moved every other hand-written counter into `heardOn`, but this test keeps `const heard = { calls: 0 }`
and a `hear` closure subscribed to three stores. It is the same pattern the duplication fix removed.
**Fix:** Use `heardOn(model.diagnostics)`, `heardOn(model.questions)` and `heardOn(model.services)`, and assert each
`.calls` is 0 (this also names which store notified when it fails).

### IN-04: the store-list test pins the returned literal's insertion order, and BEH-QD-700's claim about order is not true of the spec's own listing

**File:** `packages/devtools/test/model/DockModel.test.ts:1753-1778`, `spec/behaviors/28-devtools-screens.md` (BEH-QD-700 prose, BEH-QD-465 listing)
**Issue:** The test compares `Object.entries(model)` order with `deepStrictEqual`, so reordering the returned object literal
in `DockModel.ts` fails it while the member set is unchanged. BEH-QD-700 says the nine are listed "in the order `DockModel`
lists them". The source interface and literal do list them that way (`timeline`, `dock`, `explorer`, `roles`, `simulation`,
`diagnostics`, ...). The `DockModel` block in BEH-QD-465 of the same document lists `diagnostics`, `timelineStatus`,
`questions` and `services` before `dock`.
**Fix:** Compare sorted names (`stores.toSorted()` against the sorted list, or an `assert.sameMembers`), so the test fails
for a member added or removed and for nothing else. Say "in the order the source interface lists them", or drop the order
claim from BEH-QD-700.

### IN-05: one spec line the phase wrote is not wrapped, and one rewrapped test header keeps phase-relative wording

**File:** `spec/behaviors/28-devtools-screens.md:2832` (BEH-QD-698), `packages/devtools/test/model/DockModel.test.ts:8`
**Issue:** BEH-QD-698's last "Pinned by" line is 150 columns, while the paragraph above it and the other `Pinned by`
paragraphs in this phase wrap at about 120. `DockModel.test.ts`'s header still says "Until now those rules lived in layout
effects"; the phase rewrapped that paragraph and left a phase-relative phrase in it.
**Fix:** Wrap the BEH-QD-698 line at the file's width. Reword the header to "Those rules once lived in layout effects and
were proved only by rendering the whole dock", or drop the sentence.

---

_Reviewed: 2026-11-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
