# 18 — Policy Explanation

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-18                                    |
> | Revision       | 1.5                                            |
> | Effective Date | 2026-10-06                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.5 (2026-10-06): BEH-QD-139 — a `fieldStrategy` or `combining` outside its closed union MUST appear verbatim with what it is evaluated as; BEH-QD-141 — `renderExplanation` MUST NOT throw on one; BEH-QD-137 — an empty `All` carrying one is not atomic (ADR-QD-092 amendment, CCR-QD-183)<br>1.4 (2026-10-04): BEH-QD-141 — `explain` and `renderExplanation` MUST NOT exhaust the call stack, matchers included; BEH-QD-303 added (`foldExplanation`) (ADR-QD-090, CCR-QD-170)<br>1.3 (2026-09-07): BEH-QD-139 gains an explicit requirement that `fieldStrategy` and `HasRelationship.depth` appear when non-default; `depth` was missing from the rendering entirely (INV-QD-031, issue 45, CCR-QD-114)<br>1.2 (2026-08-23): BEH-QD-137 — a rendering denotes exactly one policy; composite children are parenthesised (ADR-QD-042, INV-QD-031, CCR-QD-057)<br>1.1 (2026-08-23): BEH-QD-144 — `renderTrace`, the decision-side counterpart to `renderExplanation` (ADR-QD-039, CCR-QD-053)<br>1.0 (2026-07-26): Initial release (CCR-QD-028) |

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

