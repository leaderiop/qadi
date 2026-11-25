# 09 — React Integration

> **Document Control**
>
> | Property       | Value                                                        |
> | -------------- | ------------------------------------------------------------ |
> | Document ID    | QADI-BEH-09                                                  |
> | Revision       | 3.21                                                          |
> | Effective Date | 2026-10-08                                                   |
> | Status         | Effective                                                    |
> | Author         | Qadi Engineering                                             |
> | Classification | Functional Specification                                     |
> | Change History | 3.21 (2026-11-25): BEH-QD-067 and BEH-QD-516 restated: the provider holds one registry for its life and recycles it, nothing is disposed; the invariants linked (ADR-QD-195, CCR-QD-474)<br>3.20 (2026-11-25): BEH-QD-746 to BEH-QD-750: a provider's registry has one owner for its lifetime (ARCH-129, ADR-QD-195, CCR-QD-474)<br>3.19 (2026-11-24): BEH-QD-740: the instrument-toggle test is quoted by its current title (CCR-QD-472)<br>3.18 (2026-11-24): BEH-QD-740: QadiContextValue is the atoms, the registry and the gates (ADR-QD-193, CCR-QD-472)<br>3.17 (2026-11-22): BEH-QD-703: pinned by the reconcile test on a real registry (CCR-QD-465)<br>3.16 (2026-11-22): BEH-QD-702: states the writer's contract once and cites only the tests that pin it (CCR-QD-465)<br>3.15 (2026-11-22): BEH-QD-703: pinned by the surviving same-input reconcile test (CCR-QD-465)<br>3.14 (2026-11-22): BEH-QD-702: the writer's contract replaces the failure rule (CCR-QD-465)<br>3.13 (2026-11-22): BEH-QD-701 to BEH-QD-705: gate registration as one keyed reconcile (ARCH-120, CCR-QD-465)<br>3.12 (2026-11-22): BEH-QD-691, BEH-QD-693 and BEH-QD-694: the table-facts test detects a changed row and is no evidence of timing; the provider reads InstrumentedInProduction's condition through holdsHere; the latch is the one rebindable module-scope binding (ARCH-118, CCR-QD-463)<br>3.11 (2026-11-22): BEH-QD-691, BEH-QD-693, BEH-QD-694: one developer-signal table, each default's condition, the once-per-process line (ARCH-118, ADR-QD-184, CCR-QD-463)<br>3.10 (2026-11-19): BEH-QD-327: DiagnosticsOptions.layer (ARCH-107, CCR-QD-451)<br>3.9 (2026-11-18): BEH-QD-327: the feed hands questions beside gates (ARCH-103, CCR-QD-447)<br>3.8 (2026-11-16): BEH-QD-327: the feed hands over the gate registry (ARCH-96, CCR-QD-440)<br>3.7 (2026-11-12): BEH-QD-516 new: the subject stays in the registry for the provider's lifetime; BEH-QD-067's later-change requirement names it (CCR-QD-427)<br>3.6 (2026-11-12): BEH-QD-512..515 new (one sweeper per atom set; the sweep after the pressure; no provider fork and no manual sweep; the bound after unmount); BEH-QD-065 restated without sweepEvictions (ARCH-83, CCR-QD-426)<br>3.5 (2026-10-08): BEH-QD-327 added — a devtools feed reads the provider's own runtime: `useDevtoolsFeed` and `runtimeLayer` (ARCH-34, ADR-QD-053 amendment, CCR-QD-240)<br>3.4 (2026-10-08): BEH-QD-067 — `onDeveloperSignal`, and the requirement that the provider never writes to the console itself (ADR-QD-041 amendment, CCR-QD-203)<br>3.3 (2026-10-07): ARCH-23 — BEH-QD-065's `QadiAtoms` listing takes `decision(policy, resource?)` (`decisionFor` is removed), `decisions`, `gates`, `sweepEvictions` and the `maxTrackedQuestions`/`onGateIdCollision` options it omitted, and "the same atom" becomes "for as long as the atom set tracks the question, whatever the garbage collector does"; BEH-QD-068 gains `useQuestions` and the grouped-registration note (ADR-QD-103, ADR-QD-053 amendment, INV-QD-105, CCR-QD-201)<br>3.2 (2026-10-06): `QadiAtoms.hydrate` takes `DehydratedDecisions` — `DehydratedPayload` is removed with the version-1 payload reader (ADR-QD-078 amendment, CCR-QD-182)<br>3.1 (2026-10-05): ARCH-14 — BEH-QD-066 gains `DecisionOutcome`/`outcomeOf`, a complete state table (`Initial` with `waiting: true`, a `Failure` being re-checked, and `previousSuccess` never read) and the requirement that every surface reads through `outcomeOf`; BEH-QD-307 added (a decision result reads as one of five outcomes); BEH-QD-068's `useCan` paragraph names `outcomeOf` (ADR-QD-093, INV-QD-094, CCR-QD-175)<br>3.0 (2026-10-04): ARCH-05 — `DecisionResult` and `currentDecision` hold a `ClientDecision` (the closed union of an evaluated or a seeded decision), `useDecisionSuspense` returns one, `DeniedNode`'s function takes `Deny | SeededDeny`, and `useProjected` projects through `permits`/`projectVisible`; `QadiAtoms` gains `hydrate`; the `subject` atom compares with `subjectEquivalence` (BEH-QD-066, BEH-QD-068, BEH-QD-065, BEH-QD-067, CCR-QD-156)<br>2.9 (2026-09-19): AC-02/EY-03 — the "depends on `effect` and `react` only" and `getServerSnapshot` paragraphs corrected for CCR-QD-150's `@effect/atom-react` reversal (2026-09-13), which this revision had missed; `useCan`'s "pending, denied and failed" corrected to the fourth state, a re-check, `hooks.ts`'s own doc comment already named<br>2.8 (2026-09-19): BEH-QD-067 — the subject-seeding requirement scoped to initial construction, and a requirement added for a later `subject` prop change: written in an effect, with an accepted one-frame stale-decision window (AC-03/EY-02)<br>2.7 (2026-09-08): The `Can` RECOMMENDED note corrected — `failure ?? fallback` could not distinguish an omitted `failure` from an explicit `failure={null}`; `Can` now renders `fallback` only when `failure` is omitted, and an explicit `null` opts out of it (issue #79, CCR-QD-138)<br>2.6 (2026-09-08): BEH-QD-065 — the `QadiAtoms` interface fence was missing `asked`, cross-referenced to its normative home at BEH-QD-198 (CCR-QD-126)<br>2.5 (2026-08-30): BEH-QD-068 — an already-settled decision MUST still resolve its suspense promise, and a re-checking one MUST still suspend (COMPAT-01, gap G-01-1)<br>2.4 (2026-08-23): BEH-QD-067 — `"use client"` per module, and the server-rendering guarantee (ADR-QD-042 companion work, CCR-QD-057)<br>2.3 (2026-08-23): BEH-QD-065 — `makeQadiAtoms` takes `QadiAtomsOptions` (ADR-QD-041, BEH-QD-152, CCR-QD-056)<br>2.2 (2026-08-23): BEH-QD-072 — a guard hands its denial to the node that replaces it (CCR-QD-054)<br>2.1 (2026-07-26): BEH-QD-071 corrected — atom keying is structural, not by reference (CCR-QD-013)<br>2.0 (2026-07-26): Rebuilt on `effect/reactivity` (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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
  /** Called once per id when two live guards minted the same `useId` — see [BEH-QD-068](#beh-qd-068-hooks-and-components). */
  readonly onGateIdCollision?: (id: string) => void;
  /** The most cold questions `asked()` keeps once swept; a positive integer, default 500 — see [BEH-QD-198](./25-inspection.md#beh-qd-198-an-atom-set-records-the-questions-it-was-asked). */
  readonly maxTrackedQuestions?: number;
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
  readonly decision: (policy: Policy, resource?: Resource) => Atom.Atom<DecisionResult>;
  readonly decisions: (
    questions: Readonly<Record<string, AskedQuestion>>,
  ) => Atom.Atom<Readonly<Record<string, DecisionResult>>>;
  readonly invalidate: Atom.AtomResultFn<void, void>;
  /** Normative home: [BEH-QD-198](./25-inspection.md#beh-qd-198-an-atom-set-records-the-questions-it-was-asked). */
  readonly asked: () => ReadonlyArray<AskedQuestion>;
  /** The "asking" half of the panel: every live guard under this atom set — see [BEH-QD-068](#beh-qd-068-hooks-and-components). */
  readonly gates: GateRegistry;
  /** The seeding capability `hydrateDecisions` calls — see [BEH-QD-145](./19-hydration.md). */
  readonly hydrate: (
    dehydrated: DehydratedDecisions,
    subject: AuthSubject,
    options?: HydrateOptions,
  ) => InitialValues;
}
```

```
REQUIREMENT: `decision` MUST return the same atom for an equal question (a
             policy, and a resource when one is in scope), so that every
             component asking one question shares one evaluation. Fifty rows
             asking `useCan(canEdit)` MUST perform one evaluation, not fifty.
