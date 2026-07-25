# User Requirements

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-URS                                      |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | User Requirements Specification                |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-002) |

---

## 1. Purpose

This document states what users need from Guard, in their terms. The
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

Guard decides. It does not authenticate, persist, or administer. Anything it
cannot do correctly, it does not offer — see
[ADR-EG-016](./decisions/016-gxp-out-of-scope.md).

## 2. User groups

| Group | Needs |
| ----- | ----- |
| **Application developer** | Express an access rule and enforce it at a call site, without threading context through every function |
| **Security engineer** | Read a policy and know what it permits; be confident the default is denial |
| **Platform engineer** | See authorization decisions in existing tracing; swap resolvers per environment |
| **Test author** | Assert on decisions deterministically, including timing and identifiers |

## 3. Functional requirements

### URS-EG-001 — Express permission, role, attribute and relationship rules

A developer must be able to state that access requires a permission, a role, a
property of the subject, a property of the resource, or a relationship between
them — and to combine these freely with and/or/not.

Rationale: real rules mix models. "An editor who is also the document's owner,
unless the document is locked" is one rule, not three systems.

### URS-EG-002 — Enforce a rule at a call site without plumbing

Enforcing a policy must not require passing the subject, resolvers and
configuration through intermediate functions.

Rationale: the predecessor's enforcement function took eight arguments, so
enforcement was onerous enough to skip. A guard that is inconvenient is a guard
that gets omitted.

### URS-EG-003 — Guarantee that denied work does not execute

When a policy denies, the guarded operation must not run at all — not merely
have its result discarded.

Rationale: guarding a deletion must actually prevent the deletion.

### URS-EG-004 — Restrict which fields a caller may see

A single rule must decide both whether a subject may read a record and which of
its fields are returned.

Rationale: "may read the user record" and "may read the user's salary" are the
same decision at different granularities. Splitting them across two mechanisms
guarantees they eventually disagree.

### URS-EG-005 — Store a policy and reload it unchanged

A policy written to durable storage and read back must behave identically.

Rationale: this is the defect that motivated the rewrite. The predecessor
narrowed field visibility silently on reload.

### URS-EG-006 — Reject malformed or hostile policy input

Decoding a policy from an untrusted source must reject unknown variants,
invalid permission segments, malformed JSON and unbounded nesting.

### URS-EG-007 — Distinguish "not permitted" from "could not determine"

A failure to reach an attribute store or relationship service must be reported
as an error, never as a denial.

Rationale: an outage reported as a denial sends an engineer to audit
permissions instead of the failing dependency.

### URS-EG-008 — Deny by default

Absent configuration, missing subject, or an unwired resolver must produce
denials, never grants.

### URS-EG-009 — Explain a denial

Every decision must carry a structured trace sufficient to answer why access was
refused.

### URS-EG-010 — Avoid unnecessary work

Evaluating a rule must not perform lookups for branches whose outcome cannot
affect the result.

Rationale: authorization sits on the request path. A rule whose cheap branch
succeeds must not pay for its expensive branches.

### URS-EG-011 — Substitute implementations per environment

Attribute and relationship resolution must be replaceable — in-memory in tests,
a real service in production — without touching policy or enforcement code.

### URS-EG-012 — Observe decisions in existing tooling

Authorization outcomes must appear in the tracing the application already runs,
with no bespoke adapter.

### URS-EG-013 — Guard a user interface with the same rules

The rules enforced on the server must be usable to show and hide interface
elements, from the same policy values.

### URS-EG-014 — Isolate authorization contexts

An application serving several tenants in one process must be able to keep their
authorization contexts separate.

## 4. Non-functional requirements

### NFR-EG-001 — Deterministic evaluation

Given the same subject, policy and services, evaluation must produce the same
decision, identifier and duration, so that tests can assert on all three.

### NFR-EG-002 — Type safety

Public APIs must not require `any` or type assertions to use. The codebase
itself contains none: `scripts/check-house-style.mjs` fails the build on them.

### NFR-EG-003 — Test coverage

At least 90% statement and branch coverage workspace-wide, 95% for the core
package, **enforced by configuration** so a shortfall fails rather than being
reported.

### NFR-EG-004 — Documentation that compiles

Runnable examples in the specification must be extracted and type-checked in CI.

Rationale: every example in the predecessor's README called a signature that no
longer existed. Documentation that does not compile is worse than none, because
readers and models pattern-match against it.

### NFR-EG-005 — Specification integrity

