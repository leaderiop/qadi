# @qadi/devtools

## 0.3.0

### Minor Changes

- fd63503: New package: `@qadi/devtools`, the surface for the decision data plane.

  Two entry points. `@qadi/devtools` is the **headless model** — three source
  adapters (`sourceFromRecords`, `sourceFromFeed`, `sourceFromEventSource`), the
  `Timeline` fold that merges them, and a subscribable `TimelineStore` — with no
  React anywhere in it. `@qadi/devtools/react` adds one `useSyncExternalStore`
  hook and computes nothing, so a server-side aggregator can consume the model
  without a UI and `react` is an _optional_ peer dependency.

  The model is what absorbs a feed that promises nothing. `EventSource` reconnects
  by itself and a feed may be replaying, so a record arrives twice; a merge
  interleaves two clocks, so records arrive out of order; and an obligation
  outcome is emitted after `evaluate` returned, so the two halves of one story
  arrive backwards. All of that is handled here and nowhere else, and everything
  downstream may assume entries are ordered, unique and joined.

  Three things it deliberately does **not** do: it never collapses a server
  decision and its client re-check, because sharing an evaluation id is the whole
  pairing story; it never lets a bad frame take down the panel, because a panel is
  what you are looking at when something is already wrong; and it never decides
  CORS, because a browser reading a separate API origin is a deployment's call.

  `onMalformed` reports _why_ a frame was dropped — `"not-json"` is a broken
  transport, `"not-a-record"` is a protocol mismatch — because they have different
  fixes and a reader that cannot tell them apart debugs the wrong one.

  The model joins the mutation gate at core's threshold, through a second Stryker
  configuration (`stryker.devtools.mjs`); it currently sits at 100% with no
  survivors. Three separate rounds of it found dead code rather than weak tests: a
  sequence-number tie-break that stable sorting already provided, a three-way
  comparator whose `-1` and `0` were the same answer to the only question asked of
  it, and two redundant guards. All four were deleted rather than pinned.

- f356c73: Screens 1 and 2 — the decision log and the inspector — in a dock the host
  mounts.

  `DevtoolsDock` renders a chronological table of every record from every wired
  sink, with the environment as a badge on the row rather than a mode of the tool:
  the cross-environment story is what the timeline exists to show, and a switcher
  would hide exactly that. Clicking a row opens the inspector; clicking a pair
  badge moves to the partner in either direction.

  Three rendering rules are tests rather than conventions, because each is a
  conclusion a reviewer acts on:
  - **An `EvaluationError` is ERROR, never DENY.** The three classes differ in
    treatment — tinted, solid, outlined — not only in hue, so the distinction
    survives a reader who cannot tell the colours apart.
  - **A short-circuited node reads "never resolved".** Rendering it as a cross
    would say the policy rejected something it never examined.
  - **A trace truncated below the root reads "not disclosed".** That is a
    disclosure boundary rather than a defect, and it is distinguishable from
    short-circuiting because a composite that short-circuits always evaluates its
    first child.

  The inspector states what it cannot know rather than guessing: per-duty
  obligation state is unobservable — a handler receives the whole set and reports
  once — an absent `cache` is worded differently from `"miss"`, and a selection
  dropped by capacity says the buffer moved on rather than silently emptying. A
  denial gets no field panel at all, because `Deny` carries neither
  `visibleFields` nor `obligations`: it permits nothing, so it has nothing to
  narrow and nothing it can oblige.

  Nothing runs on import. The package declares `"sideEffects": false`, so a module
  whose only job is a side effect would be droppable — an overlay that installed
  itself would vanish in the production build nobody tests. Styles are inline
  objects for the same reason and because there is no CSS pipeline to put them in.

  **Three of the six topologies still have no rendered surface.** A backend-only
  service, a serverless function and a replicated server have nowhere to host an
  in-page dock. Their decisions are reachable at `/__decisions` and the model that
  merges them imports no React, so a served page or a CLI is a second shell over
  the same model — but neither is written, and the documents say so.