```

```
REQUIREMENT: That identity MUST hold for as long as the atom set tracks the
             question, whatever the garbage collector does. A second atom for a
             tracked question would be a second evaluation, a second `asked()`
             row and a lost hydrated seed (INV-QD-105, ADR-QD-103). A question the
             atom set's sweep has dropped is no longer tracked, and asking it
             again builds a fresh atom.
```

```
REQUIREMENT: `decisions` MUST return the same atom for a structurally equal
             record, and each entry MUST be the atom `decision` returns for that
             question.
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
  readonly onDeveloperSignal?: ProviderSignalReporter;
  readonly children: ReactNode;
}) => ReactNode;

export type ProviderSignal =
  | { readonly _tag: "InstrumentedInProduction" }
  | { readonly _tag: "AtomsReplaced" }
  | { readonly _tag: "UnwritableGateRegistry" };
export type ProviderSignalReporter = (signal: ProviderSignal) => void;
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
             The written subject MUST stay in the registry whether or not a
             gate reads it (BEH-QD-516).
```

> **Amended 2026-11-12 (CCR-QD-427).** The requirement above gains its last
> sentence: "The written subject MUST stay in the registry whether or not a gate
> reads it (BEH-QD-516)." The rest is unchanged.

```
REQUIREMENT: Writing a subject equal to the current one MUST NOT re-evaluate any
             mounted decision. "Equal" is `subjectEquivalence` (`@qadi/core`):
             the structural rule `DecisionCache`'s key uses, under which
             `roles` and `permissions` compare by content and a nested
             attribute object compares by structure.
```

```
REQUIREMENT: Each signal the provider raises — `instrument` in a production
             bundle, an `atoms` prop replaced after mount, an unwritable gate
             registry under `instrument` — MUST go to `onDeveloperSignal` when
             it is supplied, which then replaces the console default and runs
             in production, and otherwise to a default warning under that
             signal's own condition. The provider MUST NOT write to the
             console itself.
```

The condition is the signal's own: `InstrumentedInProduction` is raised only
outside development; `AtomsReplaced` and `UnwritableGateRegistry` are raised in
any environment, and their console default speaks only in development, as the
other developer signals' defaults do
([BEH-QD-152](19-hydration.md#beh-qd-152-a-superseded-seed-is-announced)). The
reporter is read through a ref, so an inline callback re-fires nothing.
`InstrumentedInProduction` is told once per provider mount; its console default
is latched once per process, so a page of several instrumented providers prints
one line (ticket 153).

`makeSubject`/`fromRoles` return a fresh object every call, so a host building its
subject inline re-writes an equal one on every render (RC-01). The `subject` atom
used to compare `attributes` shallowly (`Object.is` per key), which called two
subjects with an equal-but-distinct nested attribute object different and re-ran
every mounted decision for it; the library now has one definition of "same
subject" rather than a cache that compares deeply and an atom that compared
shallowly.

```
REQUIREMENT: Each provider MUST own one registry for its life, and MUST NOT
             release it while any of its effects hold it.
