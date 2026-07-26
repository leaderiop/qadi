# ADR-QD-027 — An explanation is a tree, and English is one rendering of it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-027                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-028) |

---

## Context

The trace answers *why was this denied*. Nothing answers *what does this rule
say* — which is the question a security reviewer asks first, and the one an
administrative interface listing policies has to answer without evaluating
anything.

The [roadmap](../roadmap.md) has carried this as "a human-readable rendering of a
policy — `requires role editor and permission doc:write`".

## Decision

**`explain(policy)` returns an `Explanation` tree. `renderExplanation` turns one
into English.**

```ts
export const explain: (policy: Policy) => Explanation;
export const renderExplanation: (explanation: Explanation, options?) => string;
```

### Why not just the string the roadmap asked for

Same argument as [ADR-QD-024](./024-predicate-output.md), which decided that a
predicate is an abstract tree because **Qadi owns no dialect**. A fixed English
sentence is a dialect too:

- An administrative interface wants to render `role editor` as a link to the role,
  and a field restriction as a chip list. From a string it would have to parse
  back what Qadi just finished formatting.
- Any product shipping in more than one language needs the structure, not the
  prose.
- A string cannot be tested for completeness. A tree can: every node has a tag,
  and a `Match.tagsExhaustive` over it fails to compile when a policy variant is
  added without an explanation arm.

`renderExplanation` gives the roadmap its literal ask in one line, and is
deliberately the *only* place English appears.

### Explanation takes no subject, and that is the whole distinction

`explain` is a pure function of the policy. No `CurrentSubject`, no resource, no
action, no services at all — its signature cannot express a dependency on them.

That is not an optimisation. An explanation that varied by subject would be a
trace, and the library already has one. Keeping the two apart is what stops
"what does this rule say" quietly becoming "what would it say for me", which is a
different question with different security properties: the first is safe to show
on an admin screen listing policies the viewer cannot satisfy, and the second
leaks whether they satisfy them.

### It must state restrictions, not only requirements

An explanation that renders `hasPermission(read, { fields: ["id"] })` as
"requires permission doc:read" **overstates the grant** — the policy also narrows
what is visible. Field sets, obligations, field strategies, and the combining
algorithm of a rule table all change what a policy means, so each appears in the
tree.

This is the direction the errors matter in. Understating a requirement makes a
policy look stricter than it is, which is misleading; understating a *restriction*
makes it look more permissive, which is the one a reviewer would act on.

## Alternatives considered

**A string, as the roadmap wrote it.** Rejected above. The roadmap entry was
written before E7 existed and the "Qadi owns no dialect" argument had not been
made yet; it is a description of the output, not a decision about the type.

**Rendering from the `Trace` instead.** A trace already names each node, so an
explanation could be a trace of a policy evaluated against a null subject.
Rejected: it would require inventing a subject that satisfies nothing, every leaf
would report "denied", and the output would describe an evaluation rather than a
rule. It also could not run without the five services.

**A `Schema` for `Explanation`, so it round-trips.** Rejected. An explanation is
derived, never stored — the policy is the artefact that crosses trust boundaries
(ADR-QD-002), and adding a codec would invite persisting a rendering that can
drift from the policy it describes. `Explanation` is a hand-written interface
union, like `Predicate` and `SecurityLabel`.

**Making it an `Effect`.** Rejected: it cannot fail and needs no services, so an
`Effect` would only add ceremony. It is one of the few genuinely synchronous
functions in the public API, alongside `evaluateMatcher` and `compareLabels`.

## Consequences

A **third interpreter** over the policy tree, after `evaluate` and `toPredicate`.
That is a real cost: a fourteenth policy variant now needs an arm in three places
rather than two, and `Match.tagsExhaustive` is what turns that into a compile
error rather than a silent gap.

Unlike the predicate, this interpreter has no agreement property to hold it to the
evaluator — an explanation is prose about a policy, not a second way of deciding
one, so there is nothing to compare. What can be asserted, and is, is
**totality**: every variant, every matcher and every value reference renders, and
no rendering is empty. INV-QD-021 carries that.

`toPredicate` refuses policies outside its subset and says so
([`PolicyNotTranslatable`](../behaviors/16-predicates.md)). `explain` refuses
nothing: it is total by construction, because a policy a reviewer cannot read is
worse than one they can only partly act on.

---

_Related: [ADR-QD-024](./024-predicate-output.md) · [ADR-QD-002](./002-schema-derived-policy-adt.md) · [Roadmap](../roadmap.md)_
