# ADR-QD-029 — `join` and `meet` ship as utilities, and the evaluator still never derives a label

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-029                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-030) |

---

## Context

[ADR-QD-021](./021-label-lattice.md) shipped the label lattice and **declined**
`join` and `meet`, on the grounds that Qadi decides and deriving a label for a new
object is not a decision.

[MOD-QD-029](../models/29-mls.md) argued the opposite and its argument was never
answered:

> But `join` belongs in the exported surface, because a caller made to reimplement
> it will get it wrong — the failure mode is taking the max of the levels and
> forgetting the union of the compartments, which under-classifies the result and
> stays invisible until that document reaches the wrong reader.

CCR-QD-024 recorded the consequence and left it open. It also recorded a
contradiction that has been sitting in the specification since: MOD-QD-029 defines
a lattice as *"a partial order **with joins**"*, and E4 shipped the order without
them — so by that document's own definition what shipped is not a lattice, which is
why the matrix row reads **Shipped, in part** with `join` and `meet` named as a
ceiling. Two of the seven laws in its Verification table are marked *Void —
declined* rather than unmet.

## Decision

**`join` and `meet` are exported as pure functions on `SecurityLabel`. Nothing in
the evaluator changes.**

```ts
export const join: (a: SecurityLabel, b: SecurityLabel) => SecurityLabel;
export const meet: (a: SecurityLabel, b: SecurityLabel) => SecurityLabel;
```

`join` is the least upper bound — the **maximum** of the levels and the **union**
of the compartments. `meet` is the greatest lower bound — the minimum of the levels
and the intersection of the compartments.

### ADR-QD-021's reasoning is not overturned; it is what makes these utilities

The decline said deriving a label is not a decision. That remains true, and it is
precisely why these are **standalone functions** rather than evaluator behaviour:

- No `Policy` variant computes a label.
- No matcher derives one.
- `evaluate` does not call either function, and cannot: a label reaches a policy as
  resolved data (BEH-QD-097), and nothing in the tree constructs one.

So the boundary ADR-QD-021 drew is unmoved. What changes is that the arithmetic a
caller has to do *outside* that boundary now has one correct implementation instead
of being reinvented per codebase. Declining to compute a label during evaluation and
declining to *export the function* were conflated; they are separate decisions, and
only the first has an argument behind it.

### The failure mode is specific, and it is silent

`{ level: 3, compartments: ["CRYPTO"] }` joined with
`{ level: 1, compartments: ["BIO"] }` is `{ level: 3, compartments: ["CRYPTO", "BIO"] }`.

The natural mistake is `Math.max` on the level and *whichever compartment set came
from the higher-level operand* — giving `{ level: 3, compartments: ["CRYPTO"] }`.
That result is **dominated by** the correct one, so it **under-classifies**: a
reader cleared for `(3, {CRYPTO})` may read the derived document although it
contains `BIO` material they have no clearance for. Nothing in the system notices,
because the label is data and the comparison against it is correct — the wrong
label is being compared correctly.

This is the one place in the library where a caller's arithmetic error becomes an
authorization defect, which is what distinguishes it from every other convenience
function we have declined.

### It closes the definitional gap, and the laws become assertable

With both functions present, MOD-QD-029's definition is satisfied literally: the
order has joins, so the structure is a lattice, and the matrix row can read
**Shipped** rather than naming a ceiling.

More usefully, four laws become testable that were previously unstatable —
`join(a, b)` dominates both operands; any `c` dominating both dominates
`join(a, b)`; and the duals for `meet`. Those are the two Verification rows
MOD-QD-029 marked *Void*, and they extend
[INV-QD-019](../invariants.md#inv-qd-019-dominance-is-a-partial-order) from "the
relation is a partial order" to "the structure is a lattice" — a strictly stronger
claim about the same code, and one whose property test would catch a future
compartment hierarchy breaking it.

## Alternatives considered

**Keep declining, and document the arithmetic.** The status quo since ADR-QD-021: a
prose warning in MOD-QD-029. Rejected — the warning has been there since the
document was written and cannot prevent anything. A function can.

**Ship `join` only.** `meet` has no security failure mode: computing a greatest
lower bound wrongly produces a label that is too *low*, which over-restricts and is
visible immediately as a refusal. Rejected anyway: a lattice with one operator is a
join-semilattice, the laws come in dual pairs, and asserting half of them would
leave the other half unassertable for no saving.

**Compute the join inside the evaluator, so a policy could say "the derived label
of these two".** Rejected, and this is the part ADR-QD-021 got right. It would make
evaluation construct data rather than read it, put label arithmetic into the policy
wire format, and give a policy a value that came from nowhere the caller can see.

**A `SecurityLabel` codec, so derived labels round-trip.** Still rejected, for
ADR-QD-021's reason unchanged: a label never enters a policy, so it is never
encoded, and adding a codec would reintroduce the canonical-set-ordering hazard
MOD-QD-027 called "the one that matters".

## Consequences

MLS moves to **Shipped** and its Verification table loses both *Void* rows. The
remaining ceiling on that row — an irregular lattice still requires hand
enumeration — is unaffected and stays recorded.

`SecurityLabel.ts` gains two functions and no state. Nothing else in the library
imports them, which is the shape the boundary requires: if a later change makes
`Evaluate.ts` import `join`, that is the signal ADR-QD-021's line has been crossed
and this ADR needs revisiting rather than extending.

---

_Related: [ADR-QD-021](./021-label-lattice.md) · [MOD-QD-029](../models/29-mls.md) · [INV-QD-019](../invariants.md#inv-qd-019-dominance-is-a-partial-order)_
