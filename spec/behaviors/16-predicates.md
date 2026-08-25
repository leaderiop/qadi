# 16 — Predicate Output

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-16                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.1 (2026-08-25): BEH-QD-121 — a companion package may compile the predicate (ADR-QD-054, CCR-QD-079)<br>1.0 (2026-07-26): Initial release (CCR-QD-020) |

_Previous: [15 — Rule Tables](./15-rules.md)_

---

## BEH-QD-121: A predicate is abstract, and Qadi owns no dialect

> **See:** [ADR-QD-024](../decisions/024-predicate-output.md)

```ts
export type CompareOp = "Eq" | "Neq" | "Gte" | "Lt";

export type Predicate =
  | { readonly _tag: "True" }
  | { readonly _tag: "False" }
  | { readonly _tag: "Compare"; readonly column: string; readonly op: CompareOp; readonly value: unknown }
  | { readonly _tag: "MemberOf"; readonly column: string; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "And"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Or"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Negate"; readonly predicate: Predicate };
```

```
REQUIREMENT: Qadi MUST NOT emit SQL. The caller compiles the predicate, or
             installs a companion package that compiles it for them.
```

Emitting SQL means owning a dialect — quoting, binding, null semantics, one
grammar per engine. Qadi has no database dependency and acquiring one is a far
larger commitment than this feature warrants. [ADR-QD-054](../decisions/054-a-companion-package-may-compile-a-dialect.md)
narrows exactly the "the caller compiles it" clause: `@qadi/predicate-sql` and
`@qadi/predicate-prisma` are optional companion packages that do, `@qadi/core`
itself still doesn't. See [31 — Predicate Compilation](./31-predicate-compilation.md).

`Predicate` is hand-written with **no `Schema`**, unlike `Policy`. That is the
[ADR-QD-002](../decisions/002-schema-derived-policy-adt.md) boundary applied
rather than forgotten: a policy is persisted and re-parsed from untrusted JSON,
and a predicate is produced and consumed in the same process — like `Decision`
and `Trace`, which carry no codec for the same reason.

## BEH-QD-122: The reference interpreter ships with it

```ts
export const evaluatePredicate: (
  self: Predicate,
  row: Readonly<Record<string, unknown>>,
) => boolean;
```

```
REQUIREMENT: The predicate MUST be executable.
```

This is what separates predicate output from a plausible sketch. A caller with
only `toPredicate` compiles a predicate to SQL and has **nothing** that says
their SQL means what Qadi meant; the failure is silent and it returns rows. With
a reference interpreter they can differential-test their compiler against the
intended semantics, over their own rows, in their own suite.

It is also what makes [BEH-QD-127](#beh-qd-127-the-two-interpreters-agree)
obtainable at all.

## BEH-QD-123: Untranslatable fails; nothing is approximated

```ts
export const toPredicate: (
  policy: Policy,
  options?: PredicateOptions,
) => Effect.Effect<Predicate, PolicyNotTranslatable | EvaluationError, PredicateServices>;
```

```
REQUIREMENT: A node outside the translatable subset MUST fail with
             `PolicyNotTranslatable` (`ACL012`). It MUST NOT translate to `True`.
```

An untranslatable node rendered as `True` returns rows the policy denies. That is
the one failure mode that makes this feature worse than its absence, and it is
why a type-level `TranslatablePolicy` was rejected: a second codec, union and
generator — the four coordinated edits
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) polices, duplicated —
where failing loudly costs one error and says the same thing.

