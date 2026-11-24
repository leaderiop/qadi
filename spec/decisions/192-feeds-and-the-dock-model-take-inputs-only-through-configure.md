# ADR-QD-192 — Feeds and the dock model take inputs only through configure

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-192                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-24                                     |
> | Status         | Accepted — amends ADR-QD-137, ADR-QD-173 and ADR-QD-185 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-24): decision 2: the dock applies the one rule through its feeds, with no comparison of its own beside the catalogue's<br>1.1 (2026-11-24): the behaviours and invariants that state it; DockRegistryReads.test.tsx pins the registry read counts<br>1.0 (2026-11-24): Initial (ARCH-126, CCR-QD-471) |

---

## Context

The timeline feed, the diagnostics feed, the gates feed and the dock model each took their inputs twice: once as the
constructor's argument and again through `configure`. Everything above them restated that, and four defects came out of
it, each a place where one fact was written more than once.

- **Two ways to hand inputs over.** A host could build a feed with its inputs or build it bare and configure it, and the
  two had to agree. The code before ADR-QD-192 agreed only by copying: the dock's build mapped its inputs onto each feed,
  and its `configure` mapped them again, so the timeline's inputs were written at two sites, the gates' at two and the
  diagnostics' at two, and the diagnostics' interval was carried across to the gates in both.
- **The rule for "did an input move?" was written once per feed.** The timeline compared a capacity and then a source,
  the diagnostics feed compared three fields in one condition, the gates feed compared a registry, a thunk and an interval
  in two places and added the retry of a failed watch (G43), and the dock called `refresh()` whatever moved. A field added
  to an input type compiled and restarted nothing. The comparison that already existed for a derived store's key,
  `sameFields` (ADR-QD-185), was module-private and so was not available to them.
- **The dock's inputs were stated three times.** `DevtoolsDockProps`, the `useDockModel` hook's input type and
  `DockModelInputs` each listed the same eight inputs, and each carried its own copy of their doc comments.
- **Three hooks built "build in a scope, then configure in a second effect" by hand.** `useDockModel`, `useTimeline` and
  `useDiagnostics` each built the value with its inputs, which a later configure repeated. A first attempt at removing
  the argument, building bare and configuring in the second effect (fold (c)), committed an unconfigured value for one
  render: the Questions panel's join said "No live guards were handed to the dock" about a dock that had been handed
  some, and `useDiagnostics` read `Starting`, `Off`, `Starting`.

Two consequences of the rule's absence were visible in tests. A `configure` that moved nothing still read the gate
registry (`registry.instances()`) and called the questions thunk, so a dock configured on every host commit would run host
code that may have just thrown, on every commit; and a field on one side of a comparison and absent on the other counted
as a change, so `{ source }` and `{ source, capacity: undefined }` were two inputs.

## Decision

1. **The four constructors take no argument, and `configure` is the only way inputs arrive.** `makeTimelineFeed()`,
   `makeDiagnosticsFeed()`, `makeGatesFeed()` and `makeDockModel()` build bare in the caller's scope. A bare feed is what
   the constructor built when handed `{}` (for the diagnostics feed, `undefined`, which is off), so a bare timeline feed
   reads the empty source as the constructor read it, and "bare" is not a third state beside "configured" and "configured
   with nothing". A bare feed followed by `configure(i)` reaches the state the code before ADR-QD-192 reached by building
   with `i`. `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed` are root exports, so this is a published
   signature change; `makeDockModel` is package-private.
2. **One per-field rule, over one normaliser per input type.** `sameFields` is exported from `ExternalStore.ts`, still out
   of both barrels, and every feed applies it to its inputs; the dock applies it through its feeds and holds no
   comparison of its own beside the catalogue's (decision 9). It is unchanged: values compare with `===`, and
   a field on one side only is a change. `sameFieldsOrAbsent(a, b)` sits beside it for an input that may be absent: absent
   equals only absent, and two present inputs compare with `sameFields`. Each input type has exactly one normaliser,
   declared `(inputs: I) => Required<I>`: `completeTimelineInputs`, `completeDiagnosticsOptions`, `completeGatesInputs` and
   `completeDockInputs`. `configure` normalises its argument first, so an omitted field and a field holding `undefined`
   are one field, and every record the rule compares is complete. Under `exactOptionalPropertyTypes` a record literal
   missing a field of a `Required<…>` type is a compile error, so adding a field to an input type fails `pnpm typecheck`
   at the one line that lists the fields.
