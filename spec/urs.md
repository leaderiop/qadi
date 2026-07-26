# User Requirements

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-URS                                       |
> | Revision       | 1.16                                           |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | User Requirements Specification                |
> | Change History | 1.16 (2026-07-26): URS-QD-027, the decision cache (CCR-QD-032)<br>1.15 (2026-07-26): URS-QD-026, simplification (CCR-QD-031)<br>1.14 (2026-07-26): URS-QD-025, deriving a label (CCR-QD-030)<br>1.13 (2026-07-26): URS-QD-024, decision hydration (CCR-QD-029)<br>1.12 (2026-07-26): URS-QD-023, policy explanation (CCR-QD-028)<br>1.11 (2026-07-26): URS-QD-022, concurrent evaluation (CCR-QD-027)<br>1.10 (2026-07-26): URS-QD-021, predicate output (CCR-QD-020)<br>1.9 (2026-07-26): URS-QD-020, ordered rule tables (CCR-QD-019)<br>1.8 (2026-07-26): URS-QD-019, subject sets (CCR-QD-018)<br>1.7 (2026-07-26): URS-QD-018, label dominance (CCR-QD-017)<br>1.6 (2026-07-26): URS-QD-017, decision history (CCR-QD-016)<br>1.5 (2026-07-26): URS-QD-016, obligations (CCR-QD-015)<br>1.4 (2026-07-26): URS-QD-015, the action dimension (CCR-QD-012)<br>1.3 (2026-07-26): URS-QD-012 gap closed (CCR-QD-010)<br>1.2 (2026-07-26): URS-QD-010 gap closed; URS-QD-013 title reworded (CCR-QD-009)<br>1.1 (2026-07-26): React verification re-pointed (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-002) |

---

## 1. Purpose

