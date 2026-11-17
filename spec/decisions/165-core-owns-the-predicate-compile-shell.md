# ADR-QD-165 — Core owns the predicate compile shell

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-165                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-16                                     |
> | Status         | Accepted — keeps ADR-QD-054, ADR-QD-079, ADR-QD-123 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-16): CompilePredicateOptions.rules refuses identifiers and maxInValues by type (ARCH-99, CCR-QD-443 review iteration 1 WR-01)<br>1.0 (2026-11-16): Initial release (ARCH-99, CCR-QD-443) |

---

## Context

`compileSql` (`@qadi/predicate-sql`) and `compilePrismaWhere` (`@qadi/predicate-prisma`) each wrote the same shell around
their dialect's work: the two defaults (`identifiers ?? "Ascii"` and `maxInValues ?? DEFAULT_MAX_IN_VALUES`), a call to
core's `toRenderable`, a `tapError` that counted `refused` on the dialect's own counter, the render, and a count of
`compiled`. Only the rules a dialect hands `toRenderable` and the renderer it runs differ; the shell around them was
copied, and a third dialect would have copied it a third time.

The two copies had already disagreed on one thing. SQL counted `compiled` after its render; Prisma counted it before.
So a Prisma compile whose renderer died (a `Negate` chain a few thousand deep overflowing `renderNode`'s stack) counted
`compiled: 1`, and the SQL one counted nothing. Nothing tied the two orders together, so nothing noticed.

## Decision

`@qadi/core` exports `compilePredicate(predicate, { rules, identifiers?, maxInValues?, render, outcomes })` beside
`toRenderable` in `RenderablePredicate.ts`, with its two types, `CompilePredicateOptions<A>` and `CompileOutcomes`
([BEH-QD-596](../behaviors/31-predicate-compilation.md#beh-qd-596-a-compile-is-a-dialects-rules-and-renderer-inside-one-core-shell)).

```ts
export interface CompileOutcomes {
  readonly compiled: Metric.Counter<number>;
  readonly refused: Metric.Counter<number>;
}
export interface CompilePredicateOptions<A> {
  readonly rules: Omit<RenderRules, "identifiers" | "maxInValues"> & {
    readonly identifiers?: never;
    readonly maxInValues?: never;
  };
  readonly identifiers?: IdentifierRule | undefined;
  readonly maxInValues?: number | undefined;
  readonly render: (node: RenderableNode) => A;
  readonly outcomes: CompileOutcomes;
}
export const compilePredicate: <A>(
  predicate: Predicate,
  options: CompilePredicateOptions<A>,
) => Effect.Effect<A, PredicateNotRenderable>;
```

`rules` carries neither defaulted field: a value holding `identifiers` or `maxInValues`, a full `RenderRules`
included, does not type-check, so a dialect's own bound cannot be silently replaced by the default.

The order is fixed: apply the defaults, classify with `toRenderable`, count `refused` on a refusal, render, count
`compiled`. Each dialect keeps its own rules, its own renderer and its own counter, and passes the three in; a third
dialect is a renderer and its rules ([BEH-QD-271](../behaviors/31-predicate-compilation.md#beh-qd-271-a-predicate-is-classified-once-in-core-into-a-renderable-tree)),
and no copy of the shell.

## Why a plain function, and no span

`compilePredicate` is a plain function returning an `Effect`, not an `Effect.fn`, so it opens no span. The caller's
`Effect.fn` span (`qadi.predicateSql.compileSql`, `qadi.predicatePrisma.compilePrismaWhere`) stays the root and
`toRenderable`'s `qadi.predicate.toRenderable` stays its only child, so every trace tree is the one it was
([BEH-QD-599](../behaviors/31-predicate-compilation.md#beh-qd-599-the-compile-shell-adds-no-span-of-its-own)). It adds no
`Effect.fnUntraced` either, so `UNTRACED_BUDGET` is unchanged: a span would have been a second span per compile, a cost
nobody asked for, and an untraced function would have taken a call site off the budget's list.

## Why each dialect keeps its own counter

ADR-QD-123 says a metric is declared once, at module scope, with its id on the declaration, and read through its export.
A counter factory in core taking the id would move each declaration away from its literal `qadi_…` id, to a call whose
argument is the id, and put the declaring package's metric in core's file. It was rejected. Core counts against the two
series it is handed and owns no compile metric id; each dialect's `CompileMetrics.ts` keeps its own
`Metric.counter("qadi_…")` and hands its tagged series over as `CompileOutcomes`
([BEH-QD-600](../behaviors/31-predicate-compilation.md#beh-qd-600-each-dialect-declares-its-own-compile-counter-once-and-hands-it-to-the-shell)).
`spec/behaviors/25-inspection.md`'s metric table is unchanged.

## What stays

- **ADR-QD-054** (a companion package compiles a dialect; core depends on neither): `compilePredicate` names no dialect
  and imports neither package.
- **ADR-QD-079** (renderability is a core rule): core still prints no dialect text. It takes a renderer and returns what
  the renderer returns; the one thing it now owns that it did not is the order of the shell around it.

## Prisma counts compiled after the render

Before this change a Prisma compile counted `compiled` before it rendered, so a renderer defect (a `Negate` chain a few
thousand deep overflowing `renderNode`) still counted `compiled: 1`. Now neither dialect counts a defect: `refused`
moves exactly once per `PredicateNotRenderable`, `compiled` exactly once after a successful render, and a defect in
classification or render moves neither
([BEH-QD-597](../behaviors/31-predicate-compilation.md#beh-qd-597-each-compile-moves-its-dialects-counter-exactly-once-after-the-render),
[INV-QD-349](../invariants.md#inv-qd-349-one-compile-shell-and-each-compile-moves-its-dialects-counter-exactly-once)).
It changes no output and no public type, so it is a correction, not a break.

It is not pinned by a Prisma test, because the depth at which the stack overflows depends on the machine and on Node's
frame size; `packages/core/test/CompilePredicate.test.ts`'s throwing `render` pins the rule where the shell now lives,
and both dialects' `CompileShell.test.ts` pin that a defect in classification counts neither outcome.

## Mutation

The base, on the unchanged tree with `stryker.config.mjs`, `stryker.predicate-sql.mjs` and `stryker.predicate-prisma.mjs`
run per file, recorded in `52-mutation-base.json`:

| File | Score | Killed / survived / not covered |
|---|---|---|
| `packages/core/src/RenderablePredicate.ts` | 0.9815 | 159 / 3 / 0 |
| `packages/predicate-sql/src/index.ts` | 0.9559 | 65 / 2 / 1 |
| `packages/predicate-prisma/src/index.ts` | 0.9262 | 113 / 4 / 5 |

Both `CompileMetrics.ts` files are unmeasured: every mutant is Ignored under `ignoreStatic` (ADR-QD-076), which sees
module-scope declarations only.

The reading is stated before the after-run, and it is not "no file's score may fall". Each dialect's `index.ts` loses the
shell's four mutants that the base killed (the `identifiers` default's operator and `"Ascii"` literal, the `maxInValues`
default's operator, the `tapError` arrow), and those mutants now sit in core, each killed by `CompilePredicate.test.ts`.
So a dialect's `index.ts` score may fall, by that arithmetic and no other, when its survivor set is textually identical
to the base's and the fall is those killed mutants moving to core; `RenderablePredicate.ts` may not fall; and any new
survivor in any of the three fails the phase. The close's numbers are recorded in `52-mutation-after.json`, not here.

## Consequences

- **Three new public `@qadi/core` names**, `compilePredicate`, `CompilePredicateOptions` and `CompileOutcomes`: a minor,
  and each is a row in `spec/overview.md`.
- **The dialect packages' public types and outputs are unchanged**: `lib/index.d.ts` of both is byte-identical to the
  base's, and each package's changeset is a patch.
- **The shell has one definition.** A dialect is rules, a renderer and a counter; the defaults, the classification, the
  order of the counts and the rule that a defect counts neither are core's, in
  [INV-QD-349](../invariants.md#inv-qd-349-one-compile-shell-and-each-compile-moves-its-dialects-counter-exactly-once).
- **The one behaviour correction is stated, not hidden**: Prisma's `compiled` moves after the render, in this record, in
  BEH-QD-597 and in the Prisma changeset.
