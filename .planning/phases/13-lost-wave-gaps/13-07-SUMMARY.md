---
phase: 13-lost-wave-gaps
plan: 07
subsystem: metrics-gate-and-record
tags: [house-style, metrics, spec, adr, changeset, lost-wave-port]

phase_base: 0925c2f
requires: ["13-05", "13-06"]
provides:
  - "`scripts/check-house-style.mjs`: `[metric-declaration]`, `[metric-table]`, `[metric-id-literal]` (`METRIC_ID_LITERAL_BUDGET`, `METRIC_BASE_UNEXPORTED`)"
  - "`spec/behaviors/25-inspection.md`: BEH-QD-368 and the 22-row `### Every metric Qadi declares` table (Revision 1.20)"
  - "`spec/decisions/123-a-metric-is-declared-once.md`: ADR-QD-123 (renumbered from lost commit `d089c1d`), amends ADR-QD-052 (Revision 1.4)"
  - "`spec/behaviors/31-predicate-compilation.md` Revision 1.9: the compilers' counters live in `src/CompileMetrics.ts`"
  - "`EvaluationMetrics.ts` module doc: the six-metric table and the gate claim"
  - "AGENTS.md §6: the seventh budget; website `decision-lifecycle.md` § Counting decisions"
  - "`.changeset/evaluation-metrics-exported.md` (core minor), `.changeset/metrics-read-by-reference.md` (audit, predicate-sql, predicate-prisma patch)"
affects: [13-11, 13-12, 14, 20]

actuals:
  tokens: 95000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: ["metric declared once at module scope, listed in one gated spec table, read by reference"]

key-files:
  created:
    - spec/decisions/123-a-metric-is-declared-once.md
    - .changeset/evaluation-metrics-exported.md
    - .changeset/metrics-read-by-reference.md
  modified:
    - scripts/check-house-style.mjs
    - spec/behaviors/25-inspection.md
    - spec/behaviors/31-predicate-compilation.md
    - spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md
    - packages/core/src/EvaluationMetrics.ts
    - AGENTS.md
    - apps/website/src/content/docs/docs/concepts/decision-lifecycle.md

requirements-completed: []
---

# 13-07 — Every `qadi_*` metric is declared once, listed once and gated

`phase_base: 0925c2f`. Third of three ARCH-56 plans (ARCH-61). It ports the gate and record half of lost
commit `d089c1d` (T1/T8/T9).

## Decisions applied

There is no `checkpoint:decision` in this plan. CONTEXT D-02 and D-05 apply: the lost D-56-f (three rules
inside `check-house-style.mjs`, no new gate number, no DoD change) and D-56-h (the new ADR amends
ADR-QD-052) are taken at their recommended option; neither premise moved. The ADR records them.

## What was done

- **Task 1 (1f3813a, RED).** Ported the lost metric block before the stale-exemption loop, every
  `ADR-QD-109` rewritten to `ADR-QD-123`. The skip set for the outside-src scan (`node_modules`, `.next`,
  `dist`, `lib`, `.turbo`) is kept, so `examples/nextjs-newsroom/.next` and any `lib/` are not scanned.
  The script header names the new budget (test-scope, ADR-QD-123). Verify: only failure is
  `[metric-table] the \`### Every metric Qadi declares\` table was not found.` → `VERIFY-OK`.
- **Task 2 (abee49a).** BEH-QD-368 after BEH-QD-197, with a compiled `typescript` fence that imports
  `decisionsTotal` and reads `Metric.value(decisionsTotal.Deny)`, four REQUIREMENT blocks, and the table
  (22 rows; Reader column names the export, or `package-private: <export>` for audit and the compilers).
  ADR-QD-123 from the lost file: context cites ARCH-61 porting lost commit `d089c1d`, the 36 literals in 8
  core test files at `0925c2f` (13-05's measurement) and the rename probe (12 RED, 6 vacuous GREEN on
  `1721a42`). ADR-052 gains the "Generalised by ADR-QD-123" blockquote (1.3 → 1.4; it was already 1.3 on
  this branch, not 1.2 as the plan said). Spec 31's paragraph: the counter is in each package's
  package-private `src/CompileMetrics.ts`, read by its tests through `compiledTotal`; core's counter is
  success-only; the registry key is `type:id:description:attributes` looked up per update. The
  `EvaluationMetrics.ts` module doc gains its six-row table (export, id, type, writer) and the gate claim
  13-05 left out.
