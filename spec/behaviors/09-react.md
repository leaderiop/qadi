# 09 — React Integration

> **Document Control**
>
> | Property       | Value                                                        |
> | -------------- | ------------------------------------------------------------ |
> | Document ID    | QADI-BEH-09                                                  |
> | Revision       | 3.1                                                          |
> | Effective Date | 2026-10-05                                                   |
> | Status         | Effective                                                    |
> | Author         | Qadi Engineering                                             |
> | Classification | Functional Specification                                     |
> | Change History | 3.1 (2026-10-05): ARCH-14 — BEH-QD-066 gains `DecisionOutcome`/`outcomeOf`, a complete state table (`Initial` with `waiting: true`, a `Failure` being re-checked, and `previousSuccess` never read) and the requirement that every surface reads through `outcomeOf`; BEH-QD-307 added (a decision result reads as one of five outcomes); BEH-QD-068's `useCan` paragraph names `outcomeOf` (ADR-QD-093, INV-QD-094, CCR-QD-175)<br>3.0 (2026-10-04): ARCH-05 — `DecisionResult` and `currentDecision` hold a `ClientDecision` (the closed union of an evaluated or a seeded decision), `useDecisionSuspense` returns one, `DeniedNode`'s function takes `Deny | SeededDeny`, and `useProjected` projects through `permits`/`projectVisible`; `QadiAtoms` gains `hydrate`; the `subject` atom compares with `subjectEquivalence` (BEH-QD-066, BEH-QD-068, BEH-QD-065, BEH-QD-067, CCR-QD-156)<br>2.9 (2026-09-19): AC-02/EY-03 — the "depends on `effect` and `react` only" and `getServerSnapshot` paragraphs corrected for CCR-QD-150's `@effect/atom-react` reversal (2026-09-13), which this revision had missed; `useCan`'s "pending, denied and failed" corrected to the fourth state, a re-check, `hooks.ts`'s own doc comment already named<br>2.8 (2026-09-19): BEH-QD-067 — the subject-seeding requirement scoped to initial construction, and a requirement added for a later `subject` prop change: written in an effect, with an accepted one-frame stale-decision window (AC-03/EY-02)<br>2.7 (2026-09-08): The `Can` RECOMMENDED note corrected — `failure ?? fallback` could not distinguish an omitted `failure` from an explicit `failure={null}`; `Can` now renders `fallback` only when `failure` is omitted, and an explicit `null` opts out of it (issue #79, CCR-QD-138)<br>2.6 (2026-09-08): BEH-QD-065 — the `QadiAtoms` interface fence was missing `asked`, cross-referenced to its normative home at BEH-QD-198 (CCR-QD-126)<br>2.5 (2026-08-30): BEH-QD-068 — an already-settled decision MUST still resolve its suspense promise, and a re-checking one MUST still suspend (COMPAT-01, gap G-01-1)<br>2.4 (2026-08-23): BEH-QD-067 — `"use client"` per module, and the server-rendering guarantee (ADR-QD-042 companion work, CCR-QD-057)<br>2.3 (2026-08-23): BEH-QD-065 — `makeQadiAtoms` takes `QadiAtomsOptions` (ADR-QD-041, BEH-QD-152, CCR-QD-056)<br>2.2 (2026-08-23): BEH-QD-072 — a guard hands its denial to the node that replaces it (CCR-QD-054)<br>2.1 (2026-07-26): BEH-QD-071 corrected — atom keying is structural, not by reference (CCR-QD-013)<br>2.0 (2026-07-26): Rebuilt on `effect/reactivity` (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

`@qadi/react` is a binding over `effect/reactivity`. Decisions live in
atoms; React subscribes to them. See
[ADR-QD-014](../decisions/014-react-via-atoms.md) for why, and
[the integration guide](../appendices/react-integration.md) for a worked
application.

