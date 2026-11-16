# Phase 52: Core owns the predicate compile shell - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Core owns the shell every predicate dialect repeats — the defaults (`identifiers ?? "Ascii"`, `maxInValues ?? DEFAULT_MAX_IN_VALUES`), `toRenderable`, and counting refused and compiled outcomes against a counter series the caller supplies — so `@qadi/predicate-sql`'s `compileSql` and `@qadi/predicate-prisma`'s `compilePrismaWhere` each keep only their rules, their renderer and their own declared metric. Output is unchanged for both dialects, refusals included.

Requirements: COMP-01..04, WX-01..07. Reserved ids: ARCH-99, ADR-QD-165, CCR-QD-443, BEH-QD-596..600, INV-QD-349..350. ADR-QD-054 and ADR-QD-079 kept (a companion package may compile a dialect; renderability is a core rule); ADR-QD-123 kept (each package declares its own metric once, ids distinct).

</domain>

<decisions>
## Implementation Decisions

### The core compile function (COMP-01)
- **D-01:** One core function `compilePredicate(predicate, { rules, identifiers?, maxInValues?, render, outcomes })`: `rules` is the dialect's `RenderRules` minus `identifiers`/`maxInValues`; core applies `identifiers ?? "Ascii"` and `maxInValues ?? DEFAULT_MAX_IN_VALUES`, runs `toRenderable`, updates `outcomes.refused` by 1 when it fails with `PredicateNotRenderable`, renders with `render(node)`, updates `outcomes.compiled` by 1, and returns the render result. Exact option names are Claude's discretion within this shape.
- **D-02:** A plain function returning an Effect (no `Effect.fn`, no new span, no `Effect.fnUntraced` — UNTRACED_BUDGET unchanged). The packages keep their own `Effect.fn` spans (`qadi.predicateSql.compileSql`, `qadi.predicatePrisma.compilePrismaWhere`), so trace trees are unchanged.
- **D-03:** It lives beside `toRenderable` in `packages/core/src/RenderablePredicate.ts` and is exported from the barrel (`export *` already covers the module): a `@qadi/core` minor; `spec/overview.md` names it (gate 13).
- **D-04:** A closed exported interface `CompileOutcomes { readonly compiled: Metric.Counter<number>; readonly refused: Metric.Counter<number> }` that each package's `compiledTotal` satisfies; named in `spec/overview.md`.

### Metrics (COMP-02)
- **D-05:** Both `CompileMetrics.ts` files stay: each package declares its own `Metric.counter("qadi_…")` literal once at module scope (ADR-QD-123, `[metric-declaration]`); only the `CompileOutcomes` type comes from core. No core counter factory.
- **D-06:** Counting semantics unchanged: `refused` moves exactly once on a `PredicateNotRenderable` refusal, `compiled` exactly once after a successful render; a defect counts neither.
- **D-06a (amendment, user, after research):** Prisma moves to SQL's order — `compiled` is counted after a successful render. Today Prisma counts before render, so a renderer defect (a `Negate` chain ~3000–7000 deep overflows Prisma's renderer) still counted `compiled: 1`; after the change a renderer defect counts neither outcome on either dialect. A correction, not an output change; stated in ADR-QD-165, the counting BEH and the `@qadi/predicate-prisma` changeset. Not pinned by a test (stack-depth dependent).
- **D-07:** `[metric-table]` rows, `METRIC_ID_LITERAL_BUDGET` and every other budget unchanged; the ids stay distinct.

### Evidence and records (COMP-03, COMP-04, WX-01..07)
- **D-08:** Characterisation first, committed on the phase base before any `src` edit: differential tests through the public `compileSql` and `compilePrismaWhere` — a row per refusal reason per dialect, representative compiled outputs (SQL text and params; the Prisma where object), and each call moving its dialect's counter exactly once (read through `compiledTotal`'s export, never an id literal) — green before and after.
- **D-09:** Mutation base first: both packages' `src/index.ts` and `src/CompileMetrics.ts` plus `packages/core/src/RenderablePredicate.ts`, committed alone as the phase's first commit; no drop in a touched file's score at the close.
- **D-09a (amendment, user, after research):** Moving the shell into core moves 4 killed mutants per package out of each `index.ts` (research: sql 0.9559→0.9545, prisma 0.9262→0.9244, survivors identical; core `RenderablePredicate.ts` 0.9815→0.9821, every new mutant killed). A touched file's drop passes only when its survivor set is unchanged (textual identity, as Phase 51's `mutation.mjs`) and the drop is killed mutants that moved to core; the close records before/after and where they went. Any new survivor fails.
- **D-10:** No bench: compilation is not on the evaluation path.
- **D-11:** Records: ADR-QD-165 (+ `spec/decisions/index.yaml`), CCR-QD-443 in `spec/README.md`, BEH-QD-596+ in the predicate-compilation behaviour file (`spec/behaviors/31-predicate-compilation.md`), INV-QD-349 (one compile shell; each dialect's counter moves exactly once per call) and INV-QD-350 if needed (else Unused), traceability rows, `spec/overview.md` rows for the new exports; changesets `@qadi/core` minor, `@qadi/predicate-sql` patch, `@qadi/predicate-prisma` patch. `pnpm circular` and gate 14 (packed `exports` map) re-checked.

### Claude's Discretion
- Exact option and type names, and whether `rules` is passed whole or as the dialect-specific fields.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/RenderablePredicate.ts`: `toRenderable`, `RenderRules`, `DEFAULT_MAX_IN_VALUES` (:150), `PredicateNotRenderable`.
- `packages/predicate-sql/src/CompileMetrics.ts` and `packages/predicate-prisma/src/CompileMetrics.ts`: identical except id/description; `compiledTotal: { compiled; refused }`.

### Established Patterns
- `compileSql` (`packages/predicate-sql/src/index.ts` ~:318) and `compilePrismaWhere` (`packages/predicate-prisma/src/index.ts` ~:432) repeat: rules literal with the two defaults → `toRenderable(...).pipe(Effect.tapError(() => Metric.update(compiledTotal.refused, 1)))` → render → `Metric.update(compiledTotal.compiled, 1)`.
- SQL's render needs per-call `params` and `SYNTAX[options.dialect]`; Prisma's `renderNode(node)` is pure.

### Integration Points
- `packages/core/src/index.ts` (`export *` of `RenderablePredicate.ts`), `spec/overview.md` (gate 13), `scripts/check-house-style.mjs` metric gates (unchanged).

</code_context>

<specifics>
## Specific Ideas

- The renderers stay different and in their packages (Prisma folds vacuous identities; SQL accumulates parameters).

</specifics>

<deferred>
## Deferred Ideas

- A core counter factory taking the metric id — rejected (would break `[metric-declaration]`/ADR-QD-123).
- A per-package curried "dialect" value — not chosen.

</deferred>
