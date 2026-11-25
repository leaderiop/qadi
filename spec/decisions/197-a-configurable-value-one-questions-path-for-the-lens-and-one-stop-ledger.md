# ADR-QD-197 — A configurable value, one questions path for the lens, and one stop ledger

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-197                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-25                                     |
> | Status         | Accepted — amends ADR-QD-192 and ADR-QD-193 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-25): Initial (ARCH-131, CCR-QD-476) |

---

## Context

`@qadi/devtools`' React glue stated four facts twice each, and built one record that looks like a fifth.

- **An adapter beside each value's own `configure`.** `useConfigured` took `(make, configure, inputs)`. Its three callers each
  passed a one-line function that only called the value's own `configure`: `configureDock` in `useDockModel`,
  `configureTimeline` in `useTimeline` and `configureDiagnostics` in `useDiagnostics`. `DockModel`, `TimelineFeed` and
  `DiagnosticsFeed` each declare `configure` as a `readonly` function property, so the hook was handed a function the value
  already carried.
- **`move` beside the store's `set`.** `LensSession` had a private `move` whose doc and body were `ExternalStore.set`'s:
  publish the next snapshot when it is not the one held. `choose` kept its own identity check because it answers a boolean.
- **The listed guards handed to `useLens` beside the store it read.** The panel subscribed to the questions store to render
  and passed `snapshot.instances` to `useLens`, whose handlers read the same store through `getSnapshot` when an event
  arrived. One fact reached the adapter by two paths, the render-time argument and the event-time store, and a second caller
  had to repeat the panel's pairing by hand.
- **Two ledger-and-memo pairs and two props interfaces.** `DockFrame` wrote a `useRef<StopLedger<…>>` and the `useMemo` that
  builds a stop notice's props twice, once per feed, under the same comment, and `DiagnosticsNoticeProps` and
  `TimelineNoticeProps` were one shape over two status types.
- **A fresh record every render.** `useTimeline` builds `{ source, capacity }` on each render, which is the pattern a
  reader meets and asks whether to memoise.

None is a defect. Each is a statement made twice that could be made once, and the last needed its answer recorded.

## Decision

1. **`useConfigured` takes a value that has `configure`, through one named constraint.** `Configurable<I>` is
   `{ readonly configure: (inputs: I) => void }`, declared once in `useConfigured.ts` and kept out of both barrels
   ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)). The hook is `useConfigured<A extends Configurable<I>, I>(make, inputs)`
   and reads `built.configure(inputs)` in the scoped build and `value.configure(inputs)` in the layout effect keyed
   `[value, inputs]`: the two calls stay where [ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md)
   decision 8 put them, and removing either regresses the first render.
   - **The member is a function property, not a method signature.** It mirrors how the three values declare `configure`, and a
     property is checked contravariantly under `strictFunctionTypes` where a method is checked bivariantly. The scratch check
     refused every mismatched call in both forms, because TypeScript's weak-type check caught them; the property form is the one
     that does not rest on that check.
   - **Inference was checked with no type argument at the three call sites, as they read at revision `8ff027e1`**:
     `useDockModel.ts:30` in the hook `useDockModel`, `useTimeline.ts:71` in `useTimeline` and `useDiagnostics.ts:44` in
     `useDiagnostics`. A scratch file replaced each three-argument call with the two-argument form, on source equal at
     `8ff027e1` to the tree the check ran on. `useConfigured(makeDockModel, inputs)` infers `DockModel`;
     `useConfigured(makeTimelineFeed, { source, capacity })` infers `TimelineFeed`, with `capacity: number | undefined`
     accepted by `TimelineFeedInputs`' `capacity?: number | undefined`; `useConfigured(makeDiagnosticsFeed, options)` infers
     `DiagnosticsFeed` for `options: DiagnosticsOptions | undefined`. Three calls were refused: a value with no `configure`,
     `makeDiagnosticsFeed` fed a timeline input, and `makeTimelineFeed` fed `{ source: 1 }`.
   - The three call sites lose their adapter, take no type argument and keep their comments, reworded where they named an
     adapter.