This document states what users need from Qadi, in their terms. The
[behaviors](./behaviors/01-permissions.md) state how the library satisfies those
needs, in the library's terms. Each requirement below traces forward to at least
one behavior in [§6](#6-traceability).

Requirements are written retroactively against a working implementation. That is
worth stating plainly rather than disguising: the library was built first, from
a defect analysis of its predecessor, and the requirements were extracted
afterwards. They are therefore a faithful description of what exists, and a
weaker instrument for discovering what is missing. [§7](#7-known-gaps) records
what that process did surface.

### 1.1 Scope

| In scope | Out of scope |
| -------- | ------------ |
| Deciding whether a subject may act | Authenticating the subject |
| Deciding which fields they may see | Storing users, roles or policies |
| Composing RBAC, ABAC and ReBAC conditions | Providing a policy authoring UI |
| Serializing policies for storage and transport | Durable, tamper-evident audit trails |
| Reporting decisions to tracing | Regulated-environment qualification |

Qadi decides. It does not authenticate, persist, or administer. Anything it
cannot do correctly, it does not offer — see
[ADR-QD-016](./decisions/016-gxp-out-of-scope.md).

## 2. User groups

| Group | Needs |
| ----- | ----- |
| **Application developer** | Express an access rule and enforce it at a call site, without threading context through every function |
| **Security engineer** | Read a policy and know what it permits; be confident the default is denial |
| **Platform engineer** | See authorization decisions in existing tracing; swap resolvers per environment |
| **Test author** | Assert on decisions deterministically, including timing and identifiers |

## 3. Functional requirements

### URS-QD-001 — Express permission, role, attribute and relationship rules

A developer must be able to state that access requires a permission, a role, a
property of the subject, a property of the resource, or a relationship between
them — and to combine these freely with and/or/not.

Rationale: real rules mix models. "An editor who is also the document's owner,
unless the document is locked" is one rule, not three systems.

### URS-QD-002 — Enforce a rule at a call site without plumbing

Enforcing a policy must not require passing the subject, resolvers and
configuration through intermediate functions.

Rationale: the predecessor's enforcement function took eight arguments, so
enforcement was onerous enough to skip. A guard that is inconvenient is a guard
that gets omitted.

### URS-QD-003 — Guarantee that denied work does not execute

When a policy denies, the guarded operation must not run at all — not merely
have its result discarded.

Rationale: guarding a deletion must actually prevent the deletion.

### URS-QD-004 — Restrict which fields a caller may see

A single rule must decide both whether a subject may read a record and which of
its fields are returned.

Rationale: "may read the user record" and "may read the user's salary" are the
same decision at different granularities. Splitting them across two mechanisms
guarantees they eventually disagree.

### URS-QD-005 — Store a policy and reload it unchanged

A policy written to durable storage and read back must behave identically.

Rationale: this is the defect that motivated the rewrite. The predecessor
narrowed field visibility silently on reload.

### URS-QD-006 — Reject malformed or hostile policy input

Decoding a policy from an untrusted source must reject unknown variants,
invalid permission segments, malformed JSON and unbounded nesting.

### URS-QD-007 — Distinguish "not permitted" from "could not determine"

A failure to reach an attribute store or relationship service must be reported
as an error, never as a denial.

Rationale: an outage reported as a denial sends an engineer to audit
permissions instead of the failing dependency.

### URS-QD-008 — Deny by default

Absent configuration, missing subject, or an unwired resolver must produce
denials, never grants.

### URS-QD-009 — Explain a denial

Every decision must carry a structured trace sufficient to answer why access was
refused.

### URS-QD-010 — Avoid unnecessary work

Evaluating a rule must not perform lookups for branches whose outcome cannot
affect the result.

Rationale: authorization sits on the request path. A rule whose cheap branch
succeeds must not pay for its expensive branches.

### URS-QD-011 — Substitute implementations per environment

Attribute and relationship resolution must be replaceable — in-memory in tests,
a real service in production — without touching policy or enforcement code.

### URS-QD-012 — Observe decisions in existing tooling

Authorization outcomes must appear in the tracing the application already runs,
with no bespoke adapter.

### URS-QD-013 — Enforce the same rules in a user interface

The rules enforced on the server must be usable to show and hide interface
elements, from the same policy values.

### URS-QD-014 — Isolate authorization contexts

An application serving several tenants in one process must be able to keep their
authorization contexts separate.

### URS-QD-027 — Ask the same question twice without paying twice

A developer whose request asks one authorization question many times must be able to
pay for it once, and must be certain that doing so cannot change the answer or make
two decisions indistinguishable in a log.

Rationale: a request resolving forty fields may ask the same question forty times,
each costing lookups against the caller's own store. The certainty has two halves: a
cache keyed without the subject would serve one person's permissions to another, and a
cache holding whole decisions would duplicate the identifier that exists to correlate
a decision with the request that made it.

### URS-QD-026 — Flatten a policy built by composition

A developer composing policies from helpers must be able to reduce the resulting tree
to an equivalent smaller one, and must be certain the reduction cannot change who is
allowed or what they may see.

Rationale: a tenant helper composed with a role helper composed with an ownership
helper produces a tree several nodes deeper than the rule it expresses, which makes a
stored policy harder to read and a compiled predicate longer than it needs to be. The
certainty is the requirement: a transform that preserved allow-or-deny while altering
the field set would be a disclosure change that every existing test would pass.

### URS-QD-025 — Classify a document derived from two others

A developer combining data from two sources must be able to compute the label of
the result correctly, without reimplementing the arithmetic.

Rationale: the natural mistake is to take the higher level and carry its
compartments, which labels the derived object *below* its own contents — so a reader
lacking the dropped compartment reads material they are not cleared for, while every
comparison in the system behaves correctly. It is the one place a caller's
arithmetic error becomes an authorization defect, and a prose warning cannot prevent
it.

### URS-QD-024 — Render a guarded page without a flash

A developer server-rendering a page must be able to ship the decisions the server
already made, so the first client render shows the right controls rather than a
pending state that resolves after mount.

Rationale: without it every guarded control renders pending and then re-decides,
which is both a visible flash and a round trip per policy whose answer the page
already had. What makes this safe rather than merely faster is that the payload is
bound to a subject: a page cached or reused across users would otherwise seed one
person's permissions into another's session, and unlike every other decision in the
library this one enters without being evaluated, so nothing else would catch it.

### URS-QD-023 — Read a policy without evaluating it

A reviewer or an administrator must be able to see what a policy requires, in
words, without supplying a subject and without the answer depending on who is
looking.

Rationale: the trace answers "why was this denied", which presumes a decision has
already been made. The first question anyone auditing an authorization model asks
is "what does this rule say", and an administrative screen listing policies has to
answer it for policies the viewer cannot satisfy. Making the rendering independent
of the subject is what keeps that screen from leaking who satisfies what.

### URS-QD-022 — Trade speculative lookups for latency

A developer must be able to ask for the branches of a composite policy to be
evaluated concurrently, and must be certain that doing so cannot change the answer
— only how quickly it arrives and how many lookups it costs.

Rationale: a policy with three independent relationship branches against a remote
graph store costs three sequential round trips today. Some callers would rather pay
for lookups they may not need than for latency they can measure. What makes this
safe rather than merely faster is that the decision and its trace are identical
either way: if a performance switch could change an authorization outcome, or even
change the explanation of one, no reviewer could reason about the policy without
knowing how it was scheduled.

### URS-QD-021 — Push a policy into a query

A developer must be able to compile a policy into a filter the database applies
while the query runs, rather than loading every candidate row and judging each one
afterwards — and must be told, loudly, when a policy cannot be compiled.

Rationale: "tenants see only their own rows" is the most requested capability in
the model survey, and evaluating it per row costs one round trip for every
candidate and composes wrongly with `LIMIT`. What makes this safe rather than
merely faster is that a partial translation is worse than none: a node quietly
rendered as "true" returns rows the policy denies.

### URS-QD-020 — Write a rule that refuses

An operator must be able to add a row saying "and if this matches, refuse",
visible as its own row, without rewriting the rules around it — and to control
whether order or refusal wins where two rows disagree.

Rationale: this is how rules are written wherever they are maintained as data
rather than as a tree — firewalls, API gateways, service meshes, tenant
isolation. Expressing it with boolean combinators means hoisting every refusal
into one negated guard clause ahead of every permit, which grows a second
conjunction of exceptions the moment one refusal should apply to only some
permits, and which inherits negation's inversion of the fail-closed default.

### URS-QD-019 — Ask who can reach a resource

An administrator must be able to evaluate one policy across a set of subjects and
see, per subject, whether it allows and why — without being one of them.

Rationale: access reviews, sharing dialogs and leak investigations all ask the
transpose of the question `filter` answers. Approximating it by looping over
`check` means constructing a current subject per iteration, and a batch job at
midnight has no requesting subject to construct one from.

### URS-QD-018 — Compare a clearance against a classification

A developer must be able to write "may read only what your clearance covers" as
one policy, over labels that carry compartments as well as a level.

Rationale: a numeric threshold cannot express it. Two labels at the same level
with different compartments are incomparable, and comparing them as numbers
returns *allow* where the rule says *deny* — so an approximation here is a
security defect rather than a simplification.

### URS-QD-017 — Decide on what the subject has already done

A developer must be able to write "approve this, unless you raised it" as one
policy, reading the record of past actions from the application's own store.

Rationale: separation of duty, Chinese Wall and once-only approvals are all the
same rule about the past, and none is expressible from the subject and the
resource alone. The history must stay in the caller's system — Qadi decides, it
does not remember.

### URS-QD-016 — Attach a duty to a permission

A developer must be able to write "allow, provided the access is logged" as one
policy, and be certain that the guarded work does not run when the duty has not
been discharged.

Rationale: purpose limitation, consent and risk-adaptive control all have a
middle answer between yes and no. Without one, the record that makes a decision
accountable lives in application code beside the call, where nothing connects it
to the rule that required it — and nothing notices when it is forgotten.

### URS-QD-015 — State a rule that depends on what the caller is doing

A developer must be able to write one policy that permits reading and refuses
writing — or the reverse — rather than two policies chosen in application code.

Rationale: "read from anywhere, write only on site" is one rule as a person says
it. Splitting it in TypeScript means the stored policy no longer expresses the
whole rule, and the half that decides which branch applies is in code nobody
reviews as a policy.

## 4. Non-functional requirements

### NFR-QD-001 — Deterministic evaluation

Given the same subject, policy and services, evaluation must produce the same
decision, identifier and duration, so that tests can assert on all three.

### NFR-QD-002 — Type safety

Public APIs must not require `any` or type assertions to use. The codebase
itself contains none: `scripts/check-house-style.mjs` fails the build on them.

### NFR-QD-003 — Test coverage

At least 90% statement and branch coverage workspace-wide, 95% for the core
package, **enforced by configuration** so a shortfall fails rather than being
reported.

### NFR-QD-004 — Documentation that compiles

Runnable examples in the specification must be extracted and type-checked in CI.

Rationale: every example in the predecessor's README called a signature that no
longer existed. Documentation that does not compile is worse than none, because
readers and models pattern-match against it.

### NFR-QD-005 — Specification integrity

Cross-references, registries and acceptance tags must be verified mechanically,
so the specification cannot drift from itself.

## 5. Assumptions

- The caller has already authenticated the subject and can construct an
  `AuthSubject`.
- Role definitions are known to the caller; Qadi does not fetch them.
- A relationship graph, where used, is served by the caller's own store.
- Consumers use Effect. Qadi is not usable from plain Promise code without a
  runtime.

## 6. Traceability

| Requirement | Satisfied by | Verified by |
| ----------- | ------------ | ----------- |
| URS-QD-001 | [BEH-QD-017](./behaviors/03-policy-adt.md), [BEH-QD-019](./behaviors/03-policy-adt.md), [BEH-QD-025](./behaviors/04-matchers.md) | `Policy.test.ts`, `Evaluate.test.ts`, REQ-QD-001..006 |
| URS-QD-002 | [BEH-QD-049](./behaviors/07-enforcement.md) | `Qadi.test.ts` |
| URS-QD-003 | [BEH-QD-049](./behaviors/07-enforcement.md), [INV-QD-009](./invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied) | `Qadi.test.ts` |
| URS-QD-004 | [BEH-QD-018](./behaviors/03-policy-adt.md), [BEH-QD-051](./behaviors/07-enforcement.md) | `Evaluate.test.ts`, REQ-QD-007 |
| URS-QD-005 | [BEH-QD-058](./behaviors/08-serialization.md), [INV-QD-003](./invariants.md#inv-qd-003-codectype-identity) | `Policy.test.ts` (property), REQ-QD-008 |
| URS-QD-006 | [BEH-QD-059](./behaviors/08-serialization.md), [BEH-QD-038](./behaviors/05-evaluator.md) | `Policy.test.ts`, `Evaluate.test.ts` |
| URS-QD-007 | [BEH-QD-036](./behaviors/05-evaluator.md), [BEH-QD-066](./behaviors/09-react.md), [INV-QD-006](./invariants.md#inv-qd-006-failure-is-not-denial) | `Evaluate.test.ts`, `hooks.test.tsx` |
| URS-QD-008 | [BEH-QD-043](./behaviors/06-services.md), [INV-QD-007](./invariants.md#inv-qd-007-defaults-fail-closed) | `Layers.test.ts` |
| URS-QD-009 | [BEH-QD-039](./behaviors/05-evaluator.md) | `Evaluate.test.ts` |
| URS-QD-010 | [BEH-QD-034](./behaviors/05-evaluator.md), [BEH-QD-065](./behaviors/09-react.md), [INV-QD-005](./invariants.md#inv-qd-005-short-circuit-preservation) | `Evaluate.test.ts` (attribute and relationship call counts), `QadiAtoms.test.ts` |
| URS-QD-011 | [BEH-QD-041](./behaviors/06-services.md), [BEH-QD-042](./behaviors/06-services.md) | `Layers.test.ts`, `TestLayers.test.ts` |
| URS-QD-012 | [ADR-QD-009](./decisions/009-observability-via-effect.md) | `Evaluate.test.ts` (span collector) |
| URS-QD-013 | [BEH-QD-067](./behaviors/09-react.md), [BEH-QD-068](./behaviors/09-react.md) | `QadiProvider.test.tsx`, `hooks.test.tsx` |
| URS-QD-014 | [BEH-QD-070](./behaviors/09-react.md) | `QadiAtoms.test.ts`, `QadiProvider.test.tsx` |
| URS-QD-015 | [BEH-QD-073](./behaviors/10-actions.md) | `Evaluate.test.ts`, `@REQ-QD-010` |
| URS-QD-016 | [BEH-QD-081](./behaviors/11-obligations.md) | `Evaluate.test.ts`, `Qadi.test.ts`, `@REQ-QD-011` |
| URS-QD-017 | [BEH-QD-089](./behaviors/12-history.md) | `Evaluate.test.ts`, `TestLayers.test.ts`, `@REQ-QD-012` |
| URS-QD-018 | [BEH-QD-097](./behaviors/13-labels.md) | `Matcher.test.ts`, `Evaluate.test.ts`, `@REQ-QD-013` |
| URS-QD-019 | [BEH-QD-105](./behaviors/14-subject-sets.md) | `SubjectSet.test.ts`, `@REQ-QD-014` |
| URS-QD-020 | [BEH-QD-111](./behaviors/15-rules.md), [INV-QD-017](./invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden) | `Rules.test.ts`, `@REQ-QD-015` |
| URS-QD-021 | [BEH-QD-121](./behaviors/16-predicates.md), [INV-QD-018](./invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows) | `Predicate.test.ts` (property), `@REQ-QD-016` |
| URS-QD-022 | [BEH-QD-130](./behaviors/17-concurrency.md), [INV-QD-020](./invariants.md#inv-qd-020-concurrency-changes-lookups-never-decisions) | `Evaluate.test.ts` (property), `@REQ-QD-022` |
| URS-QD-023 | [BEH-QD-137](./behaviors/18-explanation.md), [INV-QD-021](./invariants.md#inv-qd-021-every-policy-explains) | `Explanation.test.ts` (property), `@REQ-QD-023` |
| URS-QD-024 | [BEH-QD-146](./behaviors/19-hydration.md), [INV-QD-022](./invariants.md#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it) | `Hydration.test.ts` |
| URS-QD-025 | [BEH-QD-103](./behaviors/13-labels.md), [INV-QD-023](./invariants.md#inv-qd-023-every-pair-of-labels-has-a-least-upper-and-a-greatest-lower-bound) | `Matcher.test.ts` (properties), `@REQ-QD-021` |
| URS-QD-026 | [BEH-QD-154](./behaviors/20-simplification.md), [INV-QD-024](./invariants.md#inv-qd-024-simplification-changes-the-tree-and-nothing-a-caller-can-observe) | `Simplify.test.ts` (property over policies × subjects) |
| URS-QD-027 | [BEH-QD-162](./behaviors/21-decision-cache.md), [INV-QD-025](./invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity) | `DecisionCache.test.ts` |
| NFR-QD-001 | [INV-QD-008](./invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) | `Evaluate.test.ts` |
| NFR-QD-002 | — | `scripts/check-house-style.mjs` |
| NFR-QD-003 | — | `vitest.config.ts` thresholds |
| NFR-QD-004 | — | `scripts/check-doc-examples.mjs` |
| NFR-QD-005 | — | `spec/scripts/verify-traceability.sh` |

## 7. Known gaps

Writing this document surfaced two requirements that were asserted rather than
verified. They are recorded here instead of being quietly dropped. **Both are
now closed**, and the record is kept because how they were found matters more
than that they are fixed: both were discovered by writing the requirement down,
not by writing code.

**URS-QD-012 had no test. Closed (CCR-QD-010).** `evaluate` annotated a
`qadi.evaluate` span and nothing asserted that it did. `Tracer.Tracer` is a
`Context.Reference`, so a substituted tracer collects every span without an
exporter. `Evaluate.test.ts` now asserts the span is emitted, that its four
attributes carry the decision, subject, evaluation identifier and policy tag,
that combinators emit their own child spans, and that the span still closes when
evaluation fails.

The evaluation identifier is assertable at all only because it comes from a
service rather than `crypto.randomUUID` ([ADR-QD-012](./decisions/012-deterministic-time-and-ids.md)).

**URS-QD-010 was verified only for attribute resolution. Closed (CCR-QD-009).**
The call-count tests covered `AttributeResolver` alone; nothing proved that an
unevaluated branch performs no *relationship* lookup — the more expensive of the
two, and the one most likely to cross a network. `Evaluate.test.ts` now records
the queries a relationship resolver is asked and asserts there are none when an
earlier branch settles the decision, under both `anyOf` and `allOf`, with the
`Union` strategy asserted to perform every lookup by design.

Closing it found a second, unrecorded gap: `RelationshipResolveError`
propagation was untested entirely, so [INV-QD-006](./invariants.md#inv-qd-006-failure-is-not-denial)
held for attribute failures by test and for relationship failures by inspection.
That is now covered too.

---

_Related: [Overview](./overview.md) · [Glossary](./glossary.md) · [Roadmap](./roadmap.md)_
