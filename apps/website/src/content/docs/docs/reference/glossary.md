---
title: Glossary
description: Qadi's vocabulary — Policy, Matcher, Decision, Trace, Obligation, Subject, and the rest of the terms the docs use as terms of art.
---

Terms Qadi's documentation uses with a specific meaning, grouped by topic.
Where a word means something narrower here than its ordinary industry sense,
that narrowing is called out.

## Core concepts

### Subject

The entity being authorized — usually a user, sometimes a service account.
Represented as an `AuthSubject`: an id, a set of role names, a pre-flattened
set of permission keys, and a bag of attributes. A subject is a **value**,
built once per request and supplied as a layer, so nothing can mutate it
mid-evaluation.

### Permission

A `resource` + `action` pair, e.g. `{ resource: "doc", action: "read" }`.
`Permission<"doc", "read">` and `Permission<"doc", "write">` are distinct,
incompatible types at compile time.

### Permission key

The `"resource:action"` string form of a permission, used for constant-time
membership checks against a subject. `:` is forbidden inside either half,
because otherwise two different permissions could collide on one key.

### Role

A named set of permissions that may inherit from other roles. Parents are
held by value, so the inheritance graph is a DAG by construction rather than
by validation.

### Flattening

Computing the transitive closure of a role's permissions and role names,
once, when a subject is built — so evaluation itself never has to walk the
role graph.

### Policy

A tree of authorization conditions, and the central data type of the
library. Fourteen variants discriminated on `_tag`. A policy is plain data —
no closures — so it can be stored as JSON and reloaded without loss.

### Combinator

A function that builds a policy: `hasPermission`, `allOf`, `not`, and the
rest. The public surface for constructing policies; the raw union
underneath is rarely written by hand.

### Matcher

A comparison applied to a resolved attribute value: `eq`, `gte`,
`someMatch`, and so on. Like policies, matchers are data rather than
predicates — that's what lets a whole policy serialize. Matcher evaluation
is pure and synchronous; resolving the attribute it compares happens
beforehand.

### Value reference

What a matcher compares against: a constant (`literal`), a field of the
subject (`subject`), or a field of the resource (`resource`). The last is
what expresses relational rules such as "the document's owner equals the
subject's id."

## Evaluation

### Decision

The outcome of evaluating a policy: `Allow` or `Deny`. Both carry the
evaluation id, subject id, duration, and full trace; `Allow` additionally
carries the visible field set.

### Trace

The tree of per-node results every evaluation produces, so a denial can
always answer "why." Durations come from Effect's `Clock`, which is what
makes traces assertable in tests rather than merely printable.

### Short-circuiting

Stopping evaluation as soon as the outcome is determined — at the first
denying child of `allOf`, or the first allowing child of `anyOf`. The one
exception is the `Union` field strategy, which has to observe every child to
merge their field sets. A rule table short-circuits by its own rule instead:
at the first row that cannot be overridden, which isn't always the first row
that decides anything.

### Rule table

An ordered list of rows, each pairing a condition with an effect, walked
from the top — what lets a policy say "and if this matches, refuse."
Written with `rules`, `permitWhen`, and `denyWhen`.

### Rule effect

`Permit` or `Deny` — what it means for a row to apply. This is the bit a
boolean combinator can't carry: under `anyOf`, a denying child and an
irrelevant one are the same event, but in a rule table they're opposites.

### Applicability

What a rule's condition actually answers: *this row applies*, not *this is
permitted*. So inside a `Deny` row, an allowing condition produces a
refusal.

### Combining algorithm

How a rule table resolves the rows that applied: `FirstApplicable`,
`DenyOverrides`, or `PermitOverrides`. Exactly one row decides under each,
and that row supplies the decision's field set and obligations.

### Predicate

A policy compiled into a filter over rows the caller hasn't loaded yet —
abstract, with no SQL and no dialect baked in, so the caller (or a companion
package) compiles it for their own engine. A predicate answers **which
rows**, never which columns.

### Folding

Reducing a policy node to a constant at compile time, because it asks about
the subject rather than the row. Roles, permissions, the action, and
subject attributes all fold; a relationship can't, since it's keyed by the
row's id.

### Translatable subset

The part of the policy ADT that has a predicate form. Anything outside it
fails with `PolicyNotTranslatable` rather than being approximated — silently
rendering a node as `True` would return rows the policy actually denies.

### Reference interpreter

`evaluatePredicate` — the executable semantics of a predicate, applied to
one row. What makes a predicate trustworthy rather than merely plausible: a
caller differential-tests their own SQL compiler against it.

### Resolver

A service that answers a question the subject itself can't:
`AttributeResolver` for attributes not already on the subject,
`RelationshipResolver` for graph questions. Both return `Effect`, so an
implementation may perform I/O.

### Fail closed

Denying when information is missing or wiring is absent — an unwired
relationship resolver denies, an absent subject holds nothing. This is
distinct from **failure**: a *broken* lookup is an error, never a denial.
Fail-closed applies to absent information, not to faults.

## Authorization models

### RBAC

Role-Based Access Control. Access follows from role membership: `hasRole`.

### ABAC

Attribute-Based Access Control. Access follows from properties of the
subject or the resource: `hasAttribute`, `hasResourceAttribute`.

### ReBAC

Relationship-Based Access Control. Access follows from a relationship
between subject and resource — "is Alice the owner of this document?" —
resolved by traversing a graph: `hasRelationship`.

