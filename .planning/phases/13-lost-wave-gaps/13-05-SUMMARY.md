---
phase: 13-lost-wave-gaps
plan: 05
subsystem: core-metrics
tags: [core, metrics, observability, typed-reads, lost-wave-port]

phase_base: 0925c2f
requires: ["13-04"]
provides:
  - "`packages/core/src/EvaluationMetrics.ts`: `decisionsTotal` (`{ readonly [T in Decision[\"_tag\"]]: Metric.Counter<number> }`), `denialsByPolicyTagTotal`, `evaluationDurationMillis`, `evaluationErrorsTotal`, `decisionCacheLookupsTotal`, `predicatesTranslatedTotal`, `CacheOutcome` (moved from `DecisionCache.ts`)"
  - "`Lifecycle.ts`, `DecisionCache.ts`, `Predicate.ts` declare no metric and write through the exports"
  - "`EvaluationMetrics.test.ts`: the registry-key golden (GREEN on the base first) and the declaration pins"
  - "Typed reads in every core metric test (36 id-string literals outside titles → 0)"
affects: [13-06, 13-07, 13-11, 13-12, 14, 20]

actuals:
  tokens: 90000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns: ["metric read by exported reference (`Metric.value(<export>)`), never by id string"]

key-files:
  created:
    - packages/core/src/EvaluationMetrics.ts
    - packages/core/test/EvaluationMetrics.test.ts
  modified:
    - packages/core/src/Lifecycle.ts
    - packages/core/src/DecisionCache.ts
    - packages/core/src/Predicate.ts
    - packages/core/src/DecisionRecord.ts
    - packages/core/src/SinkEmit.ts
    - packages/core/src/PortMetrics.ts
    - packages/core/src/index.ts
    - packages/core/test/GuardHealthCheck.test.ts
    - packages/core/test/Evaluate.test.ts
    - packages/core/test/DecisionSink.test.ts
    - packages/core/test/DecisionCache.test.ts
    - packages/core/test/Predicate.test.ts
    - packages/core/test/Ports.test.ts
    - packages/core/test/PortServe.test.ts
    - packages/core/test/PortAccess.test.ts

requirements-completed: []
---

# 13-05 — Every evaluation metric is declared once; core tests read it by reference

`phase_base: 0925c2f`. First of three ARCH-56 plans (ARCH-61, porting lost `d089c1d` T2–T4, T7).

## Decisions applied

No `checkpoint:decision` in this plan. CONTEXT D-02: every lost D-56-* at its recommended option (premises
unmoved): D-56-a public export (one-way, rated in Task 2), D-56-b new module beside `PortMetrics.ts`, D-56-c
`CacheOutcome` moves into it (madge clean), D-56-d `decisionsTotal` as a closed `Decision["_tag"]` record over
a private base, `cacheLookupsTotal` → `decisionCacheLookupsTotal`.

## What was done

- **Task 1 golden (e122d34).** `describe("the registry key an exporter sees (ADR-QD-052)")`, snapshot-only, no
  import of the new module. Strings copied from the current declarations; diffed against the lost golden:
  **identical** (seven series). GREEN on the base: `1 passed`.
- **Task 1 RED (c448b47).** Declarations block + GuardHealthCheck "a probe counts no decisions" →
  `Metric.value(decisionsTotal.Allow/.Deny).count === 0`. RED for the stated reason, both files:
  `Error: Cannot find module '../src/EvaluationMetrics.ts' imported from …/EvaluationMetrics.test.ts` (and
  `…/GuardHealthCheck.test.ts`).
- **Task 2 (bc63cd9).** `EvaluationMetrics.ts` from the lost file; header line one "Every evaluation metric,
  declared once.", then the why (registry key, vacuous id-string test; "ARCH-61, porting lost commit `d089c1d`;
  ADR-QD-123 amends ADR-QD-052"). `EVALUATION_ERROR_TAGS_BY_TAG` and the cache-outcome domain live there.
  Writers: `Metric.update(decisionsTotal[decision._tag], 1)`; cache writes `decisionCacheLookupsTotal`;
  `Predicate.ts` imports `predicatesTranslatedTotal`. `DecisionRecord.ts`/`SinkEmit.ts` import `CacheOutcome`
  from the new module. `PortMetrics.ts`: module doc only (points at `EvaluationMetrics.ts`; descriptions are
  pinned by `Ports.test.ts` — true on main, `Ports.test.ts:374`); the `:144-152` block, every description and
  `portCallsTotal` untouched. Barrel line between `EvaluationId.ts` and `EvaluationServicesNone.ts`.
  Golden GREEN unedited.