2. **The lens session publishes every move through the store's `set`.** `move` is deleted, and `toggle`, `hover`, `cancel` and
   `highlight` call `store.set(next)`, which notifies only when the reference differs. `choose` keeps four things and only its
   publish becomes `set`: it reads `const current = store.getSnapshot()`, answers `false` early when `next === current`, arms
   the reveal with `armed = pickedOf(next)` **before** it publishes, so a listener told of the pick can take its reveal, and
   answers `true` when it was consumed. The `set` in `choose` is reached only with `next !== current`, so its own identity
   check is redundant there and harmless; it lives in `ExternalStore.ts` and adds no mutant to `LensSession.ts`.

3. **`useLens(lens, questions)` takes the session and the questions store and returns both snapshots.** It subscribes to the
   questions store first and the lens second, the order the panel subscribed in before the adapter took both, and returns
   `UseLens`, `{ lens: LensSnapshot; questions: QuestionsSnapshot }`, each exactly as read. The draw effect reads the guards
   from that same subscription and is keyed `[highlighted, instances]`. The listener effect stays keyed
   `[picking, lens, questions]`, and each handler reads `questions.getSnapshot().instances` when its event arrives, so a guard
   that registers while picking adds no listener and is found by the next move and click. The exit effect keyed `[lens]` is
   unchanged. No ref exists, and none is written during render. `QuestionsPanel` calls `useLens(lens, questions)` once and
   reads `.questions` for its blocks and `.lens` for the view, so it holds exactly one subscription to each store.
   [ADR-QD-193](./193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md) decision 6 is amended.

4. **One hook holds a stop ledger, and one props type states a notice's props.** `useStopNotice<S>(status, onRestart):
   StopNoticeProps<S>` in `useStopNotice.ts` holds its own `useRef<StopLedger<S>>(noStops)` and returns a `useMemo` of
   `{ status, onRestart, announced }` keyed on `[status, onRestart]`. `DockFrame` calls it once per feed, so each feed has its
   own ledger, owned by the frame so it outlives every screen, and a second stop re-announces only its own notice. The memo
   follows the feed's `restart` and not the model: each feed's `restart` is one closure per feed, so a model rebuilt after a
   hidden `Activity` carries a new `restart` and the notice moves with it. `StopNoticeProps<S>` is declared once in
   `StoppedBox.tsx` beside `StopLedger<S>`, and `DiagnosticsNoticeProps` and `TimelineNoticeProps` are aliases of it, so the
   notices, their tests and `test/helpers.ts` keep their names. A hook and not a plain helper, because the pair is a `useRef`
   and a `useMemo` that a function that is not a hook cannot own.

5. **`useTimeline` keeps building its inputs record every render, and the memo is a recorded rejection.** Both records below
   are quoted as they read at revision `8ff027e1`, before the adapter was removed, so the claim that the records are fresh by
   construction can be checked from this text. The first is `packages/devtools/src/react/useTimeline.ts:69-71`, in the hook
   `useTimeline`:

```ts
  // The feed compares the source by identity and the capacity by the bound it means, so
  // a record rebuilt every render configures nothing.
  const feed = useConfigured(makeTimelineFeed, configureTimeline, { source, capacity });
