---
phase: QD-52-core-owns-the-predicate-compile-shell
plan: 05
subsystem: testing
tags: [mutation, stryker, phase-close, compile-shell, ARCH-99]
requires: [52-04]
provides:
  - "52-mutation-after.json and the D-09a comparison with the base (WX-05)"
  - "the phase scan clean (COMP-01..03, WX-04, WX-06)"
  - "check:pr green on the final tree, nothing released (WX-01, WX-07)"
  - "COMP-01..04 complete"
affects: []
key-files:
  created:
    - .planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-mutation-after.json
  modified:
    - .planning/REQUIREMENTS.md
decisions:
  - "No fix commit was needed: the scan, circular and house style were clean on the first run"
status: complete
requirements-completed: [COMP-01, COMP-02, COMP-03, COMP-04, WX-01, WX-04, WX-05, WX-06, WX-07]
plan_head_before: afcfdb5d4fc3b2baa5fff8d4b4cb34c1d9cda5f6
plan_head_after: 5a49304b352b8e123bf4a8a7ceb469c8aa50bfd1
commits: 1
actuals:
  tokens: 12000
  tasks: 3
  commits: 1
completed: 2026-11-16
---

# Phase 52 Plan 05: The close Summary

The phase is closed: the Stryker after-run satisfies D-09a against the base, `tools/scan.mjs` reads the phase as one change and is clean, `pnpm check:pr` is green on the final tree, nothing was released, and COMP-01..04 are ticked only now.

## Mutation after

Three runs, 52-01's invocations verbatim, each alone with `< /dev/null`, none concurrent with vitest or `check:pr`; each exited 0 (core 10 s, SQL 21 s, Prisma 10 s). Then `tools/mutation.mjs after` (keys `measured, counts, survivors, unmeasured, movedShell, region`) and `compare`.

`mutation.mjs after`:

```
packages/core/src/RenderablePredicate.ts 0.9821428571428571 (165/168) ignored 61
survivor packages/core/src/RenderablePredicate.ts:331:30 ArrowFunction | Survived | () => undefined | () => false | Unrepresentable: () => () => false,
survivor packages/core/src/RenderablePredicate.ts:344:3 MethodExpression | Survived | NON_FINITE.every(...) | NON_FINITE.some(...)
survivor packages/core/src/RenderablePredicate.ts:344:55 ObjectLiteral | Survived | {} | { [column]: value } | NON_FINITE.some(...)
compilePredicate packages/core/src/RenderablePredicate.ts:557-570 detected 6 survived 0 ignored 1
packages/predicate-sql/src/index.ts 0.9545454545454546 (63/66) ignored 43
survivor packages/predicate-sql/src/index.ts:173:40 StringLiteral | NoCoverage | `` | ExcludeNull template
survivor packages/predicate-sql/src/index.ts:322:13 ObjectLiteral | Survived | {} | { _tag: "Unknown" }
survivor packages/predicate-sql/src/index.ts:322:21 StringLiteral | Survived | "" | "Unknown"
shell packages/predicate-sql/src/index.ts: line(s) none detected 0 survived 0 ignored 0
packages/predicate-sql/src/CompileMetrics.ts unmeasured: no scored mutant: all 8 ignored
packages/predicate-prisma/src/index.ts 0.9243697478991597 (110/119) ignored 32
survivors: 311:31, 311:38, 311:39, 311:61, 311:73 (NoCoverage, the `"not" in filter` ExcludeNull branch);
  255:10 and 259:10 ConditionalExpression Survived; 311:7 ConditionalExpression and StringLiteral Survived
shell packages/predicate-prisma/src/index.ts: line(s) none detected 0 survived 0 ignored 0
packages/predicate-prisma/src/CompileMetrics.ts unmeasured: no scored mutant: all 8 ignored
```

