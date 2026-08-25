# 32 — Custom Predicates

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-32                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-08-25): Initial release (CCR-QD-082) |

_Previous: [31 — Predicate Compilation](./31-predicate-compilation.md)_

---

`HasCustom` is the policy tree's one deliberate escape hatch — a leaf naming
an externally-registered predicate for logic the built-in matchers cannot
express, resolved through the new `CustomPredicate` service. See
[ADR-QD-055](../decisions/055-a-named-registered-custom-predicate.md) for why
this is a name and never a function.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  currentSubjectLayer,
  customPredicateFromRecord,
  DecisionHistoryUnknown,
  enforceProjected,
  EvaluationIdLive,
  fromRoles,
  hasCustom,
  RelationshipResolverNever,
} from "@qadi/core";

// The policy names a check by string; the check itself lives in the registry
// below, never in the policy.
const canReadOwnDraft = hasCustom("isAuthor");

const isAuthor = customPredicateFromRecord({
  isAuthor: (subject, resource) =>
    Effect.succeed(resource?.["authorId"] === subject.id),
});

const services = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  isAuthor,
);

declare const loadDraft: (id: string) => Effect.Effect<{
  id: string;
  authorId: string;
}>;

const program = loadDraft("draft-1").pipe(
  enforceProjected(canReadOwnDraft),
  Effect.provide(currentSubjectLayer(fromRoles({ id: "u1", roles: [] }))),
  Effect.provide(services),
);
// → { id: "draft-1", authorId: "u1" } when u1 wrote it; fails AccessDenied otherwise.
```

## BEH-QD-245: `hasCustom` builds a leaf carrying a name, never a function

```ts
export const hasCustom: (
  name: string,
  params?: unknown,
  options?: FieldOptions,
) => Policy;
```

```
REQUIREMENT: A `HasCustom` node MUST carry only `name`, an optional JSON-safe
             `params`, and the ordinary `fields` restriction — never a
             function, and nothing else `Schema` cannot round-trip through
             JSON.
```

Round-trips through `toJson`/`fromJson` exactly like every other node in the
union — the whole point of naming rather than closing over logic
([ADR-QD-055](../decisions/055-a-named-registered-custom-predicate.md)). The
logic a `HasCustom` node names lives behind `CustomPredicate`, resolved at
evaluation time; nothing about *which* logic runs is ever part of a policy's
own JSON, so a policy carrying `hasCustom("isAuthor")` means the same thing
after a database round trip that it did before one.

## BEH-QD-246: An unwired `CustomPredicate` denies every name

```
REQUIREMENT: `CustomPredicateNone` MUST answer every name with `false`,
             never a failure — the same fail-closed default `evaluate`
             produces from every other unwired required port.
```

An application that never reaches for `hasCustom` wires `CustomPredicateNone`
once and never observes it again — the same one-line cost every required
service has imposed since `AttributeResolver`.

## BEH-QD-247: A registered predicate's own failure, and an unrecognised name, are errors — never denials

> **Invariant:** [INV-QD-049](../invariants.md#inv-qd-049-an-unregistered-custom-predicate-name-is-an-error-never-a-denial)

```
REQUIREMENT: `customPredicateFromRecord`'s `evaluate` MUST fail with
             `CustomPredicateError` when `name` has no entry in the table it
             was given — MUST NOT answer `false`.
REQUIREMENT: A `CustomPredicateError`, from any source, MUST propagate through
             `evaluateNode`'s `HasCustom` case unconverted — MUST NOT be
             caught and turned into a `Deny`.
```

Distinguishes a wiring **omission** — nothing at all registered, which denies
(BEH-QD-246) — from a wiring **mistake**: something is registered, and this
particular name is not it, most likely a typo in `hasCustom`'s own `name`
argument. The same split `AttributeResolver.resolve`'s own doc comment draws
between an absent value and a broken lookup. Reporting the second case as a
denial would send whoever reads the decision to audit permissions instead of
the typo — exactly the confusion
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) exists to
prevent, applied to a misconfigured registry rather than a broken store.

## BEH-QD-248: `toPredicate` refuses a `HasCustom` node

> **Invariant:** [INV-QD-050](../invariants.md#inv-qd-050-a-hascustom-node-never-appears-in-a-compiled-predicate)
> **See:** [ADR-QD-024](../decisions/024-predicate-output.md)

```
REQUIREMENT: `translateNode` MUST fail `PolicyNotTranslatable` for every
             `HasCustom` node — MUST NOT fold it to `True`/`False`, or attempt
             to compile it, regardless of `params`.
```

Opaque, externally-registered logic has no resource-independent expression to
fold to; approximating it would be exactly the failure mode ADR-QD-024
refuses — a query that returns rows a `HasCustom`-guarded policy would have
denied — one interpreter further from the AST than the nodes that motivated
that decision. `@qadi/predicate-sql` and `@qadi/predicate-prisma` never see a
`HasCustom` node at all: the refusal happens in `toPredicate`, before a
`Predicate` is ever produced.

---

_Previous: [31 — Predicate Compilation](./31-predicate-compilation.md)_
