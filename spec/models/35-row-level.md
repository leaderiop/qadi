# 35 — Row-Level Security

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-35                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Row-level security restricts *which rows a query returns*. Rather than judging a
record the caller is holding, the policy is compiled into a predicate the
database applies while the query runs, so unauthorised rows are never fetched.
PostgreSQL row security policies, Oracle's Virtual Private Database and SQL
Server's row-level security are one mechanism under three names.

## Who asks for it

Every multi-tenant application, under the sentence "tenants see only their own
rows"; also caseloads scoped to a region, and any reporting surface where one
query must be safe for a hundred audiences. It is among the most requested
capabilities in this matrix, which is why the honesty of the answer matters.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Breaking** |
| Priority | **P3** |
| Enablers required | **E7** |
| Breaking change | Yes |

### The shape mismatch, precisely

Qadi's evaluator answers a question *about a resource in hand*: `evaluate` takes
an `EvaluateOptions` carrying at most one `resource` and returns `Allow | Deny`.
Row-level security must decide about rows **not yet loaded** — no resource to
hand it, and no single answer to return, because the output is a predicate the
query planner consumes and the database then executes. That is a different
return type and a different contract: [E7](./00-adoption-matrix.md#e7--predicate-output)
is a second function beside `evaluate`, not a refinement of it, and the matrix
calls it the single largest departure from the current design.

## What Qadi can express today

`filter(policy, items)` — one policy, evaluated once per already-loaded row,
each row supplied as its own resource, keeping those that allowed.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  allOf,
  anyOf,
  currentSubjectLayer,
  eq,
  filter,
  hasResourceAttribute,
  hasRole,
  makeSubject,
  subject,
  subjectId,
  type EvaluationError,
  type UndischargedObligation,
} from "@qadi/core";

// A row must be a `type`: `filter` constrains its element to
// `Record<string, unknown>`, which an `interface` has no index signature for.
type Invoice = {
  readonly id: string;
  readonly tenantId: string;
  readonly ownerId: string;
};

// Tenancy, then the per-row rule on top of it. Nothing here mentions a query.
const visible = allOf([
  hasResourceAttribute("tenantId", eq(subject("tenantId"))),
  anyOf([hasResourceAttribute("ownerId", eq(subjectId())), hasRole("auditor")]),
]);

declare const loadInvoices: Effect.Effect<ReadonlyArray<Invoice>>;

const services = Layer.mergeAll(
  currentSubjectLayer(
    makeSubject({ id: "u-1", roles: ["auditor"], attributes: { tenantId: "t-1" } }),
  ),
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
);

// The cost: every candidate row crosses the wire before any can be judged, and
// `visible` runs once per row — O(n) rows and O(n) evaluations for a result set
// that may be one row. `LIMIT` composes wrongly too.
const page: Effect.Effect<
  ReadonlyArray<Invoice>,
  EvaluationError | UndischargedObligation
> = loadInvoices.pipe(
  Effect.flatMap((rows) => filter(visible, rows)),
  Effect.provide(services),
);
```

This works, it is shipped, and it is correct. It does not scale to large tables,
and it is not row-level security — it is row filtering after the fact.
**The most useful sentence in this document: at scale, the right answer today is
often not to use Qadi for this.** Push tenancy into the query by hand, or into
the database's own row security mechanism where the engine can use an index, and
keep Qadi for the per-row and per-field judgements on the narrowed page.

## Proposed API design

An **abstract predicate**, and a translation that is allowed to fail.

```ts
export type CompareOp = "Eq" | "Neq" | "Gte" | "Lt";

/** A predicate over rows. No SQL, no dialect, no database dependency. */
export type Predicate =
  | { readonly _tag: "True" }
  | { readonly _tag: "False" }
  | { readonly _tag: "Compare"; readonly column: string; readonly op: CompareOp; readonly value: unknown }
  | { readonly _tag: "MemberOf"; readonly column: string; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "And"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Or"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Negate"; readonly predicate: Predicate };

export class PolicyNotTranslatable extends Data.TaggedError("qadi/PolicyNotTranslatable")<{
  readonly policyTag: Policy["_tag"];
  readonly reason: string;
}> {}

/** Effectful because subject-side values fold to constants; fallible because
 *  some nodes depend on a row it cannot see. */
