# 09 — React Integration

> **Document Control**
>
> | Property       | Value                                                        |
> | -------------- | ------------------------------------------------------------ |
> | Document ID    | QADI-BEH-09                                                  |
> | Revision       | 2.1                                                          |
> | Effective Date | 2026-07-26                                                   |
> | Status         | Effective                                                    |
> | Author         | Qadi Engineering                                             |
> | Classification | Functional Specification                                     |
> | Change History | 2.1 (2026-07-26): BEH-QD-071 corrected — atom keying is structural, not by reference (CCR-QD-013)<br>2.0 (2026-07-26): Rebuilt on `effect/unstable/reactivity` (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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
export const makeQadiAtoms: (layer: QadiLayer) => QadiAtoms;

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

export const Can: (props: {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly fallback?: ReactNode;
  readonly pending?: ReactNode;
  readonly failure?: ReactNode;
  readonly children: ReactNode;
}) => ReactNode;

export const Cannot: (props: {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly pending?: ReactNode;
  readonly failure?: ReactNode;
  readonly children: ReactNode;
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
