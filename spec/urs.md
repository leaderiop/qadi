# User Requirements

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-URS                                       |
> | Revision       | 1.5                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | User Requirements Specification                |
> | Change History | 1.5 (2026-07-26): URS-QD-016, obligations (CCR-QD-015)<br>1.4 (2026-07-26): URS-QD-015, the action dimension (CCR-QD-012)<br>1.3 (2026-07-26): URS-QD-012 gap closed (CCR-QD-010)<br>1.2 (2026-07-26): URS-QD-010 gap closed; URS-QD-013 title reworded (CCR-QD-009)<br>1.1 (2026-07-26): React verification re-pointed (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-002) |

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
| NFR-QD-001 | [INV-QD-008](./invariants.md#inv-qd-008-evaluation-is-reproducible) | `Evaluate.test.ts` |
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
