# 31 — History-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-31                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

History-based access control constrains a decision by what has already happened.
Every other model here decides from the state of the subject, the resource and
the relations between them; this one decides from the record of prior actions,
which is a different kind of input because it changes when nothing about the
subject or the resource does.

[Chinese Wall](./30-chinese-wall.md) is the famous instance — a prior access to
one company's file removes authority over its competitor's — but it is one shape
of a larger family. Rate limits, velocity checks, cooling-off periods, one-time
actions, quotas and the dynamic half of
[separation of duty](./24-separation-of-duty.md) ask the same question about
different events. This document owns the general design; conflict-of-interest
specifics belong to [30](./30-chinese-wall.md).

## Who asks for it

Anything metered, and anything irreversible. Metered: an API with a per-hour
quota, a clinical system capping how many records one account may open in a
shift, an export surface with a velocity check because bulk extraction is the
signal rather than any single read. Irreversible: a ballot cast once, a discount
redeemed once, a cooling-off period between a password change and a payout.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Additive** |
| Priority | **P3** |
| Enablers required | **E5** — decision history port |
| Breaking change | No |

P3 states demand and cost together: the demand is real but is usually met
outside authorization — a limit at the gateway, a uniqueness constraint in the
database — and the cost is the enabler most at risk of pulling Qadi out of scope.

## What Qadi can express today

Nothing history-dependent. No service holds or reads past decisions:
`EvaluationId` correlates a decision with a span and has no store behind it.

The honest workaround is for the caller to answer the history question itself,
before evaluating, and pass the answer as a subject attribute. It works — and it
pushes the whole model into the caller, who then owns the query, the window and
the definition of an event.

```typescript
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone, EvaluationIdLive, RelationshipResolverNever, allOf,
  check, currentSubjectLayer, eq, hasAttribute, hasRole, labeled, literal, lt,
  makeSubject, not, withAttributes,
} from "@qadi/core";

// The caller's store and the caller's query. Qadi sees neither — only the two
// values they reduce to.
declare const countAttemptsSince: (
  id: string,
  sinceMillis: number,
) => Effect.Effect<number>;
declare const hasClaimed: (id: string) => Effect.Effect<boolean>;

// A quota bound is a constant, so `lt` suffices: the varying side is the
// attribute, not the threshold.
const mayClaim = allOf([
  hasRole("member"),
  labeled("history.rate", hasAttribute("attemptsThisHour", lt(50))),
  labeled("history.once", not(hasAttribute("claimedOffer", eq(literal(true))))),
]);

const program = Effect.gen(function* () {
  // Even in the workaround the window comes from `Clock`, never `Date.now()`.
  const now = yield* Clock.currentTimeMillis;
  const subject = withAttributes(makeSubject({ id: "u-1", roles: ["member"] }), {
    attemptsThisHour: yield* countAttemptsSince("u-1", now - 3_600_000),
    claimedOffer: yield* hasClaimed("u-1"),
  });
  return yield* check(mayClaim, { resource: { id: "offer-9" } }).pipe(
    Effect.provide(currentSubjectLayer(subject)),
  );
}).pipe(
  Effect.provide(
    Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever, EvaluationIdLive),
  ),
);
```

This is a workaround, not the model. The policy reads as an attribute comparison
and says nothing about history: the quota, the window and the meaning of an
attempt are invisible to it, so no reviewer can read the rule and know what it
enforces. An `AttributeResolver` moves the query behind an interface but not the
ownership — it sees only `(subjectId, attribute)`, never the resource, so the
*keyed* question cannot be asked that way at all.

## Proposed API design

### A taxonomy of history questions

The four questions look alike in prose and are not alike in cost. Which of them
the port promises to answer is the whole of the interface design.

| Question | Shape | Cost |
| -------- | ----- | ---- |
| "has this subject ever done X?" | Existence | Cheap; one indexed lookup, no time input |
| "how many times in the last hour?" | Windowed count | Needs a time bound, so a clock, so a determinism story |
| "did this subject do X to *this* object?" | Existence, keyed by object | Cheap; the same index with one more column |
| "what is the most recent X?" | Ordering | Needs a sort, and returns a value rather than a fact |

Rows one and three are one query with an extra predicate: no time input, a
`boolean` answer, and any store answering either answers both. A port promising
only those two is a far smaller commitment than one promising all four, and it
already unlocks [Chinese Wall](./30-chinese-wall.md), one-time actions and
dynamic [separation of duty](./24-separation-of-duty.md) — the cases where the
answer is an authorization decision rather than a meter. Start there; rate
limits stay with the caller until a count is designed on purpose.

### The port

```ts
export interface ActedQuery {
  readonly subjectId: string;
  /** The past action, e.g. `"raised"`. Not the one being attempted. */
  readonly relation: string;
  /** Keyed question when present; "ever, at all" when absent. */
  readonly resourceId: string | undefined;
}

export interface DecisionHistoryShape {
  readonly hasActed: (
    query: ActedQuery,
  ) => Effect.Effect<boolean, DecisionHistoryUnavailable>;
}

export class DecisionHistory extends Context.Service<
  DecisionHistory,
  DecisionHistoryShape
>()("qadi/DecisionHistory") {
  static readonly hasActed = (query: ActedQuery) =>
    DecisionHistory.use((h) => h.hasActed(query));
}

export class DecisionHistoryUnavailable extends Data.TaggedError(
  "qadi/DecisionHistoryUnavailable",
)<{ readonly relation: string; readonly cause: unknown }> {}
```

