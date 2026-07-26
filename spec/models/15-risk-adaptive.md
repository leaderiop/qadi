# 15 — Risk-Adaptive Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-15                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Risk-adaptive access control, as NIST and ODNI framed it, weighs a computed
**risk** against the **operational need** for an access and permits when need
outweighs risk. The rule is not a fixed function of who the subject is; it is a
function of how the situation looks at the moment of the request.

Contemporary practice calls the same idea adaptive or continuous-access
authorisation, and its inputs are recognisable: impossible travel between two
sign-ins, an unusual volume of reads, a device never seen before, a credential
appearing in a breach feed. Each folds into a score; the score is compared
against a threshold.

## Who asks for it

Applications where the same subject is sometimes trustworthy and sometimes not —
consumer banking, workforce access to customer records, any admin console
reachable from the open internet. It is also the model most often bought rather
than built: the score usually comes from an identity provider or a fraud vendor,
which makes the boundary between the scorer and the decider the interesting part.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Qadi decides risk-adaptive rules today with no core change, provided the rule is
a threshold. What it needs is an `AttributeResolver` over the caller's risk
engine.

## How Qadi expresses it

**The score comes from the resolver; the threshold lives in the policy.**

```ts
// Resolved, because a risk score is never a claim the subject carries.
hasAttribute("riskScore", lt(70));
```

That split is the whole recipe, and it is a good split. The model computing risk
changes constantly — new signals, new weights, a retrained classifier every
quarter — and belongs to whoever owns the signals. The rule saying *what risk is
tolerable for this operation* changes rarely, is the half a reviewer must read,
and is serialisable data that can be diffed.

### Thresholds, not arithmetic

`gte` and `lt` are the only numeric matchers: sufficient for a threshold,
deliberately insufficient for anything else. Qadi has no arithmetic and will not
compute `risk − need`, because a `Matcher` is data and giving it an expression
language would make the policy format a calculator
([BEH-QD-025](../behaviors/04-matchers.md)). If a model genuinely needs
need-versus-risk rather than a bare ceiling, **the resolver must return the
already-combined figure** — resolve `"riskMargin"`, compute it where the model
lives, and let the policy say `gte(0)`.

### One lookup per node

The evaluator asks the resolver at each node needing the value, which is what
preserves short-circuiting
([ADR-QD-005](../decisions/005-lazy-attribute-resolution.md),
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)). A policy
comparing `riskScore` against two thresholds therefore calls the engine twice.
Scoring is usually a network call, so a production resolver should memoise per
evaluation — the resolver's business, not the evaluator's.

## Worked example

Risk-tiered field visibility: a low-risk session reads the whole account, a
moderate-risk one a reduced view, a high-risk one nothing.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  anyOf,
  currentSubjectLayer,
  decide,
  hasAttribute,
  hasPermission,
  lt,
  makeSubject,
  permission,
  project,
  type AttributeResolveError,
} from "@qadi/core";

// The caller's risk engine — device reputation, travel plausibility, breach
// feeds. Qadi never sees the model, only the figure it produces.
declare const scoreSubject: (
  subjectId: string,
) => Effect.Effect<number, AttributeResolveError>;

const RiskResolver: Layer.Layer<AttributeResolver> = Layer.succeed(AttributeResolver, {
  resolve: (subjectId: string, attribute: string) =>
    attribute === "riskScore" ? scoreSubject(subjectId) : Effect.succeed(undefined),
});

// Tiers, ordered from least to most restrictive. `anyOf` defaults to
// `fieldStrategy: "First"`, so the first branch that allows supplies the visible
// set — which makes this ordering the whole of the rule. Reverse the branches
// and every low-risk session silently loses `balance`.
const riskTier = anyOf([
  hasAttribute("riskScore", lt(30)),
  hasAttribute("riskScore", lt(70), { fields: ["id", "holder", "status"] }),
]);

