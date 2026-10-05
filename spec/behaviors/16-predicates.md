# 16 — Predicate Output

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-16                                    |
> | Revision       | 1.6                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.6 (2026-10-05): BEH-QD-122 — a `Compare`/`MemberOf` leaf is `Compare.ts`'s verdict, the function `judgeMatcher` applies (ADR-QD-091, CCR-QD-173); BEH-QD-127 — the generated rows include non-finite values, where `toPredicate` failed open until CCR-QD-172<br>1.5 (2026-10-04): BEH-QD-121/122 cross-reference BEH-QD-271 — core still emits no dialect, but now says what is renderable (`toRenderable`) (ADR-QD-079, CCR-QD-158)<br>1.4 (2026-10-04): BEH-QD-266 — an over-deep policy is `PolicyTooDeep` before the fields refusal whatever the child order, and no `maxDepth` raises a defect (ADR-QD-090, CCR-QD-170)<br>1.3 (2026-10-04): BEH-QD-123 — a failing port fails the translation with its own typed error; BEH-QD-264/265/266 — a defecting port fails typed, translation stops where the evaluator stops, a refusal depends on the tree alone; BEH-QD-127 — points at INV-QD-058 for faulty ports (CCR-QD-153, ADR-QD-077)<br>1.2 (2026-09-08): BEH-QD-123 — add missing `HasCustom`/`HasSignature` rows to the translation-subset table (CCR-QD-130)<br>1.1 (2026-08-25): BEH-QD-121 — a companion package may compile the predicate (ADR-QD-054, CCR-QD-079)<br>1.0 (2026-07-26): Initial release (CCR-QD-020) |

_Previous: [15 — Rule Tables](./15-rules.md)_

---

## BEH-QD-121: A predicate is abstract, and Qadi owns no dialect

> **See:** [ADR-QD-024](../decisions/024-predicate-output.md)

```ts
export type CompareOp = "Eq" | "Neq" | "Gte" | "Lt";

export type Predicate =
  | { readonly _tag: "True" }
  | { readonly _tag: "False" }
  | { readonly _tag: "Compare"; readonly column: string; readonly op: CompareOp; readonly value: unknown }
  | { readonly _tag: "MemberOf"; readonly column: string; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "And"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Or"; readonly predicates: ReadonlyArray<Predicate> }
  | { readonly _tag: "Negate"; readonly predicate: Predicate };
```

```
REQUIREMENT: Qadi MUST NOT emit SQL. The caller compiles the predicate, or
             installs a companion package that compiles it for them.
```

Emitting SQL means owning a dialect — quoting, binding, null semantics, one
grammar per engine. Qadi has no database dependency and acquiring one is a far
larger commitment than this feature warrants. [ADR-QD-054](../decisions/054-a-companion-package-may-compile-a-dialect.md)
narrows exactly the "the caller compiles it" clause: `@qadi/predicate-sql` and
`@qadi/predicate-prisma` are optional companion packages that do, `@qadi/core`
itself still doesn't. See [31 — Predicate Compilation](./31-predicate-compilation.md).

`Predicate` is hand-written with **no `Schema`**, unlike `Policy`. That is the
[ADR-QD-002](../decisions/002-schema-derived-policy-adt.md) boundary applied
rather than forgotten: a policy is persisted and re-parsed from untrusted JSON,
and a predicate is produced and consumed in the same process — like `Decision`
and `Trace`, which carry no codec for the same reason.

## BEH-QD-122: The reference interpreter ships with it

```ts
export const evaluatePredicate: (
  self: Predicate,
  row: Readonly<Record<string, unknown>>,
) => boolean;
```

```
REQUIREMENT: The predicate MUST be executable.
```

This is what separates predicate output from a plausible sketch. A caller with
only `toPredicate` compiles a predicate to SQL and has **nothing** that says
their SQL means what Qadi meant; the failure is silent and it returns rows. With
a reference interpreter they can differential-test their compiler against the
intended semantics, over their own rows, in their own suite.