The policy side is one variant in both polarities, since history is read
negatively as often as positively, plus the two layers every port ships with:

```ts
/** `scope: "resource"` keys by the resource in hand; `"any"` asks "ever". */
export const hasActed: (
  relation: string,
  options?: { readonly scope?: "resource" | "any"; readonly fields?: ReadonlyArray<string> },
) => Policy;
export const hasNotActed: (relation: string, options?: …) => Policy;

/** Fail-closed default: assumes the subject has acted, so `hasNotActed` denies. */
export const DecisionHistoryAssumeActed: Layer.Layer<DecisionHistory>;

/** Deterministic layer over fixed `[subjectId, relation, resourceId]` events. */
export const decisionHistoryFromEvents: (
  events: ReadonlyArray<readonly [string, string, string]>,
) => Layer.Layer<DecisionHistory>;
```

**Three documents now sketch this service and there must be exactly one of it.**
[24](./24-separation-of-duty.md) uses `hasActed` keyed by resource;
[30](./30-chinese-wall.md) needs a read returning *which* member of a conflict
class the subject is engaged with, and adds a `record` write. Reconciling them
is this document's job: members are added one per taxonomy row, deliberately,
never as a general query. 30's read is legitimate — a three-case tagged value
from a closed set is still a fact — but it is the one real pressure to widen
past `boolean`. Its write is **not an evaluation service**: the evaluator must
never call it, exactly as 30 states.

### Two disciplines the port must keep

**It must not become a database.** The temptation with E5 is an expressive query
interface — filters, ranges, projections — because every caller's question
differs slightly and a query language answers all of them. That is how an
authorization library becomes a data layer. The discipline is the return type:
**a boolean, or later a count. Never a result set.** Once the port returns rows,
callers read their own audit log through Qadi, adapters grow pagination, and
[the URS](../urs.md) boundary — Qadi decides, it does not persist — has been
crossed without anyone deciding to. The same rule keeps grant issuance out of
[DAC](./08-dac.md).

**A window is an input, not something the port reads.** If the windowed count is
ever added, its query extends `ActedQuery` with `sinceMillis` and `untilMillis`
— absolute epoch bounds computed by the evaluator from `Clock` — and no adapter
may read a clock of its own. `Date.now()` in an adapter makes every
history-dependent decision untestable, the exact defect
[ADR-QD-012](../decisions/012-deterministic-time-and-ids.md) exists to prevent
and `scripts/check-house-style.mjs` already fails the build over. Passing the
bounds in also puts them in the trace, so a denial can say which hour it counted.

## What it would cost

E5 is a service module, two layers, one error and one `Policy` variant in two
constructors. The variant is the expensive half: per
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) it lands in four
places in one change — schema union, derived type, evaluator, and the FastCheck
generator behind the JSON round-trip property.

**[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible) must be
restated.** It holds today that an evaluation is reproducible given the same
subject, policy and services. History makes evaluation depend on time-varying
external state, so a second call may legitimately differ with all three
unchanged. It must be restated as reproducible **given the same history**, in
the change that lands E5. Left unrestated it does not fail loudly; it becomes
false quietly while continuing to be cited — precisely the drift this
specification exists to prevent.

**[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) is the sharpest
risk.** A store that is down is an error, and `DecisionHistoryUnavailable` must
reach the caller on the error channel; collapsing it to `Deny` makes an outage
indistinguishable from a policy result. Note the asymmetry
[30](./30-chinese-wall.md) has in its own form: for a rate limit, failing open
grants beyond the limit while failing closed denies legitimate traffic. Neither
is obviously right, and that is the argument for erroring — the library cannot
know which failure the caller prefers, so it hands the choice back rather than
picking one silently.

Two more need attention and are not weakened.
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation): the lookup
must be lazy, so a sibling that has already denied triggers no call — and the
relationship short-circuit gap noted in [08](./08-dac.md) should close first.
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed): satisfied by
`DecisionHistoryAssumeActed`, whose polarity is deliberate, since a port
answering `false` would *grant* under `hasNotActed`.

## Verification

Nothing here is built and this document claims no evidence. The workaround
compiled above proves only that attribute comparison works, which `REQ-QD-004`
already establishes; it proves nothing about history.

What would prove each part: a port unit test over `decisionHistoryFromEvents`
covering the keyed and unkeyed questions; a call-counting test that a denied
sibling suppresses the lookup; an error-injection test that an unavailable store
surfaces as a failure and not a `Deny`; a test that `hasNotActed` denies with no
layer wired; the round-trip property once the variant reaches the FastCheck
generator; and, for the restated invariant, a test that two evaluations against
the same history agree while a changed history may differ.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [30 — Chinese Wall](./30-chinese-wall.md) · [24 — Separation of Duty](./24-separation-of-duty.md) · [32 — Usage Control](./32-ucon.md)_
