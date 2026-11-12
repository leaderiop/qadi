# ADR-QD-123 — A metric is declared once, where its readers can import it, and listed where its operators can read it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-123                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-10                                     |
> | Status         | Accepted — amends ADR-QD-052                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-12): amendment — PortName and PortSpanName live in PortName.ts, not PortMetrics.ts (ARCH-77, CCR-QD-419)<br>1.0 (2026-11-10): Initial (ARCH-61, CCR-QD-401) |

---

## Context

This decision was first written on 2026-10-13 in commit `d089c1d`, on a branch that was never merged
and whose spec numbers were since given other meanings on `main`. ARCH-61 ports that commit onto
`main` under this number; nothing in the decision changed on the way.

ADR-QD-052 found that `Metric`'s registry key is `type:id:description:attributes`, so a metric
re-declared with a different description compiles and reads zero forever. It drew the rule — a
contract whose key includes a prose string has to be declared once and imported — but wrote it for
the five hydration metrics only. The port metrics followed it (`PortMetrics.ts`). The six metrics an
evaluation, a cache lookup and a translation write did not: `decisionsTotal`,
`denialsByPolicyTagTotal`, `evaluationDurationMillis` and `evaluationErrorsTotal` were private to
`Lifecycle.ts` (itself out of the barrel, ADR-QD-099), `cacheLookupsTotal` private to
`DecisionCache.ts`, `predicatesTranslatedTotal` private to `Predicate.ts`. Nothing re-declared them,
but a reader could not import them either, so:

- Core tests found metrics by matching an id string in a `Metric.snapshot`: 36 such literals outside
  a test title, in eight core test files, at `0925c2f`. Six tests assert *absence*, and
  `find(id === "qadi_…")` returns `undefined` both when the metric was not touched and when the
  string names nothing. Renaming the six ids in source failed twelve tests and left those six
  passing (probed on `1721a42`). One is the only guard of BEH-QD-317 (a readiness probe MUST
  NOT update `qadi_decisions_total`).
- No test pinned any of the six descriptions, types or series. Stryker cannot catch a reworded one:
  `ignoreStatic` (ADR-QD-076) never mutates a module-scope declaration.
