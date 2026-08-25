# 31 — Predicate Compilation

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-31                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-08-25): Initial release (CCR-QD-079) |

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

export const compileSql: (
  predicate: Predicate,
  options?: { readonly dialect: SqlDialect; readonly maxInValues?: number },
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
             allowlist (`string | number | boolean | null | Date`) MUST fail
             `PredicateNotRenderable`. It MUST NOT be stringified into the
             fragment or `WhereInput`.
```

A `Predicate`'s `value`/`values` are `unknown`. Approximating an unsafe value
into a query fragment — coercing an object, a function, a Symbol into a bound
parameter — is [ADR-QD-024](../decisions/024-predicate-output.md)'s rejected
failure mode one interpreter deeper: "nothing is approximated" does not stop
applying once the AST becomes a string.

## BEH-QD-239: An empty `MemberOf` is `False`, never `IN ()`

```
REQUIREMENT: `MemberOf` with an empty `values` array MUST compile to a
             predicate that admits no rows (`"FALSE"` for SQL, `{OR:[]}` for
             Prisma), never to `IN ()` or an equivalent invalid or
             ambiguous fragment.
```

`[].includes(x)` is always `false`; a query engine's `IN ()` is invalid syntax
in some dialects and a vacuous truth in others. Compiling to the engine's own
vacuous-false identity is the correct translation, not a degenerate case
requiring a caller-side guard.

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
             MUST equal `evaluatePredicate(P, R)`.
```

The same property as [BEH-QD-241](#beh-qd-241-the-compiled-sql-fragment-agrees-with-the-reference-interpreter),
against the other grammar. There is no `Predicate` shape that renders to one
target and not the other — both grammars are equally expressive over this
AST, so the two properties differ only in which compiler and which test-only
interpreter they run.

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

---

_Previous: [30 — Port Calls](./30-port-calls.md)_
