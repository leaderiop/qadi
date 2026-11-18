# ADR-QD-169 — The questions panel's two host inputs are one feed

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-169                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-18                                     |
> | Status         | Accepted — amends ADR-QD-047; applies ADR-QD-137; keeps ADR-QD-162, ADR-QD-150 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-18): Initial release (ARCH-103, CCR-QD-447) |

---

## Context

The Questions tab reads two things a host hands the dock: a registry of live guards (`gates`) and a thunk of the questions
asked (`questions`). They reached the model by two different routes. The registry watch lived in `DockModel` as eight mutable
bindings (the registry, its release, its failure, two failure keys and the rest) beside `reasonOf` and `keyOf`, and the
questions thunk was a field of `DiagnosticsDockOptions`, sampled by the diagnostics poll.

The two routes had two failure policies. A registry that throws became `GatesView.Failed`, stated in the panel
([ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md), decision 5), and the poll
kept running. A thunk that throws was a defect in the poll's sample, which ended the whole poll: wiring, activity and calls
froze on every tab with one status word, `Stopped`, and the questions panel said nothing about its own input.

The owner decided (D-01) that one feed owns both inputs, taking the complete design over the simple one and accepting a
**Breaking** change for `@qadi/devtools` and `@qadi/react`.

## Decision

1. **`GatesFeed.ts` is one package-private module** (ADR-QD-099), out of both barrels. `makeGatesFeed` is an
   `Effect.fn("qadi.devtools.makeGatesFeed")` built in the model's scope, so closing the scope releases the subscription and
   interrupts the cadence (applies [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md)). Its cadence is a
   `makeSupersedingRun`, so a newer thunk or interval replaces the older run and a closed feed never ticks (keeps
   [ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md)).
2. **The snapshot is `{ registry: RegistryRead, asked: AskedRead }`**, each a closed tagged enum: `RegistryRead` is
   `Unwatched | Read | Failed` and `AskedRead` is `Unhanded | Read | Failed`. Both halves travel in one value, so no reader
   sees one without the other.