3. **A capacity is normalised through `effectiveCapacity`, and a refused one throws before anything moves.** `undefined`,
   an omitted capacity and `DEFAULT_TIMELINE_CAPACITY` are one bound, so moving between them empties nothing and reads
   nothing again. The check is the normaliser's, for the feed and for the dock alike, so ADR-QD-191's rule that the dock
   applies a capacity whole or not at all is kept: the capacity is checked first, then the timeline's `configure` runs
   inside a `try` and everything else is applied in the `finally`, and a listener's throw is rethrown once the rest is
   applied (ADR-QD-177).
4. **Presence is the diagnostics feed's one extra input.** `{}` normalises to the complete
   `{ layer, collector, intervalMillis }` record, so `{}` and `{ layer: undefined }` are the same "on" and `undefined` is
   "off". `configure(undefined)` on a feed that is already off publishes nothing, as ADR-QD-173 decision 8 states.
   `DiagnosticsOptions` accepts `undefined` for each of its three fields, so a host that forwards an optional value can
   hand it over without a conditional spread. That is a widening and breaks no caller.
5. **The gates feed's retry of a failed watch is the rule's one stated exception.** The rule answers "did an input
   move?", and the retry is a second subscription that must fire when nothing moved. `GatesFeed`'s `configure` returns
   early on `sameFields(held, wanted) && watchFailure === undefined`, with a one-line comment saying why. Writing the
   retry into the rule would have needed an "applied" sentinel and blurred what the rule means. G43 keeps its assertions.
6. **A quiet mend is read only by a `configure` that moves an input.** A registry that mended without announcing stays
   `Failed` until it announces, until a tick whose questions changed joins it, or until a `configure` that moves an input
   reads it; a `configure` that moves nothing reads no host code. G44's last stanza and the Questions characterisation's
   case 13 stated the opposite, that any `configure` reads the registry, and each changed with this decision: each was shown
   failing against the gates feed before the rule, and case 13 is retitled "13 a silent mend is not read by a re-render with
   unchanged inputs".
7. **The timeline feed's `configure` has one decision.** Past `sameFields(held, wanted)` the body is
   `try { timeline.resize(wanted.capacity); } finally { readSource(wanted.source); }`. The code before ADR-QD-192 compared
   the inputs a second time (a flag for "the store resized", then `wanted.source !== before.source`), so two places decided
   whether an input moved and the first was redundant. Behaviour is unchanged: past the guard a field moved, a moved
   capacity always resized and so read the source again, and a moved source reads again.
8. **One package-private hook builds in a scope and configures, `useConfigured`.** It is kept out of the barrel
   (AGENTS.md §9) and `useDockModel`, `useTimeline` and `useDiagnostics` are written on it. It is `useScoped`'s build with
   the value's `configure` tapped onto it (fold (a)), so a value is configured inside the scoped build, before `useScoped`
   publishes it, and no reader ever commits an unconfigured value. A layout effect on the value and the inputs record
   configures again after any commit in which the inputs record changed identity; the hook decides nothing about whether
   an input moved, and the value's own rule makes the call a no-op when nothing did. **The latest inputs reach a rebuild
   through the render's own closure, with no ref**: `useScoped`'s build effect has an empty dependency list, and React keeps the
   latest committed `create` for it, so a StrictMode remount and an `Activity` reveal run the build again with the inputs of
   the latest committed render. **A throw from the first `configure` closes the scope**, publishes nothing, and reaches the
   error boundary as the original error, through `useScoped`'s existing `catch`; a refused capacity at construction already
   did the same. `useScoped`'s comment, which said `make` is read once per mount, says that the build runs once per mount
   and that a remount or a reveal runs it again with the latest committed closure.
9. **The dock's inputs are stated once, and mapped in one place.** `DevtoolsDockProps` is
   `DockModelInputs` plus the host's own two props, `unknownParents` and `onInvalidate`, and the hook's separate input type
   is deleted. The eight inputs and their doc comments are declared on `DockModelInputs`, which stays package-private: the
   packed declaration file names it through `DevtoolsDockProps` without a barrel export, so no entry is added and the
   export list is unchanged. `feedInputsOf` maps the dock's complete record onto the three feeds' records and is where the
   diagnostics' interval reaches the gates. `DockModel.configure` calls it once and dispatches in the dock's existing order
   (the timeline, then the catalogue and roles, the ports, the gates, the diagnostics and the shown reading's
   refresh), so the order is written once and the feeds' rules decide whether each restarts. The dock holds one comparison
   of its own, the catalogue, because it moves the dock's rail and roles, not a feed.
