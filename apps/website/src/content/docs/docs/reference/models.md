---
title: Access Control Models
description: Which access control models Qadi ships today, which require only a resolver you write, and which are deliberately out of scope.
---

Qadi's design has been checked against a broad survey of published access
control models, not just RBAC/ABAC/ReBAC. Every model below falls into one of
three buckets: expressible today and tested, expressible today with a
resolver you write yourself, or excluded because it's enforced by a
mechanism Qadi is not.

## Shipped

Expressible with the current policy ADT and services, and covered by tests.

- Role-based access control (RBAC₀, RBAC₁) — `hasRole`, `anyOfRoles`, the role DAG
- Attribute-based access control (ABAC) — `hasAttribute`, `hasResourceAttribute`
- Relationship-based access control (ReBAC) — `hasRelationship`
- Capability / permission tokens — `hasPermission`
- Identity-based access control (IBAC) — the `subjectId()` value reference
- Content-dependent access control — `hasResourceAttribute`
- Field-level authorization — `fields` and `fieldStrategy`
- Ordered rule tables (RuBAC) — `rules`, `permitWhen`, `denyWhen`
- Separation of duty, dynamic
- Purpose enforcement with obligations
- Task-based access control (TBAC)
- Bell–LaPadula
- Biba, strict and low-water-mark
- Multi-level security / the Denning lattice
- Chinese Wall (Brewer–Nash)
- Row-level security — `toPredicate`

A few more ship with a named ceiling — some part of the model is out of
reach by design, not merely unbuilt yet:

- Separation of duty, static (assignment-time prevention is excluded)
- XACML parity (the attribute catalogue is declined)
- History-based access control (windowed counts and the ordering question are deferred)
- Next Generation Access Control (NGAC) (user-space review is out of reach)
- Cell-level security (the cell half is declined; row-level is not)

## Wiring recipe

Expressible today with a resolver implementation you write — no change to
`@qadi/core` — because the data behind the model is yours, not Qadi's.

- Discretionary access control (DAC) / ownership — via `RelationshipResolver`
- Access control lists (ACLs) — via `RelationshipResolver`
- Zanzibar-style relationship stores (SpiceDB, OpenFGA) — via `RelationshipResolver`
- Claims-based access control (OIDC claims) — via `CurrentSubject`
- Context-aware access control — via `AttributeResolver`
- Temporal access control (TRBAC) — via `AttributeResolver` and `Clock`
- Spatial access control (GEO-RBAC) — via `AttributeResolver`
- Risk-adaptive access control (RAdAC) — via `AttributeResolver`
- Trust / reputation-based access control — via `AttributeResolver`
- Purpose-based access control — via `AttributeResolver`
- Consent-based access control — via `RelationshipResolver`
- Hierarchical resource scoping (tenant trees) — via `RelationshipResolver`
- Team-based access control (TMAC) — via `RelationshipResolver`
- Organisation-based access control (OrBAC) — via `AttributeResolver`
- Type enforcement — via `AttributeResolver`
- Label-based access control (comparison only) — via `AttributeResolver`

Two limits apply across this whole group: a resolver only ever sees the
subject id, relation, resource id, and traversal depth — never another field
of the resource — and only `eq`/`neq` accept a live value reference, so a
comparison between two resolved values (a clearance against a resource's own
level, an expiry against the current time) has to be derived inside the
resolver rather than written in the policy tree.

## Excluded by design

Enforced by a mechanism Qadi is not — documented as a boundary, not planned.

- Attribute-based, functional, and predicate encryption; proxy re-encryption — enforced by cryptography
- Token chains (SPKI/SDSI, RT, PERMIS, macaroons, biscuits, UCANs) — enforced by certificate/token verification; verify the chain, then present the result as an `AuthSubject`
- Administrative RBAC, HRU, Take–Grant, the Typed Access Matrix — Qadi has no administrative surface
- Clark–Wilson — enforced by certified transaction procedures
- Information flow control / DIFC — enforced by a language runtime or the OS
- Object capabilities — a language reference-graph property, not a decision
- Sticky policies — a data-format concern; Qadi can evaluate a policy once it's extracted
- Zero Trust, JIT / zero standing privilege, PAM, break-glass audit — architecture and operations; Qadi is one component, and break-glass additionally needs an audit trail, which is out of scope

---

[Full adoption matrix on GitHub →](https://github.com/leaderiop/qadi/blob/main/spec/models/00-adoption-matrix.md)