Cross-references, registries and acceptance tags must be verified mechanically,
so the specification cannot drift from itself.

## 5. Assumptions

- The caller has already authenticated the subject and can construct an
  `AuthSubject`.
- Role definitions are known to the caller; Guard does not fetch them.
- A relationship graph, where used, is served by the caller's own store.
- Consumers use Effect. Guard is not usable from plain Promise code without a
  runtime.

## 6. Traceability

| Requirement | Satisfied by | Verified by |
| ----------- | ------------ | ----------- |
| URS-EG-001 | [BEH-EG-017](./behaviors/03-policy-adt.md), [BEH-EG-019](./behaviors/03-policy-adt.md), [BEH-EG-025](./behaviors/04-matchers.md) | `Policy.test.ts`, `Evaluate.test.ts`, REQ-EG-001..006 |
| URS-EG-002 | [BEH-EG-049](./behaviors/07-enforcement.md) | `Guard.test.ts` |
| URS-EG-003 | [BEH-EG-049](./behaviors/07-enforcement.md), [INV-EG-009](./invariants.md#inv-eg-009-guarded-effects-do-not-run-when-denied) | `Guard.test.ts` |
| URS-EG-004 | [BEH-EG-018](./behaviors/03-policy-adt.md), [BEH-EG-051](./behaviors/07-enforcement.md) | `Evaluate.test.ts`, REQ-EG-007 |
| URS-EG-005 | [BEH-EG-058](./behaviors/08-serialization.md), [INV-EG-003](./invariants.md#inv-eg-003-codectype-identity) | `Policy.test.ts` (property), REQ-EG-008 |
| URS-EG-006 | [BEH-EG-059](./behaviors/08-serialization.md), [BEH-EG-038](./behaviors/05-evaluator.md) | `Policy.test.ts`, `Evaluate.test.ts` |
| URS-EG-007 | [BEH-EG-036](./behaviors/05-evaluator.md), [INV-EG-006](./invariants.md#inv-eg-006-failure-is-not-denial) | `Evaluate.test.ts`, `Policies.test.tsx` |
| URS-EG-008 | [BEH-EG-043](./behaviors/06-services.md), [INV-EG-007](./invariants.md#inv-eg-007-defaults-fail-closed) | `Layers.test.ts` |
| URS-EG-009 | [BEH-EG-039](./behaviors/05-evaluator.md) | `Evaluate.test.ts` |
| URS-EG-010 | [BEH-EG-034](./behaviors/05-evaluator.md), [INV-EG-005](./invariants.md#inv-eg-005-short-circuit-preservation) | `Evaluate.test.ts` (call counts) |
| URS-EG-011 | [BEH-EG-041](./behaviors/06-services.md), [BEH-EG-042](./behaviors/06-services.md) | `Layers.test.ts`, `TestLayers.test.ts` |
| URS-EG-012 | [ADR-EG-009](./decisions/009-observability-via-effect.md) | — see [§7](#7-known-gaps) |
| URS-EG-013 | [BEH-EG-065](./behaviors/09-react.md), [BEH-EG-066](./behaviors/09-react.md) | `GuardContext.test.tsx` |
| URS-EG-014 | [BEH-EG-068](./behaviors/09-react.md) | `GuardContext.test.tsx` |
| NFR-EG-001 | [INV-EG-008](./invariants.md#inv-eg-008-evaluation-is-reproducible) | `Evaluate.test.ts` |
| NFR-EG-002 | — | `scripts/check-house-style.mjs` |
| NFR-EG-003 | — | `vitest.config.ts` thresholds |
| NFR-EG-004 | — | `scripts/check-doc-examples.mjs` |
| NFR-EG-005 | — | `spec/scripts/verify-traceability.sh` |

## 7. Known gaps

Writing this document surfaced two requirements that are asserted rather than
verified. They are recorded here instead of being quietly dropped.

**URS-EG-012 has no test.** `evaluate` annotates a `guard.evaluate` span, but
nothing asserts that the span is emitted or that its attributes are correct. The
requirement is satisfied by inspection only. Tracked on the
[roadmap](./roadmap.md#verify-span-emission).

**URS-EG-010 is verified only for attribute resolution.** The call-count tests
cover `AttributeResolver`; there is no equivalent test proving that an
unevaluated branch performs no *relationship* lookup. Tracked on the
[roadmap](./roadmap.md#extend-short-circuit-coverage-to-relationships).

---

_Related: [Overview](./overview.md) · [Glossary](./glossary.md) · [Roadmap](./roadmap.md)_