- The audit and compiler metrics had the same shape: private declarations, tests matching id strings.
- Nothing listed the `qadi_*` metrics as a set. `spec/` named them in prose; no gate connected the
  prose to the source (AGENTS.md section 15's situation, before it has drifted).

## Decision

Five rules, generalising ADR-QD-052 from hydration to every `qadi_*` metric.

1. **Every `qadi_*` metric is a module-scope `const`, declared once** and never re-declared by a reader.
2. **A metric declared in `@qadi/core` is exported from its root**, the one package every in-process
   reader can depend on (ADR-QD-052's own argument). A metric elsewhere is exported from a
   package-private module for its own tests (`AuditWriteReport.ts`, `CircuitBreaker.ts`, each
   compiler's `CompileMetrics.ts`), which the package's `exports` map does not reach (ADR-QD-099).
3. **A tagged counter is exported as its series, never as the untagged base.** `decisionsTotal` is a
   record keyed by `Decision["_tag"]` (`.Allow`, `.Deny`). Reading the base gives `0` and registers a
   third, untagged series an exporter then emits. A third decision tag is a compile error until it
   has a series.
4. **Every metric is a row** in the table "Every metric Qadi declares" under BEH-QD-368, and
   `scripts/check-house-style.mjs` checks the table against the declarations in both directions on id,
   type and file (`[metric-table]`). The same gate refuses a metric declared anywhere but at module
   scope in `packages/*/src`, a `@qadi/core` metric that is not exported (the untagged base is the one
   reviewed exception, `METRIC_BASE_UNEXPORTED`), one id declared twice, and a `qadi_*` metric
   declared in a test, feature or example (`[metric-declaration]`).
5. **A test reads a metric through its export, and a literal id belongs in a pin.**
   `METRIC_ID_LITERAL_BUDGET` is the exact count of `"qadi_…"` literals per test file outside a test
   title, checked in both directions (`[metric-id-literal]`). A "not counted" assertion is a typed
   value assertion (`count` is `0`), which cannot pass vacuously.

The evaluation metrics live in a new `EvaluationMetrics.ts`, beside `PortMetrics.ts` and
`HydrationMetrics.ts` — one module per population. `CacheOutcome` moved into it: the frequency's closed
domain sits beside it, and `DecisionCache.ts` imports this module, so the other direction would be a
type-only cycle `madge` counts (ADR-QD-037); `PortMetrics.ts` owned `PortName` for the same reason
(since moved to `PortName.ts`; see the amendment below).
`CacheOutcome` is still exported from the root under the same name.

No id, description, type, boundary, preregistered word or attribute value changed. The registry key an
exporter sees is pinned by a snapshot golden in `EvaluationMetrics.test.ts`, written against the old
declarations first and unchanged after the move.

The options taken are the recommended ones of the original plan, whose premises had not moved on
`main` (phase 13 context, D-02): a public core export, a new module beside `PortMetrics.ts`,
`CacheOutcome` moving into it, `decisionsTotal` as a closed record over a private base, the audit and
compiler metrics readable package-privately, the three rules inside `check-house-style.mjs` with no
new gate number, no devtools reader, and this record amending ADR-QD-052.

## Consequences

- A reader cannot drift from a writer: the id string leaves the read side. A rename or reword is one
  line and one pin.
- Descriptions are pinned by tests, and ids, types and homes by the gate. Stryker's blind spot on static
  declarations (ADR-QD-076) is covered by both.
- Six more public names (`decisionsTotal`, `denialsByPolicyTagTotal`, `evaluationDurationMillis`,
  `evaluationErrorsTotal`, `decisionCacheLookupsTotal`, `predicatesTranslatedTotal`). Additive, so not
  breaking. A description edit becomes a public change, as it already was for any exporter, whose HELP
  text changes.
- `@qadi/devtools` gains no reader. Nothing in `spec/devtools-spec` asks for one, and a passive read of
  the default registry registers zero-valued series for metrics nothing wrote (reading a metric
  registers it, preregistered words included), which an exporter then emits. Whoever adds a reader has
  to decide that.

## Alternatives

- **Package-private `EvaluationMetrics.ts`, tests import by path.** Hides the one reachable contract and
  leaves devtools and hosts with the string-matching habit. Rejected.
- **One consolidated `Metrics.ts` holding all sixteen core metrics.** It would drag in `PortName`,
  `PortSpanName` and the hydration drop vocabulary, which are not metrics. A consolidation can follow;
  the table already gives the cross-module view.
- **Export in place.** Impossible for `Lifecycle.ts` (out of the barrel) and leaves three declaration
  sites.
- **Export the untagged base too.** Reads zero and creates a phantom series. Rejected.
- **A core test pinning only core's metrics, no spec table; or a new gate script.** The first leaves the
  spec as ungated prose; the second adds a gate number and a DoD row for no added power over
  `node scripts/check-house-style.mjs`, which `pnpm lint` already runs.
- **Public audit and compiler metrics.** No reader exists outside those packages, and `@qadi/devtools`
  depends on neither. Public surface without a reader is a commitment with no return.

## Related

Amends [ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md). Reads ADR-QD-009
(observability comes from Effect), ADR-QD-037 (`madge` counts type-only edges), ADR-QD-051 (no span
changes), ADR-QD-076 (`ignoreStatic`), ADR-QD-099 (a closed entry-point list). BEH-QD-368, INV-QD-259.

## Amendment (2026-11-12, CCR-QD-419)

`PortName` and `PortSpanName` no longer live in `PortMetrics.ts`. They are declared in
`packages/core/src/PortName.ts`, an import-free leaf, so a port module takes what a port *is* from a
module that counts nothing (ARCH-77, [ADR-QD-094](./094-a-port-is-described-once.md)). The Decision's
sentence that `PortMetrics.ts` owns `PortName` is therefore corrected above to past tense. Its reason
stands: `PortMetrics.ts` still imports the leaf, not the other way round, so the type-only cycle
ADR-QD-037 counts cannot form. No metric id, description, type or registry key changed.
