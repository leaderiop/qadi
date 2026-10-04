# ADR-QD-077 — Renderability is a core rule

> **Document Control**
>
> | Property       | Value                                                  |
> | -------------- | ------------------------------------------------------ |
> | Document ID    | QADI-ADR-077                                           |
> | Revision       | 1.0                                                    |
> | Effective Date | 2026-10-04                                             |
> | Status         | Accepted — amends ADR-QD-054                           |
> | Author         | Qadi Engineering                                       |
> | Classification | Architecture Decision Record                           |
> | Change History | 1.0 (2026-10-04): Initial release (CCR-QD-153, CCR-QD-154) |

---

## Context

[ADR-QD-054](./054-a-companion-package-may-compile-a-dialect.md) let a companion package compile a dialect,
and said each one declares its own `PredicateNotRenderable`, "not shared via `@qadi/core`, because
`@qadi/core` has no reason to know this error exists." It also said a companion "never sees a schema."
Two dialect packages later, both statements have a measured cost.

- **The leaf rules are duplicated, and the duplication lags.** `isSafeValue` exists twice (a type guard in
  `@qadi/predicate-sql`, a boolean in `@qadi/predicate-prisma`), with a third copy of the finite-bound half
  inside `evaluatePredicate`. CCR-QD-120 was that duplication lagging once: the SQL copy admitted `NaN` for
  a release. The `Compare` arms run line for line in parallel: unsafe column, unsafe value, `Gte`/`Lt` on a
  non-number, `null` per operator, `Neq` admitting NULL, `MemberOf` splitting out `null`, empty `MemberOf`
  being false. They are properties of `evaluatePredicate`'s semantics, not of SQL or Prisma.
- **The two compile sets disagree and the documents say they agree.** The identifier rule differs (an
  ASCII allowlist in SQL, a 13-key blocklist in Prisma), Prisma has no `maxInValues`, so `first name`,
  `a.b`, `gte`, `NOT` and a 1001-member `MemberOf` compile in one package and not the other, against
  BEH-QD-238 and BEH-QD-242.
- **Prisma's `Negate` silently drops rows.** `{NOT: {level: {gte: 3}}}` renders `WHERE (NOT level >= ?)`,
  which excludes NULL rows `evaluatePredicate` admits: 127 of 3000 random predicates mismatched on real
  Prisma 7.10 over SQLite, every one under a `Negate`, none an over-admission. SQL avoided this with
  `CASE WHEN` (commit `40941b6`); the fix was never carried over.
- **A schema-blind Prisma renderer cannot emit a NULL-correct leaf valid on every column.** Prisma refuses
  any filter that mentions `null` on a required field, so `Neq "t-1"` on a NOT NULL column fails at query
  time. Fixing the `Negate` defect and this one needs one schema fact per column: is it nullable.
- **Every claim of agreement was checked against JavaScript re-implementations** of the same belief
  (`sqlInterpreter.ts`, `matchesPrismaWhere.ts`). Real engines found each defect above.

Ticket 95 (`.scratch/`, gitignored, never normative) recorded the shared `_tag` as intentional and commit
`6e7c5f9` documented it. The decision it documented is ADR-QD-054's paragraph above, so reversing it needs
this ADR (ADR-QD-017: a changed decision is recorded, not drifted into).

## Decision

**(a) Core owns the dialect-free leaf rules and a closed, pre-validated renderable tree.**
`@qadi/core` gains `PredicateLiteral.ts` (`SafeLiteral`, `isSafeLiteral`, `isRangeBound`, `IdentifierRule`,
`isRenderableIdentifier`) and `RenderablePredicate.ts` (`toRenderable`, `RenderableNode`, `RenderRules`,
`ColumnNullability`, `NullGuard`, `Negation`, `DEFAULT_MAX_IN_VALUES`), beside `evaluatePredicate`.
`toRenderable` classifies a `Predicate` once, applies the declared rules and either returns a
`RenderableNode` or refuses. Core still emits no dialect text and acquires no dependency: the new modules
import `effect/*` and other core modules only. `evaluatePredicate`'s `Gte`/`Lt` arms and the classifier call
the same `isRangeBound`, so the rule cannot lag.

**(b) One `PredicateNotRenderable`, in core, a member of `QadiError` with code `ACL018`.** It is a
`Data.TaggedError` (it crosses no codec; `SCHEMA_ERROR_BUDGET` is unchanged), carrying
`predicateTag: "Compare" | "MemberOf"`, a closed `refusal: RenderRefusal`
(`"UnsafeColumn" | "ReservedColumn" | "UnsafeValue" | "TooManyValues" | "NullOnNonNullableColumn"`) and the
existing `reason` text. Both packages re-export it. This reverses ADR-QD-054's "each package declares its
own" and the ticket 95 rationale. Widening `QadiError` is a closed-union change: a consumer's exhaustive
match stops compiling, which is the intended failure mode.