```

The registry is built in render and never cleared, and the provider hands the
tree one object for as long as it lives
([BEH-QD-747](#beh-qd-747-a-provider-holds-one-registry-for-its-life)). It is
released by a recycle, never a disposal, one macrotask after the last release
that no hold cancelled ([BEH-QD-748](#beh-qd-748-a-providers-registry-is-released-once-a-macrotask-after-its-last-release-unless-held-first),
[ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)),
so React's development-mode double mount, a hide shorter than the macrotask and
a StrictMode double effect each release nothing. Two limits are recorded
because a recycle writes back the subject and nothing else
([BEH-QD-750](#beh-qd-750-a-recycle-re-applies-neither-initialvalues-nor-a-hydration-seed)):
a seeded gate under a provider with no subject, or whose resolver never answers,
stays `Pending` after a long hide until the client answers, which fails closed
because a seed is not an authority (`LT10`, `LT9`); and a subscription a host
holds directly on the registry across a long hide, through `RegistryContext`, is
detached by the recycle, where this package's own hooks have already
unsubscribed (`LT15`).

> **Amended 2026-11-25 (CCR-QD-474).** The requirement above does not speak of a
> disposal: the provider holds one registry for its life and recycles it in place,
> and the sentences after it state what a recycle costs a host. Its earlier form
> required only that a development-mode double mount not dispose the registry.

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

## BEH-QD-516: The subject stays in the registry for the provider's lifetime

> **See:** [BEH-QD-067](#beh-qd-067-provider),
> [ADR-QD-149](../decisions/149-a-seed-is-held-by-its-question.md),
> [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)

```
REQUIREMENT: The subject, once seeded or written, MUST stay in the registry for
             the provider's lifetime, whatever gates are mounted, unmounted or
             hidden.
