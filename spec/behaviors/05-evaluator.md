# 05 — Evaluator

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-05                                    |
> | Revision       | 1.19                                           |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.19 (2026-11-20): Narrowed ARCH-112's read-once claim to the question's resource and action (review finding WR-01): BEH-QD-662's INV-QD-376 anchor<br>1.18 (2026-11-20): BEH-QD-661 and BEH-QD-662 (ARCH-112, CCR-QD-456)<br>1.17 (2026-11-19): BEH-QD-631, BEH-QD-632, BEH-QD-634 and BEH-QD-635 (ARCH-106, CCR-QD-450)<br>1.16 (2026-11-18): BEH-QD-606 (ARCH-101, CCR-QD-445)<br>1.15 (2026-11-16): a row's resourceId is classified by tag like its own, an unlisted tag gets never (review iteration 2 IN-02)<br>1.14 (2026-11-16): a leaf no own classification names has no row that compiles (review iteration 2 WR-01)<br>1.13 (2026-11-16): BEH-QD-589 pinned by an agreement property and a HasAction deny cell (review IN-03)<br>1.12 (2026-11-16): a row's own and matcher are derived from its leaf's variant (review WR-01)<br>1.11 (2026-11-16): BEH-QD-589 and BEH-QD-590 new: the port-free judgements are written once; every leaf tag has one row in the leaf-needs table (ARCH-97, CCR-QD-441)<br>1.10 (2026-10-08): BEH-QD-039 — a decision is built from a stamp and a trace (`makeDecision`), and its verdict, `visibleFields`, `obligations` and `reason` are the trace root's (ADR-QD-106, INV-QD-170, CCR-QD-301)<br>1.9 (2026-10-07): BEH-QD-033 — the interpreter is the internal `walk`, `evaluate` the only public path to a decision; BEH-QD-317 added, a readiness probe asks the ports every time (ADR-QD-100, CCR-QD-189)<br>1.8 (2026-10-05): BEH-QD-035 — the stop rule reads the field lattice's `decidedByFirst` law; a strategy outside the union, prototype keys included, never stops early (ADR-QD-092, CCR-QD-174)<br>1.7 (2026-10-04): BEH-QD-038 — nesting depth is judged on the policy before any node is visited, matcher nesting counts, and no `maxDepth` raises a defect (ADR-QD-090, CCR-QD-170)<br>1.6 (2026-10-04): BEH-QD-261 — scope sentence: the conversion lives in `PortAccess.ts` and applies to every port read core makes, `toPredicate`'s included (BEH-QD-264); the requirement text for `evaluate` is unchanged (ADR-QD-077, CCR-QD-153)<br>1.5 (2026-09-09): BEH-QD-261 — the five bare `yield*` port calls (`AttributeResolver.resolve`, `DecisionHistory.hasActed`, `RelationshipResolver.check`, `CustomPredicate.evaluate`, `SignatureHistory.signaturesFor`) now each convert a defecting implementation into their own typed `EvaluationError`, joining the four `EvaluationError` tags (`MissingAction`, `MissingResource`, `MissingResourceId`, `PolicyTooDeep`) that were already synchronous and so never at risk of dying — so a caller's `Effect.retry` around `evaluate` now sees a retryable failure at all nine tags, not just those four (issue #100, CCR-QD-142)<br>1.4 (2026-09-07): BEH-QD-033's `evaluate` signature corrected — the requirement channel omitted `CustomPredicate`/`SignatureHistory`, both joined by CCR-QD-082/CCR-QD-089 (CCR-QD-110)<br>1.3 (2026-07-26): `DecisionHistory` joins `EvaluationServices` (CCR-QD-016)<br>1.2 (2026-07-26): `Trace.obligations` (CCR-QD-015)<br>1.1 (2026-07-26): Missing-action rule cross-referenced (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-033: One evaluator

> **Invariant:** [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)
> **See:** [ADR-QD-004](../decisions/004-single-effect-evaluator.md)

```ts
export const evaluate: (
  policy: Policy,
  options?: EvaluateOptions,
) => Effect.Effect<
  Decision,
  EvaluationError,
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | DecisionHistory
  | EvaluationId
  | CustomPredicate
  | SignatureHistory
>;
```

```
REQUIREMENT: There MUST be exactly one evaluator. A separate synchronous path
             is what rendered the predecessor's asynchronous relationship API
             unreachable.
```

The interpreter is `walk` (`Walk.ts`, internal, not in the barrel). It decides
without an id, a record or a metric, so `evaluate` is the only public path to a
decision; `evaluate` is the lifecycle around it ([ADR-QD-100](../decisions/100-a-question-is-asked-once.md)).

## BEH-QD-034: Lazy attribute resolution

> **See:** [ADR-QD-005](../decisions/005-lazy-attribute-resolution.md)

```
REQUIREMENT: `HasAttribute` MUST read the subject's own attributes first and
             call `AttributeResolver` only on a miss.
```

```
REQUIREMENT: Resolution MUST occur at the node that needs the value, so that a
             branch which is never evaluated triggers no lookup. This is
             verified by counting resolver invocations, not by timing.
```

## BEH-QD-035: Short-circuiting

> **See:** [ADR-QD-013](../decisions/013-short-circuit-default.md)

```
REQUIREMENT: `AllOf` MUST stop at its first denying child.
             `AnyOf` MUST stop at its first allowing child only under
             `fieldStrategy: "First"`; under `"Union"` and `"Intersection"` it
             MUST observe every allowing child to merge their field sets.
```

```
REQUIREMENT: `AnyOf` MUST honour an explicit `Intersection` strategy exhaustively,
             the same as `"Union"`. The predecessor special-cased only "union" and
             silently treated every other value as short-circuit, so a stated
             intersection was ignored.
```

The stop rule reads `FieldLattice.ts`'s `decidedByFirst` law through
`ShortCircuit.ts`'s `anyOfStopsAtAllow`, and a value outside the union — a key
`Object.prototype` supplies (`"toString"`, `"__proto__"`) included — never stops
early. The predecessor's defect, "treated every other value as short-circuit",
had come back for exactly those keys through a bare table lookup, and is now
pinned by test ([ADR-QD-092](../decisions/092-field-strategy-meaning-lives-beside-the-lattice.md)).

## BEH-QD-036: Failure is not denial

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```
REQUIREMENT: A failed attribute or relationship lookup MUST propagate as an
             error, never as a denial. Reporting an outage as "not authorized"
             misdirects diagnosis toward permissions.
```

```
REQUIREMENT: A `HasResourceAttribute` or `HasRelationship` policy evaluated
             without the resource it needs MUST fail with `MissingResource` or
             `MissingResourceId`. It is a wiring error, not a decision.
```

The same rule governs a missing action, with one extra step because matchers are
total — see [BEH-QD-076](./10-actions.md) and
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one).