- d251db4: Four more screens: the policy explorer, the role viewer, services and cache, and
  the React panel rescoped to questions.

  **The policy rail is observed, not registered.** Every `DecisionRecord` already
  carries the `Policy` it evaluated, so the policies an application uses are in the
  log — `policiesSeen` groups them by `Equal.equals` (structural for plain objects,
  the same property `Atom.family` relies on) and counts their verdicts. An optional
  `catalogue` prop adds names and the policies that have not run yet. No registry,
  no registration call sites, no service whose only consumer is a panel.

  **A structural view states no verdict.** `inspect(policy, undefined)` marks every
  node `NeverResolved`, which reads truthfully in the _inspector_ as "this branch
  was short-circuited" and would say a rule was skipped when it was never run. One
  `PolicyTree` component serves both screens so the difference lives in one place.

  **A required port is never called unwired.** Five of the seven services are in
  `EvaluationServices` — a program that has not provided them does not run — so the
  card reports _defaulted to a fail-closed implementation_ and carries what that
  costs. `name?` says which implementation is behind each port; `portActivity`
  says whether anything ever reached it, read with zero wiring. Those are opposite
  problems with the same symptom.

  **No "acyclic ✓".** A by-value `Role` cannot express a cycle, so the check is
  vacuous there; a tick would report a check that never ran. The screen says why
  there is nothing to report instead.

  **The React panel is keyed by question.** Ten `<Can policy={isAdmin}>` in
  different places are one atom — the library cannot tell them apart, and a panel
  listing ten rows would invent a distinction the architecture does not have. The
  screen says so, because a reader counting rows against their component tree
  would otherwise conclude it is broken.

  `@qadi/core` now exports `portCallsTotal` and `portRetriesTotal`, which existed
  as internal scaffolding and are what makes the "wired but never reached" answer
  possible.

  Two things are deferred with their reasons named: the **simulator**, which runs
  evaluations inside a debug panel rather than reading records and needs a clock
  `@qadi/testing` does not wire; and the **CLI** for the three deployments with no
  browser page, which ADR-QD-049 records as the chosen second shell.

- 1a0d767: The subject simulator — the seventh devtools screen, and the only one that
  **runs** an evaluation rather than reading records.

  Run a policy against a subject you describe, vary that description a grant at a
  time to find which grant the answer turns on, and — starting from a decision the
  application actually made — check whether your reconstruction reproduces it.

  **A simulation is sealed.** `Effect.provide` adds to a context and cannot remove
  from one, so supplying the five services `evaluate` requires does not stop it
  finding an optional one already in scope — and it reads two optionally. Left
  unshadowed, a what-if sweep of eight edits writes eight fabricated decisions into
  your real log and eight entries into your real cache, indistinguishable on screen
  from decisions somebody asked for. `simulationLayer` shadows `DecisionSink` and
  `DecisionCache` in every mode, `CurrentSubject` is excluded from a live layer by
  type, and both are asserted rather than assumed.

  **Three answer sources.** `Fixtures` (what you typed), `Snapshot` (real answers
  captured once and replayed) and `Live` (your own resolvers, opt-in by passing a
  `ports` layer to the dock). A sweep of N edits costs N in-memory folds on
  fixtures, N live sweeps on `Live`, and one live run plus N folds on a snapshot —
  which is why `Snapshot` exists and why the panel warns, with a count, before any
  sweep that performs lookups.

  **What-if runs in both directions.** Dropping each grant in turn answers the
  question a reviewer holding an _allow_ has; it is silent for one holding a
  _denial_, since no removal turns a denial into an allow. So the sweep also reads
  the policy for what it asks for and offers each of those, including attribute
  values read backwards out of the matcher that demands them — and says which
  requirements it could not build a remedy for, and why.

  **Replay says what it could not seed.** A `DecisionRecord` names the subject by
  id and carries what your ports answered only inside its trace, so the grants are
  your hypothesis. The panel names every field it left blank, and refuses to claim
  a match where the record cannot attest to one — a truncated payload or a failed
  row cannot vouch for agreement it never recorded.

  New in `@qadi/testing`: **`TestLayerOptions.clock`**. `qadiTestLayer(subject,
{ clock: "test" })` wires a `TestClock`, so `durationMillis` is reproducible
  outside a test runner that happens to supply one. The ids were already
  deterministic and the clock was not, which is half a determinism claim — and it
  survived unnoticed because `@effect/vitest` hands `it.effect` a `TestClock`
  anyway.

- ab7301b: A guard can say that it exists, and the devtools can point at it.

  `QadiProvider` takes `instrument`, off by default. With it on, every `<Can>`,
  `<Cannot>`, `useCan`, `useDecision` and `useDecisionSuspense` records its policy,
  its resource and what it rendered, and the two component guards wrap their output
  in a `display: contents` span — which generates no box, so no layout changes.

  The React panel lists those under each question and offers two directions:
  **highlight**, which draws over every guard asking a question, and **pick**, which
  outlines the guard under the pointer and selects its row. A guard that rendered
  nothing is still pointed at, which is the answer to "why is this button missing".

  This reverses a documented conclusion. The panel previously said a per-instance
  view was unobtainable, on the grounds that `Atom.family` keys structurally and so
  ten gates on one policy are one atom. That is true of the _atom layer_ and does
  not follow for components; the panel is still keyed by question, with the guards
  listed underneath.

  Nothing is a breaking change. `instrument` defaults to `false`, and off means no
  registration and no wrapper element — the DOM is byte for byte what it was.

