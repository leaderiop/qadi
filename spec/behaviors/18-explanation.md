# 18 — Policy Explanation

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-18                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-028) |

_Previous: [17 — Concurrent Evaluation](./17-concurrency.md)_

---

## BEH-QD-137: An explanation is a tree

> **See:** [ADR-QD-027](../decisions/027-policy-explanation.md)

```ts
export const explain: (policy: Policy) => Explanation;
export const renderExplanation: (explanation: Explanation, options?: RenderOptions) => string;
```

```
REQUIREMENT: `explain` MUST return a structured `Explanation`, not a string.
             `renderExplanation` MUST be the only place the library assembles
             prose about a policy.
```

The same reason `Predicate` is abstract
([ADR-QD-024](../decisions/024-predicate-output.md)): Qadi owns no dialect. An
administrative interface renders a role as a link and a field restriction as a
chip list; from a string it would have to parse back what Qadi had just finished
formatting.

`RenderOptions.term` exists so the default rendering is useful without being the
only one — a caller swaps backticks for markup in one argument.

## BEH-QD-138: Explanation takes no subject

```
REQUIREMENT: `explain` MUST be a pure function of the policy. It MUST NOT require
             `CurrentSubject`, a resource, an action, or any service.
```

This is the whole distinction between explanation and
[the trace](./05-evaluator.md). An explanation that varied by subject *is* a
trace, and the difference has a security consequence: "what does this rule say" is
safe to show on a screen listing policies the viewer cannot satisfy, and "what
would it say for you" leaks whether they satisfy them.

The signature carries the requirement — there is no services parameter to pass.

## BEH-QD-139: Restrictions are stated, not only requirements

> **Invariant:** [INV-QD-021](../invariants.md#inv-qd-021-every-policy-explains)

```
REQUIREMENT: A field set, an obligation, a label and a rule table's combining
             algorithm MUST each appear in the explanation of a policy carrying
             them.
```

Rendering `hasPermission(read, { fields: ["id"] })` as "requires permission
doc:read" **overstates the grant**. The error direction matters: understating a
requirement makes a policy look stricter than it is, which is merely misleading,
while understating a restriction makes it look more permissive — and that is the
one a reviewer would act on.

```
REQUIREMENT: An advisory obligation MUST be distinguishable from a binding one.
```

## BEH-QD-140: An empty composite says what it means

```
REQUIREMENT: An empty `allOf`, an empty `anyOf` and an empty rule table MUST each
             render as an explicit statement of their outcome, not as an empty
             list.
```

That an empty conjunction *allows* and an empty disjunction *denies* is the least
guessable property of the ADT. A reader shown an empty list would have to know the
convention; a reader shown "always allows (an empty conjunction)" would not.

## BEH-QD-141: Explanation is total

> **Invariant:** [INV-QD-021](../invariants.md#inv-qd-021-every-policy-explains)

```
REQUIREMENT: Every `Policy` variant, every `Matcher` and every `ValueRef` MUST
             have an explanation arm, enforced by `Match.tagsExhaustive` so that
             adding a variant without one is a compile error.
```

```
REQUIREMENT: `explain` MUST NOT fail and MUST NOT refuse a policy.
```

Deliberately unlike `toPredicate`, which refuses what it cannot translate
([BEH-QD-123](./16-predicates.md)). A partial *translation* returns wrong rows,
so refusing is the safe answer; a partial *explanation* is just an incomplete
description, and a policy a reviewer cannot read at all is worse than one they can
only partly act on.

## BEH-QD-142: The third interpreter, and its cost

```
REQUIREMENT: The explanation tree MUST contain exactly one node per policy node.
```

A composite that silently dropped a child could still render as fluent prose, so
the structural correspondence is asserted rather than inferred from the text.

This is the third walk over the policy tree, after `evaluate` and `toPredicate`.
A new variant now costs an arm in three places. That is the accepted price of the
exhaustive match, and the alternative — a default arm — is what makes a variant
silently unexplained.

## BEH-QD-143: Worked example

```typescript
import {
  allOf,
  explain,
  hasPermission,
  hasRole,
  obligation,
  obliged,
  permission,
  renderExplanation,
} from "@qadi/core";

const canPublish = allOf([
  hasRole("editor"),
  obliged(
    obligation("audit.log"),
    hasPermission(permission("doc", "publish"), { fields: ["id", "title"] }),
  ),
]);

// "requires role `editor` and requires permission `doc:publish`, exposing only
//  `id`, `title`, and owes `audit.log`"
//
// No subject, no services, no Effect: `explain` is one of the few genuinely
// synchronous functions in the public API.
const sentence: string = renderExplanation(explain(canPublish));

// The tree is the point. An admin interface walks it and renders a role as a link.
const tree = explain(canPublish);
const isConjunction: boolean = tree._tag === "All";
```

---

_Previous: [17 — Concurrent Evaluation](./17-concurrency.md)_