10. **A reader subscribed before the first `configure` hears that configure's publishes.** A bare feed or dock is built
    and then configured, so a reader attached in between hears what the configure publishes, where a value built with its
    inputs published nothing to anyone. Measured on a bare dock, the counts are timeline 2, dock 2, explorer 3, simulation 3,
    roles 0, diagnostics 1, timeline status 0, questions 2 and services 1 while the diagnostics layer is still building; a
    layer that builds at once adds the poll's `Live` publish to the diagnostics, questions and services stores, which hear 2,
    3 and 2. The end states are equal, and only the intermediate publishes differ. A React reader never sees them, because
    the hook configures before it publishes; a headless host that subscribes first and configures after does, so it
    configures before it subscribes (the fence below).
11. **The simulation session is left out, for a stated reason.** `makeSimulationSession` and `useSimulationSession` have no
    `configure`: the session has three independent commands, `setSightings`, `seed(entry)` and `setPorts`. `seed` is a
    re-seeding command whose rule is that a host replaying through `session.replay` is never overridden by an unchanged
    `seed` prop, so one `configure` over the three would merge rules that differ by design and change a published member.
    The session's input is read once at build, as ADR-QD-137 decision 1 states, and stays so.

A headless host builds a feed bare and hands it its inputs before it subscribes, so it hears nothing it did not ask for:

```typescript
import * as Effect from "effect/Effect";
import { makeDecisionLog } from "@qadi/core";
import { makeTimelineFeed } from "@qadi/devtools";

/** Builds a timeline feed bare, hands it a source, and only then subscribes. */
export const watchEntries = Effect.fn("example.watchEntries")(function* (report: (line: string) => void) {
  const log = yield* makeDecisionLog({ environment: "Server", capacity: 512 });
  const feed = yield* makeTimelineFeed();
  feed.configure({ source: log });
  report(`${feed.timeline.getSnapshot().entries.length} entries`);
  feed.timeline.subscribe(() => report(`${feed.timeline.getSnapshot().entries.length} entries`));
  return feed;
});
```

## Alternatives considered

- **Fold (c): build bare and configure only in the second effect.** The first commit holds an unconfigured value. It was
  measured: the dock's first reader commit read diagnostics `Off`, gates absent and questions absent, and the join said "No
  live guards were handed to the dock"; `useDiagnostics` went `Starting`, `Off`, `Starting`; and under StrictMode the
  unconfigured commit appeared twice. A throw in the first configure also published the value first and closed its scope
  only when React unmounted the tree. Fold (a) leaves every measured sequence as it was: renders, commits, and the gate
  registry's `subscribe` counts, plain and under StrictMode.
- **A latest-inputs ref, and a render-phase held-fields ref.** A ref written in a layout effect, and one written during
  render that holds the previous fields so an unchanged record keeps its identity, were each measured in every `Activity`
  scenario and equalled the plain closure. The plain closure needs no write site and no ref, and the render-phase ref
  would write during render and restate the rule in the hook, which is the second copy of "did an input move?" this
  decision removes.
- **A guard of the dock's own.** A comparison in `DockModel.configure` before it dispatches would be a fifth statement of
  the rule beside the feeds', and it would have to track every field the feeds compare. Each feed returns early on its own
  rule, and a test per field pins that a `configure` that moves nothing reaches no host code.
- **Retrying a failed registry read on every `configure`.** It keeps the behaviour that any `configure` reads a registry
  that mended quietly, and it runs host code that may have just thrown on every host commit once the dock is configured
  on every commit. The retry of a failed watch stays, because a failed subscription has no other way back.
- **Deep identity for inputs.** A structural comparison of a registry, a thunk or a source cannot be made, and a deep
  comparison of the rest would hide a host that rebuilds an object each render. Identity per field is the rule.
- **A `configure` on the simulation session.** Decision 11.
- **Keeping the constructors' argument beside `configure`.** Two ways in are what produced the second mapping site, the
  restated rule and the build that repeated its configure. A convenience overload would need a first `configure` it
  could not skip.
- **Skipping the bare timeline feed's read of the empty source.** It would make "bare" a third state, neither configured
  nor configured with nothing.
- **An "applied" sentinel that folds the retry into the rule.** Decision 5.

## Consequences

Breaking for `@qadi/devtools`, a minor release marked **Breaking**:

