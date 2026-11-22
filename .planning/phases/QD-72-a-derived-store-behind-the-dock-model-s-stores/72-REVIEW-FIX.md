---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
fixed_at: 2026-11-22T22:50:00Z
review_path: .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 12
skipped: 0
status: all_fixed
---

# Phase QD-72: Code Review Fix Report

**Fixed at:** 2026-11-22
**Source review:** .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (5 warnings, 7 info; fix scope `all`)
- Fixed: 12
- Skipped: 0

**Where verification ran:** the main checkout. `workflow.use_worktrees` is `false`, so no worktree, temp
branch or recovery sentinel was created and every edit and commit landed on `arch-wave-13` directly.

**Commits** (one per concern, since several findings share a file):

| Commit | Findings |
| ------ | -------- |
| `99c1fe26` | WR-01 (code), WR-03, IN-04, IN-05, IN-06 (indentation) |
| `133674c1` | IN-01 |
| `bf042d19` | IN-03, WR-05 (test retitle), IN-06 (`KeyRow`, store list layout) |
| `be8e17cc` | IN-03 and IN-07 in `DockModel.characterisation.test.ts` (own commit) |
| `b33a5e9f` | WR-01 (spec wording), WR-02, WR-04, WR-05 (spec), IN-02 |

## Fixed Issues

### WR-01: `sameFields` walked inherited keys

**Files modified:** `packages/devtools/src/model/ExternalStore.ts`, `packages/devtools/test/model/ExternalStore.test.ts`,
`spec/decisions/185-...md`, `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/traceability.md`,
`spec/README.md`
**Commits:** `99c1fe26`, `b33a5e9f`
**Status:** fixed: requires human verification (logic)
**Applied fix:** `sameFields` compares `Object.entries(a)` against a `Map` of `Object.entries(b)`, with no cast: equal length,
and every entry present in the other with `===`. The doc comment, ADR-QD-185 decision 2, BEH-QD-696, INV-QD-389 and its
traceability row now all say "own enumerable string-keyed fields", and that an inherited, non-enumerable or symbol-keyed field
is not compared. Three new `makeDerivedStore` rows: a key with an inherited enumerable field compares equal to itself (RED on
the old loop, shown by restoring it: that row alone failed); a key differing only in a non-enumerable or symbol-keyed field does
not recompute (pins the documented behaviour); a key that swaps a field for another holding `undefined` counts as changed
(kills a mutant that drops the `has` check, shown by removing it: that row alone failed).

### WR-02: BEH-QD-700 named the derived stores by position

**Files modified:** `spec/behaviors/28-devtools-screens.md`
**Commit:** `b33a5e9f`
**Applied fix:** "`diagnostics`, `questions` and `services` are derived stores (BEH-QD-699)". No ordinal.

### WR-03: "each parent is released" was observed for one parent

**Files modified:** `packages/devtools/test/model/ExternalStore.test.ts`
**Commit:** `99c1fe26`
**Applied fix:** an `observedParent()` helper (a hand-written parent exposing its `held` set), used twice. The test asserts
both sets hold one listener before close and are empty after. Scratch mutation, shown once and reverted: replacing the
finalizer's loop with `releases[0]?.()` fails the test, and so does `releases.at(-1)?.()`.

### WR-04: BEH-QD-700 carried ordinal history in current-tense text

**Files modified:** `spec/behaviors/28-devtools-screens.md`
**Commit:** `b33a5e9f`
**Applied fix:** the paragraph is now a `> **Noted 2026-11-22 (CCR-QD-464).**` blockquote, the spec's convention for history;
the body states only what holds now.

### WR-05: the store-list test and INV-QD-390 overclaimed

**Files modified:** `packages/devtools/test/model/DockModel.test.ts` (title and file header),
`packages/devtools/src/model/DockModel.ts` (header comment only), `spec/behaviors/28-devtools-screens.md`,
`spec/invariants.md`, `spec/decisions/185-...md`, `spec/decisions/047-...md`, `spec/decisions/162-...md`,
`spec/decisions/168-...md`, `spec/traceability.md`, `spec/README.md`
**Commits:** `bf042d19`, `b33a5e9f`
**Applied fix:** the test is retitled "a built model's members with subscribe and getSnapshot are exactly this list". BEH-QD-700,
INV-QD-390 (Implication and Enforcement, no longer contradicting each other) and ADR-QD-185 (decision 10 and Consequences) say the
test lists the built model's members that have both and fails when one is added or removed, and that the spec list and the test
list are kept equal by review, not by a gate. The `DockModel.ts` header, the `DockModel.test.ts` header and the ADR-QD-047,
-162, -168 and BEH-QD-615 notes no longer say a test "checks that list".

### IN-01: negative type pins did not differ from their twin in one argument

