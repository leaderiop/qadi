# ADR-QD-030 — Simplification preserves the verdict, not the trace, and is never automatic

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-030                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-031) |

---

## Context

Policies assembled programmatically accumulate structure that means nothing:
`allOf` of one child, an `allOf` nested directly inside an `allOf`. A tenant-scoping
helper composed with a role helper composed with an ownership
helper produces a tree several nodes deeper than the rule it expresses.

The [roadmap](../roadmap.md) has carried this under *Under consideration* with the
objection already stated: rewriting the tree "makes the trace diverge from the
policy the author wrote, which undermines explanation. Probably only worth it as an
explicit, opt-in transform."

Two things changed since that was written. `explain`
([ADR-QD-027](./027-policy-explanation.md)) gave the objection a name — there is now
a function whose whole job is to describe the policy an author wrote, and a
simplifier silently rewriting that policy would make it describe something else. And
`toPredicate` ([ADR-QD-024](./024-predicate-output.md)) gave simplification a
second consumer: a shallower tree is a shorter `WHERE` clause.

## Decision

**`simplify(policy)` is an explicit, opt-in transform. It preserves the verdict and
the field set. It does not preserve the trace, and that is stated rather than
mitigated.**

```ts
export const simplify: (policy: Policy) => Policy;
```

Nothing calls it. Not `evaluate`, not `check`, not `toPredicate`, not `explain`. A
caller who wants a smaller tree asks for one.

### Two rewrites, and nothing clever

| Rewrite | From | To |
| ------- | ---- | -- |
| Single-child composite | `allOf([p])`, `anyOf([p])` | `p` |
| Same-strategy nesting | `allOf([a, allOf([b, c])])` | `allOf([a, b, c])` |

**Double negation is not one of them, and finding that out is the most useful thing
this change produced.** It was written, and the property test rejected it — see
below.

An empty `allOf` and an empty `anyOf` are **left alone**. They are not redundant —
one always allows and the other never does — and rewriting them to something
"simpler" would be rewriting them to something else.

### `not(not(p))` is not `p`, and the property found it

The rewrite every textbook lists as trivially safe is unsound in this ADT, because
`Not` deliberately carries `visibleFields: undefined` — the top of the lattice,
meaning *all* fields — and no obligations. Knowing that a policy did **not** hold
says nothing about which fields are safe to expose, which is
[ADR-QD-019](./019-obligations.md)'s reasoning and is correct.

The consequence for a simplifier:

| Policy | Allows with | Owes |
| ------ | ----------- | ---- |
| `hasPermission(read, { fields: ["id"] })` | `["id"]` | — |
| `not(not(hasPermission(read, { fields: ["id"] })))` | **every field** | — |
| `obliged(audit, p)` | `p`'s fields | `audit` |
| `not(not(obliged(audit, p)))` | every field | **nothing** |

Both differences run in the *safe* direction for the rewrite — eliminating the
negation narrows the field set and adds a duty — but they are differences, and this
transform promises to change neither. So the rewrite is dropped rather than
qualified.

It was found by the property below, over generated policies **and four generated
subjects**, and it is not the kind of thing a hand-written test would have looked
for: the counterexample needs a policy that *allows* with a restricted field set
underneath two negations, and every intuition says the two negations cancel. This is
the second time a property has paid for itself by contradicting something obvious
(the first was [INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)).

### Flattening is only sound when the field strategies agree

This is the part a naive simplifier gets wrong, and the reason the rule carries a
condition rather than being a plain structural rewrite.

```ts
allOf([a, allOf([b, c], { fieldStrategy: "Union" })], { fieldStrategy: "Intersection" })
```

The outer node intersects `a`'s fields with whatever the inner produced; the inner
**unions** `b`'s and `c`'s. Flattened to
`allOf([a, b, c], { fieldStrategy: "Intersection" })` the three are intersected
together, which is a different field set.

Both trees reach the same **verdict**. They expose different **fields**. So a
simplifier that flattened unconditionally would be verdict-preserving and
*disclosure-changing* — it would widen or narrow what a caller may read, silently,
while every test asserting allow-or-deny still passed. Field visibility is the
reason this library exists ([MOD-QD-007](../models/07-field-level.md)), so this is
the failure mode that matters most and the one an "obviously safe" rewrite walks
into.

Flattening therefore applies only when `child.fieldStrategy === parent.fieldStrategy`,
where associativity makes the merge equivalent.

### The trace changes, and nothing pretends otherwise

A simplified policy produces a **shallower trace** with fewer nodes. That is not a
regression to be patched; it is what "smaller tree" means. The consequences:

- A denial's attribution survives, because `labeled` nodes are never removed — the
  rewrites only touch single-child composites and same-strategy nesting.
- `explain(simplify(p))` describes the *simplified* policy. A reviewer should be
  shown `explain(p)`, and the distinction is why simplification is not applied
  inside `explain`.
- Two policies that simplify to the same tree share one atom in
  `@qadi/react` (`Atom.family` keys structurally), which is a genuine benefit and
  also means a caller simplifying inconsistently gets two atoms for one question.

## Alternatives considered

**Simplify inside `evaluate`.** Rejected. It would make the trace stop
corresponding to the policy the author stored, which is the objection the roadmap
recorded and which `explain` sharpened. The trace is public API and is what a
reviewer reads.

**Simplify inside `toPredicate`, where the trace is irrelevant.** Tempting — a
predicate has no trace, so the objection does not apply, and a shallower tree is a
shorter query. Rejected anyway: `toPredicate` already refuses policies outside its
subset, and adding a rewrite before the refusal would mean a policy's
*translatability* depended on a transform the caller did not ask for. A caller who
wants both writes `toPredicate(simplify(p))`, which is one composition and says what
it does.

**Eliminate double negation.** Written, tested, and **removed** — see above. Left
here as a rejected alternative rather than deleted from the record, because the
reason it fails is a property of this ADT that a future contributor will otherwise
rediscover.

**Also deduplicate identical children.** `allOf([p, p])` → `allOf([p])` → `p`.
Verdict-preserving and field-preserving, and rejected for now: `Equal.equals` over
policy trees is a deep structural comparison, so the rewrite is O(n²) in siblings
for a saving nobody has asked for, and the obligations story needs its own thought —
two identical `obliged` branches already union to one duty, but two branches that
differ *only* in their obligation must not collapse. Left out rather than half-done.

**Normalise to a canonical form** — sorted children, De Morgan pushed inward.
Rejected: it would reorder `anyOf`, and under `First` the order of children is
*semantic*, deciding both the field set and which obligations are owed. A
normaliser that reordered would be a correctness bug wearing the clothes of a
cleanup.

## Consequences

`simplify` is idempotent and total: it cannot fail and has no error channel, like
`explain`. INV-QD-024 carries what it guarantees — same verdict, same visible
fields, same obligations, over generated policies **and** generated subjects,
because a rewrite that preserved the verdict only for the subjects a test happened
to use would be no guarantee at all.

The honest limit: these three rewrites shrink trees that helpers built and do
nothing for a tree an author wrote by hand, which is usually already minimal. This
is an ergonomic transform for generated policies, not an optimiser, and it is
scoped to say so.

---

_Related: [ADR-QD-027](./027-policy-explanation.md) · [ADR-QD-024](./024-predicate-output.md) · [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top) · [Roadmap](../roadmap.md)_
