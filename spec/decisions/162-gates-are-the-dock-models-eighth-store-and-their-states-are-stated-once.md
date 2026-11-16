# ADR-QD-162 — Gates are the dock model's eighth store, and their states are stated once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-162                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-11-16                                     |
> | Status         | Accepted — amends ADR-QD-047; applies ADR-QD-152; keeps ADR-QD-053, ADR-QD-080 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-11-16): decision 5: the same failure is compared by name and message, not by the stack its reason renders (review iteration 2 IN-02)<br>1.2 (2026-11-16): decision 5: releasing the old registry's subscription is guarded and stated, never repeated (review iteration 2 WR-01)<br>1.1 (2026-11-16): decision 5: a registry that throws is stated as GatesView.Failed and its rows make no claim; the first version's rationale was false for react's own registry (review WR-01)<br>1.0 (2026-11-16): Initial release (ARCH-96, CCR-QD-440) |

---

## Context

Two defects sat in the same place, the question panel's list of who is asking.

The five words a guard reports it rendered (`Failed`, `Denied`, `Rechecking`, `Pending`, `Allowed`) were written twice, in two
packages that cannot see each other: `@qadi/react` derived `GateRenderState` from `DecisionOutcome`'s tags, and `@qadi/devtools`
restated the union privately for its display table. Nothing tied the two, so a sixth outcome in react compiled and was
shown as `Unrecognised`.

And the join of the polled questions with the live guards was made in the view. `DevtoolsDock` passed a plain `gates` array
straight to `QuestionsPanel`, which paired each question with the guards asking it at render time, from two sources read at two
moments. It was testable only by rendering, and it was the one piece of the dock's state the dock model did not own.

The ADR check made before any code was written read five records against the design, and their text is quoted here as it was
read. The passages are quoted from the files at the phase base (`76330fbd`).

ADR-QD-047 (`spec/decisions/047-a-headless-devtools-model.md:396-400`, the 2026-11-12 amendment, CCR-QD-425):

> **Amended 2026-11-12 (CCR-QD-425): diagnostics are the dock model's seventh store.** The
> dock forked its diagnostics poll from a React effect through `useRunningStore`, with a
> hand-written dependency list, and merged the supplied reading in a `useMemo`. It was the
> one place the dock still broke the 2026-11-11 amendment's "one owned-model hook, and it
> forks nothing", and it had a defect the rest did not:

and (`:470-471`, the 2026-11-12 amendment, CCR-QD-427):

> - **`DockModel.timelineStatus` is the eighth readout.** It is the feed's own status and
>   restart, not merged with anything.

ADR-QD-053 (`spec/decisions/053-a-gate-can-be-found.md:160-164`, a correction):

> **Correction.** This paragraph previously went on to say present-tense "and
> it is `@qadi/devtools`, a DOM package already, that subscribes." `@qadi/devtools`
> has no dependency on `@qadi/react` — `GateRegistry.ts` lives in `@qadi/react` —
> and `DevtoolsDock.tsx` takes `gates` as a plain, one-shot prop, not a
> subscription.

and (`:221-223`, the 2026-10-08 amendment, CCR-QD-240):

> reads off an atom set. `useDevtoolsFeed(extra)` returns `gates` (the provider's
> effective registry, read through `useGateInstances`), `onInvalidate`, and a
> `diagnostics` whose `layer` is the registry's own built runtime context and whose

and (`:231-232`):

> whether any gate exists, and `@qadi/devtools` takes all of it structurally with no
> dependency on `@qadi/react`, because `DiagnosticsDockOptions.layer` is a

ADR-QD-080 (`spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md:86-88`):

> **Both AGENTS.md §13 rules still hold, and are checked.** Decisions are not in React
> state: a registry holds who is asking and what each guard rendered, never a verdict
> (ADR-QD-017), and `useGateInstances()` puts guard *instances* into a host's render,

ADR-QD-137 (`spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md:56-59`):

> 1. **A session is constructed in a scope.**
>    `makeSimulationSession: (init?) => Effect<SimulationSession, never, Scope.Scope>`.
>    The session builds one `effect/FiberHandle` and the runtime that forks into it, and
>    registers a finalizer on the scope.

ADR-QD-152 (`spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md:48-51`):

> 3. **The guard, the list and the meaning are read off it.** `isHydrationDropReason` tests an own
>    key with `Object.hasOwn`, so an inherited name such as `toString` is not a reason.
>    `hydrationDropReasons` is `Object.keys` of the table narrowed by that guard, so it needs no cast
>    and keeps declaration order.