1. `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed` lose their argument. A host that passed inputs builds bare
   and calls `configure` with them; the upgrade guide's section is `0.13: the feeds and the dock model take their inputs
   only through configure`, and the changeset is `.changeset/devtools-feeds-take-inputs-through-configure.md`. The packed
   consumer pins `Parameters<typeof makeTimelineFeed>` and its two siblings as `[]`.
2. A `configure` in which no input moved publishes nothing, restarts nothing and reads no host code, the retry of a failed
   watch excepted. An omitted field and a field holding `undefined` are one field.
3. A reader subscribed before the first `configure` hears its publishes, with the counts of decision 10.
4. `DiagnosticsOptions` accepts `undefined` for each field: a widening.

Three consequences are not breaking and are stated so a host is not surprised:

- **The dock is configured on every host commit.** `DevtoolsDock` hands its inputs over as a record rebuilt each render, so
  `useConfigured`'s effect runs after every commit and each feed's rule makes it a no-op when nothing moved. A registry
  whose `subscribe` throws is subscribed again once per commit, because the retry of a failed watch fires on any
  `configure`.
- **The `instances()` read counts changed.** A `configure` that moves nothing reads no registry, so a healthy
  registry's `instances()` is read once under the hook and twice under StrictMode, where the code before ADR-QD-192 read
  it twice and three times; `subscribe` and live-listener counts are unchanged (1 and 1, 2 and 1), and a failing registry is subscribed
  twice and three times and read never, as before. The first-render characterisation pins the `subscribe` counts and no
  `instances()` count, and the end states are identical. `packages/devtools/test/react/DockRegistryReads.test.tsx` pins the
  read counts through `useDockModel`, plain and under StrictMode, for a healthy and a failing registry, and that a re-render
  holding the same fields reads and subscribes nothing.
- **The hook rests on React re-running an effect with its latest closure.** On the installed React 19.3.1 the build effect
  `useScoped` re-runs on a StrictMode remount or an `Activity` reveal reads the latest committed render's closure although
  its dependency array is empty. If a React release stops doing that, the first reader commit after a reveal holds the
  inputs of the render before it, and `useConfigured.test.tsx` and `ConfigureFirstRender.characterisation.test.tsx` fail
  first: they assert on the first reader commit after a reveal and on the inputs the build itself received. **The fallback
  is a ref written in a layout effect declared before the build effect**, never a render-phase write. The pins run on
  the installed version only; the peer floor, 19.2.4, is not run in CI, because a CI matrix is not part of `pnpm check`.

The rule and the normalisers live in `model/`, where `stryker.devtools.mjs` mutates them, and the hook is thin and covered
by the hook tests and the coverage threshold. ADR-QD-137's account of `useScoped` stands and gains a dated amendment,
ADR-QD-173's decision 1 and ADR-QD-185's decision 2 are each amended in a dated paragraph, and none is rewritten.

## What enforces it

**The rule, per feed and for the dock.** `packages/devtools/test/model/ConfigureRule.test.ts`: for each of the timeline,
diagnostics and gates feeds and the dock, a fresh literal holding the same fields publishes nothing and reads no host code,
an omitted field equals one holding `undefined`, a bare build reads what an empty input read, each input moved alone makes
the feed or the store it reaches react (a table keyed by `Record<keyof Required<I>, Mover>`, so a new field fails the
compile until a row exists), and a build then a configure reaches what a build with the inputs reached. The dock's
cell for a reader subscribed before the first configure pins the counts of decision 10 for both kinds of layer. Each
cell was shown failing against the nearest wrong rule (an always-read or always-restart configure, one field ignored, a
default read as another bound).

**The hook.** `packages/devtools/test/react/useConfigured.test.tsx`: the first commit a child makes reads the value already
configured; a throw on the first build closes the scope and reaches the boundary as itself; a new inputs record configures
once more and the same record configures nothing; a value hidden, handed new inputs and shown again is rebuilt configured
with them, also under StrictMode. Each was shown failing against fold (c), a swallowed throw, a dependency list of the
value alone and a closure held from the first render.

**The first render.** `packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx` was written before the
hooks changed and holds identical on the first commit of the dock and of the feed hooks, plain and under StrictMode,
the first commit after each of three `Activity` reveals, and a first configure that throws. It is held to its first commit
by a recorded hash.

**The registry reads.** `packages/devtools/test/react/DockRegistryReads.test.tsx` mounts a dock through `useDockModel` over a
registry that counts its `instances()` and `subscribe` calls: a healthy registry is read once and subscribed once, and read
twice and subscribed twice under StrictMode; a registry whose `subscribe` throws is read never and subscribed twice, and
three times under StrictMode; a re-render with a fresh inputs record holding the same fields reads and subscribes nothing;
and one that moves an input of the gates feed reads the registry once. It was shown failing against a gates feed whose
early return was removed.

**The sources.** `packages/devtools/test/model/ExternalStore.test.ts` pins `sameFields` and `sameFieldsOrAbsent` and keeps
the two cases that a field on one side only, and a field swapped for one holding `undefined`, are changes.
`packages/devtools/test/model/GatesFeed.test.ts`: G43 pins the retry of a failed watch, and G44's last stanza pins that a
quiet mend stays `Failed` after a `configure` with the same inputs and is read after one that moves `intervalMillis`.
`packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx` case 13 states the same through the panel. M55
and M56 keep the dock's whole-or-nothing capacity and the rethrow after the rest is applied, and TF4, TF14, TF26, TF27 and
TF29 keep how a listener's throw interleaves with the read, all unedited.

**The types.** `packages/devtools/test/model/ConfigureInputs.tst.ts` holds a golden `Required<…>` pin per input type, the
dock's included with the return types of `completeDockInputs` and `feedInputsOf`, and a record literal missing one field,
refused, beside its accepted twin, each shown failing once. `packages/devtools/test/surface.tst.ts` pins `Parameters` of the
three public feeds as `[]` and the dock's ten props. No negative `not.toBeCallableWith` pin is added, so
`NOT_CALLABLE_PIN_BUDGET` and its table in AGENTS.md are unmoved.

**The packed consumer.** `scripts/check-package-install.mjs` (merge gate 14) compiles a consumer that builds each public feed
bare, configures it, pins each constructor's `Parameters` as `[]` and passes a literal of the dock's ten props, so a
constructor that takes an argument again and a `DevtoolsDockProps` the packed declaration cannot name each fail there.
`scripts/check-api-surface.mjs` (merge gate 13) is unmoved, because the export list does not change.

**The mutation floor.** Stryker baselines of `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts` and
`DockModel.ts` were taken at the base through `stryker.devtools.mjs`: 41 of 41, 73 of 73, 117 of 117, 77 of 78 (one
survivor) and 72 of 72 valid mutants detected. The close may not fall below them, and a drop, or the one survivor, is
answered with a test, never with a new baseline.

**The scripts.** `bash spec/scripts/verify-traceability.sh --strict` holds this record's registration, tracing and
revision, `node scripts/spec-revise.mjs --check` holds every revision line, `scripts/check-doc-examples.mjs` compiles the
fence above, and `scripts/check-house-style.mjs` holds its budgets unmoved.

## Related

- [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md) — a devtools session owns its runs through a scope; decision 6's `useScoped` gains `useConfigured` and a corrected premise; amended by this decision
- [ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) — the gates feed's states, which the retry of a failed watch and the quiet mend belong to
- [ADR-QD-169](./169-the-questions-panels-two-host-inputs-are-one-feed.md) — the questions thunk and the registry are one feed's inputs
- [ADR-QD-173](./173-the-devtools-headless-interface-is-its-feeds.md) — the feeds are the headless interface; decision 1's constructors lose their inputs; amended by this decision
- [ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md) — every listener is called and what they threw is rethrown, which the dock's `finally` keeps
- [ADR-QD-185](./185-the-dock-models-computed-stores-are-derived-stores.md) — `sameFields` is the rule a derived store's key already used; decision 2 is amended by this decision
- [ADR-QD-191](./191-a-timeline-store-owns-its-capacity.md) — the capacity is checked first and the dock applies it whole or not at all, which the normalisers keep
- [BEH-QD-731](../behaviors/28-devtools-screens.md#beh-qd-731-the-feeds-and-the-dock-model-are-built-with-no-inputs) — the four constructors take no argument and a bare build equals the empty build
- [BEH-QD-732](../behaviors/28-devtools-screens.md#beh-qd-732-a-configure-in-which-no-input-moved-changes-nothing) — a `configure` in which no input moved publishes nothing and reads no host code
- [BEH-QD-733](../behaviors/28-devtools-screens.md#beh-qd-733-a-failed-watch-is-retried-by-any-configure-and-a-quiet-mend-waits-for-a-moved-input) — the retry of a failed watch, and a quiet mend read by a moved input
- [BEH-QD-734](../behaviors/28-devtools-screens.md#beh-qd-734-the-hooks-configure-inside-the-scoped-build) — the hooks configure inside the scoped build, and the registry reads under them
- [BEH-QD-735](../behaviors/28-devtools-screens.md#beh-qd-735-the-docks-inputs-are-stated-once-and-a-reader-subscribed-before-the-first-configure-hears-that-configure) — the dock's inputs stated once, and what a pre-subscribed reader hears
- [INV-QD-403](../invariants.md#inv-qd-403-a-configure-that-moves-no-input-reaches-no-host-code-the-retry-of-a-failed-watch-excepted) — a configure that moves no input reaches no host code
- [INV-QD-404](../invariants.md#inv-qd-404-every-input-field-is-compared-or-the-package-does-not-compile) — every input field is compared, or the package does not compile
