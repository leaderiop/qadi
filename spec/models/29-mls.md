# 29 — Multi-Level Security

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-29                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Multi-level security is the general form that Bell–LaPadula and Biba are two
instances of. Denning's 1976 formulation states it without reference to reading
or writing at all: a finite set of **security classes**, a **partial order**
between them, a **least upper bound** and a **greatest lower bound** for any
pair, and one rule — information may flow from `A` to `B` only when `B`
dominates `A`. The standard class is a pair: a hierarchical **level** and a set
of non-hierarchical **compartments**, so `(Secret, {CRYPTO})` dominates
`(Confidential, {CRYPTO})` and is incomparable with `(Secret, {BIO})`.

This document is the shared structure. Its neighbours are the instances:

| Document | What it adds to the lattice |
| -------- | --------------------------- |
| [27 — Bell–LaPadula](./27-bell-lapadula.md) | Confidentiality. Read-down, write-up |
| [28 — Biba](./28-biba.md) | Integrity. The same lattice, both rules inverted |
| [23 — Label-Based Access Control](./23-label-based.md) | Nothing — it is label *comparison*, P1 and expressible today, and not a lattice at all |

That last row is the distinction most often lost. Comparing a clearance against
a label is an ordering on one axis, and ships today; a lattice is a partial
order with joins, and is enabler **E4**.

## Who asks for it

Almost nobody, and the priority reflects that. The genuine askers are defence
and intelligence systems built to a formal classification policy, and the
database engines implementing that policy for them — Oracle Label Security,
SELinux's MLS layer, Trusted Solaris. Everyone else who says "MLS" has a
totally-ordered clearance scheme, which is [23](./23-label-based.md) and needs
no core change. The general lattice is specified anyway because Bell–LaPadula
and Biba both need E4, and designing it once here is what stops E4 being
designed twice and differently.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Additive** |
| Priority | **P3** |
| Enablers required | ~~**E1, E4**~~ **shipped**; none outstanding |
| Breaking change | No |

E4 supplies dominance; E1 supplies the action dimension the two instances need
to tell a read from a write, and E1 has shipped
([ADR-QD-018](../decisions/018-action-dimension.md)). The lattice alone needs
only E4 — [27](./27-bell-lapadula.md) and [28](./28-biba.md) are the documents
that need both — and this row was listed with both because a lattice with no flow
rule decides nothing.

## What Qadi can express today

A **chain** — totally ordered, no compartments — is a degenerate lattice, and
any finite partial order can be enumerated edge by edge. The policy below
writes the dominance relation out as a table: one rung per clearance, paired
with the classifications that clearance dominates.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  anyOf,
  check,
  currentSubjectLayer,
  hasAttribute,
  hasResourceAttribute,
  inArray,
  makeSubject,
} from "@qadi/core";

// One rung per clearance, pairing it with the down-set it dominates. This is
// the order relation transcribed by hand, not computed from the labels.
const rung = (clearance: string, dominated: ReadonlyArray<string>) =>
  allOf([
    hasAttribute("clearance", inArray([clearance])),
    hasResourceAttribute("classification", inArray(dominated)),
  ]);

const mayRead = anyOf([
  rung("secret", ["secret", "confidential", "public"]),
  rung("confidential", ["confidential", "public"]),
  rung("public", ["public"]),
]);

const program = check(mayRead, {
  resource: { id: "doc-1", classification: "confidential" },
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(
        makeSubject({ id: "u-1", attributes: { clearance: "confidential" } }),
      ),
      AttributeResolverNone,
      RelationshipResolverNever,
      EvaluationIdLive,
    ),
  ),
);
```

**This is not a lattice, and should not be called one.** It cannot compute a
**join**, so nothing here can say what class a combined document belongs to. It
does not scale: `n` levels cost `n` rungs, but `c` compartments cost `n × 2^c`,
and the second compartment is where transcription stops being reviewable. And
it is only as correct as the transcription — a missing row is a silent denial,
an extra row a silent allow, and nothing in the tree can tell you which.
Transcribe a chain; do not transcribe compartments.

## Proposed API design

> **Superseded by [ADR-QD-021](../decisions/021-label-lattice.md).** E4 shipped,
> and in two respects it is *cheaper* than sketched below. `compartments` is an
> array rather than a `ReadonlySet`, and there is **no `SecurityLabel` codec at
> all** — the `Dominates` matcher carries a `ValueRef` and no label, so both
> operands are runtime data and the set-ordering hazard described below never
> arises. The comparison is four-valued (`Equal` is named separately) and `join`
> and `meet` were declined as out of scope. The sketch is left as written.

Nothing below existed when this was written; these signatures are proposed, hence
`ts` fences.

The class, restricted to the standard form, with its codec:

```ts
interface SecurityLabel {
  readonly level: number;
  readonly compartments: ReadonlySet<string>;
}

// ReadonlySet has no JSON form: the encoded side is an array of strings.
const SecurityLabel: Schema.Codec<SecurityLabel>;
```

The lattice operations, as ordinary functions over that type:

```ts
// The three-valued form. `undefined` is incomparable — neither dominates.
type Ordering = "Dominates" | "DominatedBy" | "Equal" | undefined;
const compare: (a: SecurityLabel, b: SecurityLabel) => Ordering;

