# ADR-QD-137 — A devtools session owns its runs through a scope

> **Document Control**
>
> | Property       | Value                                                                  |
> | -------------- | ---------------------------------------------------------------------- |
> | Document ID    | QADI-ADR-137                                                           |
> | Revision       | 1.2                                                                    |
> | Effective Date | 2026-11-11                                                             |
> | Status         | Accepted — supersedes ARCH-20 D-20-b (an amendment to ADR-QD-047)     |
> | Author         | Qadi Engineering                                                       |
> | Classification | Architecture Decision Record                                           |
> | Change History | 1.2 (2026-11-12): amendment — the timeline's read is scoped too; useRunningStore deleted (ARCH-82, CCR-QD-425)<br>1.1 (2026-11-11): useScoped clears its value on cleanup, so a hidden Activity never leaves a child on a closed session (WR-02)<br>1.0 (2026-11-11): Initial (ARCH-73, CCR-QD-415)                        |

---

## Context

ARCH-20's decision D-20-b, an amendment to
[ADR-QD-047](./047-a-headless-devtools-model.md), chose where the simulator's run is
forked:

> **A. `session.run(kind): Effect<void>`; the hook forks it.** The session keeps the
> current fiber in its closure; `run` itself interrupts the previous one, forks the
> program with `Effect.forkDetach`, awaits it and applies the result only if its
> generation is still current. `dispose: Effect<void>` interrupts. Model code never
> calls `runFork` (matches `runSource`); tests `yield*` it under `TestClock`.

That left the run's lifetime with every shell. A command that supersedes a run (a
policy change, a re-seed, a change of ports) moved a generation and recorded the run
in a retired list, and the interrupt waited for a host to fork `reap`
(`hasRetired` told it whether to). `useSimulationSession` did that after every
notification. A host without that hook, such as the BDD steps or a dock model that
owns its stores, let a superseded Live run keep asking the application's resolvers
until somebody remembered to reap. The base's own test said so: after the command the
snapshot was `Idle` and `hasRetired()` was true, and `tally.interrupted` stayed 0 until
`yield* session.reap` ran. The generation guarded what the screen showed; nothing
guarded what the application was asked.

## Decision

The user decided this one (`.planning/phases/_DECISIONS-v1.2.md`, row 25-01 T1, D-01):

> `D: FiberHandle` + public confirmed. New option, not in the original plan. The
> session is constructed in a `Scope` and owns an `effect/FiberHandle`. Every run forks
> into it, so a new run interrupts the previous one and closing the scope interrupts the
> run in flight. `reap`, `hasRetired`, the retired list and `dispose` leave the
> interface. **Overrides ARCH-20 D-20-b** ("model code never forks"): the session owns
> its runs' lifetime through structured concurrency instead.

The standing instruction that came with it: "the recommendation should be the cleanest
solution, not the simplest one; we can override any ADR if it causes us problems." This
record is the override, and it reverses a recorded decision, which is why it has its own
number rather than an amendment's paragraph.

1. **A session is constructed in a scope.**
   `makeSimulationSession: (init?) => Effect<SimulationSession, never, Scope.Scope>`.
   The session builds one `effect/FiberHandle` and the runtime that forks into it, and
   registers a finalizer on the scope.
2. **`run(kind)` is a synchronous command.** It does the synchronous part (policy,
   question, refusal) and forks the evaluation into the handle. It returns `void`.
3. **A superseding command interrupts the run in flight before it returns.** It bumps
   the generation and, when the handle holds a fiber, installs an empty fiber in its
   place; replacing a fiber in a `FiberHandle` interrupts it, inside the command. Choosing
   a policy, a re-seed or a replay, a change of ports and a newer run all do this, with no
   host code. The generation still decides what lands: an interrupted run never reaches
   the landing step, and the check stays as the belt for a resolver that ignores
   interruption.
4. **Closing the scope interrupts the run in flight and leaves the session inert.** The
   finalizer moves the generation and marks the session closed, so a later `run` starts
   nothing and a closed session's snapshot does not change.