```

A registry removes a node nothing holds one macrotask after it is built. The
subject node is held only by the decisions that read it, so a gate under a
hidden-then-shown `<Activity>`, a gate mounted a macrotask after the provider and
a later subject change each found the subject gone and rendered `pending`, with the
question still tracked. The `subject` atom is now `Atom.keepAlive`, so the node
lasts until the provider's registry is recycled, and the recycle writes the subject
back ([BEH-QD-749](#beh-qd-749-a-recycle-writes-back-the-latest-committed-subject-before-a-consumer-reads-it)).

Source: `packages/react/src/QadiAtoms.ts` (the `subject` atom).
Tests: `packages/react/test/QadiProvider.subject.test.tsx` (SUBJ1 to SUBJ3) and the
registry-timing canary in `packages/react/test/v4-reactivity-smoke.test.ts`.

## BEH-QD-068: Hooks and components

```ts
export const useSubject: () => AuthSubject | undefined;
export const useDecision: (policy: Policy, resource?: Resource) => DecisionResult;
export const useCan: (policy: Policy, resource?: Resource) => boolean;
export const useDecisionSuspense: (policy: Policy, resource?: Resource) => ClientDecision;
export const usePolicies: (
  policies: Readonly<Record<string, Policy>>,
) => Readonly<Record<string, DecisionResult>>;
export const useQuestions: (
  questions: Readonly<Record<string, AskedQuestion>>,
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

`usePolicies` and `useQuestions` read several questions as one record, each
entry still the shared decision atom. `useQuestions` takes a policy and
optionally a resource per entry; `usePolicies` is its policy-only case.

```
REQUIREMENT: Under an `instrument`ed provider, a hook that asks several
             questions MUST register one instance per named question, kind
             `usePolicies` or `useQuestions`, each under its own id (the hook's
             `useId` and the entry's name), and MUST unregister exactly an
             instance whose name is dropped. Uninstrumented, it registers
             nothing. Each entry's state is read through `outcomeOf`
             (ADR-QD-053 amendment, ADR-QD-103).
```

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

## BEH-QD-327: A devtools feed reads the provider's own runtime

A devtools panel reads four things off an atom set: who is asking, how to
invalidate, what has been asked, and the services the decisions evaluated in.
Hosts used to wire each by hand, and the last was got wrong once: a layer *value*
built twice is two instances of every stateful service in it, so a dock that
built the application layer itself read a second, empty `decisionCacheLayer` and
reported "0 completed entries" for as long as the page stayed open
([CCR-QD-200](../README.md)). `@qadi/react` produces all four, and the last one
is the registry's own build rather than a second one.

```ts
export const runtimeLayer: (
  atoms: QadiAtoms,
  registry: AtomRegistry.AtomRegistry,
) => Layer.Layer<QadiRuntimeServices>;

export interface DevtoolsDiagnosticsFeed {
  readonly layer: Layer.Layer<QadiRuntimeServices>;
}
export interface DevtoolsFeed<Extra> {
  readonly gates: GateRegistry;
  readonly onInvalidate: () => void;
  readonly questions: () => ReadonlyArray<AskedQuestion>;
  readonly diagnostics: Extra & DevtoolsDiagnosticsFeed;
}
export const useDevtoolsFeed: <
  Extra extends { readonly [K in keyof Extra]: K extends "layer" | "questions" ? never : Extra[K] },
>(
  extra: Extra,
) => DevtoolsFeed<Extra>;
```

```
REQUIREMENT: The feed's layer MUST yield the context the provider's decisions
             evaluate in: a service built once by the atom set MUST be the same
             instance through the feed, with no second build of any service.
```

```
REQUIREMENT: The feed MUST hold that context only for the scope of the consumer
             that builds the layer, and MUST release it with that scope.
```

The runtime atom is not `keepAlive`: the layer mounts it in the provider's
registry for the building scope and nothing outlives the panel.

```
REQUIREMENT: The feed MUST NOT read decision state directly, and MUST NOT
             register a gate.
```

The context is obtained with `AtomRegistry.getResult`, an Effect, never by
inspecting an `AsyncResult` ([ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md),
[ADR-QD-093](../decisions/093-a-decision-is-read-once.md)); `gates` is the same read
`useGateInstances` makes ([ADR-QD-080](../decisions/080-a-gate-registry-belongs-to-its-atom-set.md)),
so `instrument` still governs whether any gate exists.

> **Amended 2026-11-16 (ADR-QD-162, CCR-QD-440).** `gates` is now the provider's effective
> registry (its `gates` prop, else `atoms.gates`), which the dock subscribes to, rather than
> the read `useGateInstances` makes; a host that read `feed.gates` as an array reads
> `feed.gates.instances()`. `instrument` still governs whether any guard is listed
> ([BEH-QD-585](./28-devtools-screens.md#beh-qd-585-the-dock-takes-the-registry-and-the-feed-hands-it-over)).

> **Amended 2026-11-18 (CCR-QD-447).** `questions` (`atoms.asked`) is a field of the feed beside `gates` and `onInvalidate`, no
> longer a field of `diagnostics`, because the dock reads it with the registry and not in its poll. `layer` and `questions`
> are the two fields `extra` may not set. This is **Breaking** for a host that read `feed.diagnostics.questions`
> ([BEH-QD-620](./28-devtools-screens.md#beh-qd-620-the-devtools-feed-hands-the-questions-beside-the-gates)).

```
REQUIREMENT: The fields the feed owns (`layer`, `questions`) MUST NOT be
             overridable by `extra`; a collision MUST be a compile error.
```

```
REQUIREMENT: `@qadi/devtools` MUST NOT depend on `@qadi/react` to accept the
             feed; it takes it structurally.
```

Its `DiagnosticsOptions.layer` is a `Layer<never, unknown>`, which a
`Layer<QadiRuntimeServices>` is assignable to
([ADR-QD-053](../decisions/053-a-gate-can-be-found.md)). A host with no
`QadiProvider` hands devtools a layer of its own and shares stateful services by
value, as [BEH-QD-323](./28-devtools-screens.md) says.

The context is per registry, so two providers over one atom set read two caches,
as they do decisions. Headless, over a bare registry:

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { decisionCacheLayer, DecisionCache, EvaluationServicesNone } from "@qadi/core";
import { makeQadiAtoms, runtimeLayer } from "@qadi/react";

// The cache layer is an ordinary member of the atoms' layer: nothing is hoisted.
const atoms = makeQadiAtoms(
  Layer.mergeAll(EvaluationServicesNone, decisionCacheLayer({ capacity: 8 })),
);
const registry = AtomRegistry.make();

/** The cache a panel reads through the feed's layer is the cache the atoms use. */
export const feedSeesTheAtomsCache = Effect.gen(function* () {
  const viaFeed = yield* Effect.serviceOption(DecisionCache).pipe(
    Effect.provide(runtimeLayer(atoms, registry)),
  );
  const viaAtoms = yield* AtomRegistry.getResult(
    registry,
    atoms.runtime.atom(Effect.serviceOption(DecisionCache)),
  );
  return Option.isSome(viaFeed) && Option.isSome(viaAtoms) && viaFeed.value === viaAtoms.value;
});
```

## BEH-QD-512: One atom set has one sweeper

```
REQUIREMENT: However many registries or providers share one atom set, one
             pressure episode MUST produce one sweep. StrictMode's double
             effects and a hidden then shown `<Activity>` MUST NOT add a
             sweeper.
```

The atom set coalesces the book's signals behind one pending flag held in a closure
per atom set ([INV-QD-315](../invariants.md#inv-qd-315-one-atom-set-has-one-sweeper-by-construction)),
so the number of sweepers follows the number of atom sets and not the number of
providers.

Source: `packages/react/src/SweepScheduler.ts`, `packages/react/src/QadiAtoms.ts`.
Tests: `packages/react/test/SweepScheduler.test.ts` (C2, C9),
`packages/react/test/QadiAtoms.sweep.test.ts` (S2, S9),
`packages/react/test/QadiProvider.sweep.test.tsx` (P1 to P5, which count the atom set's own
forks and sweeps through a fork handed in by the package-private `withSweepFork`).

## BEH-QD-513: A sweep runs after the pressure, never inside the call that caused it

```
REQUIREMENT: The question book MUST signal on an admission past the bound and
             on a release to zero readers while it is over the bound, and MUST
             NOT sweep inside either call.
REQUIREMENT: The sweep MUST run on a fiber that starts after the signalling call
             returns: never on the render path, and never inside the registry's
             synchronous dispose-then-reread window.
REQUIREMENT: The sweep MUST NOT use `scheduleTask` or `defaultIdleTTL`.
REQUIREMENT: A render-phase read that commits after a sweep MUST be re-admitted
             once by its commit.
```

A render reads on the render path, and a recompute disposes a reader's lifetime and
re-reads in one synchronous step, where a held question reads as zero readers. A sweep in
either would drop it. `Effect.runFork` runs synchronously to its first yield, so an
episode begins with `Effect.yieldNow`
([INV-QD-316](../invariants.md#inv-qd-316-a-sweep-never-runs-on-the-render-path-or-inside-the-dispose-then-reread-window)).
`scheduleTask` and `defaultIdleTTL` reroute dispatch and dropped a required render
([CCR-QD-150](../README.md)).

Source: `packages/react/src/QuestionBook.ts` (the signal), `packages/react/src/SweepScheduler.ts`.
Tests: `packages/react/test/QuestionBook.test.ts` (B1 to B8),
`packages/react/test/SweepScheduler.test.ts` (C1),
`packages/react/test/QadiAtoms.sweep.test.ts` (S3, S4, S7), and the four registry-timing pins in
`packages/react/test/v4-reactivity-smoke.test.ts`.

## BEH-QD-514: The provider forks no sweep, and there is no manual sweep

```
REQUIREMENT: `QadiProvider` MUST take no sweep interval and MUST fork no fiber
             for the question book.
REQUIREMENT: `QadiAtoms` MUST have no member a caller can use to run a sweep.
```

Both removals (the provider's interval prop, and the atom set's former manual sweep member) are compile errors for a caller that used them, and are recorded as breaking
in the `@qadi/react` changeset and the upgrade guide
([ADR-QD-148](../decisions/148-the-atom-set-owns-its-eviction-sweep.md)).

Source: `packages/react/src/QadiProvider.tsx`, `packages/react/src/QadiAtoms.ts`.
Tests: `packages/react/test/QadiProvider.test.tsx` ("the bound under a provider").

## BEH-QD-515: The book returns to its bound after a provider unmounts

```
REQUIREMENT: Once the readers of an unmounted provider's gates have released,
             the question book MUST return to exactly `maxTrackedQuestions`.
```

The provider's own fiber used to end with the provider, so the readers that released afterwards
were never swept and the book stayed over its bound.

Source: `packages/react/src/QuestionBook.ts`, `packages/react/src/SweepScheduler.ts`.
Tests: `packages/react/test/QadiProvider.test.tsx` ("returns to the bound after the provider unmounts").

## BEH-QD-691: Every developer signal has one row in one table

> **Invariant:** [INV-QD-387](../invariants.md#inv-qd-387-every-developer-signal-has-exactly-one-row-and-a-throwing-reporter-is-named-by-the-option-the-caller-passed)
> **See:** [ADR-QD-184](../decisions/184-developer-signal-reporters-are-resolved-through-one-table.md)

```
REQUIREMENT: Every developer signal MUST have exactly one row stating where its
             console default speaks, how often, when each entry point resolves its
             reporter and the option each entry point reports it under, and every
             reporter MUST be resolved from that row by one resolver.
```

A signal added without a row does not compile: the error is TS2741 at the table, naming
the signal. A row for no signal, a second row that speaks once per process, an entry point
a row does not name and the hydrate row given the dehydrate reporter do not compile
either, and the names a `ReporterThrew` carries are read off the table rather than kept
beside it.

Pinned by `packages/react/test/DeveloperSignals.tst.ts` ("the table has one row per
developer signal, written out", "a table missing a row is refused", "only
InstrumentedInProduction may speak once per process", "ReporterName is every option an
entry point reports under, written out", "a row refuses an entry point it does not name",
"the hydrate row refuses the dehydrate reporter", "only a row with a condition is asked
whether it holds"). What the types do not state, each row's condition and when each entry
point resolves, is held by the tests of BEH-QD-693 and BEH-QD-695, and the table describe
of `packages/react/test/DeveloperSignals.test.ts` ("agrees with a written-out statement of
it, row by row") compares the table with one written out in the test, which detects a row
changed without review and says nothing of when a reporter is resolved.

## BEH-QD-693: Each console default speaks under the condition its row states

> **Invariant:** [INV-QD-387](../invariants.md#inv-qd-387-every-developer-signal-has-exactly-one-row-and-a-throwing-reporter-is-named-by-the-option-the-caller-passed)
> **See:** [ADR-QD-184](../decisions/184-developer-signal-reporters-are-resolved-through-one-table.md)

```
REQUIREMENT: A signal's console default MUST speak under the condition its row
             states: in development for a superseded seed, a gate id collision, a
             dehydration drop, a hydration drop, a replaced `atoms` prop and an
             unwritable gate registry; in production for instrumentation in a
             production bundle; and in every environment for a reporter that threw.
             A supplied reporter MUST replace the default outright, MUST be called
             in every environment and MUST leave the console unwritten.
```

A host that routes signals to telemetry does not also want them on the console, and one
that does can call `console.warn` itself. A reporter that threw is announced in every
environment because the host replaced the default and nothing else will say it.

Pinned by the "when the default speaks" describe of `packages/react/test/DeveloperSignals.test.ts`
("the four hydration defaults are absent in production, and a supplied reporter replaces
them", "the two development-only provider signals are silent in production", "a supplied
provider reporter replaces the default and hears every signal"), by its describe "a
supplied reporter that throws (ReporterThrew, INT-04)", and by the characterisation
`packages/react/test/DeveloperSignalReporters.test.tsx`, which reaches every row through its
public entry point in both environments ("a superseded seed with no reporter says nothing
in production", "a returning onHydrationMismatch is told the mismatch once in production,
and nothing is written to the console", "an instrumented provider in development with no
reporter writes nothing to the console"). The row's condition is read by one function,
`holdsHere`, which the provider also asks of `InstrumentedInProduction`'s row, so the
provider has no environment check of its own: "a row's condition holds in the environment
it names and in no other" and "InstrumentedInProduction's default is silent in development,
whoever asks" pin it, and a row changed to speak everywhere fails them and the provider
tests. No type checks which condition a row states.

## BEH-QD-694: The production-instrumentation line is printed once per process

> **Invariant:** [INV-QD-388](../invariants.md#inv-qd-388-the-library-holds-one-rebindable-module-scope-binding-the-production-instrumentation-latch), [INV-QD-387](../invariants.md#inv-qd-387-every-developer-signal-has-exactly-one-row-and-a-throwing-reporter-is-named-by-the-option-the-caller-passed)
> **See:** [ADR-QD-184](../decisions/184-developer-signal-reporters-are-resolved-through-one-table.md)

```
REQUIREMENT: With no reporter supplied, an instrumented provider outside development
             MUST print the production-instrumentation line once per process,
             however many providers mount. A supplied `onDeveloperSignal` MUST
             bypass that latch and be told once per mount.
```

The point of the default is one line per bundle, and an atom set or a provider is narrower
than a process, so the latch is the one rebindable module-scope binding in library source,
counted by `MODULE_STATE_BUDGET` in `scripts/check-house-style.mjs`. It is process-wide on
purpose, and it holds whether the line has been printed and nothing else.

Pinned by `packages/react/test/QadiProvider.production.test.tsx` ("warns once when
instrument is true outside development (ticket 153)", which mounts a second instrumented
provider and sees no second line) and `packages/react/test/QadiProvider.signals.test.tsx`
("is told InstrumentedInProduction once per mount, and the console stays quiet").

## BEH-QD-701: A guard's wanted registration is keyed by its gate id

> **Invariant:** [INV-QD-391](../invariants.md#inv-qd-391-gate-registration-is-reconciled-in-one-step-keyed-by-gate-id)
> **See:** [ADR-QD-186](../decisions/186-gate-registration-is-one-keyed-reconcile.md)

```
REQUIREMENT: A guard MUST hand the writer its registrations as one map from gate id
             to wanted identity and render state. The identity MUST NOT carry the id
             it is keyed by.
```

The key is the id, so a key and an id cannot disagree and two entries cannot share one.
The compiler refuses an array for the wanted map and an `id` on the identity, and it holds
the fields of `GateIdentity`, `GateWanted` and `Registered` to exactly the ones the step
reads. What the step does with the map, its order and its rules, is held by tests only.

Pinned by `packages/react/test/GateWriter.reconcile.tst.ts` ("reconcile takes the wanted
registrations keyed by gate id", "an array of wanted registrations is refused", "a
GateIdentity literal with an id is refused", "GateIdentity, GateWanted and Registered hold
exactly their fields") and `packages/react/test/GateWriter.reconcile.test.ts` ("registers
every wanted entry in map order, with its identity and its state").

## BEH-QD-702: One step registers, updates and unregisters

> **Invariant:** [INV-QD-391](../invariants.md#inv-qd-391-gate-registration-is-reconciled-in-one-step-keyed-by-gate-id)
> **See:** [ADR-QD-186](../decisions/186-gate-registration-is-one-keyed-reconcile.md)

```
REQUIREMENT: One step MUST keep each live registration whose wanted entry under the
             same id has the same kind, atom, wraps and marker, and MUST tell its
             handle the wanted state. It MUST unregister every other live
             registration, and then register each wanted entry that was not kept. The
             step MUST NOT mutate the live registrations it is handed. A writer's
             `register` and a handle's `update` and `unregister` MUST NOT throw, and
             the step handles no throw of its own.
```

Unregistering runs before registering, so a changed identity registers again under its own
id without colliding with itself. A changed policy or resource alone keeps the entry,
because the atom changes with the question, and its handle is told the new state. The
step's rules and its call order are held by tests only: no type states them.

A writer's `register` and a handle's `update` and `unregister` do not throw, and
`reconcile` relies on that and handles no throw of its own: a writer that breaks it
propagates the throw part-way, with the steps before it applied. `reconcile` never
mutates `live` and returns a new `Map`. The registry this package builds keeps the
contract ([ADR-QD-186](../decisions/186-gate-registration-is-one-keyed-reconcile.md)
decision 6) and tests hold that; that `reconcile` adds no handler of its own is kept by
review and not by a test or a gate.

Pinned by `packages/react/test/GateWriter.reconcile.test.ts` ("tells the handle of a kept
entry the wanted state", "keeps the entry when only the policy or the resource changed",
"re-registers when only atom, kind, wraps or marker changed, updating its sibling",
"unregisters a dropped id and registers nothing", "calls each live update or unregister in
order, then each registration", "returns a fresh map and does not mutate the live map it
is given", "on a real registry a changed identity keeps its id and reports no collision")
and, for the registry's side of the contract,
`packages/react/test/GateRegistry.store.test.ts` ("a listener that throws makes none of
register, update or unregister throw" and the four collision-reporter tests that throw
through `makeGateRegistry` and `makeQadiAtoms`, each of which registers the colliding id
after the reporter threw and lists both ids: "a throwing onIdCollision on makeGateRegistry
is named onIdCollision in development", "a throwing onIdCollision on makeGateRegistry is
named onIdCollision in production", "a throwing onGateIdCollision on makeQadiAtoms is
named onGateIdCollision in development", "a throwing onGateIdCollision on makeQadiAtoms is
named onGateIdCollision in production").

## BEH-QD-703: A state change notifies once, and an unchanged commit not at all

> **Invariant:** [INV-QD-391](../invariants.md#inv-qd-391-gate-registration-is-reconciled-in-one-step-keyed-by-gate-id)
> **See:** [ADR-QD-186](../decisions/186-gate-registration-is-one-keyed-reconcile.md)

```
REQUIREMENT: A registered guard whose render state changes MUST notify the registry
             once and keep its id. A commit that changes neither state nor identity
             MUST notify nothing. Whether a state changed MUST be decided by the
             registry's handle alone.
```

The hook calls `update` on every kept handle after every commit and compares nothing; the
handle owns the equal-state rule, so an unchanged state is a no-op there and a changed one
is one notification. A re-render with a fresh but equal policy and resource therefore
notifies nothing. That no other module diffs states is kept by review and not by a test or
a gate.

Pinned by `packages/react/test/GateRegistration.characterisation.test.tsx` ("a held
decision settling updates the entry in place: one notification, same id", "a re-render with
a fresh equal policy and resource notifies nothing"), `packages/react/test/GateWriter.test.tsx`
("a state change updates in place: one notification, the same id", "an unchanged state
makes no notification and keeps the id"), `packages/react/test/GateWriter.reconcile.test.ts`
("reconciling the same input twice keeps every entry and calls only update", "on a real
registry a kept entry notifies once for a new state and not for the same") and
`packages/react/test/GateRegistry.store.test.ts` ("does not notify for an unchanged state").

## BEH-QD-704: Registrations end when the guard unmounts or its writer changes

> **Invariant:** [INV-QD-392](../invariants.md#inv-qd-392-the-registration-hook-keeps-nothing-between-commits-but-its-registrations)
> **See:** [ADR-QD-186](../decisions/186-gate-registration-is-one-keyed-reconcile.md)

```
REQUIREMENT: Every registration of a guard MUST end when the guard unmounts or its
             writer changes. Under StrictMode a guard MUST be registered once.
```

The teardown is keyed on the writer, so it runs on unmount and when the writer changes
and not before every commit; a guard with no writer registers nothing, which is how
instrumentation off leaves no registration and no marker. The registration effect, which
runs after every commit, has no cleanup of its own, because a cleanup would also run before
each commit and end a registration that should outlive it.

Pinned by `packages/react/test/GateRegistration.characterisation.test.tsx` ("unmounting
unregisters with one notification and leaves nothing", "under StrictMode a guard registers
once and a changed policy re-registers once", "unmounting a grouped hook unregisters every
entry", "a changed gates prop moves every entry to the new registry, keeping its id",
"turning instrumentation off unregisters every entry and registers nothing") and
`packages/react/test/GateWriter.test.tsx` ("the writer going undefined unregisters",
"unmount unregisters").

## BEH-QD-705: A grouped hook registers each question by its key, in any order

> **Invariant:** [INV-QD-391](../invariants.md#inv-qd-391-gate-registration-is-reconciled-in-one-step-keyed-by-gate-id), [INV-QD-392](../invariants.md#inv-qd-392-the-registration-hook-keeps-nothing-between-commits-but-its-registrations)
> **See:** [ADR-QD-186](../decisions/186-gate-registration-is-one-keyed-reconcile.md)

```
REQUIREMENT: A grouped hook MUST register one entry per question, keyed by the
             question's name. Adding, removing or changing one question MUST touch
             that entry alone, and reordering the questions MUST change nothing.
```

Each entry is keyed by its own id, the hook's id followed by `/` and the name, built from
the same pass that reads the question, so the order of the record's keys is not a pairing
anyone has to keep. Reordering notifies nothing and leaves the registration order as it
was.

Pinned by `packages/react/test/GateRegistration.characterisation.test.tsx` ("usePolicies
registers one entry per name, in key order, under the id of the hook", "adding a key
registers that entry alone", "removing a key unregisters that entry alone and keeps its
sibling", "reordering the keys notifies nothing and keeps the registration order", "an
equal record rebuilt each render notifies nothing", "a changed resource in useQuestions
re-registers that entry alone").

## BEH-QD-740: `QadiContextValue` is the atoms, the registry and the gates, and instrumentation is the provider's prop

> **Decision:** [ADR-QD-193](../decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md)
> **See:** [ADR-QD-111](../decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md)

```
REQUIREMENT: `QadiContextValue` MUST have the members `atoms`, `registry` and `gates`, and no other, and a
             toggle of the provider's `instrument` prop MUST hand a consumer of the context no new value.
REQUIREMENT: Instrumentation MUST stay the provider's `instrument` prop: a guard MUST register when it is
             turned on and MUST unregister when it is turned off.
```

Whether a guard registers is decided by the writer the provider resolves once from `instrument` and hands through
`GateScopeContext`, which stays off the public value on purpose
([ADR-QD-111](../decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md)), so the field the value once held
for it was read by nothing. The value is memoised on `[atoms, registry, gates]`. A host that wants to know whether it
instrumented reads the value it passed.

Pinned by `packages/react/test/QadiProvider.tst.ts` ("the context value is the atoms, the registry and the gates"; "a
consumer reads the gates from the context, and instrumentation is not a field of it") and
`packages/react/test/InstrumentToggle.characterisation.test.tsx` ("a memoised consumer of the context does not render
again when instrument is toggled"; "a Can registers when instrument is turned on and unregisters when it is turned
off"). Specified in ADR-QD-193 (CCR-QD-472).

## BEH-QD-746: A provider hidden longer than a macrotask and shown again throws nothing and renders the client's decision

> **Invariant:** [INV-QD-409](../invariants.md#inv-qd-409-no-consumer-reaches-an-unusable-registry)
> **Decision:** [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)
> **See:** [BEH-QD-747](#beh-qd-747-a-provider-holds-one-registry-for-its-life), [BEH-QD-748](#beh-qd-748-a-providers-registry-is-released-once-a-macrotask-after-its-last-release-unless-held-first)

```
REQUIREMENT: A provider whose subtree an `<Activity>` hides for longer than one
             macrotask and shows again MUST throw nothing, neither from a consumer's
             subscription nor from the provider's own effects, and MUST render the
             decision the client reaches.
```

React runs every effect cleanup under a hidden `<Activity>` and, on the reveal, every setup again with the last
committed closure and no render, so a consumer subscribes again before the provider's own effects run. A registry
disposed in the meantime would answer that first subscription with `registry is disposed`. The provider's registry
stays usable, so the gate under a hidden-then-shown provider renders its decision, the subject probe reads the
`subject` prop, an invalidation or a devtools feed after the reveal re-evaluates, and a StrictMode double effect
followed by a long hide is survived.

Pinned by `packages/react/test/QadiProvider.lifetime.test.tsx` ("LT1 a provider hidden past a macrotask and shown
again throws nothing and renders the decision", "LT2 an invalidation after a long hide re-evaluates without
throwing", "LT3 a devtools feed consumer survives a long hide", "LT4 under StrictMode the double effect recycles
nothing and a long hide is survived", "LT6 a subject changed while hidden is the one the revealed provider answers
with"). Specified in [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md) (CCR-QD-474).

## BEH-QD-747: A provider holds one registry for its life

> **Invariant:** [INV-QD-410](../invariants.md#inv-qd-410-a-provider-holds-exactly-one-registry-for-its-life)
> **Decision:** [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)
> **See:** [BEH-QD-746](#beh-qd-746-a-provider-hidden-longer-than-a-macrotask-and-shown-again-throws-nothing-and-renders-the-clients-decision), [BEH-QD-067](#beh-qd-067-provider)

```
REQUIREMENT: A provider MUST build one registry, in render, and keep it for its life.
             It MUST NOT build another for a re-render, a hide or a change of the
             `atoms` prop, and a change of `atoms` MUST still be reported as
             `AtomsReplaced`.
```

The registry is built in render, so a server render and the first client render have the subject with no pending
frame. Nothing clears it: a re-render between a hide and a reveal reads the registry the first render built, which
keeps every cached decision, and the context hands every consumer the same object for as long as the provider
lives. A changed `atoms` prop keeps the registry and signals `AtomsReplaced` once; the atom set the earlier registry
holds stays cached until the registry is recycled.

Pinned by `packages/react/test/QadiProvider.lifetime.test.tsx` ("LT4 under StrictMode the double effect recycles
nothing and a long hide is survived", "LT5 a hide shorter than a macrotask recycles nothing", "LT6 a subject changed
while hidden is the one the revealed provider answers with", "LT7 a re-render while hidden past the release keeps
one registry", "LT8 an atoms swap while hidden keeps the registry and is reported once", "LT13 a reveal committed
with a re-render reads the subject in its first frame"), each of which counts the distinct registries its consumers
were handed. Specified in [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md) (CCR-QD-474).

## BEH-QD-748: A provider's registry is released once, a macrotask after its last release, unless held first

> **Invariant:** [INV-QD-409](../invariants.md#inv-qd-409-no-consumer-reaches-an-unusable-registry)
> **Decision:** [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)
> **See:** [BEH-QD-746](#beh-qd-746-a-provider-hidden-longer-than-a-macrotask-and-shown-again-throws-nothing-and-renders-the-clients-decision), [BEH-QD-749](#beh-qd-749-a-recycle-writes-back-the-latest-committed-subject-before-a-consumer-reads-it)

```
REQUIREMENT: A provider MUST recycle its registry once for each release that a hold
             did not cancel, one macrotask after that release, and MUST NOT recycle
             it for a release a hold followed within that macrotask. A recycle MUST
             leave the registry usable.
```

The decision is `RegistryLease.ts`'s and nothing else's: the provider holds the lease in an effect and releases it in
the cleanup, because React gives no sign whether a cleanup is a StrictMode double effect, a hide or an unmount. A hold
inside the macrotask cancels the pending recycle, a second release while one is pending defers nothing more, and a
release on a lease that was never held defers nothing. A recycle that throws leaves the lease usable, and a deferral
that throws leaves it held. The recycle is `registry.reset()`, never `dispose()`, so a read that straggles in after
the release recreates a node nothing holds, which idle removal takes a macrotask later, instead of throwing. After a
true unmount a `keepAlive` host atom read through the registry the provider handed out reads its declared default.

Pinned by `packages/react/test/RegistryLease.test.ts` (RL1 to RL10: "RL1 a hold, a release and a hold in one tick
recycle nothing" through "RL10 a hold after a second release still cancels the one pending recycle", with RL9 on the
default deferral and a real macrotask), `packages/react/test/QadiProvider.lifetime.test.tsx` ("LT5 a hide shorter
than a macrotask recycles nothing", "LT14 a read straggling after an unmount throws nothing and leaves no node") and
`packages/react/test/edges.test.tsx` ("releases its registry after it unmounts"). Specified in [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md) (CCR-QD-474).

## BEH-QD-749: A recycle writes back the latest committed subject before a consumer reads it

> **Decision:** [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)
> **See:** [BEH-QD-516](#beh-qd-516-the-subject-stays-in-the-registry-for-the-providers-lifetime), [BEH-QD-748](#beh-qd-748-a-providers-registry-is-released-once-a-macrotask-after-its-last-release-unless-held-first)

```
REQUIREMENT: A recycle MUST write back the subject of the provider's latest commit,
             in the same step as the reset, and MUST NOT write one read during a
             render, or the one the first closure held.
```

`reset()` clears the `keepAlive` subject node with the rest, so the recycle writes the subject again with the same
public call the provider's subject effect makes. The subject and the atom set are held in a ref the provider writes in
an effect on `[atoms, subject]`, so a render React discarded never reaches it, and with an `atoms` change the ref holds
the current atom set's `subject` atom. A consumer that subscribes on the reveal therefore reads the subject the last
commit held, including one that changed while the tree was hidden.

Pinned by `packages/react/test/QadiProvider.lifetime.test.tsx` ("LT6 a subject changed while hidden is the one the
revealed provider answers with", "LT13 a reveal committed with a re-render reads the subject in its first frame").
Specified in [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md) (CCR-QD-474).

## BEH-QD-750: A recycle re-applies neither `initialValues` nor a hydration seed

> **Decision:** [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md)
> **See:** [BEH-QD-067](#beh-qd-067-provider), [ADR-QD-149](../decisions/149-a-seed-is-held-by-its-question.md), [ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md)

```
REQUIREMENT: A recycle MUST NOT re-apply the provider's `initialValues`, and MUST NOT
             re-apply a hydration seed. After it a gate whose question the client
             has not answered MUST render `Pending`, and then the client's own
             answer.
```

`initialValues` seeds construction only. In this package it is `hydrateDecisions`' output, the seed grants of
[ADR-QD-149](../decisions/149-a-seed-is-held-by-its-question.md), and a seed is not an authority
([ADR-QD-039](../decisions/039-a-seed-is-not-an-authority.md)): writing a server's allow back after a hide would show
it again while the client re-evaluates, and a client that had since answered with a denial would render the
superseded allow. The losses are recorded, each one fail-closed:

- a seeded gate whose resolver never answers renders `Pending` after a long hide, never the seed;
- with `subject={undefined}` a seeded gate stays `Pending` after a long hide until a subject arrives;
- a long hide with a re-render, where the client had replaced the seeded allow with its own denial, renders `Pending`
  and then the denial and reports one hydration mismatch, where it painted the superseded allow and reported a second;
- any other host atom in `initialValues` reads its declared default, and a subscription a host holds directly on the
  registry (`registry.subscribe`, `mount`) across a long hide is detached by the recycle, while this package's own
  hooks have already unsubscribed.

An answered question never re-reads its seed, so the loss is the unanswered one only.

Pinned by `packages/react/test/QadiProvider.lifetime.test.tsx` ("LT9 a seeded allow the client never answers is not
shown again after a long hide", "LT10 a seeded allow with no subject stays pending after a long hide", "LT11 a long
hide with a re-render shows no superseded allow and reports one mismatch", "LT15 a host subscription held across a
long hide is detached by the recycle") and `packages/react/test/edges.test.tsx` ("releases its registry after it
unmounts"). Specified in [ADR-QD-195](../decisions/195-a-providers-registry-has-one-owner-for-its-lifetime.md) (CCR-QD-474).

---

_Previous: [08 — Serialization](./08-serialization.md) | Next: [10 — The Action Dimension](./10-actions.md)_