// a.level >= b.level && a.compartments ⊇ b.compartments. Defined as
// `compare(a, b) !== "DominatedBy" && compare(a, b) !== undefined`.
const dominates: (a: SecurityLabel, b: SecurityLabel) => boolean;

const join: (a: SecurityLabel, b: SecurityLabel) => SecurityLabel; // lub
const meet: (a: SecurityLabel, b: SecurityLabel) => SecurityLabel; // glb
```

A `Matcher` variant, so dominance can be asserted inside a policy. The
constructor carries the same name in `Matcher` as the predicate does in
`SecurityLabel`, and [27](./27-bell-lapadula.md) and [28](./28-biba.md) both
write it that way:

```ts
type Dominates = { readonly _tag: "Dominates"; readonly ref: ValueRef };
const dominates: (ref: ValueRef) => Matcher;

// "the subject's clearance dominates the resource's classification"
hasAttribute("clearance", dominates(resource("classification")));
```

This would be the first matcher taking a `ValueRef` that is not `eq` or `neq`,
and that is the point: dominance relates two *live* values, which is exactly
what the shipped matchers cannot do.

## What it would cost

**Where the lattice is declared.** Qadi has nowhere to put one — policies are
self-contained trees and the library has no ambient configuration. Three
options:

| Option | Cost |
| ------ | ---- |
| A `Context.Service` holding the lattice | A service every caller must provide, a new unwired-service denial path, and a policy whose meaning depends on its environment |
| A field on the `Dominates` matcher variant | The lattice serialises into every policy mentioning it, and two policies can disagree about it |
| Restrict to `(level, compartments)`, computed structurally | No declaration at all |

**Take the third.** Dominance on `(level, compartments)` is `≥` on the level
and `⊇` on the compartments — computable from the two labels with nothing else
in scope. It needs no new configuration surface, it serialises cleanly because
the data already travels in the policy, and it covers the schemes anyone
actually operates, because the standard form *is* the standard form. A caller
with a genuinely irregular lattice can still enumerate it, as above.

**Boolean or three-valued — the central design question for E4.** Dominance is
a **partial** order, so a comparison has three answers, not two: `A` dominates
`B`, `B` dominates `A`, or neither. A function returning `boolean` collapses
the third into `false`, which is *correct* for a dominance test — incomparable
means no — and silently wrong for anything needing to tell "below" from
"beside": a diagnostic explaining why a read was refused, and a write rule
phrased as "the resource does **not** dominate the subject", read differently
under the two shapes. Ship both, with the boolean defined in terms of the
three-valued form so they cannot drift.

**The join must be expressible even though Qadi will not compute it.** Qadi
decides about resources; it does not derive their labels. A document assembled
from a `(Secret, {CRYPTO})` source and a `(Confidential, {BIO})` source is
`(Secret, {CRYPTO, BIO})`, and computing that belongs to the caller. But `join`
belongs in the exported surface, because a caller made to reimplement it will
get it wrong — the failure mode is taking the max of the levels and forgetting
the union of the compartments, which under-classifies the result and stays
invisible until that document reaches the wrong reader.

**Serialization — [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity).**
`ReadonlySet<string>` is not directly serializable, so the wire form is an
array, and the schema must settle two questions the type does not raise. Is the
array **ordered**? It must be, or encode–decode–encode is unstable and the
round-trip property in `Policy.test.ts` fails; sort on encode. Are
**duplicates** rejected or absorbed? Absorbed — a set decodes them away, and
failing on data whose meaning is unambiguous buys nothing. Both answers live in
one definition: the codec and the type are a single artefact, which is what
INV-QD-003 requires and why the predecessor lost data when it kept them apart.

**Aggregation and inference are permanently out of scope.** Combining
unclassified facts until they imply a classified one — a troop count and a
departure date, each releasable, together not — is the famous unsolved problem
of this model. No authorization library can address it, because the leak is in
what the reader deduces, not in any decision the library was asked to make. It
sits with information flow control in
[the matrix's exclusions](./00-adoption-matrix.md), for the reasons
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) sets out.

## Verification

Nothing verifies this model. It is unbuilt, and the section above describes an
API that does not exist. Worth recording now: a lattice is unusually good
property-test material, and the machinery is already here — `Policy.test.ts`
uses `FastCheck` for the round-trip property, so an arbitrary `SecurityLabel`
generator would sit beside an existing one rather than add a dependency. The
laws are the ones a hand-written table of examples tends to miss:

| Law | Statement |
| --- | --------- |
| Reflexivity | Every label dominates itself |
| Antisymmetry | If `A` dominates `B` and `B` dominates `A`, they are equal |
| Transitivity | Dominance composes |
| Join is an upper bound | `join(A, B)` dominates both `A` and `B` |
| Join is *least* | Any `C` dominating both `A` and `B` dominates `join(A, B)` |
| Incomparability | Labels differing only in disjoint compartments compare to neither |
| Round trip | Encode then decode is identity, compartment ordering included |

Adopting the model also means a newly allocated `REQ-QD` scenario, covering at
minimum a dominating read allowing, a dominated read denying, and an
**incomparable** pair denying — the third being the one an example-based test
omits, and the one the whole model exists to get right.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [27 — Bell–LaPadula](./27-bell-lapadula.md) · [28 — Biba](./28-biba.md) · [23 — Label-Based Access Control](./23-label-based.md)_
