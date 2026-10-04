# 31 — Predicate Compilation

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-31                                    |
> | Revision       | 1.7                                            |
> | Effective Date | 2026-10-04                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.7 (2026-10-04): Dialect-free leaf rules move beside `evaluatePredicate` (ADR-QD-077, CCR-QD-154). BEH-QD-236 now says `@qadi/core` declares the one `PredicateNotRenderable` (reversing the per-package declaration and ticket 95) and shows the options both packages take; BEH-QD-238, BEH-QD-240 and BEH-QD-258 state the shared rules once (`isSafeLiteral`, `maxInValues` for both packages, `IdentifierRule`) and BEH-QD-238/242 replace the false claim that the two packages "agree on which predicates compile at all" with the exact difference, which is the renderer-declared reserved columns; BEH-QD-241/242 name real engines (PGlite, `node:sqlite`, Prisma over SQLite) as the check and record that the JavaScript readers are retired; BEH-QD-244 widens the accepted type-coercion limitation to `Eq`/`Neq`/`MemberOf` (N2), records SQLite boolean binding as `1`/`0` and the two-valued-`NOT` lie-safety rule; BEH-QD-264/265 added (classification once, in core; a nullability declaration can only narrow or refuse)<br>1.6 (2026-10-04): BEH-QD-244 gains a fourth REQUIREMENT and `compilePrismaWhere` gains a required `options.nullable` — a compiled Prisma `Negate` over a leaf on a nullable column dropped the NULL rows `evaluatePredicate` admits (`NOT UNKNOWN` is `UNKNOWN`), and a filter mentioning `null` on a required column is refused by Prisma at query time. Found by running 3000 random predicates through a real Prisma 7.10 client over SQLite: 127 result-set mismatches, every one under a `Negate`, none an over-admission. The leaf is now null-guarded by polarity (CCR-QD-153, ADR-QD-077)<br>1.5 (2026-09-08): BEH-QD-238's allowlist corrected again — the `number` branch is *finite* numbers, in both compilers. `@qadi/predicate-sql`'s `isSafeValue` admitted `NaN`/`±Infinity`, and its only exclusion was a `Gte`/`Lt`-specific guard, so a `NaN`-valued `Eq`/`Neq`/`MemberOf` bound `NaN` as a real parameter — and PostgreSQL's `NaN = NaN` is TRUE where `evaluatePredicate`'s `===` is false for every row (INV-QD-047). `@qadi/predicate-prisma` already refused all three; the two compilers now share one allowlist across all four `CompareOp`s, and a `NaN`-valued `Gte`/`Lt` refuses where it used to render `FALSE` (issue #65, CCR-QD-120)<br>1.4 (2026-09-07): BEH-QD-239 and BEH-QD-242 corrected — both encoded the belief that a vacuous `{OR: []}`/`{AND: []}` behaves the same nested inside `AND`/`OR`/`NOT` as it does at the top of the query; per real Prisma engine behavior it does not (Prisma issues #17367, #21856), and `@qadi/predicate-prisma`'s `renderNode` nested it verbatim, an audit's Critical finding (C1, issue 34). `renderNode` now constant-folds every `And`/`Or` child so a vacuous identity is never left nested, and `BEH-QD-242`'s agreement property is checked against a second, engine-accurate test reader in addition to the original JS-semantics one, since the original alone shares the same wrong belief and cannot see the difference (CCR-QD-111)<br>1.3 (2026-09-07): BEH-QD-236's `compileSql` signature corrected — shown with an optional `options` and `dialect` required only inside it, but the real export requires `options: CompileSqlOptions` with `dialect` required inside that; spec text reconciled to the actual, simpler signature rather than the API being widened to match the doc<br>1.2 (2026-09-06): BEH-QD-238's allowlist corrected — `Date` compiled to a query that disagreed with `evaluatePredicate` (INV-QD-047/048), an audit finding, not a design choice; both compilers now refuse it. BEH-QD-258 added: a column colliding with the target's own syntax (a SQL quote character, or one of Prisma's `AND`/`OR`/`NOT`) refuses rather than escaping or compiling to something the column name did not mean (CCR-QD-106)<br>1.1 (2026-08-25): BEH-QD-244 — NULL handling fixed in both compilers after manual verification against real PostgreSQL, MySQL, SQLite and a SQLite-backed Prisma client found the original translation wrong; the numeric-string coercion limitation recorded as an accepted caveat (INV-QD-047, INV-QD-048, CCR-QD-081)<br>1.0 (2026-08-25): Initial release (CCR-QD-079) |

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
  readonly nullable?: ReadonlySet<string>;
  readonly identifiers?: IdentifierRule;
}

