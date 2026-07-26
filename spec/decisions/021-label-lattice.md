# ADR-QD-021: Dominance is a four-valued comparison, and the label never enters the policy

> **Status:** Accepted
> **Date:** 2026-07-26

## Context

A security label is a `(level, compartments)` pair ordered by **dominance**: `a`
dominates `b` when `a` is at least as high and at least as broad. It is a
*partial* order, and that is the whole difficulty —
`(Secret, {CRYPTO})` and `(Secret, {BIO})` are **incomparable**, so neither may
read the other.

Qadi has matchers for equality, membership and ordering on numbers, and none for
dominance. [23 — Label-based](../models/23-label-based.md) records the sharpest
consequence: `gte` and `lt` take a plain number, never a `ValueRef`, so the
subject's clearance cannot be compared against the resource's level at all. Both
sides must be enumerated as rungs, which [29 — MLS](../models/29-mls.md) shows
costs `n × 2^c` rows once compartments exist and is only as correct as the
transcription — "a missing row is a silent denial, an extra row a silent allow,
and nothing in the tree can tell you which".

[27 — Bell–LaPadula](../models/27-bell-lapadula.md) states the danger of
approximating it:

> Read as scalars, both labels are `2` and each reads the other. This is not an
> approximation of dominance. It is a different relation returning a different
> answer, and it returns *allow* exactly where dominance returns *deny*.

This is **E4**, and the [matrix](../models/00-adoption-matrix.md) leaves two
questions open for an ADR: where the lattice is declared, and whether the
comparison is two- or three-valued.

## Decision

### The lattice is not declared anywhere

29 laid out three options — a `Context.Service` holding the lattice, a field on
the matcher variant, or restricting to `(level, compartments)` computed
structurally — and argued for the third. That argument is accepted:

```ts
export interface SecurityLabel {
  readonly level: number;
  readonly compartments: ReadonlyArray<string>;
}
```

Dominance on this shape is `≥` on the level and `⊇` on the compartments,
computable from two labels with nothing else in scope. No service to provide, no
unwired-service denial path, no policy whose meaning depends on its environment,
and no lattice serialised into every policy that mentions one. A caller with a
genuinely irregular lattice can still enumerate it, as the models show.

**`compartments` is an array, not a `ReadonlySet`.** 27 and 29 both sketched a
`ReadonlySet` and 27 identified the resulting hazard at length: a set has no
ordering, `deepStrictEqual` over arrays does, so a codec would need canonical
ordering on encode and tolerance on decode, and "two encodings of one label that
compare unequal is precisely the class of defect schema-derived types were
adopted to prevent". An array is what actually arrives — labels come from JSON,
through a resolver or a resource field — and comparison is subset-based, so order
is irrelevant to every operation that matters.

### The label never enters the policy, so it needs no codec

This removes the cost 27 called "the one that matters", and it follows from where
labels come from.

```ts
| { readonly _tag: "Dominates"; readonly ref: ValueRef }

export const dominates: (ref: ValueRef) => Matcher;
```

The matcher variant carries a `ValueRef` and **no label**. Both sides of the
comparison are read at evaluation time — the matched attribute on one side, the
referenced value on the other — so a `SecurityLabel` is runtime data, never
policy data. `Dominates` is therefore the same codec cost as `Eq`: one
`TaggedStruct` holding a `ValueRef`.

`SecurityLabel` is consequently a **hand-written interface**, which is the
ordinary rule ([ADR-QD-002](./002-schema-derived-policy-adt.md) makes the policy
ADT the deliberate exception, not the norm). Nothing about a label crosses the
trust boundary inside a policy. What crosses is whatever the caller put in an
attribute, and that was always `unknown`.

### Four values, not three, and not two

```ts
export type LabelOrdering = "Equal" | "Dominates" | "DominatedBy" | "Incomparable";

export const compareLabels: (a: SecurityLabel, b: SecurityLabel) => LabelOrdering;
export const labelDominates: (a: SecurityLabel, b: SecurityLabel) => boolean;
```

The matrix asked that "E4's design should define the boolean in terms of a
three-valued comparison". Four is the honest count: `Equal` is distinguishable
from `Dominates` and a caller explaining a decision wants to know which. The
matcher's boolean is then *derived* rather than primitive —
`labelDominates(a, b)` is `compareLabels(a, b) !== "DominatedBy" && !== "Incomparable"`.

**The matcher itself stays boolean, and that is correct.** A matcher answers "did
this match", and incomparable means no. The reason to name the four values is
that `Incomparable` collapsing into `false` is right for the *test* and wrong for
*explanation* — and Qadi's whole answer to "why was this denied" is that the
information is available rather than inferred.

