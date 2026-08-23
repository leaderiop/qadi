# 09 — React Integration

> **Document Control**
>
> | Property       | Value                                                        |
> | -------------- | ------------------------------------------------------------ |
> | Document ID    | QADI-BEH-09                                                  |
> | Revision       | 2.3                                                          |
> | Effective Date | 2026-08-23                                                   |
> | Status         | Effective                                                    |
> | Author         | Qadi Engineering                                             |
> | Classification | Functional Specification                                     |
> | Change History | 2.3 (2026-08-23): BEH-QD-065 — `makeQadiAtoms` takes `QadiAtomsOptions` (ADR-QD-041, BEH-QD-152, CCR-QD-056)<br>2.2 (2026-08-23): BEH-QD-072 — a guard hands its denial to the node that replaces it (CCR-QD-054)<br>2.1 (2026-07-26): BEH-QD-071 corrected — atom keying is structural, not by reference (CCR-QD-013)<br>2.0 (2026-07-26): Rebuilt on `effect/unstable/reactivity` (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

`@qadi/react` is a binding over `effect/unstable/reactivity`. Decisions live in
atoms; React subscribes to them. See
[ADR-QD-014](../decisions/014-react-via-atoms.md) for why, and
[the integration guide](../appendices/react-integration.md) for a worked
application.

The package depends on `effect` and `react`. Nothing else — the React glue is a
single `useSyncExternalStore` call.

## BEH-QD-065: The atom set

```ts
export const makeQadiAtoms: (
  layer: QadiLayer,
  options?: QadiAtomsOptions,
) => QadiAtoms;

export interface QadiAtomsOptions {
  /** Replaces the development-mode warning — see [BEH-QD-152](./19-hydration.md). */
  readonly onHydrationMismatch?: HydrationMismatchReporter;
}

export type QadiRuntimeServices = Exclude<EvaluationServices, CurrentSubject>;

export type QadiLayer = Layer.Layer<
  QadiRuntimeServices,
  never,
  AtomRegistry.AtomRegistry | Reactivity.Reactivity
>;

export interface QadiAtoms {
  readonly runtime: Atom.AtomRuntime<QadiRuntimeServices>;
  readonly subject: Atom.Writable<AuthSubject | undefined>;
  readonly decision: (policy: Policy) => Atom.Atom<DecisionResult>;
  readonly decisionFor: (policy: Policy, resource: Resource) => Atom.Atom<DecisionResult>;
  readonly invalidate: Atom.AtomResultFn<void, void>;
}
```

```
REQUIREMENT: `decision` MUST return the same atom for the same policy, so that
             every component asking one question shares one evaluation. Fifty
             rows asking `useCan(canEdit)` MUST perform one evaluation, not
             fifty.
```

```
REQUIREMENT: `CurrentSubject` MUST NOT be part of the layer. A login must not
             rebuild the attribute resolver.
```

```
REQUIREMENT: The layer MUST NOT be able to fail. A resolver that cannot be
             built is a wiring defect; turning it into an error on every
             subsequent decision would report a startup problem as an
             authorization problem for the life of the process.
```

## BEH-QD-066: Decision state

```ts
export type DecisionResult = AsyncResult.AsyncResult<Decision, EvaluationError>;

export const currentDecision: (result: DecisionResult) => Decision | undefined;
```

`DecisionResult` keeps four states apart, where the predecessor's
`{ allowed, loading, error }` kept two and a half:

| State | Meaning |
| ----- | ------- |
| `Initial` | Not known yet — no subject, or the first evaluation is running |
| `Success`, `waiting: false` | Decided: `Allow` or `Deny` |
| `Success`, `waiting: true` | The previous decision, while a new one is computed |
| `Failure` | The question could not be answered at all |

```
REQUIREMENT: A `Failure` MUST NOT be reported as a denial. An attribute-backend
             outage must stay distinguishable from "not permitted".
             See INV-QD-006.
```

```
REQUIREMENT: A `waiting` result MUST be treated as not decided by every
             convenience API. A stale allow is a grant nobody authorised.
             See ADR-QD-017.
```

## BEH-QD-067: Provider

```ts
export const QadiProvider: (props: {
  readonly atoms: QadiAtoms;
  readonly subject: AuthSubject | undefined;
  readonly initialValues?: Iterable<readonly [Atom.Atom<unknown>, unknown]>;
  readonly children: ReactNode;
}) => ReactNode;
```

`subject: undefined` means the subject is still loading.

```
REQUIREMENT: The subject MUST be seeded when the registry is constructed, not
             written afterwards in an effect. Writing it afterwards shows every
             guarded control in its pending state for one frame.
```

```
REQUIREMENT: Each provider MUST own its registry, and MUST NOT dispose it
             across React's development-mode double mount.
```

## BEH-QD-068: Hooks and components

```ts
export const useSubject: () => AuthSubject | undefined;
export const useDecision: (policy: Policy, resource?: Resource) => DecisionResult;
export const useCan: (policy: Policy, resource?: Resource) => boolean;
export const useDecisionSuspense: (policy: Policy, resource?: Resource) => Decision;
export const usePolicies: (
  policies: Readonly<Record<string, Policy>>,
) => Readonly<Record<string, DecisionResult>>;
export const useProjected: <A extends Record<string, unknown>>(
  policy: Policy,
  data: A,
) => Partial<A>;
export const useInvalidate: () => () => void;

export type DeniedNode = ReactNode | ((decision: Deny) => ReactNode);

export const Can: (props: {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly fallback?: DeniedNode;
  readonly pending?: ReactNode;
  readonly failure?: ReactNode;
  readonly children: ReactNode;
}) => ReactNode;

export const Cannot: (props: {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly pending?: ReactNode;
  readonly failure?: ReactNode;
  readonly children: DeniedNode;
}) => ReactNode;
```

`useDecision` is the primitive; everything else collapses part of its state for
convenience. `useCan` returning `false` covers pending, denied and failed — safe
for hiding a control, useless for explaining why it is hidden.

```
REQUIREMENT: Using a hook outside a provider MUST throw. Denying silently would
             present a wiring mistake as a permissions problem.
```

```
REQUIREMENT: `Cannot` MUST NOT render its children on failure. "We could not
             determine whether you may edit this" is not grounds for telling the
             user they may not.
```

```
RECOMMENDED: `Can` renders `failure ?? fallback`, so an interface with no
             `failure` node fails closed. Supply one wherever an operator needs
             to tell an outage from a denial.
```

## BEH-QD-072: A guard hands its denial to the node that replaces it

> **See:** [BEH-QD-054](./07-enforcement.md), [BEH-QD-144](./18-explanation.md)

```
REQUIREMENT: Where `Can`'s `fallback` and `Cannot`'s `children` are functions,
             they MUST be called with the `Deny` that produced them.
```

```
REQUIREMENT: A function `fallback` MUST NOT be used for the failure branch.
```

A guard is already holding the `Deny` — with its reason and its whole trace — at
the moment it decides to render nothing, and used to discard it. So "why is this
control not here?" was the one question the declarative API could not answer,
while the answer sat one argument away. It is the same defect as
[BEH-QD-054](./07-enforcement.md) at a different surface: a value in scope,
thrown away at the point it was most wanted.

A plain node stays the common case. Most fallbacks say nothing about the denial
and should not have to take one, so `DeniedNode` is a union rather than a
required function.

The second requirement is [INV-QD-006](../invariants.md) at the component layer.
`failure` still defaults to `fallback`, but a **function** fallback is written to
explain a refusal, and during an outage no refusal happened — calling it would
describe one that does not exist, which is exactly the confusion "failure is not
denial" exists to prevent. A function fallback with no `failure` renders nothing,
which is still closed.

## BEH-QD-069: Invalidation

```
REQUIREMENT: `useInvalidate()` MUST discard every decision in its context and
             re-evaluate the mounted ones, without the subject object changing.
             Authority changes independently of identity: a role granted
             server-side leaves the same subject id holding different powers.
```

Invalidation is keyed through `Reactivity` under `qadi/decisions`.

## BEH-QD-070: Isolated contexts

```
REQUIREMENT: Two calls to `makeQadiAtoms` MUST produce disjoint decisions, and
             two providers MUST NOT share a registry. Isolation is structural,
             not configured — a multi-tenant application cannot leak a decision
             between tenants by forgetting a setting.
```

The predecessor achieved this with a 250-line clone of its hook module. There is
now one implementation and no factory to keep in sync.

## BEH-QD-071: Policy identity

```
REQUIREMENT: Atoms MUST be keyed such that two equal policies share one
             evaluation. `Atom.family` compares with `Equal.equals`, so keying
             is structural: a policy constructed inline in render shares with
             an equal one built anywhere else.
```

```
REQUIREMENT: Policies SHOULD be built as module-level constants — a
             recommendation, not a correctness rule. The structural hash is
             cached per object, so a fresh object on every render re-walks the
             whole policy tree to find the atom it was already going to find.
```

The same applies to the `resource` argument and to the record passed to
`usePolicies`. Hoist them, or memoise them.

**This document said the opposite until revision 1.1**, and stated it as a
requirement: that keying was by reference and an inline policy therefore got a
new atom and no sharing. Writing the reactivity canary disproved it. The
practical advice was unchanged by the correction, which is exactly why it
survived three revisions unchallenged — the guidance was right and the reason
was wrong.

---

_Previous: [08 — Serialization](./08-serialization.md) | Next: [10 — The Action Dimension](./10-actions.md)_