It is also what makes [BEH-QD-127](#beh-qd-127-the-two-interpreters-agree)
obtainable at all.

```
REQUIREMENT: A `Compare` or `MemberOf` leaf MUST evaluate as `Compare.ts`'s
             verdict for the row's cell — the same function `judgeMatcher`
             applies to a resolved value — and hold exactly when that verdict
             is `Held` (BEH-QD-305, INV-QD-091). In particular `Gte`/`Lt` hold
             only when both the cell and the bound are finite numbers, and
             `MemberOf` never holds for an absent cell.
```

Until CCR-QD-172 `evaluatePredicate` kept its own copy of the comparison rules,
and that copy checked only the bound for finiteness: `gte(3)` admitted an
`Infinity` row and `lt(3)` a `-Infinity` row that `evaluate` denied.

Core still owns no dialect — [BEH-QD-121](#beh-qd-121-a-predicate-is-abstract-and-qadi-owns-no-dialect)
stands — but it now says what a renderer may render: `toRenderable`
([BEH-QD-271](31-predicate-compilation.md#beh-qd-271-a-predicate-is-classified-once-in-core-into-a-renderable-tree))
classifies a `Predicate` once into a closed tree of already-validated nodes, so a
dialect package prints syntax and decides nothing about NULLs, numbers or safety.

## BEH-QD-123: Untranslatable fails; nothing is approximated

```ts
export const toPredicate: (
  policy: Policy,
  options?: PredicateOptions,
) => Effect.Effect<Predicate, PolicyNotTranslatable | EvaluationError, PredicateServices>;
```

```
REQUIREMENT: A node outside the translatable subset MUST fail with
             `PolicyNotTranslatable` (`ACL012`). It MUST NOT translate to `True`.
```

An untranslatable node rendered as `True` returns rows the policy denies. That is
the one failure mode that makes this feature worse than its absence, and it is
why a type-level `TranslatablePolicy` was rejected: a second codec, union and
generator — the four coordinated edits
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) polices, duplicated —
where failing loudly costs one error and says the same thing.

| Node | Translation |
| ---- | ----------- |
| `HasResourceAttribute` with `Eq`/`Neq`/`Gte`/`Lt` | `Compare` — the only node that becomes a column reference |
| `HasResourceAttribute` with `In` | `MemberOf` |
| `HasRole`, `HasPermission`, `HasAction` | folds to `True` or `False` |
| `HasAttribute` | folds, consulting the subject then the resolver |
| `HasActed`/`HasNotActed`, `scope: "Any"` | folds — subject-keyed |
| `AllOf`, `AnyOf`, `Not` | `And`, `Or`, `Negate` |
| `Labeled` | transparent; a predicate has no trace to carry a label |
| `Rules` | [BEH-QD-126](#beh-qd-126-a-rule-table-becomes-a-set-based-formula) |
| `HasRelationship` | **untranslatable** — keyed by `resourceId`, one lookup per row |
| `HasActed`/`HasNotActed`, `scope: "Resource"` | **untranslatable**, for the same reason |
| `HasCustom` | **untranslatable** — opaque, externally-registered logic; see [BEH-QD-248](./32-custom-predicates.md#beh-qd-248-topredicate-refuses-a-hascustom-node) |
| `HasSignature` | **untranslatable** — looked up through an external port, keyed by subject/resource, not a column any row carries |
| `Obliged` | **untranslatable** — [BEH-QD-124](#beh-qd-124-a-duty-and-a-column-restriction-both-refuse) |
| any `fields` in the tree | **untranslatable** — [BEH-QD-124](#beh-qd-124-a-duty-and-a-column-restriction-both-refuse) |

Which side a `ValueRef` sits on decides the rest. `subject(path)`, `subjectId()`
and `action()` are constants at translation time; `resource(path)` is a column,
and two resource paths compared is `column op column`, which `Predicate` cannot
express.

```
REQUIREMENT: A port failure MUST fail the translation **with that port's own
             typed error** rather than fold to `False`
             ([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)),
             and a policy reading an absent action MUST fail
             ([INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)).
```

The subject-side fold is the reason the subset splits where it does: a
subject-keyed lookup costs **one call per translation**, and a row-keyed one costs
one per row — precisely the O(n) a predicate exists to avoid. The history port
splits on `scope` for exactly that reason.

## BEH-QD-264: A defecting port fails translation typed, not dead

> **See:** [BEH-QD-261](./05-evaluator.md), [ADR-QD-077](../decisions/077-both-interpreters-read-ports-through-one-module.md)

```
REQUIREMENT: A port that dies — throws out of its own Effect construction, or
             `Effect.die`s — during `toPredicate` MUST surface as that port's own
             typed error (`AttributeResolveError` for `AttributeResolver.resolve`,
             `DecisionHistoryUnavailable` for `DecisionHistory.hasActed`), exactly
             as it does through `evaluate`.
```

A defect bypasses `Effect.retry` and `Effect.catchTag`, which only ever see the
typed error channel, so a caller who retried a flaky store around `evaluate` had
that guarantee and a caller who retried it around `toPredicate` did not. The
conversion lives in `PortAccess.ts`, which both interpreters read their ports
through, so it holds for every port read core makes.

```
REQUIREMENT: A port's own typed failure MUST pass through as the same value, and
             an interruption MUST NOT be converted into a retryable error.
```

Converting an interruption would let a caller's `Effect.retry` retry work that was
deliberately cancelled.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  DecisionHistoryUnknown,
  currentSubjectLayer,
  hasAttribute,
  lt,
  makeSubject,
  toPredicate,
} from "@qadi/core";

// An adapter that throws instead of failing — the shape issue #100 is about.
const dying = Layer.succeed(AttributeResolver, {
  resolve: () => Effect.die(new Error("the store crashed")),
});

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-1", roles: [], attributes: {} })),
  dying,
  DecisionHistoryUnknown,
);

// The defect arrives as the port's own typed error, so `catchTag` sees it — and
// so would `Effect.retry`.
const outcome = toPredicate(hasAttribute("riskScore", lt(50))).pipe(
  Effect.catchTag("AttributeResolveError", (e) =>
    Effect.succeed(`could not read '${e.attribute}'`),
  ),
  Effect.provide(services),
);
```

## BEH-QD-265: Translation asks no port a constant has already decided

> **See:** [BEH-QD-034](./05-evaluator.md), [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), [INV-QD-017](../invariants.md), [ADR-QD-013](../decisions/013-short-circuit-default.md)

```
REQUIREMENT: A composite MUST stop asking its children at the first child that
             translates to a *constant* settling it under the evaluator's own rule:
             a `False` for `allOf`; a `True` for an `anyOf` that may stop at an
             allow (`fieldStrategy: "First"`); and for a rule table the condition
             that is `True` with the effect nothing later can beat — any applying
             rule under `FirstApplicable`, a `Deny` under `DenyOverrides`, a
             `Permit` under `PermitOverrides`.
```

Translation asks no port the evaluator would not, and fails on no port the
evaluator would not reach. An `anyOf` under `Union` or `Intersection` must see
every child, as it does in the evaluator, so it does not stop.

```
REQUIREMENT: Pruning MUST NOT change a successful predicate.
```

A pruned `allOf` child could only have been `and`-ed with a `False`; a pruned
`anyOf` child could only have been `or`-ed with a `True`; a pruned rule-table
suffix contributes only `False` terms under `FirstApplicable`, cannot undo a
`True` permit under `PermitOverrides`, and cannot undo `Negate(Or(denies)) =
False` under `DenyOverrides`. Pruning removes port calls and failures the
evaluator would also never reach, and nothing else. The rule for each composite
lives in `ShortCircuit.ts`, read by both interpreters.

## BEH-QD-266: A refusal depends on the tree alone

```
REQUIREMENT: `PolicyNotTranslatable` and `PolicyTooDeep` MUST depend on the policy
             tree alone — not on the subject, the action, or any port's answer —
             and a refusal anywhere in the tree MUST win over a port failure
             elsewhere in it.
```

A policy that refuses for one caller refuses for all of them. Otherwise
`anyOf([hasRole("editor"), hasRelationship("owner")])` would translate for editors
and refuse for everyone else: a policy that works in development for admins and
fails in production. The tree is planned first (every refusal is produced there,
first one in depth-first declaration order); only then does anything run.

```
REQUIREMENT: `MissingAction` MUST be raised when the walk **reaches** a node that
             needs an action, as the evaluator does
             ([INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)),
             not statically.
```

`PolicyNotTranslatable` and `PolicyTooDeep` are properties of the tree;
`MissingAction` and port errors are properties of the request and the stores.

```
REQUIREMENT: An over-deep policy MUST be refused with `PolicyTooDeep` before the
             fields check, so a policy that is both too deep and
             field-restricting is `PolicyTooDeep` whatever its child order.
```

```
REQUIREMENT: `toPredicate` MUST NOT raise a defect for any `maxDepth` a caller
             supplies: the refusal pass folds the tree and translation builds
             each negation's child lazily, so neither overflows the call stack.
```

Before [ADR-QD-090](../decisions/090-a-tree-is-folded-through-one-seam.md) the
refusal pass was an early-exit search in child order, so
`allOf([hasRole("editor", { fields: ["a"] }), deep])` was
`PolicyNotTranslatable` and the reversed order was `PolicyTooDeep` — which of the
two a caller saw depended on child order. And a recursion that was only as safe as
the caller's `maxDepth` raised a `RangeError` for `toPredicate(not^1000(…), {
maxDepth: 1e9 })`.

## BEH-QD-124: A duty and a column restriction both refuse

```
REQUIREMENT: A policy containing an obligation MUST NOT translate.
```

[INV-QD-013](../invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation)
reaching a construct it could not otherwise reach. `filter` refuses an allow whose
obligation nobody discharged; a predicate pushed into a query hands back rows with
no decision attached at all, so refusing the translation is the only safe answer.

```
REQUIREMENT: A policy carrying a `fields` restriction anywhere in the tree MUST
             NOT translate.
```

**A predicate answers which rows, never which columns.** A policy saying
"permitted, and only these fields" reduced to a row filter alone lets a caller run
`SELECT *` and receive columns the policy withheld — a widening no error
announces. The check is deliberately conservative: *any* `fields` in the tree,
including on a branch whose set the evaluator would have discarded. A precise
check would mean reproducing `mergeFields` inside the translator, which is a third
implementation of a rule two already share.

Column projection is therefore **not** in E7, and
[36 — Cell-Level Security](../models/36-cell-level.md)'s `CellVisibility` stays
unbuilt. The split that document argues for is the one shipped: `toPredicate`
narrows the page, and `decide` with `project` judges the columns on it.

## BEH-QD-125: Folding simplifies, and `False` means do not run the query

```
REQUIREMENT: Constants MUST be simplified away as the predicate is built.
```

Every subject-side node folds to a constant, so an unsimplified result is mostly
`True` and compiles to junk. `And` drops `True` and collapses to `False`; `Or`
drops `False` and collapses to `True`; `Negate` inverts the constants.

One outcome is worth naming: **`False` means do not run the query.** A subject who
fails the role half of a policy yields `False` before any column is mentioned, and
the caller can skip the round trip rather than sending a `WHERE false`.

## BEH-QD-126: A rule table becomes a set-based formula

| Combining | Admitted rows |
| --------- | ------------- |
| `PermitOverrides` | `Or(permit conditions)` |
| `DenyOverrides` | `And(Negate(Or(deny conditions)), Or(permit conditions))` |
| `FirstApplicable` | `Or(cᵢ ∧ ¬c₀ ∧ … ∧ ¬cᵢ₋₁)` over the `Permit` rows |

The overrides do not depend on position, so each is one line. `FirstApplicable`
does, and the formula pays for it: every `Permit` row must exclude every row above
it, so an *n*-row table becomes O(n²) conjuncts. That is the honest cost of
pushing an ordered walk into an engine that has no order, and it is bounded by the
caller's own table.

`DenyOverrides` over a tenancy column is the shape every multi-tenant application
asks for, and until [E3](./15-rules.md) it could not be written at all.

## BEH-QD-127: The two interpreters agree

> **Invariant:** [INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)

```
REQUIREMENT: For every translatable policy P and row R,
             evaluatePredicate(toPredicate(P), R) MUST equal
             isAllowed(evaluate(P, { resource: R })).
```

Two interpreters over one tree must agree, and nothing structural makes them.
This is asserted by a `FastCheck` property over generated policies **and**
generated rows — including rows missing a column, since `undefined` must read the
same way on both sides, and rows holding `Infinity`, `-Infinity` and `NaN`, which
a float column can hold and which are where the two interpreters diverged until
CCR-QD-172.

Under **faulty** ports the same two interpreters must also fail only as the
evaluator would: see
[INV-QD-058](../invariants.md#inv-qd-058-translation-fails-only-as-evaluation-would),
which states it and whose properties enforce it.

It is the first test in the library comparing two independent implementations of
the same semantics, and it is the only evidence that would make a second
interpreter trustworthy rather than merely plausible.

## BEH-QD-128: Worked example

Tenancy with an explicit deny, pushed into the query.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  allOf,
  currentSubjectLayer,
  denyWhen,
  eq,
  evaluatePredicate,
  hasResourceAttribute,
  hasRole,
  literal,
  makeSubject,
  permitWhen,
  rules,
  subject,
  subjectId,
  toPredicate,
  type Predicate,
  type PolicyNotTranslatable,
  type EvaluationError,
} from "@qadi/core";

// Tenancy, then the rule table on top of it. Nothing here mentions a query.
const visible = allOf([
  hasResourceAttribute("tenantId", eq(subject("tenantId"))),
  rules(
    [
      denyWhen(hasResourceAttribute("sealed", eq(literal(true)))),
      permitWhen(hasResourceAttribute("ownerId", eq(subjectId()))),
      permitWhen(hasRole("auditor")),
    ],
    { combining: "DenyOverrides" },
  ),
]);

// No `EvaluationId`: no decision is produced. No `RelationshipResolver` either —
// a relationship cannot fold, so a policy needing one never reaches here.
const services = Layer.mergeAll(
  currentSubjectLayer(
    makeSubject({ id: "u-1", roles: ["auditor"], attributes: { tenantId: "t-1" } }),
  ),
  AttributeResolverNone,
  DecisionHistoryUnknown,
);

// The auditor row folds to `True`, so the whole table reduces to "not sealed".
const filter: Effect.Effect<Predicate, PolicyNotTranslatable | EvaluationError> =
  toPredicate(visible).pipe(Effect.provide(services));

// What a caller's SQL compiler is differential-tested against.
const admits = (predicate: Predicate, row: Readonly<Record<string, unknown>>): boolean =>
  evaluatePredicate(predicate, row);

const page = Effect.map(filter, (predicate) =>
  [
    { id: "r-1", tenantId: "t-1", sealed: false },
    { id: "r-2", tenantId: "t-1", sealed: true },
  ].filter((row) => admits(predicate, row)),
);
```

The `filter` above is what a query compiler consumes; the `page` below it is the
same predicate run through the reference interpreter instead, which is how a
caller checks that the two mean the same thing.

---

_Previous: [15 — Rule Tables](./15-rules.md)_
