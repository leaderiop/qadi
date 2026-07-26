# 28 — Biba

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-28                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): Shipped and verified as `@REQ-QD-020`; the E5 forecast corrected — a water mark is an aggregate the port cannot supply; the shadowing hazard recorded; the proposed API promoted to the shipped form; revisions absorbed by CCR-QD-012 and CCR-QD-017 without a bump now recorded (CCR-QD-023)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Biba is the integrity dual of [Bell–LaPadula](./27-bell-lapadula.md). Same
lattice, same dominance relation, same asymmetry between reading and writing —
the arrows point the other way. Where Bell–LaPadula stops secrets flowing
downwards, Biba stops corruption flowing upwards.

| | Bell–LaPadula (confidentiality) | Biba (integrity) |
| - | ------------------------------- | ---------------- |
| Read | No read **up** | No read **down** |
| Write | No write **down** (★-property) | No write **up** |

A subject at integrity level *i* may read only objects at *i* or above and write
only objects at *i* or below. Everything mechanical — the lattice type, the
dominance predicate, the `Dominates` matcher, the action dimension, the
serialization question — is the machinery [27](./27-bell-lapadula.md) describes,
unchanged, and is not repeated here. What is *not* shared is how the two models
behave in use.

## Who asks for it

Almost nobody asks for Biba by name, and the inversion is why. Bell–LaPadula's
★-property is the famously counter-intuitive one — a Secret analyst may not write
an Unclassified memo — but it is livable, because writing downwards is occasional
and can be routed through a trusted downgrader. Biba's no-read-down is worse,
because reading downwards is what software does all day. A trusted service may
not read a request body; a build system may not read a third-party dependency; a
privileged process may not read a user-supplied file. Strict Biba forbids the
ordinary case, not the exceptional one, so a system enforcing it faithfully
cannot accept input. It appears in practice only relaxed, usually under another
name:

- **Windows Mandatory Integrity Control** — Low / Medium / High / System labels,
  no-write-up enforced and no-read-down largely dropped. Protected Mode was the
  motivating case: browser content runs Low and cannot write anything Medium.
- **Taint tracking** — a value derived from untrusted input carries the taint and
  a sink refuses it. Low-water-mark Biba in a language runtime, not a decision.
- **Supply-chain provenance** — SLSA tiers and signed attestations: "built only
  from inputs at or above this tier". The live commercial instance, and the one
  most likely to reach Qadi.
- **"Untrusted input must not reach a privileged sink"** — the everyday
  discipline, normally enforced by types, a linter or review, none of which ask
  an authorization service anything. Hence the central reason Biba is rarely
  requested here: the model is ubiquitous and its *enforcement point* is almost
  never a policy decision.

## Status

| Property | Strict Biba | Low-water-mark Biba |
| -------- | ----------- | ------------------- |
| Status | **Shipped** | **Shipped** |
| Priority | **P3** | **P3** |
| Enablers required | ~~**E1, E4**~~ **shipped**; none outstanding | ~~**E1, E4**~~ **shipped**; none outstanding |
| Breaking change | No | No |