**Files modified:** `packages/devtools/test/model/ExternalStore.tst.ts`
**Commit:** `133674c1`
**Applied fix:** `WithOptional` now has required `a` and `c` and an optional `b`, so the optional-field pin uses the twin's key
literal and compute unchanged; only the declared key type differs. The empty-parents pin uses the twin's compute. Every call
annotates the compute's parameter and result: with a refused argument an unannotated compute infers `unknown` for `A` and breaks
the positive `toBe` (the 72-04 finding), and `(key): number =>` alone was not enough, so the parameter is typed too. The header
says so. The field-outside-key pin differs from the twin only in the property read. Both tstyche passes green.

### IN-02: ADR-QD-047's Status row omitted its 2026-11-19 amendment

**Files modified:** `spec/decisions/047-a-headless-devtools-model.md`
**Commit:** `b33a5e9f`
**Applied fix:** inserted `2026-11-19 (the headless interface is the feeds, ADR-QD-173)` before the 2026-11-22 entry. Revision
moved through `spec-revise.mjs` (1.20 to 1.21).

### IN-03: duplicated test helpers

**Files modified:** `packages/devtools/test/dockModelFixtures.ts`, `DockModel.test.ts`, `DockModel.characterisation.test.ts`,
`ExternalStore.test.ts`, `GatesFeed.test.ts`
**Commits:** `bf042d19`, `be8e17cc`
**Applied fix:** `heardOn` (typed on `Parent`), `suppliedActivity` and `heardOf` (now `heardOn(model.services)`) are exported once
from `dockModelFixtures.ts`. The copies in `DockModel.test.ts`, the characterisation, and `ExternalStore.test.ts` (whose `{ n }`
counter now reads `.calls`) are gone, and `GatesFeed.test.ts` imports the fixture `tick` and `guard`. Same-named helpers in other
files with a different shape or value (`DiagnosticsStore.test.ts`, `PortCards.test.ts`, and others) are not duplicates and are
left alone.

### IN-04: stale `ExternalStore.ts` header

**Files modified:** `packages/devtools/src/model/ExternalStore.ts`
**Commit:** `99c1fe26`
**Applied fix:** "owns only the mechanics" now says it owns the mechanics and the derived store; a header paragraph names
`makeDerivedStore` and points at its doc and BEH-QD-696 to BEH-QD-698; "the listener contract above" now reads "in the file
header". `Parent`'s release is documented as one that must not throw.

### IN-05: subscribe before the finalizer existed

**Files modified:** `packages/devtools/src/model/ExternalStore.ts`, `packages/devtools/test/model/ExternalStore.test.ts`,
`spec/behaviors/28-devtools-screens.md`, `spec/decisions/185-...md`
**Commits:** `99c1fe26`, `b33a5e9f`
**Applied fix:** the finalizer is registered first over a `releases` array the subscribe loop fills. New test "a parent whose
subscribe throws leaves no earlier parent subscribed after close" (a hand-written parent that throws on `subscribe`, built under
`Scope.provide` and `Effect.exit`); it fails when the finalizer is moved back after the loop (shown, reverted). BEH-QD-698 and
ADR-QD-185 decision 7 state it. Per-release `try` was not added: the doc states a release must not throw.

### IN-06: small cleanliness items

**Files modified:** `packages/devtools/test/model/ExternalStore.test.ts`, `packages/devtools/test/model/DockModel.test.ts`
**Commits:** `99c1fe26`, `bf042d19`
**Applied fix:** the five-field key literal is indented; `KeyRow`'s doc says what `field` and `heard` hold; the store list is one
name per line. **`mergedOf` stays a `function` declaration on purpose:** the owner brief rules out a module-scope `const` arrow
because it adds an Ignored static mutant to a file scored against its base record; `sameFields` is a `function` for the same
reason.

### IN-07: characterisation title

**Files modified:** `packages/devtools/test/model/DockModel.characterisation.test.ts`
**Commit:** `be8e17cc` (its own commit)
**Applied fix:** retitled "a guard, two moving configures and a repeat notify the stores in one fixed order". No row's inputs or
expected values changed; the same commit swaps the file's local `heardOn` and `suppliedActivity` for the shared fixtures (IN-03).
All its rows pass.

## Skipped Issues

None.

## Gates after the last commit

- `npx vitest run --project devtools`: 71 files, 1708 tests passed.
- `pnpm typecheck`, `pnpm test:tstyche` (both passes, 69 files): clean.
- `node scripts/check-house-style.mjs` (571 files clean), `check-doc-examples.mjs` (118 blocks), `check-api-surface.mjs`
  (941 exports, barrel unchanged), `check-devtools-claims.mjs`: clean.
- `pnpm exec oxlint` on the touched files: no finding in a touched line (a `HeldChoice.test.ts` warning is pre-existing and
  untouched).
- `node scripts/spec-revise.mjs --check`: clean. `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0.
- `/usr/bin/grep -rn "Pick<ExternalStore<" packages/devtools`: no hits.

## For the orchestrator's mutation re-close

`ExternalStore.ts` changed in code (`sameFields`, the finalizer order) and `DockModel.ts` in a header comment only. The new
`sameFields` mutants were reasoned through, and each one found has a killing row: `every` to `some`, the `&&` forms, the
`has` check, the length check, the entry comparison. Not run under Stryker.

---

_Fixed: 2026-11-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
