# Phase 52: Core owns the predicate compile shell - Research

**Researched:** 2026-11-16
**Domain:** TypeScript/Effect refactor across `@qadi/core`, `@qadi/predicate-sql`, `@qadi/predicate-prisma`: one core function owns the defaults, `toRenderable` and outcome counting; no new dependency, no output change
**Confidence:** HIGH on code facts, compile proofs, the differential tests, the proposed code, every gate and the Stryker scores (all run this session on `abf280a7`, branch `arch-wave-10`, with the proposal applied and then reverted); MEDIUM on one assumed behaviour of the changesets `fixed` group (A1)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The core compile function (COMP-01)**
- **D-01:** One core function `compilePredicate(predicate, { rules, identifiers?, maxInValues?, render, outcomes })`: `rules` is the dialect's `RenderRules` minus `identifiers`/`maxInValues`; core applies `identifiers ?? "Ascii"` and `maxInValues ?? DEFAULT_MAX_IN_VALUES`, runs `toRenderable`, updates `outcomes.refused` by 1 when it fails with `PredicateNotRenderable`, renders with `render(node)`, updates `outcomes.compiled` by 1, and returns the render result. Exact option names are Claude's discretion within this shape.
- **D-02:** A plain function returning an Effect (no `Effect.fn`, no new span, no `Effect.fnUntraced` — UNTRACED_BUDGET unchanged). The packages keep their own `Effect.fn` spans (`qadi.predicateSql.compileSql`, `qadi.predicatePrisma.compilePrismaWhere`), so trace trees are unchanged.
- **D-03:** It lives beside `toRenderable` in `packages/core/src/RenderablePredicate.ts` and is exported from the barrel (`export *` already covers the module): a `@qadi/core` minor; `spec/overview.md` names it (gate 13).
- **D-04:** A closed exported interface `CompileOutcomes { readonly compiled: Metric.Counter<number>; readonly refused: Metric.Counter<number> }` that each package's `compiledTotal` satisfies; named in `spec/overview.md`.

**Metrics (COMP-02)**
- **D-05:** Both `CompileMetrics.ts` files stay: each package declares its own `Metric.counter("qadi_…")` literal once at module scope (ADR-QD-123, `[metric-declaration]`); only the `CompileOutcomes` type comes from core. No core counter factory.
- **D-06:** Counting semantics unchanged: `refused` moves exactly once on a `PredicateNotRenderable` refusal, `compiled` exactly once after a successful render; a defect counts neither.
- **D-07:** `[metric-table]` rows, `METRIC_ID_LITERAL_BUDGET` and every other budget unchanged; the ids stay distinct.

