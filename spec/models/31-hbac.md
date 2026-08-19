# 31 — History-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-31                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): Shipped in part — the existence questions; `DecisionHistoryAssumeActed` withdrawn (CCR-QD-022)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

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
| Status | **Shipped, in part** |
| Priority | **P3** |
| Enablers required | ~~**E5**~~ **shipped** |
| Breaking change | No |

**Shipped: [ADR-QD-020](../decisions/020-decision-history-port.md),
[12 — Decision History](../behaviors/12-history.md),
[INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities),
`@REQ-QD-012`, `packages/core/test/Evaluate.test.ts`,
`packages/testing/test/TestLayers.test.ts`.**

**Rows one and three of the taxonomy below shipped; rows two and four did not.**
Unlike [24](./24-separation-of-duty.md)'s static half or
[34](./34-ngac.md)'s user-space review, **this is a stage rather than a ceiling**:
the windowed count and the ordering question were *deferred on purpose*, not
excluded. This document's own instruction — "start there; rate limits stay with
the caller until a count is designed on purpose" — was followed rather than
overruled, and the two remaining rows need a design, not an enabler.

P3 states demand and cost together: the demand is real but is usually met
outside authorization — a limit at the gateway, a uniqueness constraint in the
database — and the cost was the enabler most at risk of pulling Qadi out of scope.

## What Qadi can express today

**Two of the four questions below, and not the other two.** `DecisionHistory`
holds nothing and reads what the caller's store holds — a *port*, exactly as this
document argued it had to be. What no service does is **count** or **order**.

For the count, the honest workaround remains what it was: the caller answers the
question itself, before evaluating, and passes the answer as a subject attribute.
It works — and it pushes that half of the model into the caller, who then owns the
query, the window and the definition of an event. For the once-ness, the port now
answers directly, and the example shows both halves side by side.

```typescript
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone, EvaluationIdLive, RelationshipResolverNever, allOf,
  check, currentSubjectLayer, decisionHistoryFromEvents, hasAttribute, hasNotActed,
  hasRole, labeled, lt, makeSubject, withAttributes,
} from "@qadi/core";

// The COUNT is still the caller's: their store, their query, their window. Qadi
// sees only the number it reduces to.
declare const countAttemptsSince: (
  id: string,
  sinceMillis: number,
) => Effect.Effect<number>;

// A quota bound is a constant, so `lt` suffices: the varying side is the
// attribute, not the threshold.
const mayClaim = allOf([
  hasRole("member"),
  labeled("history.rate", hasAttribute("attemptsThisHour", lt(50))),
  // The ONCE-NESS is the port's, and it reads as what it is. Compare the line
  // above: nothing there says "history", and a reviewer cannot tell what it
  // enforces without reading the caller's code.
  labeled("history.once", hasNotActed("claimed")),
]);

const program = Effect.gen(function* () {
  // Even in the workaround the window comes from `Clock`, never `Date.now()`.
  const now = yield* Clock.currentTimeMillis;
  const subject = withAttributes(makeSubject({ id: "u-1", roles: ["member"] }), {
    attemptsThisHour: yield* countAttemptsSince("u-1", now - 3_600_000),
  });
  return yield* check(mayClaim, { resource: { id: "offer-9" } }).pipe(
    Effect.provide(currentSubjectLayer(subject)),
  );
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      // A claim on a DIFFERENT offer, so this allows — and the keyed question is
      // demonstrated rather than asserted.
      decisionHistoryFromEvents([["u-1", "claimed", "offer-8"]]),
      EvaluationIdLive,
    ),
  ),
);
```

**The `history.rate` half is still a workaround, and the `history.once` half is
no longer one.** The criticism this document made stands verbatim against the
first: the policy reads as an attribute comparison and says nothing about history,
so the quota, the window and the meaning of an attempt are invisible to it and no
reviewer can read the rule and know what it enforces. The second line now says
what it means.

An `AttributeResolver` moves the query behind an interface but not the ownership —
it sees only `(subjectId, attribute)`, never the resource, so the *keyed* question
cannot be asked that way at all. Which is why the keyed question needed a port of
its own, and got one.

## Proposed API design

### A taxonomy of history questions

The four questions look alike in prose and are not alike in cost. Which of them
the port promises to answer is the whole of the interface design.

