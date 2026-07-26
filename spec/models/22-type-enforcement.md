# 22 — Type Enforcement

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-22                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Type enforcement — Boebert and Kain's model, and SELinux's after it — labels
every subject with a **domain** and every object with a **type**, and states the
policy as a matrix of permitted `(domain, type, operation)` triples. A triple in
the matrix is allowed; everything else is denied, and no rule says so. The
absence *is* the rule.

This is a genuinely different shape from the rest of the P1 set, and it belongs
at the top rather than in a footnote. Every other model here is a *condition*
about a subject and a resource, and Qadi is an expression language for
conditions; type enforcement is a *table lookup on a triple*. The two can be
mapped onto one another, and this document does so, but the fit is imperfect —
saying so is more useful than pretending otherwise, because a reader who believes
it exact will write the matrix as a policy tree.

## Who asks for it

Applications that isolate workloads rather than people: plugin and extension
hosts, multi-tenant job runners, integration platforms where a connector should
touch its own object types and nothing else. Its descendants are container and
workload isolation policies — the same matrix in a different syntax. Rules about
users rarely want it: the unit of authority is the domain, not the identity.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None; [E1](./00-adoption-matrix.md#e1--action-dimension) shipped |
| Breaking change | No |

E1 was *recommended* rather than *required* because the model survived without
it, but only by paying for it elsewhere. It has since shipped
([ADR-QD-018](../decisions/018-action-dimension.md)), so the operation — a third
of the rule — now has a home the evaluator can see. See
[What is missing](#what-is-missing).

## How Qadi expresses it

Three elements go in, and Qadi has a natural home for two of them.

| TE element | Qadi home | Notes |
| ---------- | --------- | ----- |
| Domain | A subject attribute | Carried on the subject, or resolved by `AttributeResolver` from the workload registry |
| Type | A resource attribute | The `type` field of the resource passed in `EvaluateOptions` |
| Operation | *Nowhere at evaluation level* | Encoded in the attribute key, in a permission token, or in the choice of policy per call site |
| Permitted triples | The resolver, or an `anyOf` of branches | Prefer the resolver past a handful of pairs |

**As a policy.** One `anyOf` branch per permitted pair:

```ts
const permitted = anyOf([
  allOf([
    hasAttribute("domain", eq(literal("indexer_t"))),
    hasResourceAttribute("type", eq(literal("document_t"))),
  ]),
  // …one branch per permitted cell
]);
```

Defensible for three or four pairs, indefensible past ten: an `anyOf` with fifty
branches is a matrix written badly, serialised as a tree, where adding a row
means editing a policy rather than a table.

**As a resolver.** The matrix stays a table in the caller's store, and the policy
asks it one question — *is this resource's type in the row for this domain?*

```ts
const permitted = hasAttribute(
  "permittedTypes",
  someMatch(eq(resource("type"))),
);
```

`someMatch` applies its inner matcher to each element of the resolved array and
`eq(resource("type"))` compares that element against the resource's own `type`
field: the resolver returns the row, the matcher performs the lookup. Note the
asymmetry — `hasAttribute` and `hasResourceAttribute` take a **flat key**, while
`resource("type")` is a dot-path resolved by `getByPath`.

**Default-deny is native, and this part fits well.** Type enforcement denies what
the matrix does not list; Qadi's
[fail-closed defaults](../invariants.md#inv-qd-007-defaults-fail-closed) deny what
no branch allows. An unlisted domain resolves to an empty row, `someMatch` finds
no element, the decision is `Deny` — and no catch-all rule is written anywhere.
The two agree with no adaptation at all, worth saying plainly given how much of
the rest of this document is caveat.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  EvaluationIdLive,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  check,
  currentSubjectLayer,
  eq,
  hasAttribute,
  makeSubject,
  resource,
  someMatch,
  type AttributeResolveError,
  type EvaluationError,
  type Policy,
} from "@qadi/core";

// The access matrix, owned by the caller: domain → attribute key → the types
// that domain may operate on. The operation lives in the key, not in a third
// dimension, because evaluation has none.
declare const matrix: Readonly<
  Record<string, Readonly<Record<string, ReadonlyArray<string>>>>
>;

// In SELinux the domain is the process context; here it is whatever the
// application's workload registry says it is.
declare const domainOf: (
  subjectId: string,
) => Effect.Effect<string, AttributeResolveError>;

const MatrixResolver: Layer.Layer<AttributeResolver> = Layer.succeed(
  AttributeResolver,
  {
    resolve: (subjectId: string, attribute: string) =>
      Effect.map(domainOf(subjectId), (domain) => matrix[domain]?.[attribute] ?? []),
  },
);

// One policy per operation: the row is the subject's domain, the column the
// resource's own `type`.
const mayPerform = (operation: string): Policy =>
  hasAttribute(`permitted:${operation}`, someMatch(eq(resource("type"))));

// An unlisted domain resolves to the empty row and is denied — no catch-all.
const program: Effect.Effect<boolean, EvaluationError> = check(mayPerform("read"), {
  resource: { id: "f-1", type: "audit_log_t" },
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(makeSubject({ id: "svc-indexer" })),
      MatrixResolver,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  ),
);
```

## What is missing

**~~The operation — a third of the rule (E1).~~ Closed.** This was the sharpest
limitation recorded against any P1 model: the `(domain, type, operation)` triple
collapsed to a pair, and the operation had to be smuggled into the attribute key,
into a permission token's second segment, or into which policy the call site
chose — every route putting a third of the rule where the evaluator could not see
it. [E1](./00-adoption-matrix.md#e1--action-dimension) /
[ADR-QD-018](../decisions/018-action-dimension.md) has shipped and the triple is
whole:

```ts
allOf([
  hasAttribute("domain", eq(literal("web_app_t"))),
  hasResourceAttribute("type", eq(literal("log_file_t"))),
  hasAction("append"),
])
```

The recipe above still writes the operation into the attribute key, because that
is what a matrix row loaded from a registry looks like; `hasAction` is the better
choice for a rule authored by hand.

**Administration of the matrix.** Qadi reads a matrix; it does not hold, version
or validate one, and cannot tell you whether a proposed row grants more than
intended. That analysis is the safety question [the URS](../urs.md) places out of
scope, and why the Typed Access Matrix sits in the
[excluded tier](./00-adoption-matrix.md#34-excluded--p4).

**Qadi is not a mandatory access control mechanism, and a type-enforcement policy
does not make an application one.** SELinux enforces in the kernel, on every
syscall, for every process, cooperating or not. Qadi decides in an application, at
call sites the application chooses, and nothing stops application code from simply
not asking. A TE-*shaped* policy is a useful discipline for workload and plugin
isolation — it makes the permitted surface explicit and default-deny — but the
discipline is voluntary. True MAC wants a lattice ordered by dominance rather than
a flat matrix; that is P3, depends on
[E4](./00-adoption-matrix.md#e4--label-lattice), and is where
[MOD-QD-023](./23-label-based.md) picks up.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature.

The mechanics it stands on are proven separately: subject attribute resolution by
`REQ-QD-004`, resource attribute matching by `REQ-QD-006`, the fail-closed default
by [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed). The composite
is not: no test drives a matrix resolver and no scenario asserts that an unlisted
pair denies. Adopting the model means a resolver in the caller's codebase and, if
a reference adapter is ever shipped, a scenario under a newly allocated `REQ-QD`
identifier covering three cases — a listed pair allows, an unlisted type in a
listed domain denies, an unknown domain denies.

Nor is the cost argument measured. The short-circuit rule
([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)) is verified
for attribute resolution, so it holds for the resolver form, but it says nothing
about how a fifty-branch tree performs and no benchmark here does either.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [02 — Attribute-Based Access Control](./02-abac.md) · [23 — Label-Based Access Control](./23-label-based.md)_
