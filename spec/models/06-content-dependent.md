# 06 — Content-Dependent Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-06                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-006) |

---

## What it is

The decision follows from the data's own values, not from who is asking. A
document may be read while its `status` is `published`; an order may be approved
while its total is under 10,000. Strip every reference to identity, roles and
permissions and a content-dependent policy still says something. Qadi expresses
it with `hasResourceAttribute` over the resource passed in `EvaluateOptions`, and
with matchers rich enough to state conditions about structured records rather
than only about flat scalars. It is the sibling of [ABAC](./02-abac.md) that
leans entirely on one side of the comparison.

## Who asks for it

Anything with a lifecycle in a column: content systems gating on `status`, case
and workflow tools where a record's state decides what may be done to it,
approval chains with monetary thresholds, embargoes held in a date field. It is
also the model that arrives by accident — teams write
`if (doc.status !== "published") throw …` long before adopting an authorisation
library, and this is where that scattered conditional goes.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped** |
| Priority | **P0** |
| Enablers required | None |
| Breaking change | No |

## How Qadi expresses it

One policy constructor and a per-evaluation resource:

```ts
export const hasResourceAttribute: (
  attribute: string,
  matcher: Matcher,
  options?: FieldOptions,
) => Policy;

export interface EvaluateOptions {
  readonly resource?: Readonly<Record<string, unknown>>;
  readonly maxDepth?: number;
}
```

There is no `ResourceResolver` and there should not be — the caller has already
loaded the thing they are asking about. A `hasResourceAttribute` evaluated
without a resource fails with `MissingResource` rather than denying, because an
absent resource is a wiring mistake and not a decision
([BEH-QD-036](../behaviors/05-evaluator.md),
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)).

Two distinct mechanisms reach nested data, and confusing them is the common
error. The **attribute name is a flat key**: the evaluator reads
`resource[attribute]`, so `hasResourceAttribute("shipping.country", …)` looks for
a key literally spelled `shipping.country`. **Dot-paths belong to value
references**: `resource(path)` and `subject(path)` resolve through `getByPath`,
which walks segment by segment and yields `undefined` at any missing step rather
than throwing ([BEH-QD-026](../behaviors/04-matchers.md)). That is how the *other*
side of a comparison reaches nested data, and it lets a rule compare two parts of
the same record — content-dependent in the strictest sense, with no subject on
either side.

Descending into the value in hand is instead the matcher's job, and the
structural matchers are what make this model expressive over real records:

| Matcher | Applies to | What it is for |
| ------- | ---------- | -------------- |
| `fieldMatch(field, m)` | objects | descends one level and applies `m` to that field |
| `someMatch(m)` | arrays | at least one element satisfies `m` — "any line is restricted" |
| `everyMatch(m)` | arrays | all elements satisfy `m` — "every line is priced" |
| `size(m)` | arrays, strings | applies `m` to the length — "at least one attachment" |

They nest, because `Matcher` is a recursive union. Nothing coerces and nothing
throws: a matcher applied to the wrong shape yields false, never an error
([BEH-QD-027](../behaviors/04-matchers.md)), so a malformed record denies instead
of crashing the evaluator. `evaluateMatcher(self, value, context)` returns a
plain `boolean`, which is why a content-dependent rule costs no I/O once the
resource is in hand.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import {
  allOf,
  check,
  everyMatch,
  exists,
  fieldMatch,
  filter,
  gte,
  hasResourceAttribute,
  inArray,
  lt,
  size,
  someMatch,
  type EvaluationError,
} from "@qadi/core";
import { qadiTestLayer, subjectWith } from "@qadi/testing";

// Nothing below mentions who is asking. Every clause states something about the
// order's own values.
const approvable = allOf([
  hasResourceAttribute("status", inArray(["submitted", "reviewed"])),
  hasResourceAttribute("total", lt(10_000)),
  // `lines` is an array: `size` measures it, the quantifiers range over it, and
  // `fieldMatch` descends into each element.
  hasResourceAttribute("lines", size(gte(1))),
  hasResourceAttribute("lines", everyMatch(fieldMatch("price", exists()))),
  hasResourceAttribute("lines", someMatch(fieldMatch("code", inArray(["A", "B"])))),
  // The attribute name is a flat key; descending into it is the matcher's job.
  hasResourceAttribute("shipping", fieldMatch("country", inArray(["FR", "DE"]))),
]);