The verdicts. ADR-QD-047 forbids a screen of the dock owning a store, a fork or a subscription outside the model; it does not
forbid the model taking one more input and one more store and subscribing to that input inside its own scope, and its
amendments count the stores on that footing. ADR-QD-053 forbids `@qadi/devtools` depending on `@qadi/react`, a registry type
only `@qadi/react` can name, and the feed reading a decision or writing a gate; it does not forbid the model subscribing to a
structural registry, and its two wiring sentences ("a plain, one-shot prop, not a subscription" and `gates` "read through
`useGateInstances`") describe the wiring this change replaces, so they become history. ADR-QD-080 forbids a registry holding a
verdict; the registry still holds none. ADR-QD-137 is this change's lifetime rule: a subscription is taken in a scope and
released by its finalizer. ADR-QD-152 is the shape of the vocabulary. No record forbids the design.

## Decision

1. **The five states are one module-private table in core** (D-01, D-02, D-03, D-04, D-05, D-07), applying ADR-QD-152.
   `@qadi/core`'s `GateState.ts` holds the keyed table; `GateState` is its keys, `isGateState` tests an own key and
   `gateStates` is the keys in declaration order, worst news first, with no cast. The rows are empty, because the display
   words (`Error`, `Deny`, `Allow`) are devtools' vocabulary and nothing else about a state is generic. `@qadi/react`'s
   `GateRenderState` is `GateState`, and `DecisionOutcome.tst.ts` pins `DecisionOutcome["_tag"]` equal to it both ways, so a
   sixth outcome in either place fails to compile. `@qadi/devtools` keys its private `GATE_DISPLAY` by `GateState` and reads
   `gateStates` and `isGateState`; `GateInstanceLike.state` stays `string`, so a word from a newer react is shown as
   `Unrecognised`, never dropped and never as an answer.
2. **The registry is a model input, and the model joins at one moment** (D-08, D-10, D-14). `DockModelInputs.gates` is
   `GateRegistryLike`, a structural `{ instances, subscribe }` that react's `GateRegistry` satisfies without devtools
   importing it. The model subscribes in its own scope (ADR-QD-137), releases the subscription with a finalizer, and its
   `questions` store joins the polled questions with `instances()` in one synchronous step, whichever of the two moved,
   keeping its reference when nothing moved. The join is `joinQuestions` in `model/Gates.ts`; the panel renders one
   snapshot and calls neither `gateGroups` nor `instancesAsking`.
3. **The dock's `gates` prop takes the registry only, and the feed hands it over** (D-09, D-18). `DevtoolsDock`'s `gates` is
   `GateRegistryLike`, with no array-or-registry union, and `useDevtoolsFeed()` returns the provider's effective registry as
   `gates` (its `gates` prop, else `atoms.gates`), so `<DevtoolsDock {...feed} />` is unchanged. Both are **Breaking**: for
   `@qadi/devtools` a host that passed `useGateInstances()` passes the registry, and for `@qadi/react` code that read
   `feed.gates` as an array reads `feed.gates.instances()`.
4. **The count is stated once** (D-11, D-19). The dock model had seven stores before this change (the timeline, the dock
   session, the explorer, the role choice, the simulation, the diagnostics and the timeline status), and `questions` is the
   eighth. `sightings` is a thunk the model reads, not a store. ADR-QD-047's 2026-11-12 amendments and BEH-QD-506 counted
   differently, because they counted the policy rail among the stores, so diagnostics was "the seventh store" and the timeline
   status "the eighth readout" there. Those anchors keep their titles, and the header of `DockModel.ts`
   states the count this record does.
5. **A registry that throws is stated, and its rows make no claim** (review finding WR-01). The registry is host code, and the
   model reads it on four paths: the build, `configure`, a registry notification and a poll tick. The first version left a
   throw uncaught, on the argument that a caught error would show an empty panel with nothing said and the host would see its own
   throw. That is false on the paths that matter. `@qadi/react`'s `makeGateRegistry.changed()` runs each listener in a
   try/catch and swallows it, so a throw in a notification froze the questions store on its last snapshot with nothing said. A
   poll tick runs inside the poll fiber, where the throw ended the poll. A throw while building came out of the host's layout
   effect and unmounted its tree. A `configure` that threw after `inputs = next` left the model half applied. So the read is
   guarded, and the choice made is stating the failure rather than hiding it: a throw from `instances()` or from `subscribe`
   becomes `GatesView.Failed({ reason })`, where `reason` is `Cause.pretty` of the throw, as `DiagnosticsStatus.Stopped` and
   `WiringRead.Failed` carry theirs, and the panel renders it as `qadi-gates-failed` the way `ServicesPanel` renders
   `qadi-wiring-failed`. While the view is `Failed` each row's `asking` is `undefined`, which is no claim. It is not an empty
   list, because that prints "asked, nothing mounted" about a registry nobody could read. It is not the last good listing either,
   because those guards may be gone. The lens is given no guards. The view recovers when the registry reads again and announces
   it, or when `configure` hands over another registry. Releasing the old registry's subscription is guarded the same way (review iteration 2, WR-01): the handle leaves the model's
   state before it is called, so a throw can neither skip the new subscription and the re-join nor run again on the next
   `configure` or in the finalizer. It is stated as `Failed` with its reason, which names the registry that was left; a failed
   `subscribe` of the new registry is stated over it, because that one names the registry the model now reads. The old
   registry's listener may stay live in the host's registry. It only calls `rejoin`, which reads the registry the model holds now.
   A finalizer that cannot release has nowhere to state it, and swallows the throw after the model is marked closed.
   Two failures are the same when an error's name and message agree (a thrown value that is not an error, when its rendered
   reason does): the stack `Cause.pretty` renders differs by which path read the registry, and would otherwise publish a new
   snapshot for a failure no reader could tell apart (review iteration 2, IN-02). The reason shown keeps its stack, as
   `DiagnosticsStatus.Stopped` does.
   After close the model reads no registry at all, so a late `configure` runs none of the host's code.