**Evidence and records (COMP-03, COMP-04, WX-01..07)**
- **D-08:** Characterisation first, committed on the phase base before any `src` edit: differential tests through the public `compileSql` and `compilePrismaWhere` — a row per refusal reason per dialect, representative compiled outputs (SQL text and params; the Prisma where object), and each call moving its dialect's counter exactly once (read through `compiledTotal`'s export, never an id literal) — green before and after.
- **D-09:** Mutation base first: both packages' `src/index.ts` and `src/CompileMetrics.ts` plus `packages/core/src/RenderablePredicate.ts`, committed alone as the phase's first commit; no drop in a touched file's score at the close.
- **D-10:** No bench: compilation is not on the evaluation path.
- **D-11:** Records: ADR-QD-165 (+ `spec/decisions/index.yaml`), CCR-QD-443 in `spec/README.md`, BEH-QD-596+ in the predicate-compilation behaviour file (`spec/behaviors/31-predicate-compilation.md`), INV-QD-349 (one compile shell; each dialect's counter moves exactly once per call) and INV-QD-350 if needed (else Unused), traceability rows, `spec/overview.md` rows for the new exports; changesets `@qadi/core` minor, `@qadi/predicate-sql` patch, `@qadi/predicate-prisma` patch. `pnpm circular` and gate 14 (packed `exports` map) re-checked.

### Claude's Discretion
- Exact option and type names, and whether `rules` is passed whole or as the dialect-specific fields.

### Deferred Ideas (OUT OF SCOPE)
- A core counter factory taking the metric id — rejected (would break `[metric-declaration]`/ADR-QD-123).
- A per-package curried "dialect" value — not chosen.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | One core function owns defaults, `toRenderable`, outcome counting against a caller-supplied counter series | Q2: the signature, a compiled proof, 103 + 95 package tests and the full gate set green with it |
| COMP-02 | `compileSql`/`compilePrismaWhere` keep only rules, renderer and their own declared metric; ids distinct; `[metric-table]` rows unchanged | Q1 (what stays), Q6 (the three metric rules stay green; nothing ties `Metric.update` to a declaring package) |
| COMP-03 | Output unchanged incl. refusals, shown by characterisation written on the base | Q4: 47 + 21 differential tests green on the base and with the proposal; Q1: the one observable counting difference |
| COMP-04 | `spec/overview.md` names the new core export; changesets cover all three packages | Q6 (gate 13 count 932 → 935), Q7 (changeset shapes) |
| WX-01..07 | gates, records, overview, banned constructs, coverage/mutation, characterisation first, breaks | Q5, Q6, Q7, Validation Architecture |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` includes `./AGENTS.md` (read this session). The directives that bind this phase:

- **§1 Imports:** `import * as Effect from "effect/Effect"`-style submodule namespaces; relative imports carry `.ts`; `import type` for type-only (`verbatimModuleSyntax`). Cross-package: a named import from the dependency root (`import { compilePredicate } from "@qadi/core"`), never `import * as Core`.
- **§4 / §5:** `Data.TaggedError` default (no new error here); `Effect.fn` for effectful functions, with the measured exceptions. `UNTRACED_BUDGET` is an exact count of `Effect.fnUntraced` call sites: this phase adds none. Handling uses `Effect.catchTag` array form (not used here).
- **§5a:** `Match`, not `switch`; no new `switch` (the budget is `SWITCH_BUDGET`, three, unchanged).
- **§6 Forbidden:** no `as` (except `as const`, which the `no-type-assertion` rule exempts), `!`, `any`, `async`, `console`, ambient clock/uuid. **Metrics (§6, seventh budget):** a metric is declared once at module scope with its `"qadi_…"` id; a test never declares a `qadi_*` metric and reads a metric through its export; `METRIC_ID_LITERAL_BUDGET` counts literal ids in tests.
- **§8:** `…Shape`/`…Like`/`…Live` naming; this phase names `CompileOutcomes`, `CompilePredicateOptions`, `compilePredicate` (a `make…`/`…Port` prefix is not required for a plain function).
- **§9 Barrels:** `export * from "./RenderablePredicate.ts"` already exists (`packages/core/src/index.ts:48`); the new exports need no barrel edit. **§15/§16:** gate 13 (`check-api-surface.mjs`), gate 14 (`check-package-install.mjs`), `pnpm check` is the only definition of done; `pnpm check:pr` is derived from it.
- **§10:** `@effect/vitest`; coverage core ≥ 95%, the others ≥ 90%.
- **§11/§12:** `spec/` is normative; behaviour doc + invariant + traceability change in the same change; ` ```ts ` fences are signature listings (not compiled), ` ```typescript ` are compiled.
- **Doc-comment shape:** one-line summary first, the why after it.
- Memory: never release; never merge a version-packages PR; `Record<string, unknown>` is not a way around `as`; closed unions over widening; prefer the complete design (breaking changes allowed, compat is never the tiebreaker).

## Summary

The two shells are byte-for-byte the same sequence — `identifiers ?? "Ascii"`, `maxInValues ?? DEFAULT_MAX_IN_VALUES`, `toRenderable(predicate, rules)`, `tapError(refused)`, render, `update(compiled)` — with only the rules literal, the renderer and the counter differing. I built the proposal in the real tree (a function of 14 lines in `RenderablePredicate.ts`, two call sites), and it compiles with no cast on both packages (`tsc -b` and `tsc -p tsconfig.test.json` exit 0), the public `.d.ts` of both packages is **byte-identical** to the base, `pnpm circular`, `check-house-style`, `check-package-install` (gate 14, offline, 522 → 523 runtime exports) and both packages' complete vitest projects (103 and 95 tests, including the PGlite and Prisma engine agreement suites) are green, and the only red gate is the expected one: gate 13 reporting the three new exports (932 → 935). I then reverted everything; `git status --short` shows only the pre-existing `.planning/config.json` change.

A plain function returning an Effect is house-legal: `fromJson` (`Policy.ts:994`), `fromJsonValue`, `retryCountingAttempts` (`PortDerivation.ts`) and `reportSinkFailure` (`SinkReport.ts`, whose comment says "A plain function, not a traced one") are precedents, and no rule in `scripts/check-house-style.mjs` requires `Effect.fn` (the `RULES` list has no such rule; `UNTRACED_BUDGET` counts only `Effect.fnUntraced(` call sites). The span tree does not change: no existing test observed the two package spans, so the plan must **add** that observation on the base (a `collectingTracer` row), and it was green before and with the proposal.

Three findings the CONTEXT does not anticipate. (1) **One observable counting difference**: Prisma counts `compiled` *before* it renders, SQL *after*. Both renderers are pure and total, so this is unobservable unless the renderer dies; but a `Negate` chain 3000–7000 deep (on this machine) classifies fine and then overflows Prisma's renderer, and the base counted that call `compiled: 1`. D-06 ("after a successful render; a defect counts neither") moves Prisma's counter to 0 there — a correction, not a regression, and unpinnable in a test (stack-dependent). (2) **Mutation scores of the two `index.ts` files fall mechanically** (SQL 0.9559 → 0.9545, Prisma 0.9262 → 0.9244) with the *same* survivors, because the shell's killed mutants leave with the moved code, so D-09's "no drop" needs the deleted-code rule Phases 50/51 used. (3) **The shell's mutants now live in core**, and core's Stryker run executes only core's tests, so core needs its own `compilePredicate` unit tests (a stand-in renderer and two scratch counters); with them the core file rises 0.9815 → 0.9821 and every new mutant is killed.

**Primary recommendation:** add `compilePredicate`, `CompileOutcomes` and `CompilePredicateOptions<A>` to `RenderablePredicate.ts` exactly as in Pattern 1 (three exports, `rules` typed `Omit<RenderRules, "identifiers" | "maxInValues">` inline, no separate rules type), convert SQL then Prisma in one `return yield* compilePredicate(...)` each, and commit first the mutation base and the two differential files from Appendix A/B (green on the base), with a core unit-test file (Appendix C) landing in the plan that adds the function.

## Architectural Responsibility Map

Library phase (no browser/SSR/CDN tiers). The tiers here are packages.

| Capability | Primary Owner | Secondary | Rationale |
|------------|--------------|-----------|-----------|
| Defaults (`identifiers`, `maxInValues`), `toRenderable`, outcome counting | `@qadi/core` (`RenderablePredicate.ts`) | — | Renderability is a core rule (ADR-QD-079); core emits no dialect text (ADR-QD-054): it calls a caller's renderer and prints nothing itself |
| The rules literal (reserved columns, nullability, negation, finiteness, finite exclusion) | each dialect package | — | These are facts about the target grammar (`RESERVED_PRISMA_KEYS`, `FINITENESS[dialect]`) |
| The renderer | each dialect package | — | Prisma folds vacuous identities, SQL accumulates parameters; deliberately different (CONTEXT Specifics) |
| The metric declaration (`Metric.counter("qadi_…")`) | each dialect package (`CompileMetrics.ts`) | — | ADR-QD-123: declared once where its readers import it; ids distinct |
| The package `Effect.fn` span | each dialect package | — | D-02; unchanged span names |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| effect | 4.1.2 | `Effect`, `Metric` (`Metric.update`, `Metric.Counter`) | Already core's dependency (peer `effect: catalog:peer`); `Metric` is already imported by 14 core modules, so `RenderablePredicate.ts` gains one `effect/Metric` import and core gains no dependency [VERIFIED: `node_modules/effect/package.json` "version": "4.1.2"; `packages/core/package.json` peerDependencies `"effect": "catalog:peer"`] |

### Supporting (tooling only, all already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest + `@effect/vitest` | 5.1.0 | differential and unit tests | all new tests [VERIFIED: `vitest run` banner "RUN  v5.1.0"] |
| `@qadi/testing` (`isolatedMetrics`, `collectingTracer`) | workspace | metric isolation and span capture in the two package tests | package tests only; core cannot import it, it uses the twins in `packages/core/test/helpers.ts` [VERIFIED: helpers.ts:93 and :120] |
| @stryker-mutator/vitest-runner | 10.1.1 | WX-05 | base and after [VERIFIED: ran this session; same version Phase 51 recorded] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| inline `Omit<RenderRules, …>` for `rules` | an exported `DialectRules` alias | the alias is a fourth public export (gate 13: 936, one more overview row) for a name only the options interface uses; rejected |
| `compiledTotal` keeps its inline structural type | annotate `compiledTotal: CompileOutcomes` (`import type { CompileOutcomes } from "@qadi/core"`) | the annotation makes "satisfies" a compile-time fact in each package (a series added to the interface fails there); recommended, one line per package, does not touch `[metric-declaration]` |

**Installation:** none. No package is added.

**Version verification:** `pnpm exec stryker --version` is not needed; versions above were read from `node_modules/effect/package.json` and the vitest banner this session.

## Package Legitimacy Audit

No external package is installed or added by this phase. `gsd-tools query package-legitimacy check` is not applicable.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
caller (host code)
   │  compileSql(predicate, {dialect, nullable?, maxInValues?, identifiers?})
   ▼
@qadi/predicate-sql  ──Effect.fn "qadi.predicateSql.compileSql" (root span, unchanged)
   │  builds: rules literal (reserved = none, nullability, TwoValued, FINITENESS[dialect], Expressible)
   │          render = node => { params = []; text = renderNode(node, SYNTAX[dialect], params); {text, params} }
   │          outcomes = compiledTotal   (its own Metric.counter, ADR-QD-123)
   ▼
@qadi/core  compilePredicate(predicate, {rules, identifiers?, maxInValues?, render, outcomes})   (plain function, no span)
   │  rules' = {...rules, identifiers ?? "Ascii", maxInValues ?? DEFAULT_MAX_IN_VALUES}
   ├─► toRenderable(predicate, rules')        ──Effect.fn "qadi.predicate.toRenderable" (child span, unchanged)
   │        ├─ fails PredicateNotRenderable ─► tapError: Metric.update(outcomes.refused, 1) ─► error propagates to caller
   │        └─ defect (throw) ───────────────► nothing counted
   ├─► map(render)   (a throw is a defect: nothing counted)
   └─► tap: Metric.update(outcomes.compiled, 1) ─► returns render's value

@qadi/predicate-prisma: same shape; rules = RESERVED_PRISMA_KEYS, Declared nullable, ThreeValued, Declared floating, Inexpressible;
                        render = renderNode (pure, no per-call state); outcomes = its own compiledTotal
```

### Recommended Project Structure
```
packages/core/src/RenderablePredicate.ts          # + CompileOutcomes, CompilePredicateOptions<A>, compilePredicate (after toRenderable)
packages/core/test/CompilePredicate.test.ts       # new: Appendix C
packages/predicate-sql/src/index.ts               # compileSql shrinks to rules + render + outcomes
packages/predicate-sql/src/CompileMetrics.ts      # unchanged except `compiledTotal: CompileOutcomes` (optional, recommended)
packages/predicate-sql/test/CompileShell.test.ts  # new: Appendix A (committed on the base)
packages/predicate-prisma/(same three)            # Appendix B
```

### Pattern 1: the shell as a plain function over an options record

**What:** one generic function; the dialect supplies `rules`, `render`, `outcomes`; core supplies the two defaults, `toRenderable` and the counting.

**When to use:** both dialects, and any future third dialect (a renderer and nothing more, BEH-QD-271).

**Example** (compiled and run this session; the exact text applied in the probe):
```typescript
// packages/core/src/RenderablePredicate.ts — add `import * as Metric from "effect/Metric";`
// after `import * as Match …`, then append after `toRenderable`:

/**
 * The two counter series a compile reports to, one per outcome.
 *
 * Each dialect package declares its own counter once (ADR-QD-123) and hands its
 * two tagged series here, so core counts without owning a metric id.
 */
export interface CompileOutcomes {
  readonly compiled: Metric.Counter<number>;
  readonly refused: Metric.Counter<number>;
}

/** What `compilePredicate` takes beside the predicate. */
export interface CompilePredicateOptions<A> {
  /** The dialect's `RenderRules` minus the two fields core defaults. */
  readonly rules: Omit<RenderRules, "identifiers" | "maxInValues">;
  /** Default `"Ascii"`. */
  readonly identifiers?: IdentifierRule | undefined;
  /** Default {@link DEFAULT_MAX_IN_VALUES}. */
  readonly maxInValues?: number | undefined;
  /** Prints a classified tree; runs only once classification has succeeded. */
  readonly render: (node: RenderableNode) => A;
  readonly outcomes: CompileOutcomes;
}

/**
 * Compiles a `Predicate` with a dialect's rules and renderer, counting the outcome.
 *
 * Plain function, no span of its own: the caller's `Effect.fn` span stays the root
 * and `toRenderable`'s the child.
 */
export const compilePredicate = <A>(
  predicate: Predicate,
  options: CompilePredicateOptions<A>,
): Effect.Effect<A, PredicateNotRenderable> =>
  toRenderable(predicate, {
    ...options.rules,
    identifiers: options.identifiers ?? "Ascii",
    maxInValues: options.maxInValues ?? DEFAULT_MAX_IN_VALUES,
  }).pipe(
    Effect.tapError(() => Metric.update(options.outcomes.refused, 1)),
    Effect.map(options.render),
    Effect.tap(() => Metric.update(options.outcomes.compiled, 1)),
  );
```

```typescript
// packages/predicate-sql/src/index.ts — imports shrink to
//   import * as Effect from "effect/Effect"; import * as Match from "effect/Match";
//   import { compilePredicate } from "@qadi/core";            (type imports lose `RenderRules`)
export const compileSql = Effect.fn("qadi.predicateSql.compileSql")(function* (
  predicate: Predicate,
  options: CompileSqlOptions,
) {
  return yield* compilePredicate(predicate, {
    rules: {
      reservedColumns: NO_RESERVED_COLUMNS,
      nullability:
        options.nullable === undefined
          ? { _tag: "Unknown" }
          : { _tag: "Declared", nullable: options.nullable },
      // `Not` renders `CASE WHEN`, which makes it two-valued itself.
      negation: "TwoValued",
      finiteness: FINITENESS[options.dialect],
      // `col - col = 0` (`FINITE_GUARDED`) expresses the guard on every dialect.
      finiteExclusion: "Expressible",
    },
    identifiers: options.identifiers,
    maxInValues: options.maxInValues,
    outcomes: compiledTotal,
    // The accumulator is per run of the Effect, not per construction of it.
    render: (node) => {
      const params: Array<SqlSafeValue> = [];
      return { text: renderNode(node, SYNTAX[options.dialect], params), params };
    },
  });
});

// packages/predicate-prisma/src/index.ts — imports lose `Metric`, `DEFAULT_MAX_IN_VALUES`, `toRenderable`, `RenderRules`
export const compilePrismaWhere = Effect.fn("qadi.predicatePrisma.compilePrismaWhere")(
  function* (predicate: Predicate, options: CompilePrismaWhereOptions) {
    return yield* compilePredicate(predicate, {
      rules: {
        reservedColumns: RESERVED_PRISMA_KEYS,
        nullability: { _tag: "Declared", nullable: options.nullable },
        // Prisma's `{NOT: inner}` is the target's own, three-valued `NOT`.
        negation: "ThreeValued",
        // Only the declared `Float`/`Decimal` columns can hold a non-finite
        // number, and Prisma cannot exclude one from a range (see `floating`).
        finiteness: { _tag: "Declared", floating: options.floating },
        finiteExclusion: "Inexpressible",
      },
      identifiers: options.identifiers,
      maxInValues: options.maxInValues,
      outcomes: compiledTotal,
      render: renderNode,
    });
  },
);
```

Design points proved by the probe:
- `identifiers?: IdentifierRule | undefined` / `maxInValues?: number | undefined` are required by `exactOptionalPropertyTypes: true` (`tsconfig.base.json`): the packages pass `options.identifiers` straight through. Core's own precedent is `readonly name?: string | undefined` (AGENTS.md §2).
- The `rules` object is a contextually typed literal in the call, so no `RenderRules` annotation and no `as` is needed, and `nullability: cond ? { _tag: "Unknown" } : { _tag: "Declared", … }` keeps its literal tags.
- `Effect.map(options.render)` turns a throwing renderer into a defect (verified: `Cause.hasDies` true, counters 0/0), so "a defect counts neither" holds for the renderer as well as for classification.
- The SQL `params` array is allocated inside `render`, per run. Allocating it outside (e.g. in the generator before the call but captured by a shared closure built at construction) would share one array across two runs of the same Effect value. The differential test "the returned Effect is reusable … fresh params array" pins this.
- Construction is eager (`options.render` is read when `compilePredicate(...)` is called); the packages call it inside the `Effect.fn` generator, so that is at run time, as before.

### Anti-Patterns to Avoid
- **A core counter factory taking the id** (Deferred; breaks `[metric-declaration]`, ADR-QD-123).
- **`Effect.fn`/`Effect.fnUntraced` on `compilePredicate`** (D-02; would add a span and a `UNTRACED_BUDGET` row).
- **Exporting a rules alias** (`DialectRules`): a fourth export for one use.
- **Characterisation expectations computed from `toRenderable`**: they would pass whatever the shell passes in. The existing `PROPERTY: compileSql fails exactly when toRenderable fails` test hand-copies `RenderRules`, which is an independent oracle for rule drift, but the new tests use literals only.
- **Counting `compiled` before the render** (Prisma's base order): D-06 puts it after.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Counting an outcome | a bespoke `Ref`/counter in core | `Metric.update(counter, 1)` on the caller's series | the caller's registry and attributes (`outcome: compiled|refused`) are what exporters read |
| Isolating a counter in a test | a hand-made registry | `isolatedMetrics` (`@qadi/testing`; core: `helpers.ts` twin) | one `MetricRegistry` per test; pinned by `v4-api-smoke.test.ts` |
| Observing spans | a custom tracer | `collectingTracer` (same two homes) | parent/child ids come from `Tracer.NativeSpan` |
| A defect in a test | `Effect.die` into the unit | a getter that throws on a `Predicate` (`get predicates() { throw … }`) | exercises the real classifier path |

**Key insight:** the repeated shell is small, but its *counting* is the part a hand copy gets subtly wrong (order relative to the render; typed error vs defect). One definition makes "exactly once" a single place to test.

## Runtime State Inventory

Not a rename/migration phase: nothing stored, registered or cached under a changed name. Verified statements:
- **Stored data:** none — no metric id, series name or attribute changes (`qadi_predicate_sql_compiled_total`, `qadi_predicate_prisma_compiled_total`, attribute `outcome: compiled|refused` unchanged).
- **Live service config / OS-registered state / secrets / env vars:** none.
- **Build artifacts:** `packages/*/lib` is gitignored build output; rebuild with `pnpm exec tsc -b tsconfig.json` after the source edit (project references read `lib/*.d.ts`).

## Findings by Question

### Q1. The two shells, in full

`compileSql` — `packages/predicate-sql/src/index.ts:315-344` (base) [VERIFIED: Read]:
```ts
export const compileSql = Effect.fn("qadi.predicateSql.compileSql")(function* (
  predicate: Predicate,
  options: CompileSqlOptions,
) {
  const rules: RenderRules = {
    identifiers: options.identifiers ?? "Ascii",
    reservedColumns: NO_RESERVED_COLUMNS,
    maxInValues: options.maxInValues ?? DEFAULT_MAX_IN_VALUES,
    nullability:
      options.nullable === undefined
        ? { _tag: "Unknown" }
        : { _tag: "Declared", nullable: options.nullable },
    // `Not` renders `CASE WHEN`, which makes it two-valued itself.
    negation: "TwoValued",
    finiteness: FINITENESS[options.dialect],
    // `col - col = 0` (`FINITE_GUARDED`) expresses the guard on every dialect.
    finiteExclusion: "Expressible",
  };

  const node = yield* toRenderable(predicate, rules).pipe(
    Effect.tapError(() => Metric.update(compiledTotal.refused, 1)),
  );

  const params: Array<SqlSafeValue> = [];
  const text = renderNode(node, SYNTAX[options.dialect], params);

  yield* Metric.update(compiledTotal.compiled, 1);

  return { text, params };
});
```
`compilePrismaWhere` — `packages/predicate-prisma/src/index.ts:432-451`:
```ts
export const compilePrismaWhere = Effect.fn("qadi.predicatePrisma.compilePrismaWhere")(
  function* (predicate: Predicate, options: CompilePrismaWhereOptions) {
    const rules: RenderRules = {
      identifiers: options.identifiers ?? "Ascii",
      reservedColumns: RESERVED_PRISMA_KEYS,
      maxInValues: options.maxInValues ?? DEFAULT_MAX_IN_VALUES,
      nullability: { _tag: "Declared", nullable: options.nullable },
      // Prisma's `{NOT: inner}` is the target's own, three-valued `NOT`.
      negation: "ThreeValued",
      // Only the declared `Float`/`Decimal` columns can hold a non-finite
      // number, and Prisma cannot exclude one from a range (see `floating`).
      finiteness: { _tag: "Declared", floating: options.floating },
      finiteExclusion: "Inexpressible",
    };
    const node = yield* toRenderable(predicate, rules).pipe(
      Effect.tapError(() => Metric.update(compiledTotal.refused, 1)),
    );
    yield* Metric.update(compiledTotal.compiled, 1);
    return renderNode(node);
  },
);
```

Option types [VERIFIED: Read, `index.ts:59-77` (SQL), `:60-91` (Prisma)]:
```ts
export interface CompileSqlOptions {
  readonly dialect: SqlDialect;                      // "postgres" | "mysql" | "sqlite"
  readonly maxInValues?: number;                     // Default 1000.
  readonly nullable?: ReadonlySet<string>;           // absent = Unknown
  readonly identifiers?: IdentifierRule;             // Default "Ascii".
}
export interface CompilePrismaWhereOptions {
  readonly nullable: ReadonlySet<string>;            // required
  readonly floating: ReadonlySet<string>;            // required
  readonly maxInValues?: number;
  readonly identifiers?: IdentifierRule;
}
```
`RenderRules` — `RenderablePredicate.ts:~120-135` (every field):
```ts
export interface RenderRules {
  readonly identifiers: IdentifierRule;
  readonly reservedColumns: ReadonlySet<string>;
  readonly maxInValues: number;
  readonly nullability: ColumnNullability;
  readonly negation: Negation;
  readonly finiteness: ColumnFiniteness;
  readonly finiteExclusion: FiniteExclusion;
}
export const DEFAULT_MAX_IN_VALUES = 1000;          // RenderablePredicate.ts:150
```
`toRenderable` — `RenderablePredicate.ts` end of file: `Effect.fn("qadi.predicate.toRenderable")(function* (predicate: Predicate, rules: RenderRules) { return yield* Effect.fromResult(classify(predicate, { rules, polarity: "Positive" })); })`, inferred `Effect<RenderableNode, PredicateNotRenderable, never>` (the probe's `compilePredicate` return annotation `Effect.Effect<A, PredicateNotRenderable>` typechecks against it, which proves the error channel is exactly `PredicateNotRenderable`).

Both `CompileMetrics.ts` are identical except three lines [VERIFIED: `diff`]: the file doc, the id/description — `"qadi_predicate_sql_compiled_total"` / `"Predicates compiled by @qadi/predicate-sql's compileSql, tagged by outcome."` and `"qadi_predicate_prisma_compiled_total"` / `"Predicates compiled by @qadi/predicate-prisma's compilePrismaWhere, tagged by outcome."` — and one doc phrase naming the function. Each exports `compiledTotal: { readonly compiled: Metric.Counter<number>; readonly refused: Metric.Counter<number> }` built as `Metric.withAttributes(compiledBase, { outcome: "compiled" })` / `"refused"`; the untagged `compiledBase` is deliberately not exported.

**Every difference between the shells**

| # | SQL | Prisma | Matters for the shell? |
|---|-----|--------|------------------------|
| 1 | `reservedColumns: NO_RESERVED_COLUMNS` (empty) | `RESERVED_PRISMA_KEYS` | no — rules |
| 2 | nullability `Unknown` when `nullable` absent, else `Declared` | always `Declared` (required option) | no — rules |
| 3 | `negation: "TwoValued"` | `"ThreeValued"` | no — rules |
| 4 | `finiteness: FINITENESS[options.dialect]`; `finiteExclusion: "Expressible"` | `Declared { floating }`; `"Inexpressible"` | no — rules (SQL can never raise `NonFiniteColumn`; Prisma can) |
| 5 | render needs per-call `params` and `SYNTAX[dialect]`; returns `{ text, params }` | `renderNode(node)` is a module-scope pure `Match` | yes — SQL's render must be a closure that allocates `params` per run |
| 6 | `compiled` counted **after** render | `compiled` counted **before** render | yes — see below |
| 7 | the two defaults and the `Effect.tapError` shape are identical | | the shell |

**Order of compiled-count vs render (question 1).** Neither renderer can fail: `renderNode` is a total `Match.tagsExhaustive` over a closed `RenderableNode`, with no `Effect` and no I/O; neither can throw on any tree `toRenderable` produces, *except by stack exhaustion on a deeply nested tree*. I measured it on the base (a `Negate` chain, `column tenantId Eq 1`, counters read through `compiledTotal` under `isolatedMetrics`):

| depth | SQL (postgres) `ok / compiled / refused` | Prisma `ok / compiled / refused` |
|-------|------------------------------------------|----------------------------------|
| 100…2000 | true / 1 / 0 | true / 1 / 0 |
| 3000…7000 | true / 1 / 0 | **false / 1 / 0** (renderer died; counted anyway) |
| 8000 | true / 1 / 0 | false / **0** / 0 |
| ≥ 10000 | false / 0 / 0 | false / 0 / 0 |

So on the base, Prisma counted a compile for a call that threw (`RangeError` defect) in a stack-dependent band, and SQL did not. D-06 states the SQL semantics ("exactly once **after a successful render**; a defect counts neither"), and `compilePredicate` implements that for both, so the Prisma counter changes only inside that band. This is the one observable counting difference; it is a correction, not an output change (the call still fails identically). It must not be pinned by a test (the depth is machine- and Node-version-dependent). Put one sentence in ADR-QD-165 and BEH-QD-597 (see Open Question 1).

Can classification throw? Only by stack exhaustion or a hostile `Predicate` (a throwing getter): it is `Effect.fromResult(classify(...))` evaluated inside `Effect.fn`'s generator, so a throw is a defect and `tapError` (typed errors only) does not count it — verified by the "a defect inside classification counts neither outcome" row on both dialects.

### Q2. The core function, house style, compile proof, span tree

**Signature and types:** Pattern 1 above (three exports: `CompileOutcomes`, `CompilePredicateOptions<A>`, `compilePredicate`). The `.d.ts` core emits [VERIFIED: `packages/core/lib/RenderablePredicate.d.ts` after `tsc -b`]:
```ts
export interface CompileOutcomes { readonly compiled: Metric.Counter<number>; readonly refused: Metric.Counter<number>; }
export interface CompilePredicateOptions<A> { readonly rules: Omit<RenderRules, "identifiers" | "maxInValues">; readonly identifiers?: IdentifierRule | undefined; readonly maxInValues?: number | undefined; readonly render: (node: RenderableNode) => A; readonly outcomes: CompileOutcomes; }
export declare const compilePredicate: <A>(predicate: Predicate, options: CompilePredicateOptions<A>) => Effect.Effect<A, PredicateNotRenderable>;
```

**Plain function returning an Effect is house-legal** [VERIFIED: read]. Precedents, all exported plain functions that return an Effect pipe:
- `packages/core/src/Policy.ts:994-999` — `export const fromJson = (json: string): Effect.Effect<Policy, PolicyDecodeTooDeep | PolicyNotJson | Schema.SchemaError> => Effect.suspend(() => …).pipe(Effect.mapError(textFailure))`
- `packages/core/src/PortDerivation.ts:~203` — `retryCountingAttempts`, `Effect.gen` + `.pipe(Effect.tapError(() => Metric.update(portRetriesTotal, port)), …)` (a counter updated from a caller-supplied value)
- `packages/core/src/SinkReport.ts:~64-71` — `reportSinkFailure`, doc: "A plain function, not a traced one: it runs only on a failure."
- `packages/core/src/Walk.ts:860` — `walk` "A plain function returning `Effect.suspend`, neither traced nor in the budget".
No gate checks it: `scripts/check-house-style.mjs`'s `RULES` ids are `no-async`, `no-await`, `no-raw-promise`, `no-barrel-effect-import`, `no-type-assertion`, `no-nondeterministic-time`, `no-ambient-uuid`, `no-ambient-console`, `no-non-null-assertion`, `no-extensionless-relative-import`, `no-legacy-service-api`, `no-static-layer-or-default`, `no-schema-tagged-error-class`, `no-effect-ordie`, `no-node-fs-import`, … none about `Effect.fn`; `UNTRACED_CALL = /\bEffect\.fnUntraced\s*\(/` only counts `fnUntraced`. The probe ran `check-house-style.mjs`: "house-style: 541 file(s) clean (3 declared switch(es))" (542 with the three test files).

**Compile proof (no casts):** with the proposal applied, `pnpm exec tsc -b tsconfig.json` and `pnpm exec tsc -p tsconfig.test.json` both exit 0 (the test graph includes the new differential and core tests; a deliberate `const x: number = 'a'` file was reported, so the graph is live). `compilePredicate`'s `A` infers `{ text: string; params: SqlSafeValue[] }` for SQL and `PrismaWhereInput` for Prisma: **the emitted `.d.ts` of both packages are byte-identical to the base** (`diff` of `packages/predicate-sql/lib/index.d.ts` and `packages/predicate-prisma/lib/index.d.ts` before and after: no difference).

**Span tree unchanged — and how to observe it.** No existing test names either package span (`grep` for `predicateSql.compileSql`, `predicatePrisma.compilePrismaWhere`, `predicate.toRenderable` over `packages`, `spec`, `features`, `website`, `docs`, `examples` finds them only in the three source files). The plan must therefore add the observation on the base. Both differential files do (`collectingTracer` from `@qadi/testing`; `Tracer.Span` has `name`, `parent: Option<AnySpan>` and `spanId`): two calls (one compile, one refusal) record exactly `["qadi.predicateSql.compileSql", "qadi.predicate.toRenderable", "qadi.predicateSql.compileSql", "qadi.predicate.toRenderable"]` (Prisma: `qadi.predicatePrisma.compilePrismaWhere`), the first has no parent and the second's parent is the first's `spanId`. Green on the base and with the proposal (47 and 21 tests). Core's own `compilePredicate` test asserts it adds none: `["qadi.predicate.toRenderable"]` only.

### Q3. Core and `effect/Metric`; `.d.ts`; gate 14

- Core already imports `effect/Metric` in 14 modules (`DecisionCache.ts:21`, `EvaluationMetrics.ts:44`, `Lifecycle.ts:22`, `PortAccess.ts:36`, `PortDerivation.ts:27`, …) and already exports `Metric.Counter<number>` values (`EvaluationMetrics.ts:84`: `export const decisionsTotal: { readonly [T in Decision["_tag"]]: Metric.Counter<number> }`) [VERIFIED: grep + Read]. The dependency direction is fine.
- `.d.ts` emission: `lib/RenderablePredicate.d.ts` names `Metric.Counter<number>` through the module's own `import * as Metric from "effect/Metric"` (no TS2883, no extra re-export needed); `pnpm exec tsc -b tsconfig.json` exit 0 [VERIFIED].
- **Gate 14** (`node scripts/check-package-install.mjs`, offline, 7 s) with the proposal in the tree: `package-install: 9 package(s) pack, resolve and authorize (523 runtime export(s))`; on the base it reports `522 runtime export(s)`, so the packed `@qadi/core` carries the new function through the unchanged `exports` map (the map is a closed list, ADR-QD-099, and `index.ts`'s `export *` already covers the module). The consumer in that gate already runs `compileSql` and `compilePrismaWhere` against the packed artifacts (`check-package-install.mjs:427-428, :512-515`), so the packed predicate packages call the packed core's new export end to end.
- Version coupling: the two predicate packages now need the new core export at runtime. `workspace:^` publishes a caret range and `.changeset/config.json` has all nine packages in one `fixed` group [VERIFIED: Read], so they release together (A1: fixed-group behaviour from changesets knowledge, not re-verified).

### Q4. Characterisation (D-08)

**Existing tests** [VERIFIED: Read/grep]:
- SQL: `packages/predicate-sql/test/CompileSql.test.ts` (727 lines: nullability, refusal-is-core's-class, **`PROPERTY: compileSql fails exactly when toRenderable fails`** over 5 option sets × 300 sampled trees with a hand-copied `RenderRules`, golden fragments per dialect, refusals), `EngineAgreement.test.ts` (PGlite/`node:sqlite`), `Metrics.test.ts` (72 lines).
- Prisma: `CompilePrismaWhere.test.ts` (985 lines), `EngineAgreement.test.ts` (real Prisma engine), `Metrics.test.ts`, `fixture.ts` (`FIXTURE_NULLABLE`, `FIXTURE_FLOATING`, `compile`).
- Counter reads: `Metrics.test.ts` in each package imports `compiledTotal` from `../src/CompileMetrics.ts` and reads `(yield* Metric.value(compiledTotal.compiled)).count` inside `isolatedMetrics(...)` from `@qadi/testing`; it asserts one `compiled` for one Eq and one `refused` for one unsafe value, plus the id/type/description pin and the `outcome` attribute from `Metric.snapshot`. It does **not** cover: each refusal reason moving the counter, the default `maxInValues`/`identifiers` through the public entry, a defect counting neither, reuse of the returned Effect, or the spans.

**Refusal reasons reachable** — the closed union [VERIFIED: `packages/core/src/Errors.ts:315-321`]:
```ts
export type RenderRefusal =
  | "UnsafeColumn"
  | "ReservedColumn"
  | "UnsafeValue"
  | "TooManyValues"
  | "NullOnNonNullableColumn"
  | "NonFiniteColumn";
```
| Reason | `compileSql` (3 dialects) | `compilePrismaWhere` |
|--------|--------------------------|----------------------|
| `UnsafeColumn` | reachable (`x"y`; `é` under default `Ascii`) | reachable |
| `ReservedColumn` | **unreachable**: `NO_RESERVED_COLUMNS` is empty; a column `AND` compiles to `"AND" = $1` | reachable (`AND`; `not` on a `MemberOf`) |
| `UnsafeValue` | reachable (Compare and MemberOf) | reachable |
| `TooManyValues` | reachable (explicit `maxInValues: 2`; default 1001 → `1001 values exceeds maxInValues (1000)`) | reachable |
| `NullOnNonNullableColumn` | reachable only with `nullable` declared (`new Set(["other"])` then `Eq a null`) | reachable (`tenantId` is not in `FIXTURE_NULLABLE`) |
| `NonFiniteColumn` | **unreachable**: `finiteExclusion: "Expressible"`; `Gte` renders `("level" >= $1 AND "level" - "level" = 0)` on postgres/sqlite and a plain `>=` on mysql | reachable (`score` is `FIXTURE_FLOATING`) |

So SQL has four reachable reasons and Prisma six; the tests state both unreachable SQL rows as *compiled* rows (an `AND` column and a `Gte`), which is what makes the table honest about 6 × 2.

All refusal texts (`reason`) were read off the base; they are pinned as literals in Appendix A/B, e.g. `column 'x"y' is not a safe identifier`, `column 'AND' is not a safe identifier` (ReservedColumn deliberately reuses the UnsafeColumn text), `value for column 'x' is not a safe query parameter`, `a value for column 'x' is not a safe query parameter`, `3 values exceeds maxInValues (2)`, `column 'a' is declared NOT NULL; a null comparison is not renderable`, `column 'score' may hold a non-finite number, and this target cannot exclude one from a range`.

**The differential files (Appendix A: SQL, 47 tests; Appendix B: Prisma, 21 tests)** — written and run green on the base (`abf280a7`, no source edit) and again with the proposal. They cover: a row per reachable refusal per dialect (each asserts `_tag`, `refusal`, `predicateTag`, `reason`, and counters `{ compiled: 0, refused: 1 }`); compiled rows per dialect with text/params (or the Prisma where object), counters `{ compiled: 1, refused: 0 }`; the default boundary (1000 compiles, 1001 refuses); `UnicodeBmp` override; leftmost refusal wins; "a defect inside classification counts neither" (a `Predicate` whose `predicates` getter throws; `Cause.hasDies`; counters 0/0); "each call moves exactly once" (3 compiles and 2 refusals read 3/2); "the returned Effect is reusable" (two runs read 2/0; SQL asserts the two `params` arrays are different objects); the span tree. All expectations are literals; none is computed from `toRenderable`. Counters are read as `Metric.value(compiledTotal.compiled)` through the `../src/CompileMetrics.ts` export under `isolatedMetrics` (effect 4.1.2: a fresh `MetricRegistry` isolates on-fiber writes [VERIFIED: `packages/testing/src/IsolatedMetrics.ts` header and the green rows]); no `"qadi_…"` literal appears, so `METRIC_ID_LITERAL_BUDGET` is untouched.

**Core's own unit test (Appendix C, 8 tests)** with a stand-in renderer and two scratch counters whose ids are `test_compile_shell_compiled` / `test_compile_shell_refused` (not `qadi_*`: the `[metric-declaration]` test scan only matches `Metric.<ctor>(\s*"qadi_`, `check-house-style.mjs:~1993`). It is needed for Stryker (Q5) and for the 95% core coverage bar.

### Q5. Mutation (D-09)

Configs [VERIFIED: Read]: `stryker.config.mjs` (core: `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`, reports `reports/mutation/mutation.json`), `stryker.predicate-sql.mjs` (`mutate: ["packages/predicate-sql/src/**/*.ts"]`, `reports/mutation-predicate-sql/mutation.json`, `concurrency` capped at 8), `stryker.predicate-prisma.mjs` (`reports/mutation-predicate-prisma/mutation.json`). All `ignoreStatic: true`, `coverageAnalysis: "perTest"`, `thresholds break: 80`. `reports/*` is gitignored. Per-file runs use `--mutate`:

```bash
pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/RenderablePredicate.ts'                      # 12 s
pnpm exec stryker run stryker.predicate-sql.mjs --mutate 'packages/predicate-sql/src/index.ts,packages/predicate-sql/src/CompileMetrics.ts'          # 23 s
pnpm exec stryker run stryker.predicate-prisma.mjs --mutate 'packages/predicate-prisma/src/index.ts,packages/predicate-prisma/src/CompileMetrics.ts' # 11-13 s
```
~48 s in total, run sequentially (Phase 51 Pitfall 7: a `Timeout` counts as detected, so contention inflates scores). Score = (Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage); Ignored not scored.

**Base scores, measured this session on `abf280a7` with only the existing tests:**

| File | Score | Killed / Survived / NoCoverage / Ignored |
|------|-------|------------------------------------------|
| `packages/core/src/RenderablePredicate.ts` | **0.9815** | 159 / 3 / 0 / 60 |
| `packages/predicate-sql/src/index.ts` | **0.9559** | 65 / 2 / 1 / 43 |
| `packages/predicate-sql/src/CompileMetrics.ts` | unmeasured (all 8 mutants Ignored: module-scope, `ignoreStatic`) | — |
| `packages/predicate-prisma/src/index.ts` | **0.9262** | 113 / 4 / 5 / 32 |
| `packages/predicate-prisma/src/CompileMetrics.ts` | unmeasured (all 8 Ignored) | — |

Survivors on the base: core — `ArrowFunction | Unrepresentable: () => () => false,` and two on `NON_FINITE.some(...)` (`MethodExpression → every`, `ObjectLiteral → {}`); SQL — `ExcludeNull` template-literal NoCoverage, and two on `? { _tag: "Unknown" }` (`{}` and `""`); Prisma — five NoCoverage and four Survived, all at the `"not" in filter` guard (`:313`) and the two `isVacuous…` conditionals (`:257`, `:261`). **None is in the shell.** `CompileMetrics.ts` has no measurable mutant: record both as `unmeasured` (the `51-mutation-base.json` shape has an `"unmeasured": {}` key for exactly this) so "no drop" is not claimed vacuously.

**With the proposal and the Appendix tests applied** (same invocations): core `RenderablePredicate.ts` **0.9821** (165 / 3 / 0 / 61: every mutant in `compilePredicate` killed, same three survivors), SQL `index.ts` **0.9545** (63 / 2 / 1 / 43), Prisma `index.ts` **0.9244** (110 / 4 / 5 / 32). The SQL and Prisma survivor lists are the same textual set as on the base. The two package scores fall by pure arithmetic: four mutants of the shell (`options.identifiers && "Ascii"`, `"Ascii"` → `""`, `options.maxInValues && DEFAULT_MAX_IN_VALUES`, the `tapError` `ArrowFunction → () => undefined`) were *killed* on the base in each package and are now core's; the package-side survivors that remain are equivalent mutants — `nullability: {}` or `{ _tag: "" }` behaves as `Unknown` because `isRequired` only tests `_tag === "Declared"` — so no package test can raise the score back. This is exactly the Phase 50 D-13 / Phase 51 `tools/mutation.mjs` situation: accept a fall only when (a) there is no new survivor (multiset compare of textual identities) and (b) the detected count *outside the moved region* does not fall. The mutants of the function body on the base sit at SQL `:318-343` (killed 15, survived 2 — the two equivalent `Unknown` survivors —, ignored 1) and Prisma `:433-447` (killed 12, ignored 1); of those killed, exactly four per package are the shell's (the `identifiers` `LogicalOperator` and `StringLiteral`, the `maxInValues` `LogicalOperator`, the `tapError` `ArrowFunction`), the rest are rules-literal mutants that stay (`negation`, `finiteExclusion`, `nullability`, `finiteness`) and are still killed after the move. So the "moved region" for the deleted-region rule is those four mutants per package. See Open Question 2.

### Q6. Gates

- **Gate 13** (`node scripts/check-api-surface.mjs`): base `api-surface: 932 export(s) documented across 9 package(s)`. With the proposal it prints exactly three drifts — `CompileOutcomes`, `CompilePredicateOptions`, `compilePredicate` ("is exported by @qadi/core and is not named in spec/overview.md's Public API surface section") — and `3 API-surface drift(s)`; so after the overview rows the count is **935**. Row format [VERIFIED: `spec/overview.md:176-179`]: `| \`name\`, \`name\` | function \| type \| const | \`File.ts\` — prose |`, e.g. ``| `toRenderable` | function | `RenderablePredicate.ts` — classifies a `Predicate` once … |`` and ``| `RenderableNode`, `EqualityLiteral` | type | `RenderablePredicate.ts` — eight tags … |``. Suggested rows, placed after `DEFAULT_MAX_IN_VALUES` (`:179`):
  ``| `compilePredicate` | function | `RenderablePredicate.ts` — the compile shell both dialect packages share: applies `identifiers ?? "Ascii"` and `maxInValues ?? DEFAULT_MAX_IN_VALUES`, runs `toRenderable`, counts a `PredicateNotRenderable` on `outcomes.refused`, renders, then counts `outcomes.compiled`; a plain function with no span of its own (BEH-QD-596, ADR-QD-165) |``
  ``| `CompilePredicateOptions`, `CompileOutcomes` | type | `RenderablePredicate.ts` — `compilePredicate`'s options (`rules` is a dialect's `RenderRules` minus the two defaulted fields) and the two counter series a compile reports to (BEH-QD-597) |``
  Then the Revision/Change History bump through `node scripts/spec-revise.mjs spec/overview.md "<what>" --date 2026-11-16` (the file is at 1.119; `--check` verifies).
- **`[metric-declaration]`, `[metric-table]`, `[metric-id-literal]`** (`check-house-style.mjs:1872-2090`): `[metric-declaration]` scans `packages/*/src` for `Metric.<ctor>(` and the *test, features, examples* trees for `Metric.<ctor>(\s*"qadi_`; the proposal changes no declaration, `[metric-table]` reads `spec/behaviors/25-inspection.md:917-918` (the two rows for `qadi_predicate_sql_compiled_total` and `qadi_predicate_prisma_compiled_total`, type Counter, `outcome`: `compiled`, `refused`, declared in each package's `CompileMetrics.ts`), unchanged. The probe run: `house-style: 541 file(s) clean`.
- **Does any gate object to core calling `Metric.update` on a counter declared in another package?** No. The rules govern declarations (where a constructor appears, the id literal, the table), never update sites; `grep` shows `Metric.update` already called from outside the declaring module in core itself (`Lifecycle.ts:160` updates `decisionsTotal`, declared in `EvaluationMetrics.ts`) and `@qadi/audit` (`AuditWriteReport.ts:262-265`). After the change `Metric.update` no longer appears in either package's `src/index.ts`.
- **`pnpm circular`:** `✔ No circular dependency found!` with the proposal (the new import is `effect/Metric` inside an existing module; no new edge).
- **Typecheck:** `tsc -b tsconfig.json` and `tsc -p tsconfig.test.json` exit 0; `oxlint` (via `pnpm lint`) reports only warnings pre-existing in other packages.
- **UNTRACED_BUDGET / SWITCH_BUDGET / SCHEMA_ERROR_BUDGET / ANY_BUDGET / HAS_CUSTOM_BUDGET:** untouched: no `Effect.fnUntraced`, no `switch`, no error class, no `any`.

### Q7. Spec records

All reserved ids are free: `grep` for `BEH-QD-59[6-9]`, `BEH-QD-600`, `INV-QD-349`, `INV-QD-350`, `ADR-QD-165`, `CCR-QD-443`, `ARCH-99` over `spec/`, `packages/`, `.changeset/`, `AGENTS.md`, `features/`, `examples/`, `website/` finds nothing [VERIFIED]. Last used: `ADR-QD-164` last in `spec/decisions/index.yaml`; `CCR-QD-442` at `spec/README.md:379`; `BEH-QD-595`, `INV-QD-348` (Phase 51).

| Record | Where | Shape |
|--------|-------|-------|
| **ADR-QD-165** | `spec/decisions/165-the-compile-shell-is-core-s.md` (any slug; the id must equal the file number, gate 10) + an `index.yaml` entry after ADR-QD-164: `- id: "ADR-QD-165"` / `file:` / `title:` / `status: "Accepted — reads ADR-QD-054, ADR-QD-079; keeps ADR-QD-123"` | Document Control table (`Document ID QADI-ADR-165`), Context / Decision. Content: the shell was written twice; `compilePredicate` lives beside `toRenderable`; the dialect packages keep rules, renderer, metric; counter declarations stay per package (ADR-QD-123) so no core factory; core stays dialect-free because it takes a renderer and prints nothing (ADR-QD-054's REQUIREMENT at `31-predicate-compilation.md:83-86`: no dependency on either companion — the function adds none); the Prisma `compiled`-count position (Q1); the mutation deleted-region note (Q5) |
| **CCR-QD-443** | new row in `spec/README.md` after `:379` | `\| CCR-QD-443 \| 2026-11-16 \| <files with Rev> \| ARCH-99. **<title>.** … \|` — model: the CCR-QD-442 row (lists each file with its new revision, the ids introduced, the tests) |
| **BEH-QD-596..600** | no new file: `spec/behaviors/31-predicate-compilation.md` (661 lines, Rev 1.9; last behaviour `BEH-QD-306` at `:596`, the file ends with a `---` / `_Previous: [30 — Port Calls]_` footer) | `## BEH-QD-NNN: <title>`, a fenced `REQUIREMENT:` block, prose. Suggested: **596** a compile is defaults + classification + render + count, owned by core (`compilePredicate`'s signature as a ` ```ts ` listing); **597** `refused` moves exactly once per `PredicateNotRenderable`, `compiled` exactly once after a successful render, a defect counts neither (states the Prisma correction); **598** both dialects' output, refusals included, is what the shell's rules and renderer say (the table of reachable reasons per dialect: four SQL, six Prisma); **599** the shell adds no span; the package span is the root and `toRenderable`'s its child; **600** each dialect declares its own counter once and passes `CompileOutcomes` (ids distinct, `[metric-table]` unchanged). Use ` ```ts ` fences, not compiled ` ```typescript `. Bump with `scripts/spec-revise.mjs` |
| **INV-QD-349 / 350** | `spec/invariants.md` after INV-QD-348 | `## INV-QD-349: …` with **Source**, **Implication**, **Enforcement** (the test files), **Related**. 349 = "One compile shell; each dialect's counter moves exactly once per call". 350: use for "a defect counts neither outcome" or name it **Unused** in the CCR-QD-443 row |
| **Traceability** | `spec/traceability.md` | ADR row (style of `:338`), INV rows (`:180-181`), per-test-file rows (`:386-388`), the behaviour-file row for `31 — Predicate Compilation` gets the new BEH ids |
| **Revisions** | `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-16` per touched file; `--check` verifies | `31-predicate-compilation.md`, `invariants.md`, `traceability.md`, `README.md`, `overview.md`, `decisions/165-…md` (Rev 1.0, new) |
| **`spec/behaviors/25-inspection.md`** | metric table `:917-918` | **no edit** (D-07) |
| **AGENTS.md** | `grep compileSql|compilePrismaWhere|toRenderable|compiledTotal AGENTS.md CONTRIBUTING.md` finds nothing | no edit |
| **READMEs** | `packages/predicate-sql/README.md`, `packages/predicate-prisma/README.md` mention the two compile functions | no signature changes; no edit needed |
| **Changesets** | `.changeset/*.md`, every existing file names exactly one package (checked by script this session) | three files: `core-compile-predicate.md` (`"@qadi/core": minor`: the new export), `predicate-sql-compile-shell-in-core.md` and `predicate-prisma-compile-shell-in-core.md` (`"…": patch`: no public type or outcome change; the Prisma counter note belongs in the Prisma file). Model: `.changeset/policy-arity-stated-once.md`. No release (memory). |

### Q8. See Validation Architecture and Security Domain below.

## Common Pitfalls

### Pitfall 1: Counting `compiled` before the render (the base's Prisma order)
**What goes wrong:** copying Prisma's order into core counts a compile for a call whose renderer died. **How to avoid:** `Effect.map(render)` then `Effect.tap(update compiled)`, as in Pattern 1; the two "defect counts neither" rows and Appendix C's render-throws case pin it. **Warning sign:** a `compiled: 1` next to a failed exit.

### Pitfall 2: Sharing the SQL `params` accumulator across runs
**What goes wrong:** allocating `params` outside the `render` closure makes a reused Effect value (`const p = compileSql(...)`; run twice) append into one array. **How to avoid:** allocate inside `render`; the "reusable … fresh params array" row asserts `notStrictEqual`.

### Pitfall 3: `exactOptionalPropertyTypes` rejecting `identifiers: options.identifiers`
**What goes wrong:** with `identifiers?: IdentifierRule` the call site is TS2379. **How to avoid:** declare `| undefined` in `CompilePredicateOptions` (as in Pattern 1); core's own `readonly name?: string | undefined` is the precedent.

### Pitfall 4: A characterisation that reads the code under change
**What goes wrong:** a test whose expected value is `toRenderable(...)` or the package's own constant passes whatever the shell does. **How to avoid:** literal rows only (Appendix A/B); the one `toRenderable` oracle in the repo (`PROPERTY: compileSql fails exactly when toRenderable fails`) compares against a hand-copied `RenderRules`, which stays valid and is kept.

### Pitfall 5: Believing the package mutation scores can be restored by a package test
**What goes wrong:** chasing "no drop" in `index.ts` by writing tests for the two equivalent survivors (`{}`/`""` for `_tag: "Unknown"`). **How to avoid:** apply the deleted-region rule (Q5), record the survivor set unchanged, and score the moved lines in core where Appendix C kills all of them.

### Pitfall 6: A core test declaring a `qadi_*` counter, or reading one by id
**What goes wrong:** `[metric-declaration]` fails (`Metric.counter("qadi_…` in a test) or `METRIC_ID_LITERAL_BUDGET` counts a literal. **How to avoid:** Appendix C uses `test_compile_shell_*` ids; the packages read `compiledTotal` through the module export.

### Pitfall 7: Pinning a stack-depth boundary
**What goes wrong:** a "defect counts neither" test built on a deep tree is machine-dependent (Q1's table: the band moved with the call path). **How to avoid:** the hostile-getter and throwing-renderer defects; never a depth.

### Pitfall 8: Running Stryker concurrently with anything
A `Timeout` counts as detected, so contention inflates the score (Phase 51 Pitfall 7). Run the three invocations alone, one after another.

### Pitfall 9: Forgetting to rebuild `lib/` after reverting a probe
`tsc -b` reads `packages/*/lib/*.d.ts` through project references; after `git checkout -- <src>` run `pnpm exec tsc -b tsconfig.json` so `lib/` matches the tree (gate 14 packs from the build).

## Code Examples

Pattern 1 above is the implementation. The harnesses are Appendix A (SQL), B (Prisma), C (core).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| each dialect re-derives the meaning of a leaf | `toRenderable` classifies once; dialects render | ADR-QD-079 | the shell is what remains duplicated |
| the shell written in each package | `compilePredicate` | this phase (ADR-QD-165) | one place for defaults and counting |

**Deprecated/outdated:** none.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The changesets `fixed` group bumps all nine packages together to the highest bump (so a core minor takes the two predicate packages with it and `workspace:^` cannot resolve a predicate package against an older core) | Q3, Q7 | a predicate package released alone could pair with a core lacking `compilePredicate`; `.changeset/config.json` shows the `fixed` group [VERIFIED], the semantics are changesets behaviour [ASSUMED] |
| A2 | The stack-overflow band (Q1) is machine/Node-dependent | Q1, Pitfall 7 | none for the plan: no test pins it |

## Open Questions

1. **Prisma's `compiled` counter moves from "before render" to "after render" (D-06 vs "output unchanged").**
   - What we know: D-06 says "exactly once after a successful render; a defect counts neither", which is SQL's base behaviour and not Prisma's. The base Prisma counts `compiled` for a call whose renderer overflowed the stack (a `Negate` chain ≈3000–7000 deep here). With D-01's order that band reads 0 for Prisma, as it already does for SQL.
   - What's unclear: whether the user wants this named as a deliberate correction. No test can pin it (Pitfall 7).
   - Recommendation: no user decision needed; it is D-06 applied literally. State it in ADR-QD-165, BEH-QD-597 and the Prisma patch changeset ("a compile whose renderer died is no longer counted as compiled").

2. **D-09 "no drop in a touched file's score" cannot be met literally by the two `index.ts` files.**
   - What we know: SQL 0.9559 → 0.9545 and Prisma 0.9262 → 0.9244 with identical survivors, because four killed shell mutants per package moved to core; the remaining survivors are equivalent mutants. Core's `RenderablePredicate.ts` rises 0.9815 → 0.9821 with every new mutant killed.
   - What's unclear: the exact comparison rule for the close.
   - Recommendation: use Phase 51's `tools/mutation.mjs` mechanics (per-file score, multiset survivor compare, "no new survivor", and the deleted-region rule from Phase 50 D-13: a fall is accepted only if the detected count outside the moved region does not fall), writing `52-mutation-base.json` with `measured`, `counts`, `survivors`, `unmeasured` (both `CompileMetrics.ts`), `deletedRegion` (the four moved-shell mutants per package, by line text: SQL `:320`, `:322`, `:335`; Prisma `:435`, `:437`, `:447`). If the user prefers the literal reading, the only alternative is dropping the equivalent survivors' lines, which is out of scope.

3. **Annotate `compiledTotal: CompileOutcomes` in both `CompileMetrics.ts`?** (Claude's discretion.) Recommended: yes, one `import type` and one annotation per file; it makes D-04's "satisfies" a compile-time fact and leaves `[metric-declaration]` and `[metric-table]` unchanged. Not run in the probe (the probe passed `compiledTotal` structurally); trivial and type-only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | ✓ | v26.13.0 [VERIFIED: node --version] | — |
| pnpm | scripts | ✓ | 10.17.1 [VERIFIED: pnpm --version] | — |
| vitest | tests | ✓ | 5.1.0 | — |
| `@stryker-mutator/vitest-runner` | WX-05 | ✓ | 10.1.1 | — |
| PGlite / `node:sqlite` / Prisma engine | the two `EngineAgreement.test.ts` suites | ✓ (both projects' full runs green: 103 and 95 tests) | — | — |
| network | none (gate 14 is offline) | n/a | — | — |

**Missing dependencies with no fallback:** none.

## Validation Architecture

> `workflow.nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"` in `.planning/config.json` [VERIFIED: Read].

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest`; fast-check (existing property tests) |
| Config file | `vitest.config.ts` (root `projects: ["packages/*"]`), `packages/{core,predicate-sql,predicate-prisma}/vitest.config.ts`; project names `core`, `predicate-sql`, `predicate-prisma` |
| Quick run command | `pnpm exec vitest run --project predicate-sql packages/predicate-sql/test/CompileShell.test.ts`; `pnpm exec vitest run --project predicate-prisma packages/predicate-prisma/test/CompileShell.test.ts`; `pnpm exec vitest run --project core packages/core/test/CompilePredicate.test.ts` (each ≈ 0.3 s) |
| Full suite command | `pnpm exec vitest run --project predicate-sql`, `--project predicate-prisma`, `--project core`; `pnpm exec tsc -b tsconfig.json && pnpm exec tsc -p tsconfig.test.json`; then `pnpm check:pr < /dev/null` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-03 | every reachable refusal reason per dialect: error fields + counters | characterisation (green on base) | the two `CompileShell.test.ts` quick runs | ❌ Wave 0 |
| COMP-03 | compiled outputs per dialect (SQL text+params, Prisma where) + counters | characterisation | same | ❌ Wave 0 |
| COMP-03 / D-06 | one move per call; a defect counts neither; the returned Effect is reusable | characterisation | same | ❌ Wave 0 |
| D-02 | span tree: package span root, `toRenderable` child, nothing else | characterisation | same | ❌ Wave 0 |
| COMP-01 | `compilePredicate`: defaults (`Ascii`, 1000), overrides, `undefined` is the default, rules reach `toRenderable`, render runs only after success, no span, once per run | unit (core) | `vitest run --project core packages/core/test/CompilePredicate.test.ts` | ❌ Wave 0 (RED by import until the function exists) |
| COMP-02 | rules + renderer + `compiledTotal` stay in the packages; `[metric-table]`/budgets unchanged | gate | `node scripts/check-house-style.mjs` | ✅ |
| COMP-04 | overview names the exports; changesets for three packages | gate | `node scripts/check-api-surface.mjs` (count 935); changeset files present | ✅ |
| COMP-01..02 | scoped grep: the shell is gone from both packages | grep | `/usr/bin/grep -nE 'toRenderable\(|\?\? "Ascii"|DEFAULT_MAX_IN_VALUES|Metric\.update|tapError' packages/predicate-sql/src/index.ts packages/predicate-prisma/src/index.ts` → no output (comments naming `toRenderable` without a call are fine; `Metric.update` and `tapError` must be absent) | n/a |
| WX-01..04 | gates, ids, overview, banned constructs | gate | `pnpm check:pr < /dev/null`; `pnpm circular` | ✅ |
| WX-05 | Stryker scores (Q5 invocations) | mutation | the three Q5 commands (≈ 48 s total, alone) | base: Q5 |
| WX-06 | characterisation before change | ordering | commit order below | — |
| WX-07 | no break | n/a | patch/minor changesets only; no `upgrading.md` entry (nothing breaks) | — |

### Sampling Rate
- **Per task commit:** the quick-run command(s) of the touched package.
- **Per wave merge:** the three project runs, `tsc -b` + `tsc -p tsconfig.test.json`, `node scripts/check-house-style.mjs`, `pnpm circular`.
- **Phase gate:** `pnpm check:pr < /dev/null` green; `node scripts/check-api-surface.mjs` (935); `node scripts/check-package-install.mjs` (523 runtime exports); Stryker re-run with the Q5 invocations; `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict`; then `/gsd-verify-work`.

**Commit order (RED first):** (1) `52-mutation-base.json` alone (Q5 base; `unmeasured` both `CompileMetrics.ts`; `deletedRegion` for the two `index.ts`); (2) the two `CompileShell.test.ts` files (Appendix A/B, green on the base); (3) core: `compilePredicate` + `CompilePredicate.test.ts` (Appendix C, RED by import first); (4) `compileSql` converted, then (5) `compilePrismaWhere` converted (each: its package suite green, scoped grep clean); (6) records (ADR-QD-165 + `index.yaml`, CCR-QD-443, BEH-QD-596..600, INV-QD-349/350, traceability, `overview.md` rows and revision, three changesets); (7) close: `pnpm check:pr < /dev/null`, Stryker after, `52-mutation-after.json`, the compare.

### Wave 0 Gaps
- [ ] `packages/predicate-sql/test/CompileShell.test.ts` — Appendix A (COMP-03, D-02, D-06)
- [ ] `packages/predicate-prisma/test/CompileShell.test.ts` — Appendix B
- [ ] `packages/core/test/CompilePredicate.test.ts` — Appendix C (RED by import until `compilePredicate` exists)
- [ ] `52-mutation-base.json` — Q5 scores before any `src` edit

## Security Domain

### Applicable ASVS Categories (level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes (indirect) | the compile shell is what keeps an unrenderable predicate from reaching a query: refusal stays the only outcome for an unsafe column/value/size, and the shell now has one definition |
| V5 Input Validation | **yes (unchanged)** | `toRenderable` remains the only classifier (BEH-QD-271); `identifiers` default `"Ascii"` and `maxInValues` default 1000 are the validation defaults and move into one place with literal-row tests on both sides of each boundary (1000 compiles, 1001 refuses; `é` refuses under the default, compiles under `UnicodeBmp`) |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A refusal no longer counted, or counted twice, so an operator's refusal-rate signal hides an attack or a regression | Repudiation / Denial of service (observability) | `compilePredicate` has the only `tapError(refused)`; every reachable reason per dialect is a row asserting `{ compiled: 0, refused: 1 }`; "3 compiles and 2 refusals read 3/2"; Appendix C kills every counting mutant (core 0.9821) |
| An output change hidden by a characterisation that reads the code under change | Tampering | all expectations are literals written on the base; text/params/objects compared with `deepStrictEqual`; the existing hand-copied-rules parity property stays |
| A default changed silently (`identifiers`, `maxInValues`) widening what SQL accepts | Elevation of privilege | boundary rows through the public entry points (1000/1001; `é` under default vs `UnicodeBmp`), plus core's own default tests with `undefined` passed explicitly (the `exactOptionalPropertyTypes` `| undefined` path) and the three mutants that alter the defaults killed in core |
| A rule dropped in the move (`reservedColumns`, `finiteExclusion`, `negation`) making Prisma admit an `AND` column or an unguarded range | Tampering | Prisma rows for `ReservedColumn` (`AND`, `not`) and `NonFiniteColumn` (`score`); SQL rows showing `AND` compiles and `Gte` carries the finite guard; the existing engine-agreement suites (PGlite, `node:sqlite`, real Prisma engine) green with the proposal |
| A renderer defect counted as a successful compile (Prisma base) | Repudiation (observability) | `render` runs before `compiled` is counted; the throwing-render core test |
| A new public export undocumented, or an `exports`-map/`.d.ts` leak | Information disclosure (low) | gate 13 refuses until `overview.md` names the three; gate 14 packs the new function through the closed `exports` map (522 → 523); the packages' emitted `.d.ts` are byte-identical |
| A SQL `params` array shared across runs of one Effect value | Information disclosure / Tampering | allocated per run inside `render`; the reuse row asserts distinct arrays |

No ASVS finding at or above `security_block_on: "high"` is expected: no new input surface, dependency, I/O or runtime behaviour beyond the one Prisma counting correction.

## Sources

### Primary (HIGH confidence)
- This repository at `abf280a7` on `arch-wave-10`: `packages/core/src/{RenderablePredicate,Errors,Policy,PortDerivation,SinkReport,Walk,EvaluationMetrics}.ts`, `packages/predicate-sql/src/{index,CompileMetrics}.ts`, `packages/predicate-prisma/src/{index,CompileMetrics}.ts`, the two packages' `test/` directories, `packages/testing/src/{IsolatedMetrics,CollectingTracer}.ts`, `packages/core/test/helpers.ts`, `scripts/{check-house-style,check-api-surface,check-package-install,spec-revise}.mjs`, `stryker.{config,predicate-sql,predicate-prisma}.mjs`, `tsconfig.base.json`, `.changeset/config.json`, `spec/{overview.md,README.md,invariants.md,traceability.md}`, `spec/behaviors/{31-predicate-compilation,25-inspection}.md`, `spec/decisions/{054,079,123,164}-*.md` and `index.yaml`, `AGENTS.md`.
- Commands run this session: `tsc -b tsconfig.json` and `tsc -p tsconfig.test.json` (base and with the proposal); `vitest run --project predicate-sql` (103 tests), `--project predicate-prisma` (95), the differential and core tests (47, 21, 8); `node scripts/check-house-style.mjs`, `check-api-surface.mjs` (932 base; 3 drifts with the proposal), `check-package-install.mjs` (522 base, 523 with the proposal), `pnpm circular`, `pnpm lint`; `stryker run` ×3 at the base and ×3 with the proposal; a nesting-depth sweep through both packages; `.d.ts` diff of both packages. The proposal, the sketches and the Stryker JSON were kept under `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bf083921-e7cd-4930-bcad-a3ef483d2ac8/scratchpad/p52/` (`proposal.patch`, `CompileShell.sql.test.ts`, `CompileShell.prisma.test.ts`, `CompilePredicate.core.test.ts`, `*-base.json`, `*-after.json`); the appendices below reproduce the tests so nothing depends on that directory.

### Secondary (MEDIUM confidence)
- none

### Tertiary (LOW confidence)
- none. No web or Context7 lookup was needed: the phase touches no external API beyond installed `effect` 4.1.2, whose `Metric`/`Effect.map`/`tapError` behaviour was confirmed by the green runs above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nothing added; `effect/Metric` already in core.
- Architecture: HIGH — the exact code compiled, type-checked, and ran through all affected gates and both packages' complete suites.
- Pitfalls: HIGH — the counting order, `params` sharing and `exactOptionalPropertyTypes` were each hit or probed.

**Research date:** 2026-11-16
**Valid until:** 2026-12-16 (stable; re-run the Q5 base if `RenderablePredicate.ts` or either `index.ts` changes first)

---

## Appendix A: `packages/predicate-sql/test/CompileShell.test.ts` (green on the base, 47 tests; green with the proposal)

```typescript
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type * as Tracer from "effect/Tracer";
import type { Predicate, RenderRefusal } from "@qadi/core";
import { collectingTracer, isolatedMetrics } from "@qadi/testing";
import { compiledTotal } from "../src/CompileMetrics.ts";
import { compileSql, type CompileSqlOptions, type SqlDialect } from "../src/index.ts";

// Characterisation of `compileSql`'s shell, written on the phase base (D-08): the
// defaults, the refusals, the outputs, the counter and the span tree. Every
// expectation is a literal, never `toRenderable`'s answer, so it still means
// something after the shell moves into core.

const DIALECTS: ReadonlyArray<SqlDialect> = ["postgres", "mysql", "sqlite"];

const eq = (column: string, value: unknown): Predicate => ({ _tag: "Compare", column, op: "Eq", value });
const memberOf = (column: string, values: ReadonlyArray<unknown>): Predicate => ({
  _tag: "MemberOf",
  column,
  values,
});

interface RefusalRow {
  readonly name: string;
  readonly predicate: Predicate;
  readonly options: Omit<CompileSqlOptions, "dialect">;
  readonly refusal: RenderRefusal;
  readonly predicateTag: "Compare" | "MemberOf";
  readonly reason: string;
}

// RenderRefusal has six members; compileSql can reach four. `ReservedColumn`
// needs a non-empty `reservedColumns` and `NonFiniteColumn` needs
// `finiteExclusion: "Inexpressible"`, and SQL declares neither (see the rows below).
const REFUSALS: ReadonlyArray<RefusalRow> = [
  { name: "UnsafeColumn on a Compare", predicate: eq('x"y', 1), options: {}, refusal: "UnsafeColumn", predicateTag: "Compare", reason: `column 'x"y' is not a safe identifier` },
  { name: "UnsafeColumn on a MemberOf, non-ASCII under the default rule", predicate: memberOf("é", [1]), options: {}, refusal: "UnsafeColumn", predicateTag: "MemberOf", reason: "column 'é' is not a safe identifier" },
  { name: "UnsafeValue on a Compare", predicate: eq("x", { bad: 1 }), options: {}, refusal: "UnsafeValue", predicateTag: "Compare", reason: "value for column 'x' is not a safe query parameter" },
  { name: "UnsafeValue on a MemberOf", predicate: memberOf("x", [1, { bad: 1 }]), options: {}, refusal: "UnsafeValue", predicateTag: "MemberOf", reason: "a value for column 'x' is not a safe query parameter" },
  { name: "TooManyValues past an explicit maxInValues", predicate: memberOf("x", [1, 2, 3]), options: { maxInValues: 2 }, refusal: "TooManyValues", predicateTag: "MemberOf", reason: "3 values exceeds maxInValues (2)" },
  { name: "TooManyValues past the default maxInValues", predicate: memberOf("x", Array.from({ length: 1001 }, (_, i) => i)), options: {}, refusal: "TooManyValues", predicateTag: "MemberOf", reason: "1001 values exceeds maxInValues (1000)" },
  { name: "NullOnNonNullableColumn", predicate: eq("a", null), options: { nullable: new Set(["other"]) }, refusal: "NullOnNonNullableColumn", predicateTag: "Compare", reason: "column 'a' is declared NOT NULL; a null comparison is not renderable" },
  { name: "the leftmost refusal wins", predicate: { _tag: "And", predicates: [eq('x"y', 1), eq("x", { bad: 1 })] }, options: {}, refusal: "UnsafeColumn", predicateTag: "Compare", reason: `column 'x"y' is not a safe identifier` },
];

interface CompiledRow {
  readonly name: string;
  readonly predicate: Predicate;
  readonly options: Omit<CompileSqlOptions, "dialect">;
  readonly out: Readonly<Record<SqlDialect, { readonly text: string; readonly params: ReadonlyArray<unknown> }>>;
}

const COMPILED: ReadonlyArray<CompiledRow> = [
  {
    name: "a plain Compare",
    predicate: eq("tenantId", "t-1"),
    options: {},
    out: {
      postgres: { text: '"tenantId" = $1', params: ["t-1"] },
      mysql: { text: "`tenantId` = ?", params: ["t-1"] },
      sqlite: { text: '"tenantId" = ?', params: ["t-1"] },
    },
  },
  {
    name: "a Range carries the finite guard where the dialect needs it",
    predicate: { _tag: "Compare", column: "level", op: "Gte", value: 3 },
    options: {},
    out: {
      postgres: { text: '("level" >= $1 AND "level" - "level" = 0)', params: [3] },
      mysql: { text: "`level` >= ?", params: [3] },
      sqlite: { text: '("level" >= ? AND "level" - "level" = 0)', params: [3] },
    },
  },
  {
    name: "Negate over Neq on a nullable column: two-valued CASE WHEN, null admitted",
    predicate: { _tag: "Negate", predicate: { _tag: "Compare", column: "level", op: "Neq", value: 3 } },
    options: { nullable: new Set(["level"]) },
    out: {
      postgres: { text: 'CASE WHEN (("level" != $1 OR "level" IS NULL)) THEN FALSE ELSE TRUE END', params: [3] },
      mysql: { text: "CASE WHEN ((`level` != ? OR `level` IS NULL)) THEN FALSE ELSE TRUE END", params: [3] },
      sqlite: { text: 'CASE WHEN (("level" != ? OR "level" IS NULL)) THEN FALSE ELSE TRUE END', params: [3] },
    },
  },
  {
    name: "a column named like a Prisma reserved key is fine for SQL (ReservedColumn is unreachable here)",
    predicate: eq("AND", 1),
    options: {},
    out: {
      postgres: { text: '"AND" = $1', params: [1] },
      mysql: { text: "`AND` = ?", params: [1] },
      sqlite: { text: '"AND" = ?', params: [1] },
    },
  },
  {
    name: "identifiers: UnicodeBmp admits a non-ASCII column",
    predicate: eq("é", 1),
    options: { identifiers: "UnicodeBmp" },
    out: {
      postgres: { text: '"é" = $1', params: [1] },
      mysql: { text: "`é` = ?", params: [1] },
      sqlite: { text: '"é" = ?', params: [1] },
    },
  },
  {
    name: "exactly maxInValues (default 1000) members still compile",
    predicate: memberOf("x", Array.from({ length: 1000 }, (_, i) => i)),
    options: {},
    out: {
      postgres: { text: `"x" IN (${Array.from({ length: 1000 }, (_, i) => `$${i + 1}`).join(", ")})`, params: Array.from({ length: 1000 }, (_, i) => i) },
      mysql: { text: `\`x\` IN (${Array.from({ length: 1000 }, () => "?").join(", ")})`, params: Array.from({ length: 1000 }, (_, i) => i) },
      sqlite: { text: `"x" IN (${Array.from({ length: 1000 }, () => "?").join(", ")})`, params: Array.from({ length: 1000 }, (_, i) => i) },
    },
  },
];

const counts = Effect.gen(function* () {
  return {
    compiled: (yield* Metric.value(compiledTotal.compiled)).count,
    refused: (yield* Metric.value(compiledTotal.refused)).count,
  };
});

describe("compileSql — the compile shell (BEH-QD-596)", () => {
  for (const dialect of DIALECTS) {
    for (const row of REFUSALS) {
      it.effect(`${dialect}: ${row.name} refuses, moving refused once and compiled never`, () =>
        isolatedMetrics(
          Effect.gen(function* () {
            const result = yield* Effect.result(compileSql(row.predicate, { dialect, ...row.options }));
            assert.isTrue(Result.isFailure(result));
            if (Result.isSuccess(result)) return;
            assert.strictEqual(result.failure._tag, "PredicateNotRenderable");
            assert.strictEqual(result.failure.refusal, row.refusal);
            assert.strictEqual(result.failure.predicateTag, row.predicateTag);
            assert.strictEqual(result.failure.reason, row.reason);
            assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 1 });
          }),
        ));
    }
    for (const row of COMPILED) {
      it.effect(`${dialect}: ${row.name} compiles, moving compiled once and refused never`, () =>
        isolatedMetrics(
          Effect.gen(function* () {
            const out = yield* compileSql(row.predicate, { dialect, ...row.options });
            assert.deepStrictEqual(out, row.out[dialect]);
            assert.deepStrictEqual(yield* counts, { compiled: 1, refused: 0 });
          }),
        ));
    }
  }

  it.effect("one more than the default maxInValues refuses (the default is 1000, not looser)", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const failure = yield* Effect.flip(compileSql(memberOf("x", new Array(1001).fill(1)), { dialect: "postgres" }));
        assert.strictEqual(failure.refusal, "TooManyValues");
      }),
    ));

  it.effect("a defect inside classification counts neither outcome", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const hostile: Predicate = {
          _tag: "And",
          get predicates(): ReadonlyArray<Predicate> {
            throw new Error("boom");
          },
        };
        const exit = yield* Effect.exit(compileSql(hostile, { dialect: "postgres" }));
        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
        assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 0 });
      }),
    ));

  it.effect("each call moves the counter exactly once: 3 compiles and 2 refusals are 3 and 2", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        for (let i = 0; i < 3; i++) yield* compileSql(eq("a", i), { dialect: "mysql" });
        for (let i = 0; i < 2; i++) yield* Effect.flip(compileSql(eq("a", { bad: i }), { dialect: "mysql" }));
        assert.deepStrictEqual(yield* counts, { compiled: 3, refused: 2 });
      }),
    ));

  it.effect("the returned Effect is reusable: each run counts once and owns a fresh params array", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const program = compileSql(eq("a", 1), { dialect: "postgres" });
        const first = yield* program;
        const second = yield* program;
        assert.deepStrictEqual(first, { text: '"a" = $1', params: [1] });
        assert.deepStrictEqual(second, first);
        assert.notStrictEqual(second.params, first.params);
        assert.deepStrictEqual(yield* counts, { compiled: 2, refused: 0 });
      }),
    ));

  it.effect("the span tree is compileSql with toRenderable beneath it, and nothing else", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      yield* compileSql(eq("a", 1), { dialect: "postgres" });
      yield* Effect.flip(compileSql(eq("a", { bad: 1 }), { dialect: "postgres" }));
      assert.deepStrictEqual(
        spans.map((s) => s.name),
        [
          "qadi.predicateSql.compileSql",
          "qadi.predicate.toRenderable",
          "qadi.predicateSql.compileSql",
          "qadi.predicate.toRenderable",
        ],
      );
      const [root, child] = spans;
      assert.isTrue(Option.isNone(root?.parent ?? Option.none()));
      assert.strictEqual(Option.getOrUndefined(child?.parent ?? Option.none())?.spanId, root?.spanId);
    }).pipe(Effect.provide(collectingTracer(spans)), isolatedMetrics);
  });
});
```

## Appendix B: `packages/predicate-prisma/test/CompileShell.test.ts` (green on the base, 21 tests; green with the proposal)

```typescript
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type * as Tracer from "effect/Tracer";
import type { Predicate, RenderRefusal } from "@qadi/core";
import { collectingTracer, isolatedMetrics } from "@qadi/testing";
import { compiledTotal } from "../src/CompileMetrics.ts";
import { compilePrismaWhere, type CompilePrismaWhereOptions } from "../src/index.ts";
import { FIXTURE_FLOATING, FIXTURE_NULLABLE } from "./fixture.ts";