## BEH-QD-037: Determinism

> **See:** [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md)

```
REQUIREMENT: Durations MUST come from `Clock` and identifiers from
             `EvaluationId`. Ambient `Date.now()`, `performance.now()` and
             `crypto.randomUUID()` are prohibited, so that a decision is fully
             reproducible under `TestClock`.
```

## BEH-QD-038: Bounded recursion

```
REQUIREMENT: Evaluation MUST reject a policy tree deeper than `maxDepth`
             (default 64) with `PolicyTooDeep`, bounding recursion on decoded
             input.
```

```
REQUIREMENT: A policy deeper than `maxDepth` MUST be rejected regardless of which
             branches evaluation would visit: the check is made on `policyDepth`
             before any node is evaluated, so whether a policy is too deep never
             depends on the subject, the resource or what any port answers.
```

```
REQUIREMENT: A matcher's nesting counts toward `maxDepth`: a `HasAttribute` or
             `HasResourceAttribute` leaf is as deep as its matcher's `matcherDepth`.
```

```
REQUIREMENT: Evaluation MUST NOT raise a defect for any `maxDepth` a caller
             supplies, `Infinity` included. A wrapper node's child is built
             lazily, so building the effect cannot overflow the call stack.
```

Before ADR-QD-090 the depth was only checked per node, so a policy past the bound
could still evaluate when a short-circuit never descended into the deep branch —
"too deep" depended on who was asking — and a deep chain of `not`/`obliged`/
`labeled` under a large `maxDepth` raised a `RangeError` as a defect, a decision
becoming a defect (AGENTS.md §4). The per-node guard in `evaluateNode` remains as
defense in depth.

