---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
fixed_at: 2026-11-22T23:10:00Z
review_path: .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-REVIEW.md
iteration: 2
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase QD-72: Code Review Fix Report

**Fixed at:** 2026-11-22
**Source review:** .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 6 (1 warning, 5 info; fix scope all)
- Fixed: 6
- Skipped: 0

Edits ran in the main checkout, not a worktree: `workflow.use_worktrees` is `false` in `.planning/config.json`.

## Fixed Issues

### WR-01: BEH-QD-698, ADR-QD-185 decision 7 and INV-QD-389 do not state what the finalizer does exactly

**Files modified:** `packages/devtools/src/model/ExternalStore.ts`, `packages/devtools/test/model/ExternalStore.test.ts`, `spec/behaviors/28-devtools-screens.md` (1.46 to 1.47), `spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md` (1.1 to 1.2), `spec/invariants.md` (1.179 to 1.180), `spec/README.md` (1.292 to 1.293; CCR-QD-464 row re-cited)
**Commit:** 6ce3e1ac
**Status:** fixed: requires human verification (a close-path rule, not a syntactic change)

**Applied fix:**
- The finalizer now runs every release, collects what each threw, and then throws once through a new module-scope function declaration, `throwCollected`: nothing when none threw, the value itself when one did, one `AggregateError` in release order when more did. `notify` uses the same function, so the rule is stated once in the file. A function declaration, not a `const` arrow, so it adds no Ignored static mutant.
- Rule chosen: ADR-QD-177 (run every one, then rethrow), not the swallowing of BEH-QD-638 / `GatesFeed`. `GatesFeed` swallows a release because the registry is the host's, so a throw is the host's fault and a closing feed "has nowhere to state it". Every parent of a derived store is the package's own store, so a release that throws is a defect in the package, and the close (a defect out of `Scope.close`) is a place that can state it. Swallowing would hide it.
- BEH-QD-698 is split into three requirements: (1) after close it reads no key, calls no compute, releases every parent, ignores `refresh` and keeps its last snapshot; (2) when a parent's `subscribe` throws while the store is built, the build fails with that throw as a defect, returns no store, and closing the scope releases every parent subscribed before it (the "keeps its last snapshot" clause for a failed build is gone); (3) closing releases every parent even when a release throws and then fails with what was thrown. "Leaves nothing subscribed" now reads "once the scope closes", and the prose says why release throws are not swallowed and that a parent's `subscribe` must return a release that cannot throw. ADR-QD-185 decision 7 and INV-QD-389 carry the same statements. The `makeDerivedStore` doc comment states both paths.
- Two new tests pin (b), both in `ExternalStore.test.ts`: "a parent whose release throws leaves no later parent subscribed, and the close fails with it" and "two parents whose release throws fail the close with one AggregateError holding both". The first fails on the old loop. Shown once, then reverted (old `for (const release of releases) release()` restored temporarily, source restored from a copy afterwards):
  - old loop, first test: `AssertionError: expected 1 to equal +0` (the later parent stayed subscribed);
  - old loop, second test: `expected Error: the first parent could not release to be an instance of AggregateError`;
  - with the fix: 37/37 pass.
- The pin for (a) already existed ("a parent whose subscribe throws leaves no earlier parent subscribed after close").
- The BEH-QD-698 "Pinned by" paragraph is now wrapped at the document's width and lists all four tests; this is the spec half of IN-05, applied here because the same paragraph was rewritten.

### IN-01: `sameFields` doc comment is ungrammatical and words the exclusion differently from the spec

**Files modified:** `packages/devtools/src/model/ExternalStore.ts`
**Commit:** 64b8b99c
**Applied fix:** "A field that is inherited, non-enumerable or symbol-keyed is not part of the key and is not compared", the words ADR-QD-185 decision 2, BEH-QD-696 and INV-QD-389 use.

### IN-02: the fixtures header understates its readers, and `heardOn` is not a dock fixture