```

   The second is `packages/devtools/src/react/DevtoolsDock.tsx:86`, the declaration of the component `DevtoolsDock`, whose
   destructuring builds a fresh `inputs` record each render:

```ts
export const DevtoolsDock: FC<DevtoolsDockProps> = ({ unknownParents, onInvalidate, ...inputs }) => {
```

   The reasons, all four:
   1. **The value's own rule makes a memo a no-op.** `TimelineFeed`'s `configure` returns early on `sameFields` of the
      normalised inputs (ADR-QD-192 decisions 2 and 7), so a fresh record with equal fields publishes and reads nothing. A
      memo would save a function call and buy no behaviour.
   2. **The other records are fresh by construction.** The dock's `({ unknownParents, onInvalidate, ...inputs })` above builds a
      new record each render, and so does a host's `useDiagnostics({})`. A memo there would need the host's cooperation, and
      ADR-QD-192 decision 8 says the hook "decides nothing about whether an input moved".
   3. **Memoising one of three hooks makes them asymmetric.** One of the three would follow a different hand-over rule for no
      observable gain.
   4. **The retry of a failed watch depends on repeated calls.** The gates feed retries on any `configure` (ADR-QD-192
      decision 5, the test titled "G43 (twin of M43): a registry whose subscribe threw is subscribed again by a configure with
      the same registry" in `GatesFeed.test.ts`, and `DockRegistryReads.test.tsx`'s "subscribed again by each build"), and
      `useDockModel`'s per-commit hand-over is what drives it. `useTimeline` never reaches the gates feed, because its
      `configure` is `TimelineFeed`'s, which has no retry, so this is not a dependency of `useTimeline`'s own calls. It is a
      reason not to make memoisation the hooks' rule, and so to keep the three symmetric, which is reason 3.

   The cost of keeping the record is pinned: a re-render of `useTimeline` with a fresh options object holding the same
   capacity and source publishes nothing from the timeline store or the status store, with no options after no options the
   same, and a moved capacity publishes as the control showing the counter can see a publish.

## Alternatives considered

- **Keep the adapter parameter and share one `(v, i) => v.configure(i)` constant.** Rejected: it renames the duplication
  instead of removing it, and the value still carries the function.
- **Fold `configure` back into the constructors.** Rejected: ADR-QD-192 decision 1 refuses it, and a value built with its
  inputs cannot be built before they exist.
- **An inline `{ configure(inputs: I): void }` constraint.** Rejected: it is unnamed at the three call sites and in the type
  test, and it is a method signature, checked bivariantly.
- **A negative `not.toBeCallableWith` pin for the refusal.** Rejected: it costs a counted row in a new file, and an edit to the
  budget and AGENTS.md §6's table together, for a refusal the compile already makes. The refusal is one `@ts-expect-error`
  with its message fragment checked, beside an accepted twin, and counts nothing.
- **Collapse `choose` to `store.set(next); return true`.** Rejected: it changes the consumed answer, which tells the page
  whether to see the click.
- **Arm the reveal after the publish.** Rejected: a listener told of the pick would find nothing armed and the one-shot reveal
  would never fire.
- **Keep `move`.** Rejected: it is a second statement of `set`, and it hosted the two survivors the lens group's mutation run
  found on `move`'s unread boolean.
- **`useLens` subscribing inside while the panel also subscribes.** Rejected: that is two subscriptions to the questions store.
- **A second subscription in the adapter for the event-time read.** Rejected: the handlers read `getSnapshot()` when their
  event arrives, which needs no subscription.
- **`useLens(lens, instances)` with a ref for the handlers.** Rejected: the handlers would read the last render's guards and
  not the store's, and either the listener effect would churn or a ref would be written during render.
- **Keep the three parameters.** Rejected: it is the two-path hand-off this decision removes.
- **One ref holding both ledgers.** Rejected: it couples two independent stop histories, so a second stop of one feed would
  re-announce the other.
- **A memo keyed on `status` alone.** Rejected: a rebuilt model's `restart` would be lost and a Restart would call a feed the dock has dropped.
- **Leave the two copies.** Rejected: each is a ref, a memo and a comment that must change together.
- **Two props interfaces.** Rejected: the hook's return type would then have to be one of them, or a third copy.
- **`useMemo` in `useTimeline` only.** Rejected, for reasons 1 and 3 above: the feed's own rule already makes the record cost
  nothing, and one of three hooks would follow a different rule. The measured evidence that it costs nothing is the pin above.
- **A shallow compare in `useConfigured`.** Rejected: it breaks ADR-QD-192 decision 8, which says the hook decides nothing about
  whether an input moved, and it would swallow the gates feed's retry that `useDockModel`'s per-commit hand-over drives.

## Consequences

- No export is added or removed, so `scripts/check-api-surface.mjs` (gate 13) is unmoved: `Configurable`, `UseLens`,
  `useStopNotice` and `StopNoticeProps` are package-private and `surface.tst.ts` pins each as "no exported member" under both
  entries.
- A host sees no change. The hooks, the session and the notices render, publish and call what they did, and the changeset says
  so: the change is the glue stating each fact once.
- A later value joins `useConfigured` by having a `configure` over its inputs, with no adapter to write.
- No budget moves: no `not.toBeCallableWith` pin, no `switch`, no `Effect.fnUntraced`, no module-scope `let` is added.
- **The mutation record.** Only `LensSession.ts` is under the devtools mutation run's `mutate` glob; deleting `move` removes
  killed mutants and adds none. The React hooks hold no rule of their own after this decision and are judged by their tests,
  the held characterisations and the coverage threshold.

## What enforces it

- Decision 1: `packages/devtools/test/react/useConfigured.test.tsx` (U1 to U4, over a double that carries its own `configure`),
  `packages/devtools/test/react/useConfigured.tst.ts` ("the three values each have configure over their own inputs", "the
  three hooks keep their return types", "a value with no configure is refused, and its twin with configure is accepted"),
  `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx`, and `packages/devtools/test/surface.tst.ts`'s
  refusal of `Configurable` from both entries.
- Decision 2: `packages/devtools/test/model/LensSession.test.ts` ("a listener told of a pick can take its reveal"; "a command
  publishes exactly when the snapshot changes") and the lens group's `stryker.devtools.mjs` run.
- Decision 3: `packages/devtools/test/react/Lens.adapter.test.tsx`'s two subscription pins ("the panel holds one subscription to
  the lens while it is mounted and none after"; "the panel holds one subscription to the questions store while it is mounted
  and none after") and `packages/devtools/test/react/Lens.questions.characterisation.test.tsx` (LQ1 to LQ4).
- Decision 4: `packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx` (DS1 to DS3),
  `packages/devtools/test/react/TimelineNotice.test.tsx` and `packages/devtools/test/react/DiagnosticsNotice.test.tsx`, held.
- Decision 5: `packages/devtools/test/react/useTimeline.inputs.characterisation.test.tsx` (TI1 to TI3),
  `packages/devtools/test/model/GatesFeed.test.ts` (G43) and `packages/devtools/test/react/DockRegistryReads.test.tsx`, both
  held, which is how the gates feed's retry is shown unaffected.
- `packages/devtools/test/surface.tst.ts`'s refusals of `UseLens`, `useStopNotice` and `StopNoticeProps` from both entries.
- The merge gate by command (`pnpm check`), never by number.

## Related

- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — `Configurable`, `UseLens`, `useStopNotice` and `StopNoticeProps` stay out of both barrels
- [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md) — `useScoped`, whose build `useConfigured` taps the value's `configure` onto
- [ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md) — every listener is called, which the lens keeps by publishing through `set` and not through a second statement of it
- [ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md) — decision 8's `useConfigured` takes a value that has `configure`, and the per-render hand-over is kept; amended by this decision
- [ADR-QD-193](./193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md) — decision 6's `useLens` takes the session and the questions store; amended by this decision
- [BEH-QD-734](../behaviors/28-devtools-screens.md#beh-qd-734-the-hooks-configure-inside-the-scoped-build) — the hooks configure inside the scoped build
- [BEH-QD-736](../behaviors/28-devtools-screens.md#beh-qd-736-the-lens-is-a-headless-session-and-a-no-op-publishes-nothing) — the lens is a headless session and a no-op publishes nothing
- [BEH-QD-737](../behaviors/28-devtools-screens.md#beh-qd-737-a-click-is-consumed-only-by-a-pick-that-found-a-guard-decided-in-the-capture-listener) — a click is consumed only by a pick that found a guard