## BEH-QD-039: Decisions and traces

```ts
export type Decision = Allow | Deny;

export interface DecisionStamp {
  readonly evaluationId: string;
  readonly subjectId: SubjectId;
  readonly durationMillis: number;
}

export type AllowingTrace = Trace & { readonly allowed: true };
export type DenyingTrace = Trace & { readonly allowed: false };

// The one constructor. `new Allow({ ...stamp, trace })` and
// `new Deny({ ...stamp, trace })` take the same stamp and a trace of their
// verdict; the derived fields cannot be passed.
export const makeDecision: (stamp: DecisionStamp, trace: Trace) => Decision;

export type DecisionDisagreement =
  | "Verdict" | "VisibleFields" | "Obligations" | "Reason" | "DenyObligations"
  | "EvaluationId" | "SubjectId" | "PolicyTag";
export type DecisionClaim =
  | { readonly verdict: "Allow"; readonly visibleFields: VisibleFields; readonly obligations: ReadonlyArray<Obligation> }
  | { readonly verdict: "Deny"; readonly reason: string; readonly obligations: ReadonlyArray<Obligation> };
export const decisionDisagreement: (claim: DecisionClaim, trace: Trace) => DecisionDisagreement | undefined;

export interface Trace {
  readonly policyTag: Policy["_tag"];
  readonly label?: string | undefined;
  readonly allowed: boolean;
  readonly reason?: string | undefined;
  readonly children: ReadonlyArray<Trace>;
  readonly visibleFields?: ReadonlyArray<string> | undefined;
  readonly obligations: ReadonlyArray<Obligation>;
}
```

```
REQUIREMENT: Every evaluation MUST produce a full trace tree, so that a denial
             can always answer "why".

REQUIREMENT: A `Decision`'s verdict, `visibleFields`, `obligations` and `reason`
             MUST be those of its trace root, and a decision MUST be built
             from a stamp and a trace and from nothing else: `Allow` and
             `Deny` take `(stamp, trace)` and derive their own fields, so a
             decision that disagrees with its trace cannot be built. A value
             that arrives carrying both copies (a wire record, a disclosed
             seed) MUST be checked with `decisionDisagreement`, which
             reports the first way they differ (INV-QD-170).
```

## BEH-QD-040: Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  currentSubjectLayer,
  evaluate,
  EvaluationServicesNone,
  hasPermission,
  isAllowed,
  makeSubject,
  permission,
  type EvaluationError,
} from "@qadi/core";

const readDoc = permission("doc", "read");

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u1", permissions: ["doc:read"] })),
  EvaluationServicesNone,
);

// `EvaluationError` remains in the channel: a lookup failure is not a denial,
// so the caller must decide what to do about it.
const program: Effect.Effect<boolean, EvaluationError> = evaluate(
  hasPermission(readDoc),
).pipe(Effect.map(isAllowed), Effect.provide(services));
```

## BEH-QD-261: A defecting port fails typed, not dead

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)
> **See:** [BEH-QD-036](#beh-qd-036-failure-is-not-denial)

```
REQUIREMENT: Each of the five port calls `evaluate` makes — `AttributeResolver.resolve`,
             `DecisionHistory.hasActed`, `RelationshipResolver.check`,
             `CustomPredicate.evaluate`, `SignatureHistory.signaturesFor` —
             MUST convert a defect from the underlying implementation (a
             throw, a rejected promise, an `Effect.die`) into that port's own
             typed `EvaluationError`, exactly as a well-behaved implementation
             failing with that error already does. An already-typed failure,
             and an interruption, MUST pass through unchanged.