| Question | Shape | Cost | Shipped |
| -------- | ----- | ---- | ------- |
| "has this subject ever done X?" | Existence | Cheap; one indexed lookup, no time input | **Yes** — `hasActed(e, { scope: "Any" })` |
| "how many times in the last hour?" | Windowed count | Needs a time bound, so a clock, so a determinism story | No — deferred |
| "did this subject do X to *this* object?" | Existence, keyed by object | Cheap; the same index with one more column | **Yes** — `scope: "Resource"`, the default |
| "what is the most recent X?" | Ordering | Needs a sort, and returns a value rather than a fact | No — deferred |

Rows one and three are one query with an extra predicate: no time input, a
`boolean` answer, and any store answering either answers both. A port promising
only those two is a far smaller commitment than one promising all four, and it
already unlocks [Chinese Wall](./30-chinese-wall.md), one-time actions and
dynamic [separation of duty](./24-separation-of-duty.md) — the cases where the
answer is an authorization decision rather than a meter. Start there; rate
limits stay with the caller until a count is designed on purpose.

*"Start there" was followed exactly.* Rows one and three shipped as one query with
one extra column, precisely as priced — and the port's one member answers both,
because `resourceId` is `string | undefined` rather than two methods.

### The port

> **Superseded by [ADR-QD-020](../decisions/020-decision-history-port.md).** The
> port shipped, and it is not quite the shape sketched below. Two differences
> matter: it returns `"Acted" | "NotActed" | "Unknown"` rather than a boolean,
> because no boolean default is fail-closed for *both* polarities — the trap this
> document was first to spot turned out to have no boolean solution; and the
> query field is named `event`, not `relation` or `action`, to keep it apart from
> `hasAction` (E1) and `hasRelationship`. The sketch is left as written, because
> the reasoning that led here is worth more than a tidy record.
>
> Two further differences this banner did not name. `scope` shipped
> **capitalised** — `HistoryScope = "Resource" | "Any"`, defaulting to
> `"Resource"` — not the lowercase spelling below. And the default layer is
> **`DecisionHistoryUnknown`**: `DecisionHistoryAssumeActed` never existed, and the
> paragraph that proposes it is withdrawn below. `DecisionHistoryUnavailable`
> carries `{ event, cause }`, not `{ relation, cause }`.

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
  "DecisionHistoryUnavailable",
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
That requirement was met: [ADR-QD-020](../decisions/020-decision-history-port.md)
reconciles them into a single one-member port, and the paragraph below is the
reasoning it built on.

[24](./24-separation-of-duty.md) uses `hasActed` keyed by resource;
[30](./30-chinese-wall.md) needs a read returning *which* member of a conflict
class the subject is engaged with, and adds a `record` write. Reconciling them
is this document's job: members are added one per taxonomy row, deliberately,
never as a general query. 30's read is legitimate — a three-case tagged value
from a closed set is still a fact — but it is the one real pressure to widen
past `boolean`. Its write is **not an evaluation service**: the evaluator must
never call it, exactly as 30 states.

*Half right, and it is the most interesting thing across these four documents.*
The pressure to widen past `boolean` was real and it **won** — but not for 30's
reason. 30's `Engagement` union was declined; the third value that shipped is
`"Unknown"`, and it exists because negation has no fail-closed boolean, which is
the trap [24](./24-separation-of-duty.md) spotted from the polarity side. So two
documents reached the same conclusion from opposite directions and neither had the
whole argument. Recorded from the other side in
[30 — Chinese Wall](./30-chinese-wall.md#the-third-value-came-back-for-another-reason).

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

*Both disciplines held.* One member, one three-valued answer, never a result set.
The window discipline is **untested because unbuilt**, and it stands as the
standing instruction for row two: whoever designs the count inherits it.

## What it cost

E5 is a service module, two layers, one error and one `Policy` variant in two
constructors. The variant is the expensive half: per
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) it lands in four
places in one change — schema union, derived type, evaluator, and the FastCheck
generator behind the JSON round-trip property.

*One miss.* **Two** variants shipped, `HasActed` and `HasNotActed`, not one in two
constructors — because a trace that records which question was asked is worth more
than a schema entry saved, and one node with a polarity flag would have made
`hasNotActed` look like `not(hasActed)`, which is the single thing
[ADR-QD-020](../decisions/020-decision-history-port.md) exists to prevent.

**[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) must be
restated.** It holds today that an evaluation is reproducible given the same
subject, policy and services. History makes evaluation depend on time-varying
external state, so a second call may legitimately differ with all three
unchanged. It must be restated as reproducible **given the same history**, in
the change that lands E5. Left unrestated it does not fail loudly; it becomes
false quietly while continuing to be cited — precisely the drift this
specification exists to prevent.

