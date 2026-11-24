---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
fixed_at: 2026-11-24T00:00:00Z
review_path: .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-REVIEW.md
iteration: 2
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase QD-79: Code Review Fix Report

**Fixed at:** 2026-11-24
**Source review:** .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: ADR-QD-192 and BEH-QD-731 say a bare timeline feed reads the empty source

**Files modified:** `spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md`, `spec/behaviors/28-devtools-screens.md`, `spec/README.md`
**Commit:** 4ac58dcd
**Applied fix:** The spec follows the shipped code (orchestrator decision). ADR-QD-192 decision 1 now says a bare timeline feed holds the default capacity and starts no read, and shows what the empty source showed. The "Alternatives considered" bullet is restated as what shipped ("Reading the empty source at build"), with the reason (unobservable read, equivalent Stryker mutants, removed in the mutation close) and why "bare" is still not a third state. The "What enforces it" sentence now says a bare build "shows" what an empty input showed. BEH-QD-731's paragraph and its "Pinned by" line agree with the requirement ("reads no source"). Revisions went through `scripts/spec-revise.mjs --date 2026-11-24`: ADR-QD-192 1.3 to 1.4, `28-devtools-screens.md` 1.58 to 1.59, `spec/README.md` 1.369 to 1.370. The CCR-QD-471 row's three revision citations are in step.

A final grep over `spec/`, `packages/devtools/README.md`, `apps/website/src/content/docs/`, the changeset and `packages/devtools/src` found no other claim that a bare build reads a source. The `GatesFeed.ts` hit is about the gates feed, which reads nothing bare. `spec/overview.md`'s `makeTimelineFeed` row and the changeset's "a bare feed is the feed built with `{}`" make no such claim and were left alone.

**Verification** (run in the main checkout, because `workflow.use_worktrees` is `false`): `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict` (21 pass, 0 fail), `check-doc-examples.mjs` (119 blocks), `check-website-doc-examples.mjs` (75 blocks), `check-api-surface.mjs` (942 exports) and `check-house-style.mjs` (596 files) all pass. No source or test change.

---

_Fixed: 2026-11-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