- f1c6aa5: Hydration is counted at both ends, and every refusal names its reason.

  `dehydrateDecisions` and `hydrateDecisions` returned their entries and forgot
  them, so the only hydration number a panel could show was the mismatch count —
  and the host had to accumulate that itself. Five metrics now count what crosses
  the network, readable with no wiring through `hydrationActivity`.

  `hydrateDecisions` had three silent exits: a payload naming another subject, an
  atom set `makeQadiAtoms` did not build, and an entry whose policy would not
  decode. All three returned quietly, which is indistinguishable from a page with
  nothing to hydrate. It gains an optional `onDropped` carrying the reason, with a
  development-mode warning by default — the shape `dehydrateDecisions` and
  `onHydrationMismatch` already use.

  The metric declarations are exported from `@qadi/core` rather than restated in
  each package, because `Metric`'s registry key includes the description string: a
  reader re-declaring one with a description that differs by a word gets its own
  registry entry and reads zero, with no error raised.

  Nothing is a breaking change. `hydrateDecisions`'s new parameter is optional, and
  the devtools dock's `hydrationMismatches` prop still works and is shown when the
  new `hydration` prop is absent.

- 0649129: See what your ports were asked, not only that they were asked.

  `qadi_port_calls_total` could tell you an attribute store had been consulted
  ninety-one times and nothing else — its frequency is keyed on the port name, and
  deliberately so, because an attribute name is unbounded and a metric keyed on one
  grows an entry per distinct attribute for the life of the process.

  **In `@qadi/core`**, resolving an attribute through the port now emits a
  `qadi.attribute` span, and `qadi.acted` and `qadi.hasRelationship` carry what they
  asked and what came back: the subject, the attribute or event or relation, the
  resource where there is one, and the answer.

  An attribute the **subject** carries emits nothing — that path asks no port, and
  charging the commonest branch for a debug view would be the wrong trade. Short-
  circuiting is untouched: a branch never reached still performs no lookup and now
  emits no span either.

  **The resolved value is never recorded.** `hasActed` and `hasRelationship` answer
  with closed three-valued enums, safe to report. An attribute resolves to arbitrary
  data and a span attribute reaches whatever backend you wired, so `qadi.resolved`
  is a boolean saying a value came back — never the value. This is the line
  `dehydrateDecisions` already draws with `includeTrace`.

  Costs +4.7 µs on a resolver **miss**, measured against a resolver that answers
  synchronously from a record — an upper bound, since that port costs nothing. Most
  of it is the span rather than the annotations, and it is the same cost the other
  two ports have always paid. If it matters to you, the cheapest fix is to put the
  attribute on the subject, where it measurably costs nothing.

  **In `@qadi/devtools`**, `collectPortCalls()` reads those spans back:

  ```ts
  const collector = collectPortCalls();
  // provide `collector.layer` where your evaluations run
  const log = yield * collector.snapshot;
  ```

  Hand `log` to `<DevtoolsDock portCalls={log} />` and the Services panel lists what
  each port was actually asked, beside the counts it already showed. The two are
  differently scoped and the panel says which is which: the counts come from metrics
  and are process-wide, the calls come from spans and are the recent ones this
  collector saw.

  The collector **wraps** the tracer already in scope rather than replacing it, so
  mounting the dock does not turn your application's tracing off. It is bounded at
  200 calls and reports what it dropped.

### Patch Changes

- Updated dependencies [efa3435]
- Updated dependencies [dc767f2]
- Updated dependencies [d251db4]
- Updated dependencies [a61dadc]
- Updated dependencies [f1c6aa5]
- Updated dependencies [50bf38a]
- Updated dependencies [2227e5e]
- Updated dependencies [39b7cbe]
- Updated dependencies [0649129]
- Updated dependencies [f03d75c]
- Updated dependencies [0363a5a]
- Updated dependencies [e2a44d9]
- Updated dependencies [73508bb]
- Updated dependencies [0363a5a]
  - @qadi/core@0.3.0