**Corrected in AC-02 (2026-09-19 audit).** This paragraph read "the package
depends on `effect` and `react`. Nothing else — the React glue is a single
`useSyncExternalStore` call" through revision 2.7 (2026-09-08) — true of the
hand-rolled binding this package shipped before CCR-QD-150's reversal
(2026-09-13, `@qadi/react` 0.6.3), false since. The package now also depends
on `@effect/atom-react` (`packages/react/package.json`'s `dependencies`), and
the React glue is that library's own `useAtomValue`, read through its
`RegistryContext` (`QadiProvider.tsx`), not a hand-rolled
`useSyncExternalStore` call — see AGENTS.md §13's own correction and
ADR-QD-014's Consequences section for why the reversal happened and what it
did and did not close.

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
  /** Normative home: [BEH-QD-198](./25-inspection.md#beh-qd-198-an-atom-set-records-the-questions-it-was-asked). */
  readonly asked: () => ReadonlyArray<AskedQuestion>;
  /** The seeding capability `hydrateDecisions` calls — see [BEH-QD-145](./19-hydration.md). */
  readonly hydrate: (
    dehydrated: DehydratedPayload,
    subject: AuthSubject,
    options?: HydrateOptions,
  ) => InitialValues;
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
export type DecisionResult = AsyncResult.AsyncResult<ClientDecision, EvaluationError>;

// The one read of a result (BEH-QD-307): five cases, only `Allowed` grants.
export type DecisionOutcome = Data.TaggedEnum<{
  Pending: {};
  Rechecking: {};
  Allowed: { readonly decision: Allow | SeededAllow };
  Denied: { readonly decision: Deny | SeededDeny };
  Failed: { readonly cause: Cause.Cause<EvaluationError> };
}>;
export const DecisionOutcome: Data.TaggedEnum.Constructor<DecisionOutcome>;
export const outcomeOf: (result: DecisionResult) => DecisionOutcome;

// Its projection: the decision for `Allowed`/`Denied`, else `undefined`.
export const currentDecision: (result: DecisionResult) => ClientDecision | undefined;

// An evaluated decision, or the server's seed (BEH-QD-148): four distinct tags.
export type ClientDecision = Allow | Deny | SeededAllow | SeededDeny;
export const permits: (self: ClientDecision) => self is Allow | SeededAllow;
export const isSeeded: (self: ClientDecision) => self is SeededDecision;
```

`DecisionResult` keeps these states apart, where the predecessor's
`{ allowed, loading, error }` kept two and a half, and `outcomeOf` reads each into
one of five outcomes:

| State | Meaning | `outcomeOf` |
| ----- | ------- | ----------- |
| `Initial` | Not known yet — no subject, or the first evaluation is running. A decision atom reports both with `waiting: true` (no subject is `Effect.never`); a first ask still reads `Pending`, not `Rechecking` | `Pending` |
| `Success`, `waiting: false` | Decided: `Allow` or `Deny` — or, before this client has answered, the server's `SeededAllow`/`SeededDeny` | `Allowed` / `Denied` |
| `Success`, `waiting: true` | The previous decision, while a new one is computed — after an invalidation, or once the subject is cleared | `Rechecking` |
| `Failure`, `waiting: false` | The question could not be answered at all. After a failed re-check it still holds the last success as `previousSuccess`, which `outcomeOf` never reads | `Failed` |
| `Failure`, `waiting: true` | The previous failure, while a new answer is computed | `Rechecking` |

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

```
REQUIREMENT: Every surface MUST read a `DecisionResult` through `outcomeOf`
             (or `currentDecision`, its projection); no outcome other than
             `Allowed` carries an allow, and none carries a failure's
             `previousSuccess`. `useDecision`/`usePolicies` hand back the raw
             result as ADR-QD-017's deliberate opt-in, and
             `useDecisionSuspense` delegates to `suspendOnWaiting: true`.
             See ADR-QD-093, INV-QD-094.
```

```
REQUIREMENT: A verdict MUST be read from a `ClientDecision` with `permits`.
             `isAllowed` from `@qadi/core` MUST NOT accept one.
```

A seeded decision is a projection of the server's, not an evaluation
([BEH-QD-148](./19-hydration.md)), so the compiler is what finds every site that
would have read a seed as if it were an evaluation. A consumer comparing
`decision._tag === "Allow"` keeps compiling and now treats a seeded allow as not
allowed, which fails closed.

## BEH-QD-307: A decision result reads as one of five outcomes

> **See:** [ADR-QD-093](../decisions/093-a-decision-is-read-once.md),
> [INV-QD-094](../invariants.md#inv-qd-094-a-decision-being-re-checked-or-that-failed-never-reads-as-a-verdict)

`outcomeOf` is the one place a `DecisionResult` becomes an answer, and every
`@qadi/react` surface renders from what it returns: `Can`/`Cannot` say what each
outcome renders, `useCan` is `outcome._tag === "Allowed"`, `useProjected` projects
an `Allowed` outcome's decision, and the gate registry records `outcome._tag` —
`GateRenderState` is `DecisionOutcome["_tag"]`, derived rather than restated.

```typescript
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import { DecisionOutcome, makeQadiAtoms, outcomeOf } from "@qadi/react";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

const canRead = hasPermission(permission("doc", "read"));
const atoms = makeQadiAtoms(EvaluationServicesNone);
const registry = AtomRegistry.make();
registry.mount(atoms.decision(canRead));

// No subject yet: the question is pending — not denied, and not an answer.
export const before: DecisionOutcome = outcomeOf(registry.get(atoms.decision(canRead)));

registry.set(atoms.subject, makeSubject({ id: "u1", permissions: ["doc:read"] }));

export const label: string = DecisionOutcome.$match(
  outcomeOf(registry.get(atoms.decision(canRead))),
  {
    Pending: () => "checking",
    // A re-check carries no verdict: the old answer has nowhere to go.
    Rechecking: () => "checking",
    // A failure is not a denial (INV-QD-006).
    Failed: () => "could not check",
    // An evaluated or a seeded allow; `isSeeded` tells them apart.
    Allowed: ({ decision }) => `allowed (${decision._tag})`,
    Denied: () => "denied",
  },
);
```

```
REQUIREMENT: `outcomeOf` MUST read `Initial` as `Pending` whatever its
             `waiting` flag, and any other `waiting` result as `Rechecking`,
             before looking at its variant. A failure being re-checked is
             re-checking, not failed.
```

```
REQUIREMENT: `Failed` MUST carry the evaluation's `Cause` and nothing else.
             A failure's `previousSuccess` is the last allow, and an outcome
             with a field for it would hand a stale allow back to the caller
             (ADR-QD-017).
```

```
REQUIREMENT: A seeded decision MUST read as `Allowed` or `Denied` by its
             verdict, carrying the `SeededAllow`/`SeededDeny` itself —
             a seed is a decision, not a pending state (BEH-QD-149).
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

This requirement governs the **initial** render only — the first `subject` a
`QadiProvider` ever sees, seeded into `AtomRegistry.make`'s `initialValues` so
the first render already has it. It does not forbid propagating a *later*
`subject` prop change, which has nowhere else to go: the registry already
exists by the time a prop changes, so an update can only ever be a write
after the fact.

```
REQUIREMENT: A later `subject` prop change MUST be written to the registry in
             an effect, after commit. A render-phase write was tried (ticket
             34) and reverted: it reproducibly hung an in-flight re-check on a
             page where `subject` never changed at all. The accepted cost is a
             one-frame window, on a genuine subject change only, where a
             guarded control still reads the previous subject's settled
             decision — `currentDecision` cannot report it as pending, because
             the atom has not been told the subject changed yet. See
             ADR-QD-017's Consequences and the react integration guide's §8.
```

```
REQUIREMENT: Writing a subject equal to the current one MUST NOT re-evaluate any
             mounted decision. "Equal" is `subjectEquivalence` (`@qadi/core`):
             the structural rule `DecisionCache`'s key uses, under which
             `roles` and `permissions` compare by content and a nested
             attribute object compares by structure.
```

`makeSubject`/`fromRoles` return a fresh object every call, so a host building its
subject inline re-writes an equal one on every render (RC-01). The `subject` atom
used to compare `attributes` shallowly (`Object.is` per key), which called two
subjects with an equal-but-distinct nested attribute object different and re-ran
every mounted decision for it; the library now has one definition of "same
subject" rather than a cache that compares deeply and an atom that compared
shallowly.

```
REQUIREMENT: Each provider MUST own its registry, and MUST NOT dispose it
             across React's development-mode double mount.
```

### Server rendering

```
REQUIREMENT: Every module using React state MUST carry a `"use client"`
             directive. `Hydration.ts` and the barrel MUST NOT.
```

`"use client"` marks a bundler boundary; it does **not** disable server
rendering. A Client Component is still rendered to HTML on the first request and
hydrated afterwards, which is exactly what these components must do.

What a blanket directive would break is narrower and real: exports of a
`"use client"` module become client references, so a Server Component could no
longer **call** `dehydrateDecisions` — which exists to be called during server
rendering. Per-file directives keep both halves working through one entry point,
and a server module re-exporting from a client one is well-defined.

```
REQUIREMENT: `QadiProvider` and the guards MUST render under `renderToString`.
```

`@effect/atom-react`'s `useAtomValue` — the hook this package's own
`useAtomValue` re-exports, per this document's earlier correction — passes a
`getServerSnapshot` internally, the third argument to the
`useSyncExternalStore` call inside its implementation, without which React
throws on the server (`@effect/atom-react/Hooks.js`; not a
`useSyncExternalStore` call this package makes itself any more, since
CCR-QD-150). A policy that needs no resolver decides during the server pass;
one that reaches a resolver cannot, however fast that resolver is, because
`renderToString` is a single synchronous pass. The second case renders
`pending`, and is precisely the gap a hydration seed covers
([BEH-QD-152](./19-hydration.md)).

## BEH-QD-068: Hooks and components

```ts
export const useSubject: () => AuthSubject | undefined;
export const useDecision: (policy: Policy, resource?: Resource) => DecisionResult;
export const useCan: (policy: Policy, resource?: Resource) => boolean;
export const useDecisionSuspense: (policy: Policy, resource?: Resource) => ClientDecision;
export const usePolicies: (
  policies: Readonly<Record<string, Policy>>,
) => Readonly<Record<string, DecisionResult>>;
export const useProjected: <A extends Record<string, unknown>>(
  policy: Policy,
  data: A,
) => Partial<A>;
export const useInvalidate: () => () => void;

export type DeniedNode = ReactNode | ((decision: Deny | SeededDeny) => ReactNode);

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
convenience. `useCan` returning `false` covers four different situations —
pending, denied, failed, or **being re-checked** — safe for hiding a control,
useless for explaining why it is hidden.

**Corrected in EY-03 (2026-09-19 audit).** This paragraph previously listed
only three states ("pending, denied and failed"), omitting the most
surprising one: `currentDecision` returns `undefined` whenever `waiting` is
`true`, per this document's own requirement (above) that "a waiting result
MUST be treated as not decided by every convenience API," so a background
re-check of a
previously-allowed decision also reads as `false` here. A `useCan`-gated
control hides for the duration of every re-check and reappears once it
resolves — a different, silent hide-flicker from the pending-flash
[ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md) documents
for a first-time pending node. `useDecision`'s own `waiting` flag is how a
caller who cares about that flicker tells the two apart; `useCan` cannot, by
design — matching `packages/react/src/hooks.ts`'s own doc comment on
`useCan`, which already names all four states. (ADR-QD-093: `outcomeOf(useDecision(p))`
is how a caller tells them apart now — `Rechecking` against `Pending` — rather than
reading `waiting` itself.)

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
RECOMMENDED: `Can` renders `fallback` when `failure` is omitted, so an
             interface with no `failure` node fails closed. Supply one
             wherever an operator needs to tell an outage from a denial.
             Passing `failure={null}` explicitly opts out of that fallback and
             renders nothing on failure — it is not equivalent to omitting
             `failure` (CCR-QD-138; the prior `failure ?? fallback` wording
             could not express that distinction because nullish coalescing
             treats an explicit `null` the same as `undefined`).
```

```
REQUIREMENT: A decision that has already settled when its suspense promise is
             created MUST still resolve that promise. `AtomRegistry.subscribe`
             notifies on transitions only, and a decision that has reached its
             verdict has none left to make, so a subscription registered after
             the fact is not sufficient — a component that re-renders stale
             would otherwise suspend permanently.
```

Found by the Node 20.19.0 floor leg (COMPAT-01), not by review: `check
(20.19.0)` failed reproducibly on a genuine race in `useDecisionSuspense`'s
suspense promise, and no existing test caught it because the failure mode was
a hang rather than a wrong answer — `check (26)` passed the identical suite
every time.

```
REQUIREMENT: A decision being re-checked MUST still suspend. The previous
             verdict is not an answer to the current question — see
             [ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md).
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

A guard is already holding the denial — with its reason and its whole trace, once
this client has decided — at the moment it decides to render nothing, and used to
discard it. While the server's seed stands in for the first frames of a
server-rendered page the denial is a `SeededDeny`, whose reason and trace exist only
if the server disclosed them: narrow with `isSeeded` before reading either. So "why is this
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

```
REQUIREMENT: Invalidation MUST clear a `DecisionCache` in its layer, before the
             atoms recompute.
```

Both halves, or neither counts. `Reactivity.invalidate` makes the mounted atoms
recompute at once, and a cache still holding the previous answer serves it
straight back — so the ports are never re-asked, the verdict cannot change, and
the one action that exists to notice a revoked grant is the one guaranteed not
to. Ordering is therefore normative and not an implementation note: clearing
after the recompute clears an entry nothing will read again.

This gap was **known and recorded** before it was closed.
[BEH-QD-190](./25-inspection.md#beh-qd-190-a-cache-can-be-emptied)
described it exactly — *"an invalidated atom re-evaluating through a warm cache
receives the same cached trace back"* — and `DecisionCache.clear` was added so an
operator could do by hand what invalidation had not done for them. Writing the
limitation down is not the same as accepting it: the requirement above says the
decisions are discarded, and a caller who cannot observe any discarding has not
been given what it promises.

It survived because an atom set without a cache behaves correctly, and no test
had one. Found by driving an application that did (CCR-QD-077).

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