```

```
REQUIREMENT: This conversion MUST be visible to a caller's own `Effect.retry`
             wrapped around `evaluate` — `Effect.retry` only ever inspects the
             typed error channel, so a defect that reached it unconverted
             could never be retried, unlike an ordinary `Effect.fail`.
```

BEH-QD-036 already required a *typed* failure not to read as a denial; this
closes the gap one level under it — a port that dies instead of failing is not
`Effect.orDie` (AGENTS.md §4 forbids that explicitly), but reaches the same
place by omission if nothing catches it. `CustomPredicateError` has no `cause`
field, unlike its four siblings; its `reason` renders the defect
(`Cause.pretty`) the same way it already renders an unregistered name as a
sentence, rather than a second shape invented for the defect case.

**Where it lives.** The conversion is `catchPortDefect` in `PortAccess.ts`, the
module every port read either interpreter makes goes through, and so it applies to
every port read core makes — `toPredicate`'s two reads included
([BEH-QD-264](./16-predicates.md#beh-qd-264-a-defecting-port-fails-translation-typed-not-dead)).
The requirement text above is about `evaluate` and is unchanged.

Each port's `Shape` interface documents this as part of its own contract —
`AttributeResolverShape.resolve`'s doc comment states it first, and the other
four cross-reference it — so an implementer reads the guarantee at the method
they are writing, not only here.

## BEH-QD-317: A readiness probe asks the ports every time

> **Invariant:** [INV-QD-102](../invariants.md#inv-qd-102-a-probes-verdict-on-port-health-is-never-served-from-a-cache)
> **See:** [ADR-QD-100](../decisions/100-a-question-is-asked-once.md)

```
REQUIREMENT: `createGuardHealthCheck` MUST consult the wired ports on every call,
             whatever `DecisionCache` is wired. It MUST NOT emit a `SinkRecord`
             and MUST NOT update `qadi_decisions_total`. It MUST require only
             `CurrentSubject` and the ports.
```

```typescript
import * as Effect from "effect/Effect";
import { createGuardHealthCheck, decisionCacheLayer, hasRole } from "@qadi/core";

// With a cache wired, both probes still reach the ports.
export const probeTwice = Effect.gen(function* () {
  const first = yield* createGuardHealthCheck(hasRole("canary"));
  const second = yield* createGuardHealthCheck(hasRole("canary"));
  return [first.healthy, second.healthy] as const;
}).pipe(Effect.provide(decisionCacheLayer()));
```

A probe answers "do the wired ports answer?", which is not an authorization
decision. Its `qadi.guardHealthCheck` span carries `qadi.healthy` and, when
unhealthy, `qadi.error_tag`.

## BEH-QD-589: The port-free judgements are written once

> **See:** [ADR-QD-163](../decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md)

```
REQUIREMENT: Whether the subject holds a `HasRole` leaf's role, whether it holds a
             `HasPermission` leaf's permission, and whether the request's action
             is a `HasAction` leaf's action MUST each be decided by one function
             (`holdsRole`, `holdsPermission`, `holdsAction`) that `evaluate` and
             `toPredicate` both call. `evaluate`'s reason sentences MUST be
             unchanged.
```

Each interpreter wraps the boolean, `evaluate` in an allow or a deny with its
reason, `toPredicate` in a constant. The functions are in
`packages/core/src/LeafNeeds.ts`, package-private, and `LeafNeeds.test.ts`
asserts that none is on the barrel, that every allow `evaluate` gives is a `True`
constant from `toPredicate` and every deny a `False` one, and that a `HasAction`
deny's reason is `action is 'read', not 'write'` byte for byte.

## BEH-QD-590: Every leaf tag has one row in the leaf-needs table

> **Invariant:** [INV-QD-345](../invariants.md#inv-qd-345-every-leaf-tag-has-one-row-in-the-leaf-needs-table)
> **See:** [ADR-QD-163](../decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md),
> [ADR-QD-152](../decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md)

```
REQUIREMENT: `LEAF_NEEDS` MUST have exactly one row for each tag of `LeafPolicy`:
             a leaf tag without a row MUST be a compile error (TS2741), and a row
             for a tag that is not a leaf MUST be one too (TS2353). A row whose
             `own` or `resourceId` disagrees with its tag's classification, or
             whose `matcher` disagrees with its leaf's variant, MUST be a
             compile error as well (TS2322), and a leaf whose tag no
             classification names MUST have no row that compiles. Both
             interpreters MUST read it, and
             neither MAY restate what a row says.
