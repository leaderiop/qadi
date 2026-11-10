---
id: ARCH-56
title: Declare evaluation metrics where both ends can import them. One exported `EvaluationMetrics` module that `Lifecycle`, `DecisionCache` and `Predicate` write through, typed reads in place of id-string matching, and every `qadi_*` metric listed once and gated
strength: Speculative   # from the 2026-10-13 architecture review (wave 5, card 11). The probes in §1 found a test-suite defect the card did not name (F1), which strengthens the case for the typed reads but not for any devtools reader
status: superseded-by-phase-13
disposition: "ported by Phase 13 (GAP-05, GAP-06) from rescue/wave5-1013 d089c1d; was `done` on the unmerged branch only (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []              # no hard dependency. Soft ordering with ARCH-55 (barrel) and ARCH-46 (PortMetrics and the port-metric tests); see §9
blocks: []
adrs_touched:
  - ADR-QD-052 (amend, via ADR-QD-NEXT. Its rule, "a contract whose key includes a prose string has to be declared once and imported", is stated for hydration only. It becomes the rule for every `qadi_*` metric: declared once at module scope, exported where an in-process reader in another package can exist, and listed in one gated table)
  - ADR-QD-009 (read: observability comes from Effect. Metrics stay the aggregate channel, and nothing here adds a sink or a span)
  - ADR-QD-051 (constraint: no span, span name or span attribute changes. `qadi.evaluate`/`qadi.toPredicate` annotations are untouched; the metrics are not part of the span contract)
  - ADR-QD-099 (constraint: `Lifecycle.ts` is out of the barrel and stays so. The new module is reached through the root `.`; no new entry point)
  - ADR-QD-037 (constraint: madge counts type-only edges. `EvaluationMetrics.ts` ⇄ `DecisionCache.ts` over `CacheOutcome` is a cycle, proven by spike; D-56-c settles it)
  - ADR-QD-076 (read: `ignoreStatic` means Stryker never mutates a module-scope metric declaration, so ids, descriptions and attribute values are protected by tests and the gate only)
  - ADR-QD-031 / ADR-QD-100 (read: the cache stays optional through `serviceOption`; `decideQuestion` keeps its emission order, with metrics before the sink record)
  - ADR-QD-077 (read: `toPredicate` is a second interpreter; its translation counter stays a sibling of the evaluator's, not an attribute on it)
packages: ["@qadi/core", "@qadi/audit (phase 3, no public change)", "@qadi/predicate-sql (phase 3, no public change)", "@qadi/predicate-prisma (phase 3, no public change)", "scripts (check-house-style.mjs)", "spec", "apps/website (docs)"]
estimate: M   # phase 1 (T1–T5) ≈ 1 day; phase 2 (T6–T7) ≈ ½ day; phase 3 (T8) ≈ ½ day; docs (T9–T10) ≈ ½ day. T1 alone (F1 patch) ≈ 1 hour (S)
---

# ARCH-56 — Declare evaluation metrics where both ends can import them

## 1. Verified evidence (at `b655b3b`)

Checked on `main` at `b655b3b` (`git rev-parse --short HEAD`). Nothing in the repository was edited.
Probes live under
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-56/`:

- **`core/`** is a copy of `packages/core/{src,test,package.json,vitest.config.ts}` with
  `node_modules` symlinked to `packages/core/node_modules` and a local `tsconfig.json` extending a
  copied `tsconfig.base.json`. Run: `cd <probe>/core && <repo>/node_modules/.bin/vitest run <files>`.
  Three probes ran in it, each from a fresh copy of the three source files:
  - **rename probe**: the six evaluation-metric ids suffixed `_renamed` in `Lifecycle.ts`,
    `DecisionCache.ts` and `Predicate.ts`, then the five test files run (JSON report `rename.json`).
  - **description probe**: every evaluation-metric `description` replaced with `"MUTATED"`, then
    the whole core suite run.
  - **module spike**: `src/EvaluationMetrics.ts` holds the six declarations. The three writers import
    from it, `CacheOutcome` moves into it, and the barrel exports it. Then `madge --circular`, `tsc`
    (the scratch tree has no `@types/node`, so `crypto`/`console`/`process` errors are filtered) and
    the full core suite. `test/EvalMetricsProbe.test.ts` tries typed reads.
- **`probe/attrs.mts`** (tsx) checks what a `Metric.withAttributes` wrapper exposes, and whether a
  read registers a series.

| # | Claim (review card 11, the brief, or found here) | Verdict | At `b655b3b` |
| - | ------------------------------------------------ | ------- | ------------ |
| C1 | ADR-QD-052 says a metric is a contract both ends import, because the registry key includes the description and a re-declaration silently reads zero | **CONFIRMED** | `spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md` § Decision: "**It compiles and reads zero forever.** `Metric`'s registry key is `type:id:description` … A contract whose key includes a prose string cannot be restated; it has to be declared once and imported." The key function is `makeKey` in `node_modules/effect/src/Metric.ts` (`JSON.stringify([metric.type, metric.id, metric.description, entries])`, effect `4.0.0`). The rule is written **for hydration only**: title, Decision table and Consequences name the five hydration metrics. |
| C2 | `PortMetrics` and `HydrationMetrics` (react) follow that rule | **CHANGED: both follow it, but `HydrationMetrics` is in core** | `packages/core/src/PortMetrics.ts` exports `portCallsTotal`, `portRetriesTotal`, `portTimeoutsTotal`, `servedPortCallsTotal`, `predicatePortCallsTotal`. `packages/core/src/HydrationMetrics.ts` exports `hydrationDehydratedTotal`, `hydrationSeededTotal`, `hydrationDroppedTotal`, `hydrationRechecksTotal`, `hydrationMismatchesTotal`. Both are in the core barrel (`packages/core/src/index.ts`) and have rows in `spec/overview.md` (§ Services). `@qadi/react` only **writes** the hydration metrics (`HydrationCounts.ts`, off fiber); the declarations are core's, by ADR-QD-052's own argument ("`@qadi/core` is the only package both of them already depend on"). |
| C3 | Decision, error, duration, cache-lookup and translation metrics are module-private in `Lifecycle.ts` (~:56–135, four), `DecisionCache.ts` (~:146), `Predicate.ts` (~:647) | **CONFIRMED, with one structural nuance** | `Lifecycle.ts`: `decisionsTotal` (`:56`) with the two module-scope series `decisionsAllowedTotal`/`decisionsDeniedTotal` (`:59-60`), `denialsByPolicyTagTotal` (`:76`), `evaluationDurationMillis` (`:91`), `EVALUATION_ERROR_TAGS_BY_TAG` (`:103`), `evaluationErrorsTotal` (`:133`). Writes are in `decideQuestion` (`:228`, `:262-266`). `DecisionCache.ts`: `CACHE_OUTCOMES_BY_OUTCOME` (`:127`), `cacheLookupsTotal` (`:146`), written in `getOrCompute` (`:429`, `:435`, `:438`). `Predicate.ts`: `predicatesTranslatedTotal` (`:647`), written in `toPredicate` (`:701`). **Nuance:** `Lifecycle.ts` is itself out of the barrel (its own doc: "Package-private: out of the barrel (ADR-QD-099)"), so exporting in place would make its four importable by core's tests only. `DecisionCache.ts` and `Predicate.ts` are barrel modules, so an in-place `export` would make those two public. "Export in place" therefore cannot give one answer for all six. |
| C4 | *(brief)* Classify every `Metric.counter/histogram/gauge/…` across all `packages/*/src` | **22 declarations: 10 exported, 12 private** | `grep -rn "Metric\.\(counter\|histogram\|gauge\|frequency\|summary\|timer\)(" packages/*/src` gives 24 lines. Two are doc-comment mentions (`CircuitBreaker.ts:189`, `HydrationMetrics.ts:215`). **Exported (10):** the five port and five hydration metrics (C2). **Private (12):** core 6 (C3); `@qadi/audit` 4 (`AuditWriteReport.ts`'s `writesTotal` `:153`, `stagingTotal` `:164`, `entriesLostTotal` `:191`, each split into `Record<Label, Metric.Counter<number>>` series, and `CircuitBreaker.ts`'s `transitionsTotal` `:204`); `@qadi/predicate-sql` 1 (`index.ts:315`); `@qadi/predicate-prisma` 1 (`index.ts:425`). `@qadi/http`, `@qadi/react`, `@qadi/devtools`, `@qadi/testing` and `@qadi/promise` declare none. `AuditWriteReport.ts` and `CircuitBreaker.ts` are out of `@qadi/audit`'s barrel. Each compiler's `index.ts` is that package's entry point **and** its implementation. |
| C5 | Tests find the metrics by matching id strings in snapshots: `Evaluate.test.ts` ~:3200+, `DecisionSink.test.ts` ~:170+, `DecisionCache.test.ts` ~:1170, `Predicate.test.ts` ~:1312, `GuardHealthCheck.test.ts` ~:147 | **CONFIRMED: 18 tests in those 5 files** | Each file has local `counterOf`/`frequencyOf`/`histogramOf`/`errorFrequencyOf` helpers doing `snapshots.find((s) => s.type === … && s.id === "qadi_…")`. Per test (from the rename probe's report): `DecisionCache.test.ts` 2, `DecisionSink.test.ts` 6, `Evaluate.test.ts` 7, `GuardHealthCheck.test.ts` 1, `Predicate.test.ts` 2, so **18**. Of these, 12 assert a value is present and **6 assert absence** (`assert.isUndefined(find…)`). |
| C6 | *(found here)* The string-id habit is not only forced by privacy: tests of **exported** metrics match strings too | **CONFIRMED** | `Ports.test.ts:99`, `:293` (`s.type === "Frequency" && s.id === id`) and `PortServe.test.ts:114`, `:119` read exported port metrics by id string. `PortConformance.test.ts`, `PortDescription.test.ts` and `devtools/test/model/Wiring.test.ts` already read them typed with `Metric.value(portRetriesTotal)` etc. Literal baseline: a scan of `packages/*/test` for an exact `"qadi_…"` literal outside a `describe(`/`it(` title gives **57 literals in 13 files**: audit `CircuitBreaker.test.ts` 4, `Metrics.test.ts` 8, `driveExit.ts` 6; core `DecisionCache` 1, `DecisionSink` 4, `Evaluate` 5, `GuardHealthCheck` 1, `HydrationMetrics` 5, `PortServe` 2, `Ports` 17, `Predicate` 2; `predicate-prisma` 1; `predicate-sql` 1 (the T6 scan command reproduces it). |
| F1 | *(found here, not in the card)* **DEFECT (test suite): six negative metric assertions are vacuous under an id rename** | **CONFIRMED (rename probe)** | With the six ids renamed in source, **12 tests fail and 6 still pass**. The 6 are `Evaluate.test.ts` › "does not count a failed evaluation as either outcome", "an allow adds nothing to the denial frequency", "does not record a sample for a failed evaluation"; `DecisionSink.test.ts` › "a successful evaluation adds nothing to the error frequency"; `GuardHealthCheck.test.ts` › "a probe counts no decisions"; `Predicate.test.ts` › "does not count a translation that fails". `find(id === "qadi_…")` returns `undefined` both when the metric was not touched and when the string names nothing. So a rename that updates the positive tests' helpers and misses these leaves their requirements unguarded. One is normative: **BEH-QD-317** (`05-evaluator.md`: "`createGuardHealthCheck` … MUST NOT update `qadi_decisions_total`") is guarded only by `GuardHealthCheck.test.ts`'s vacuous-on-rename check. Same shape outside scope: `PortServe.test.ts:119` (`isUndefined(find(id === "qadi_port_calls_total"))`), and possibly `audit/test/Metrics.test.ts:176`. **Severity: low** (no product defect; a guard that can silently stop guarding). **Test-first patch: T1**, shippable without the refactor. |
| F2 | *(found here)* Nothing pins any evaluation metric's description, type or attribute values | **CONFIRMED (description probe)** | With all six descriptions set to `"MUTATED"`, the whole core suite passes (58 files, 1834 tests in the spike tree). Stryker cannot catch it either: `stryker.config.mjs` sets `ignoreStatic: true` (ADR-QD-076), so module-scope declarations are never mutated. Contrast: `HydrationMetrics.test.ts` § "the registry key" pins id/type/description for its five; `Ports.test.ts:371` "the descriptions are pinned, because the description is part of the registry key" pins the port five; `audit/test/Metrics.test.ts` and both compiler `Metrics.test.ts` pin theirs. Core's evaluation metrics are the only metrics with no pin. |
| C7 | *(brief)* Devtools/react/examples (nextjs-newsroom) re-declare a metric today (a silent-zero DEFECT if the description differs) | **REFUTED: no re-declaration anywhere** | `grep -rIn "Metric\.\|qadi_[a-z_]*_total" examples features apps/website/src` (excluding `node_modules`, `tsbuildinfo`, `.next`, `dist`) gives prose only: `examples/nextjs-newsroom/app/edge/mixed-payload/page.tsx:75`, `src/server/ports.ts:13,90`, two website pages. The only metric declarations in the repo are the 22 in C4. `@qadi/devtools` reads the port metrics typed (`model/Wiring.ts` `portActivity`, `Metric.value(portCallsTotal)` …) and the hydration metrics typed off the default registry (`model/Hydration.ts`, ARCH-45 D-45-h). **No silent-zero defect exists**, so there is no test-first task for one. |
| C8 | "Devtools can't read them without re-declaring" | **CONFIRMED as a capability gap; REFUTED as a need** | True: none of the six is importable from another package. But no devtools screen, spec line or claim of absence asks for them. `grep -rn -i "hit rate\|cache_lookups\|decisions_total\|evaluation_errors" spec/devtools-spec packages/devtools/src` finds only `02-screens.md:117` "**Cache hit/miss is now per decision.**", the per-record `cache` field (BEH-QD-189), which the timeline already reads. A process-wide decision count beside a per-record timeline would double-report. D-56-g records this; the plan adds no reader. |
| C9 | *(memory, brief)* The registry keys on `type:id:description`; since 4.0.0 a fresh registry isolates on-fiber writes, while off-fiber writes always hit the default registry | **CONFIRMED, and all six are on fiber** | `Metric$.hook` memoises only the key on the metric object and does `Context.get(context, MetricRegistry)` **on every update** ("The registry owns the series, so it is looked up on every update."). All six writes are `yield* Metric.update(…)` on the evaluating fiber (`getOrCompute`'s update runs before its `forkDetach`), so `isolatedMetrics` (`@qadi/testing`, `core/test/helpers.ts`) scopes them and a host's own `MetricRegistry` receives them. The hydration counters are the off-fiber exception (ADR-QD-052 amendment, ARCH-45 D-45-h: both ends name `Context.empty()`); nothing here touches them. |
| C10 | *(found here)* A typed read of the **untagged** `qadi_decisions_total` base reads zero and creates a phantom series | **CONFIRMED (spike `EvalMetricsProbe.test.ts`)** | After one denying `evaluate`, `Metric.value(decisionsTotal.Deny)` gives `count: 1` but `Metric.value(<base counter>)` gives `count: 0`. The snapshot then holds a **third** `qadi_decisions_total` series with `attributes: null` next to `{outcome:"allow"}`/`{outcome:"deny"}`. So exporting the base counter invites a reader that always reads 0, and makes an exporter emit an empty untagged series. D-56-d therefore exports only the two tagged series. |
| C11 | *(found here)* Reading a metric registers it, preregistered words included | **CONFIRMED (`probe/attrs.mts`)** | `Metric.frequency(…, { preregisteredWords: ["p","q"] }).valueUnsafe(registry)` on an empty registry adds the series with `p: 0, q: 0`. A wrapper from `Metric.withAttributes` exposes `id`/`type`/`description` but **not** its attributes, so an attribute pin has to read the series from a snapshot. Consequence: a passive reader of the default registry (as `portActivity` is) makes an exporter emit zeroed series for metrics nothing wrote (for example `qadi_decision_cache_lookups_total` in an application with no cache). This is a second reason for D-56-g. |
| C12 | *(found here)* Is the set of metric ids documented, and is that document gated? | **Not documented as a set; nothing gated** | `spec/` names the evaluation metrics only in prose: `05-evaluator.md` BEH-QD-317, `24-decision-sink.md` (`qadi_evaluation_errors_total`), `25-inspection.md` (`:44` cache lookups, `:298` denials), `invariants.md:2978`. There is no table of ids, types and series, and no gate connects prose to source. `apps/website` names no core metric except `qadi_port_served_calls_total` (`concepts/services-resolvers.md:137`) and the three audit ones (`packages/audit/capabilities.md`). The website does not document the evaluation metrics at all. This is the AGENTS.md §15 situation ("Documentation is gated, not remembered") before it has drifted. |
| C13 | *(found here)* Stale prose about where the metrics live and how the registry keys | **CONFIRMED, low** | `Predicate.ts` `predicatesTranslatedTotal` doc (`:645`): "the same reason `Evaluate.ts`'s `qadi_decisions_total` exists" (it moved to `Lifecycle.ts`, ARCH-16). `PortMetrics.ts` module doc (`:23`): "the cardinality reason `Evaluate.ts` gives for keying denials" (now `Lifecycle.ts`), and "The `description` strings below survive mutation testing … nothing reads them back" (contradicted by `Ports.test.ts:371`, which pins them). `predicate-sql/src/index.ts:308-313` and `predicate-prisma/src/index.ts:419-423`: "mirrors `Evaluate.ts`'s `decisionsAllowedTotal`/`decisionsDeniedTotal`" and "memoizes per metric *object*" (stale since effect 4.0.0, ADR-QD-052 amendment 1.2). `spec/behaviors/31-predicate-compilation.md:99-104`: "mirrors the counter `Predicate.ts` already declares for `toPredicate` itself: tagged by outcome (`compiled` / `refused`)". **False**: `qadi_predicates_translated_total` has no outcome attribute and counts successes only. It also repeats the memoisation claim. **Operator-facing**: `portCallsTotal`'s *description string* says "Scoped to Evaluate.ts only — Predicate.ts's translateNode reaches …", and `translateNode` no longer exists (`grep -n translateNode packages/core/src/*.ts` finds only that string). It is registry-keyed and pinned by `Ports.test.ts`, and it belongs to ARCH-46 (§9). |
| C14 | Madge cycles if `Lifecycle`/`DecisionCache`/`Predicate` import a shared module | **CONFIRMED for one edge; settled by spike** | Spike, first form: `EvaluationMetrics.ts` imports `type CacheOutcome` from `DecisionCache.ts` (for the frequency's closed domain), and `DecisionCache.ts` imports `cacheLookupsTotal`. madge reports `✖ Found 1 circular dependency! 1) DecisionCache.ts > EvaluationMetrics.ts`. Second form: `CacheOutcome` declared in `EvaluationMetrics.ts`; `DecisionCache.ts`, `DecisionRecord.ts`, `SinkEmit.ts` and `Lifecycle.ts` import it from there. madge reports `✔ No circular dependency found!` (71 files). `tsc` is clean apart from the filtered node-global noise, and the full core suite passes (58 files, 1834 tests). The other edges `EvaluationMetrics.ts` needs (`POLICY_TAGS` from `Policy.ts`, `type EvaluationError` from `Errors.ts`, `type Decision` from `Decision.ts`) are acyclic. Precedent for the second form: `PortMetrics.ts` already owns `PortName`, the port registry's vocabulary, because it is the metric's closed domain. |
| C15 | `CacheOutcome`'s three words are restated elsewhere | **CONFIRMED, out of scope** | `SinkCodec.ts:146` `cache: Schema.optional(Schema.Literals(["hit", "coalesced", "miss"]))`. The words are now in three places: the type, the metric's `Record<CacheOutcome, true>`, and the wire literal. Recorded for a loose-ends wave. This plan moves the first two together and does not touch the codec (§3). |

**Other facts the plan relies on.**

- `Metric.update(decisionsTotal[decision._tag], 1)` (a `Record` keyed by `Decision["_tag"]`) compiles and
  writes the same two series as today's ternary over `decisionsAllowedTotal`/`decisionsDeniedTotal`.
  In the spike it gives the same snapshot attributes (`{outcome:"allow"}`/`{outcome:"deny"}`) and passes
  the existing decision tests.
- `scripts/check-house-style.mjs` already cross-checks an AGENTS.md table against source
  (`[schema-error-table]`, `SCHEMA_ERROR_BUDGET`). A metric table check is the same shape and needs no
  new gate number (it runs under gate 4, `node scripts/check-house-style.mjs`).
- No test reads a `spec/` file; doc-to-source checks live in `scripts/` (gates 4, 9, 11–13, 23).
- **Repository hygiene (not this plan's doing, reported to the orchestrator):** at 00:53:47 today, 154
  untracked `*.d.ts`/`*.d.ts.map` files appeared under `packages/core/src` and `packages/http/src`
  (`git status --short | wc -l` → 154; `git ls-files packages/core/src | grep '\.d\.ts$'` → none).
  They came from a declaration emit into `src`, most likely another wave-5 probe. They are untracked and
  not ignored, so `madge`, `oxlint` and `check-house-style.mjs` may scan them. T0 must confirm a clean
  tree before any gate run.

## 2. Goal and success criteria

**Goal.** Six evaluation metrics are a contract between the module that writes them (`Lifecycle.ts`'s
`decideQuestion`, `DecisionCache.ts`'s `getOrCompute`, `Predicate.ts`'s `toPredicate`) and whoever reads
them: core's own tests today, and potentially a host's tests or a future devtools reading. Today that
contract has no interface. Its key is three string literals scattered across three modules, and readers
restate the id. Make one small, **deep** module, `EvaluationMetrics.ts`, shaped like `PortMetrics.ts`.
Its interface is six exported metric values, each carrying its id, type, description, series and closed
word domain. The three writers become adapters that write through it. Readers import the values, so the
id string leaves the read side entirely, and a rename or reword changes one line and is caught by one pin.
**Locality:** every fact about a metric (id, description, series, closed domain, cardinality reasoning)
sits in one module. **Leverage:** the 18 tests and the website example read through the same interface the
writers use. Around it, a gated table lists every `qadi_*` metric across the repository, so the
documentation of what Qadi counts cannot drift from the declarations. This is AGENTS.md §15 applied to a
surface that has no table yet.

**Success criteria.**

1. `packages/core/src/EvaluationMetrics.ts` exists. It exports `decisionsTotal` (a
   `{ readonly [T in Decision["_tag"]]: Metric.Counter<number> }`), `denialsByPolicyTagTotal`,
   `evaluationDurationMillis`, `evaluationErrorsTotal`, `decisionCacheLookupsTotal`,
   `predicatesTranslatedTotal` and the type `CacheOutcome` (names per D-56-d, ownership per D-56-c). It is in
   the core barrel. `git grep -n "Metric\.\(counter\|frequency\|histogram\)(" packages/core/src/Lifecycle.ts packages/core/src/DecisionCache.ts packages/core/src/Predicate.ts`
   finds nothing.
2. **The registry key is unchanged.** For each of the seven series, `[type, id, description, attributes]`
   is byte-identical to `b655b3b`. T2's golden is written on `main` before any move, and passes before
   and after.
3. `pnpm circular` is clean, with no new madge cycle.
4. **F1 closed.** Re-running the rename probe against the finished branch makes **all 18** metric tests
   fail or stop compiling. None passes vacuously.
5. `git grep -nE '"qadi_(decisions|denials_by_policy_tag|evaluation_duration|evaluation_errors|decision_cache_lookups|predicates_translated)[a-z_]*"' packages/core/test`
   finds literals only in `EvaluationMetrics.test.ts`'s pin block and in `describe`/`it` titles.
6. `node scripts/check-house-style.mjs` enforces three rules (D-56-f): `[metric-declaration]` (every `qadi_*` metric
   is a module-scope `const`, exported when it is core's), `[metric-table]` (the 22 declarations and the
   spec table agree in both directions on id, type and home file), and `METRIC_ID_LITERAL_BUDGET` (exact
   per-file counts of `"qadi_…"` literals in tests, checked in both directions). Deleting a table row, adding
   an undeclared row, or adding a string-matched read fails the gate.
7. `node scripts/check-api-surface.mjs` passes, with `spec/overview.md` rows for the six new exports and
   `CacheOutcome`'s row naming `EvaluationMetrics.ts`.
8. A compiled `typescript` fence on the website reads `decisionsTotal.Allow`/`.Deny` typed
   (gate 23, `node scripts/check-website-doc-examples.mjs`).
9. `pnpm check` is green, including Stryker on core at or above 80% with no new survivor in
   `EvaluationMetrics.ts`, `Lifecycle.ts`, `DecisionCache.ts` or `Predicate.ts`'s metric write sites.

## 3. Non-goals

- **No devtools reader** for evaluation metrics (D-56-g). Per-decision cache outcome already travels on
  `DecisionRecord.cache` (BEH-QD-189). A passive reader of the default registry would register zeroed
  series an exporter then emits (C11).
- **No change to any id, description, type, boundary, preregistered word or attribute value** (criterion 2).
  ADR-QD-052: the description is half the key. Rewording `portCallsTotal`'s stale description (C13) is
  ARCH-46's decision, because it changes the series an exporter sees.
- **No merge of `PortMetrics.ts` or `HydrationMetrics.ts` into the new module** (D-56-b). Those modules
  also own `PortName`/`PortSpanName` and the hydration drop vocabulary, and ARCH-46/ARCH-53/ARCH-55 are
  reshaping them in the same wave.
- **No public export of audit or compiler metrics** (D-56-e). Their readers are their own tests and
  external exporters, and `@qadi/devtools` depends on neither package.
- **No change to `SinkCodec.ts`'s cache literal** (C15) and no new span or span attribute (ADR-QD-051).
- **No change to off-fiber hydration accounting** (ADR-QD-052 amendment, ARCH-45 D-45-h, ARCH-53).
- **No change to `decideQuestion`'s emission order** (metrics, then span, then sink record; INV-QD-035).
  The `DecisionSink.test.ts` "record ordering" tests stay and keep proving it.

## 4. Constraints

- **AGENTS.md §1** (imports): `import * as Metric from "effect/Metric"`, `import * as Record from "effect/Record"`,
  `import type { Decision } …`, `import type { EvaluationError } …`, `.ts` extensions. `verbatimModuleSyntax`
  makes the type-only imports `import type`.
- **AGENTS.md §6** (forbidden): no `as` (the series record is **annotated**, not `as const`-asserted), no `any`,
  no `switch` (the Allow/Deny choice becomes a `Record` index, removing a ternary). `ANY_BUDGET`,
  `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `SCHEMA_ERROR_BUDGET`, `HAS_CUSTOM_BUDGET` and `PORT_DOUBLE_BUDGET`
  are unaffected: no file in their tables is touched in a way they count. `DECISION_READ_BUDGET` is
  untouched.
- **AGENTS.md §5 / ADR-QD-051 / ADR-QD-073**: `decideQuestion` stays `Effect.fn("qadi.evaluate")` and
  `toPredicate` stays `Effect.fn("qadi.toPredicate")`. No span name or attribute moves.
- **AGENTS.md §9 / ADR-QD-099**: core's barrel stays `export *`, alphabetical, until ARCH-55 lands. The new
  line is `export * from "./EvaluationMetrics.ts";` between `EvaluationId.ts` and
  `EvaluationServicesNone.ts`. `Lifecycle.ts` stays out of the barrel. No new entry point. If ARCH-55's
  named barrel lands first, add the seven names to its `EvaluationMetrics.ts` group instead.
- **AGENTS.md §15 / gate 13** (`node scripts/check-api-surface.mjs`): every new export gets a
  `spec/overview.md` row in the same commit. `CacheOutcome`'s existing row
  (`| \`CacheOutcome\`, \`CacheLookup\` | type | \`DecisionCache.ts\` |`) splits, since `CacheLookup` stays in
  `DecisionCache.ts`.
- **ADR-QD-037 / gate 5** (`madge --circular --extensions ts,tsx packages/*/src`): `EvaluationMetrics.ts` may
  import only `effect/*`, `Policy.ts` (`POLICY_TAGS`) and types from `Errors.ts`/`Decision.ts`. It must
  import nothing from `DecisionCache.ts`, `Lifecycle.ts` or `Predicate.ts` (C14).
- **ADR-QD-076 / gates 16–22** (Stryker): `ignoreStatic` leaves declarations unmutated, so the pin test (T3)
  is their only guard. The label literals inside function bodies (`"hit"`, `"coalesced"`, `"miss"`,
  `error._tag`, `question.policy._tag`) **are** mutated and must stay killed by the typed tests (T4).
- **AGENTS.md §11**: spec is normative. Behavior, invariant and traceability change in the same change
  (T10).
- **AGENTS.md §16 / ADR-QD-038**: one changeset, `@qadi/core` `minor`, **not breaking** (additive exports;
  `CacheOutcome` still exported from the root under the same name). No release step without the user's
  explicit go-ahead.
- **AGENTS.md §10**: core coverage at 95%. The new module is declarations only, and every line runs at import.

## 5. Decisions needed before work starts

### D-56-a — Are the evaluation metrics public, or package-private with tests importing by path?
- **A. Public: exported from `@qadi/core`'s root** like `PortMetrics`/`HydrationMetrics`. *For:* ADR-QD-052's
  rule names "a reader". `@qadi/devtools` depends only on core, so a future reading is possible without
  re-declaring. A host's own tests can assert "this route denied and counted" with
  `Metric.value(decisionsTotal.Deny)` instead of scanning snapshots by string, which is the leverage the
  card names. The change is additive, so `minor`. *Against:* six more public names to keep stable. A
  description edit becomes a public change. It already is one for any OTLP consumer, since HELP text
  changes.
- **B. Package-private module** (`EvaluationMetrics.ts` out of the barrel; core tests import
  `../src/EvaluationMetrics.ts`). *For:* no public surface growth, and the typed test reads still happen.
  *Against:* devtools and hosts keep the string-matching habit the card is about. The module would be
  the only metric module in core that is not public, which makes it an odd one out.
- **Recommendation: A.** The deciding fact is that core is the one package every in-process reader can
  depend on (ADR-QD-052's own argument). Hiding core's most-used metrics there would leave the one
  reachable contract unreachable.
- `status: open`

### D-56-b — One new module beside `PortMetrics`, or one consolidated metrics module?
- **A. New `EvaluationMetrics.ts`**, a sibling of `PortMetrics.ts` and `HydrationMetrics.ts`, one module per
  population (evaluation / ports / hydration). *For:* each module's doc keeps one subject; small diff;
  no churn in files ARCH-46/53/55 are reshaping. *Against:* three metric modules.
- **B. One `Metrics.ts`** holding all 16 core metrics. *For:* one place to look. *Against:* it drags in
  `PortName`/`PortSpanName` and the hydration drop vocabulary (`hydrationDropMeaning`), which are not
  metrics. That makes a shallow grab-bag rather than a deep module. It collides with three sibling plans.
- **C. Export in place** (no new module). *Against:* impossible for `Lifecycle.ts` (C3, out of the barrel) and
  leaves three declaration sites.
- **Recommendation: A.** Consolidation, if wanted, is a follow-up once ARCH-46/53/55 settle the
  port and hydration modules. The `[metric-table]` gate (D-56-f) already gives the cross-module view.
- `status: open`

### D-56-c — Where does `CacheOutcome` live, given the madge cycle?
- **A. `EvaluationMetrics.ts` owns `CacheOutcome`.** `DecisionCache.ts`, `DecisionRecord.ts`, `SinkEmit.ts` and
  `Lifecycle.ts` import it from there; no re-export from `DecisionCache.ts`. *For:* spike-proven acyclic
  (C14). It follows the `PortMetrics.ts`/`PortName` precedent. The exhaustiveness `Record<CacheOutcome, true>`
  sits beside the frequency it closes. *Against:* the cache's own vocabulary is declared in a metrics module,
  which a reader of `DecisionCache.ts` follows one import to find. It is still exported from the root under
  the same name, so nothing breaks.
- **B. The cache metric stays in `DecisionCache.ts`, exported in place** (`decisionCacheLookupsTotal`). *For:* no
  type moves. *Against:* two declaration homes for "evaluation metrics", so the card's "one module" is not
  met, and the table gate must accept both.
- **C. `EvaluationMetrics.ts` exports a word tuple, and `DecisionCache.ts` derives `CacheOutcome` from it.**
  *Against:* the same inversion as A with an extra derived type, and nothing gained.
- **Recommendation: A** (B is an acceptable fallback if the reviewer objects to the inversion).
- `status: open`

### D-56-d — How is `qadi_decisions_total` exposed, and what are the export names?
- **A. One record keyed by the decision tag**: `decisionsTotal: { readonly [T in Decision["_tag"]]: Metric.Counter<number> }`
  = `{ Allow: withAttributes(base, {outcome:"allow"}), Deny: withAttributes(base, {outcome:"deny"}) }`, with the
  untagged base **unexported**. `decideQuestion` writes `decisionsTotal[decision._tag]`. *For:* a third `Decision`
  tag is TS2741 until it gets a series. The ternary goes away. The base-read hazard (C10) is
  unreachable. It is the `Record<Label, Counter>` shape `@qadi/audit` already uses (`WRITES_COUNTERS`). The
  attribute values stay lowercase, so the key is unchanged.
- **B. Two names**, `decisionsAllowedTotal`/`decisionsDeniedTotal`, today's private names. *For:* zero
  reshaping. *Against:* no exhaustiveness. The ternary stays.
- **C. Export the base `decisionsTotal` too.** *Against:* C10. It reads 0 and creates a phantom series.
- **Names:** the camelCase of the id without `qadi_`, as the port and hydration metrics do:
  `decisionsTotal`, `denialsByPolicyTagTotal`, `evaluationDurationMillis`, `evaluationErrorsTotal`,
  `decisionCacheLookupsTotal` (not today's `cacheLookupsTotal`, which is too generic for the flat
  namespace), `predicatesTranslatedTotal`.
- **Recommendation: A with those names.**
- `status: open`

### D-56-e — Scope beyond core's six
- **A. Core's six only.** Other packages untouched; no table.
- **B. A, plus the repository-wide table gate** (D-56-f) covering all 22 declarations, so every `qadi_*` metric is
  listed and checked. Audit and compiler declarations unchanged; their tests keep string reads (budgeted).
- **C. B, plus typed reads everywhere, still without public surface.** Audit's four become `export const` in their
  already package-private modules (`AuditWriteReport.ts`, `CircuitBreaker.ts`; the label-keyed `Record`s
  exported as they are). Each compiler's counter moves from `index.ts` (the public entry) into a new
  package-private `src/CompileMetrics.ts`, which the package's `exports` map does not reach (ADR-QD-099). The audit and compiler tests then read
  them typed, and `METRIC_ID_LITERAL_BUDGET` goes to pins-only everywhere.
- **D. C, with audit and compiler metrics public.** *Against:* no reader exists outside their packages, and
  `@qadi/devtools` depends on neither. Public surface without a reader is a commitment with no return.
- **Recommendation: C, layered**: phase 1 (core) ships alone; phase 2 (gate) and phase 3 (audit,
  compilers) each ship separately and each can be dropped without touching the others. D is the "complete"
  option, and it is wrong here for the reason given against it.
- `status: open`

### D-56-f — How is the metric table gated?
- **A. Three rules inside `check-house-style.mjs` (gate 4)**, no new gate number:
  - `[metric-declaration]`: every `Metric.(counter|frequency|histogram|gauge|summary|timer)(` call in
    `packages/*/src` is the initializer of a **module-scope** `const` whose first argument is a string literal
    `"qadi_…"`. In `packages/core/src` it must be `export const`. Any such call in `packages/*/test`,
    `features/`, `examples/` with a `"qadi_` id fails: a reader that re-declares reads zero (ADR-QD-052).
  - `[metric-table]`: the `| Metric | Type | Series | Declared in | Reader |` table under the new BEH in
    `spec/behaviors/25-inspection.md` and the declarations agree **in both directions** on id, type and file.
    This is modelled on `[schema-error-table]`.
  - `METRIC_ID_LITERAL_BUDGET`: exact per-file counts of `"qadi_[a-z_]+"` literals in `packages/*/test` outside
    `describe(`/`it(`/`it.effect(`/`it.scoped(`/`it.live(`/`test(` titles, checked in both directions like
    `SWITCH_BUDGET`. The pin files keep theirs; everything else trends to zero.
- **B. A core test pinning only core's metrics** (no spec table). *Against:* the spec stays ungated prose.
  AGENTS.md §15 exists because two documents drifted twice.
- **C. A new gate script and DoD row.** *Against:* the rules fit gate 4's existing machinery, and a new gate
  means editing `check` and the DoD table for no added power.
- **Recommendation: A.** Descriptions are pinned by tests, not by the gate. `PortMetrics.ts` builds them by
  string concatenation, so a regex over source cannot read them reliably. Tests import the values.
- `status: open`

### D-56-g — Does `@qadi/devtools` gain an evaluation-activity reading now?
- **A. No.** The exports make it possible. Nothing in `spec/devtools-spec` asks for it (C8). A passive reader
  of the default registry would register zeroed series an exporter emits (C11).
- **B. Yes, a headless `evaluationActivity` beside `portActivity`.** *Against:* a screen, a spec section, a
  claim-of-absence row (gate 12) and a design question (process-wide counts beside a per-record timeline)
  that the review did not raise.
- **Recommendation: A.**
- `status: open`

### D-56-h — New ADR, or amend ADR-QD-052?
- **A. New `ADR-QD-NEXT` "A metric is declared once, where its readers can import it, and listed where its
  operators can read it"** that **amends ADR-QD-052** (generalises its rule from hydration to every `qadi_*`
  metric) and reads ADR-QD-009. *For:* discoverable by title. ADR-QD-052's title and tables are
  hydration-specific.
- **B. Amend ADR-QD-052 in place (Rev 1.3).** *For:* one fewer document. *Against:* a reader looking for
  "metric rules" does not open a hydration ADR.
- **Recommendation: A.**
- `status: open`

## 6. Tasks

Phases: **phase 0** = T1 (the F1 patch; ships alone, whatever happens to the rest). **Phase 1** = T2–T5
(core module, typed reads). **Phase 2** = T6–T7 (gate, table, port-metric reads). **Phase 3** = T8 (audit,
compilers). **Docs** = T9–T10. **Close** = T11. Each phase is one commit or PR, and each runs T11's verify
list before merging.

### T0 — Re-verify evidence at the branch point
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch main && git pull && git status --short`. The tree must be clean. If the stray
     `packages/*/src/*.d.ts` files from §1 are still there, stop and ask. Do not delete files this plan did
     not create.
  2. `git switch -c arch-56/evaluation-metrics`.
  3. Re-run C4's inventory:
     `grep -rn "Metric\.\(counter\|histogram\|gauge\|frequency\|summary\|timer\)(" packages/*/src | grep -v "^\S*:\s*\*"`.
     Expect 22. If ARCH-46/53/55 moved a declaration, update §1 and T6's table first.
  4. Re-run C5/C6's literal count (the node one-liner in T6 step 4, run against `main`). Expect 57 in
     13 files, or record the new numbers.
  5. Re-check the symbols, not the line numbers: `Lifecycle.ts` `decisionsTotal`, `denialsByPolicyTagTotal`,
     `evaluationDurationMillis`, `evaluationErrorsTotal`, `decideQuestion`; `DecisionCache.ts` `CacheOutcome`,
     `cacheLookupsTotal`, `getOrCompute`; `Predicate.ts` `predicatesTranslatedTotal`, `toPredicate`.
  6. Re-run the rename probe (copy `packages/core` to a scratch dir as in §1, suffix the six ids, run the five
     files). Expect 12 failed and 6 passed with the six names in F1. This is the "before" picture T4 must flip.
  7. Check whether ARCH-55 (named barrel) or ARCH-46 (PortMetrics, `Ports.test.ts`) has landed, and note it
     in §10.
- **Tests:** none
- **Verify:** the commands above
- **Done when:** every row in §1 re-checks, or §1 is corrected first.

### T1 — F1 patch: make the six negative metric assertions non-vacuous (test-only, ships alone)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/core/test/Evaluate.test.ts` (`describe("qadi_decisions_total / qadi_denials_by_policy_tag_total")`,
  `describe("qadi_evaluation_duration_millis")`), `packages/core/test/DecisionSink.test.ts` ("a successful evaluation adds
  nothing to the error frequency"), `packages/core/test/GuardHealthCheck.test.ts` ("a probe counts no decisions"),
  `packages/core/test/Predicate.test.ts` ("does not count a translation that fails")
- **Steps:**
  1. **Red first.** In a scratch copy (as in §1), apply the rename probe, run the five files, and record that the six
     pass. That is the defect.
  2. In each of the six tests, after the existing absence assertion and **inside the same `isolatedMetrics`
     scope**, add a positive control that exercises the writer and asserts the same id is now present.
     Examples: GuardHealthCheck: `yield* evaluate(canRead)` then `assert.isDefined(find(id === "qadi_decisions_total"))`.
     Predicate: `yield* translate(P.hasRole("editor"))` then `isDefined(find(…translated…))`. DecisionSink:
     `yield* Effect.result(evaluate(<failing>))` then `isDefined(frequencyOf(…errors…))`. Evaluate ×3: the
     matching allow, deny or decided evaluation. The control proves the string still names a metric
     this registry can hold. Keep the absence assertion first and unchanged.
  3. Re-run the rename probe against the patched tests. Expect all 18 to fail.
- **Tests:** the six tests above, each with one added control.
- **Verify:** `pnpm vitest run packages/core/test/Evaluate.test.ts packages/core/test/DecisionSink.test.ts packages/core/test/GuardHealthCheck.test.ts packages/core/test/Predicate.test.ts`;
  the rename probe (scratch) shows 18 failures; `node scripts/check-house-style.mjs`.
- **Done when:** green on `main`, and the rename probe makes every one of the 18 fail. Ship as its own PR,
  titled with BEH-QD-317, because it restores that requirement's guard. T4 later rewrites these
  tests to typed reads, and the controls then go, since a typed read cannot name a non-metric (§7).

### T2 — Golden of the series an exporter sees (characterisation, written on `main`)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/core/test/EvaluationMetrics.test.ts` (*new*)
- **Steps:**
  1. Under `isolatedMetrics`, exercise each writer once with the existing helpers (`testLayer`, `subjectWith`,
     `decisionCacheLayer()`): one allowing and one denying `evaluate` (two outcome series, the denial
     frequency, the histogram), one failing `evaluate` (`scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer`;
     error frequency), a cached `evaluate` twice (cache frequency, `miss` then `hit`), and one `toPredicate`
     (translated counter).
  2. Take `Metric.snapshot`. Project each entry to `[type, id, description, attributes]`, sort, and
     `assert.deepStrictEqual` against a literal table of the **seven** expected series. Copy the strings
     verbatim from `b655b3b`, one row per series, including `{ outcome: "allow" }` and `{ outcome: "deny" }`.
  3. Name the block `describe("the registry key an exporter sees (ADR-QD-052)")`. Its doc comment says why this test
     matches on the snapshot rather than on imported values: attributes of a `withAttributes` series are visible
     only there (C11), and the projection is exactly what an OTLP or Prometheus exporter reads.
- **Tests:** the golden (one `it.effect`). It passes on `main`.
- **Verify:** `pnpm vitest run packages/core/test/EvaluationMetrics.test.ts`
- **Done when:** green on `main`, before any source change. It is the oracle for criterion 2.

### T3 — Create `EvaluationMetrics.ts`; the three writers write through it
- **Status:** [x] done
- **Depends on:** T2; D-56-a, D-56-b, D-56-c, D-56-d
- **Files:** `packages/core/src/EvaluationMetrics.ts` (*new*), `packages/core/src/Lifecycle.ts`,
  `packages/core/src/DecisionCache.ts`, `packages/core/src/Predicate.ts`, `packages/core/src/DecisionRecord.ts`,
  `packages/core/src/SinkEmit.ts`, `packages/core/src/index.ts`, `packages/core/test/EvaluationMetrics.test.ts`
- **Steps:**
  1. Create `EvaluationMetrics.ts`. Lead with a one-line summary ("The metrics an evaluation, a cache lookup
     and a translation write, declared once for every reader"). Below it, the *why*: ADR-QD-052's
     key rule, ADR-QD-NEXT, the on-fiber note (C9), and why the untagged base is not exported (C10).
     Imports: `effect/Metric`, `effect/Record`, `type { Decision }` from `./Decision.ts`, `type { EvaluationError }`
     from `./Errors.ts`, `{ POLICY_TAGS }` from `./Policy.ts`. Nothing else (§4).
  2. **Move, don't reword.** Cut the declarations and their doc comments from `Lifecycle.ts` (`decisionsTotal`,
     both series, `denialsByPolicyTagTotal`, `evaluationDurationMillis`, `EVALUATION_ERROR_TAGS_BY_TAG`,
     `EVALUATION_ERROR_TAGS`, `evaluationErrorsTotal`), from `DecisionCache.ts` (`CacheOutcome`,
     `CACHE_OUTCOMES_BY_OUTCOME`, `CACHE_OUTCOMES`, `cacheLookupsTotal`) and from `Predicate.ts`
     (`predicatesTranslatedTotal`), and paste them. Leave every id, description, boundary and word unchanged.
     Then apply D-56-d:
     - `const decisionsTotalBase = Metric.counter("qadi_decisions_total", { description: … })` (unexported).
     - `export const decisionsTotal: { readonly [T in Decision["_tag"]]: Metric.Counter<number> } = { Allow: Metric.withAttributes(decisionsTotalBase, { outcome: "allow" }), Deny: Metric.withAttributes(decisionsTotalBase, { outcome: "deny" }) };`
       Keep the existing paragraph on why the series are module-scope singletons (the memoised-key fast path).
     - `export const` the other five under D-56-d's names (`cacheLookupsTotal` → `decisionCacheLookupsTotal`).
     - `export type CacheOutcome = "hit" | "coalesced" | "miss";` with its doc moved from `DecisionCache.ts`, plus
       one sentence on why it lives here (D-56-c, the `PortName` precedent, ADR-QD-037).
     - Keep `EVALUATION_ERROR_TAGS_BY_TAG` and `CACHE_OUTCOMES_BY_OUTCOME` unexported: they exist to close the
       frequencies' domains.
  3. `Lifecycle.ts`: import the four plus `type CacheOutcome`. Drop the `effect/Record` and `POLICY_TAGS` imports
     if now unused. Replace
     `Metric.update(decision._tag === "Allow" ? decisionsAllowedTotal : decisionsDeniedTotal, 1)` with
     `Metric.update(decisionsTotal[decision._tag], 1)`. Leave the other writes and the emission order unchanged.
     In the module doc, change "metrics" to name `EvaluationMetrics.ts`.
  4. `DecisionCache.ts`: import `decisionCacheLookupsTotal` and `type CacheOutcome` from `./EvaluationMetrics.ts`. The three
     `Metric.update` calls are renamed, with the labels unchanged. Drop `effect/Record` if unused. `CacheLookup` stays here.
  5. `Predicate.ts`: import `predicatesTranslatedTotal`; the `toPredicate` write is unchanged.
  6. `DecisionRecord.ts`, `SinkEmit.ts`: retarget `import type { CacheOutcome }` to `./EvaluationMetrics.ts`.
  7. `index.ts`: add `export * from "./EvaluationMetrics.ts";` between `./EvaluationId.ts` and
     `./EvaluationServicesNone.ts`. Or, if ARCH-55 landed, add the seven names to its named block.
  8. In `EvaluationMetrics.test.ts`, add `describe("the declarations")`: for each export, `id`, `type` and
     `description` by `assert.strictEqual` (the `HydrationMetrics.test.ts` shape), and for `denialsByPolicyTagTotal`
     / `evaluationErrorsTotal` / `decisionCacheLookupsTotal` the preregistered key set and order read from
     `Metric.value(…)`'s `occurrences.keys()` under `isolatedMetrics`. Move the existing
     `Evaluate.test.ts` "preregisters every Policy tag, in the union's order (ARCH-02 C5)" assertion here rather
     than duplicating it, and delete it from `Evaluate.test.ts` in T4.
  9. Add a type-level line: `decisionsTotal` accepts exactly `Decision["_tag"]` keys. Either a tstyche
     assertion in a new `packages/core/test/EvaluationMetrics.tst.ts`, or rely on TS2741 in the declaration itself.
     Prefer the latter (no new file), and record that choice in the module doc.
- **Tests:** T2's golden **unchanged and green** (criterion 2); the new declaration pins.
- **Verify:** `pnpm vitest run packages/core/test/EvaluationMetrics.test.ts packages/core/test/Evaluate.test.ts packages/core/test/DecisionCache.test.ts packages/core/test/Predicate.test.ts packages/core/test/DecisionSink.test.ts packages/core/test/GuardHealthCheck.test.ts`;
  `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`;
  `git grep -n "Metric\.\(counter\|frequency\|histogram\)(" packages/core/src/Lifecycle.ts packages/core/src/DecisionCache.ts packages/core/src/Predicate.ts` → nothing.
- **Done when:** all green, madge clean, golden unchanged.

### T4 — Move the 18 core tests to typed reads (replace, don't layer)
- **Status:** [x] done
- **Depends on:** T3 (and T1 if it landed)
- **Files:** `packages/core/test/Evaluate.test.ts`, `packages/core/test/DecisionSink.test.ts`,
  `packages/core/test/DecisionCache.test.ts`, `packages/core/test/Predicate.test.ts`,
  `packages/core/test/GuardHealthCheck.test.ts`
- **Steps:**
  1. Delete each file's id-matching helper (`counterOf`, `frequencyOf`, `histogramOf`, `errorFrequencyOf`) and
     the `Metric.snapshot` scans behind them.
  2. Replace each read with `yield* Metric.value(<export>)` inside the existing `isolatedMetrics` scope:
     - positive counts: `decisionsTotal.Allow`/`.Deny` `.count`, `denialsByPolicyTagTotal`/`evaluationErrorsTotal`/
       `decisionCacheLookupsTotal` `.occurrences.get(word)`, `evaluationDurationMillis` `.count`,
       `predicatesTranslatedTotal` `.count`.
     - **negative assertions become value assertions:** "not counted" is `count === 0` (or every word `0`) on the
       typed series. This is equivalent inside a fresh registry, and it cannot be vacuous, because the read
       goes through the writer's own value. Remove T1's controls with the strings they guarded.
     - `DecisionSink.test.ts`'s four "record ordering" tests read `Metric.value(decisionsTotal.Allow)` and so on
       **from inside the sink's `record`** exactly as they read the snapshot today. Same fiber, same
       registry, same proof.
  3. Delete `Evaluate.test.ts`'s "preregisters every Policy tag" test (moved to T3 step 8).
  4. Keep the `describe` titles that name ids. They are prose, and the budget (T6) ignores titles.
  5. **Non-vacuity proof:** re-run the rename probe against the branch (scratch copy). Renaming an id now
     changes nothing a test reads, so the probe becomes "delete or rename an export". Every test
     touching it fails to compile, and every golden or pin row fails. Record the counts in §10.
- **Tests:** the 18, rewritten in place. None is added, and one moves to `EvaluationMetrics.test.ts`.
- **Verify:** `pnpm vitest run packages/core/test/Evaluate.test.ts packages/core/test/DecisionSink.test.ts packages/core/test/DecisionCache.test.ts packages/core/test/Predicate.test.ts packages/core/test/GuardHealthCheck.test.ts`;
  `pnpm typecheck`;
  `git grep -nE '"qadi_(decisions|denials_by_policy_tag|evaluation_duration|evaluation_errors|decision_cache_lookups|predicates_translated)[a-z_]*"' packages/core/test`
  → only `EvaluationMetrics.test.ts` pins and `describe`/`it` titles.
- **Done when:** green, the grep matches criterion 5, and the scratch probe shows no vacuous pass.

### T5 — Mutation and hot-path check for phase 1
- **Status:** [x] done
- **Depends on:** T4
- **Files:** none (reports only)
- **Steps:**
  1. Targeted Stryker: `pnpm exec stryker run --mutate "packages/core/src/EvaluationMetrics.ts,packages/core/src/Lifecycle.ts,packages/core/src/DecisionCache.ts,packages/core/src/Predicate.ts"`.
     Every mutant on the metric write sites must be killed. These are the label literals in `getOrCompute`, the
     `decisionsTotal[decision._tag]` index, and the `if (decision._tag === "Deny")` guard around the denial
     frequency. A survivor is a test gap: fix the test, never the config (`stryker.config.mjs`'s "no ignore
     list" rule).
  2. `pnpm bench` on `packages/core/bench/Evaluate.bench.ts`, before and after. The `Record` index replaces a ternary, so
     expect no difference outside run-to-run noise (AGENTS.md §5a's ~30% caution). Record both in §10. A
     regression beyond noise means reverting step 3 of T3 to the ternary over `decisionsTotal.Allow`/`.Deny`.
- **Tests:** none added
- **Verify:** the two commands above
- **Done when:** no surviving metric-site mutant; bench within noise.

### T6 — The metric table and its three house-style rules
- **Status:** [x] done
- **Depends on:** T3; D-56-e, D-56-f
- **Files:** `scripts/check-house-style.mjs`, `spec/behaviors/25-inspection.md` (the table, under T10's new BEH),
  `AGENTS.md` (§6, one paragraph for the new budget)
- **Steps:**
  1. Write the table first (T10 owns the BEH prose). Columns: `| Metric | Type | Series | Declared in | Reader |`.
     22 rows from C4, `Declared in` as a repo-relative path. `Reader`: `@qadi/devtools` for the port and
     hydration rows, "exporter, tests" for the rest. Mark the block with a stable heading, for example
     `### Every metric Qadi declares`, so the parser finds it as `[schema-error-table]` finds `| Class | Crosses |`.
  2. `[metric-declaration]`: scan `packages/*/src/**/*.{ts,tsx}` (skip `*.d.ts`) for
     `/\bMetric\.(counter|frequency|histogram|gauge|summary|timer)\(\s*"(qadi_[a-z_]+)"/`. Each hit must be on a line
     matching `/^(export )?const \w+ = Metric\./` (module scope, no indentation). Under `packages/core/src/` the
     `export ` is required. A `Metric.<ctor>(` whose first argument is not a `"qadi_…"` literal fails too (unnamed or
     computed ids cannot be listed). Also scan `packages/*/test`, `features/`, `examples/` (skip `node_modules`,
     `.next`, `dist`): any `Metric.<ctor>("qadi_` there fails with "a reader that re-declares reads zero (ADR-QD-052)".
     `v4-api-smoke.test.ts`'s non-`qadi_` canaries are unaffected.
  3. `[metric-table]`: parse the table rows. Each row's id, type (`Counter`/`Frequency`/`Histogram`/…, compared with
     the ctor, capitalised) and file must match one declaration, and each declaration must have one row. Duplicate
     ids in source fail ("declared twice"). Messages follow `[schema-error-table]`'s format.
  4. `METRIC_ID_LITERAL_BUDGET = { "<test file>": n, … }`, counted with
     `/(?<!\b(?:describe|it|test|it\.effect|it\.scoped|it\.live|it\.layer)\(\s*)"qadi_[a-z_]+"/g` over `packages/*/test`.
     Checked in both directions like `SWITCH_BUDGET`. The entries are what remains after T4 (and T7/T8 if they
     land in the same PR): `EvaluationMetrics.test.ts` (its pins), `HydrationMetrics.test.ts` 5, `Ports.test.ts`
     (its pins only, after T7), audit and compiler files at their current counts until T8. The doc comment names
     ADR-QD-NEXT and states the rule: a test reads a metric through its export, and a literal id belongs in a pin.
  5. AGENTS.md §6: one paragraph after `PORT_DOUBLE_BUDGET` for `METRIC_ID_LITERAL_BUDGET` (test-scope, like
     `PORT_DOUBLE_BUDGET`), and one sentence noting the two metric rules. Keep the doc-comment shape rule:
     summary first, then why.
  6. **Red first.** Before step 5's AGENTS edit, temporarily (a) delete one table row, (b) add a fake
     `const x = Metric.counter("qadi_fake_total", …)` inside a function body in a scratch copy of a source file, and
     (c) add a `"qadi_decisions_total"` literal to a test. Run `node scripts/check-house-style.mjs` against each and
     record the three failures. Revert all three.
- **Tests:** the script itself, exercised by step 6. No unit test is needed: house-style rules are checked by
  their own failures, as `[schema-error-table]` is.
- **Verify:** `node scripts/check-house-style.mjs` (green on the branch; red for each step 6 mutation);
  `pnpm lint`.
- **Done when:** gate 4 enforces all three rules in both directions.

### T7 — Port-metric tests read typed too (coordinate with ARCH-46)
- **Status:** [x] done
- **Depends on:** T6 (the budget exists); check ARCH-46's state first (T0 step 7)
- **Files:** `packages/core/test/Ports.test.ts` (the helpers at ~`:99` and ~`:293`), `packages/core/test/PortServe.test.ts`
  (~`:114`, ~`:119`)
- **Steps:**
  1. If ARCH-46 has rewritten these tests, re-baseline and only adjust the budget. Otherwise replace each
     `s.id === id` helper with `Metric.value(portCallsTotal | portRetriesTotal | portTimeoutsTotal | predicatePortCallsTotal | servedPortCallsTotal)`
     as `PortConformance.test.ts` already does. `PortServe.test.ts:119`'s `isUndefined(find(id === "qadi_port_calls_total"))`
     becomes `occurrences` all zero on `portCallsTotal` (the F1 shape, closed the same way).
  2. Keep `Ports.test.ts`'s description pins ("the descriptions are pinned …") as the port metrics' pin block.
  3. Lower `METRIC_ID_LITERAL_BUDGET` for both files to their pin counts.
- **Tests:** the rewritten port-metric tests
- **Verify:** `pnpm vitest run packages/core/test/Ports.test.ts packages/core/test/PortServe.test.ts`; `node scripts/check-house-style.mjs`
- **Done when:** green, and the budget shows only pin literals for both files.

### T8 — Phase 3: audit and compiler metrics typed-readable without public surface (D-56-e = C)
- **Status:** [x] done
- **Depends on:** T6; D-56-e
- **Files:** `packages/audit/src/AuditWriteReport.ts`, `packages/audit/src/CircuitBreaker.ts`,
  `packages/audit/test/Metrics.test.ts`, `packages/audit/test/CircuitBreaker.test.ts`, `packages/audit/test/driveExit.ts`;
  `packages/predicate-sql/src/CompileMetrics.ts` (*new*), `packages/predicate-sql/src/index.ts`,
  `packages/predicate-sql/test/Metrics.test.ts`; `packages/predicate-prisma/src/CompileMetrics.ts` (*new*),
  `packages/predicate-prisma/src/index.ts`, `packages/predicate-prisma/test/Metrics.test.ts`; `spec/behaviors/25-inspection.md` (table rows' `Declared in`)
- **Steps:**
  1. Audit: add `export` to `writesTotal`'s label-keyed `WRITES_COUNTERS`, `STAGING_COUNTERS`, `LOST_COUNTERS` and
     `transitionsTotal` (rename the `Record`s only if the house naming asks; their modules stay out of
     `packages/audit/src/index.ts`, so nothing becomes public). Confirm with `node scripts/check-api-surface.mjs`, which should report no
     new `@qadi/audit` export. The base counters stay unexported (C10's hazard applies to them too).
  2. Compilers: move each `compiledTotal`/`compiledSucceededTotal`/`compiledRefusedTotal` from `index.ts` into a new
     package-private `src/CompileMetrics.ts`, exported as a `Record<"compiled" | "refused", Metric.Counter<number>>`
     (`compiledTotal`), and import it in `index.ts`. Check the package's `exports` map has only `"."` (ADR-QD-099), so the module is
     unimportable from outside. Fix the stale "mirrors `Evaluate.ts`'s … / memoizes per metric object" comment while
     moving (C13).
  3. Rewrite the five test files' string reads as typed reads (`Metric.value(WRITES_COUNTERS.written)` and so on). Keep each
     file's description pin as its pin block. Check `audit/test/Metrics.test.ts:176`'s `isUndefined(transitions)`
     for the F1 shape and make it a typed zero read.
  4. Update the table's `Declared in` for the compilers, and lower `METRIC_ID_LITERAL_BUDGET` to pin counts.
- **Tests:** the rewritten audit and compiler metric tests. None added.
- **Verify:** `pnpm vitest run packages/audit/test/Metrics.test.ts packages/audit/test/CircuitBreaker.test.ts packages/predicate-sql/test/Metrics.test.ts packages/predicate-prisma/test/Metrics.test.ts`;
  `pnpm circular`; `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`;
  `pnpm exec stryker run stryker.audit.mjs`, `stryker.predicate-sql.mjs`, `stryker.predicate-prisma.mjs` (or leave
  them to T11's `pnpm check`).
- **Done when:** green, no public surface change in the three packages, budget at pins only.

### T9 — Stale prose (C13)
- **Status:** [x] done
- **Depends on:** T3
- **Files:** `packages/core/src/Predicate.ts` (the `toPredicate` doc near the old `predicatesTranslatedTotal`
  site, if a pointer remains), `packages/core/src/PortMetrics.ts` (module doc: "the cardinality reason `Evaluate.ts`
  gives" → `EvaluationMetrics.ts`; the "survive mutation testing … nothing reads them back" paragraph →
  "pinned by `Ports.test.ts`, because the description is part of the registry key (ADR-QD-052)"),
  `spec/behaviors/31-predicate-compilation.md` (the "An optional, module-scope `Metric.counter` …" paragraph)
- **Steps:**
  1. Doc comments only, with no string inside a `Metric.*(` call. **Do not** touch `portCallsTotal`'s description
     string (ARCH-46's decision, §9).
  2. `31-predicate-compilation.md`: correct "mirrors the counter `Predicate.ts` already declares … tagged by outcome"
     to say the compilers' counters are tagged by outcome and core's translation counter counts successes only.
     Replace "memoizes per metric *object*" with the ADR-QD-052 Rev 1.2 wording (the key is memoised per object, the
     registry looked up per update). Bump the doc's revision, with a change-history line.
- **Tests:** none (docs)
- **Verify:** `pnpm spec:examples`; `pnpm spec:verify:strict`;
  `git grep -n "Evaluate.ts.s .qadi_decisions_total\|memoizes per metric\|survive mutation testing" -- packages spec`
  → only `>` history blocks.
- **Done when:** the grep is clean.

### T10 — Spec, ADR, overview, traceability, website, changeset
- **Status:** [x] done
- **Depends on:** T3 (phase 1 docs), T6 (table), T8 (phase 3 rows); D-56-h
- **Files:** `spec/decisions/NNN-a-metric-is-declared-once.md` (*new*, ADR-QD-NEXT), `spec/decisions/index.yaml`,
  `spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md` (Rev 1.3: an "Amended by ADR-QD-NEXT" note),
  `spec/behaviors/25-inspection.md`, `spec/behaviors/index.yaml`, `spec/invariants.md`, `spec/traceability.md`,
  `spec/overview.md`, `spec/README.md` (CCR row), `apps/website/src/content/docs/docs/concepts/decision-lifecycle.md`,
  `.changeset/<name>.md` (*new*)
- **Steps:** see §8 for content. Order: ADR, then BEH and table, then INV, then overview rows, then traceability,
  then CCR, then website, then changeset.
- **Tests:** the gates are the tests.
- **Verify:** `node scripts/check-api-surface.mjs`; `pnpm spec:verify:strict`; `pnpm spec:examples`;
  `pnpm spec:website-examples`; `node scripts/check-house-style.mjs` (`[metric-table]` reads the new table);
  `node scripts/check-dod-table.mjs` (unchanged, since no new gate).
- **Done when:** all gates green.

### T11 — Full gate
- **Status:** [x] done
- **Depends on:** T1–T10 (whichever phases the decisions kept)
- **Files:** none
- **Steps:**
  1. `pnpm check:pr` for each phase's PR, and `pnpm check` (mutation included) before the last merges.
  2. Re-run C4's inventory and the literal scan, and record the final numbers in §10.
- **Tests:** —
- **Verify:** `pnpm check`
- **Done when:** green.

## 7. Test strategy

**Survive unchanged.** `HydrationMetrics.test.ts` (off-fiber deltas, ADR-QD-052), `PortConformance.test.ts`,
`PortDescription.test.ts`, `devtools/test/model/Wiring.test.ts` and `Hydration.test.ts`, which already read typed;
every non-metric test in the five touched files; the four `DecisionSink.test.ts` record-ordering tests' **proof**
(only their read changes).

**Move to the new interface (rewritten in place, T4/T7/T8).** The 18 core evaluation-metric tests; the
port-metric string reads in `Ports.test.ts` and `PortServe.test.ts`; the audit and compiler metric tests. Each local
id-matching helper is deleted, not kept beside the typed read.

**Deleted as redundant.** `Evaluate.test.ts`'s "preregisters every Policy tag" moves into `EvaluationMetrics.test.ts`
(T3 step 8). T1's positive controls go in T4, because a typed read cannot name a non-metric. They existed only to
make the string honest. Shipping T1 first and deleting its lines in T4 is deliberate: T1 ships even if the
refactor is dropped.

**New.** `EvaluationMetrics.test.ts`, two blocks. **"the registry key an exporter sees"** (T2) is the snapshot
golden over seven series, the only place the `withAttributes` attribute values are visible (C11), and the oracle
that the move changed nothing. **"the declarations"** (T3) pins id, type, description and preregistered words per
export, in `HydrationMetrics.test.ts`'s shape. These two are different observables (object fields versus registry
series), so this is not layering.

**Non-vacuity, as a procedure.** The rename probe from §1 is run three times: at T0 (6 vacuous), after T1 (0
vacuous, 18 red), and after T4 (an export rename becomes a compile error). The probe lives in scratch, outside the
repository.

**Property and differential.** None added. The metrics are counts of events whose correctness is already
property-tested elsewhere (INV-QD-005 short-circuit, INV-QD-025 cache equivalence). A differential between "metric
count" and "records emitted" exists in spirit in the `DecisionSink.test.ts` ordering tests, which stay.

**Mutation (Stryker).** Declarations are static and not mutated (ADR-QD-076). The **pins** (T3) and the
**gate** (T6) are their guard, and the description probe (§1 F2) is the evidence that before this plan nothing was.
Dynamic sites are mutated and must be killed: `getOrCompute`'s three label literals (killed by
`occurrences.get("hit" | "coalesced" | "miss")`), `decisionsTotal[decision._tag]` (killed by the Allow/Deny split
test), the denial guard `if (decision._tag === "Deny")` (killed by "an allow adds nothing to the denial
frequency", now non-vacuous), `Metric.update(evaluationErrorsTotal, error._tag)` (killed by the by-tag test), and
`toPredicate`'s counter update (killed by "counts a successful translation"). T5 runs the targeted Stryker run; T11
runs all seven configurations.

## 8. Spec and documentation updates

- **ADR-QD-NEXT** (D-56-h = A), "A metric is declared once, where its readers can import it, and listed where its
  operators can read it". *Context:* C1, C3, C5, F1, F2, C12. *Decision:* (1) every `qadi_*` metric is a
  module-scope `const`, never re-declared by a reader (ADR-QD-052's key argument, generalised); (2) a metric
  declared in `@qadi/core` is exported from its root, the one package every in-process reader can depend on,
  while a metric elsewhere is exported from a package-private module for its tests; (3) a tagged counter is exported as
  its series (a `Record` keyed by the closed label), never as the untagged base (C10); (4) every metric is a row in
  `25-inspection.md`'s table, checked by `[metric-table]`; (5) a test reads through the export, and a literal id lives
  in a pin (`METRIC_ID_LITERAL_BUDGET`). *Consequences:* readers cannot drift from writers; descriptions are pinned
  by tests and ids/types/homes by the gate; Stryker's blind spot on static declarations (ADR-QD-076) is covered.
  *Alternatives:* D-56-a B, D-56-b B/C, D-56-f B/C, with their reasons. *Amends* ADR-QD-052; *reads* ADR-QD-009,
  ADR-QD-076, ADR-QD-099, ADR-QD-037. `index.yaml` gets a row: `status: "Accepted — amends ADR-QD-052"`.
- **ADR-QD-052** Rev 1.3: a blockquote "Generalised by ADR-QD-NEXT" under the Decision. No text removed.
- **`spec/behaviors/25-inspection.md`**: new **BEH-QD-NEXT "Evaluation activity is counted, through metrics
  declared once"** after BEH-QD-197 (Port activity is counted). It has a `typescript` listing of the seven exports
  (compiled by gate 9; it must import from `@qadi/core`) and REQUIREMENTs:
  - "`decisionsTotal` MUST hold exactly one series per `Decision` tag, and `decideQuestion` MUST update exactly the
    series of the decision it returns."
  - "A failed evaluation MUST update `evaluationErrorsTotal` under its error tag and MUST NOT update
    `decisionsTotal`, `evaluationDurationMillis` or `denialsByPolicyTagTotal`." (Today true and tested, never stated
    in one place.)
  - "`decisionCacheLookupsTotal` MUST be updated once per `getOrCompute`, under the path it took."
  - "Every `qadi_*` metric MUST be declared once, at module scope, and MUST appear in the table below."
  Then the 22-row table (T6), under its stable heading. Bump the revision and add a change-history line.
  `spec/behaviors/index.yaml` gets the new BEH.
- **`spec/invariants.md`**: **INV-QD-NEXT "A metric has one declaration, and its readers import it"**. *Statement:* for
  every `qadi_*` id there is exactly one `Metric.<ctor>` call in `packages/*/src`, at module scope, and no test,
  feature or example declares one. *Source:* `EvaluationMetrics.ts`, `PortMetrics.ts`, `HydrationMetrics.ts`, audit and
  compiler modules. *Enforcement:* `[metric-declaration]`, `[metric-table]`, `EvaluationMetrics.test.ts`,
  `HydrationMetrics.test.ts`, `Ports.test.ts` pins. *Related:* INV-QD-045 (hydration accounting), BEH-QD-317.
- **`spec/traceability.md`**: rows for BEH-QD-NEXT, INV-QD-NEXT, ADR-QD-NEXT, `packages/core/test/EvaluationMetrics.test.ts`.
  Amend the rows for `Evaluate.test.ts`, `DecisionSink.test.ts`, `DecisionCache.test.ts`, `Predicate.test.ts`,
  `GuardHealthCheck.test.ts` (BEH-QD-317 now guarded by a typed read), `Ports.test.ts`/`PortServe.test.ts` (T7),
  and the audit and compiler metric tests (T8) if their text names "matched by id". Change-history line.
- **`spec/overview.md`** (gate 13), § Services, next to the port and hydration rows:
  - `| \`decisionsTotal\`, \`denialsByPolicyTagTotal\`, \`evaluationDurationMillis\`, \`evaluationErrorsTotal\` | metric | \`EvaluationMetrics.ts\` — written by \`evaluate\`'s lifecycle; \`decisionsTotal\` is one series per \`Decision\` tag (\`.Allow\`, \`.Deny\`), the untagged base deliberately unexported; \`denialsByPolicyTagTotal\` preregisters \`POLICY_TAGS\`, \`evaluationErrorsTotal\` every \`EvaluationError\` tag (ADR-QD-NEXT) |`
  - `| \`decisionCacheLookupsTotal\` | metric | \`EvaluationMetrics.ts\` — \`qadi_decision_cache_lookups_total\`, by \`CacheOutcome\` |`
  - `| \`predicatesTranslatedTotal\` | metric | \`EvaluationMetrics.ts\` — \`qadi_predicates_translated_total\`, successful \`toPredicate\` calls only |`
  - split `| \`CacheOutcome\`, \`CacheLookup\` | type | \`DecisionCache.ts\` |` into `CacheOutcome` (`EvaluationMetrics.ts`, the closed
    domain of `decisionCacheLookupsTotal` and the `cache` field of a record) and `CacheLookup` (`DecisionCache.ts`).
  - Change History line (Rev bump) naming ARCH-56 and ADR-QD-NEXT.
- **`spec/README.md`**: a `CCR-QD-NEXT` row listing every file above.
- **`AGENTS.md` §6**: the `METRIC_ID_LITERAL_BUDGET` paragraph and the two rules (T6 step 5). Optionally a
  §8 naming row: "`…Total` / `…Millis`: a metric value; the camelCase of its `qadi_` id".
- **Website** (gate 23, `node scripts/check-website-doc-examples.mjs`): `concepts/decision-lifecycle.md` gains a short
  "Counting decisions" section after the `DecisionSink` one. It covers what the six metrics count, that they are
  on-fiber (a host's `MetricRegistry` receives them), and that they are process-wide aggregates. It includes one compiled
  `typescript` fence:
  ```ts
  import * as Effect from "effect/Effect";
  import * as Metric from "effect/Metric";
  import { decisionsTotal } from "@qadi/core";

  export const allowShare = Effect.gen(function* () {
    const allow = yield* Metric.value(decisionsTotal.Allow);
    const deny = yield* Metric.value(decisionsTotal.Deny);
    const total = allow.count + deny.count;
    return total === 0 ? undefined : allow.count / total;
  });
  ```
  (Shown here as `ts`. On the page it is a `typescript` fence so gate 23 compiles it.) `packages/core/README.md`: one line pointing at the
  website section, if the README lists observability.
- **Changeset** (`.changeset/evaluation-metrics.md`): `"@qadi/core": minor`. "The evaluation metrics are exported:
  `decisionsTotal` (`.Allow`/`.Deny`), `denialsByPolicyTagTotal`, `evaluationDurationMillis`, `evaluationErrorsTotal`,
  `decisionCacheLookupsTotal`, `predicatesTranslatedTotal`. Ids, descriptions and series are unchanged, so exporters
  see the same metrics. `CacheOutcome` is now declared in `EvaluationMetrics.ts` and is still exported from `@qadi/core`." **Not
  breaking.** Phase 3 changes no public export, so it needs no changeset entry. **No release** without the user's explicit
  request for "the release".

## 9. Risks and rollback

- **A reworded string re-keys a series.** Moving declarations invites "while I'm here" edits, and a changed description
  is a new registry key (ADR-QD-052). *Shows up as:* T2's golden fails. *Mitigation:* T2 is written on `main` first;
  T3 is cut-and-paste. *Rollback:* restore the string.
- **Madge cycle through `CacheOutcome`.** *Shows up as:* gate 5. *Mitigation:* D-56-c A is spike-proven; the
  importer list is closed (`git grep -n "CacheOutcome" packages/*/src`). *Fallback:* D-56-c B.
- **Hot-path regression.** `decisionsTotal[decision._tag]` instead of a ternary. *Shows up as:* T5 bench. *Rollback:* the
  ternary over `decisionsTotal.Allow`/`.Deny`, with the export shape unchanged.
- **A phantom untagged series.** If a later change exports the base counter, readers read 0 and exporters emit an empty
  series (C10). *Mitigation:* ADR-QD-NEXT point (3); the golden lists exactly seven series.
- **Passive readers add zeroed series** (C11). Out of scope by D-56-g; the ADR records it for whoever adds one.
- **Gate false positives.** The literal budget's regex may count an id inside a template string or a comment.
  *Mitigation:* count only double-quoted exact literals; T6 step 6 exercises the rule; the budget is exact, so a
  miscount is visible in the first run and fixed with the table.
- **Sibling overlaps (textual, no semantic conflict):**
  - **ARCH-55** (named core barrel; merges `PortSpan*`/`PortWire*`). Whichever lands second adds the seven names to the
    other's barrel shape. If ARCH-55 proposes folding `PortMetrics.ts` into another module, the `[metric-table]` row's
    `Declared in` follows; D-56-b keeps `EvaluationMetrics.ts` separate either way. Suggested order: ARCH-56 phase 1
    **before** ARCH-55, so the named barrel lists the final set once.
  - **ARCH-46** (one port-read module; metric choice by interpreter). It owns `PortMetrics.ts`, the stale
    `portCallsTotal` description (C13; changing it re-keys the series, so it needs ARCH-46's own golden), and likely
    `Ports.test.ts`/`PortServe.test.ts`. T7 runs only if ARCH-46 has not rewritten them; T9's `PortMetrics.ts` doc edit is
    doc-only and rebases trivially. If ARCH-46 moves port metrics into the port description, `[metric-declaration]`'s
    module-scope rule still holds, and the table row moves.
  - **ARCH-53** (hydration outcome as one event value). It touches `HydrationCounts.ts`/`HydrationMetrics.ts`'s writers, not
    the declarations. If it renames or moves a hydration metric, the table and `METRIC_ID_LITERAL_BUDGET`
    (`HydrationMetrics.test.ts` 5) follow. Off-fiber accounting is untouched here.
  - **ARCH-51** (closed `LeafNeeds` table) edits `Predicate.ts` and `Walk.ts`. Only the `predicatesTranslatedTotal` import line
    overlaps.
  - **ARCH-42** (done) made `isolatedMetrics` one helper; T4 relies on it unchanged.
- **Rollback, whole plan.** Phase 1 is additive (exports) plus moves: `git revert` restores the private consts and the
  string-matching tests. That is safe **before a release**. After `@qadi/core` ships the exports, removing them is a
  breaking change, so roll back by un-deprecating rather than reverting. T1 stands alone and needs no rollback.
  Phase 2 is a script and spec, and reverts cleanly. Phase 3 changes no public surface, and reverts cleanly.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written against `b655b3b`. Probes in scratch `wave5/ARCH-56/` (rename, description, module spike, attrs). F1 found (6 vacuous negative tests; BEH-QD-317's guard among them). C7 refuted (no re-declaration anywhere). Eight decisions open. | planner (wave 5) |
| 2026-10-13 | T0-T11 | Implemented as one commit on wave5/architecture-deepenings. Recommendations D-56-a..h taken. T1 folded (controls would be deleted by T4; the rename probe at T0 showed 12 failed/6 passed). ADR-QD-109, BEH-QD-334, INV-QD-242, CCR-QD-387. T5 bench/Stryker: see commit body. | implementer (wave 5) |