- **Task 3 (7341b65).** Lost hunks applied cleanly with `git apply` for Evaluate, DecisionCache, Predicate,
  Ports, PortServe; DecisionSink by `--3way` (import-block conflict only, resolved by hand). PortAccess
  converted by the same pattern: `METRIC = { evaluate: portCallsTotal, toPredicate: predicatePortCallsTotal }`,
  a module-scope `nonZero(frequency)`, the "counts once" case reads own/other/served typed
  (`nonZero(own)` = `[[port, 1]]`, the other two `[]`), the D-07 case reads `Metric.value(portCallsTotal)`.
  The preregistration test ("preregisters every Policy tag…") left Evaluate.test.ts; its assertion lives in
  EvaluationMetrics.test.ts's declarations block. One stale comment in DecisionSink.test.ts ("reading
  `Metric.snapshot`") now says `Metric.value`. Lost-id rewrite in added lines: Ports.test.ts `ADR-QD-109` →
  `ADR-QD-123`.
- **XC-05 fix (9d4571c).** See Mutation.

### The six vacuous tests, now typed

Evaluate.test.ts (the three under `qadi_decisions_total / …` and `qadi_evaluation_duration_millis`), DecisionSink
"a successful evaluation adds nothing to the error frequency" (`evaluationErrorsTotal` non-zero words `[]`),
GuardHealthCheck "a probe counts no decisions", Predicate "does not count a translation that fails"
(`predicatesTranslatedTotal.count === 0`).

### Rename demonstration

`export const decisionsTotal` → `decisionsTotalRenamed` in `EvaluationMetrics.ts`, then
`pnpm exec tsc -p tsconfig.test.json --noEmit` (`pnpm typecheck`'s `tsc -b` stops at the src project first, at
`Lifecycle.ts(33,3) TS2305`):

```
packages/core/src/Lifecycle.ts(33,3): error TS2305: … has no exported member 'decisionsTotal'.
packages/core/test/DecisionSink.test.ts(13,10): error TS2305 …   (+ :216, :238, :287 TS18046/TS2379)
packages/core/test/Evaluate.test.ts(32,10): error TS2305 …       (+ :3226, :3227, :3249, :3250 TS18046)
packages/core/test/EvaluationMetrics.test.ts(10,3): error TS2305 …
packages/core/test/GuardHealthCheck.test.ts(10,10): error TS2305 … (+ :147, :148 TS2571)
```

Reverted from a scratchpad copy (`git diff` on the file empty afterwards).

### Literals left in `EvaluationMetrics.test.ts` (for 13-07's `METRIC_ID_LITERAL_BUDGET`)

The golden's 7 `id:` literals (6 distinct ids; `qadi_decisions_total` twice, one per series) and the 6 id pins in
the declarations block (`series.id` inside the decisionsTotal loop, then one per other export). Four test titles
in the declarations block also name ids.

## Baselines re-measured (verify's own invocation, at `0925c2f`)

Id-string literals outside titles: Evaluate 5, DecisionSink 4, DecisionCache 1, Predicate 2, Ports 17,
PortServe 2, PortAccess 4, GuardHealthCheck 1 = **36** (as planned) → **0**. Metric constructors in
Lifecycle/DecisionCache/Predicate: 4/1/1 → **0/0/0**. Declaration lines on main matched the plan's anchors
(`Lifecycle.ts:56/76/91/103/133`, `DecisionCache.ts:146`, `Predicate.ts:647`); Predicate's import anchor was
`Errors.ts` at `:29` (no `LeafNeeds.ts` on main).

## Mutation (XC-05)

Scoped `pnpm exec stryker run stryker.config.mjs --mutate <the 8 touched src files>` on the final tree; bases for
files missing from `13-mutation-base.json` taken at `0925c2f` in a scratchpad worktree (`qadi-base-1305`, removed):

| File | base | after |
|---|---|---|
| Lifecycle.ts | .9565 | .9524 (40/42) → **1.0 (42/42)** after 9d4571c |
| DecisionCache.ts | .9479 | .9479 (91/96) |
| Predicate.ts | .9968 | .9968 (309/310) |
| DecisionRecord.ts | 1.0 (21/21, worktree) | 1.0 (21/21) |
| SinkEmit.ts | 1.0 (17/17, worktree) | 1.0 (17/17) |
| PortMetrics.ts | 0 mutants (worktree) | 0 mutants |
| EvaluationMetrics.ts | new | 0 mutants (`ignoreStatic`: module-scope declarations; pinned by the test instead) |
| index.ts | — | no mutants |