| Node | Translation |
| ---- | ----------- |
| `HasResourceAttribute` with `Eq`/`Neq`/`Gte`/`Lt` | `Compare` — the only node that becomes a column reference |
| `HasResourceAttribute` with `In` | `MemberOf` |
| `HasRole`, `HasPermission`, `HasAction` | folds to `True` or `False` |
| `HasAttribute` | folds, consulting the subject then the resolver |
| `HasActed`/`HasNotActed`, `scope: "Any"` | folds — subject-keyed |
| `AllOf`, `AnyOf`, `Not` | `And`, `Or`, `Negate` |
| `Labeled` | transparent; a predicate has no trace to carry a label |
| `Rules` | [BEH-QD-126](#beh-qd-126-a-rule-table-becomes-a-set-based-formula) |
| `HasRelationship` | **untranslatable** — keyed by `resourceId`, one lookup per row |
| `HasActed`/`HasNotActed`, `scope: "Resource"` | **untranslatable**, for the same reason |
| `Obliged` | **untranslatable** — [BEH-QD-124](#beh-qd-124-a-duty-and-a-column-restriction-both-refuse) |
| any `fields` in the tree | **untranslatable** — [BEH-QD-124](#beh-qd-124-a-duty-and-a-column-restriction-both-refuse) |

Which side a `ValueRef` sits on decides the rest. `subject(path)`, `subjectId()`
and `action()` are constants at translation time; `resource(path)` is a column,
and two resource paths compared is `column op column`, which `Predicate` cannot
express.

```
REQUIREMENT: A failure MUST fail the translation rather than fold to `False`
             ([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)),
             and a policy reading an absent action MUST fail
             ([INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)).
```

The subject-side fold is the reason the subset splits where it does: a
subject-keyed lookup costs **one call per translation**, and a row-keyed one costs
one per row — precisely the O(n) a predicate exists to avoid. The history port
splits on `scope` for exactly that reason.

## BEH-QD-124: A duty and a column restriction both refuse

```
REQUIREMENT: A policy containing an obligation MUST NOT translate.
```

[INV-QD-013](../invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation)
reaching a construct it could not otherwise reach. `filter` refuses an allow whose
obligation nobody discharged; a predicate pushed into a query hands back rows with
no decision attached at all, so refusing the translation is the only safe answer.

```
REQUIREMENT: A policy carrying a `fields` restriction anywhere in the tree MUST
             NOT translate.
```

**A predicate answers which rows, never which columns.** A policy saying
"permitted, and only these fields" reduced to a row filter alone lets a caller run
`SELECT *` and receive columns the policy withheld — a widening no error
announces. The check is deliberately conservative: *any* `fields` in the tree,
including on a branch whose set the evaluator would have discarded. A precise
check would mean reproducing `mergeFields` inside the translator, which is a third
implementation of a rule two already share.

Column projection is therefore **not** in E7, and
[36 — Cell-Level Security](../models/36-cell-level.md)'s `CellVisibility` stays
unbuilt. The split that document argues for is the one shipped: `toPredicate`
narrows the page, and `decide` with `project` judges the columns on it.

## BEH-QD-125: Folding simplifies, and `False` means do not run the query

```
REQUIREMENT: Constants MUST be simplified away as the predicate is built.
```

Every subject-side node folds to a constant, so an unsimplified result is mostly
`True` and compiles to junk. `And` drops `True` and collapses to `False`; `Or`
drops `False` and collapses to `True`; `Negate` inverts the constants.

One outcome is worth naming: **`False` means do not run the query.** A subject who
fails the role half of a policy yields `False` before any column is mentioned, and
the caller can skip the round trip rather than sending a `WHERE false`.

## BEH-QD-126: A rule table becomes a set-based formula

| Combining | Admitted rows |
| --------- | ------------- |
| `PermitOverrides` | `Or(permit conditions)` |
| `DenyOverrides` | `And(Negate(Or(deny conditions)), Or(permit conditions))` |
| `FirstApplicable` | `Or(cᵢ ∧ ¬c₀ ∧ … ∧ ¬cᵢ₋₁)` over the `Permit` rows |

The overrides do not depend on position, so each is one line. `FirstApplicable`
does, and the formula pays for it: every `Permit` row must exclude every row above
it, so an *n*-row table becomes O(n²) conjuncts. That is the honest cost of
pushing an ordered walk into an engine that has no order, and it is bounded by the
caller's own table.

`DenyOverrides` over a tenancy column is the shape every multi-tenant application
asks for, and until [E3](./15-rules.md) it could not be written at all.

## BEH-QD-127: The two interpreters agree

> **Invariant:** [INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)

```
REQUIREMENT: For every translatable policy P and row R,
             evaluatePredicate(toPredicate(P), R) MUST equal
             isAllowed(evaluate(P, { resource: R })).
```

Two interpreters over one tree must agree, and nothing structural makes them.
This is asserted by a `FastCheck` property over generated policies **and**
generated rows — including rows missing a column, since `undefined` must read the
same way on both sides.

It is the first test in the library comparing two independent implementations of
the same semantics, and it is the only evidence that would make a second
interpreter trustworthy rather than merely plausible.

## BEH-QD-128: Worked example

Tenancy with an explicit deny, pushed into the query.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  allOf,
  currentSubjectLayer,
  denyWhen,
  eq,
  evaluatePredicate,
  hasResourceAttribute,
  hasRole,
  literal,
  makeSubject,
  permitWhen,
  rules,
  subject,
  subjectId,
  toPredicate,
  type Predicate,
  type PolicyNotTranslatable,
  type EvaluationError,
} from "@qadi/core";

// Tenancy, then the rule table on top of it. Nothing here mentions a query.
const visible = allOf([
  hasResourceAttribute("tenantId", eq(subject("tenantId"))),
  rules(
    [
      denyWhen(hasResourceAttribute("sealed", eq(literal(true)))),
      permitWhen(hasResourceAttribute("ownerId", eq(subjectId()))),
      permitWhen(hasRole("auditor")),
    ],
    { combining: "DenyOverrides" },
  ),
]);

// No `EvaluationId`: no decision is produced. No `RelationshipResolver` either —
// a relationship cannot fold, so a policy needing one never reaches here.
const services = Layer.mergeAll(
  currentSubjectLayer(
    makeSubject({ id: "u-1", roles: ["auditor"], attributes: { tenantId: "t-1" } }),
  ),
  AttributeResolverNone,
  DecisionHistoryUnknown,
);

// The auditor row folds to `True`, so the whole table reduces to "not sealed".
const filter: Effect.Effect<Predicate, PolicyNotTranslatable | EvaluationError> =
  toPredicate(visible).pipe(Effect.provide(services));

// What a caller's SQL compiler is differential-tested against.
const admits = (predicate: Predicate, row: Readonly<Record<string, unknown>>): boolean =>
  evaluatePredicate(predicate, row);

const page = Effect.map(filter, (predicate) =>
  [
    { id: "r-1", tenantId: "t-1", sealed: false },
    { id: "r-2", tenantId: "t-1", sealed: true },
  ].filter((row) => admits(predicate, row)),
);
```

The `filter` above is what a query compiler consumes; the `page` below it is the
same predicate run through the reference interpreter instead, which is how a
caller checks that the two mean the same thing.

---

_Previous: [15 — Rule Tables](./15-rules.md)_