**Shipped: [ADR-QD-021](../decisions/021-label-lattice.md),
[ADR-QD-018](../decisions/018-action-dimension.md),
[BEH-QD-098–099](../behaviors/13-labels.md),
[INV-QD-015](../invariants.md#inv-qd-015-incomparable-labels-deny-in-both-directions),
`@REQ-QD-020`,
`packages/core/test/Evaluate.test.ts`.** Nothing was built for this model.
Bell–LaPadula's machinery is Biba's machinery with the two operands exchanged, so
adoption was scenarios and this document.

**Low-water-mark, shipped by a different route than this document forecast:
[ADR-QD-005](../decisions/005-lazy-attribute-resolution.md),
[BEH-QD-034](../behaviors/05-evaluator.md), `@REQ-QD-020`.** See below.

### The E5 forecast was wrong

Revision 1.0 contributed a finding, and the [matrix](./00-adoption-matrix.md)
adopted it: low-water-mark Biba lowers the subject's integrity to that of the
lowest object it has read, so the decision depends on what has already been read
— it is **stateful**, and state about prior access is what the decision history
port (**E5**) supplies.

The first half holds. The second does not. `hasActed` answers a **membership
question about one named event** and returns no value
([ADR-QD-020](../decisions/020-decision-history-port.md)); a water mark is a
**minimum over the set of everything read**. The port cannot compute it, and was
deliberately built not to. Encoding each rung into an event name —
`hasNotActed("read-below-2")` — would work and is the route this document would
have taken, at the cost of enumerating the ladder: exactly the defect it complains
about two sections below.

What the model actually needs is for the caller to maintain the mark and Qadi to
resolve it live, which is `AttributeResolver` and therefore **E4 alone**. The
mistake is worth naming precisely, because it is the one this whole document set
is prone to: *stateful* was read as *needs the state service*, when the state in
question was never a set of past decisions but a single derived number.

That also settles the question [What it cost](#what-it-cost) raised — whether
evaluation *mutates* the subject's effective level — with no new ADR. Qadi never
writes, because ADR-QD-020 declined the `record` write on
[MOD-QD-030](./30-chinese-wall.md)'s argument, so Qadi never mutates. The caller
mutates its own store between evaluations, and each evaluation stays reproducible
given the same resolved attributes (INV-QD-008). The ADR this document asked for
had already been written; it just was not numbered 025.

Ring policies, permitting reads down while still forbidding writes up, need
nothing remembered at all. All three variants land on `E4`.

## The shape it took

The whole model, as one stored policy. `dominates` carries a `ValueRef`, so both
operands are runtime data and neither side is pinned to a rung of the ladder.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  anyOf,
  check,
  currentSubjectLayer,
  dominates,
  hasAction,
  hasAttribute,
  hasResourceAttribute,
  labeled,
  makeSubject,
  resource,
  subject,
} from "@qadi/core";

// Bell-LaPadula: subject dominates object to read, object dominates subject to write.
// Biba:          object dominates subject to read, subject dominates object to write.
const biba = anyOf([
  allOf([
    hasAction("read"),
    labeled("no-read-down", hasResourceAttribute("label", dominates(subject("integrity")))),
  ]),
  allOf([
    hasAction("write"),
    labeled("no-write-up", hasAttribute("integrity", dominates(resource("label")))),
  ]),
]);

// A trusted build agent whose input came from a reviewed source, not a system one.
// Strict Biba denies the READ — the trusted subject may not read down. That is the
// rule that bites, and the reason nobody deploys this unrelaxed.
const agent = makeSubject({
  id: "build-agent",
  attributes: { integrity: { level: 3, compartments: [] } },
});

const program = check(biba, {
  action: "read",
  resource: { id: "vendored-dependency", label: { level: 1, compartments: [] } },
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(agent),
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  ),
);
```

A ring policy — reads down permitted, writes up still refused — is this tree with
the read arm's comparison dropped, so `hasAction("read")` stands alone. That is
the entire relaxation, and it is what Windows Mandatory Integrity Control
enforces.

### Low-water-mark, and the attribute that must not exist

The mark is an aggregate, so the caller computes it and Qadi resolves it. The
attribute name is load-bearing:

```typescript
import {
  allOf,
  dominates,
  hasAction,
  hasAttribute,
  labeled,
  resource,
} from "@qadi/core";

// `effectiveIntegrity`, NOT `integrity` — and the subject must not carry it.
//
// Per BEH-QD-034 `HasAttribute` reads the subject's own attributes first and calls
// `AttributeResolver` only on a miss. A caller who maintains a water mark AND
// carries the attribute naming it on the subject gets the static value, the
// resolver is never asked, and every write the mark should have refused is
// granted. It fails open and raises nothing.
const lowWaterMark = allOf([
  hasAction("write"),
  labeled("lwm.no-write-up", hasAttribute("effectiveIntegrity", dominates(resource("label")))),
]);
```

### Two lattices coexist

A system needing both confidentiality and integrity
carries two independent lattices, and a subject's position in one says nothing
about its position in the other — a Top Secret analyst may be a low-integrity
producer. Composition needs no further design:

```ts
const secureRead = allOf([blpRead, bibaRead]);
```

The cost is not the composition but the labelling: every subject and object
carries two labels kept accurate by two different processes. That administrative
burden, not any technical obstacle, is why dual-lattice systems are rare outside
defence.

## What it cost

Nothing but scenarios and this document. E1 and E4 were shared outright with
[27](./27-bell-lapadula.md), so Biba was a second reading of machinery already
present — twelve scenarios, four unit tests, and the forecast that this document
would "become a recipe" is the one thing it got exactly right.

What the forecast got wrong:

- **The E5 dependency.** Corrected above. A water mark is an aggregate, not a set
  of past decisions, and `AttributeResolver` was always the mechanism.
- **"Settle that in an ADR first."** The ADR existed. ADR-QD-020 declined the
  `record` write, so no evaluation mutates anything and the side-effect question
  never arises.
- **"If Bell–LaPadula follows."** It did not need to. The machinery shipped as
  E4, independent of whether 27's own scenarios were ever written — and at the
  time of writing they were not.
- **The scalar projection.** Revision 1.0's example enumerated one rung with
  `gte` and `inArray` and explained that "neither side can name the other".
  `dominates` takes a `ValueRef`, so both sides name each other, and the general
  rule is one policy.

One cost this document never anticipated, because it belongs to a later enabler:
**a Biba policy does not compile to a database predicate.** `Dominates` is among
the matchers `toPredicate` refuses, so label-based row filtering is out of reach —
see [35](./35-row-level.md) and [36](./36-cell-level.md).

## Verification

Every scenario revision 1.0 asked for exists, and two it did not.

| Claim | Evidence |
| ----- | -------- |
| A write downwards is permitted | `@REQ-QD-020`, `Evaluate.test.ts` |
| A write upwards is refused, attributed to `no-write-up` | `@REQ-QD-020` |
| A read downwards is refused — the rule that bites | `@REQ-QD-020`, `Evaluate.test.ts` |
| A read upwards is permitted, where Bell–LaPadula refuses | `@REQ-QD-020`, `Evaluate.test.ts` |
| Acting at your own level is permitted; dominance is reflexive | `@REQ-QD-020`, BEH-QD-098 |
| Incomparable compartments refuse a write a scalar would allow | `@REQ-QD-020`, INV-QD-015 |
| A producer with no integrity label is denied, not errored | `@REQ-QD-020`, ADR-QD-021 |
| A ring policy permits reads down and still refuses writes up | `@REQ-QD-020` (two scenarios) |
| A lowered water mark refuses the write an intact one allows | `@REQ-QD-020`, `Evaluate.test.ts` |
| The whole tree survives a round trip through JSON | `Evaluate.test.ts` |
| **A static attribute shadows the mark and the write is granted** | `@REQ-QD-020`, `Evaluate.test.ts` — asserted **as a hazard**; the grant is the defect |
| **A Biba policy does not compile to a row predicate** | `Predicate.test.ts` — stated as a limit, not a gap |

Two of these were not in the 1.0 list. The shadowing hazard is a consequence of
BEH-QD-034 that no document had drawn out, and it is the dangerous direction: the
mark is silently ignored and nothing is raised. The unit test carries the half BDD
cannot — that the resolver is **not called at all** — because that is what proves
why the grant happens rather than merely that it does.

The compiled examples are now the general rule rather than a projection onto one
rung, so `pnpm spec:examples` proves the model as written, not only that its
signatures are current.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [27 — Bell–LaPadula](./27-bell-lapadula.md) · [29 — Multi-Level Security](./29-mls.md) · [23 — Label-Based Access Control](./23-label-based.md)_