**Lifecycle.ts drop and fix.** Moving the declarations deleted the killed mutants of the allow/deny ternary, so the
ratio fell .9565 → .9524 with the same two survivors as the base: the failure-path span annotation
(`{ "qadi.outcome": "Failed", "qadi.error_tag": … }` → `{}`, and `"Failed"` → `""`). Both reachable (no test read
the `qadi.evaluate` span of a failed evaluation; the lost commit had called them "pre-existing non-metric sites").
Fix step 3: Evaluate.test.ts "a failed evaluation annotates qadi.evaluate as Failed, with its error tag". Re-run:
42/42. Remaining survivors in DecisionCache (5) and Predicate (1) are the base's own, untouched lines.

## Deviations

1. **[XC-05, Rule 1] One test added beyond the plan** (9d4571c), to restore Lifecycle.ts's ratio; no source change.
2. **[Doc]** The lost module header claimed every `qadi_*` metric is listed in `25-inspection.md` and checked by
   `check-house-style.mjs`; that table and gate are 13-07's, so the header does not claim them yet. 13-07 may add it.
3. **[Doc]** DecisionSink.test.ts ordering comment updated (`Metric.snapshot` → `Metric.value`); the lost hunk left it stale.
4. **Coverage:** `pnpm vitest run --project core --coverage` measures 0 files without
   `--coverage.include='src/**/*.ts'` (same as devtools); with it: all files 99.05 % statements, 96.97 % branches,
   99.22 % functions, 99.75 % lines (≥ 95 %).
5. No changeset: 13-07 owns `.changeset/evaluation-metrics-exported.md` / `metrics-read-by-reference.md`.
   Not breaking vs 0.11.0 (`CacheOutcome` still exported from the root; ids/descriptions/attributes unchanged).

## Gate results

- Task 1: golden GREEN on base; pins + GuardHealthCheck RED (module not found).
- Task 2: `pnpm vitest run --project core` 59 files / 1952 tests; `pnpm typecheck`, `pnpm lint` (house-style 421
  files clean), `pnpm circular` green; constructor count 0; barrel line present.
- Task 3: core 59 / 1951 (preregistration test moved), typecheck, lint green; literal count 0.
- After 9d4571c: core 59 / 1952, typecheck, lint, circular green.
- `pnpm spec:api`: 6 new core drifts (the six exports) + 13-04's 4 devtools drifts — expected until 13-11.
  `pnpm spec:verify`: still red on CCR-QD-399/400 register rows (13-11).

## For 13-06 / 13-07

- `packages/predicate-sql/src/index.ts:308` still cites "`Evaluate.ts`'s `decisionsAllowedTotal`/`decisionsDeniedTotal`"
  (stale; compilers are 13-06's).
- 13-07: ADR-QD-123, BEH-QD-368, INV-QD-259 are cited (ADR-QD-123 in `EvaluationMetrics.ts`, `Lifecycle.ts`,
  `PortMetrics.ts`, `EvaluationMetrics.test.ts`, `Ports.test.ts`); none written yet.

## For 13-11

- **overview rows:** three metric rows beside the port/hydration rows: `decisionsTotal` (record of two series),
  `denialsByPolicyTagTotal`, `evaluationDurationMillis`, `evaluationErrorsTotal`, `decisionCacheLookupsTotal`,
  `predicatesTranslatedTotal` — `EvaluationMetrics.ts`. The `CacheOutcome, CacheLookup` row (`overview.md:342`)
  splits: `CacheOutcome` → `EvaluationMetrics.ts`, `CacheLookup` stays `DecisionCache.ts`.
- **traceability:** `EvaluationMetrics.test.ts` and the eight converted test files → BEH-QD-368 (and BEH-QD-317 for
  GuardHealthCheck).
- CCR register row covering ARCH-61's metrics plans (13-07 picks the number).

## Ids

- Used/cited: ADR-QD-123 (cited; written by 13-07), ADR-QD-052/037/076/099 (merged meanings).
- Not used: BEH-QD-368, INV-QD-259 (13-07/13-11). Still free from earlier plans: BEH-QD-360..367,
  ADR-QD-121, ADR-QD-122.

## Commits

| sha | subject |
|---|---|
| e122d34 | test(13-05): golden — the registry key an exporter sees, pinned on the base |
| c448b47 | test(13-05): RED — the declaration pins and a typed zero read of decisionsTotal |
| bc63cd9 | feat(13-05): every evaluation metric is declared once, in EvaluationMetrics.ts |
| 7341b65 | test(13-05): every core metric assertion reads its export, not an id string |
| 9d4571c | test(13-05): a failed evaluation's span says Failed and names its error tag |