- **Task 3 (ca7051e).** AGENTS.md §6 paragraph between `PORT_DOUBLE_BUDGET` and `## 7. Schema` ("a seventh
  budget"). Website: `## Counting decisions` with a compiled fence, linking ADR-QD-123 and the 25-inspection
  table. Two changesets (no pending changeset covered this; checked by grep).

### The rules, each shown RED then reverted

| Violation | Output |
|---|---|
| none (before Task 2) | `spec/behaviors/25-inspection.md  [metric-table] the \`### Every metric Qadi declares\` table was not found.` |
| `const shadow = Metric.counter("qadi_decisions_total", …)` appended to `packages/core/test/Evaluate.test.ts` | `packages/core/test/Evaluate.test.ts:4154  [metric-declaration] A reader that re-declares a metric reads zero (ADR-QD-052); import the one declaration instead.` (and `[metric-id-literal] 1 … outside a test title`) |
| `export` removed from `portCallsTotal` | `packages/core/src/PortMetrics.ts:106  [metric-declaration] portCallsTotal is a \`@qadi/core\` metric and must be \`export const\`, so a reader imports it instead of matching its id (ADR-QD-123).` |
| `export const stray = "qadi_decisions_total";` in `Evaluate.test.ts` | `packages/core/test/Evaluate.test.ts  [metric-id-literal] 1 \`"qadi_…"\` id literal(s) outside a test title.` |
| budget for `HydrationMetrics.test.ts` raised to 6 (other direction) | `[metric-id-literal] declares 6 … found 5.` |
| duplicate `qadi_port_calls_total` + a declaration inside an arrow, in `PortMetrics.ts` | `[metric-declaration] A metric is a module-scope \`const x = …\`` and `qadi_port_calls_total is declared twice` |
| table: row deleted, row's type changed, ghost row added | `… declared with no row …`, `… is a Frequency … but the table says Counter …`, `lists qadi_ghost_total but no module-scope metric of that id is declared.` |

Every injection was reverted from a scratchpad copy; `git diff --stat` showed only the task's own files.

### `METRIC_ID_LITERAL_BUDGET` (re-measured with the rule's own regex)

| File | Count | What |
|---|---|---|
| `packages/audit/test/Metrics.test.ts` | 4 | the four pins: writes, transitions, staging, entries lost |
| `packages/core/test/EvaluationMetrics.test.ts` | 14 | 7 golden rows + 6 declaration pins + the `"qadi_port_"` prefix filter that keeps port metrics out of the golden (the notes' 13 missed the filter) |
| `packages/core/test/HydrationMetrics.test.ts` | 5 | the five hydration pins |
| `packages/predicate-prisma/test/Metrics.test.ts` | 2 | declaration pin + exported-attributes check |
| `packages/predicate-sql/test/Metrics.test.ts` | 2 | same |

`PortAccess.test.ts`, `CircuitBreaker.test.ts` and `driveExit.ts` are 0 and not listed.

### Declaration counts (the "declaration-count gate")

The `[metric-table]` rule is that gate: the table holds one row per declaration with its file, checked both
ways, and `[metric-declaration]` refuses a duplicate id. Measured: `EvaluationMetrics.ts` 6 (incl. the
unexported `decisionsBase`, the one `METRIC_BASE_UNEXPORTED` entry), `PortMetrics.ts` 5,
`HydrationMetrics.ts` 5, `AuditWriteReport.ts` 3, `CircuitBreaker.ts` 1, each `CompileMetrics.ts` 1 = 22;
`Lifecycle.ts`, `DecisionCache.ts`, `Predicate.ts` 0.

## Mutation (XC-05)

The only touched source file is `packages/core/src/EvaluationMetrics.ts`, and only its doc comment changed
(no non-comment line in the diff). Scoped `stryker run stryker.config.mjs --mutate
packages/core/src/EvaluationMetrics.ts`: 0 mutants (`ignoreStatic`), same as 13-05's base (new file, 0
mutants). No drop.

## Deviations

1. **[Doc]** ADR-052 was at Revision 1.3 on this branch (12-03 amended it), so it went 1.3 → 1.4.
2. **[Doc]** BEH-QD-368's fence computes the deny share (`decisionsTotal.Deny`, as the plan's must-have says); the
   website keeps the lost allow-share fence.