export const toPredicate: (
  policy: Policy,
) => Effect.Effect<Predicate, PolicyNotTranslatable | EvaluationError, EvaluationServices>;
```

### The translatable subset

| Node | Translation |
| ---- | ----------- |
| `hasResourceAttribute(a, eq/neq/gte/lt(literal))` | `Compare` on column `a` — the only node that becomes a column reference |
| `hasResourceAttribute(a, inArray([…]))` | `MemberOf` |
| `hasRole`, `hasPermission` | folds to `True` or `False` against the subject in hand |
| `hasAttribute` present on the subject | folds to `True` or `False` |
| `allOf`, `anyOf`, `not` | `And`, `Or`, `Negate` |
| `labeled` | transparent — the label survives only in the caller's logging |
| `hasRelationship` | **untranslatable** |
| `hasAttribute` falling through to `AttributeResolver` | **effectful; folds, at a price** |
| `fieldMatch`, `someMatch`, `everyMatch`, `size`, `contains` | **untranslatable** |

Two resolver-backed nodes, failing differently. `readAttribute` is keyed by the
*subject*: one call per translation, folding to a constant, but it makes
`toPredicate` effectful. `hasRelationship` cannot fold at all, being keyed by
`resourceId`: one call per row, exactly the O(n) cost a predicate exists to
avoid. Which side a `ValueRef` sits on decides the rest — `subject(path)` and
`subjectId()` are constants at translation time, `resource(path)` is a column
reference, a *dotted* one names a column no relational schema has, and two
resource paths compared is `column op column`, which `Predicate` cannot express.

The API must state that subset — at the type level or by failing loudly. A
type-level split means a second `TranslatablePolicy`, hence a second codec,
union and generator: the four coordinated edits
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) polices, duplicated.
Failing loudly is cheaper and more honest. What must never happen is a silent
widening — an untranslatable node translated to `True` returns rows the policy
denies.

## What it would cost

Breaking, because it changes what evaluation *is*: a second entry point with a
different return type over the ADT the existing one already interprets. Two
interpreters over one tree must agree, and nothing enforces that they do — a
divergence is an authorisation defect no round-trip test catches. Four hard
problems sit under it.

**1. Translatability.** Only a subset of the ADT survives, per the table above.

**2. Field visibility has no analogue.** A `Decision` carries `visibleFields`; a
predicate does not. Column projection and row filtering are different operations,
and E7 must decide whether it returns both. The interaction with
[INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)
is the sharp part: `undefined` is *top* and `mergeFields` resolves a tree of
field sets to one answer, but under a predicate there is no one answer, because
visibility may differ per row — and resolving that means reading the rows, which
is [cell-level security](./36-cell-level.md) and the same enabler again.

**3. Dialect.** Emitting SQL means owning a dialect: quoting, binding, null
semantics, one grammar per engine. **Emit the abstract predicate and let the
caller compile it.** Qadi has no database dependency today, and acquiring one is
a far larger commitment than this feature warrants.

**4. Trace.** A denial explains itself today: `Deny` carries a reason and a
structured trace, which is what [URS-QD-009](../urs.md) requires. A predicate
returning no rows explains nothing — "zero results" is indistinguishable from
"empty table", and any explanation lives in the query planner Qadi never sees.
That is a real loss; the most on offer is the predicate itself as a diagnostic,
explaining the *rule* but never why a given row fell outside it.

### The recommendation

Pursue E7 only as an abstract predicate with an explicitly translatable subset
and a loud failure outside it — or not at all; a partial translator that quietly
approximates is worse than no feature. Until then, push tenancy into the query
by hand and use Qadi for the decisions it already makes well.

## Verification

Nothing verifies this model, because nothing implements it. E7 is unstarted and
every construct under *Proposed API design* is a sketch; the compiled example is
the only shipped API here, and it shows `filter`, not row-level security.

Adopting it means an ADR for the predicate form and the dialect boundary, a
behaviour, an invariant, and newly allocated `REQ-QD` scenarios covering at
minimum: a translatable policy producing the expected predicate; an
untranslatable node failing rather than widening; and, above all, the agreement
property — over a generated table, `toPredicate` admits exactly the rows
`evaluate` allows. That last is the only evidence that would make a second
interpreter trustworthy.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [06 — Content-Dependent Access Control](./06-content-dependent.md) · [36 — Cell-Level Security](./36-cell-level.md) · [23 — Label-Based Access Control](./23-label-based.md)_