```

A row says what the leaf reads itself, whether its matcher is asked what it
references, and whether it asks a port about one resource. The table is keyed
by the leaf, so two leaves with the same need keep two rows. A row's `matcher`
is read from its leaf's variant and its `own` and `resourceId` from closed tag
lists in which an unlisted tag gets `never` (`LeafNeedOf`), because `absenceOf`
reads a leaf's matcher and action through guards that trust the row: a new leaf
cannot default to reading nothing. Pinned by `LeafNeeds.test.ts`,
`LeafNeeds.tst.ts` and the typecheck.

## BEH-QD-606: Every leaf's answer becomes a verdict in one row

> **Invariant:** [INV-QD-353](../invariants.md#inv-qd-353-each-leafs-answer-becomes-a-verdict-in-exactly-one-row-which-both-interpreters-read)
> **See:** [ADR-QD-167](../decisions/167-each-leafs-answer-becomes-a-verdict-in-one-row.md),
> [ADR-QD-163](../decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md)

```
REQUIREMENT: `LEAF_VERDICTS` MUST have exactly one row for each tag of `LeafPolicy`: a tag
             without a row, or a row for a tag that is not a leaf, MUST be a compile error.
             `evaluate` MUST decide whether a leaf holds only through its row, and MUST keep
             every deny sentence byte for byte; it chooses a sentence by the outcome's kind.
```

A row takes what its verdict reads (the leaf when the verdict reads the leaf's fields, the port's answer when it
reads only that) and returns a closed outcome: `Held` or `NotHeld` for role, permission, action and custom,
the matcher's `Verdict` for the two attribute leaves, `Held`, `Unrelated` or `Unknown` for a relationship,
`Held`, `Unknown`, `Performed` or `NotPerformed` for an acted leaf, and `Held`, `NoneOnFile` or `NoneMatching` for a
signature. Rows allocate nothing. Pinned by `LeafVerdict.test.ts` (every tag, answer and polarity, with the exact
reason), `LeafNeeds.test.ts` and the typecheck.

## BEH-QD-631: Admission builds the one walk environment

> **Invariant:** [INV-QD-363](../invariants.md#inv-qd-363-both-interpreters-read-the-environment-admission-built)
> **See:** [ADR-QD-172](../decisions/172-admission-produces-the-one-walk-environment.md),
> [ADR-QD-100](../decisions/100-a-question-is-asked-once.md)

```
REQUIREMENT: `admit(question, rowSource)` MUST either refuse the question with `PolicyTooDeep` or
             return one `Admitted` holding the subject, what the request supplied, the matcher
             context and the depth bound. `evaluate` and `toPredicate` MUST read each of these
             only from it, and only `admit` MAY build one.
```

The matcher context carries the resource and the action, so each fact is held once and the question itself is not
carried. Pinned by `Admission.test.ts` (E1 to E6) and `WalkEnvironment.tst.ts`.

## BEH-QD-632: An asked question supplies what it carries

> **Invariant:** [INV-QD-364](../invariants.md#inv-qd-364-what-a-request-supplied-is-a-function-of-its-row-source-and-its-question)
> **See:** [ADR-QD-172](../decisions/172-admission-produces-the-one-walk-environment.md),
> [ADR-QD-163](../decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md)

```
REQUIREMENT: For `evaluate` (row source `"asked"`), `supplied.resource` MUST be true exactly when the
             question carries a resource and `supplied.action` exactly when it carries an action.
             A question with neither MUST supply neither, and an absent resource
             MUST NOT be reported as supplied.