5. **A run's services are the constructing context's, and its span is a root.** The
   handle's runtime captures the context the session was built under, so a run sees the
   clock, tracer and sink of its builder. A run's span `qadi.devtools.simulationSession.run`
   has no parent: it is a request of its own, not a child of whichever command started it.
6. **React owns the scope through a package-private `useScoped`.** It builds the value in
   a layout effect and closes the scope in that effect's cleanup. Under StrictMode the
   first effect builds a session, its cleanup closes it (no run exists yet) and the second
   builds the one the screen shows, so a screen never renders a closed session and nothing
   is built during render. The cost is one render with no session: the owning hooks
   (`useOwnedSimulationSession`, `useSimulationSession`) return `undefined` until it exists,
   and `DevtoolsDock` renders nothing for that pass. The cleanup also clears the value, so
   a hidden `<Activity>` (which runs the cleanup and later the effect, keeping state)
   unmounts whatever read the closed session once, and the next session remounts it.
7. **The rule is general for the package.** A devtools store that owns fibers is built in a
   scope its owner holds. Phase 26's dock model follows it; the timeline's `useRunningStore`
   is the other shape (a source it reads, not a run it owns) and is unchanged.

## Consequences

- `reap`, `hasRetired` and `dispose` are not on the interface, and the spans
  `qadi.devtools.simulationSession.reap` and `…dispose` are gone: nothing awaits interrupts
  any more. A host ends a session by closing its scope.
- Tests build sessions under `it.effect` (`yield* makeSimulationSession(…)`); a DOM test
  builds one in a scope it closes in `afterEach`; a BDD scenario is one effect and so one
  scope.
- **The ordering change, stated.** A new run starts evaluating before the old run's
  finalizers have finished (`runForkWith` forks the new fiber, then the handle interrupts
  the old one); the base awaited the reap first. It is safe because each run builds its own
  ports layer and recorder and only the generation-current run writes session state.
- The interface change is public (`@qadi/devtools`, minor) and unreleased: the session
  arrived in a release that has not shipped, so no released consumer breaks.
  [BEH-QD-461](../behaviors/29-devtools-simulator.md#beh-qd-461-a-session-owns-its-runs)
  states the requirements and `SimulationSession.test.ts` enforces them.

## Alternatives considered

- **A forker passed at construction** (ARCH-20's own B: `makeSimulationSession({ fork })`).
  Rejected. It makes a caller supply the thing that owns the lifetime, and its objection,
  "tests need a test runtime handle", is answered by the scope itself: a test's own
  `it.effect` context is that handle.
- **`interruptUnsafe` called by the session on a fiber it forked.** Rejected. It is the
  same ownership as the handle, written by hand, and it leaves the scope not owning the
  fiber, so closing the scope would still need a `dispose`.
- **No prompt interruption** (a generation guard only, as `reap` was a convenience).
  Rejected. It is the defect this record closes: the application's resolvers keep being
  asked for an answer nobody will read.
- **Commands only mark a run stale, and the next run replaces it.** Rejected. A superseded
  Live run would keep querying resolvers until then, which is BEH-QD-322's regression.
- **A clearing fiber forked outside the handle**
  (`Effect.runForkWith(services)(FiberHandle.clear(runs))`). Rejected. It is just as
  immediate, but the clearing fiber is not the scope's, so the scope does not own it.
- **`QadiProvider`'s pattern for React** (a ref filled during render, `dispose` deferred by
  `setTimeout(0)` and cancelled on remount). Rejected. It has the session on the first
  render, but it closes a tick late through a timer outside Effect (tests must wait), and a
  StrictMode double render builds a second, never-closed session.

> **Amended 2026-11-12 (CCR-QD-425): the timeline follows the rule too.** Point 7's
> exception no longer holds. `useTimeline` reads its source through a timeline feed built
> in a scope `useScoped` holds, the dock model reads its source through the same feed, and
> `useRunningStore` is deleted, so every devtools store that reads or runs anything is
> built in a scope its owner holds. A hidden-then-shown tree therefore starts a fresh
> timeline
> ([BEH-QD-508](../behaviors/28-devtools-screens.md#beh-qd-508-the-diagnostics-and-the-timeline-live-as-long-as-their-owners-scope)).