Qadi supports all three in one policy tree rather than as alternative
products — a single `allOf` can combine a role check, an attribute
comparison, and a relationship traversal.

## Field-level authorization

### Field visibility

The set of fields a subject may see, decided by the same policy that
decides whether they may read at all — what makes authorization a
*projection* rather than a boolean. An **absent** field set means all
fields (the top of the lattice), never the empty set.

### Field strategy

How a composite policy merges its children's field sets. `Intersection`
keeps what every allowing child agrees on (the default for `allOf`, least
privilege); `Union` merges all of them; `First` takes the first allowing
child's set (the default for `anyOf`, and the one that short-circuits).
It's a required schema field, so it always survives serialization.

### Projection

Narrowing a record to the fields a decision exposes. A denial projects to
`{}`; an unrestricted allow projects to the whole record.

## Effect vocabulary

These carry their standard Effect meanings; listed here because the docs
use them as terms of art.

### Service

A dependency declared with `Context.Service<Self, Shape>()("ns/Id")` and
supplied from the environment — `CurrentSubject`, `AttributeResolver`,
`RelationshipResolver`, and `EvaluationId` among them.

### Layer

A recipe for constructing a service. Qadi's layers are exported top-level
constants, one implementation per file, rather than static members on a
class.

### Current subject

The `CurrentSubject` service — the subject for the request being evaluated,
provided per request via `currentSubjectLayer`. The one place there's no
current subject is subject-set evaluation, where `decideSubjects` supplies
each element as the subject for its own evaluation.

### Subject set

A list of subjects one policy is evaluated across —
`decideSubjects(policy, subjects)` — the transpose of `Qadi.filter`, which
evaluates one policy across a list of resources instead. Each element is
decided exactly as it would have been alone.

### Review query

An authorization question asked *about* people rather than *by* one: "who
can reach this?" or "what can this person reach?" A review query
**reports** — it hands identities to an administrator, grants nothing, and
discharges no obligation. That's what separates `filterSubjects` (reports)
from `filter` (hands over the resources themselves, and so must refuse an
unmet obligation).

### Aspect

A function that wraps an `Effect` to add behavior without changing its
shape. `Qadi.enforce(policy)` is one: it fails the wrapped effect with
`AccessDenied` on a denial, and — importantly — never starts it.

### Atom

A node of reactive state from `effect/unstable/reactivity`. `@qadi/react`
defines one per distinct authorization question, so components asking the
same question share one evaluation.

### Atom registry

The store that computes atom values, tracks their dependencies, and
disposes them when nothing is watching. Each `QadiProvider` owns one, which
is what keeps two authorization contexts structurally unable to see each
other's decisions.

### Waiting

A flag on an `AsyncResult` meaning "this is the previous value, and a new
one is being computed." For authorization that's an over-permission, so
every convenience API in `@qadi/react` treats a waiting result as *not
decided*.

### Invalidation

Discarding decisions so they're computed again, keyed through the
`Reactivity` service — needed because authority can change independently of
identity (a role granted server-side, say), and nothing in the atom graph
would notice on its own.

### Trust boundary

A point where data arrives from outside the process and must be validated.
Policies cross one — they're persisted and reloaded — which is why the
policy ADT is schema-derived while ordinary domain types are hand-written
interfaces.

### Explanation

What a policy *says*, as a tree — as opposed to a **trace**, which is what
one evaluation *did*. Produced by `explain`, rendered to English by
`renderExplanation`, and computed without a subject, so it can't leak
whether a particular viewer satisfies a policy they're only meant to read.

### Simplification

An opt-in rewrite of a policy tree to a smaller, equivalent one. Preserves
the verdict, the visible fields, and the obligations; does **not** preserve
the trace, which is why nothing in the library applies it automatically.

### Join and meet

The least upper bound and greatest lower bound of two security labels:
`join` takes the maximum level and the union of compartments, `meet` the
minimum and the intersection. Qadi never calls either internally — deriving
a label isn't deciding an access — but they're exported because computing a
join by hand under-classifies silently.

### Hydration

Carrying decisions the server already made into a client registry, so the
first render has answers instead of a pending state. A payload is bound to
a subject id and refused whole on a mismatch, and carries no trace by
default.

### Concurrency, in evaluation

An opt-in `EvaluateOptions.concurrency` that evaluates a composite's
children in parallel. It changes which lookups happen and how long they
take, and nothing else — the decision and the whole trace stay identical.
It forfeits short-circuiting, which is why it's opt-in.

### Witness

Proof that a policy check succeeded for a specific permission and resource,
held as `Authorized<P>`. It structurally carries the exact permission it
was checked for, so it's a stronger guarantee than a boolean or a discarded
`Decision`: code typed to require a witness can't be called without a
`guard` call site upstream having produced one. Deliberately not called
"Capability" — that word already names a different, shipped access-control
model (holding a `Permission` token *is* the authority there); a witness is
closer to the opposite, proof that a full policy evaluation succeeded.

### Guard

The combinator that produces a witness:
`guard(permission, policy)(resource, handler)`. Built on `enforce`, sharing
its obligation-discharge and denial handling, but shaped differently — it
takes a resource and a handler function rather than wrapping an existing
effect, since a witness needs somewhere to go once the check succeeds.

---

[Full glossary on GitHub →](https://github.com/leaderiop/qadi/blob/main/spec/glossary.md)