```

The empty edge is stated because it is the one a fail-open regression would take: a question without a resource
supplies `resource: false`, and one without an action `action: false`, so a leaf that reads the absent fact fails
with `MissingResource` or `MissingAction` instead of reading nothing. Pinned by `Admission.test.ts` (E1 to E4) and
`LeafMatrix.test.ts`.

## BEH-QD-634: Recursion passes the policy, the environment and one depth

> **Invariant:** [INV-QD-363](../invariants.md#inv-qd-363-both-interpreters-read-the-environment-admission-built)
> **See:** [ADR-QD-172](../decisions/172-admission-produces-the-one-walk-environment.md)

```
REQUIREMENT: `evaluateNode` MUST take exactly `(policy, request, depth)`, in that order, and read the
             bound from the environment; a number where the environment belongs, or the
             environment where the depth belongs, MUST NOT compile. The per-node guard MUST
             refuse `depth > maxDepth` with `PolicyTooDeep`.
```

`concurrency` travels beside the environment in the walk's own bundle, never in it, because it is not a fact about
the question (D-12). The per-node guard is defence in depth: admission proves the bound before the walk starts, so
`evaluate` cannot reach it. Pinned by `WalkEnvironment.tst.ts` and `RolesAndDepth.test.ts`.

## BEH-QD-635: The environment is built once per evaluation, and never on a cache hit

> **Invariant:** [INV-QD-363](../invariants.md#inv-qd-363-both-interpreters-read-the-environment-admission-built)
> **See:** [ADR-QD-172](../decisions/172-admission-produces-the-one-walk-environment.md),
> [ADR-QD-100](../decisions/100-a-question-is-asked-once.md)

```
REQUIREMENT: `walk` MUST call `admit` once per evaluation, inside its `Effect.suspend`, and pass that
             one environment to every node by reference; a cache hit MUST NOT call `admit`.
```

Building the environment lazily is what keeps a cache hit free of it, and passing it by reference is what keeps a
node from rebuilding it. Pinned by `DecisionCache.test.ts` ("a cache hit never runs evaluateNode at all").

## BEH-QD-661: Only `admit` builds an `Admitted`

> **Invariant:** [INV-QD-375](../invariants.md#inv-qd-375-only-admit-builds-an-admitted)
> **See:** [ADR-QD-172](../decisions/172-admission-produces-the-one-walk-environment.md)

```
REQUIREMENT: Outside `Admission.ts`, a call to `Admitted`'s constructor MUST NOT type-check, and an
             object literal of `Admitted`'s shape MUST NOT be assignable to `Admitted`. `admit`
             MUST be `Admitted`'s static method, exported from the module as `admit`.
```

The constructor is private, and a declared private member makes the type nominal, because a private constructor alone
still lets a literal of the same shape type-check. Holding an `Admitted` then shows that `admit` built it, wherever
code is type-checked. Pinned by `WalkEnvironment.tst.ts` (the constructor call refused with TS2673, the literal with
TS2741, each beside a positive control on `admit`).

## BEH-QD-662: An asked flag agrees with the matcher context

> **Invariant:** [INV-QD-376](../invariants.md#inv-qd-376-the-supplied-flags-and-the-matcher-context-come-from-one-read-of-the-questions-resource-and-action)
> **See:** [ADR-QD-172](../decisions/172-admission-produces-the-one-walk-environment.md)

```
REQUIREMENT: For every question, `supplied.resource` of an `"asked"` environment MUST be true
             exactly when its matcher context holds a resource, and `supplied.action` of either
             row source exactly when the context holds an action. `admit` MUST read the
             question's resource and action once each.
```

A question whose resource or action answers differently on a second read is where two reads would disagree, so the
cases use one: a flag that disagreed with the context would decide a leaf's missing-input answer from a value its
matchers never see. The `"row"` row's resource stays `true` whatever the question holds (BEH-QD-633). Pinned by
`Admission.test.ts` (E7 to E10).

---

_Previous: [04 — Matcher DSL](./04-matchers.md) | Next: [06 — Services and Layers](./06-services.md)_
