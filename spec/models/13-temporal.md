# 13 — Temporal Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-13                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Temporal access control makes authority valid only within a window. The window
may sit on the resource — a contractor account that expires, a share link that
dies on Friday — or on the rule itself: approvals only during business hours,
elevation granted for the next thirty minutes. Bertino's Temporal RBAC is the
formal version, attaching a periodic schedule to a *role* so that the role is
enabled and disabled on a calendar rather than assigned administratively.

## Who asks for it

Back-office and financial systems with a business-hours rule, anything issuing
time-boxed elevation, and every application with contractors, trials or
fixed-term engagements. It pairs almost universally with
[role-based](./01-rbac.md) rules — the window narrows a role rather than
replacing it.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Qadi decides temporal policies today with no core change. What it needs is an
`AttributeResolver` that reads the clock, which the caller writes because the
schedule is the caller's business rule.

## How Qadi expresses it

**Time comes from the `Clock` service, never from the ambient clock.** This is
the load-bearing rule of the whole document, and it is enforced mechanically:
`scripts/check-house-style.mjs` fails the build on `Date.now(`, `new Date(` or
`performance.now(` anywhere under `packages/*/src`, with `EvaluationId.ts` the
single named exemption for nondeterminism.

The reason is not purity. A resolver that reads the wall clock makes every
decision depending on it untestable — the predecessor's evaluator did exactly
that, which is why [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md)
exists and why
[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible) can hold at
all. Under a test clock a temporal policy is reproducible; under `Date.now()` it
is not.

```ts
const now: Effect.Effect<number> = Clock.currentTimeMillis;

interface AttributeResolverShape {
  readonly resolve: (
    subjectId: string,
    attribute: string,
  ) => Effect.Effect<unknown, AttributeResolveError>;
}
```

Two shapes of temporal rule follow, and they differ in what they can see:

| Shape | Written as | Cost and limit |
| ----- | ---------- | -------------- |
| Validity is a property of the resource | `hasResourceAttribute("validUntil", gte(cutoff))` | No lookup, but `gte` and `lt` take a **plain number**, so the boundary must be a constant. "Later than *now*" is not expressible on this side |
| Time is a resolved attribute | `hasAttribute("withinBusinessHours", eq(literal(true)))` | One resolver call, which reads `Clock`. The resolver sees `(subjectId, attribute)` and never the resource |

Prefer a **derived boolean or scalar** from the resolver — `withinBusinessHours`,
or an hour-of-day integer — over a raw timestamp. Qadi's numeric matchers are
`gte` and `lt` only, so an interval in a policy becomes an `allOf` of two
comparisons against magic constants, and a wrapping interval (22:00 to 06:00) an
`anyOf` of two of those. Interval logic is clearer written once, in the resolver.

The rows also record an asymmetry: since `resolve` never sees the resource, a
comparison between the clock and a resource field cannot happen inside Qadi at
all. It happens in the resolver, as a subject-side boolean, or in the record, as
a field the caller computed when it loaded the row.

## Worked example

```typescript
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  check,
  currentSubjectLayer,
  eq,
  gte,
  hasAttribute,
  hasResourceAttribute,
  hasRole,
  labeled,
  literal,
  makeSubject,
} from "@qadi/core";

const utcHour = (millis: number): number => Math.floor(millis / 3_600_000) % 24;

// The one place a temporal rule reads time — from `Clock`, so a test clock can
// drive it. Interval logic lives here; the policy sees a boolean.
const BusinessHoursResolver: Layer.Layer<AttributeResolver> = Layer.succeed(
  AttributeResolver,
  {
    resolve: (_subjectId: string, attribute: string) =>
      attribute === "withinBusinessHours"
        ? Effect.map(Clock.currentTimeMillis, (now) => utcHour(now) >= 9 && utcHour(now) < 18)
        : Effect.succeed(undefined),
  },
);

// True TRBAC: the role is enabled on a schedule. Roles are flattened onto the
// subject when it is built, so that is where a schedule can apply.
const buildSubject = (id: string) =>
  Effect.map(Clock.currentTimeMillis, (now) =>
    makeSubject({ id, roles: utcHour(now) < 18 ? ["employee", "approver"] : ["employee"] }),
  );

const canApprove = allOf([
  hasRole("approver"),
  labeled("business hours", hasAttribute("withinBusinessHours", eq(literal(true)))),
  // A constant boundary — the engagement's own cut-off, not "now".
  hasResourceAttribute("validUntil", gte(1_800_000_000_000)),
]);

const program = Effect.gen(function* () {
  const subject = yield* buildSubject("u-1");
  return yield* check(canApprove, {
    resource: { id: "req-1", validUntil: 1_900_000_000_000 },
  }).pipe(Effect.provide(currentSubjectLayer(subject)));
}).pipe(
  Effect.provide(
    Layer.mergeAll(BusinessHoursResolver, RelationshipResolverNever, EvaluationIdLive),
  ),
);
```

## What is missing

**Role enablement lives in the caller.** Bertino's model schedules roles inside
the authorization system. Qadi flattens a subject's roles when the subject is
constructed ([MOD-QD-001](./01-rbac.md)), so the only natural place for a
schedule is that construction — the caller includes `approver` only while its
window is open, and the schedule becomes invisible to the policy. The
alternative keeps it visible — `allOf([hasRole("approver"), withinWindow])` — at
the price of stating the schedule twice, once where the subject is built and
once in every policy naming the role. The choice is between a schedule that is
hidden and one that is duplicated, and it belongs to the application rather than
to each policy.

**Nothing revokes a decision.** A decision is a point-in-time answer. If the
window closes mid-request, work already authorised continues to completion —
Qadi is not in the path after `enforce` has let the effect run
([INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied)
governs the *denied* case only). Continuous re-evaluation during use is usage
control, which needs E5 and E1 and is P3 in [the matrix](./00-adoption-matrix.md).

**Clock skew and calendars are the caller's.** Qadi compares whatever `Clock`
reports against whatever the resource carries, so a window is only as sharp as
the skew between the machines that produced them — prefer generous windows and a
coarse derived boolean over minute-precision comparisons. `Clock.currentTimeMillis`
is UTC milliseconds; local business hours, holidays and daylight-saving
transitions belong in the resolver, being jurisdictional data rather than
authorization logic.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. Adopting it means a resolver in the
caller's codebase plus, if a reference adapter is ever shipped, a scenario
tagged with a newly allocated `REQ-QD` identifier. The mechanics are already
proven: subject attributes by `REQ-QD-004`, resource attributes by
`REQ-QD-006`, roles by `REQ-QD-003`.

What is worth stating plainly is that a resolver built this way is
**deterministically testable** — substitute a test clock, advance it to 09:30
and to 19:30, and assert allow then deny with no sleeping and no flake. That is
the whole return on [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md),
and it is currently unclaimed: no test in this repository uses `TestClock`, the
only mentions being comments explaining why traces *could* be asserted on. A
temporal adapter would be the first thing to make that concrete.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [01 — Role-Based Access Control](./01-rbac.md) · [12 — Context-Aware Access Control](./12-context-aware.md) · [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md)_