> **Invariant:** [INV-QD-031](../invariants.md#inv-qd-031-a-rendered-explanation-denotes-exactly-one-policy)
> **See:** [ADR-QD-042](../decisions/042-a-projection-is-not-an-identity.md)

```
REQUIREMENT: Two policies that are not equivalent MUST NOT render to the same
             sentence. A composite child MUST be parenthesised.
```

Only an **atomic** explanation renders bare as a child: a `Requirement`, or an
`All`/`Any`/`Table` with no parts, since those render fixed sentences — "always
allows (an empty conjunction)" — with no loose end for a following word to
attach to. Everything else is wrapped — including an empty `All` whose
`fieldStrategy` is outside the closed union, which carries a trailing clause
saying so ([BEH-QD-139](#beh-qd-139-restrictions-are-stated-not-only-requirements)).

```
anyOf([admin, allOf([editor, onCall])])
  → either requires role `admin` or (requires role `editor` and requires role `onCall`)

allOf([anyOf([admin, editor]), onCall])
  → (either requires role `admin` or requires role `editor`) and requires role `onCall`
```

Without the parentheses those two produced a byte-identical sentence, and they
are not the same policy — the first admits a lone `admin`. Since this rendering
is the only thing an administrative screen shows, a reviewer had no way to
recover which policy they were reading.

The same flattening left an obligation ambiguous: `allOf([x, obliged(o, y)])`
read as though the whole policy owed `o`, when only the second branch does.

```
REQUIREMENT: The top-level explanation MUST NOT be wrapped.
```

Nothing follows it, so there is nothing to run into, and wrapping it would put
brackets around every sentence the library produces for no gain. A single
requirement, and a flat conjunction of them, read exactly as they always did.

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

> **Invariant:** [INV-QD-021](../invariants.md#inv-qd-021-every-policy-explains),
> [INV-QD-031](../invariants.md#inv-qd-031-a-rendered-explanation-denotes-exactly-one-policy)

```
REQUIREMENT: A field set, an obligation, a label and a rule table's combining
             algorithm MUST each appear in the explanation of a policy carrying
             them.
```

```
REQUIREMENT: An `All`/`Any` composite's `fieldStrategy` and a `HasRelationship`
             policy's `depth` MUST each appear when they depart from the
             default, since two non-equivalent policies differing only there
             would otherwise render identically (INV-QD-031).
```

> **Corrected (CCR-QD-114).** Neither requirement above was written down before
> now, and `HasRelationship.depth` was dropped from the rendering entirely
> until this change — `hasRelationship("owner")` and
> `hasRelationship("owner", { depth: 1 })` rendered to the same sentence.
> `fieldStrategy` had already been fixed in code (`Explanation.ts`'s
> `fieldStrategyClause`) without this document ever saying so was a
> requirement, which is the gap this correction closes for both at once.

Rendering `hasPermission(read, { fields: ["id"] })` as "requires permission
doc:read" **overstates the grant**. The error direction matters: understating a
requirement makes a policy look stricter than it is, which is merely misleading,
while understating a restriction makes it look more permissive — and that is the
one a reviewer would act on.

```
REQUIREMENT: An `All`/`Any` whose `fieldStrategy` is outside the closed union,
             and a rule table whose `combining` is, MUST name that value
             verbatim and say how it is evaluated: an `All`/`Any` at every part
             count, an empty `allOf` included, that it exposes no fields and is
             evaluated fail-closed; a non-empty rule table, the algorithm it is
             walked under. An empty `anyOf` and an empty rule table deny whatever
             their value, and their sentences do not change.
```

> **Added in CCR-QD-183** ([ADR-QD-092](../decisions/092-field-strategy-meaning-lives-beside-the-lattice.md)'s
> amendment). Decode rejects such a value, so only a policy built in code
> carries one, and the evaluator reads it fail-closed. The rendering threw on
> most of them; where it did not, it was the error direction this section is
> about — `allOf([hasRole("editor", { fields: ["a"] })], { fieldStrategy: "Xor" })`
> rendered "requires role `editor`, exposing only `a`" for a policy that
> exposes no fields at all. Under a known strategy one part discloses exactly
> itself, so a one-part composite needs no clause; under an unknown one it
> does not, so the clause is said at every part count.

```
allOf([a, b], { fieldStrategy: "Xor" })
  → requires role `editor`, exposing only `a` and requires role `admin`, exposing
    only `b`, but exposing no fields: its field strategy "Xor" is outside the
    closed union and is evaluated fail-closed

rules([permitWhen(a), denyWhen(b)], { combining: "toString" })
  → a rule table where the combining algorithm "toString" is outside the closed
    union and is evaluated under DenyOverrides, so any applying deny row wins:
    [0] permit when …; [1] deny when …
```

A string is quoted, so `""` and `"__proto__"` read as values rather than as
missing words; a non-string from an untyped caller is shown as itself (`42`),
an object as "an object". The algorithm named is whatever `effectiveCombining`
answers — the same function both interpreters walk the table under — so the
sentence cannot drift from the decision.

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
             `renderExplanation` MUST NOT throw for any explanation `explain`
             returns — including one built from a policy assembled in code
             whose `fieldStrategy` or `combining` is outside its closed union.
```

> **Extended in CCR-QD-183.** `explain` itself never threw on such a policy;
> `renderExplanation` did, through a `Match.exhaustive` over the closed union,
> for every unknown string, every `Object.prototype` key and the empty string —
> an `allOf`/`anyOf` of two parts or more and any non-empty rule table.
> [ADR-QD-092](../decisions/092-field-strategy-meaning-lives-beside-the-lattice.md)
> had recorded it as "left alone: rendering, not a decision"; its 2026-10-06
> amendment closes it.

```
REQUIREMENT: `explain` and `renderExplanation` MUST NOT exhaust the call stack for
             any caller-held policy, whatever its nesting depth or width and
             including a deeply nested matcher.
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

## BEH-QD-144: A decision renders too, and it is a different rendering

> **See:** [ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md),
> [ADR-QD-027](../decisions/027-policy-explanation.md)

```ts
export const renderTrace: (trace: Trace, options?: RenderTraceOptions) => string;
```

```
REQUIREMENT: `renderTrace` MUST mark every node with its verdict, and MUST
             render a node's `reason` where it has one.
```

```
REQUIREMENT: It MUST render an `undefined` `visibleFields` as no restriction,
             never as an empty set.
```

`renderExplanation` says what a *rule* requires and takes no subject.
`renderTrace` says what *happened* to one subject and is meaningless without
them. Keeping the two apart is [ADR-QD-027](../decisions/027-policy-explanation.md)'s
central distinction, and having both renderings in one document is the clearest
place to see it: they take different arguments, answer different questions, and
neither can be derived from the other.

The second requirement is [INV-QD-004](../invariants.md) restated at the
rendering layer. `undefined` is the **top** of the visibility lattice — every
field — so printing it as an empty list would say the opposite of what it means,
and a reader would conclude an allow exposed nothing.

**A rendered trace shows what was evaluated, not what was asked.** Children after
the decisive one are absent from `children` rather than marked, because the
evaluator discards them ([INV-QD-020](../invariants.md)) so that a trace cannot
depend on a performance switch. Recovering "which branches were never reached"
requires the `Policy` alongside the trace; `renderTrace` deliberately does not
take one, so it never claims a count it cannot support.

```typescript
import { renderTrace, type Decision } from "@qadi/core";

declare const decision: Decision;

// ✗ AllOf — subject lacks role `editor`
//   ✓ HasPermission
//   ✗ HasRole — subject lacks role `editor`
const why: string = renderTrace(decision.trace);

// The same tree with the caller's own emphasis, for a terminal that has none.
const plain: string = renderTrace(decision.trace, { term: (t) => t });
```

## BEH-QD-303: An explanation folds bottom-up through the same seam

> **Invariant:** [INV-QD-090](../invariants.md#inv-qd-090-a-pure-walk-over-a-caller-held-tree-never-exhausts-the-call-stack)
> **See:** [ADR-QD-090](../decisions/090-a-tree-is-folded-through-one-seam.md)

```ts
export const foldExplanation: <R>(
  self: Explanation,
  combine: (node: Explanation, children: ReadonlyArray<R>) => R,
) => R;
```

```
REQUIREMENT: `foldExplanation` MUST combine a node only after its children, in the
             order the node lists them (`Table` rows in row order), combine a
             shared subtree once, and MUST NOT exhaust the call stack.
```

`explain` was already stack-safe and the code reading its output was not:
`renderExplanation(explain(not^n(…)))` overflowed at about n = 734, lower than
`explain` itself handles. `renderExplanation` now folds through this.

---

_Previous: [17 — Concurrent Evaluation](./17-concurrency.md)_