**Files modified:** `packages/devtools/test/helpers.ts`, `packages/devtools/test/dockModelFixtures.ts`, `packages/devtools/test/model/ExternalStore.test.ts`, `packages/devtools/test/model/GatesFeed.test.ts`, `packages/devtools/test/model/DockModel.test.ts`, `packages/devtools/test/model/DockModel.characterisation.test.ts`, `spec/README.md` (1.293 to 1.294; row names `helpers.ts`)
**Commit:** 8d754e49
**Applied fix:** `heardOn`, `guard` and `tick` have no dock dependency, so they moved to the neutral `helpers.ts`. `ExternalStore.test.ts` and `GatesFeed.test.ts` now import only from `helpers.ts`. `dockModelFixtures.ts` keeps the dock fixtures (`rowOf`, `heardOf`, `askingIds`, `wiringNamed`, `activityOf`, `logOf`, `suppliedActivity`), its imports trimmed to what remain, and its header names its real readers (`DockModel.test.ts` and the characterisation) and where the shared helpers went. `heardOf` imports `heardOn` from `helpers.ts`.

### IN-03: the closing-scope characterisation hand-rolls the counter `heardOn` replaced

**Files modified:** `packages/devtools/test/model/DockModel.characterisation.test.ts`
**Commit:** 475fa504
**Applied fix:** the row subscribes `heardOn(model.diagnostics)`, `heardOn(model.questions)` and `heardOn(model.services)` and asserts each `.calls` is 0. Its input and expected value (no notification during close) are unchanged. 15/15 pass.

### IN-04: the store-list test pins insertion order, and BEH-QD-700 claims an order

**Files modified:** `packages/devtools/test/model/DockModel.test.ts`, `spec/behaviors/28-devtools-screens.md` (1.47 to 1.48), `spec/README.md` (1.294 to 1.295; row cites BEH document 1.48)
**Commit:** 5f5b9ba0
**Applied fix:** the test compares the names with `assert.sameMembers`, so the order of the returned literal does not matter. Its title is unchanged ("... are exactly this list"), because BEH-QD-700 and INV-QD-390 quote it. Shown once on a temporary edit of the test's list, then reverted:
- a name dropped from the list: `expected [ Array(9) ] to have the same members as [ Array(8) ]`, fails;
- a name added: `... as [ Array(10) ]`, fails;
- two names swapped: passes.

BEH-QD-700 now says "in no particular order", says the test compares "as a set", names the first five stores by name instead of "the first five", and its "Pinned by" paragraph says "whatever their order". The BEH-QD-465 listing already claims no order, so it needs no edit and stays consistent.

### IN-05: one spec line is not wrapped, and one rewrapped test header keeps phase-relative wording

**Files modified:** `packages/devtools/test/model/DockModel.test.ts` (header); the spec line was fixed under WR-01 (commit 6ce3e1ac)
**Commit:** b5d06ec2
**Applied fix:** "Until now those rules lived in layout effects" became "Those rules once lived in layout effects", rewrapped at 90 columns. The 150-column BEH-QD-698 line is now wrapped at the document's width (see WR-01).

## Verification

Run in the main checkout (no worktree), one runner at a time, stdin closed, after the last commit:

- `pnpm exec vitest run --project devtools`: 71 files, 1710 tests pass.
- `pnpm typecheck`: clean.
- `pnpm test:tstyche`: 69 files, 807 assertions pass.
- `node scripts/check-house-style.mjs`: 571 files clean.
- `node scripts/check-doc-examples.mjs`: 118 blocks compile.
- `node scripts/check-api-surface.mjs`: 941 exports, barrel unchanged.
- `node scripts/check-devtools-claims.mjs`: 8 claims registered.
- `pnpm exec oxlint` on every touched TypeScript file: clean.
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest entry. The CCR-QD-464 row cites ADR-QD-185 1.2, ADR-QD-047 1.21, ADR-QD-162 1.7, ADR-QD-168 1.2, ADR-QD-169 1.2, BEH 28 1.48, invariants 1.180, traceability 1.252 and README 1.295, each equal to its header.
- `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0.

## Notes for the orchestrator

- `ExternalStore.ts` changed (the finalizer, `throwCollected`, the doc comments), so the `store` group's mutation record needs the `--restart` re-close. `DockModel.ts` is untouched in this iteration. The new `throwCollected` is a function declaration; the moved branch logic is killed by the existing listener tests (the empty, single and aggregate cases) and the message literals by the two new tests and the existing message assertions.
- `72-mutation-base.json`, `72-mutation-close.json` and `72-mutation.mjs` were not edited. `.planning/config.json` and the untracked `*.iter*.md` files were not staged.

---

_Fixed: 2026-11-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
