# Glossary

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-GLOSSARY                                 |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Functional Specification                       |
> | Change History | 1.1 (2026-07-26): Reactivity terms added (CCR-EG-003)<br>1.0 (2026-07-25): Initial release (CCR-EG-002) |

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
See [BEH-EG-044](behaviors/06-services.md) and [Current subject](#current-subject).

## Permission

A `resource` + `action` pair, such as `{ resource: "doc", action: "read" }`.
Literal type parameters are preserved, so `Permission<"doc", "read">` and
`Permission<"doc", "write">` are incompatible at compile time.
See [BEH-EG-001](behaviors/01-permissions.md).

## Permission key

The `"resource:action"` string used for O(1) membership testing against a
subject. Because `:` separates the two halves, it is forbidden **inside** either
half — otherwise two distinct permissions could produce one key and each would
silently grant the other.
See [INV-EG-001](invariants.md#inv-eg-001-permission-key-uniqueness).

## Role

A named set of permissions that may inherit from other roles. Parents are held
**by value**, so the inheritance graph is a directed acyclic graph by
construction rather than by validation.
See [BEH-EG-009](behaviors/02-roles.md) and [INV-EG-002](invariants.md#inv-eg-002-role-graph-acyclicity).

## Flattening

Collecting the transitive closure of a role's permissions and role names. Done
once, when a subject is built, so that evaluation never walks the role graph.
A diamond — two parents sharing a grandparent — is walked once, not
exponentially. See [BEH-EG-010](behaviors/02-roles.md).

## Policy

A tree of authorization conditions, and the central data type of the library.
Nine variants discriminated on `_tag`. A policy is **plain data**: it contains
no closures, so it can be stored as JSON and reloaded without loss.
See [BEH-EG-017](behaviors/03-policy-adt.md) and [ADR-EG-002](decisions/002-schema-derived-policy-adt.md).

## Combinator

A function that builds a policy — `hasPermission`, `allOf`, `not`, and the rest.
Combinators are the public construction surface; the raw union exists but is
rarely written by hand. See [BEH-EG-019](behaviors/03-policy-adt.md).

## Matcher

A comparison applied to an attribute value: `eq`, `gte`, `someMatch`, and so on.
Like policies, matchers are data rather than predicates, which is what allows a
whole policy to serialize. Matcher evaluation is pure and synchronous;
attribute *resolution* happens before it.
See [BEH-EG-025](behaviors/04-matchers.md).

## Value reference

What a matcher compares against: a constant (`literal`), a field of the subject
(`subject`), or a field of the resource (`resource`). The last is what expresses
relational rules such as "the document's owner equals the subject's id".
See [BEH-EG-026](behaviors/04-matchers.md).

## Evaluation

## Decision

The outcome of evaluating a policy: `Allow` or `Deny`. Both carry the evaluation
id, subject id, duration and full trace. `Allow` additionally carries the
visible field set. See [BEH-EG-039](behaviors/05-evaluator.md).

## Trace

The tree of per-node results produced by every evaluation, so a denial can
always answer "why". Durations come from Effect's `Clock`, which is what makes
traces assertable in tests rather than merely printable.
See [INV-EG-008](invariants.md#inv-eg-008-evaluation-is-reproducible).

## Short-circuiting

Stopping evaluation as soon as the outcome is determined: at the first denying
child of an `allOf`, the first allowing child of an `anyOf`. The one exception
is the `Union` field strategy, which must observe every child to merge their
field sets — a semantic requirement, not a performance choice.
See [INV-EG-005](invariants.md#inv-eg-005-short-circuit-preservation).

## Resolver

A service that answers a question the subject cannot: `AttributeResolver` for
attributes not already on the subject, `RelationshipResolver` for graph
questions. Both return `Effect`, so an implementation may perform I/O.
See [BEH-EG-042](behaviors/06-services.md).

## Fail closed

Denying when information is missing or wiring is absent. Every default layer in
this library fails closed: an unwired relationship resolver denies, an absent
subject holds nothing. A default that granted would turn a wiring omission into
a silent breach. See [INV-EG-007](invariants.md#inv-eg-007-defaults-fail-closed).

Note the deliberate distinction from **failure**: a *broken* lookup is an error,
not a denial. Fail-closed applies to absent information, not to faults.
See [INV-EG-006](invariants.md#inv-eg-006-failure-is-not-denial).

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

Guard supports all three in one policy tree rather than treating them as
alternative products. A single `allOf` may combine a role check, an attribute
comparison and a relationship traversal.

## Field-level authorization

## Field visibility

The set of fields a subject may see, decided by the same policy that decides
whether they may read at all. This is what makes authorization a *projection*
rather than a boolean.

An **absent** field set means all fields — the top of the lattice, not the
empty set. Reading it as "none" would invert the meaning of every unrestricted
policy. See [INV-EG-004](invariants.md#inv-eg-004-field-visibility-is-a-lattice-with-undefined-at-the-top).

## Field strategy

How a composite policy merges its children's field sets. `Intersection` keeps
what every allowing child agrees on (least privilege, the default for `allOf`);
`Union` merges all of them; `First` takes the first allowing child's set (the
default for `anyOf`, and the one that short-circuits).

The strategy is a **required** field on the schema, so it always survives
serialization. In the predecessor it was optional and never written, which
silently narrowed visibility on every reload.
See [ADR-EG-006](decisions/006-field-strategy-always-encoded.md).

## Projection

Narrowing a record to the fields a decision exposes. A denial projects to `{}`;
an unrestricted allow projects to the whole record.
See [BEH-EG-051](behaviors/07-enforcement.md).

## Effect vocabulary

These carry their standard Effect meanings; they are listed because the
specification uses them as terms of art.

## Service

A dependency declared with `Context.Service<Self, Shape>()("ns/Id")` and
supplied from the environment. Guard declares four: `CurrentSubject`,
`AttributeResolver`, `RelationshipResolver`, `EvaluationId`.
See [BEH-EG-041](behaviors/06-services.md).

## Layer

A recipe for constructing a service. Guard's layers are exported top-level
constants rather than static members, one implementation per file.
See [ADR-EG-010](decisions/010-context-service-and-layers.md).

## Current subject

The `CurrentSubject` service — the subject for the request being evaluated.
Provided per request via `currentSubjectLayer`. Named that way rather than as a
static `of`, because `Context.Service` already defines `of` as the service
constructor. See [BEH-EG-044](behaviors/06-services.md).

## Aspect

A function that wraps an `Effect` to add behaviour without changing its shape.
`Guard.enforce(policy)` is one: it fails the wrapped effect with `AccessDenied`
when the policy denies, and — importantly — never starts it.
See [INV-EG-009](invariants.md#inv-eg-009-guarded-effects-do-not-run-when-denied).

## Atom

A node of reactive state from `effect/unstable/reactivity`. Guard's React
package defines one per distinct authorization question, so components asking
the same question share one evaluation rather than each running their own.
See [ADR-EG-014](decisions/014-react-via-atoms.md).

## Atom registry

The store that computes atom values, tracks their dependencies, and disposes
them when nothing is watching. Each `GuardProvider` owns one, which is what
makes two authorization contexts structurally unable to see each other's
decisions. See [BEH-EG-070](behaviors/09-react.md).

## Waiting

A flag on an `AsyncResult` meaning "this is the previous value, and a new one is
being computed". For cached data that is stale-while-revalidate; for
authorization it is an over-permission, so every convenience API in
`@guard/react` treats a waiting result as *not decided*.
See [ADR-EG-017](decisions/017-stale-decisions-are-not-decisions.md).

## Invalidation

Discarding decisions so they are computed again, keyed through the `Reactivity`
service. Needed because authority changes independently of identity: a role
granted server-side leaves the same subject id holding different powers, and
nothing in the atom graph would notice on its own.
See [BEH-EG-069](behaviors/09-react.md).

## Trust boundary

A point where data arrives from outside the process and must be validated.
Policies cross one — they are persisted and reloaded — which is the reason the
policy ADT is schema-derived while ordinary domain types are hand-written
interfaces. See [ADR-EG-002](decisions/002-schema-derived-policy-adt.md).

---

_Related: [Overview](./overview.md) · [Invariants](./invariants.md) · [User Requirements](./urs.md)_