// Characterisation of `compilePrismaWhere`'s shell, written on the phase base
// (D-08). Every expectation is a literal, never `toRenderable`'s answer.

const eq = (column: string, value: unknown): Predicate => ({ _tag: "Compare", column, op: "Eq", value });
const memberOf = (column: string, values: ReadonlyArray<unknown>): Predicate => ({
  _tag: "MemberOf",
  column,
  values,
});

const compile = (predicate: Predicate, options: Partial<CompilePrismaWhereOptions> = {}) =>
  compilePrismaWhere(predicate, { nullable: FIXTURE_NULLABLE, floating: FIXTURE_FLOATING, ...options });

interface RefusalRow {
  readonly name: string;
  readonly predicate: Predicate;
  readonly options: Partial<CompilePrismaWhereOptions>;
  readonly refusal: RenderRefusal;
  readonly predicateTag: "Compare" | "MemberOf";
  readonly reason: string;
}

// All six `RenderRefusal` members are reachable through this dialect.
const REFUSALS: ReadonlyArray<RefusalRow> = [
  { name: "UnsafeColumn", predicate: eq('x"y', 1), options: {}, refusal: "UnsafeColumn", predicateTag: "Compare", reason: `column 'x"y' is not a safe identifier` },
  { name: "ReservedColumn on a Compare", predicate: eq("AND", 1), options: {}, refusal: "ReservedColumn", predicateTag: "Compare", reason: "column 'AND' is not a safe identifier" },
  { name: "ReservedColumn on a MemberOf", predicate: memberOf("not", [1]), options: {}, refusal: "ReservedColumn", predicateTag: "MemberOf", reason: "column 'not' is not a safe identifier" },
  { name: "UnsafeValue on a Compare", predicate: eq("x", { bad: 1 }), options: {}, refusal: "UnsafeValue", predicateTag: "Compare", reason: "value for column 'x' is not a safe query parameter" },
  { name: "UnsafeValue on a MemberOf", predicate: memberOf("x", [1, { bad: 1 }]), options: {}, refusal: "UnsafeValue", predicateTag: "MemberOf", reason: "a value for column 'x' is not a safe query parameter" },
  { name: "TooManyValues past an explicit maxInValues", predicate: memberOf("x", [1, 2, 3]), options: { maxInValues: 2 }, refusal: "TooManyValues", predicateTag: "MemberOf", reason: "3 values exceeds maxInValues (2)" },
  { name: "TooManyValues past the default maxInValues", predicate: memberOf("x", Array.from({ length: 1001 }, (_, i) => i)), options: {}, refusal: "TooManyValues", predicateTag: "MemberOf", reason: "1001 values exceeds maxInValues (1000)" },
  { name: "NullOnNonNullableColumn", predicate: eq("tenantId", null), options: {}, refusal: "NullOnNonNullableColumn", predicateTag: "Compare", reason: "column 'tenantId' is declared NOT NULL; a null comparison is not renderable" },
  { name: "NonFiniteColumn", predicate: { _tag: "Compare", column: "score", op: "Gte", value: 3 }, options: {}, refusal: "NonFiniteColumn", predicateTag: "Compare", reason: "column 'score' may hold a non-finite number, and this target cannot exclude one from a range" },
  { name: "the leftmost refusal wins", predicate: { _tag: "And", predicates: [eq('x"y', 1), eq("AND", 1)] }, options: {}, refusal: "UnsafeColumn", predicateTag: "Compare", reason: `column 'x"y' is not a safe identifier` },
];