3. **[Doc]** `[INV-QD-259](../invariants.md)` links without an anchor, as 13-04 did for INV-QD-257, until
   13-11 writes the invariant.
4. **[Doc]** The script header comment counts this the eighth budget (it counts `DECISION_READ_BUDGET`); AGENTS.md
   §6 counts it the seventh, matching its own numbering.
5. **[Doc, beyond plan]** `EvaluationMetrics.ts` module-doc table and gate claim (queued by 13-05).

## Gate results

- Task 1 verify: `VERIFY-OK`.
- Task 2 verify: house-style clean (423 files), `spec-revise --check` green, `spec:examples` 103 blocks compile,
  22 table rows, no lost id in added lines, no `109-a-metric…` file → `VERIFY-OK`.
- Task 3 verify: `check-website-doc-examples` 44 blocks compile; `pnpm lint` exit 0 (two pre-existing oxlint
  warnings, neither in the new block); both changesets present.
- `pnpm spec:verify`: 3 FAIL, all register rows for 13-11 — `decisions/ disk -> index.yaml` (orphaned
  `123-a-metric-is-declared-once.md`), `decisions -> traceability` (untraced ADR-QD-123), and the CCR
  register (399, 400, 401).

## For 13-11

- `spec/decisions/index.yaml`: ADR-QD-123 entry (Accepted, amends ADR-QD-052).
- `spec/traceability.md`: ADR-QD-123; BEH-QD-368 → `EvaluationMetrics.test.ts`, the 8 converted core test files
  (from 13-05), audit `Metrics`/`CircuitBreaker`/`AuditWriteExits` (via `driveExit.ts`), both compiler
  `Metrics.test.ts`, and `scripts/check-house-style.mjs` (`[metric-*]`); GuardHealthCheck also → BEH-QD-317.
- `spec/invariants.md` INV-QD-259, heading "A metric has one declaration, and its readers import it":
  for every `qadi_*` id there is exactly one module-scope `Metric.<ctor>` in `packages/*/src`, no test,
  feature or example declares one, a reader reads through the export and a literal id lives only in a pin.
  Source: `EvaluationMetrics.ts`, `PortMetrics.ts`, `HydrationMetrics.ts`, `AuditWriteReport.ts`,
  `CircuitBreaker.ts`, each `CompileMetrics.ts`, the 25-inspection table (BEH-QD-368). Enforcement: the three
  house-style rules, `EvaluationMetrics.test.ts` golden and pins, hydration/audit/compiler pins. Then give
  BEH-QD-368's link its anchor.
- `spec/README.md`: CCR-QD-401 row (ARCH-61 metrics, 13-05..13-07).
- `spec/overview.md`: the six core metrics and `CacheOutcome`'s new home (from 13-05).

## Ids

- Used: ADR-QD-123 (written), BEH-QD-368 (written), CCR-QD-401 (cited; register row is 13-11's),
  INV-QD-259 (cited; text is 13-11's).
- Cited with merged meanings: ADR-QD-052, 009, 037, 051, 076, 099; BEH-QD-189, 197, 317.
- Lost ids in added lines: none (scoped grep over `git diff 0925c2f -U0`).
- Left free in the phase 13 range: ADR-QD-121, 122, 124, 125; BEH-QD-360..367, 369..378; INV-QD-255, 256,
  258, 260..264 (257 used by 13-04); CCR-QD-402, 403.

## Commits

| sha | subject |
|---|---|
| 1f3813a | test(13-07): RED — a metric is declared once, listed once and read by reference |
| abee49a | docs(13-07): every qadi_* metric is a row in one gated table (ADR-QD-123) |
| ca7051e | docs(13-07): AGENTS.md's seventh budget, the website's metric section, the changesets |
