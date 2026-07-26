# 29 — Multi-Level Security

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-29                                    |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.2 (2026-07-26): `join` and `meet` shipped (ADR-QD-029); Status to Shipped; the two join laws proven; the definitional contradiction closed (CCR-QD-030)<br>1.1 (2026-07-26): Status corrected to Shipped, in part — a ceiling, since `join` and `meet` were declined; verified as `@REQ-QD-021`; the order laws proven (INV-QD-019, BEH-QD-102); three Verification criteria recorded as void rather than pending; the irregular-lattice ceiling recorded; two prior revisions absorbed without a bump (CCR-QD-012, CCR-QD-017) now recorded (CCR-QD-024)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

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

*One correction, twice.* E4 shipped the partial order and **not** the joins, so
from CCR-QD-017 to CCR-QD-030 the definition in that last sentence was not satisfied
by what shipped — which CCR-QD-024 recorded by setting the Status to *Shipped, in
part*. `join` and `meet` shipped in CCR-QD-030, so the definition now holds as
written and the Status is plain **Shipped**. See
[below](#by-the-definition-above-what-shipped-is-now-a-lattice).

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
| Status | **Shipped** |
| Priority | **P3** |
| Enablers required | ~~**E1, E4**~~ **shipped**; none outstanding |
| Breaking change | No |

**Shipped: [ADR-QD-021](../decisions/021-label-lattice.md),
[13 — The Label Lattice](../behaviors/13-labels.md),
[INV-QD-015](../invariants.md#inv-qd-015-incomparable-labels-deny-in-both-directions),
[INV-QD-019](../invariants.md#inv-qd-019-dominance-is-a-partial-order),
`@REQ-QD-021`, `packages/core/test/Matcher.test.ts`.**

~~**Not shipped, and declined rather than deferred: `join` and `meet`.**~~
**Shipped in CCR-QD-030** ([ADR-QD-029](../decisions/029-lattice-join-and-meet.md)).
This row read *Shipped, in part* from CCR-QD-024 until then, naming the two
operators as a **ceiling**. The ceiling was wrong: the argument this document made
for exporting them was never answered, and re-reading it was enough to reverse the
decline.

One ceiling remains, and it is the one this document recorded rather than the one
the matrix did: a genuinely **irregular** lattice still has to be hand-enumerated,
as [below](#what-it-cost). It does not reduce the status, because an irregular
lattice is outside the standard `(level, compartments)` form the model is defined
over.

E4 supplies dominance; E1 supplies the action dimension the two instances need
to tell a read from a write, and both have shipped
([ADR-QD-018](../decisions/018-action-dimension.md),
[ADR-QD-021](../decisions/021-label-lattice.md)). The lattice alone needs
only E4 — [27](./27-bell-lapadula.md) and [28](./28-biba.md) are the documents
that need both — and this row was listed with both because a lattice with no flow
rule decides nothing. `@REQ-QD-021` is the evidence for that claim: every scenario
under it is one comparison with **no `hasAction`**, which no other label suite in
the repository does.

### By the definition above, what shipped is now a lattice

`## What it is` closes with *"a lattice is a partial order with joins, and is
enabler E4"*. From E4 until CCR-QD-030 that sentence and the matrix row contradicted
each other: the order shipped and the joins did not, so by this document's own
definition the thing named after the model was not the model.

`join` and `meet` shipped in
[ADR-QD-029](../decisions/029-lattice-join-and-meet.md), and the definition is now
satisfied literally. The argument that got them there is the one below under
[What it cost](#what-it-cost) — *"the join must be expressible even though Qadi will
not compute it"* — which ADR-QD-021 declined without answering, and which was still
unanswered when CCR-QD-024 recorded it as a ceiling.

**The distinction ADR-QD-021 drew was right; the inference from it was not.**
Deriving a label is not deciding an access, and nothing in the evaluator computes
one — that is now [BEH-QD-104](../behaviors/13-labels.md) and it is unchanged. But
"Qadi does not compute a label during evaluation" and "Qadi does not export the
function a caller needs" are two decisions, and only the first had an argument
behind it. What settled it was noticing that the original requirement's own
reasoning — *"a caller ... can compute it"* — is the premise of the counter-case:
it can, and this document had already written down exactly how it gets it wrong.

## What Qadi could express before E4

> **Historical.** The transcription below is the pre-E4 workaround. It is kept
> because it is the migration path a caller on the old shape is standing on, and
> because it remains the only option for a genuinely irregular lattice — but for
> the standard `(level, compartments)` form it has been replaced by one comparison.
> See [The shape it took](#the-shape-it-took).

A **chain** — totally ordered, no compartments — is a degenerate lattice, and
any finite partial order can be enumerated edge by edge. The policy below
writes the dominance relation out as a table: one rung per clearance, paired
with the classifications that clearance dominates.

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
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  ),
);
```

**This is not a lattice, and should not be called one.** (Nor is the shipped form,
strictly — but for a different and much narrower reason: it has the order and not
the algebra, where the transcription below has neither.) It cannot compute a
**join**, so nothing here can say what class a combined document belongs to. It
does not scale: `n` levels cost `n` rungs, but `c` compartments cost `n × 2^c`,
and the second compartment is where transcription stops being reviewable. And
it is only as correct as the transcription — a missing row is a silent denial,
an extra row a silent allow, and nothing in the tree can tell you which.
Transcribe a chain; do not transcribe compartments.

## The shape it took

> **Superseded by [ADR-QD-021](../decisions/021-label-lattice.md).** E4 shipped,
> and in two respects it is *cheaper* than sketched below. `compartments` is an
> array rather than a `ReadonlySet`, and there is **no `SecurityLabel` codec at
> all** — the `Dominates` matcher carries a `ValueRef` and no label, so both
> operands are runtime data and the set-ordering hazard described below never
> arises. The comparison is four-valued (`Equal` is named separately) and `join`
> and `meet` were declined as out of scope. The sketch is left as written.

Nothing below existed when this was written. The `ts` fences are kept as a record
of what was proposed and, in three places, **declined** — a declined name must
never be able to masquerade as API, which is why none of them is compiled.

The class, restricted to the standard form, with its codec:

```ts
interface SecurityLabel {
  readonly level: number;
  readonly compartments: ReadonlySet<string>;
}

// ReadonlySet has no JSON form: the encoded side is an array of strings.
const SecurityLabel: Schema.Codec<SecurityLabel>;
```

> **Declined.** There is **no `SecurityLabel` codec**, and `compartments` is a
> `ReadonlyArray<string>`. Both follow from one decision: a label never appears
> inside a policy, so it is never encoded, so the canonical-set-ordering hazard
> [27](./27-bell-lapadula.md) called "the one that matters" does not arise. The way
> to make a set encoding safe turned out to be needing no set encoding.

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

> **Partly renamed, and now fully shipped.** `compare` shipped as `compareLabels`
> with **four** values, not three: `Equal` is named rather than folded into
> `Dominates`, because a caller asking why a decision went the way it did wants to
> know which. `undefined` for incomparable became the explicit `"Incomparable"`. The
> predicate shipped as **`labelDominates`** — this document proposed that it share
> the name `dominates` with the matcher constructor, and ADR-QD-021 rejected that as
> "close enough to confuse".
>
> **`join` and `meet` shipped in CCR-QD-030 under exactly these names and
> signatures** ([ADR-QD-029](../decisions/029-lattice-join-and-meet.md)) — declined
> by ADR-QD-021 and reinstated on this document's own argument. The sketch above is
> the only part of it that needed no correction at all.

A `Matcher` variant, so dominance can be asserted inside a policy. This is the
part that shipped verbatim:

```ts
type Dominates = { readonly _tag: "Dominates"; readonly ref: ValueRef };
const dominates: (ref: ValueRef) => Matcher;

// "the subject's clearance dominates the resource's classification"
hasAttribute("clearance", dominates(resource("classification")));
```

This **is** the first matcher taking a `ValueRef` that is not `eq` or `neq`, and
that was the point: dominance relates two *live* values, which the matchers before
it could not do. `gte` and `lt` still take constants, so the limitation this
sentence described survives everywhere except labels.

## What it cost

Nothing further — E4 shipped and this section is the estimate, kept for the record.
Three of its four paragraphs called the outcome correctly; the fourth described a
hazard that turned out not to exist. Each is annotated below rather than rewritten,
because the reasoning is what ADR-QD-021 was decided on.

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

*Called correctly, and the third option is what shipped* — the lattice is declared
nowhere ([BEH-QD-097](../behaviors/13-labels.md)). The last sentence is the
**second ceiling** on this model's status: an irregular lattice still has to be
transcribed by hand, and this document is the only place that limit is written
down. It was never a row in the matrix.

**Boolean or three-valued — the central design question for E4.** Dominance is
a **partial** order, so a comparison has three answers, not two: `A` dominates
`B`, `B` dominates `A`, or neither. A function returning `boolean` collapses
the third into `false`, which is *correct* for a dominance test — incomparable
means no — and silently wrong for anything needing to tell "below" from
"beside": a diagnostic explaining why a read was refused, and a write rule
phrased as "the resource does **not** dominate the subject", read differently
under the two shapes. Ship both, with the boolean defined in terms of the
three-valued form so they cannot drift.

*Called correctly, and answered with one value more than asked.* `compareLabels`
has **four** values, not three: `Equal` is distinguishable from `Dominates`
because a caller explaining a decision wants to know which. `labelDominates` is
derived from it exactly as this paragraph prescribed, so the two cannot drift. The
write rule phrased as a negation, which this paragraph worried about, never arose —
both rules are asked by swapping the operands, which is why a boolean is safe here
and was not safe for the history port
([INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities)).

**The join must be expressible even though Qadi will not compute it.** Qadi
decides about resources; it does not derive their labels. A document assembled
from a `(Secret, {CRYPTO})` source and a `(Confidential, {BIO})` source is
`(Secret, {CRYPTO, BIO})`, and computing that belongs to the caller. But `join`
belongs in the exported surface, because a caller made to reimplement it will
get it wrong — the failure mode is taking the max of the levels and forgetting
the union of the compartments, which under-classifies the result and stays
invisible until that document reaches the wrong reader.

*Declined, and the argument stands unrefuted.* ADR-QD-021 scoped `join` out: Qadi
decides, and deriving a label for a new object is not a decision. This paragraph's
reasoning was about **the caller's** failure mode rather than Qadi's, and nothing
in the ADR addresses it — which is why the Status section records the omission as a
**ceiling** and not as an oversight. Reopening it needs its own ADR.

**Serialization — [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity).**
`ReadonlySet<string>` is not directly serializable, so the wire form is an
array, and the schema must settle two questions the type does not raise. Is the
array **ordered**? It must be, or encode–decode–encode is unstable and the
round-trip property in `Policy.test.ts` fails; sort on encode. Are
**duplicates** rejected or absorbed? Absorbed — a set decodes them away, and
failing on data whose meaning is unambiguous buys nothing. Both answers live in
one definition: the codec and the type are a single artefact, which is what
INV-QD-003 requires and why the predecessor lost data when it kept them apart.

*Withdrawn — the whole paragraph is moot.* There is **no label codec**.
`compartments` is a `ReadonlyArray<string>` and a label never enters a policy
tree, so it is never encoded: no canonical ordering, no duplicate question, no
round-trip hazard. [27](./27-bell-lapadula.md) called this cost "the one that
matters" and ADR-QD-021 removed it entirely by removing the encoding. The way to
make a canonical set encoding safe was to need none.

**Aggregation and inference are permanently out of scope.** Combining
unclassified facts until they imply a classified one — a troop count and a
departure date, each releasable, together not — is the famous unsolved problem
of this model. No authorization library can address it, because the leak is in
what the reader deduces, not in any decision the library was asked to make. It
sits with information flow control in
[the matrix's exclusions](./00-adoption-matrix.md), for the reasons
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) sets out.

## Verification

Revision 1.0's advice was right twice over: a lattice is unusually good
property-test material, and `FastCheck` was already present so an arbitrary
`SecurityLabel` generator added no dependency. That is exactly how the laws are
now asserted, in `packages/core/test/Matcher.test.ts` under
[INV-QD-019](../invariants.md#inv-qd-019-dominance-is-a-partial-order).

**One of the seven laws below cannot be discharged as written**, so this table is
rewritten rather than ticked off — a Verification section whose criteria are partly
unsatisfiable is worse than one that admits it.

Three were unsatisfiable when CCR-QD-024 rewrote it. Two of those — both join rows —
became provable in CCR-QD-030 when the operators shipped, which is the more useful
reading of a *Void* row: it records that a criterion has no subject **yet**, and
says nothing about whether it should.

| Law | Status | Evidence |
| --- | ------ | -------- |
| Reflexivity | **Proven** | Property over sampled labels; `@REQ-QD-021` |
| Antisymmetry | **Proven** | Property, asserted as the *implication* — mutual dominance forces equal level and equal compartment set |
| Transitivity | **Proven** | Property over sampled triples, with a witness count so the antecedent cannot go unfired |
| Incomparability | **Proven** | INV-QD-015; `@REQ-QD-021` covers the case that was missing — **overlapping** sets, not merely disjoint ones |
| Join is an upper bound | **Proven** | Property over sampled triples; INV-QD-023 |
| Join is *least* | **Proven** | Property: anything dominating both dominates the join |
| Round trip | **Void — inapplicable** | There is no label codec, because a label never enters a policy. The property it asks for has no subject |

Two additions the 1.0 table did not contain, both from
[27](./27-bell-lapadula.md)'s parallel list:

| Law | Status | Evidence |
| --- | ------ | -------- |
| Absorption — `join(a, meet(a, b)) = a`, and its dual | **Proven** | Property; what makes this a lattice rather than two functions returning bounds |
| The under-classification mistake is dominated by the correct join | **Proven** | `Matcher.test.ts`; the reason `join` is exported at all |
| No permitted read-then-write moves information downwards | **Proven** | Property; it reduces to transitivity, which is the finding |
| `compareLabels` is total, and swapping operands mirrors the answer | **Proven** | Property — both rules of every label model are asked by swapping operands, so an asymmetry here would make one direction silently wrong |

The newly allocated scenario set is **`@REQ-QD-021`**, and it covers more than the
three the 1.0 text asked for. Two are worth naming:

- Every scenario states the rule as **flow**, with no `hasAction` — this document's
  claim that the general model needs E4 alone, made checkable. No other label suite
  in the repository has that shape.
- Flow between `{CRYPTO,BIO}` and `{CRYPTO,NUCLEAR}` is refused. The 1.0 text asked
  for "labels differing only in **disjoint** compartments"; disjoint singletons are
  the easy case, and overlapping-but-incomparable sets are the shape a reviewer
  means by "the compartment partial order". Nothing in the repository had it.

**What is still unverified, and named rather than omitted:** tranquillity. 27
claims the strong form holds by construction, calling it "an accident of the
architecture rather than a design choice"; this document inherited the claim
without restating it, and no test asserts that a decision is point-in-time with
respect to labels. It is an architectural property, not a behavioural one, which
is why it has no row above — but it should not be counted as covered.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [27 — Bell–LaPadula](./27-bell-lapadula.md) · [28 — Biba](./28-biba.md) · [23 — Label-Based Access Control](./23-label-based.md)_
