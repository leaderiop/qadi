# Glossary

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-GLOSSARY                                  |
> | Revision       | 1.5                                            |
> | Effective Date | 2026-08-22                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.5 (2026-08-22): Witness and Guard added; the Revision field corrected to match the latest entry, which had drifted since CCR-QD-019 (CCR-QD-043)<br>1.4 (2026-07-26): Predicate, translatable subset and reference interpreter added (CCR-QD-020)<br>1.3 (2026-07-26): Rule table, rule effect and combining algorithm added; the variant count corrected (CCR-QD-019)<br>1.2 (2026-07-26): Subject set and review query added (CCR-QD-018)<br>1.1 (2026-07-26): Reactivity terms added (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-002) |

---

Terms are one `##` heading each, deliberately flat rather than tabulated, so
that behaviors and invariants can deep-link to a definition.

Where a word is used in this codebase with a narrower meaning than its ordinary
industry sense, that narrowing is stated. Vocabulary drift is how a codebase
stops meaning what its documentation says.

## Core concepts

## Subject

The entity being authorized — usually a user, sometimes a service account. Held
as `AuthSubject`: an id, a set of role names, a pre-flattened set of permission
keys, and a bag of attributes.

A subject is a **value**, not a session. It is built once per request and
provided as a layer, so nothing can mutate it mid-evaluation.
See [BEH-QD-044](behaviors/06-services.md) and [Current subject](#current-subject).

## Permission

A `resource` + `action` pair, such as `{ resource: "doc", action: "read" }`.
Literal type parameters are preserved, so `Permission<"doc", "read">` and
`Permission<"doc", "write">` are incompatible at compile time.
See [BEH-QD-001](behaviors/01-permissions.md).

## Permission key

The `"resource:action"` string used for O(1) membership testing against a
subject. Because `:` separates the two halves, it is forbidden **inside** either
half — otherwise two distinct permissions could produce one key and each would
silently grant the other.
See [INV-QD-001](invariants.md#inv-qd-001-permission-key-uniqueness).

## Role

A named set of permissions that may inherit from other roles. Parents are held
**by value**, so the inheritance graph is a directed acyclic graph by
construction rather than by validation.
See [BEH-QD-009](behaviors/02-roles.md) and [INV-QD-002](invariants.md#inv-qd-002-role-graph-acyclicity).

## Flattening

Collecting the transitive closure of a role's permissions and role names. Done
once, when a subject is built, so that evaluation never walks the role graph.
A diamond — two parents sharing a grandparent — is walked once, not
exponentially. See [BEH-QD-010](behaviors/02-roles.md).

## Policy

A tree of authorization conditions, and the central data type of the library.
Fourteen variants discriminated on `_tag`. A policy is **plain data**: it contains
no closures, so it can be stored as JSON and reloaded without loss.
See [BEH-QD-017](behaviors/03-policy-adt.md) and [ADR-QD-002](decisions/002-schema-derived-policy-adt.md).

## Combinator

A function that builds a policy — `hasPermission`, `allOf`, `not`, and the rest.
Combinators are the public construction surface; the raw union exists but is
rarely written by hand. See [BEH-QD-019](behaviors/03-policy-adt.md).

## Matcher

A comparison applied to an attribute value: `eq`, `gte`, `someMatch`, and so on.
Like policies, matchers are data rather than predicates, which is what allows a
whole policy to serialize. Matcher evaluation is pure and synchronous;
attribute *resolution* happens before it.
See [BEH-QD-025](behaviors/04-matchers.md).

## Value reference

What a matcher compares against: a constant (`literal`), a field of the subject
(`subject`), or a field of the resource (`resource`). The last is what expresses
relational rules such as "the document's owner equals the subject's id".
See [BEH-QD-026](behaviors/04-matchers.md).

## Evaluation

## Decision

The outcome of evaluating a policy: `Allow` or `Deny`. Both carry the evaluation
id, subject id, duration and full trace. `Allow` additionally carries the
visible field set. See [BEH-QD-039](behaviors/05-evaluator.md).

## Trace

The tree of per-node results produced by every evaluation, so a denial can
always answer "why". Durations come from Effect's `Clock`, which is what makes
traces assertable in tests rather than merely printable.
See [INV-QD-008](invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history).

## Short-circuiting

Stopping evaluation as soon as the outcome is determined: at the first denying
child of an `allOf`, the first allowing child of an `anyOf`. The one exception
is the `Union` field strategy, which must observe every child to merge their
field sets — a semantic requirement, not a performance choice.
See [INV-QD-005](invariants.md#inv-qd-005-short-circuit-preservation).

A **rule table** stops by its own rule instead — at the first row that cannot be
overridden, which is not always the first row that decides anything.
See [INV-QD-017](invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden).

## Rule table

An ordered list of rows, each pairing a condition with an effect, walked from the
top. The construct that lets a policy say "and if this matches, refuse". Written
with `rules`, `permitWhen` and `denyWhen`.
See [BEH-QD-111](behaviors/15-rules.md) and [ADR-QD-023](decisions/023-combining-algorithms.md).

## Rule effect

`Permit` or `Deny` — what it means for a row to apply. The second bit a boolean
combinator cannot carry: under `anyOf`, a child that denies and a child that is
irrelevant are the same event; in a rule table they are opposites.
See [BEH-QD-111](behaviors/15-rules.md).

## Applicability

What a rule's condition answers. Allowing means *this row applies*, not *this is
permitted* — so inside a `Deny` row an allowing condition produces a refusal.
See [BEH-QD-112](behaviors/15-rules.md).

## Combining algorithm

How a rule table resolves the rows that applied: `FirstApplicable`,
`DenyOverrides` or `PermitOverrides`. Exactly one row decides under each, and it
supplies the decision's field set and obligations.
See [BEH-QD-112](behaviors/15-rules.md).

## Predicate

A policy compiled into a filter over rows the caller has not loaded — abstract,
with no SQL and no dialect, so the caller compiles it for their own engine.
Answers **which rows**, never which columns.
See [BEH-QD-121](behaviors/16-predicates.md) and [ADR-QD-024](decisions/024-predicate-output.md).

## Folding

Reducing a policy node to a constant at compile time, because it asks about the
subject rather than the row. Roles, permissions, the action and subject
attributes all fold; a relationship cannot, being keyed by the row's id.
See [BEH-QD-123](behaviors/16-predicates.md).

## Translatable subset

The part of the policy ADT that has a predicate form. Anything outside it fails
with `PolicyNotTranslatable` rather than being approximated — a node quietly
rendered as `True` would return rows the policy denies.
See [BEH-QD-123](behaviors/16-predicates.md).

## Reference interpreter

`evaluatePredicate` — the executable semantics of a predicate, applied to one
row. What makes a second interpreter over the policy tree trustworthy rather
than merely plausible, and what a caller differential-tests their SQL compiler
against.
See [BEH-QD-122](behaviors/16-predicates.md) and [INV-QD-018](invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).

## Resolver

A service that answers a question the subject cannot: `AttributeResolver` for
attributes not already on the subject, `RelationshipResolver` for graph
questions. Both return `Effect`, so an implementation may perform I/O.
See [BEH-QD-042](behaviors/06-services.md).

## Fail closed

Denying when information is missing or wiring is absent. Every default layer in
this library fails closed: an unwired relationship resolver denies, an absent
subject holds nothing. A default that granted would turn a wiring omission into
a silent breach. See [INV-QD-007](invariants.md#inv-qd-007-defaults-fail-closed).

Note the deliberate distinction from **failure**: a *broken* lookup is an error,
not a denial. Fail-closed applies to absent information, not to faults.
See [INV-QD-006](invariants.md#inv-qd-006-failure-is-not-denial).

## Authorization models

## RBAC

Role-Based Access Control. Access follows from role membership: `hasRole`.

## ABAC

Attribute-Based Access Control. Access follows from properties of the subject or
the resource: `hasAttribute`, `hasResourceAttribute`.

## ReBAC

Relationship-Based Access Control. Access follows from a relationship between
subject and resource — "is Alice the owner of this document?" — resolved by
traversing a graph: `hasRelationship`.

Qadi supports all three in one policy tree rather than treating them as
alternative products. A single `allOf` may combine a role check, an attribute
comparison and a relationship traversal.

## Field-level authorization

## Field visibility

The set of fields a subject may see, decided by the same policy that decides
whether they may read at all. This is what makes authorization a *projection*
rather than a boolean.

An **absent** field set means all fields — the top of the lattice, not the
empty set. Reading it as "none" would invert the meaning of every unrestricted
policy. See [INV-QD-004](invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top).

## Field strategy

How a composite policy merges its children's field sets. `Intersection` keeps
what every allowing child agrees on (least privilege, the default for `allOf`);
`Union` merges all of them; `First` takes the first allowing child's set (the
default for `anyOf`, and the one that short-circuits).

The strategy is a **required** field on the schema, so it always survives
serialization. In the predecessor it was optional and never written, which
silently narrowed visibility on every reload.
See [ADR-QD-006](decisions/006-field-strategy-always-encoded.md).

## Projection

Narrowing a record to the fields a decision exposes. A denial projects to `{}`;
an unrestricted allow projects to the whole record.
See [BEH-QD-051](behaviors/07-enforcement.md).

## Effect vocabulary

These carry their standard Effect meanings; they are listed because the
specification uses them as terms of art.

## Service

A dependency declared with `Context.Service<Self, Shape>()("ns/Id")` and
supplied from the environment. Qadi declares four: `CurrentSubject`,
`AttributeResolver`, `RelationshipResolver`, `EvaluationId`.
See [BEH-QD-041](behaviors/06-services.md).

## Layer

A recipe for constructing a service. Qadi's layers are exported top-level
constants rather than static members, one implementation per file.
See [ADR-QD-010](decisions/010-context-service-and-layers.md).

## Current subject

The `CurrentSubject` service — the subject for the request being evaluated.
Provided per request via `currentSubjectLayer`. Named that way rather than as a
static `of`, because `Context.Service` already defines `of` as the service
constructor. See [BEH-QD-044](behaviors/06-services.md).

Subject-set evaluation is the one place there is none: `decideSubjects` supplies
each element as the subject for its own evaluation, which discharges the
requirement. See [review query](#review-query).

## Subject set

A list of subjects one policy is evaluated across —
`decideSubjects(policy, subjects)`. The transpose of `Qadi.filter`, which
evaluates one policy across a list of resources.

Each element is decided exactly as it would have been alone
([INV-QD-016](invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone));
the elements are neighbours, never inputs to one another.

## Review query

An authorization question asked *about* people rather than *by* one: "who can
reach this?" for a sharing dialog or a leak investigation, "what can this person
reach?" for an access review.

Narrower here than in ordinary use, in one respect that matters. A review query
**reports**: it hands identities to an administrator, so nobody is being granted
access and no obligation is discharged. That is what separates
`filterSubjects` from `filter`, which hands over the resources themselves and
must therefore refuse an allow nobody has met.
See [BEH-QD-107](behaviors/14-subject-sets.md).

## Aspect

A function that wraps an `Effect` to add behaviour without changing its shape.
`Qadi.enforce(policy)` is one: it fails the wrapped effect with `AccessDenied`
when the policy denies, and — importantly — never starts it.
See [INV-QD-009](invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied).

## Atom

A node of reactive state from `effect/unstable/reactivity`. Qadi's React
package defines one per distinct authorization question, so components asking
the same question share one evaluation rather than each running their own.
See [ADR-QD-014](decisions/014-react-via-atoms.md).

## Atom registry

The store that computes atom values, tracks their dependencies, and disposes
them when nothing is watching. Each `QadiProvider` owns one, which is what
makes two authorization contexts structurally unable to see each other's
decisions. See [BEH-QD-070](behaviors/09-react.md).

## Waiting

A flag on an `AsyncResult` meaning "this is the previous value, and a new one is
being computed". For cached data that is stale-while-revalidate; for
authorization it is an over-permission, so every convenience API in
`@qadi/react` treats a waiting result as *not decided*.
See [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md).

## Invalidation

Discarding decisions so they are computed again, keyed through the `Reactivity`
service. Needed because authority changes independently of identity: a role
granted server-side leaves the same subject id holding different powers, and
nothing in the atom graph would notice on its own.
See [BEH-QD-069](behaviors/09-react.md).

## Trust boundary

A point where data arrives from outside the process and must be validated.
Policies cross one — they are persisted and reloaded — which is the reason the
policy ADT is schema-derived while ordinary domain types are hand-written
interfaces. See [ADR-QD-002](decisions/002-schema-derived-policy-adt.md).

## Explanation

What a policy *says*, as a tree — as opposed to a **trace**, which is what one
evaluation *did*. Produced by `explain`, rendered to English by
`renderExplanation`, and computed without a subject: an explanation that varied by
viewer would be a trace, and showing one would leak whether the viewer satisfies a
policy they are only meant to read (ADR-QD-027).

## Simplification

An opt-in rewrite of a policy tree to an equivalent smaller one. Preserves the
verdict, the visible fields and the obligations; does **not** preserve the trace,
which is why nothing in the library applies it (ADR-QD-030). Note that
`not(not(p))` is *not* `p` here — a negation carries no field set and no
obligations by design.

## Join and meet

The least upper bound and greatest lower bound of two security labels: `join`
takes the maximum level and the **union** of the compartments, `meet` the minimum
and the intersection. Qadi never calls either — deriving a label is not deciding an
access — but they are exported because computing a join by hand under-classifies
silently (ADR-QD-029).

## Hydration

Carrying decisions the server already made into a client registry, so the first
render has answers instead of a pending state. A payload is bound to a subject id
and refused whole on a mismatch, and carries no trace by default (ADR-QD-028).

## Concurrency, in evaluation

An opt-in `EvaluateOptions.concurrency` that evaluates the children of a composite
in parallel. It changes which lookups happen and how long they take, and nothing
else: the decision and the whole trace are identical, because both paths drive the
same fold in declaration order (ADR-QD-026). It forfeits **short-circuiting**,
which is why it is opt-in.

## Witness

Proof that a policy check succeeded for a specific permission and resource,
held as `Authorized<P>`. Structurally carries the exact permission it was
checked for — a witness for one permission is not assignable where a
different permission's witness is required — so it is a stronger guarantee
than a boolean or a discarded `Decision`: code typed to require one cannot be
called without a [Guard](#guard) call site upstream having produced it.

Deliberately not called "Capability": that word already names a different,
shipped access-control model in [`spec/models/04-capability.md`](models/04-capability.md)
— holding a `Permission` token *is* the authority there, with no policy to
evaluate; a witness is closer to the opposite, proof that a full `Policy`
evaluation succeeded. See [ADR-QD-035](decisions/035-witness-guard-primitive.md).

## Guard

The combinator that produces a [Witness](#witness):
`guard(permission, policy)(resource, handler)`. Built on `enforce`, sharing
its obligation-discharge and denial handling, but shaped differently — it
takes a resource and a handler function rather than wrapping an existing
effect, since a witness needs somewhere to go once the check succeeds. Not
folded into the [Aspect](#aspect) entry above: an aspect wraps an `Effect`
without changing its shape, and `guard` does change it.
See [ADR-QD-035](decisions/035-witness-guard-primitive.md).

---

_Related: [Overview](./overview.md) · [Invariants](./invariants.md) · [User Requirements](./urs.md)_