// `allOf` intersects, and `hasPermission` carries no field set — the top of the
// lattice — so the tier alone decides the columns.
const canReadAccount = allOf([hasPermission(permission("account", "read")), riskTier]);

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-7", permissions: ["account:read"] })),
  RiskResolver,
  RelationshipResolverNever,
  EvaluationIdLive,
);

declare const loadAccount: (
  id: string,
) => Effect.Effect<{ id: string; holder: string; status: string; balance: number }>;

// A score of 45 allows through the second tier: `balance` is dropped rather than
// the request refused. 85 denies, and the trace records the threshold not met.
const program = Effect.gen(function* () {
  const decision = yield* decide(canReadAccount, { resource: { id: "acct-9" } });
  return project(decision, yield* loadAccount("acct-9"));
}).pipe(Effect.provide(services));
```

## What is missing

**~~Step-up is the real limitation.~~ Closed.** RAdAC's characteristic response
to elevated risk is not "deny" but "allow, subject to an obligation" —
re-authenticate, notify the account holder, queue the access for review,
watermark the export. `Decision` was `Allow | Deny` with no channel for a duty
the caller must discharge. That was enabler **E2** in the
[matrix](./00-adoption-matrix.md), and it has shipped
([ADR-QD-019](../decisions/019-obligations.md)):

```ts
obliged(obligation("step-up", { method: "webauthn" }), elevatedRiskBranch)
```

`enforce` refuses to run the guarded work until the step-up is discharged, so
the middle answer is now a decision rather than an interpretation.

The two options this document previously listed remain available and are still
worth knowing, because neither needs a handler. Deny, and let the caller read the
denial reason and mount its own step-up flow; that works, but the interpretation
lives outside the policy. Or allow with reduced field visibility, as above —
genuinely useful, entirely within shipped capability
([MOD-QD-007](./07-field-level.md)), and honest about being a narrower grant
rather than a deferred one. What must not be done is to smuggle a step-up
requirement in as a fabricated attribute and hope the caller notices.

**A risk engine is exactly the kind of dependency that fails**, so
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) bites hard here.
A resolver whose scoring service times out must fail the Effect. It must not
return `0`, and it must not return `100`. Scoring an unreachable engine as `0`
treats *unknown* as *safe*: the outage becomes a window in which every rule here
silently passes, which is precisely the failure an attacker would induce.
Scoring it as `100` treats unknown as *hostile* — no breach, but the fault is now
indistinguishable from a correct denial, so an outage presents as a wave of
legitimate refusals and the on-call engineer goes hunting a permissions bug.
Both convert a fault into a decision.

**Determinism.** A score that moves between evaluations makes decisions
irreproducible. [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible)
holds *given the same subject, policy and services*, so a fixed test resolver
restores it completely. In production it does not hold, and that is inherent to
the model rather than a gap to close. The consequence is that the **trace is the
only record of why a given decision went the way it did**: a denial re-run an
hour later against a recovered session will allow, and nothing else explains the
first outcome. Qadi emits traces
([ADR-QD-009](../decisions/009-observability-via-effect.md)) and stores none, so
retention is the adopter's.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature.

Its mechanics are each proven independently: resolved attributes and the numeric
matchers by `REQ-QD-004`, field merging and `First` ordering by `REQ-QD-007`,
lazy per-node resolution by the call-counting tests behind
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), and error
propagation by the "attribute resolution errors propagate rather than denying"
case in `packages/core/test/Evaluate.test.ts`. The worked example compiles in
CI, so its signatures are current even though its behaviour is unasserted.

Adopting it means a resolver in the caller's codebase and, if a reference
adapter is ever shipped, a newly allocated `REQ-QD` scenario covering three
cases: a score below the threshold allowing, a score above it denying, and a
**scoring failure surfacing as an error rather than as either outcome**. The
third is the one that would be skipped, and it is the one this model exists to
get right.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [02 — Attribute-Based Access Control](./02-abac.md) · [07 — Field-Level Authorization](./07-field-level.md) · [16 — Trust- and Reputation-Based Access Control](./16-trust.md)_