interface CompiledRow {
  readonly name: string;
  readonly predicate: Predicate;
  readonly options: Partial<CompilePrismaWhereOptions>;
  readonly out: Record<string, unknown>;
}

const COMPILED: ReadonlyArray<CompiledRow> = [
  { name: "a plain Compare", predicate: eq("tenantId", "t-1"), options: {}, out: { tenantId: "t-1" } },
  { name: "a Range on a non-floating column", predicate: { _tag: "Compare", column: "level", op: "Gte", value: 3 }, options: {}, out: { level: { gte: 3 } } },
  {
    name: "Negate over Neq on a nullable column: three-valued NOT, null guarded",
    predicate: { _tag: "Negate", predicate: { _tag: "Compare", column: "level", op: "Neq", value: 3 } },
    options: {},
    out: { NOT: { OR: [{ level: { not: 3 } }, { level: null }] } },
  },
  { name: "identifiers: UnicodeBmp admits a non-ASCII column", predicate: eq("é", 1), options: { identifiers: "UnicodeBmp" }, out: { é: 1 } },
  { name: "True is Prisma's vacuous identity", predicate: { _tag: "True" }, options: {}, out: { AND: [] } },
  {
    name: "a vacuous And member is folded away (the renderer's own rule, not the shell's)",
    predicate: { _tag: "And", predicates: [{ _tag: "True" }, eq("tenantId", "t")] },
    options: {},
    out: { AND: [{ tenantId: "t" }] },
  },
  {
    name: "exactly maxInValues (default 1000) members still compile",
    predicate: memberOf("x", Array.from({ length: 1000 }, (_, i) => i)),
    options: {},
    out: { x: { in: Array.from({ length: 1000 }, (_, i) => i) } },
  },
];