This is not the E5 situation. [ADR-QD-020](./020-decision-history-port.md) needed
a third value because no boolean **default** could fail closed under a negative
policy. Here there is no default and no port: both operands are supplied, and the
boolean is safe in both directions because dominance is asked by *swapping the
operands*, never by negating the answer.

| Rule | Written as |
| ---- | ---------- |
| No read up | `hasAttribute("clearance", dominates(resource("label")))` |
| No write down | `hasResourceAttribute("label", dominates(subject("clearance")))` |

Incomparable denies both, which is what Bell–LaPadula requires.

### A value that is not a label denies

`evaluateMatcher` is total (BEH-QD-028), so `dominates` returns `false` when
either side fails to parse as a `SecurityLabel` — a resolver miss, a number where
a label was expected, a malformed compartment list.

This deliberately does **not** follow the `MissingAction` precedent, and the
distinction is worth stating because it looks inconsistent.
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)
makes a missing action an error because the action is a *caller argument* — a
forgotten parameter at the call site. A label is *resolved data*, and an absent
or malformed attribute has always denied: `gte(3)` on `undefined` returns false,
and `AttributeResolverNone` resolving to nothing is the mechanism
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) relies on. Making
a bad label an error would make every unwired attribute resolver a failure rather
than a denial.

### No `join`, no `meet`

29 sketched both. They are declined: a least upper bound answers "what class does
this combined document belong to", which is *computing a label* rather than
deciding an access. Qadi decides. A caller that needs to classify a derived
document has the label type and can compute it, and if it does so it is doing
data classification, which is a different job with a different audit story.

## Consequences

**Positive**:

- Bell–LaPadula, Biba and MLS become one policy each rather than `n × 2^c`
  transcribed rungs, and the transcription's silent-allow failure mode goes with
  them.
- **The ★-property trap in 27 disappears.** That document had to note that
  descending `anyOf` rungs are correct for reads and *wrong* for writes, because
  the permitted sets shrink as clearance rises and a `secret` subject would fall
  through to the `internal` rung. With a real comparison there are no rungs to
  order wrongly.
- Cheaper than forecast. 27 budgeted a `SecurityLabel` codec with canonical set
  ordering as the main risk to
  [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity); there is no label
  codec at all.
- `dominates` is the first matcher beyond `eq`/`neq` to take a `ValueRef`, which
  is the point: dominance relates two live values, and that is exactly what the
  shipped matchers could not do.

**Negative**:

- A fourth matcher shape to learn, and the one whose failure mode is quiet:
  comparing a label against a *number* denies rather than complaining, so a
  policy written against the wrong attribute name looks like a working
  least-privilege rule. Tests must pin the malformed cases, not only the
  well-formed ones.
- `compareLabels` is exported but nothing in the evaluator calls it — the matcher
  uses `labelDominates`. An export with no internal caller is usually a smell;
  here it is the explanation surface the four values exist for, and it is tested
  directly.
- Two names close enough to confuse: the matcher constructor `dominates(ref)` and
  the predicate `labelDominates(a, b)`. 29 proposed calling both `dominates`,
  which the flat barrel makes impossible.
- Compartment comparison is `O(|b|)` per node with a `Set` built per call. Labels
  are small; if that ever stops being true the fix is memoisation, not a
  different relation.

**Trade-off accepted**: restricting to `(level, compartments)` means Qadi does not
support arbitrary user-declared lattices, and someone will eventually have one.
That is the price of a lattice needing no declaration — no configuration surface,
no ambient state, no two policies disagreeing about the order they are written
against. The standard form is the standard form, and the enumeration escape hatch
remains for the rest.

**Implemented**, with the evidence the
[Definitions of Done](../process/definitions-of-done.md) require:
[13 — The Label Lattice](../behaviors/13-labels.md),
[INV-QD-015](../invariants.md#inv-qd-015-incomparable-labels-deny-in-both-directions),
`@REQ-QD-013`.

Two notes from building it.

**The `referencesAction` edit was not foreseen here and the compiler did not
force it.** `Dominates` takes a `ValueRef`, so that reference may be `action()`;
without adding the case, a policy comparing a label against the action would
*deny* under a missing action instead of failing, quietly breaching
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one).
`referencesAction` switches exhaustively on the matcher tag, so adding `Dominates`
to the type did force *a* decision there — but "return false" would have compiled
just as well as the right answer. A mutation test pins it.

**Every claim about incomparability is a test, not an argument.** Dropping the
compartment check from `compareLabels` — the "read them as scalars"
approximation 27 warns about — kills five tests, three of them at policy level
through a Bell–LaPadula tree. That is the difference between documenting a
security property and having one.
