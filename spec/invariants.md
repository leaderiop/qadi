# Runtime Invariants

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-INV                                       |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.1 (2026-07-26): INV-QD-011, the action dimension (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

Properties that hold for every execution. Each names the mechanism that enforces
it, because an invariant nobody enforces is a wish.

## INV-QD-001: Permission key uniqueness

Two distinct permissions never produce the same runtime lookup key.

**Source**: `packages/core/src/Permission.ts` — `PermissionSchema` constrains
both segments with `/^[^:]+$/`, which rejects empty segments and any segment
containing the reserved separator.

**Implication**: `{resource: "a:b", action: "c"}` cannot be decoded, so it can
never collide with `{resource: "a", action: "b:c"}`. In the predecessor both
formatted to `"a:b:c"` and each silently granted the other.

**Related**: [BEH-QD-002](behaviors/01-permissions.md), [ADR-QD-007](decisions/007-permission-token-representation.md).

---

## INV-QD-002: Role graph acyclicity

The role inheritance graph reachable from any `Role` value is acyclic.

**Source**: `packages/core/src/Role.ts` — `role()` takes parents **by value**, so
a cycle is unconstructible: a role cannot reference one that does not yet exist.
`resolveRoleGraph` is the only entry point where parents are named rather than
referenced, and it detects cycles explicitly.

**Implication**: `flattenPermissions` needs no cycle check and cannot diverge. A
visited set is still required, but only to keep a diamond linear rather than
exponential.

**Related**: [BEH-QD-009](behaviors/02-roles.md), [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md).

---

## INV-QD-003: Codec/type identity

The JSON codec and the TypeScript type of a policy cannot disagree.

**Source**: `packages/core/src/Policy.ts` — both are derived from one
`Schema.Union`; `type Policy = typeof Policy.Type` and
`Schema.fromJsonString(Policy)`.

**Implication**: `fromJson(toJson(p))` is structurally equal to `p` for every
policy. The predecessor maintained three artefacts by hand and they drifted,
silently dropping `fieldStrategy` on encode.

**Enforcement**: a property test over generated policy trees, a unit test
pinning the original defect, and Gherkin scenario `@REQ-QD-008`.

**Related**: [BEH-QD-017](behaviors/03-policy-adt.md), [BEH-QD-058](behaviors/08-serialization.md), [ADR-QD-002](decisions/002-schema-derived-policy-adt.md).

---

## INV-QD-004: Field visibility is a lattice with `undefined` at the top

An absent field set means *all fields*, never *no fields*.

**Source**: `packages/core/src/Decision.ts` — `intersectFields` returns the other
operand when either is `undefined`; `unionFields` returns `undefined` when either
is, since a branch granting everything makes the union everything.

**Implication**: intersecting an unrestricted policy with a restricted one yields
the restriction, and a denial projects to `{}`. Treating `undefined` as the empty
set would invert the meaning of every unrestricted policy.

**Related**: [BEH-QD-018](behaviors/03-policy-adt.md), [BEH-QD-051](behaviors/07-enforcement.md), [ADR-QD-006](decisions/006-field-strategy-always-encoded.md).

---

## INV-QD-005: Short-circuit preservation

A policy branch that is not evaluated performs no attribute or relationship
lookup.

**Source**: `packages/core/src/Evaluate.ts` — resolution happens inside the leaf
evaluator, reached only when that leaf is visited. `AllOf` returns at its first
denial and `AnyOf` at its first allow, except under `Union`, which must observe
every child to merge field sets.

**Implication**: `anyOf(cheapRbacCheck, expensiveAttributeCheck)` costs one set
lookup when the first branch allows. The predecessor resolved the entire tree
before evaluating anything.

**Enforcement**: tests count resolver invocations rather than measuring time.

**Related**: [BEH-QD-034](behaviors/05-evaluator.md), [BEH-QD-035](behaviors/05-evaluator.md), [ADR-QD-005](decisions/005-lazy-attribute-resolution.md).

---

## INV-QD-006: Failure is not denial

A broken lookup never presents as "not authorized".

**Source**: `packages/core/src/Evaluate.ts` — resolver failures propagate through
the Effect error channel. `Effect.orDie` is prohibited on evaluation paths, so a
denial and a fault remain distinguishable at every layer, including React's
`PolicyState.error`.

**Implication**: an attribute-store outage surfaces as an incident rather than
sending an engineer to audit permissions.

**Related**: [BEH-QD-036](behaviors/05-evaluator.md), [BEH-QD-066](behaviors/09-react.md).

---

## INV-QD-007: Defaults fail closed

Every default layer denies rather than grants.

**Source**: `RelationshipResolverNever` returns `false`;
`CurrentSubjectAnonymous` holds no roles or permissions; `AttributeResolverNone`
resolves to `undefined`, which satisfies no matcher.

**Implication**: forgetting to wire a resolver produces denials, which surface
immediately in testing. A default that granted would turn an omission into a
silent breach.

**Related**: [BEH-QD-043](behaviors/06-services.md), [ADR-QD-010](decisions/010-context-service-and-layers.md).

---

## INV-QD-008: Evaluation is reproducible

Given the same subject, policy and services, an evaluation produces the same
decision, identifier and duration.

**Source**: durations come from Effect's `Clock`, identifiers from the
`EvaluationId` service. `scripts/check-house-style.mjs` fails the build on
ambient `Date.now()`, `performance.now()` or `crypto.randomUUID()` anywhere
except `EvaluationId.ts`, which is the one recorded exemption.

**Implication**: traces can be asserted exactly. The predecessor built a trace
feature whose contents no test could predict.

**Related**: [BEH-QD-037](behaviors/05-evaluator.md), [ADR-QD-012](decisions/012-deterministic-time-and-ids.md).

---

## INV-QD-009: Guarded effects do not run when denied

`Qadi.enforce` never starts the effect it wraps unless the policy allows.

**Source**: `packages/core/src/Qadi.ts` — `enforce` is
`Effect.flatMap(assert(policy), () => self)`, so `self` is only constructed into
the chain after the assertion succeeds.

**Implication**: guarding a mutation is safe. Discarding a result after the fact
would not be.

**Related**: [BEH-QD-049](behaviors/07-enforcement.md), [ADR-QD-011](decisions/011-enforce-as-aspect.md).

---

## INV-QD-010: Error codes are injective

No two error tags share a numeric code.

**Source**: `packages/core/src/Errors.ts` — `ERROR_CODES` is declared
`satisfies Record<QadiError["_tag"], ...>`, so an error without a code does not
compile, and every code is visible in one table.

**Implication**: log aggregation keyed on the code cannot conflate unrelated
failures, as the predecessor's duplicated `ACL007` did.

**Enforcement**: a test asserts the code set has no duplicates.

**Related**: [ADR-QD-008](decisions/008-error-taxonomy.md).

---

## INV-QD-011: A policy that reads the action cannot be evaluated without one

Reading the action while none was supplied fails; it never denies.

**Source**: `packages/core/src/Evaluate.ts` — `HasAction` fails with
`MissingAction` when the action is absent, and `HasAttribute` and
`HasResourceAttribute` ask `referencesAction` **before** running their matcher.

The pre-check is what makes this an invariant rather than a hope.
`evaluateMatcher` is total by design (BEH-QD-028): it cannot fail, so an
unguarded `action()` would resolve to `undefined`, satisfy nothing, and return
`false` — a denial indistinguishable from a real one.

**Implication**: forgetting `{ action }` at a call site produces an incident,
not a quiet refusal. This is [INV-QD-006](#inv-qd-006-failure-is-not-denial)
applied to caller input rather than to a resolver, and it is the opposite of
[INV-QD-007](#inv-qd-007-defaults-fail-closed) on purpose: an unwired resolver
denies because the *system* could not answer, whereas a missing action means the
*caller* never asked a complete question.

**Enforcement**: tests assert `MissingAction` for both paths — the leaf, and a
matcher whose `action()` is nested inside another matcher.

**Related**: [BEH-QD-076](behaviors/10-actions.md), [ADR-QD-018](decisions/018-action-dimension.md).

---