const counts = Effect.gen(function* () {
  return {
    compiled: (yield* Metric.value(compiledTotal.compiled)).count,
    refused: (yield* Metric.value(compiledTotal.refused)).count,
  };
});

describe("compilePrismaWhere — the compile shell (BEH-QD-596)", () => {
  for (const row of REFUSALS) {
    it.effect(`${row.name} refuses, moving refused once and compiled never`, () =>
      isolatedMetrics(
        Effect.gen(function* () {
          const result = yield* Effect.result(compile(row.predicate, row.options));
          assert.isTrue(Result.isFailure(result));
          if (Result.isSuccess(result)) return;
          assert.strictEqual(result.failure._tag, "PredicateNotRenderable");
          assert.strictEqual(result.failure.refusal, row.refusal);
          assert.strictEqual(result.failure.predicateTag, row.predicateTag);
          assert.strictEqual(result.failure.reason, row.reason);
          assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 1 });
        }),
      ));
  }
  for (const row of COMPILED) {
    it.effect(`${row.name} compiles, moving compiled once and refused never`, () =>
      isolatedMetrics(
        Effect.gen(function* () {
          assert.deepStrictEqual(yield* compile(row.predicate, row.options), row.out);
          assert.deepStrictEqual(yield* counts, { compiled: 1, refused: 0 });
        }),
      ));
  }

  it.effect("a defect inside classification counts neither outcome", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const hostile: Predicate = {
          _tag: "And",
          get predicates(): ReadonlyArray<Predicate> {
            throw new Error("boom");
          },
        };
        const exit = yield* Effect.exit(compile(hostile));
        assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
        assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 0 });
      }),
    ));

  it.effect("each call moves the counter exactly once: 3 compiles and 2 refusals are 3 and 2", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        for (let i = 0; i < 3; i++) yield* compile(eq("tenantId", i));
        for (let i = 0; i < 2; i++) yield* Effect.flip(compile(eq("tenantId", { bad: i })));
        assert.deepStrictEqual(yield* counts, { compiled: 3, refused: 2 });
      }),
    ));

  it.effect("the returned Effect is reusable: each run counts once", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const program = compile(eq("tenantId", 1));
        assert.deepStrictEqual(yield* program, { tenantId: 1 });
        assert.deepStrictEqual(yield* program, { tenantId: 1 });
        assert.deepStrictEqual(yield* counts, { compiled: 2, refused: 0 });
      }),
    ));

  it.effect("the span tree is compilePrismaWhere with toRenderable beneath it, and nothing else", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      yield* compile(eq("tenantId", 1));
      yield* Effect.flip(compile(eq("tenantId", { bad: 1 })));
      assert.deepStrictEqual(
        spans.map((s) => s.name),
        [
          "qadi.predicatePrisma.compilePrismaWhere",
          "qadi.predicate.toRenderable",
          "qadi.predicatePrisma.compilePrismaWhere",
          "qadi.predicate.toRenderable",
        ],
      );
      const [root, child] = spans;
      assert.isTrue(Option.isNone(root?.parent ?? Option.none()));
      assert.strictEqual(Option.getOrUndefined(child?.parent ?? Option.none())?.spanId, root?.spanId);
    }).pipe(Effect.provide(collectingTracer(spans)), isolatedMetrics);
  });
});
```

## Appendix C: `packages/core/test/CompilePredicate.test.ts` (8 tests; RED by import on the base, green with the proposal; kills every mutant in `compilePredicate`)

```typescript
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import type * as Tracer from "effect/Tracer";
import type { Predicate } from "../src/Predicate.ts";
import { compilePredicate } from "../src/RenderablePredicate.ts";
import type { CompileOutcomes, RenderableNode } from "../src/RenderablePredicate.ts";
import { collectingTracer, isolatedMetrics } from "./helpers.ts";