export const compileSql: (
  predicate: Predicate,
  options: CompileSqlOptions,
) => Effect.Effect<SqlFragment, PredicateNotRenderable>;

export interface CompilePrismaWhereOptions {
  readonly nullable: ReadonlySet<string>;
  readonly maxInValues?: number;
  readonly identifiers?: IdentifierRule;
}

export interface PrismaFieldLike {
  readonly name: string;
  readonly isRequired: boolean;
  readonly kind: string;
}

export interface PrismaModelLike {
  readonly fields: ReadonlyArray<PrismaFieldLike>;
}

export const nullableFieldsOf: (model: PrismaModelLike) => ReadonlySet<string>;

export const compilePrismaWhere: (
  predicate: Predicate,
  options: CompilePrismaWhereOptions,
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
shipped. `@qadi/core` declares the one `PredicateNotRenderable`, matching
`PolicyNotTranslatable`'s shape, and both packages re-export it
([ADR-QD-077](../decisions/077-renderability-is-a-core-rule.md), reversing the
earlier "each package declares its own" and the shared-`_tag` rationale of ticket
95). Core still emits no dialect text and gains no dependency: the REQUIREMENT
above stands, and the new core modules import only `effect/*` and other core
modules.

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
             allowlist (`string | finite number | boolean | null`) MUST fail
             `PredicateNotRenderable`. It MUST NOT be stringified into the
             fragment or `WhereInput`. Both compilers MUST apply the same
             allowlist, for every `CompareOp`: `@qadi/core`'s `isSafeLiteral`,
             which both reach through `toRenderable`.
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

**A non-finite number is off the allowlist for the same reason, and the two
compilers now agree that it is.** `NaN`, `Infinity` and `-Infinity` all
satisfy `typeof value === "number"`. `@qadi/predicate-prisma` has excluded
all three at its `isSafeValue` gate since that gate was written;
`@qadi/predicate-sql` did not, and carried instead a `Gte`/`Lt`-specific
guard that excluded only `NaN`, and only for those two operators — so a
`Compare` with op `Eq`/`Neq`, or a `MemberOf`, against `NaN` reached
`params.push` and bound `NaN` as a real query parameter. PostgreSQL documents
`NaN = NaN` as **true**, unlike IEEE 754 and unlike `evaluatePredicate`'s
`===`, which is false for every row: an
[INV-QD-047](../invariants.md#inv-qd-047-a-compiled-sql-fragment-admits-exactly-the-rows-the-predicate-admits)
disagreement in the admit-more direction. Both compilers now refuse all three
values on all four `CompareOp`s.

One consequence is visible to a caller and is deliberate: `@qadi/predicate-sql`
previously rendered `FALSE` for a `NaN`-valued `Gte`/`Lt` and now refuses it.
`FALSE` was correct and more precise, but it was correct for two operators out
of four, and a compiler that refuses a value under `Eq` while quietly folding
it under `Gte` is two definitions of "safe value" in one file.

**The allowlist is now one definition, and the two compile sets differ by
exactly one declared thing.** Until ADR-QD-077 each package kept its own copy of
`isSafeValue`, which is how CCR-QD-120 happened (the copies lagged). It is
`@qadi/core`'s `isSafeLiteral` now, beside `evaluatePredicate`, and the
`Gte`/`Lt` bound rule (`isRangeBound`) is called by `evaluatePredicate` and by the
classifier alike. This section used to end "the dialect packages now agree on
which predicates compile at all", and that was false: the identifier rule differed
(an ASCII allowlist in one package, a 13-key blocklist in the other) and only SQL
had `maxInValues`, so `first name`, `a.b`, `gte`, `NOT` and a 1001-member
`MemberOf` each compiled in one package and not the other (CCR-QD-154). For each
`IdentifierRule` and each `maxInValues`, `compileSql` and `compilePrismaWhere`
now refuse the same predicates, **except** that `compilePrismaWhere` additionally
refuses Prisma's 13 reserved keys, which is the renderer's own vocabulary and the
only `RenderRules` field the two packages set differently (`reservedColumns`).
Each package's refusal-parity property asserts it compiles exactly when
`toRenderable` does under its own rules.

## BEH-QD-258: A `Compare`/`MemberOf` column refuses rather than colliding with the target's own syntax

```
REQUIREMENT: A `Compare`/`MemberOf` column that would change what the
             compiled output means, rather than merely fail to render, MUST
             refuse with `PredicateNotRenderable` naming the column.
```

The identifier rule is `@qadi/core`'s `IdentifierRule` (`"Ascii"`, the default for
both packages, is `[A-Za-z_][A-Za-z0-9_]*`; `"UnicodeBmp"` is letters, digits and
`_` of any script restricted to U+FFFF and below, opt-in through `identifiers`),
plus the renderer's own *reserved* set (`RenderRules.reservedColumns`): the regex
guards against text injection, the reserved set against a name the target gives a
meaning. Both are core vocabulary applied per renderer
([ADR-QD-077](../decisions/077-renderability-is-a-core-rule.md)).

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
REQUIREMENT: `compileSql` and `compilePrismaWhere` MUST refuse a `MemberOf`
             whose `values` exceed `maxInValues` (default 1000,
             `DEFAULT_MAX_IN_VALUES`) with `PredicateNotRenderable`
             (`refusal: "TooManyValues"`), rather than render an unbounded
             `IN (...)`/`in`.
```

An unbounded `IN (...)` is a resource-exhaustion vector handed straight to the
database — refused at compile time, not rendered and left for the engine to
choke on. `compilePrismaWhere` used to carry no such option, on the argument that
an `in` clause there is Prisma's own array literal and bounding it is a caller
concern. That was the same vector handed to the same database through another
grammar, and it made the two compile sets differ for no reason a caller could
name; the bound is core's now (`RenderRules.maxInValues`) and both packages take
`maxInValues?` (ADR-QD-077). It is a breaking change for `@qadi/predicate-prisma`.

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

**The interpreter is a real engine.** The property is checked against
PostgreSQL (PGlite, WASM) and SQLite (`node:sqlite`) over a 48-row table, 300
generated predicates per engine, rather than against a JavaScript reader of the
grammar `compileSql` emits (`sqlInterpreter.ts`, retired in ADR-QD-077): that
reader shared its author's belief and agreed with the original NULL defect and the
`NaN` one, both of which a real engine found. MySQL has no embeddable Node engine,
so its text is checked structurally — equal to SQLite's modulo identifier quote
characters, with equal `params` — and the golden fixtures cover the rest. The
generators are type-consistent with the table; a literal whose type differs from
its column's is the accepted limitation of BEH-QD-244.

## BEH-QD-242: The compiled Prisma `WhereInput` agrees with the reference interpreter

> **Invariant:** [INV-QD-048](../invariants.md#inv-qd-048-a-compiled-prisma-whereinput-admits-exactly-the-rows-the-predicate-admits)

```
REQUIREMENT: For every `Predicate` P that `compilePrismaWhere` renders, and
             every row R, interpreting the rendered `WhereInput` against R
             the way Prisma's real query engine does MUST equal
             `evaluatePredicate(P, R)`.
```

The same property as [BEH-QD-241](#beh-qd-241-the-compiled-sql-fragment-agrees-with-the-reference-interpreter),
against the other grammar. Both grammars are equally expressive over this AST,
and apart from `compilePrismaWhere`'s reserved columns (BEH-QD-238) no `Predicate`
renders to one target and not the other, so the two properties differ only in
which compiler and which engine they run. This section used to say "there is no
`Predicate` shape that renders to one target and not the other", which was false
before ADR-QD-077 (identifier rule, `maxInValues`).

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
defect the whole time. `Agreement.test.ts` then also checked
`packages/predicate-prisma/test/matchesPrismaWhereEngine.ts`, a second
reader modeling Prisma's actual nested-empty-array stripping instead of
`evaluatePredicate`'s. `renderNode` now guarantees a vacuous identity is
never nested — see [BEH-QD-239](#beh-qd-239-an-empty-memberof-is-false-never-in).

**Both readers are models, and the check is now a real engine
(ADR-QD-077).** A model shares its author's belief, and a third defect proved it:
neither reader treated `NOT` as three-valued, so neither could see a plain
`{NOT: ...}` drop NULL rows (BEH-QD-244). `EngineAgreement.test.ts` runs the
compiled `WhereInput` through Prisma Client 7.10 over an in-memory SQLite database
(`@prisma/adapter-better-sqlite3`) and compares row sets with
`evaluatePredicate`: exact agreement under the true nullability declaration; under
a wrong one, a subset of the reference's rows or a loud Prisma refusal, never an
over-admission; the vacuous-identity shapes of BEH-QD-239; and the NULL repros.
Both JavaScript readers are retired. `matchesPrismaWhereEngine`'s fate was decided
by measurement rather than taste: `pnpm exec stryker run stryker.predicate-prisma.mjs`
with and without the tests that use it kills the identical 107 of 173 mutants (the
per-mutant statuses are equal), so the engine oracle and the goldens kill everything
the model killed, and a model of Prisma that shares this repository's beliefs adds
nothing a real Prisma does not.

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
REQUIREMENT: A `Negate` over a leaf on a nullable column MUST admit a
             NULL-valued row exactly when `evaluatePredicate` does, and a
             compiled `WhereInput` MUST NOT mention `null` for a column the
             caller declared NOT NULL (`CompilePrismaWhereOptions.nullable`).
             A null comparison on such a column MUST refuse with
             `PredicateNotRenderable`; a `null` member of its `MemberOf` is
             dropped.
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

**A known, accepted limitation, not fixed here: a literal whose JavaScript type
differs from its column's type compares under the engine's own coercion, not
`evaluatePredicate`'s strict `===`/`typeof`.** The `Gte`/`Lt` text-column case
below is one direction; `Eq`/`Neq`/`MemberOf` are the other (N2, ADR-QD-077): run
against real engines, a string literal `"3"` against an `INTEGER` column matched
`level = 3` on both PostgreSQL (PGlite) and SQLite (`node:sqlite`) — 13 of 3000
random predicates per dialect, every one of that shape — where
`evaluatePredicate`'s `3 === "3"` is false, and a boolean literal against an
`INTEGER` column is refused outright by PostgreSQL. With type-consistent literals
the same engines agreed on 12 000 compiled queries with no mismatch and no error.
`EngineAgreement.test.ts`'s S4 pins the divergence as characterization, so a
change in either engine's behavior surfaces as a failure that prompts a spec
update instead of silent drift. A schema-blind compiler cannot close it; a
follow-up could extend `ColumnNullability` into per-column type facts so
`Eq "3"` on a declared-integer column refuses.

**SQLite binds a boolean as `1`/`0`.** `SqlSafeValue` includes `boolean`, but
neither Node SQLite driver can bind one (`node:sqlite`: "Provided value cannot be
bound to SQLite parameter"; `better-sqlite3`: "SQLite3 can only bind numbers,
strings, bigints, buffers, and null"). SQLite stores a boolean as 1/0, so
`compileSql`'s sqlite dialect renders `"sealed" = ?` with `1` or `0` in `params`,
a dialect syntax-table entry like quoting and placeholders. PostgreSQL and MySQL
keep the boolean itself.

**A nullability declaration can only narrow or refuse, and the rule is a property
of the target's `NOT`** (BEH-QD-265). The two-valued case is subtle and a real
engine found it: with a column declared NOT NULL that actually holds NULL, an
unguarded `Neq` (or `MemberOf` with a `null` member) under an odd number of
`Negate`s over-admits in `compileSql`, because `CASE WHEN` collapses UNKNOWN to
FALSE — so a two-valued renderer keeps `OR col IS NULL` at negative polarity even
on a declared NOT NULL column, and drops it only where UNKNOWN is excluded.

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

**The fourth requirement was found the same way, a third time.** Prisma renders
`{NOT: {level: {gte: 3}}}` as `WHERE (NOT level >= ?)`, and SQL's `NOT UNKNOWN`
is `UNKNOWN`, which `WHERE` excludes — so a NULL-valued row, which
`evaluatePredicate`'s two-valued `!` admits, silently went missing under any
`Negate`. A real Prisma 7.10 client over SQLite returned only `level=1` for
rows `level ∈ {null, 1, 5}`; across 3000 random predicates there were 127
mismatches, all under a `Negate`, and none an over-admission (Kleene's logic is
monotone, so replacing FALSE with UNKNOWN can only lose rows — the defect
fails closed). `@qadi/predicate-sql` had avoided it with `CASE WHEN` since
CCR-QD-081; the fix was never carried over. A `WhereInput` cannot say
`CASE WHEN`, so each leaf under an odd number of `Negate`s on a nullable column
is made definite instead: `{NOT: {level: {gte: 3, not: null}}}`. The converse
hazard is Prisma's own validator: any filter that mentions `null` on a required
field is refused (``Argument `tenantId` is missing.``; 153 of 1500 queries), so
`Neq "t-1"` on a NOT NULL column cannot render the NULL-admitting `OR` that a
nullable one needs. No renderer that cannot see the schema can emit one leaf
valid on both, which is why a nullability declaration is an input
([ADR-QD-077](../decisions/077-renderability-is-a-core-rule.md)). A wrong
declaration can only under-admit or fail loudly, never admit a row the
predicate denies.

## BEH-QD-264: A predicate is classified once, in core, into a renderable tree

```
REQUIREMENT: `@qadi/core`'s `toRenderable(predicate, rules)` MUST turn a
             `Predicate` into a `RenderableNode` or fail `PredicateNotRenderable`,
             and MUST be the only place that decides what is safe to render:
             which values are safe literals, which columns pass the
             `IdentifierRule` and the renderer's `reservedColumns`, how large a
             `MemberOf` may be, that `Gte`/`Lt` against a non-number is a
             constant false, and what `Compare` means against NULL.
REQUIREMENT: `RenderableNode` MUST be a closed union (`Constant`, `IsNull`,
             `Equals`, `Range`, `OneOf`, `All`, `Any`, `Not`), and
             `toRenderable` MUST NOT fold: it preserves the AST's structure.
REQUIREMENT: Refusals MUST be reported leftmost-first, in this order for a leaf:
             `UnsafeColumn`, `ReservedColumn`, `UnsafeValue`, and for a
             `MemberOf` the empty list (false) and `TooManyValues` before
             `UnsafeValue`.
REQUIREMENT: In two-valued logic a `RenderableNode`, with every `NullGuard`
             applied literally, MUST equal `evaluatePredicate` on every row
             whose columns are all present (INV-QD-058).
```

```ts
export const toRenderable: (
  predicate: Predicate,
  rules: RenderRules,
) => Effect.Effect<RenderableNode, PredicateNotRenderable>;
```

`@qadi/predicate-sql` and `@qadi/predicate-prisma` match on `RenderableNode` and
emit syntax; they decide nothing about NULLs, numbers or safety. Prisma keeps the
one concern only it has — folding a vacuous `{AND: []}`/`{OR: []}`, a workaround for
engine bugs (BEH-QD-239) — and a third dialect is a renderer and nothing more. A
semantic fix such as CCR-QD-120 lands once. `RenderRules` carries the identifier
rule, `reservedColumns`, `maxInValues`, the nullability declaration and
`negation: "TwoValued" | "ThreeValued"`.

## BEH-QD-265: A nullability declaration can only narrow or refuse

```
REQUIREMENT: `ColumnNullability` is `Unknown` (every column may hold NULL; the
             output is what it was before declarations existed) or `Declared`
             with the set of nullable columns. Core MUST NOT fold anything on
             the strength of a declaration.
REQUIREMENT: A null comparison (`Eq`/`Neq` against `null`, or a `MemberOf` of
             only `null`) on a column declared NOT NULL MUST refuse with
             `refusal: "NullOnNonNullableColumn"`; a `null` member of a longer
             `MemberOf` on such a column MUST be dropped.
REQUIREMENT: For a three-valued `NOT` (Prisma), a column declared NOT NULL MUST
             get no guard at any polarity and a `null` MUST NOT be mentioned for
             it. For a two-valued `NOT` (SQL's `CASE WHEN`), a leaf
             `evaluatePredicate` admits on NULL MUST keep `AdmitNull` under an odd
             number of `Negate`s even on a column declared NOT NULL.
REQUIREMENT: A wrong declaration MUST NOT admit a row `evaluatePredicate`
             denies: it can only lose rows or be refused (INV-QD-059).
```

The declaration is the minimum schema fact a renderer needs. A schema-blind
Prisma renderer cannot emit one leaf valid on both kinds of column — Prisma refuses
any filter that mentions `null` on a required field — and a plain `NOT` over a
nullable column drops NULL rows (BEH-QD-244). Declared, the package still never
opens a connection or reads a schema ([ADR-QD-077](../decisions/077-renderability-is-a-core-rule.md)
narrows ADR-QD-054's "never sees a schema"). `nullableFieldsOf(model)` derives it
from a DMMF model that keeps `isRequired`; Prisma 7's runtime `Prisma.dmmf` strips
that field, so a caller there writes the set out.

---

_Previous: [30 — Port Calls](./30-port-calls.md)_