**(c) The identifier rule is core vocabulary, applied per renderer.** `IdentifierRule = "Ascii" |
"UnicodeBmp"`. `"Ascii"` is today's regex and the default for both packages. `"UnicodeBmp"` accepts
`/^[\p{L}_][\p{L}\p{N}_]*$/u` restricted to code points at or below U+FFFF (MySQL refuses supplementary-plane
identifiers); quoting such a name cannot break out of `"…"` or `` `…` `` because neither delimiter is a
letter or digit. A renderer may add a reserved-column set (`reservedColumns`): Prisma passes its 13
operator keys. The reserved set is a target-syntax hazard, the regex a text-injection hazard; for each rule
the two compile sets now differ only by the declared reserved set.

**(d) A nullability declaration is accepted, and can only narrow or refuse.**
`ColumnNullability = { _tag: "Unknown" } | { _tag: "Declared"; nullable: ReadonlySet<string> }`.
This narrows ADR-QD-054's "never sees a schema": it is the minimum schema fact, and the package still never
opens a connection or reads a schema itself (`nullableFieldsOf` reads a structural `PrismaModelLike`, not
`@prisma/client`). Core never folds anything on the strength of a declaration. A wrong declaration can only
under-admit (declared NOT NULL but nullable: no guards, and Kleene monotonicity gives a subset) or fail
loudly (declared nullable but required: Prisma refuses the `null` mention). An `IsNull` leaf on a column
declared NOT NULL **refuses** (`NullOnNonNullableColumn`) rather than folding to a constant, because a
constant could over-admit under a `Negate` if the declaration were wrong.

**(e) `maxInValues` applies to both packages.** Core owns the bound (`DEFAULT_MAX_IN_VALUES = 1000`); both
packages expose `maxInValues?`. Prisma gains a `TooManyValues` refusal (breaking). An unbounded `in` is the
same resource-exhaustion vector whichever grammar carries it.

**(f) The SQLite dialect binds booleans as `1`/`0`.** Neither Node SQLite driver (`node:sqlite`,
`better-sqlite3`) can bind a JavaScript boolean. This is a dialect syntax-table entry, the same kind as
`quote` and `placeholder`. Postgres and MySQL are unchanged.

## Alternatives rejected

- **Keep two classes, with a neutral refusal record mapped in each package (D-03-a option 1).** Preserves a
  known collision at the price of a mapping layer.
- **Per-dialect identifier policy with corrected docs (D-03-b option 1).** Cheapest, but a third dialect
  re-derives its own rule and the compile sets keep differing.
- **Treat every column as nullable, or every column as required (D-03-e options 1 and 2).** The first leaves
  Prisma refusing `Neq` on required columns; the second under-admits on every nullable column.
- **Interim refusal of every `Negate` over a nullable leaf (D-03-c option 3).** A large functional
  regression, worse than the fail-closed defect it replaces.
- **Fix N2 here (type-mismatched literals over-admit on real engines).** A schema-blind compiler cannot know a
  column's type; BEH-QD-244's caveat is widened and pinned by a test instead. A follow-up could extend
  `ColumnNullability` into per-column type facts.

## Consequences

- `@qadi/core` still has **no database dependency** (BEH-QD-236's REQUIREMENT stands, reworded). All engine
  dependencies (`@electric-sql/pglite`, `better-sqlite3`, `@prisma/adapter-better-sqlite3`) are
  devDependencies of the two packages and never reach a tarball.
- Real-engine agreement properties (PGlite for PostgreSQL, `node:sqlite` for SQLite, Prisma Client over
  SQLite) replace the JS readers as the check on INV-QD-047/048. MySQL is covered structurally: its text is the
  SQLite text modulo quote characters.
- `compilePrismaWhere` becomes two-argument: `options.nullable` is required. This is breaking for
  `@qadi/predicate-prisma` (minor in 0.x, stated in the changeset), as are the new refusals.
- Evidence: the 127/3000 `Negate` mismatches and 0 over-admissions on real Prisma 7.10/SQLite, the
  required-column refusals (153 of 1500), 13/3000 type-mismatch over-admissions per SQL engine, and the
  sqlite boolean bind failures in both drivers, all reproduced against the repository's own compiler source.
- Accepted limitation, unchanged in kind: a literal whose JS type differs from the column's type can admit
  rows the reference denies on a coercing engine. See BEH-QD-244.
