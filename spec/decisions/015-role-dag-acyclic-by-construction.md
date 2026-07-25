# ADR-EG-015: The role DAG is acyclic by construction

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

Roles inherit from other roles. A cycle would make permission flattening
non-terminating.

The predecessor returned a `Result` from role construction to report cycles, and
carried a Peano-counter depth guard in the type-level flattening. But its
`inherits` list held roles **by value**, so a cycle could not be constructed in
the first place: you cannot reference a role that does not yet exist. The error
was unreachable on that path.

## Decision

`role()` is total. It takes parents by value, so the graph is a DAG by
construction and `flattenPermissions` needs no cycle check — only a visited set,
so a diamond is walked once rather than exponentially.

Cycles become representable only when a role graph is reconstructed from
serialized form, where parents are named rather than referenced. That path is
`resolveRoleGraph`, which returns
`Effect<ReadonlyArray<Role>, CircularRoleInheritance>`.

An **unknown** parent name is tolerated rather than treated as an error: a
partial role catalogue is a normal deployment state, and failing there would
deny every request rather than merely granting less.

## Consequences

**Positive**:

- The common path is pure, total and needs no error handling.
- The failure mode exists exactly where the failure is possible.

**Negative**:

- Two ways to build a role graph, by value and by name.

**Trade-off accepted**: they model genuinely different situations — source-level
definition versus deserialization — and collapsing them would mean reintroducing
an unreachable error to the common path.
