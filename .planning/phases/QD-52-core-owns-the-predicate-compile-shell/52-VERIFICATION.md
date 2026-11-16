---
phase: QD-52-core-owns-the-predicate-compile-shell
verified: 2026-11-16T19:58:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-01-PLAN.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-01-SUMMARY.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-02-PLAN.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-02-SUMMARY.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-03-PLAN.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-03-SUMMARY.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-04-PLAN.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-04-SUMMARY.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-05-PLAN.md"
  - ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-05-SUMMARY.md"
  - "packages/core/src/RenderablePredicate.ts"
  - "packages/core/test/CompilePredicate.test.ts"
  - "packages/core/test/CompilePredicate.tst.ts"
  - "packages/predicate-prisma/src/CompileMetrics.ts"
  - "packages/predicate-prisma/src/index.ts"
  - "packages/predicate-prisma/test/CompileShell.test.ts"
  - "packages/predicate-sql/src/CompileMetrics.ts"
  - "packages/predicate-sql/src/index.ts"
  - "packages/predicate-sql/test/CompileShell.test.ts"
  - "spec/overview.md"
covered_digest: "v4:sha256:343f230def6a56e541bcd4ff04c3a603459273e039143ff7e9b6464b01fcb3d8"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 52: Core owns the predicate compile shell - Verification Report

**Phase Goal:** Core owns the shell every predicate dialect repeats (defaults, renderability, counting refused and compiled outcomes), so `@qadi/predicate-sql` and `@qadi/predicate-prisma` each keep only their rules, their renderer and their own metric.
**Verified:** 2026-11-16
**Status:** passed
**Re-verification:** No, initial verification

## Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One core function owns defaults, `toRenderable`, and counting refused/compiled against a caller-supplied series; shell gone from both packages | VERIFIED | `compilePredicate` at `packages/core/src/RenderablePredicate.ts:576` applies `identifiers ?? "Ascii"` and `maxInValues ?? DEFAULT_MAX_IN_VALUES`, calls `toRenderable`, `tapError` counts `outcomes.refused`, `map(render)`, then `tap` counts `outcomes.compiled`. Scoped grep of `packages/predicate-{sql,prisma}/src` for `Ascii\|DEFAULT_MAX_IN\|tapError\|Metric.update` matches only the doc comment on the `identifiers` option. The base had these at sql index.ts:320-341 and prisma index.ts:435-449. |
| 2 | Dialects keep only rules, renderer, own metric; ids distinct, each declared once, `[metric-table]` and `METRIC_ID_LITERAL_BUDGET` unchanged | VERIFIED | `compileSql` and `compilePrismaWhere` are `compilePredicate(predicate, {rules, identifiers, maxInValues, outcomes: compiledTotal, render})`. `CompileMetrics.ts` in each package declares one base counter with ids `qadi_predicate_sql_compiled_total` and `qadi_predicate_prisma_compiled_total`, exported as a `CompileOutcomes` pair of tagged series. `check-house-style.mjs`: "542 file(s) clean". No spec metric-table rows in the diff. |
| 3 | Output unchanged incl. refusals, shown by characterisation tests written on the base, green before and after; one counter move per call | VERIFIED | `CompileShell.test.ts` for sql (commit `2c638fd7`) and prisma (`9634bf35`) precede the first src commit `bb847c95`; `git log` shows no later commit on either file (byte-identical). Run at HEAD: predicate-sql 103 tests pass, predicate-prisma 95 pass, core `CompilePredicate.test.ts` 8 pass. |
| 4 | `spec/overview.md` names the export (gate 13); changesets cover all three; `check:pr` green | VERIFIED | overview.md:181 names `CompilePredicateOptions`, `CompileOutcomes` and `compilePredicate`. `check-api-surface.mjs`: 935 exports. Changesets present: core minor, sql patch, prisma patch. `check:pr` exit 0 at HEAD per orchestrator. I did not re-run the full gate; I re-ran api-surface, house-style, dod-table and `pnpm circular` (clean). |