type Order = {
  readonly id: string;
  readonly status: string;
  readonly total: number;
  readonly lines: ReadonlyArray<{ readonly code: string; readonly price: number }>;
  readonly shipping: { readonly country: string };
};

const services = qadiTestLayer(subjectWith({ id: "u-42" }));

// One resource, already loaded: a boolean about a value in hand.
const one: Effect.Effect<boolean, EvaluationError> = check(approvable, {
  resource: {
    id: "o-1",
    status: "submitted",
    total: 4_200,
    lines: [{ code: "A", price: 4_200 }],
    shipping: { country: "FR" },
  },
}).pipe(Effect.provide(services));

declare const loadOrders: Effect.Effect<ReadonlyArray<Order>>;

// Many resources, also already loaded: the same policy once per row, each row
// supplied as its own `resource`.
const many: Effect.Effect<ReadonlyArray<Order>, EvaluationError> = loadOrders.pipe(
  Effect.flatMap((orders) => filter(approvable, orders)),
  Effect.provide(services),
);
```

## What is missing

Nothing, for the model as scoped. What is missing is the model people ask for
next, and the boundary is worth stating precisely because the two are easy to
conflate.

**Row-level security (E7).** Content-dependent control decides about *one
resource you have already loaded*. Row-level security decides about *rows you
have not loaded*, by producing a predicate pushed down into the query so that
unauthorised rows are never fetched. Qadi's evaluator returns `Allow | Deny`;
returning a filter is a different return type and a different contract, and it is
the single largest departure from the current design in the
[matrix](./00-adoption-matrix.md#e7--predicate-output). It would also need a
target dialect — a predicate is useful only if something compiles it to SQL, to a
document query, or to an ORM's `where` clause — and choosing that target is a
scope decision Qadi has not taken.

**Cell-level security (E7).** The same enabler applied to columns. Qadi already
redacts *after* loading: `fields` and `fieldStrategy` project a record down to
what the decision makes visible
([INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)).
Cell-level security means the column is never read, which is again a predicate
pushed into the query.

**`filter` is the honest middle ground, and it does not scale.**
`filter(policy, items)` evaluates the policy once per item, each item as its own
resource, and returns those that allowed. It is correct, it reuses the single
evaluator, and it is genuinely useful for a page of results already in memory. It
cannot be more than that, because the rows must be fetched before they can be
judged: over a large table it reads everything to discard most of it, and `LIMIT`
composes wrongly with it — twenty rows fetched may yield three allowed. Say so
plainly rather than letting a caller discover it at production volume. Pushing
the predicate down is E7, and no version of `filter` becomes it.

## Verification

| Claim | Evidence |
| ----- | -------- |
| A matching resource attribute allows, a non-matching one denies, an absent resource fails with `MissingResource` | `packages/core/test/Evaluate.test.ts` — `describe("leaf policies")`, "HasResourceAttribute matches against the resource" and "…fails when no resource is in context" |
| `fieldMatch` descends, `someMatch` and `everyMatch` quantify, `size` measures | `packages/core/test/Matcher.test.ts` — "fieldMatch descends into an object", "someMatch and everyMatch quantify over arrays", "size applies a matcher to a length" |
| Dot-paths walk structure and yield `undefined` at a missing step rather than throwing | `packages/core/test/Matcher.test.ts` — `describe("getByPath")` |
| A matcher applied to the wrong shape yields false, never an error | `packages/core/test/Matcher.test.ts` — "contains works on arrays and strings only", "gte and lt require numbers" |
| Both sides of a comparison may come from the resource | `packages/core/test/Matcher.test.ts` — "eq resolves a resource reference" |
| `filter` keeps only allowed items, and returns empty when nothing qualifies | `packages/core/test/Qadi.test.ts` — `describe("Qadi.filter")` |
| Policies and matchers survive a JSON round trip | `packages/core/test/Policy.test.ts` — the `FastCheck.letrec` round-trip property |
| Acceptance | `REQ-QD-006` (`features/features/attributes/resource-attributes.feature`) |

The `@REQ-QD-006` feature file carries the three scenarios this model stands on:
a resource whose `state` is `open` is granted, the same rule against `closed` is
denied, and evaluating the rule with no resource at all fails rather than
denying. The third matters most, because it is the one that would silently pass
if a missing resource were quietly treated as `false`.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [04 — Matcher DSL](../behaviors/04-matchers.md) · [05 — Evaluator](../behaviors/05-evaluator.md)_
