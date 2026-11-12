# Phase 25: Session-only Simulator - Context

**Gathered:** 2026-11-11
**Status:** Ready for execution (D-01 answered 2026-11-11, revised for option D)
**Ticket:** ARCH-73 · review candidate 5 (2026-11-11 architecture review)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md`, then
`.planning/phases/24-simulation-source-preparation/24-CONTEXT.md` (this phase starts from Phase 24's end state)

<domain>
## Phase Boundary

`@qadi/devtools`' Simulator screen becomes a view of one `SimulationSession` and nothing else, the way
`PolicyExplorer` became one in ARCH-58:

- `Simulator` takes `{ session }` only. `OwnedSimulator`, the `Owned`/`Shared` split and the ignored `sightings`
  prop are gone; tests build a session with `makeSimulationSession` and render it.
- The view composes no form codec and parses no select value: the session gains `setAction(text)` and
  `choosePolicyAt(position)`, and its snapshot carries the policy menu the dropdown shows.
- What the view computes today moves into the snapshot, under the devtools mutation gate: the run's reading
  (`readOutcome`), the sweep-cost sentence, and the baseline's match flag and one-line summary.
- The run lifecycle leaves the public interface and becomes structured: the session is constructed in a `Scope`
  and owns an `effect/FiberHandle`. Every run forks into it, so a new run or a superseding command interrupts the
  run in flight at once, and closing the scope interrupts it. `reap`, `hasRetired`, the `retired` list and `dispose`
  are gone, and no adapter forks anything for the session. Answered up front as D-01 option **D**
  (`_DECISIONS-v1.2.md`); it overrides ARCH-20 D-20-b, recorded as ADR-QD-137.

Phase 26 runs next: a headless dock model that will own this session (in the model's own scope) and replace
`useOwnedSimulationSession`. This phase does not plan dock-model work, and keeps the session constructible and drivable
without React: `makeSimulationSession(init)` is an `Effect` that needs a `Scope`, and no command needs a React type.
Phase 29 owns the shared "This is not a denial" constant; this phase neither moves nor copies that sentence.
</domain>

<evidence>
## Evidence (re-verified by reading at 965ff14c, 2026-11-11; Phase 24 changes only the source rule in the session)

Mostly matches `_WAVE7-CONTEXT.md`. Differences are marked **differs**.

- `packages/devtools/src/react/Simulator.tsx:53-80` `SimulatorProps` (`sightings`, `seed?`, `ports?`, `session?`);
  `:82-83` `Simulator` picks `OwnedSimulator` (`:85-87`, `useSimulationSession(props)`) or `SharedSimulator`
  (`:89-91`, `useSimulationSnapshot(session)`). Production renders
  `<Simulator sightings={props.sightings} session={props.simulation} />` (`DevtoolsDock.tsx:345`), so `sightings` is
  passed and ignored. **differs (scope):** every one of the 32 `<Simulator …>` renders in
  `test/react/Simulator.test.tsx` (26 tests, 588 lines) passes no `session`, so SIM-01 rewrites the whole file, not a
  few tests. `Simulator` and `SimulatorProps` are package-private (not in `react/index.ts`; `test/surface.tst.ts:169-170`
  pins `Simulator` as not exported), so the props change is not a public change.
- View-side logic in `Simulator.tsx`: the dropdown's selected value is a `Match` over `PolicyChoice` (`:162-169`);
  `onChange` parses `/^\d+$/` and indexes `snapshot.sightings` (`:183-186`); the cost sentence is a nested ternary
  over `refusal`, `plan` and `causesIO` (`:253-264`, colour from `causesIO` at `:254`); the action input calls
  `session.edit(withAction(draft, actionOf(event.target.value)))` (`:351`); `ResultCard` calls
  `readOutcome(result.question.policy, outcome, undefined)` on every render (`:437`); `BaselineCard` calls
  `matchesBaseline` (`:544`) and the local `summarise` (`:573-595`). **differs:** `:648-656` (cited by the review) is
  `testIdOf`, a closed map from field to test id; that is a view concern and stays.
- Also view-side but outside the requirements: `Duration` (`:519-531`) chooses a sentence from the clock. Deferred.
- The failure sentence: `Simulator.tsx:506-507` and `Inspector.tsx:178-179` both say "This is not a denial".
  Phase 29's (TIDY-03); left alone here.
- Leaked lifecycle: `useSimulationSession.ts:45-51` subscribes and runs
  `if (session.hasRetired()) Effect.runFork(session.reap)` on every notification. `SimulationSession` exposes
  `reap: Effect<void>` (`SimulationSession.ts:257`) and `hasRetired(): boolean` (`:259`); `retire()` (`:408-412`) parks
  the superseded fiber in `retired` for `reap` (`:414-417`) to interrupt. Consumers: the hook (`:48`) and
  `test/model/SimulationSession.test.ts` (`:312-315`, `:695-697`, and the span test `:1150-1161`, which pins the
  span name `qadi.devtools.simulationSession.reap`). BEH-QD-322's fence lists `reap`
  (`spec/behaviors/29-devtools-simulator.md:673`) and its prose says "`reap` then interrupts the fiber" (`:710`).
- Public status. `makeSimulationSession`, `SimulationSession`, `SimulationSnapshot`, `RunState` and the hooks are
  exported (`src/index.ts:87-100`, `src/react/index.ts:24-31`; `spec/overview.md:858-859,889`).
  **differs:** they are **unreleased**. `packages/devtools/CHANGELOG.md` (0.11.0 is the last release) never names
  them; `.changeset/simulation-session.md` (pending) introduces them. Removing `reap`/`hasRetired` breaks no released
  consumer, but it is a change to an exported interface, so it gets a changeset and overview rows (SIM-05).
- **differs (new public types):** putting the run's reading in the snapshot means `RunState` names
  `RecordOutcome`, and `RecordOutcome` names `ObligationState`. Both are package-private since ARCH-67
  (`model/Inspect.ts:160-189`, comment at `:203`). The house rule "a type a public signature names stays public"
  (ADR-QD-047's 1.6 amendment, `src/index.ts` header) makes them public types (type-only; `readOutcome` and the
  `Data.taggedEnum` constructors stay private).
- Prior decisions that bear on the lifecycle (**D-20-b is overridden by D-01**): ARCH-20 D-20-b chose "`session.run` is an Effect, the hook forks; model
  code never calls `runFork`" and rejected "inject a `fork` at construction" because tests would need a runtime
  handle (`.planning/milestones/archive-pre-gsd/architecture/ARCH-20-simulation-session.md:310-318`).
  `packages/react/src/QadiProvider.tsx:336-340` records a preference for `Fiber.interrupt` over `interruptUnsafe` for
  cleanup that must wait for finalizers. `effect@4.1.2`'s `FiberImpl.interruptUnsafe`
  (`internal/effect.ts:592-610`) interrupts an idle, interruptible fiber synchronously and defers it for a running
  one; `core/src/SharedComputation.ts:120-145` already relies on that.
- **`effect@4.1.2` `FiberHandle`** (`node_modules/.pnpm/effect@4.1.2/node_modules/effect/src/FiberHandle.ts`, verified
  2026-11-11): `make<A, E>(): Effect<FiberHandle<A, E>, never, Scope>` (:152-161) is an `acquireRelease` whose release
  closes the handle and interrupts every fiber in it (`Fiber.interruptAllAs`); `runtime(self)<R>()` (:901-945) captures
  `Effect.context<R>()` once and returns a **synchronous** `(effect) => Fiber` that forks with `Effect.runForkWith(services)`
  and installs the fiber; `makeRuntime` (:198-215) is `make` + `runtime`. Installing (`setUnsafe`, :395-433) puts the new
  fiber in place *first* and then calls `previous?.interruptUnsafe(…)`, so the replaced fiber is interrupted immediately,
  inside the call; a fiber removes itself from the handle when it exits. `getUnsafe(self): Option<Fiber>` (:603) reads the
  current fiber. `clear(self)` (:668-683) is an `Effect` (it awaits the interrupt), so a synchronous command cannot use it.
  After the scope closes, the run function returns an already-interrupted fiber (:932-934). `runForkWith`
  (`internal/effect.ts:5746-5756`) evaluates the new fiber synchronously until its first async boundary.
- **Effect's scoped-constructor precedent in this repo:** `makeCircuitBreaker = Effect.fn("qadi.audit.makeCircuitBreaker")`
  (`audit/src/CircuitBreaker.ts:218`); `decodeDecisionStream` returns `Effect.fn.Return<…, never, Scope.Scope>`
  (`core/src/DecisionStream.ts:251`). `Effect.fn(name, options?: SpanOptionsNoTrace)` takes span options
  (`Effect.ts:24225`), including `root` (`Tracer.ts:270`); a span's `parent` is `Option<AnySpan>` (`Tracer.ts:34`).
  `Tracer.ParentSpan` is a context service (`Tracer.ts:178`), so a runtime captured inside the constructor's span would
  parent every run span under it.
- **Tests and scopes:** `@effect/vitest@4.1.2`'s `it.effect` provides a `Scope` (`src/index.ts:253-259`; there is no
  `it.scoped` in v4) and has `it.effect.prop` (`:112`). `@effect-cucumber/vitest` composes one scenario (hooks, Background
  and Scenario steps) into **one** Effect (`dist/ScenarioEffect.js:2,35`) run by `it.effect`, so every step of a scenario
  shares its scope; the BDD ring is `DecisionLog.layer = Layer.succeed(DecisionSink, …)` (`core/src/DecisionLog.ts:283`),
  so providing it at construction captures a plain service. `Effect.yieldNow` is a value (`Effect.ts:2602`), not a call.
- **React precedents:** `useRunningStore.ts:30-37` forks on mount and `Effect.runFork(Fiber.interrupt(fiber))` on cleanup.
  `QadiProvider.tsx:250-326` builds its registry lazily in a ref during render and defers `dispose` by a `setTimeout(0)`
  cancelled on remount, so StrictMode's double mount does not destroy it (pinned by `react/test/edges.test.tsx:243`).
  `useOwnedDockSession` reads its replay target once, at construction (`useDockSession.ts:24-31`); `DevtoolsDock.tsx:168,183`
  passes it the simulation session.
- **Spec text that names the old lifecycle or constructor:** BEH-QD-322's fence (`29-devtools-simulator.md:665`
  `makeSimulationSession: (init?) => SimulationSession`, `:672-674` `run`/`reap`/`dispose`) and prose (`:707-712`, "move a
  generation synchronously … `reap` then interrupts the fiber … commands stay synchronous so a view may dispatch them while
  rendering"); a **compiled** ` ```typescript ` fence calls `makeSimulationSession()` synchronously (`:783-801`);
  ADR-QD-047 `:137` (`useSimulationSession` is the adapter), `:292` (`useOwnedSimulationSession`); pending changesets
  `.changeset/simulation-session.md` and `.changeset/devtools-headless-interface.md` (migration line: "`makeSimulationSession(...)`
  with `run("Run")`"); `apps/website/src/content/docs/docs/packages/devtools.md:188-194` and `packages/devtools/README.md:27-31`
  name the functions in prose only.
- Other session drivers that must stay green: `features/features/devtools-simulator/devtools-simulator.steps.test.ts`
  (uses `makeSimulationSession`, `edit`, `choosePolicy`, `run`; never `reap`), `test/react/DevtoolsDock.test.tsx`
  (drives the simulator through the DOM: `qadi-simulator-policy` with option values `"seeded"`, `"evicted"`,
  `"<rail index>"`, `qadi-action`, `qadi-simulator-cost`, `qadi-baseline-state`).
- Mutation: `stryker.devtools.mjs` mutates `src/model/**` only, so the view logic above is outside the gate today.
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (answered 2026-11-11, `_DECISIONS-v1.2.md`): `D: FiberHandle`, public changes confirmed.** The user's standing
  instruction: "the recommendation should be the cleanest solution, not the simplest one; we can override any ADR if it
  causes us problems." The session is constructed in a `Scope` and owns an `effect/FiberHandle`; every run forks into it,
  so a new run interrupts the previous one and closing the scope interrupts the run in flight; `reap`, `hasRetired`, the
  `retired` list and `dispose` leave the interface. **This overrides ARCH-20 D-20-b** ("`session.run` is an Effect, the
  hook forks; model code never calls `runFork`"): the session owns its runs' lifetime through structured concurrency
  instead. The options the original checkpoint offered (A a forker at construction, B `interruptUnsafe` inside `retire`,
  C no prompt interruption) are not built. 25-01 records this and does not stop.
- **D-02 (test first):** plan 25-02 records the mutation baseline and writes the model tests red before any src change,
  against the scoped interface of D-09/D-10. On the phase base they fail because `makeSimulationSession` returns a plain
  object (`yield*` of it throws) and the session still has `reap`/`hasRetired`/`dispose`; the behavioural defect they pin
  (a superseded run keeps asking the resolvers until someone forks `reap`) is shown on the base by the existing C4 test's
  own assertions (`SimulationSession.test.ts:310-316`: `tally.interrupted` stays 0 until `yield* session.reap`), which
  25-02's SUMMARY quotes. The Simulator's DOM tests are not touched until 25-04.
- **D-03 (commands):** `setAction(text: string)` commits the action through `SimulationForm`'s `actionOf`/`withAction`
  (an empty text removes the action, because `hasAction` fails with `MissingAction` when none was supplied and an
  empty string is a different question), with `edit`'s no-op rule. `choosePolicyAt(position: number)` chooses the
  rail sighting at that position of `snapshot.policyMenu.options`; a position naming the seeded or evicted entry, a
  non-integer or one out of range is a no-op that notifies no one. The snapshot's `policyMenu`
  (`{ options: ReadonlyArray<{ value: string; label: string }>, selected: string }`) holds what the dropdown lists,
  in order: `"seeded"` ("from the replayed row") while seeded, `"evicted"` ("<label> — no longer in the log") while
  evicted, then one entry per sighting with value `String(index)`. The values are today's DOM values, so
  `DevtoolsDock.test.tsx` keeps working. The view renders the options and passes `event.target.selectedIndex`; it
  parses nothing. `choosePolicy(policy)` stays (the BDD steps and the dock use it).
- **D-04 (snapshot readings, SIM-03):**
  - `RunState`'s `Ran` gains `reading: RecordOutcome`, computed once, when the run lands, from
    `readOutcome(question.policy, outcome, undefined)` (a simulation discharges nothing, so no gate report).
  - The snapshot gains `cost: SweepCost` with `{ sentence: string; warns: boolean }`, the four cases of today's
    ternary (refused: "a run would be refused: <reason>"; no plan: ""; Live: "a sweep runs N evaluations against
    your live resolvers", `warns: true`; otherwise "a sweep runs N evaluations, all in this process"), text unchanged.
  - The snapshot gains `baselineReading: BaselineReading | undefined`, present exactly when `baseline` is `Checked`:
    `{ matches: boolean; sentence: string }`, where `matches` is `matchesBaseline` and `sentence` is
    "matches — this reconstruction reproduces the logged decision" or today's `summarise` text. `summarise` moves
    to `model/Replay.ts` as the function that builds it. `baseline` stays as it is.
  - The view reads these and computes none of them. The failure sentence stays in the view (Phase 29).
- **D-05 (view, SIM-01):** `SimulatorProps` is `{ readonly session: SimulationSession }`. `Simulator` calls
  `useSimulationSnapshot(session)` and renders; its Run and Sweep buttons call `session.run(kind)` (a command, D-10).
  `DevtoolsDock` passes `session` only. `Simulator.test.tsx` builds each session in a scope it closes after the test
  (D-15) and renders `<Simulator session={…} />`; where a test re-rendered with new props it calls the session command
  inside `act` (`setSightings`, `setPorts`). A DOM test is deleted only when a named model test asserts the same thing;
  the deletions and their model counterparts are listed in 25-04's SUMMARY. DOM test ids and visible text do not change.
- **D-06 (public interface, SIM-05; confirmed by D-01, adjusted for the scoped constructor):**
  `makeSimulationSession: (init?: SimulationSessionInit) => Effect.Effect<SimulationSession, never, Scope.Scope>`.
  `SimulationSession` loses `reap`, `hasRetired` and `dispose`; `run` becomes `(kind: RunKind) => void`; it gains
  `setAction` and `choosePolicyAt`. `SimulationSnapshot` gains `policyMenu`, `cost` and `baselineReading`; `RunState`'s
  `Ran` gains `reading`. `SimulationSessionView` loses `run` (the view calls `session.run`). `useOwnedSimulationSession`
  returns `SimulationSession | undefined` and `useSimulationSession` returns `SimulationSessionView | undefined` (D-13).
  New exported types: `PolicyMenu`, `PolicyMenuOption`, `SweepCost` (`model/SimulationSession.ts`), `BaselineReading`
  (`model/Replay.ts`), `RecordOutcome`, `ObligationState` (`model/Inspect.ts`, type-only). `SimulationSessionInit` is
  unchanged. Each new type gets a barrel line, an overview row and a `surface.tst.ts` import. Changeset: `@qadi/devtools`
  **minor** (the interface is unreleased, so the note says no released consumer is broken, and names the removed
  members and the new constructor shape anyway).
- **D-07 (hooks):** `useSimulationSnapshot(session)` subscribes and returns `{ session, snapshot }`; it forks nothing.
  `useOwnedSimulationSession` keeps its inputs and its three prop-in-step layout effects (Phase 26 replaces it for the
  dock) and builds the session through `useScoped` (D-13); its passive `dispose` effect is deleted. Nothing under
  `react/` forks a run or a reap any more: the only `Effect.runFork` left for the simulator is `useScoped`'s scope close.
- **D-08 (records):** the lifecycle override gets its own record, **ADR-QD-137 "A devtools session owns its runs
  through a scope"**, because it reverses a recorded decision (ARCH-20 D-20-b), sets a rule Phase 26's dock model
  follows too (the model is scoped and owns the session's scope), and fixes how React owns a scope (D-13). That is
  cleaner than folding an override into an amendment about the view. ADR-QD-047 gets the revision after 1.10 for the
  view only ("the simulator is a view of its session"), which cites ADR-QD-137, and its Status notes that ARCH-20's
  D-20-b is superseded by ADR-QD-137. BEH-QD-460 "The simulator renders its session and computes nothing" and
  BEH-QD-461 "A session owns its runs" in `29-devtools-simulator.md`; BEH-QD-322's fence, prose and compiled example
  updated; BEH-QD-390's fence unchanged. No new invariant (INV-QD-294/295 unused; INV-QD-107 is unchanged).
  `spec/devtools-spec/02-screens.md` §5 gains a presence sentence. CCR-QD-415, traceability, overview,
  `spec/README.md`, the changeset; the two pending changesets that describe construction are edited in place.
- **D-09 (constructor):** `makeSimulationSession = Effect.fn("qadi.devtools.makeSimulationSession")(function* (init?:
  SimulationSessionInit): Effect.fn.Return<SimulationSession, never, Scope.Scope> { … })`, the `makeCircuitBreaker`
  shape. In order: the closure state as today; `const runs = yield* FiberHandle.make<void>()`;
  `const fork = yield* FiberHandle.runtime(runs)<never>()`; then
  `yield* Effect.addFinalizer(() => Effect.sync(() => { generation += 1; closed = true; }))`, registered after the handle
  so it runs first (finalizers run in reverse), which makes "closing the scope supersedes" explicit: a run the close
  interrupts can never land, and `run` on a closed session does nothing. `FiberHandle.make` + `runtime` rather than
  `makeRuntime`, because D-11 reads the handle (`getUnsafe`). Only public `effect/FiberHandle` and `effect/Scope` APIs.
- **D-10 (a run is a command):** `run(kind): void`. It does today's synchronous part (policy, question, refusal) and
  then, for an available source: `generation += 1; const mine = generation; run = Running; commit();` and, only if
  `mine === generation` still (a subscriber notified by that commit may already have superseded it), `fork(land(…))`.
  Installing the new fiber interrupts the previous run at once (`setUnsafe`), so `run` needs no reap. `land` is
  `Effect.fn("qadi.devtools.simulationSession.run", { root: true })`: it runs the program under `Effect.exit` and applies
  the exit only when `mine === generation` (correctness stays the generation's, as today). `root: true` because the
  captured context's parent span is the constructor's, and a run is the reviewer's own act. **Services are the
  constructing context's** (`runtime` captures `Effect.context()`): a run sees the clock, tracer and sink the session was
  built under. That answers D-20-b's objection to a construction-time fork ("tests need a test runtime handle"): the
  test's own `it.effect` context is that handle. Accepted ordering change: a new run starts evaluating before the old
  run's finalizers have finished (`runForkWith` evaluates the new fiber, then `setUnsafe` interrupts the old one); today
  `runEffect` awaited `reap` first. Safe because each run builds its own ports layer and recorder and only the
  generation-current run writes session state.
- **D-11 (synchronous commands cancel without a reap):** `choosePolicy`, `seed`/`replay` (via `reseed`), `setPorts`
  while running, and `run`'s refused path call `supersede()`:
  `generation += 1; if (Option.isSome(FiberHandle.getUnsafe(runs))) fork(Effect.void);`. Installing an empty fiber
  interrupts the run it replaces immediately, inside the command (`setUnsafe`), and the empty fiber exits at once and
  leaves the handle. A suspended Live run (waiting on a resolver, the case BEH-QD-322 is about) is interrupted before the
  command returns, so promptness holds with no host code. The replaced run's finalizers run synchronously inside the
  command; none of them writes session state (the landing step is the only writer, and it is skipped once interrupted or
  superseded), so nothing re-enters. Rejected, with reasons: (i) commands only mark the run stale and the next run
  replaces it: a superseded Live run would keep querying the application's resolvers until then, BEH-QD-322's regression;
  (ii) `Effect.runForkWith(services)(FiberHandle.clear(runs))`: also immediate, but forks the clearing fiber outside the
  handle, so the scope does not own it; (iii) `fiber.interruptUnsafe()` called by the session: the checkpoint's option B,
  not chosen. BEH-QD-322's sentence "the commands stay synchronous so a view may dispatch them while rendering" stays
  true for the session's state; it now also says a superseding command interrupts the run in flight before it returns.
- **D-12 (no lifecycle members):** the interface has no `reap`, `hasRetired` or `dispose`. A host ends a session by
  closing its scope. The span `qadi.devtools.simulationSession.reap` and `…dispose` disappear (no step awaits interrupts
  any more); the span test asserts the run span instead, as a root span.
- **D-13 (React owns the scope):** a package-private `react/useScoped.ts`,
  `useScoped = <A>(make: () => Effect.Effect<A, never, Scope.Scope>): A | undefined`:
  `const [value, setValue] = useState<A | undefined>(undefined);` and one
  `useLayoutEffect(() => { const scope = Effect.runSync(Scope.make()); setValue(Effect.runSync(Scope.provide(make(), scope))); return () => { Effect.runFork(Scope.close(scope, Exit.void)); }; }, [])`
  (`make` is read once per mount, so it is not a dependency; later inputs arrive as commands; say so in a one-line
  comment, as `useRunningStore.ts` does). Why this shape: the scope's lifetime is exactly a mounted effect's. **StrictMode:**
  React mounts, simulates an unmount and mounts again; the first effect builds A, its cleanup closes A's scope (no run
  exists yet, so nothing is interrupted), the second builds B and sets it, so a screen only ever renders a live session,
  and nothing is built during render, so no scope is orphaned (a value built lazily in render is built twice under
  StrictMode and one copy is discarded). A layout-effect state update is applied before paint, so no frame is shown
  without the session, and Testing Library's `render` flushes it inside `act`. On the server no effect runs: the owner
  renders nothing and no scope is opened. `Effect.runSync` uses the default services, the same runtime the hook's
  `Effect.runFork(session.run(kind))` used. **Cost, stated plainly:** the first render has no session, so its owners
  render nothing for one pass and the two owning hooks return `| undefined`. Rejected: `QadiProvider`'s pattern (a ref
  filled during render, `dispose` deferred by `setTimeout(0)` and cancelled on remount): it has the session on the first
  render, but closes a tick late through a timer outside Effect (tests must wait), and a StrictMode double render builds
  a second, never-closed session. AGENTS.md §6: no `async`/`await`/`Promise`/`.then`; `Effect.runSync`/`runFork` at the
  React edge have precedent (`useRunningStore.ts:33-35`, `ExplorerSession.ts:197`).
- **D-14 (the dock in this phase):** `DevtoolsDock` becomes the owner (`useTimeline`, `useDiagnostics`/`mergeReading`,
  the rail memo, `useOwnedSimulationSession`) and renders `simulation === undefined ? null : <DockFrame … simulation={simulation} />`;
  `DockFrame` (same file, private) holds `useOwnedExplorerSession`, `useOwnedHeldChoice`, `useOwnedDockSession`,
  `useDockSnapshot` and the JSX, because `useOwnedDockSession` reads its replay target once and must never be handed
  `undefined`. Phase 26 replaces the owner's hooks with `useDockModel` and keeps the frame as the seam. No dock test changes.
- **D-15 (how tests build a session):** model tests are `it.effect` and build with `yield* makeSimulationSession(…)`;
  the file's plain `it(...)` tests become `it.effect`. Helpers in `SimulationSession.test.ts`: `sessionWith` becomes an
  Effect; `startRun(session, kind)` = `session.run(kind)` then `TestClock.adjust("10 millis")`; `settled(session)` =
  `Effect.callback` that resumes when `run._tag !== "Running"` (checked at once, then on each notification, unsubscribing
  on resume and on interrupt); `ran(session, kind)` = `Effect.suspend(() => { session.run(kind); return settled(session); })`,
  replacing every `yield* session.run(kind)`. A test that closes the scope mid-test uses `Scope.make()`,
  `Scope.provide(…, scope)` and `Scope.close(scope, Exit.void)`. The DOM tests' `mount(init)` builds with
  `Effect.runSync(Scope.provide(makeSimulationSession(init), scope))` and closes every scope in `afterEach`. The BDD steps
  run inside the scenario's `it.effect` (one scope per scenario): `sessionFor` becomes an Effect, the ring is provided at
  construction (`Effect.provide(s.ring.layer)`), and the steps get their own `settled`/`ran` (five lines; features do not
  import package test helpers).
- **D-16 (plan layout):** making the constructor an `Effect` breaks every caller at once (the hooks, the dock, the
  Simulator's owned path, the model tests, the BDD steps), so 25-03 does the lifecycle first, in two tasks that end green
  together (T1 the model with its tests and the BDD steps; T2 the React adapters own the scope: `useScoped`, the hooks,
  the dock's owner/frame split, and an interim `OwnedSimulator` that renders nothing until its session exists), and the
  commands and readings third (T3). 25-04 keeps the view: the DOM tests build scoped sessions and `Simulator` becomes
  session-only (deleting the interim `OwnedSimulator`).

### Claude's Discretion
- Field names inside `PolicyMenu`, `SweepCost` and `BaselineReading`, if a better word fits the file's vocabulary;
  the shapes and texts in D-03/D-04 are fixed.
- Whether `policyMenu`, `cost` and `baselineReading` are built in `build()` or memoised on their inputs; `build()`
  already runs once per command, so building them there is the default.
- The names `supersede`, `land`, `settled`, `ran`, `DockFrame`; the rules in D-09..D-15 are fixed.
</decisions>

<canonical_refs>
## Canonical References
- `packages/devtools/src/react/Simulator.tsx`, `useSimulationSession.ts`, `DevtoolsDock.tsx` (:168, :345), `Inspector.tsx`
- `packages/devtools/src/model/SimulationSession.ts`, `SimulationForm.ts` (`actionOf`, `withAction`), `Inspect.ts`
  (`readOutcome`, `RecordOutcome`, `ObligationState`), `Replay.ts` (`Baseline`, `matchesBaseline`), `WhatIf.ts` (`SweepPlan`)
- `packages/devtools/src/index.ts`, `src/react/index.ts`, `test/surface.test.ts`, `test/surface.tst.ts`
- `packages/devtools/test/model/SimulationSession.test.ts`, `test/react/Simulator.test.tsx`, `test/react/DevtoolsDock.test.tsx`
- `features/features/devtools-simulator/devtools-simulator.steps.test.ts`
- ADR-QD-047 (amendments 1.6, 1.7, 1.10), ADR-QD-050, BEH-QD-322, BEH-QD-390, BEH-QD-430 (`readOutcome`)
- `.planning/milestones/archive-pre-gsd/architecture/ARCH-20-simulation-session.md:310-318` (D-20-b, overridden), `ARCH-50-explorer-session.md`,
  commit `1721a42` (ARCH-58, PolicyExplorer session-only)
- `.changeset/simulation-session.md` (pending: the session is unreleased), `.planning/phases/_DECISIONS-v1.2.md` (D-01's answer)
- `node_modules/.pnpm/effect@4.1.2/node_modules/effect/src/FiberHandle.ts`, `Scope.ts`; `packages/devtools/src/react/useRunningStore.ts`;
  `packages/react/src/QadiProvider.tsx:250-326` (the rejected deferred-dispose pattern)
</canonical_refs>

<deferred>
## Deferred Ideas
- `Duration`'s clock sentence into the model (not in SIM-03).
- The shared "This is not a denial" constant (Phase 29, TIDY-03).
- Replacing `useOwnedSimulationSession` with a dock-owned, scoped model (Phase 26, DMOD-01; its `makeDockModel` builds
  this session in the model's own scope).
- Removing `snapshot.capture` from the public snapshot (no view reads it).
</deferred>

---
*Phase: 25-session-only-simulator · Context gathered: 2026-11-11*