## Consequences

- **One copy edit in the browser** (D-12a, a user decision during the UI contract). The gates-absent message's advice changed
  from "Pass gates — usually useGateInstances(), or atoms.gates.instances() — to list who is asking." to
  "Pass gates — usually atoms.gates, from @qadi/react — to list who is asking.", because the old advice no longer type-checks once `gates` takes the
  registry. The two literals of the characterisation and the one assertion in `QuestionsPanel.gates.test.tsx` moved in the
  same commit; every other string is byte-identical.
- **Two react test edits are the only ones the suite takes** (D-16): the pin in `DecisionOutcome.tst.ts` and the two
  assertions in `DevtoolsFeed.test.tsx` (`:176` and `:188`) that read the feed's `gates` as an array. Every other react test
  passes untouched.
- **Browser behaviour is otherwise unchanged**: the characterisation, written on the base before any source edit, held its
  twelve cells with only the copy edit's two literals moving. Instrumentation off still renders and registers nothing; a hide
  and a show of the dock still rebuilds the model, and with it the subscription.
- **A host no longer re-renders on every guard change to feed the dock**: the host hands over the registry once, and the dock
  subscribes to it. `useGateInstances` is unchanged for a component that wants the list itself.
- **Breaking for `@qadi/react` and `@qadi/devtools`**, recorded in two changesets marked **Breaking** and in the 0.13 entry of
  the upgrade guide; `@qadi/core` gains `GateState`, `gateStates` and `isGateState`, a minor with no break.
- **One more string, for a state that did not exist before** (decision 5): "The registry handed to the dock threw when it was
  read, so who is asking cannot be shown: {reason}", under `qadi-gates-failed`. It appears only when a registry throws.
- **A sixth gate state is a compile error** in react (the pin) and devtools (`GATE_DISPLAY`'s key type), and not before.
- **What this does not do** (D-06): `GateInstanceLike.kind` stays `string`, so a kind react gains still reaches the panel as
  itself; stating the kinds once is deferred. `sightings` stays a thunk.
- ADR-QD-047 is amended in a dated section and ADR-QD-053 carries a dated note; ADR-QD-053's decision, that devtools takes the
  registry structurally with no dependency on `@qadi/react`, is kept, not reversed.

## Related

- [ADR-QD-047](./047-a-headless-devtools-model.md), whose store count this states once
- [ADR-QD-053](./053-a-gate-can-be-found.md), whose two wiring sentences are now history and whose decision stands
- [ADR-QD-080](./080-a-gate-registry-belongs-to-its-atom-set.md), whose "never a verdict" the registry still keeps
- [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md), whose scoped construction the subscription follows
- [ADR-QD-152](./152-each-hydration-drop-reason-is-stated-once-with-its-kind.md), whose table shape the vocabulary applies
- ARCH-96, CCR-QD-440