// `compilePredicate` is core's compile shell (BEH-QD-596). The dialect packages pin
// it through their own public entry points; these tests pin it where Stryker scores
// it, with a stand-in renderer and two scratch counters. The ids are not `qadi_*`: a
// test never declares one (`[metric-declaration]`, ADR-QD-123).
const outcomes: CompileOutcomes = {
  compiled: Metric.counter("test_compile_shell_compiled"),
  refused: Metric.counter("test_compile_shell_refused"),
};
const counts = Effect.gen(function* () {
  return {
    compiled: (yield* Metric.value(outcomes.compiled)).count,
    refused: (yield* Metric.value(outcomes.refused)).count,
  };
});

const RULES = {
  reservedColumns: new Set<string>(),
  nullability: { _tag: "Unknown" },
  negation: "TwoValued",
  finiteness: { _tag: "Unknown" },
  finiteExclusion: "Expressible",
} as const;

const eq = (column: string, value: unknown): Predicate => ({ _tag: "Compare", column, op: "Eq", value });
const memberOf = (column: string, values: ReadonlyArray<unknown>): Predicate => ({ _tag: "MemberOf", column, values });

describe("compilePredicate — the compile shell (BEH-QD-596)", () => {
  it.effect("hands the classified tree to render and returns what render returns, counting compiled once", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const seen: Array<RenderableNode> = [];
        const marker = { rendered: true };
        const out = yield* compilePredicate(eq("a", 1), {
          rules: RULES,
          outcomes,
          render: (node) => {
            seen.push(node);
            return marker;
          },
        });
        assert.strictEqual(out, marker);
        assert.deepStrictEqual(seen, [{ _tag: "Equals", column: "a", negated: false, value: 1, nullGuard: "None" }]);
        assert.deepStrictEqual(yield* counts, { compiled: 1, refused: 0 });
      }),
    ));

  it.effect("a refusal counts refused once, never calls render and never counts compiled", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        let rendered = 0;
        const failure = yield* Effect.flip(
          compilePredicate(eq("a", { bad: 1 }), { rules: RULES, outcomes, render: () => (rendered += 1) }),
        );
        assert.strictEqual(failure._tag, "PredicateNotRenderable");
        assert.strictEqual(failure.refusal, "UnsafeValue");
        assert.strictEqual(rendered, 0);
        assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 1 });
      }),
    ));

  it.effect("identifiers defaults to Ascii and is overridable", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const render = () => "ok";
        const refusal = yield* Effect.flip(compilePredicate(eq("é", 1), { rules: RULES, outcomes, render }));
        assert.strictEqual(refusal.refusal, "UnsafeColumn");
        assert.strictEqual(
          yield* compilePredicate(eq("é", 1), { rules: RULES, outcomes, render, identifiers: "UnicodeBmp" }),
          "ok",
        );
        // an explicit `undefined` is the default, not a hole (exactOptionalPropertyTypes' `| undefined`)
        const again = yield* Effect.flip(
          compilePredicate(eq("é", 1), { rules: RULES, outcomes, render, identifiers: undefined }),
        );
        assert.strictEqual(again.refusal, "UnsafeColumn");
      }),
    ));

  it.effect("maxInValues defaults to 1000 and is overridable", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const render = () => "ok";
        const members = (n: number) => memberOf("a", Array.from({ length: n }, (_, i) => i));
        assert.strictEqual(yield* compilePredicate(members(1000), { rules: RULES, outcomes, render }), "ok");
        const refusal = yield* Effect.flip(compilePredicate(members(1001), { rules: RULES, outcomes, render }));
        assert.strictEqual(refusal.reason, "1001 values exceeds maxInValues (1000)");
        assert.strictEqual(
          yield* compilePredicate(members(1001), { rules: RULES, outcomes, render, maxInValues: 1001 }),
          "ok",
        );
        const tight = yield* Effect.flip(compilePredicate(members(3), { rules: RULES, outcomes, render, maxInValues: 2 }));
        assert.strictEqual(tight.reason, "3 values exceeds maxInValues (2)");
        const again = yield* Effect.flip(
          compilePredicate(members(1001), { rules: RULES, outcomes, render, maxInValues: undefined }),
        );
        assert.strictEqual(again.refusal, "TooManyValues");
      }),
    ));

  it.effect("the dialect's rules reach toRenderable unchanged", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const refusal = yield* Effect.flip(
          compilePredicate(eq("not", 1), {
            rules: { ...RULES, reservedColumns: new Set(["not"]) },
            outcomes,
            render: () => "ok",
          }),
        );
        assert.strictEqual(refusal.refusal, "ReservedColumn");
      }),
    ));

  it.effect("a defect in classification or in render counts neither outcome", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const hostile: Predicate = {
          _tag: "And",
          get predicates(): ReadonlyArray<Predicate> {
            throw new Error("boom");
          },
        };
        const inClassify = yield* Effect.exit(compilePredicate(hostile, { rules: RULES, outcomes, render: () => "ok" }));
        assert.isTrue(Exit.isFailure(inClassify) && Cause.hasDies(inClassify.cause));
        const inRender = yield* Effect.exit(
          compilePredicate(eq("a", 1), {
            rules: RULES,
            outcomes,
            render: () => {
              throw new Error("boom");
            },
          }),
        );
        assert.isTrue(Exit.isFailure(inRender) && Cause.hasDies(inRender.cause));
        assert.deepStrictEqual(yield* counts, { compiled: 0, refused: 0 });
      }),
    ));

  it.effect("adds no span: only toRenderable's, under the caller's", () => {
    const spans: Array<Tracer.Span> = [];
    return Effect.gen(function* () {
      yield* compilePredicate(eq("a", 1), { rules: RULES, outcomes, render: () => "ok" });
      assert.deepStrictEqual(
        spans.map((s) => s.name),
        ["qadi.predicate.toRenderable"],
      );
    }).pipe(Effect.provide(collectingTracer(spans)), isolatedMetrics);
  });

  it.effect("each run of the returned Effect counts once and calls render once", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        let rendered = 0;
        const program = compilePredicate(eq("a", 1), { rules: RULES, outcomes, render: () => (rendered += 1) });
        assert.strictEqual(rendered, 0);
        assert.strictEqual(yield* program, 1);
        assert.strictEqual(yield* program, 2);
        assert.deepStrictEqual(yield* counts, { compiled: 2, refused: 0 });
      }),
    ));
});
```