(Survivor lines abbreviated here; the full identities are in `52-mutation-after.json`. The survivors are the base's, moved only by line number.)

`mutation.mjs compare`:

```
packages/core/src/RenderablePredicate.ts 0.9814814814814815 -> 0.9821428571428571 (159/162 -> 165/168; survivors +0 -0)
packages/predicate-sql/src/index.ts 0.9558823529411765 -> 0.9545454545454546 (65/68 -> 63/66; survivors +0 -0)
packages/predicate-prisma/src/index.ts 0.9262295081967213 -> 0.9243697478991597 (113/122 -> 110/119; survivors +0 -0)
  compilePredicate packages/core/src/RenderablePredicate.ts:557-570 detected 6 survived 0 ignored 1
  moved packages/predicate-sql/src/index.ts:320 LogicalOperator options.identifiers && "Ascii" -> killed in compilePredicate
  moved packages/predicate-sql/src/index.ts:320 StringLiteral "" -> killed in compilePredicate
  moved packages/predicate-sql/src/index.ts:322 LogicalOperator options.maxInValues && DEFAULT_MAX_IN_VALUES -> killed in compilePredicate
  moved packages/predicate-sql/src/index.ts:335 ArrowFunction () => undefined -> killed in compilePredicate
  D-09a packages/predicate-sql/src/index.ts: 4 detected mutant(s) moved to core; outside the shell 61 at the base, 63 after
  moved packages/predicate-prisma/src/index.ts:435 LogicalOperator options.identifiers && "Ascii" -> killed in compilePredicate
  moved packages/predicate-prisma/src/index.ts:435 StringLiteral "" -> killed in compilePredicate
  moved packages/predicate-prisma/src/index.ts:447 ArrowFunction () => undefined -> killed in compilePredicate
  moved packages/predicate-prisma/src/index.ts:437 LogicalOperator options.maxInValues && DEFAULT_MAX_IN_VALUES -> killed in compilePredicate
  D-09a packages/predicate-prisma/src/index.ts: 4 detected mutant(s) moved to core; outside the shell 109 at the base, 110 after
packages/predicate-sql/src/CompileMetrics.ts unmeasured: no scored mutant: all 8 ignored (ignoreStatic: true; module-scope declarations only)
packages/predicate-prisma/src/CompileMetrics.ts unmeasured: no scored mutant: all 8 ignored (ignoreStatic: true; module-scope declarations only)
WX-05 holds (D-09a)
```

Per dialect:

- **predicate-sql**: 0.95588 -> 0.95455. Four detected shell mutants (lines 320, 322, 335) moved to core, and each is killed in `compilePredicate`; outside the shell 61 detected at the base, 63 after. The survivor set is identical.
- **predicate-prisma**: 0.92623 -> 0.92437. Four detected shell mutants (lines 435, 437, 447) moved to core, each killed in `compilePredicate`; outside the shell 109 at the base, 110 after. The survivor set is identical.
- **core**: 0.98148 -> 0.98214; `compilePredicate` (557-570) has 6 detected, 0 survived, 1 ignored. Both `CompileMetrics.ts` stay unmeasured.

Matches the planning dry run (core 0.98214, SQL 0.95455 with 63/66, Prisma 0.92437 with 110/119). The base JSON has one commit (`chore(52-01)`); the after JSON has one commit (`chore(52-05)`, `5a49304b`), carries only itself, with the trailer, after the last `packages/*/src` commit.

## Phase scan

- `pnpm exec tsc -b tsconfig.json`: exit 0.
- `node .planning/phases/QD-52-core-owns-the-predicate-compile-shell/tools/scan.mjs`: `phase scan clean`.
- `pnpm circular`: `No circular dependency found!` (WX-04).
- `node scripts/check-house-style.mjs`: `house-style: 542 file(s) clean (3 declared switch(es))`.
- No commit since `phase_base` (`42b92cc3`) touches `tools/`, `scripts/` or the three Stryker configs.

Edge ledger closes at 27 truths across 52-01..52-05 and 3 flagged assumptions (items 1, 2 and 3); each plan's truths were met by its own verifies, and this plan re-ran the phase-wide ones. No finding arose, so there was no `fix(52-05)` commit and Task 1 did not need repeating.

## Close

- `pnpm check:pr < /dev/null`: exit 0 on the final tree (HEAD `5a49304b` plus uncommitted docs only), all 16 steps ran (typecheck, lint, circular, test:tstyche, coverage, test:bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish); `pnpm mutation` skipped by design (`--skip-mutation`). Run after the after-JSON commit and the scan, never alongside a Stryker run.
- Release check (WX-07): `git tag --contains <phase_base>` empty; no CHANGELOG or package.json change since the base; no deleted changeset; `git branch -r --contains HEAD` empty; branch `arch-wave-10`; nothing staged. Printed `nothing released`.
- `.planning/REQUIREMENTS.md`: COMP-01..04 are `[x]` with `Complete` traceability rows (verified by the plan's script, `COMP-01..04 complete`), ticked only after the scan and `check:pr` were green.

## Commits

- `5a49304b` chore(52-05): mutation after-run for the compile shell
- docs(52-05) close commit (this SUMMARY, REQUIREMENTS.md, STATE.md, ROADMAP.md)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `52-mutation-after.json` present and committed alone as `5a49304b`.
- Plan's three Task 3 verifies and both Task 1 verifies exit 0.