**Score:** 4/4

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/RenderablePredicate.ts` (`compilePredicate`, `CompilePredicateOptions`, `CompileOutcomes`) | VERIFIED | Substantive, plain function with no span; imported by both dialects via `@qadi/core`. |
| `packages/predicate-sql/src/index.ts`, `CompileMetrics.ts` | VERIFIED | Wired: `compiledTotal` passed as `outcomes`. |
| `packages/predicate-prisma/src/index.ts`, `CompileMetrics.ts` | VERIFIED | Same. |
| Characterisation tests (47 and 21) | VERIFIED | Pre-date the src change; unchanged since. |
| `CompilePredicate.test.ts`, `.tst.ts` | VERIFIED | RED-by-import commit `413473f2` precedes `bb847c95`. |
| Records (ADR-QD-165, BEH-QD-596..600, INV-QD-349 with 350 Unused, CCR-QD-443) | VERIFIED | Present in spec/decisions, behaviors/31, invariants, traceability, README, overview. |

## Key Links

| From | To | Status |
|------|----|--------|
| `compileSql` | `compilePredicate` | WIRED (index.ts:317) |
| `compilePrismaWhere` | `compilePredicate` | WIRED (index.ts:434) |
| `compilePredicate` | `toRenderable`, `Metric.update` on caller series | WIRED |

## Data-Flow, Behaviour

Counter series flow from each package's own metric to core via `outcomes`; not hollow. One deliberate observable change: Prisma now counts `compiled` after render (D-06a, BEH-QD-597), aligning with SQL's base behaviour. It only differs on a renderer defect (neither outcome counted), is recorded in the prisma changeset, and is pinned by `CompilePredicate.test.ts` ("a defect in classification or in render counts neither outcome"). No output change.

## Requirements Coverage

| ID | Status | Evidence |
|----|--------|----------|
| COMP-01 | SATISFIED | Truth 1 |
| COMP-02 | SATISFIED | Truth 2 |
| COMP-03 | SATISFIED | Truth 3 |
| COMP-04 | SATISFIED | Truth 4 |
| WX-01 | SATISFIED | `check:pr` exit 0 at HEAD (orchestrator-reported, not re-run) |
| WX-02 | SATISFIED | ADR/CCR/BEH/INV present with the reserved ids; INV-QD-350 recorded Unused |
| WX-03 | SATISFIED | Gate 13 passes, 935 exports |
| WX-04 | SATISFIED | house-style clean; added-line grep finds only `as const` and a comment, no `any`/`switch`/`fnUntraced`/`async`/`console`/clock |
| WX-05 | SATISFIED | `tools/mutation.mjs compare` base vs `52-mutation-review.json` prints "WX-05 holds (D-09a)". Core 0.98148 to 0.98214; each dialect `index.ts` loses exactly the 4 moved shell mutants, all killed in `compilePredicate`, with outside-shell survivors unchanged. Coverage thresholds are covered by `check:pr`. |
| WX-06 | SATISFIED | Characterisation committed before src; RED test before the function |
| WX-07 | SATISFIED | No public break; the prisma counting change is noted in its changeset. Nothing released. |

No orphaned requirements: REQUIREMENTS.md maps exactly these 11 IDs to Phase 52 or "All v1.5 phases".

## Anti-Patterns and Scan

No TBD/FIXME/XXX/TODO in files changed by the phase. `tools/scan.mjs` reports exactly the expected items from the disposition: `CompilePredicate.tst.ts` outside its scope list, the `rules` line changed by WR-01, 2 commits on `CompilePredicate.test.ts`, and `52-mutation-after.json` predating later src commits. These are consequences of review fixes. The remaining checks hold (characterisation byte-identical, no other output). The post-review `52-mutation-review.json` supersedes the stale after-run, with identical scores. The WR-01 change is type-level and sharpens `rules`; IN-03 was deliberately skipped (characterisation file must stay byte-identical), a non-blocking lint warning.

## Human Verification

None required.

## Gaps Summary

None. The phase goal is achieved in the code, not only in the summaries.

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
