# 28 — Biba

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-28                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

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

| Variant | Status | Priority | Enablers required | Breaking change |
| ------- | ------ | -------- | ----------------- | --------------- |
| **Strict Biba** | Additive | P3 | E1, E4 | No |
| **Low-water-mark Biba** | Additive | P3 | E1, E4, **E5** | No |

The second row is a finding this document contributes. The
[matrix](./00-adoption-matrix.md) records Biba as `E1, E4`, which holds for the
strict model only. Low-water-mark Biba lowers the subject's integrity to that of
the lowest object it has read, so the decision depends on what has already been
read — it is **stateful**, and state about prior access is precisely what the
decision history port (**E5**) supplies. Ring policies, permitting reads down
while still forbidding writes up, stay at `E1, E4` because nothing is remembered.
A relaxation that looks like a mild loosening of the rule needs a whole enabler
the strict model does not, and it is the relaxation anyone would deploy.

## What Qadi can express today

The compartment-free, totally ordered case — for integrity the common one, since
integrity tiers are almost always a simple ladder. A build agent publishes a
release manifest: no-write-up as a floor on the subject, no-read-down as an
enumerated band on the input's provenance.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  check,
  currentSubjectLayer,
  gte,
  hasAttribute,
  hasPermission,
  hasResourceAttribute,
  inArray,
  labeled,
  makeSubject,
  permission,
} from "@qadi/core";

// Integrity rungs: 0 anonymous < 1 community < 2 reviewed < 3 system. Both
// thresholds are literals because `gte` takes a number, not a reference — there
// is no `gte(resource("integrity"))`, so neither side can name the other.
const mayPublishManifest = allOf([
  hasPermission(permission("manifest", "publish")),
  // No write up: the manifest sits at 3, so the writer must already be at 3.
  labeled("no-write-up", hasAttribute("integrity", gte(3))),
  // No read down: the artefact consumed must sit at 3 as well, enumerated.
  labeled("no-read-down", hasResourceAttribute("sourceIntegrity", inArray([3]))),
]);

// The build agent is trusted, but its input came from a reviewed (2) source,
// not a system (3) one. Strict Biba denies — the trusted subject may not read
// down. That is the rule that bites.
const agent = makeSubject({
  id: "build-agent",
  permissions: ["manifest:publish"],
  attributes: { integrity: 3 },
});

const program = check(mayPublishManifest, {
  resource: { id: "manifest-1", sourceIntegrity: 2 },
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(agent),
      AttributeResolverNone,
      RelationshipResolverNever,
      EvaluationIdLive,
    ),
  ),
);
```

The limit is the one [23](./23-label-based.md) records: `gte` and `lt` take a
plain number, so the subject's level cannot be compared against the resource's,
and a policy written this way is pinned to one rung of the ladder rather than
expressing the rule in general.

## Proposed API design

The machinery is the machinery proposed in [27](./27-bell-lapadula.md) —
`SecurityLabel`, the `Dominates` matcher, `action` on `EvaluateOptions` and
`MatcherContext`, and the four coordinated edits any new variant costs. Nothing
new is proposed here; two things differ.

**The comparison direction inverts.** Same predicate, operands swapped:

```ts
// Bell–LaPadula: subject dominates object to read, object dominates subject to write.
// Biba:          object dominates subject to read, subject dominates object to write.
anyOf([
  allOf([hasAction("read"), hasResourceAttribute("label", dominates(subject("integrity")))]),
  allOf([hasAction("write"), hasAttribute("integrity", dominates(resource("label")))]),
]);
```

**Two lattices coexist.** A system needing both confidentiality and integrity
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

## What it would cost

The same as [27](./27-bell-lapadula.md), plus one thing. E1 and E4 are shared
outright — if Bell–LaPadula ships, Biba is a second policy shape over machinery
already present, and the increment is tests plus this document becoming a recipe.

Low-water-mark adds **E5**, which the [matrix](./00-adoption-matrix.md) already
flags as the enabler most at risk of violating scope: it must be a *port* over
the caller's store, exactly as `RelationshipResolver` is, or Qadi starts
persisting, which [the URS](../urs.md) forbids. It also raises a question
Bell–LaPadula never does — whether an evaluation *mutates* the subject's
effective level for later evaluations. If it does, evaluation has a side effect,
a larger departure than adding a matcher. Settle that in an ADR first.

## Verification

Nothing verifies this model, and nothing can: E1, E4 and E5 are all unbuilt, so
there is no dominance relation, no action dimension and no history port to test
against. The compiled example proves its signatures are current, not that Biba is
enforced — its constant thresholds are a projection of the rule onto one rung.

Adopting the model means newly allocated `REQ-QD` scenarios covering at minimum:
a write downwards allowed; a write upwards denied; a read downwards denied under
the strict rule and permitted under a ring policy; and, if low-water-mark ships,
a subject whose level has dropped being denied a write it would have been allowed
before reading. That last is the only test exercising E5, and the one that would
be skipped.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [27 — Bell–LaPadula](./27-bell-lapadula.md) · [29 — Multi-Level Security](./29-mls.md) · [23 — Label-Based Access Control](./23-label-based.md)_
