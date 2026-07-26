# 11 — Obligations

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-11                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-015) |

_Previous: [10 — The Action Dimension](./10-actions.md)_

---

## BEH-QD-081: An obligation is a condition on permission

> **See:** [ADR-QD-019](../decisions/019-obligations.md)

```ts
export const Obligation: Schema.Codec<Obligation>;
export type Obligation = {
  readonly id: string;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly advisory: boolean;
};

export const obligation: (
  id: string,
  attributes?: Readonly<Record<string, unknown>>,
  options?: { readonly advisory?: boolean },
) => Obligation;

export const obliged: (obligation: Obligation, policy: Policy) => Policy;
```

"Permit, provided the access is logged" — the rule `fields` cannot express,
because field visibility restricts what comes *back* and never what the caller
*owes*.

```
REQUIREMENT: An obligation MUST reach the decision only when the policy it
             wraps allows. A denial permits nothing, so it conditions nothing,
             and `Deny` carries no obligations at all.
```

```
REQUIREMENT: An obligation MUST be data. The evaluator MUST NOT invoke one.
             The moment an obligation runs, evaluation has side effects and
             INV-QD-009 — a guarded effect does not run when denied — is gone.
```

`advisory` is XACML's *advice*: the caller may ignore it. It defaults to
`false`, so a duty binds unless its author says otherwise.

## BEH-QD-082: Composition

> **Invariant:** [INV-QD-012](../invariants.md#inv-qd-012-obligations-are-never-narrowed)

```ts
export const unionObligations: (
  a: ReadonlyArray<Obligation>,
  b: ReadonlyArray<Obligation>,
) => ReadonlyArray<Obligation>;
```

```
REQUIREMENT: Obligations MUST union. An `AllOf` that allows carries every
             child's; an `AnyOf` that allows carries every allowing child's.
             They MUST NOT intersect, and `FieldStrategy` MUST NOT govern them.
```

The asymmetry with field visibility is the point, and it is not an oversight:

| | Empty set means | Narrowing is | Rule |
| --- | --- | --- | --- |
| Visible fields | nothing visible; `undefined` is the *top*, meaning all | safe — less is disclosed | intersect |
| Obligations | no duties | **unsafe** — a duty a branch required goes undischarged | union |

```
REQUIREMENT: Identity for deduplication MUST be the whole obligation, not its
             `id`. The same duty reached twice through a diamond appears once;
             two duties sharing an `id` with different attributes are two
             duties and both survive.
```

## BEH-QD-083: `Not` needs no rule

```
REQUIREMENT: `Not` MUST carry no obligations, in either direction.
```

This looked like the hard question and it is the easy one. `Not` allows only
when its child *denied*, and a denial carries an empty obligation set — so the
allowing branch is never handed one to decide about.

The claim is mechanical rather than rhetorical. Mutating the evaluator to
propagate `child.obligations` through `Not` changes no test, because the mutant
is **equivalent**: that expression is provably `[]` at that point. "Needs no
rule" and "the rule is unobservable" are the same statement here.

```
REQUIREMENT: An obligation discarded by an enclosing `Not` MUST remain on the
             trace node it arose from. That is what makes discarding it
             defensible rather than silent, and it is the same mechanism that
             already answers "why was this denied".
```

## BEH-QD-084: Short-circuiting is preserved

> **Invariant:** [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)

```
REQUIREMENT: Collecting obligations MUST NOT force exhaustive evaluation. Under
             `AnyOf`'s default `First` strategy the obligations are the winning
             branch's, and therefore depend on the order the author wrote the
             branches in.
```

Stated rather than discovered. Collecting from every allowing branch would make
a policy slower because somebody attached a log line to it. An author who wants
every branch's duties asks for every branch with `fieldStrategy: "Union"`, which
already means exactly that.

## BEH-QD-085: Reporting versus enforcing

> **Invariant:** [INV-QD-013](../invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation)

```ts
export interface ObligationHandler<E = never, R = never> {
  (obligations: ReadonlyArray<Obligation>): Effect.Effect<void, E, R>;
}

export interface EnforceOptions<E = never, R = never> extends EvaluateOptions {
  readonly onObligations?: ObligationHandler<E, R>;
}

export class UndischargedObligation extends Data.TaggedError(
  "qadi/UndischargedObligation",
)<{
  readonly subjectId: string;
  readonly obligationIds: ReadonlyArray<string>;
}> {}
```

The entry points divide in two, and obligations are where the division becomes
load-bearing:

| Entry point | Kind | On a binding obligation |
| ----------- | ---- | ----------------------- |
| `decide` | reports | returns it on the decision |
| `check` | reports | returns `true`; a boolean has no room for a duty |
| `assert` | enforces | fails |
| `enforce` | enforces | fails; the guarded effect never starts |
| `enforceProjected` | enforces | fails |
| `filter` | enforces | fails |

```
REQUIREMENT: An entry point that runs work or hands back data MUST fail with
             `UndischargedObligation` when an allow carries a binding
             obligation and no handler was supplied. It MUST NOT proceed.
```

```
REQUIREMENT: The handler MUST run before the guarded effect. An obligation is a
             condition on the permission, not a follow-up to it, so a handler
             that fails MUST stop the protected work.
```

```
REQUIREMENT: `filter` MUST fail rather than drop an element it cannot
             discharge. Dropping would report a wiring mistake as a denial,
             which INV-QD-006 exists to prevent.
```

```
REQUIREMENT: An advisory obligation MUST NOT block enforcement, and MUST still
             be passed to a handler. Advice is information the caller may act
             on; only its binding siblings can refuse.
```

## BEH-QD-086: Observability

```
REQUIREMENT: The `qadi.evaluate` span MUST carry `qadi.obligations` — the
             comma-joined ids — when the decision owes any, and MUST omit the
             attribute entirely when it owes none.
```

## BEH-QD-087: Worked example

Purpose limitation is the model that needs this: the *record* of what was
declared is the half that makes it accountable, and until now there was nowhere
to put it.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  currentSubjectLayer,
  enforce,
  eq,
  hasAttribute,
  hasRole,
  literal,
  makeSubject,
  obligation,
  obliged,
  type Policy,
} from "@qadi/core";

declare const readRecord: Effect.Effect<string>;
declare const writeAuditEntry: (id: string) => Effect.Effect<void>;

// "A clinician may read for treatment, provided the access is recorded."
const mayRead: Policy = obliged(
  obligation("log-access", { channel: "audit" }),
  allOf([hasRole("clinician"), hasAttribute("purpose", eq(literal("treatment")))]),
);

const services = Layer.mergeAll(
  currentSubjectLayer(
    makeSubject({
      id: "dr-amina",
      roles: ["clinician"],
      attributes: { purpose: "treatment" },
    }),
  ),
  AttributeResolverNone,
  RelationshipResolverNever,
  EvaluationIdLive,
);

// Without `onObligations` this fails with UndischargedObligation and never
// reads the record — the permission had a condition nobody met.
const program = readRecord.pipe(
  enforce(mayRead, {
    onObligations: (obligations) =>
      Effect.forEach(obligations, (o) => writeAuditEntry(o.id), { discard: true }),
  }),
  Effect.provide(services),
);
```

**What this does not guarantee.** Qadi can refuse to proceed when an obligation
is undischarged. It cannot verify that `writeAuditEntry` reached durable
storage, and it will not pretend to — the same limit
[17 — Purpose](../models/17-purpose.md) states about declared purposes, and the
reason [ADR-QD-016](../decisions/016-gxp-out-of-scope.md) keeps audit trails out
of scope.

---

_Previous: [10 — The Action Dimension](./10-actions.md)_
