# ADR-QD-194 — A run of calls applies every call whatever one throws

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-194                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-24                                     |
> | Status         | Accepted — amends ADR-QD-177, ADR-QD-185, ADR-QD-191 and ADR-QD-192 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-24): BEH-QD-741 to BEH-QD-745, INV-QD-407 and INV-QD-408 linked (CCR-QD-473)<br>1.0 (2026-11-24): Initial (ARCH-128, CCR-QD-473) |

---

## Context

[ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md) made every listener of a store run whatever one of
them throws, and rethrow what they threw. The dock model, which a host subscribes to ten times over, still ran its own
commands as a plain sequence of publishing calls, so one throwing listener left the model half-applied, and nothing
repaired it. Six defects came out of that, each seen failing on the code before ADR-QD-194 (the RED tests, by title).

- **`configure` guarded one step.** Only the timeline feed's `configure` sat inside a `try`. The `finally` then ran the
  sightings spread (the explorer's, the simulation's and the dock session's `setSightings`/`setTimeline`), the roles, the
  simulation's ports, the gates feed, the diagnostics feed and the shown reading in a plain sequence, and each of them
  publishes. A host listener that threw on any one of them skipped every later step, and a second throw replaced the
  first. ("DL3 with a throwing roles listener …": `expected false to equal true`, the simulation's Live source option,
  which needs the ports the skipped step hands over; "DL6 with a throwing diagnostics listener …": `expected [] to deeply
  equal [ [ 'g1' ] ]`, the poll was never forked; "DL12 a timeline listener and a roles listener that both throw are
  rethrown as one AggregateError …": the second throw never reached the caller.)
- **It did not heal.** The catalogue step was gated on `wanted.catalogue !== before.catalogue`, and the held inputs were
  assigned first, so an identical second `configure` skipped the step the first one never reached. After an explorer
  listener threw, both calls left the roles `[]`, the explorer and the simulation on different sightings, the dock on a
  stale row and the diagnostics `Off` ("DL4 with a throwing explorer listener …": `expected [] to deeply equal [ 'editor'
  ]`).
- **The record path was the same defect without `configure`.** The dock's own timeline listener called the same
  unguarded spread, so an explorer listener that always threw left the timeline at two entries, the dock at no rows and
  the simulation at no sightings, and each `accept` rethrew it ("DL15 an explorer listener that always throws leaves the
  simulation and the dock on every record the timeline accepts …": `expected [] to deeply equal [ 'r1', 'r2' ]`).
- **The rail was published twice.** A `configure` that changed the capacity and the catalogue spread the rail from the
  timeline's listener and again from the `finally`, and `catalogueOf` builds fresh sightings each call, so the explorer
  and the simulation each heard two publishes ("DL16 a configure that moves the capacity and the catalogue publishes the
  sightings once to the explorer and once to the simulation": received explorer 2 and simulation 2, nothing else
  differed). [BEH-QD-735](../behaviors/28-devtools-screens.md#beh-qd-735-the-docks-inputs-are-stated-once-and-a-reader-subscribed-before-the-first-configure-hears-that-configure)
  and ADR-QD-192's decision 10 encoded the counts 3 and 3.
- **A feed published a status and only then forked its work.** ADR-QD-177's decision 5 left that window between a run's
  `begin()` and its `fork()` out of scope, and a listener that threw on the status left the work unstarted, at three sites
  in the model: the timeline's `Reading`, the diagnostics' `Starting` and the simulation's `Running`. ("TF28 a listener
  that throws on the Reading a restart publishes over a Stopped is rethrown once the read has started": `expected 1 to
  equal 2`, the second read never ran; "F31 a listener that throws on the Starting a configure publishes is rethrown once
  the new poll has started": `expected +0 to be above +0`; "SR6 a subscriber that throws on the Running a run publishes is
  rethrown once the run has started, and the run lands": `expected +0 to equal 1`, the resolver was never asked.) The
  feeds' doc comments and the 2026-11-21 amendment of ADR-QD-177 said so on purpose.
- **The rule was written twice, and a fix would have been a third copy.** `notify` and the derived store's release loop
  each ran every call, collected what was thrown and rethrew through a module-private helper, and the fix to the dock
  would have added a third loop.

## Decision

1. **One function states the rule: `callAll(calls, message)`, in `ExternalStore.ts`.**

   ```ts
   export function callAll(calls: Iterable<() => void>, message: string): void;
   ```

   It calls each thunk in iteration order, each inside its own `try`, keeps every value thrown, and then decides by how
   many threw, never by what was thrown (ADR-QD-177 decisions 2 and 3): none returns, one rethrows that value itself,
   `undefined` and `null` included, and more than one throws one `AggregateError` whose `errors` are the values in call
   order and whose message is the one it was given. An `AggregateError` a call threw is one value like any other and is
   never flattened, and the same value thrown by two calls is two errors. It is exported from the module only, out of
   both barrels (ADR-QD-099), as `sameFields` is. `notify` is `callAll` over the live listener `Set`, so a listener removed
   before its turn is not called and one added during the pass is called in it (BEH-QD-656), never over a copy; the derived
   store's release is `callAll` over its parent releases. Both messages are unchanged: "More than one of the store's
   listeners threw." and "More than one of the store's parent releases threw." The module-private helper that throws what
   was collected is reached only through `callAll`.

2. **`configure` is seven steps, run by `callAll`, in this order.** `completeDockInputs(next)` runs first and outside the
   collector, so a capacity the timeline refuses throws before anything moves, by position and never by reading the error
   (ADR-QD-191 decision 11, M55); the held inputs are assigned next, before the timeline publishes, because the rail's
   key reads the held catalogue. Then:

   | # | Step | Idempotent through |
   | - | ---- | ------------------ |
   | 1 | the timeline feed's `configure` | the feed's per-field rule over its normalised inputs (ADR-QD-192) |
   | 2 | `rail.refresh()` | the derived store's key, compared by identity per field |
   | 3 | the roles list | the held choice's `sameElements` |
   | 4 | the simulation's ports | its identity check |
   | 5 | the gates feed's `configure` | the feed's per-field rule, the retry of a failed watch excepted (ADR-QD-192 decision 5) |
   | 6 | the diagnostics feed's `configure` | the feed's per-field rule |
   | 7 | the shown reading's `refresh()` | the derived store's key |

   The gates come before the shown reading so that one `configure` publishes one join and reads no registry the host has
   just handed away (ADR-QD-185). Every step runs on every `configure`, a no-op through its target's own guard when its
   input has not moved, so the comparison of the held catalogue against the previous one is gone, and an identical
   `configure` after a throwing one leaves every snapshot equal: the model heals. Each step reads the held inputs when it
   runs, never a local taken at entry. The message is exactly "More than one step of the dock's configure threw."; one
   thrower is rethrown as itself and two or more as one `AggregateError` in step order.

3. **The sightings rail is the dock model's fourth derived store.** Its parent is the timeline, its key is `{ shown, catalogue }`
   (the shown timeline snapshot and the held catalogue, each compared by identity) and it computes `catalogueOf` of that
   key. It is built right after the timeline feed and before every other subscription, so it moves first
   ([BEH-QD-697](../behaviors/28-devtools-screens.md#beh-qd-697-a-derived-store-notifies-once-per-change-before-the-listeners-added-after-it)).
   The explorer's `setSightings` and the simulation's `setSightings` are two listeners on it, in that order, and the dock
   session's `setTimeline` is a listener on the timeline subscribed after it. The record path is therefore covered by the
   listener contract: a throwing explorer listener stops neither the simulation nor the dock, and its throw reaches
   whatever published. The closure variables the spread kept, the spread function and its identity guard are deleted. A
   pause toggle republishes the same timeline, so the rail's key does not move; the dock session keeps its own identity
   guard. The double publish is gone by construction: a `configure` that changes the capacity and the catalogue
   recomputes the rail once, in the timeline step, and step 2 finds its key unchanged. The rail is internal and not a
   member of the model, so the ten stores
   [BEH-QD-700](../behaviors/28-devtools-screens.md#beh-qd-700-the-dock-models-stores-are-listed-once) lists are unchanged,
   and `sightings` stays a thunk reading it.

4. **The timeline feed's `configure` is two steps through `callAll`**: the resize, then the read of the held source, each
   reading the held inputs when it runs. The message is exactly "More than one step of the timeline feed's configure
   threw." A listener's throw on the capacity publish and a status listener's throw on the `Reading` the read publishes are
   both kept, the timeline's first, and the read starts. A refused capacity still throws from the normaliser before
   anything moves.

5. **The window between a status and its fork is closed: the work a status announces starts whatever a listener throws on
   it, and the throw is rethrown after it started.** At the three publish-then-fork sites (`readSource`'s `Reading`,
   `DiagnosticsFeed.start`'s `Starting`, the simulation's `Running`) the two calls are `try { publish } finally { fork }`,
   not `callAll`. `SupersedingRun`'s `fork` returns a boolean and hands the run to a fiber, so it does not throw: a run's
   failure is its exit, reported through `onFailure`. Only the publish can throw, so a `callAll` there would carry a
   message that no execution could make appear, and the Stryker mutant of that literal could never be killed. The
   behaviour is the same as `callAll`'s for one thrower, which is the only case that exists. This was decided autonomously
   at planning on 2026-11-24, under the owner's standing instruction to pick the most complete and clean option. The
   publish stays before the fork, because the fork's synchronous prefix may already reach `Live` or `Stopped`, and `fork`
   still refuses a token a subscriber superseded. The gates feed forks its cadence before it publishes, so its window was
   already closed, and a test pins that (G49). `callAll` is used wherever two or more calls can throw: `notify`, the derived
   release, `DockModel.configure` and `TimelineFeed.configure`.

6. **A nested `configure` decides the end state.** A listener that calls `configure(second)` from inside a step runs a
   whole nested `configure`, and the outer call's remaining steps then read the nested inputs, so the model ends where a
   plain `configure(second)` on a fresh model ends (DL17). The same holds inside the timeline feed: its read step reads the
   held source (TF37).

### What changes, and the test that pins it

The counts are those measured on the code before ADR-QD-194 and on the code after it.

| Behaviour | Before | After | Test |
| --------- | ------ | ----- | ---- |
| A throwing listener on any one of the ten stores during `configure` | every later step skipped; roles `[]`, diagnostics `Off`, no poll, no read | every input applied; the throw rethrown as itself; an identical `configure` changes nothing | DL1 to DL10, DL13, DL14 |
| Two listeners throwing in one `configure` | the second replaced the first | one `AggregateError`, in step order, with the dock's message | DL12 |
| Every store a built model exposes has a row | not asserted | a store added later is a failing row | DL11 |
| A throwing explorer listener on the record path | the timeline held both entries, the dock and the simulation stayed on the first | the dock and the simulation follow every record; each `accept` rethrows | DL15 |
| Capacity and catalogue changed in one `configure`: explorer, simulation | 2 and 2 | 1 and 1 | DL16 |
| CR22's counts, building: timeline, dock, explorer, simulation, roles, diagnostics, timeline status, questions, services, lens | 2, 2, 3, 3, 0, 1, 0, 2, 1 and 0 | 2, 2, 2, 2, 0, 1, 0, 2, 1 and 0 | CR22, restated |
| CR22's counts once the poll has built | 2, 2, 3, 3, 0, 2, 0, 3, 2 and 0 | 2, 2, 2, 2, 0, 2, 0, 3, 2 and 0 | CR22, restated |
| A listener that configures the dock from inside a step | the nested model held the outer call's gates, collector and Live option | the model equals a fresh model configured once with the nested inputs | DL17 |
| A listener that throws on the `Reading` a restart publishes over a `Stopped` | status `Reading`, no read started | rethrown as itself; the read starts (two reads) | TF28, flipped |
| A timeline listener and a status listener that both throw on a capacity change over a `Stopped` read | the status listener's throw replaced the timeline listener's and no read started | one `AggregateError`, the timeline's first; the read starts | TF29, flipped |
| A nested `configure` of the timeline feed during a capacity change | the outer read step took its entry-time source and read the outer source | the read step reads the held source | TF37 |
| A listener that throws on the `Starting` a diagnostics `configure` publishes | the feed stayed `Starting`, no poll started | rethrown as itself; the poll starts and reaches `Live` | F31, flipped |
| A subscriber that throws on the `Running` a simulation run publishes | the resolver was never asked | rethrown after the run started; the run lands | SR6 |
| The gates feed's window | closed already (fork before publish) | closed, and pinned | G49 |

Only the explorer's and the simulation's counts moved in CR22, and no other store's count changed, so the rail's two
listeners account for the whole difference.

## Alternatives considered

- **Export the module-private helper and keep the loops.** Rejected: the loop is the rule, so three loops are three
  chances for the rule to drift, and the dock would have been the third.
- **A local copy of the rule in `DockModel.ts`.** Rejected for the same reason, and because a copy outside
  `ExternalStore.ts` cannot be held to its messages by the store's tests.
- **Keep the spread and wrap its three calls in `callAll`.** Rejected: it keeps the closure state the spread needed and the
  double publish, and is a third shape of the same rule beside `notify` and the dock's steps.
- **A flag recording that the spread ran.** Rejected: a throw partway through marks it done, and a nested `configure`
  corrupts the flag, so it cannot tell the second pass what is left.
- **Record the window between a status and its fork as staying.** Rejected: the claim that every input is applied whatever
  a listener throws would be false for the diagnostics, services, questions and timeline-status listeners.
- **Close the window for the diagnostics feed only.** Rejected: one rule stated as closed, with two sites still open.
- **`callAll` with a message at a publish-then-fork site.** Rejected: the fork cannot throw, so the message is a literal
  nothing can read and its mutant survives for a reason no test can remove. `try`/`finally` says what the site does.
- **Keep the catalogue comparison and fix only the throw.** Rejected: it is why an identical `configure` did not heal, and
  every step is already idempotent through its target.
- **Entry-time locals for each step.** Rejected: a nested `configure` would be undone by the outer call's remaining steps.

## Consequences

- One helper changes shape and one is added; no export moves, so gates 13 and 14 are unmoved. The release note is a patch
  for `@qadi/devtools`: a defect fix. No upgrade-guide entry.
- A publishing call of the model (`configure`, a record, a resize, a restart, a poll) throws what the listeners threw once
  every step has run: one `AggregateError` where the code before ADR-QD-194 threw the first listener's value, and only
  when two or more threw.
- The counts of
  [BEH-QD-735](../behaviors/28-devtools-screens.md#beh-qd-735-the-docks-inputs-are-stated-once-and-a-reader-subscribed-before-the-first-configure-hears-that-configure)
  and ADR-QD-192's decision 10 are 2, 2, 2, 2, 0, 1, 0, 2, 1 and 0 while the diagnostics layer is still building, and 2,
  2, 2, 2, 0, 2, 0, 3, 2 and 0 once the poll has built.
- **What stays.** A throw on a gates tick's publish, inside the questions cadence's run, still ends that cadence: it is
  that run's own failure, not a window between a status and a fork. A listener that changes the inputs on every
  notification does not terminate, as with any store.
- **The mutation record.** Stryker baselines of `ExternalStore.ts`, `DockModel.ts`, `TimelineFeed.ts`,
  `DiagnosticsFeed.ts` and `SimulationSession.ts` were taken at the base through `stryker.devtools.mjs`, before any source
  edit: 88 of 88, 69 of 69, 35 of 35, 58 of 58 and 242 of 248 valid mutants detected (six survivors in the simulation
  session). The close is taken with the same invocation and may not fall below them; a drop is answered with a test,
  never with a new baseline.

## What enforces it

- `packages/devtools/test/model/ExternalStore.callAll.test.ts`: the rule on its own (none, one, undefined, null, several in
  call order, one value twice, an `AggregateError` kept whole, a live set).
- `packages/devtools/test/model/DockModel.listeners.test.ts`: DL1 to DL17, one row per store a built model exposes, the two
  throwers, the record path, the single publish and the nested `configure`.
- `packages/devtools/test/model/TimelineFeed.test.ts`: TF28, TF29 and TF37. `DiagnosticsFeed.test.ts`: F31.
  `SimulationSession.runs.test.ts`: SR6. `GatesFeed.test.ts`: G49.
- `packages/devtools/test/model/ConfigureRule.test.ts`: CR22's restated counts. `DockModel.test.ts`: M55 and M56, unedited.
- The Stryker record of the five files, and `scripts/check-house-style.mjs`, whose budgets do not move: the change adds no
  `switch`, no `Effect.fnUntraced`, no `any` and no module-scope `let`.

## Related

- [ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md) — the listener contract; its rule is stated once as `callAll` and its decision 5 is closed; amended by this decision
- [ADR-QD-185](./185-the-dock-models-computed-stores-are-derived-stores.md) — the derived stores; the rail is the fourth; amended by this decision
- [ADR-QD-191](./191-a-timeline-store-owns-its-capacity.md) — a refused capacity throws before anything moves, and the `try`/`finally` of decisions 6 and 11 is `callAll`; amended by this decision
- [ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md) — one per-field rule per feed, whose every step is a no-op on held inputs; the `try`/`finally` of decisions 3 and 7 is `callAll`; amended by this decision
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — `callAll` stays out of both barrels
- [BEH-QD-741](../behaviors/28-devtools-screens.md#beh-qd-741-a-dock-configure-applies-every-input-whatever-a-listener-throws),
  [BEH-QD-742](../behaviors/28-devtools-screens.md#beh-qd-742-what-the-steps-of-a-configure-threw-surfaces-once-after-the-last-step),
  [BEH-QD-743](../behaviors/28-devtools-screens.md#beh-qd-743-the-sightings-rail-is-a-derived-store-so-a-record-moves-its-readers-whatever-a-listener-throws),
  [BEH-QD-744](../behaviors/28-devtools-screens.md#beh-qd-744-the-work-a-status-announces-starts-whatever-a-listener-throws-on-that-status),
  [BEH-QD-745](../behaviors/28-devtools-screens.md#beh-qd-745-a-configure-made-from-inside-a-step-decides-the-end-state-and-a-listener-that-always-reconfigures-never-ends),
  [INV-QD-407](../invariants.md#inv-qd-407-a-configure-leaves-no-input-unapplied-whatever-a-listener-throws) and
  [INV-QD-408](../invariants.md#inv-qd-408-work-a-status-announces-is-started-whatever-a-listener-throws-on-it), which state the change