*Restated in CCR-QD-016*, in the change that landed the port, as this asked.

**[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) is the sharpest
risk.** A store that is down is an error, and `DecisionHistoryUnavailable` must
reach the caller on the error channel; collapsing it to `Deny` makes an outage
indistinguishable from a policy result. Note the asymmetry
[30](./30-chinese-wall.md) has in its own form: for a rate limit, failing open
grants beyond the limit while failing closed denies legitimate traffic. Neither
is obviously right, and that is the argument for erroring — the library cannot
know which failure the caller prefers, so it hands the choice back rather than
picking one silently.

*Held, and the argument was adopted verbatim.* That last sentence is the
reasoning [ADR-QD-020](../decisions/020-decision-history-port.md) gives for the
error channel, in these terms.

Two more needed attention and neither was weakened.
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation): the lookup
must be lazy, so a sibling that has already denied triggers no call — and the
relationship short-circuit gap noted in [08](./08-dac.md) should close first.
*It closed first, as asked* (CCR-QD-009), and the laziness is asserted by
`Evaluate.test.ts`.

> **Withdrawn.**
> [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) is satisfied by
> **`DecisionHistoryUnknown`**. The observation is right — a port answering `false`
> would grant under `hasNotActed` — and the conclusion does not follow: a
> `true`-answering default breaks `hasActed` instead, and **no boolean default is
> fail-closed for both polarities**. This document proposed shipping *both*
> polarities of the policy, which is precisely what makes a boolean default
> impossible. `DecisionHistoryAssumeActed` never existed.

## Verification

**Every item this document asked for exists.** The checklist below was written as
a forecast; each row now names what satisfies it.

| Claim | Evidence |
| ----- | -------- |
| The unkeyed question — "ever, at all" | `Evaluate.test.ts`, `hasActed(e, { scope: "Any" })`; [BEH-QD-092](../behaviors/12-history.md) |
| The keyed question — "to *this* object" | `Evaluate.test.ts`, the default `scope: "Resource"`; `@REQ-QD-012` |
| A denied sibling suppresses the lookup | `Evaluate.test.ts` ("an unevaluated history branch performs no lookup") |
| An unavailable store surfaces as a failure, not a `Deny` | `Evaluate.test.ts` ("an unreachable store is an error, not a denial"), `ACL011`, [BEH-QD-093](../behaviors/12-history.md) |
| `hasNotActed` denies with no layer wired | `Evaluate.test.ts`, `packages/testing/test/TestLayers.test.ts`, [INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities) |
| `hasNotActed` is not `not(hasActed)` | `Evaluate.test.ts`, [BEH-QD-091](../behaviors/12-history.md), `@REQ-QD-012` |
| Wire format | The round-trip property in `packages/core/test/Policy.test.ts`, with both variants in the generator |
| Reproducibility given the same history | [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) as restated (CCR-QD-016) |
| Acceptance | `@REQ-QD-012`, `features/features/history/history.feature` — eight scenarios |
| **Windowed count** | **None, and none is planned.** Rate limits stay with the caller until a count is designed on purpose |
| **Ordering / most-recent** | **None.** Returns a value rather than a fact, and nothing has asked for it |

**This document allocates no `REQ-QD` identifier of its own**, and that is
correct rather than an omission: its checklist was written against the *port*, and
`@REQ-QD-012` is the port's tag. The two models that needed a composition verified
— [30](./30-chinese-wall.md) and [33](./33-tbac.md) — carry `@REQ-QD-018` and
`@REQ-QD-019`, because a composition is a claim the port's own scenarios cannot
make.

**What the forecast got wrong.**

- *"Additive."* Nothing additive was needed for the two rows that shipped beyond
  the shared port, and the two that did not ship need a *design*, not an enabler.
- *"Nothing history-dependent."* True when written, false the day the port landed,
  and the sentence stayed for five revisions of the matrix.
- *"One `Policy` variant in two constructors."* Two variants.
- *`scope: "resource" | "any"`.* Capitalised, and defaulting to `"Resource"`.
- *`DecisionHistoryAssumeActed`.* Withdrawn above; no boolean default works.

**And what it got right**, which is most of it: the port must not become a
database, and it has not; a window is an input rather than something the port
reads, and that instruction still governs row two; and the requirement that
settled the whole design — *"three documents now sketch this service and there
must be exactly one of it"* — was met.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [30 — Chinese Wall](./30-chinese-wall.md) · [24 — Separation of Duty](./24-separation-of-duty.md) · [32 — Usage Control](./32-ucon.md)_
