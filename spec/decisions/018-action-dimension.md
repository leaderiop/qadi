# ADR-QD-018: The action is an evaluation input, not a permission segment

> **Status:** Accepted
> **Date:** 2026-07-26

## Context

An action exists today only *inside* a permission token, as the second segment
of `resource:action` ([ADR-QD-007](./007-permission-token-representation.md)).
It is never an input to evaluation. `EvaluateOptions` carries
`{ resource?, maxDepth? }` and `MatcherContext` carries
`{ subject, subjectId, resource }` — neither knows whether the caller is
reading or writing.

The consequence is that no policy can be asymmetric in the verb. Bell–LaPadula
permits read-down and write-up; Biba inverts both; type enforcement's rule is a
`(domain, type, operation)` triple; OrBAC abstracts the action into an
*activity*; NGAC associates *operation sets*. Eight of the models in the
[adoption matrix](../models/00-adoption-matrix.md) are blocked on this one
absence, and it is the only thing several of them lack.

Callers reach for two workarounds today, and both are worse than the gap:

- **Encode the verb into the resource** — `{ id, verb: "write" }`. This makes the
  verb a property of the thing being acted on, which it is not, and puts it
  somewhere an attacker-influenced payload might reach.
- **Select a different policy per action.** This works and is honest, but the
  rule stops being expressible as *one* stored policy, which defeats the point
  of serializing policies at all.

A third temptation is to reuse the permission token's action segment. That is
the one option that must be refused outright, and the reason is the subject of
this decision.

## Decision

**A permission is a grant the subject holds. An action is a property of the
request.** They are different things that happen to share a word, and Qadi will
keep them separate.

`doc:write` on a subject means *this subject may write documents*. An action of
`"write"` means *this call is a write*. Deriving one from the other, or
comparing them, would create two spellings of one concept and put
[INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) — permission
key uniqueness — at risk from a direction it was never designed to resist.

The action therefore enters as request-scoped input, alongside the resource:

```ts
interface EvaluateOptions {
  readonly resource?: Resource;
  readonly action?: string;
  readonly maxDepth?: number;
}

interface MatcherContext {
  readonly subject: Readonly<Record<string, unknown>>;
  readonly subjectId: string;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  readonly action: string | undefined;
}
```

Policies read it two ways. A leaf for the common case, and a value reference for
comparisons against subject or resource data:

```ts
// "this call is a write"
const hasAction: (action: string, options?: FieldOptions) => Policy;

// "the action is one this subject's clearance covers"
const action: () => ValueRef;
```

**An absent action is an error, not a denial.** If a policy asks for the action
and the caller did not supply one, evaluation fails with `MissingAction`. This
follows the resource precedent exactly: `hasResourceAttribute` with no resource
fails with `MissingResource` rather than denying.

The distinction is load-bearing and worth stating plainly.
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) — defaults fail
closed — governs *information a resolver could not supply*: an unwired
relationship resolver denies.
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) governs *inputs
the caller failed to provide*: that is a programming error at the call site, and
reporting it as "not authorized" would send an engineer to audit permissions
instead of fixing the caller. A missing action is the second kind.

The action is added to the `qadi.evaluate` span as `qadi.action`, and only when
present, so existing span assertions are unaffected.

## Consequences

**Positive**:

- Read/write asymmetry becomes expressible, unblocking Bell–LaPadula, Biba,
  multi-level security, rule-based access control, XACML parity, usage control,
  NGAC, OrBAC and type enforcement.
- Purely additive. `action?: string` is a new optional field; no existing type
  changes, and no serialized policy is invalidated. A policy written before this
  lands decodes unchanged after it.
- The verb appears in traces, where its absence is currently felt most: two
  evaluations of the same policy that differ only in what the caller was doing
  are indistinguishable today.

**Negative**:

- Two notions of "action" now coexist. Nothing mechanical prevents someone
  writing `hasAction(permissionKey(p))`; only naming and review do. The risk is
  real and this document is the record of it.
- A new `Policy` variant and a new `ValueRef` variant are eight coordinated
  edits across the two schemas, plus the leaf generator of the round-trip
  property in `Policy.test.ts`. A variant absent from that generator is untested
  by the property, which is the guard standing between this library and the
  defect it was rewritten to fix
  ([INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)). The
  `ActionRef` case is the trap: it lives in `ValueRef`, so a leaf generator
  producing only policies would never reach it. One leaf therefore nests it
  deliberately.
- Matcher totality forces a pre-check, which was not foreseen when this decision
  was written. `evaluateMatcher` cannot fail (BEH-QD-028), so a matcher holding
  `action()` with no action supplied would resolve to `undefined`, satisfy
  nothing and return `false` — a denial, which is exactly what this decision
  forbids. The evaluator therefore asks `referencesAction` before running any
  matcher. That is a traversal per attribute node, and it is the price of
  keeping matchers pure. It is recorded as
  [INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one).
- `MissingAction` widens the error surface. `ERROR_CODES` is
  `satisfies Record<QadiError["_tag"], …>`, so it cannot be forgotten — the
  build fails until it has a code
  ([INV-QD-010](../invariants.md#inv-qd-010-error-codes-are-injective)).
- The action is an untyped `string`. A literal-preserving generic was considered
  and rejected: `Permission` earns its type parameters because permission keys
  are compared for equality across a codebase, whereas an action is compared
  against a policy that was very often decoded from JSON, where the literal is
  gone anyway.

**Trade-off accepted**: this adds a second concept named "action" to a library
that already has one, and the separation rests on discipline rather than on the
type system. That is the cost of not conflating a grant with a request. The
alternative — one notion serving both — is cheaper to describe and produces a
model in which "may write" and "is writing" cannot be told apart, which is
precisely the confusion Bell–LaPadula exists to prevent.

**Implemented.** This ADR was written as *Proposed* — the only one that ever
has been — because at the time it described nothing that existed, and every
other decision here describes code that does. It became *Accepted* when the
capability arrived with the evidence the
[Definitions of Done](../process/definitions-of-done.md) require:
[10 — The Action Dimension](../behaviors/10-actions.md) for the behaviour,
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)
for the invariant, and `@REQ-QD-010` for the scenarios.
