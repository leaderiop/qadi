# 31 — Predicate Compilation

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-31                                    |
> | Revision       | 1.4                                            |
> | Effective Date | 2026-09-07                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.4 (2026-09-07): BEH-QD-239 and BEH-QD-242 corrected — both encoded the belief that a vacuous `{OR: []}`/`{AND: []}` behaves the same nested inside `AND`/`OR`/`NOT` as it does at the top of the query; per real Prisma engine behavior it does not (Prisma issues #17367, #21856), and `@qadi/predicate-prisma`'s `renderNode` nested it verbatim, an audit's Critical finding (C1, issue 34). `renderNode` now constant-folds every `And`/`Or` child so a vacuous identity is never left nested, and `BEH-QD-242`'s agreement property is checked against a second, engine-accurate test reader in addition to the original JS-semantics one, since the original alone shares the same wrong belief and cannot see the difference (CCR-QD-111)<br>1.3 (2026-09-07): BEH-QD-236's `compileSql` signature corrected — shown with an optional `options` and `dialect` required only inside it, but the real export requires `options: CompileSqlOptions` with `dialect` required inside that; spec text reconciled to the actual, simpler signature rather than the API being widened to match the doc<br>1.2 (2026-09-06): BEH-QD-238's allowlist corrected — `Date` compiled to a query that disagreed with `evaluatePredicate` (INV-QD-047/048), an audit finding, not a design choice; both compilers now refuse it. BEH-QD-258 added: a column colliding with the target's own syntax (a SQL quote character, or one of Prisma's `AND`/`OR`/`NOT`) refuses rather than escaping or compiling to something the column name did not mean (CCR-QD-106)<br>1.1 (2026-08-25): BEH-QD-244 — NULL handling fixed in both compilers after manual verification against real PostgreSQL, MySQL, SQLite and a SQLite-backed Prisma client found the original translation wrong; the numeric-string coercion limitation recorded as an accepted caveat (INV-QD-047, INV-QD-048, CCR-QD-081)<br>1.0 (2026-08-25): Initial release (CCR-QD-079) |

_Previous: [30 — Port Calls](./30-port-calls.md)_

---

What `@qadi/predicate-sql` and `@qadi/predicate-prisma` do with the `Predicate`
[16 — Predicate Output](./16-predicates.md) already produces. See
[ADR-QD-054](../decisions/054-a-companion-package-may-compile-a-dialect.md).

## BEH-QD-236: A companion package compiles what `toPredicate` emits; core stays dialect-free

```ts
export type SqlDialect = "postgres" | "mysql" | "sqlite";

export interface SqlFragment {
  readonly text: string;
  readonly params: ReadonlyArray<unknown>;
}

export interface CompileSqlOptions {
  readonly dialect: SqlDialect;
  readonly maxInValues?: number;
}

export const compileSql: (
  predicate: Predicate,
  options: CompileSqlOptions,
) => Effect.Effect<SqlFragment, PredicateNotRenderable>;

export const compilePrismaWhere: (
  predicate: Predicate,
) => Effect.Effect<Record<string, unknown>, PredicateNotRenderable>;
```

```
REQUIREMENT: @qadi/core MUST gain no dependency, direct or peer, on either
             companion package or on anything either package depends on.
REQUIREMENT: Neither package MAY be required to obtain a `Predicate` — every
             `toPredicate` caller keeps working with neither installed.
```

`Predicate` itself is unchanged: the same seven-tag AST
[BEH-QD-121](./16-predicates.md#beh-qd-121-a-predicate-is-abstract-and-qadi-owns-no-dialect)
shipped. Each package declares its own unprefixed `PredicateNotRenderable`,
matching `PolicyNotTranslatable`'s shape — not shared through `@qadi/core`,
because `@qadi/core` has no reason to know either error exists.

An optional, module-scope `Metric.counter` in each package's `index.ts`
mirrors the counter `Predicate.ts` already declares for `toPredicate` itself:
tagged by outcome (`compiled` / `refused`), declared once, never re-declared
inside `compileSql`/`compilePrismaWhere`'s body. This is not decorative —
Effect's `Metric` registry keys on `type:id:description` and memoizes per
metric *object*; a counter declared inside the function body either fails to
register the way the module-scope form does, or creates an unscoped object
per call nothing can aggregate. It gives an operator compile volume and
refusal rate with no `DecisionSink`, no `Timeline`, and no trace channel —
see [BEH-QD-121](./16-predicates.md) on why row-level compilation sits
outside that pipeline entirely.

## BEH-QD-237: `SqlDialect` is a closed union, built in full

```
REQUIREMENT: `SqlDialect` MUST ship as `"postgres" | "mysql" | "sqlite"` at v1,
             not a single dialect with the rest deferred. A future dialect
             widens this union; it is never added as a sibling type.
```

Dialect differences here are a data table — identifier quoting, placeholder
syntax, `IN` grammar — around one shared recursive renderer, not three
separate implementations. Building one dialect and deferring the rest would
not save the structural work; it would only defer the syntax table, which is
the cheap part.

## BEH-QD-238: An unsafe value refuses rather than binds blind

```
REQUIREMENT: A `Compare`/`MemberOf` value or member that is not on the safe
             allowlist (`string | number | boolean | null`) MUST fail
             `PredicateNotRenderable`. It MUST NOT be stringified into the
             fragment or `WhereInput`.
```

A `Predicate`'s `value`/`values` are `unknown`. Approximating an unsafe value
into a query fragment — coercing an object, a function, a Symbol into a bound
parameter — is [ADR-QD-024](../decisions/024-predicate-output.md)'s rejected
failure mode one interpreter deeper: "nothing is approximated" does not stop
applying once the AST becomes a string.

`Date` was on this allowlist and no longer is: `evaluatePredicate`'s `compare`
(`@qadi/core`'s `Predicate.ts`) requires `typeof value === "number"` for
`Gte`/`Lt`, so a `Date` value there is always `false` in the reference
evaluator, while a real SQL engine's `>=`/`<` or Prisma's `{gte: date}`
performs a genuine date comparison against the row — an
[INV-QD-047](../invariants.md#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits)/[INV-QD-048](../invariants.md#inv-qd-048-a-compiled-prisma-whereinput-admits-exactly-the-rows-the-predicate-admits)
disagreement in the direction that matters, admitting rows the reference
evaluator would deny. `Eq`'s `===` disagrees from the other side: two
distinct `Date` instances holding the same instant are never `===`, so a
`Date` `Eq` is reference-evaluator-false for any row a caller would actually
construct, while the compiled query matches correctly. Both compilers now
refuse a `Date`-valued `Compare`/`MemberOf` rather than compile a comparison
the reference evaluator does not support — the same "refuse rather than
approximate" answer this requirement already gives every other unsafe value.

## BEH-QD-258: A `Compare`/`MemberOf` column refuses rather than colliding with the target's own syntax

```
REQUIREMENT: A `Compare`/`MemberOf` column that would change what the
             compiled output means, rather than merely fail to render, MUST
             refuse with `PredicateNotRenderable` naming the column.
```

`Predicate.column` is a plain `string` on an AST that crosses a trust
boundary (AGENTS.md §7) with no schema either compiler can validate it
against. Each dialect's own syntax gives this a different shape:
`compileSql` interpolates the column as SQL identifier text, so a column
carrying the target dialect's own quote character (`"`, `` ` ``) or falling
outside `[A-Za-z_][A-Za-z0-9_]*` refuses rather than being escaped —
escaping is a policy this requirement does not adopt, since the one place
`renderNode` builds SQL text from caller data is exactly the place a
caller-controlled escape could still be gotten wrong. `compilePrismaWhere`
takes no SQL text at all — its hazard is `AND`/`OR`/`NOT`, Prisma's own
combinator keys at every `WhereInput` level: a column literally named one
changes what the compiled object means (`{NOT: "t-1"}` negates rather than
comparing) instead of failing to compile, so those three names refuse there
even though they are syntactically ordinary identifiers a SQL dialect would
accept without complaint.

## BEH-QD-239: An empty `MemberOf` is `False`, never `IN ()`

```
REQUIREMENT: `MemberOf` with an empty `values` array MUST compile to a
             predicate that admits no rows (`"FALSE"` for SQL, `{OR:[]}` for
             Prisma), never to `IN ()` or an equivalent invalid or
             ambiguous fragment.
REQUIREMENT: For `compilePrismaWhere`, this `{OR: []}` identity MUST NOT
             appear nested inside a compiled `AND`/`OR`/`NOT` — only ever at
             the top of the emitted `WhereInput`, or after `compilePrismaWhere`
             has folded whatever contains it down to the identity itself.
```

`[].includes(x)` is always `false`; a query engine's `IN ()` is invalid syntax
in some dialects and a vacuous truth in others. Compiling to the engine's own
vacuous-false identity is the correct translation, not a degenerate case
requiring a caller-side guard.

**The second requirement is not implied by the first, and this document
originally missed that (C1, issue 34, CCR-QD-111).** `evaluatePredicate`'s
own `.every`/`.some` semantics treat a nested `{OR: []}` exactly like a
top-level one — no distinction to miss — but Prisma's real query engine does
not: a vacuous `{AND: []}`/`{OR: []}` reached below the top level of the
query is silently dropped from an `AND`/`OR` list, or fails to be negated
under `NOT` (Prisma issues #17367, #21856). An empty `MemberOf` nested
inside `allOf([hasResourceAttribute("role", inArray([])), tenantEq])` —
meant to deny role-less users unconditionally — is exactly this shape:
compiled as `{AND: [{OR: []}, {tenantId: ...}]}` before this fix, a real
Prisma engine drops the `{OR: []}` member and admits every tenant-matching
row regardless of role. `compilePrismaWhere`'s `renderNode` now
constant-folds every `And`/`Or` child so this identity is never left
nested — see `@qadi/predicate-prisma`'s `src/index.ts` and
[BEH-QD-242](#beh-qd-242-the-compiled-prisma-whereinput-agrees-with-the-reference-interpreter).

## BEH-QD-240: `maxInValues` bounds an unbounded `IN`

```
REQUIREMENT: `compileSql` MUST refuse a `MemberOf` whose `values` exceed
             `maxInValues` (default 1000) with `PredicateNotRenderable`,
             rather than render an unbounded `IN (...)`.
```

An unbounded `IN (...)` is a resource-exhaustion vector handed straight to the
database — refused at compile time, not rendered and left for the engine to
choke on. `compilePrismaWhere` carries no such option: an `in` clause there is
Prisma's own array literal, and bounding it is a caller concern the same way
bounding any other array argument to Prisma already is.

## BEH-QD-241: The compiled SQL fragment agrees with the reference interpreter

> **Invariant:** [INV-QD-047](../invariants.md#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits)

```
REQUIREMENT: For every `Predicate` P that `compileSql` renders, and every row
             R, interpreting the rendered `SqlFragment` against R MUST equal
             `evaluatePredicate(P, R)`.
```

Mirrors [BEH-QD-127](./16-predicates.md#beh-qd-127-the-two-interpreters-agree)
one interpreter further from the AST: `evaluatePredicate` is already the
reference semantics `toPredicate`'s output is checked against, and this
property checks the compiled SQL text against that same reference rather than
against `toPredicate`'s input a second time.

## BEH-QD-242: The compiled Prisma `WhereInput` agrees with the reference interpreter

> **Invariant:** [INV-QD-048](../invariants.md#inv-qd-048-a-compiled-prisma-whereinput-admits-exactly-the-rows-the-predicate-admits)

```
REQUIREMENT: For every `Predicate` P that `compilePrismaWhere` renders, and
             every row R, interpreting the rendered `WhereInput` against R
             the way Prisma's real query engine does MUST equal
             `evaluatePredicate(P, R)`.
```

The same property as [BEH-QD-241](#beh-qd-241-the-compiled-sql-fragment-agrees-with-the-reference-interpreter),
against the other grammar. There is no `Predicate` shape that renders to one
target and not the other — both grammars are equally expressive over this
AST, so the two properties differ only in which compiler and which test-only
interpreter they run.

**"Interpreting... the way Prisma's real query engine does" is deliberate
wording, corrected from a bare "interpreting" (C1, issue 34, CCR-QD-111).**
The obvious test-only interpreter for this grammar — recursive JS
`.every`/`.some`, `packages/predicate-prisma/test/matchesPrismaWhere.ts` —
is exactly `evaluatePredicate`'s own semantics one grammar over, and a
compiler that shares its author's wrong belief about the grammar will agree
with that interpreter regardless: `renderNode` once nested a vacuous
`{OR: []}`/`{AND: []}` inside a compiled `AND`/`OR`/`NOT` verbatim, which
`matchesPrismaWhere` reads exactly as designed but Prisma's real engine
silently drops or fails to negate (Prisma issues #17367, #21856) — this
property, checked only against `matchesPrismaWhere`, passed against that
defect the whole time. `Agreement.test.ts` now also checks
`packages/predicate-prisma/test/matchesPrismaWhereEngine.ts`, a second
reader modeling Prisma's actual nested-empty-array stripping instead of
`evaluatePredicate`'s. `renderNode` now guarantees a vacuous identity is
never nested — see [BEH-QD-239](#beh-qd-239-an-empty-memberof-is-false-never-in) —
so the two readers can only ever disagree on a shape this compiler no
longer produces, and agreement between them is itself the regression
signal this requirement now depends on.

## BEH-QD-243: Worked example

```typescript
import * as Effect from "effect/Effect";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  allOf,
  currentSubjectLayer,
  eq,
  hasResourceAttribute,
  makeSubject,
  subject,
  toPredicate,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import { compileSql } from "@qadi/predicate-sql";

// Tenancy, compiled once and pushed into the query — nothing here mentions
// a query until `compileSql` is called.
const visible = allOf([hasResourceAttribute("tenantId", eq(subject("tenantId")))]);

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-1", attributes: { tenantId: "t-1" } })),
  AttributeResolverNone,
  DecisionHistoryUnknown,
);

const fragment = toPredicate(visible).pipe(
  Effect.provide(services),
  Effect.flatMap((predicate) => compileSql(predicate, { dialect: "postgres" })),
);

// { text: '"tenantId" = $1', params: ["t-1"] } — a caller's query builder
// interpolates `text` and binds `params`; neither is ever string-concatenated
// with a value from the predicate.
```

## BEH-QD-244: A compiled fragment handles NULL the way `evaluatePredicate` does

```
REQUIREMENT: `Eq`/`Neq` against a `null` value MUST render `IS [NOT] NULL`,
             never `= NULL`/`!= NULL` — SQL's three-valued logic treats a
             NULL-valued side of `=`/`!=` as unknown, and a query's `WHERE`
             excludes unknown the same as it excludes false, so `= NULL`
             never matches any row, not even one where the column genuinely
             `IS NULL`.
REQUIREMENT: `Neq` against a non-null value, and `MemberOf` whose column may
             be NULL, MUST admit a NULL-valued row — `null !== value` and
             `![null].includes(row)` are both true in `evaluatePredicate` for
             any non-null `value` — which a bare `!=`/`NOT IN` alone would
             silently exclude.
REQUIREMENT: A `null` member of `MemberOf`'s `values` MUST be rendered as its
             own `IS NULL`/`{column: null}`, not left inside the `IN`/`in`
             list — an `IN` clause containing NULL never matches through that
             branch even when the column genuinely is NULL, and Prisma's own
             `in` filter refuses a `null` element outright as invalid input
             rather than silently mishandling it.
```

This was a real defect in both compilers, caught by running compiled output
against real engines and comparing the result set to `evaluatePredicate`'s —
not designed in from the start. Neither `@qadi/predicate-sql`'s differential
property test nor `@qadi/predicate-prisma`'s could have found it on their
own: both test-only interpreters re-implement `evaluatePredicate`'s own
`===`/`!==` in JS, so they agreed with the original, wrong translation rather
than catching it. Verified by hand against PostgreSQL 16, MySQL 8 and SQLite
(`node:sqlite`), and against a real, SQLite-backed `@prisma/client` for the
Prisma grammar — not merely reasoned about.

**A known, accepted limitation, not fixed here: a numeric value stored as
text compares differently under each engine's own coercion than under
`evaluatePredicate`'s strict `typeof` check.** `evaluatePredicate`'s
`Gte`/`Lt` require *both* sides to be JavaScript numbers — a text column
holding `"3"` never admits, regardless of what the string parses to
([BEH-QD-123](./16-predicates.md#beh-qd-123-untranslatable-fails-nothing-is-approximated)
names this the same discriminator for the evaluator/matcher pair). Verified
by hand: **PostgreSQL refuses the query outright** (`operator does not
exist: text >= integer`) — a loud failure, not a silent one. **SQLite and
MySQL both silently coerce and admit the row** — `"3" >= 2` reads as true
under each engine's own type-comparison rules, which is a real widening
`compileSql` does not currently prevent. There is no portable, dialect-free
SQL that reproduces `typeof`-strictness across all three engines without a
schema the compiler does not have, so this is recorded as a caveat rather
than patched: a `Gte`/`Lt` predicate is only as trustworthy as the caller's
own column types.

---

_Previous: [30 — Port Calls](./30-port-calls.md)_