3. **One failure policy, with a private key.** Nothing the host throws leaves the feed: a throw from `instances`, `subscribe`
   or the thunk (or from comparing its answer) is a `Failed { reason }` in the snapshot. Two throws compare by a key (an
   error's name and message, else its rendering), private to the feed, so one failure that arrives by two paths publishes
   once.
4. **The thunk is read at the build, on `configure` and every `intervalMillis`** (default
   `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`), and each answer is compared with `Equal.equals` inside the same `try`, because
   `asked()` returns a fresh array on every call and has no change signal (D-04 as amended by the research). An answer equal
   to the last publishes nothing; the previous `Read` keeps its reference.
5. **The registry rules of ADR-QD-162 Rev 1.2 to 1.5 are kept as they were**: a registry that throws is stated; a later
   `configure` subscribes again after a failed watch or for another registry, and not for the same one after a watch that
   worked; a release that throws is called once and not stated; a closed feed reads and subscribes to nothing. They moved
   with the code and changed in no word.
6. **`QuestionsView.Failed { reason }` is new**, which the panel prints under `qadi-questions-failed` as one sentence and
   the reason, with no rows. `JoinInput` carries the questions' failure beside the registry's, independently.
7. **`DockModel`'s join is pure** over the feed's snapshot, the supplied reading's questions and the poll's status, and
   `configure` reconfigures the feed before it re-merges the reading, so one `configure` publishes one snapshot. The model
   keeps its closed flag and its last join and holds no gate-watch state beyond them.
8. **`questions` is a dock input**: `DockModelInputs.questions` and `DevtoolsDockProps.questions`. It is gone from
   `DiagnosticsDockOptions` and `DiagnosticsOptions`, and `runDiagnostics` takes no thunk (**Breaking** for `@qadi/devtools`).
9. **`useDevtoolsFeed` returns `questions`** beside `gates` and `onInvalidate`, and `FeedOwnedKey` is the closed union
   `"layer" | "questions"`, so a collision in `extra` is a compile error (**Breaking** for `@qadi/react`: `questions` moved
   from `diagnostics` to the top level of the feed, and `<DevtoolsDock {...feed} />` still wires it).
10. **`Diagnostics.questions` and `DiagnosticsReading.questions` are kept**, carried only by a supplied reading: a reading
    produced in another process still brings its questions. A supplied list wins over the thunk, and the thunk's failure is
    then not stated.
11. **One read goes away.** A diagnostics publish that changes no question no longer re-reads the registry. The feed reads it
    on a registry notification, on `configure` and on a tick whose questions changed. That read was an artefact of the join
    living behind the poll, and the registry announces its own changes.

## Alternatives rejected

- **Catching the thunk's throw inside the poll.** It leaves two failure policies for the panel's two inputs, and the poll
  would own an input it does not sample as it samples the others (it reads the wiring, activity and calls, which it can
  describe; the questions are the host's own).
- **Comparing the thunk's answers by reference.** `asked()` returns a fresh array each call, so every tick would publish and
  every consumer would re-render on a quiet interval.
- **Subscribing to the atom set's questions.** There is no change signal to subscribe to, and adding one would re-render the
  panel at every first mount of a guard.
- **Moving the registry alone first.** The documented mend through a poll that changed the questions would vanish for a
  commit, with the registry out of the model and the thunk still behind the poll.
- **One shared failure view for both inputs.** It would claim rows it could not read: a failed thunk says nothing about the
  registry, and the reverse.
- **Dropping `DiagnosticsReading.questions`.** A supplied reading from another process would lose its questions.

## Mutation

The dock model's mutation gate (`stryker.devtools.mjs`, glob `packages/devtools/src/model/**/*.ts`) was measured on the phase
base and on the final tree by `56-mutation.mjs`, each score as `(detected/scored)`, where detected is killed plus timeout and
scored adds survivors and no-coverage mutants. The numbers are those of the two committed files,
`56-mutation-base.json` and `56-mutation-after.json`.

| File | Base | After |
| ---- | ---- | ----- |
| `DiagnosticsFeed.ts` | 0.9474 (90/95) | 0.9885 (86/87) |
| `DiagnosticsStore.ts` | 1 (60/60) | 1 (57/57) |
| `DockModel.ts` | 1 (145/145) | 1 (114/114) |
| `Gates.ts` | 1 (66/66) | 1 (70/70) |
| `GatesFeed.ts` | not built | 1 (118/118) |

No file's score fell, so the moved-mutant budget was not drawn on (D-11). The counts moved because mutants moved with the
code: the poll lost the thunk, `DockModel.ts` lost the watch, and `GatesFeed.ts` took both. Five mutants no test could
tell apart were rewritten away, not ignored. The static-ignored mutants of `GatesFeed.ts` were measured too, with
`ignoreStatic: false`: 122 of 122 are `Killed`, the one that first lived (the span name) being pinned by T10, recorded in
`56-mutation-static.json`. The comparison printed `WX-05 holds (D-11)`.

## Consequences

- The dock model's store count is unchanged: nine. `DockModel.ts` keeps its closed flag and its last join, and the watch's
  state lives in the feed.
- A questions input that throws is stated in the Questions tab, and the diagnostics poll keeps running: wiring, activity and
  calls stay current on every tab.
- A poll that stops still shows the questions, which the feed reads on its own cadence.
- A host that wrote `diagnostics={{ ..., questions }}` gets a compile error and moves `questions` beside `gates`. A host
  that spreads `useDevtoolsFeed()` into `<DevtoolsDock />` changes nothing.
- `spec/overview.md` changes rows, not an export (56-11): `GatesFeed.ts` is package-private.
- ADR-QD-162 is left intact: its decision 5 still describes the registry's failure, which the feed now holds.

## Related

[ADR-QD-047](./047-a-headless-devtools-model.md), [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md),
[ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md),
[ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md), INV-QD-343, INV-QD-357,
INV-QD-358, BEH-QD-583..585, BEH-QD-616..620.
