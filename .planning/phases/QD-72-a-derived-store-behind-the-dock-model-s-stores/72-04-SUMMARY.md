---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
plan: 04
subsystem: devtools
tags: [derived-store, external-store, type-pins, readable-store]

requires:
  - phase: 72-02
    provides: "the derived store's 16 rules and 4 type pins, committed red"
  - phase: 72-03
    provides: "ADR-QD-185 and the CCR-QD-464 row predicting 28-devtools-screens.md's revisions"
provides:
  - "makeDerivedStore, DerivedStore, Parent and the private sameFields in ExternalStore.ts"
  - "ReadableStore, the one name for the read half of a store, at five source sites and in the BEH-QD-465 and BEH-QD-583 listings"
  - "each type guarantee of the constructor gutted once and shown failing"
affects: [72-05, 72-06, 72-07, 72-08]

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_before: 5d24fd76befefbe052d65ff3f7937bdd48107431
plan_head_after: 13820f4fc394b779fe19e10297c9fd36c78db115

actuals:
  tokens: 5800
  tasks: 3
  commits: 3

revisions-reached:
  "spec/behaviors/28-devtools-screens.md": "1.41"

tech-stack:
  added: []
  patterns:
    - "a module-private function declaration (not a const arrow) for a helper whose own mutants must stay live"
    - "a generic Effect.fn over K extends object & Required<K> to make the compiler refuse an optional key field"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/ExternalStore.ts
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/src/react/ServicesPanel.tsx
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/src/react/useStoreSnapshot.ts
    - packages/devtools/test/model/ExternalStore.tst.ts
    - spec/behaviors/28-devtools-screens.md
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-RED-EVIDENCE.md

key-decisions:
  - "The empty-parent-list type pin takes a plain `() => 0` compute: once the parents refusal fails the call, a context-sensitive compute leaves `A` as `unknown` and the positive `expect` fails before the refusal is read"

requirements-completed: []  # DERV-02, DERV-04, WX-04, WX-06, WX-07 stay Pending by instruction; only 72-08 marks requirements

duration: ~30min
completed: 2026-11-22
status: complete
---

# Phase 72 Plan 04: The derived store built, the read half named once Summary

**`makeDerivedStore({ parents, key, compute })` in ExternalStore.ts, green against its 31-test file and four type pins, with `ReadableStore` naming the read half everywhere and each type guarantee shown failing when gutted.**

## Accomplishments

- `makeDerivedStore` is a scoped `Effect.fn("qadi.devtools.makeDerivedStore")` over `K extends object & Required<K>` and `A`: parents are a non-empty tuple, the key is a thunk, compute runs once at build without notifying, then on a changed key as compute, commit the key, `set`. Parents are subscribed in listed order at construction; a scope finalizer marks it stopped and releases every parent. `sameFields` is a function declaration comparing the union of both keys' fields by `===`. The doc comment states the compiler / test / neither split of D-03 and points at the listener contract.
- `ReadableStore<A>` (subscribe, getSnapshot) now backs `ExternalStore`, `DerivedStore` and `Parent`; DockModel, ServicesPanel, QuestionsPanel, useStoreSnapshot and the two spec listings use it, and `git grep -n "Pick<ExternalStore<" -- packages/devtools spec` prints nothing. `28-devtools-screens.md` is at 1.41, which the CCR-QD-464 row (final 1.44) predicts as an intermediate step.
- Each type guarantee was gutted once and reverted: without `Required<K>` the optional-field pin fails (unused directive, TS2578, line 44); with `ReadonlyArray<Parent>` the empty-list pin fails (line 53); with a widened compute key the outside-field pin fails (line 65, message mismatch). Evidence is in 72-RED-EVIDENCE.md.

## Verification

- Task verifies: all three exit 0 (Task 1 and Task 3 verified after the commits).
- `ExternalStore.test.ts`: 31 passed, 0 failed. `pnpm test:tstyche ExternalStore`: passes in both passes. `pnpm typecheck`: clean. House-style: 571 files clean, 69 type-test files. oxlint clean.
- Devtools project: 1705 tests, 1704 passed; the single failure is the closed-model regression `a model whose scope closed merges no reading a later configure hands it`, which 72-05 turns green.
- `doc-examples`, `spec-revise --check` and the strict traceability check (PASS 21, FAIL 0) pass.
- No Stryker, no `pnpm check:pr`, no barrel change (root export count and `spec/overview.md` untouched).

## Deviations from Plan

**1. [Rule 1 - Bug] Empty-parent-list type pin compute**
- **Found during:** Task 1
- **Issue:** with the refusal on `parents: []`, the call's `A` inferred as `unknown` because the compute `(key) => key.a.length` is context-sensitive, so `expect(built).type.toBe<Expected>()` failed on `DerivedStore<unknown>` instead of reading the suppressed refusal.
- **Fix:** that pin's compute is now `() => 0`, as in the optional-field pin; directive and fragment unchanged. The plan allowed only a fragment change; this is the one other test edit, and it narrows nothing the pin refuses.
- **Files modified:** packages/devtools/test/model/ExternalStore.tst.ts
- **Commit:** 7b534b6e

**2. [Verification-only] Task 1 forbidden-construct regex**
- The plan's grep `[[:space:]]as [A-Za-z{]` matches `import * as Effect`, a namespace import the house rules require. The equivalent check, excluding import lines, found no forbidden construct. No gate was weakened.

**3. [Verification-only] Evidence commit amended once**
- The evidence's `31 passed, 0 failed` was wrapped across a line, so Task 3's grep missed it; the line was rejoined and the (unpushed) docs commit amended.

**Total deviations:** 1 auto-fixed (test), 2 verification-only. **Impact:** none on scope; no fragment of a `@ts-expect-error` changed ("No fragment changed.").

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- ExternalStore.ts, ExternalStore.tst.ts, the four source files, the spec and the evidence exist and are committed; commits 7b534b6e, b5daf1bf and 13820f4f are ancestors of HEAD, and `git status --porcelain -- packages scripts spec .changeset` is empty.
