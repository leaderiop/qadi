---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
fixed_at: 2026-11-22T23:59:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-REVIEW.md
iteration: 3
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase QD-72: Code Review Fix Report

**Fixed at:** 2026-11-22
**Source review:** 72-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### WR-01: the build-failure test does not pin that the build fails with the parent's throw, as a defect

**Files modified:** `packages/devtools/test/model/ExternalStore.test.ts`
**Commit:** 0424b463
**Applied fix:** the test now asserts the failed exit has a die in its cause and that the squashed cause is the thrown value, beside the existing release assertions. The title is unchanged, so the three documents that quote it need no edit.

### IN-01: two test-title lines the phase wrote are past 90 columns

**Files modified:** `packages/devtools/test/model/ExternalStore.test.ts`, `spec/behaviors/28-devtools-screens.md` (Rev 1.49), `spec/README.md` (Rev 1.296)
**Commit:** ad37d425
**Applied fix:** the titles are now "a release that throws leaves no later parent subscribed and fails the close" and "two throwing releases fail the close with one AggregateError holding both". BEH-QD-698's "Pinned by" paragraph quotes the new titles; the CCR-QD-464 row cites the new revisions.

### IN-02: the one-wiring reading and the hydration literal are written three times

**Files modified:** `packages/devtools/test/dockModelFixtures.ts`, `packages/devtools/test/model/DockModel.test.ts`, `packages/devtools/test/model/DockModel.characterisation.test.ts`
**Commits:** 537ab31d (fixtures and `DockModel.test.ts`), 1754eda3 (the characterisation file, helper-only, in its own commit)
**Applied fix:** `oneReading` and `suppliedHydration` are exported from `dockModelFixtures.ts` once. `DockModel.test.ts` uses `oneReading()` at the M54 row and in `heardAfter`, and `suppliedHydration` in the services rows. The characterisation file drops its local `oneReading` and its inline hydration literal and imports both. No row input or expected value changed.

### IN-03: the questions and services store titles claim an order that one row of three checks

**Files modified:** `packages/devtools/test/model/DockModel.test.ts`, `spec/behaviors/28-devtools-screens.md` (Rev 1.50), `spec/traceability.md` (Rev 1.253), `spec/README.md` (Rev 1.297)
**Commit:** 72500272
**Applied fix:** the order cannot be expressed in every row (the gates-feed row and every quiet row never move the diagnostics store, so no diagnostics listener runs), so both titles now claim only what the loop holds: "the questions store moves once per key field" and "the services store moves once per key field". The two in-row order assertions stay. The titles are updated in BEH-QD-615's and BEH-QD-699's "Pinned by" paragraphs and in the `DockModel.test.ts` traceability row.

### IN-04: the traceability row for `ExternalStore.test.ts` does not name the two new finalizer tests

**Files modified:** `spec/traceability.md` (Rev 1.254), `spec/README.md` (Rev 1.299)
**Commit:** 891d1549
**Applied fix:** the row now says a parent whose `subscribe` threw fails the build with that throw as a defect, and that a release that throws leaves no later parent subscribed and fails the close with what was thrown, one value as itself, several as one `AggregateError`. The CCR-QD-464 row cites the new revisions.

### IN-05: the CCR-QD-464 file list lacks a separator

**Files modified:** `spec/README.md` (Rev 1.300)
**Commit:** 7036316a
**Applied fix:** the tail of the list is joined with commas and one final "and"; the row cites README at Rev 1.300.

### IN-06: the spec says an inherited field is not compared, but the tests pin that only for its non-enumerable and symbol-keyed siblings

**Files modified:** `packages/devtools/test/model/ExternalStore.test.ts`, `spec/behaviors/28-devtools-screens.md` (Rev 1.51), `spec/README.md` (Rev 1.298)
**Commit:** 25012eb8
**Applied fix:** the existing row's key is now built on a prototype whose `inheritedField` moves with `moved`, beside the own `shown` field, the symbol-keyed field and the non-enumerable field, and the row is retitled "a key differing only in an inherited, non-enumerable or symbol-keyed field is equal". Confirmed by a temporary `for...in` comparison in `ExternalStore.ts` (reverted with `git checkout`, nothing committed): the row failed. The retained "inherited enumerable field compares equal to itself" row is unchanged. BEH-QD-696's "Pinned by" paragraph quotes the new title.

## Verification

Run in the main checkout (`workflow.use_worktrees` is `false`; no worktree was created), so the numbers reproduce from the tree as it stands.

- `vitest run --project devtools`: 71 files, 1710 tests passed
- `pnpm typecheck`: clean
- `pnpm test:tstyche`: 69 files, 370 passed, 2 skipped (as before)
- `check-house-style.mjs`: 571 files clean; `check-doc-examples.mjs`: 118 blocks compile; `check-api-surface.mjs`: 941 exports (barrel unchanged); `check-devtools-claims.mjs`: 8 claims
- `oxlint` on the four touched test files: clean
- `spec-revise.mjs --check`: every Revision matches; `verify-traceability.sh --strict`: 21 pass, 0 fail, 0 skip
- No source file under `packages/devtools/src` changed, so no mutation-affecting edit was made.

---

_Fixed: 2026-11-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
