# ADR-QD-191 — A timeline store owns its capacity

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-191                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-24                                     |
> | Status         | Accepted — amends ADR-QD-137                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-24): Initial (ARCH-125, CCR-QD-470) |

---

## Context

`makeTimelineStore` read its capacity once, when it was built, and `emptyTimeline` is the one place the capacity rule is
stated: a non-negative integer, or the error it throws. A store could not change its own bound, so everything above it
worked around that, and each workaround left a defect behind.

The timeline feed built a store per capacity and handed the host something else. It kept a mutable inner store that it
rebuilt on every capacity change, a second store that outlived each inner one and was fed by a listener on it, and a
forwarder of six members restating the whole `TimelineStore` interface. So the store a host held was not the store the
read fed, and the inner store a capacity change dropped was dropped without unsubscribing from it. The idle stand-in
wrote the six members a third time.

Four defects came out of that shape, each seen failing on the code before ADR-QD-191 (the RED tests, by title):

- **A refused capacity left the feed half-applied.** `configure` assigned its inputs and only then built the store at
  the new capacity, so a capacity `emptyTimeline` refuses threw with `inputs` already naming it. A later `configure` with
  the inputs the feed had held compared equal and did nothing, and a `restart` read a source the feed never read ("TF30
  a capacity that is not a non-negative integer throws and changes nothing, so a later configure compares with the
  inputs the feed held": `refusal 2 throws: expected false to be true`; "TF31 a restart after a refused configure reads
  the source the feed held": `expected { reads: 1 } to deeply equal { reads: +0 }`).
- **The dock was half-applied one level up.** `DockModel.configure` assigned its inputs and then called the feed's
  `configure`, so a refused capacity left the dock holding inputs it never applied, and a timeline listener that threw on
  a capacity change left the catalogue, roles, ports, gates and diagnostics unapplied ("M55: a capacity the timeline
  refuses throws and changes nothing in the dock, so a later configure compares with the inputs the dock held":
  `expected 6 to equal +0`; "M56: a timeline listener that throws on a capacity change is rethrown once the dock has
  applied the rest of the configure": `expected [] to deeply equal [ 'editor' ]`).
- **A capacity was compared by identity.** An omitted capacity and `DEFAULT_TIMELINE_CAPACITY` mean one bound, yet moving
  between them rebuilt the store, emptied the review and read the source again.
- **A zero-capacity timeline returned a new value for every record.** `bound` built a fresh timeline whether or not
  anything was kept, so a store notified and a feed re-rendered for records it kept nowhere ("a record a zero-capacity
  timeline cannot keep returns the identical timeline": `expected { entries: [], capacity: +0 } to equal { entries: [],
  capacity: +0 }`; "a record at a capacity of zero notifies no subscriber and keeps the snapshot": `expected 2 to equal
  +0`; "TF32 a zero-capacity feed tells its timeline listeners nothing for records it cannot keep": `expected 2 to equal
  +0`).

Two more sites kept the captured-once shape. The hand-fed `useTimelineStore` kept the capacity of its first render in
`useState`, so a host that changed `capacity` was silently ignored ("UT4 a changed capacity empties the hand-fed store at
the new bound and keeps the store": `expected 5 to equal 1`), and `clear` rebuilt the empty timeline from the options the
store was constructed with, which after a resize would restore the old bound.

## Decision

1. **`TimelineStore.resize(capacity): boolean` is the store's own command.** It builds the new empty timeline
   through `emptyTimeline` first, so an invalid capacity throws that error before any field of the store moves: the
   timeline, a pause's frozen view and the subscribers are untouched and nothing is published. The capacity the store
   already holds is a no-op that answers `false`: it publishes nothing, keeps the entries and keeps a pause. Any other
   capacity empties the timeline at the new bound, releases a pause, publishes once and answers `true`. A listener's
   throw on that publish follows the store's contract (ADR-QD-177) and is rethrown after every listener ran.
2. **The effective capacity is the store's.** The store compares the requested number with its timeline's `capacity`, so
   a feed reads an omitted capacity as `DEFAULT_TIMELINE_CAPACITY` through one function, `effectiveCapacity`, and an
   omitted capacity and the default are one bound. `effectiveCapacity` is exported from `TimelineFeed.ts` for the dock
   and kept out of the package barrel, so `scripts/check-api-surface.mjs` (gate 13) does not move.
3. **A record a zero-capacity timeline cannot keep returns the identical timeline.** `bound` returns the timeline it was
   given when nothing is kept and nothing was held, so the store's existing identity check in `accept` is the one place a
   non-change stops costing a render. The rule is stated in `Timeline.ts`, not in `accept`. A timeline that holds entries
   over a zero bound is still emptied, as a new value.
4. **A resize releases a pause, and only a resize that changes the capacity does.** A new capacity releases a pause and
   shows the emptied live timeline. The held capacity keeps the pause and the frozen view, and so does a refused one.
5. **The feed holds one store for its life and returns it.** `makeTimelineFeed` builds one store at the effective
   capacity and `timeline` is that object, so a host's subscription survives a capacity change. The per-capacity builder,
   the replaceable binding, the second store, its listener and the forwarder are gone, and a capacity change is that
   store's `resize`.
6. **The feed's `configure` checks the capacity before it moves anything.** The closed guard comes first, then
   `effectiveCapacity`, then the inputs are assigned, and past the check `resize` throws only from its publish. The feed
   reads again when the store resized or the source moved, in a `finally` around `resize`, so what a listener throws on
   the capacity publish is rethrown once the read that refills the timeline has started (ADR-QD-177). A refused capacity
   throws with the inputs, the timeline and the read as they were.
7. **The idle store's `resize` answers `false`.** The stand-in is inert: it changes nothing, is never paused and is never
   fed, so `accept`, `clear`, `resize` and `setPaused` do nothing.
8. **`useTimelineStore` follows its `capacity` option.** The hook builds its store at the option, or at
   `DEFAULT_TIMELINE_CAPACITY` when it is omitted, keeps that one store for its life and calls `resize` from a layout
   effect keyed on the store and the capacity, never during render. Its first run is a no-op because the store was built
   at that bound, and the hand-fed reading (`Reading`, an inert `restart`) is unchanged.
9. **`clear` empties at the held capacity.** It builds the empty timeline from the timeline's own `capacity`, and no
   option captured at construction survives in the store.
10. **A resize publishes with `publish`, not `set`.** A listener that reads `isPaused` must hear a pause's release even
    where the new snapshot would compare equal to the old one, so the rule does not lean on the new value's identity.
11. **The dock applies a capacity whole or not at all.** `DockModel.configure` checks the capacity through
    `effectiveCapacity` before it moves anything, so the rule stays stated once, in `emptyTimeline`, and the dock holds no
    check of its own. A refused capacity throws with the dock's inputs, catalogue, roles, ports, gates and diagnostics
    untouched, and a later valid `configure` compares with the inputs the dock held. Past the check it assigns its
    inputs, calls the timeline feed's `configure` inside a `try`, and applies the catalogue, the roles, the ports, the
    gates, the diagnostics and the shown reading in a `finally`. Past the check that call throws only from a listener on a
    publish it has already made, so that throw is rethrown once every other input is applied (ADR-QD-177). The dock tells
    a refusal from a listener's throw by position, never by reading the error.

At run time a missing or `null` capacity reads as `DEFAULT_TIMELINE_CAPACITY`, and any other value that is not a
non-negative integer is refused: `-1`, `2.5`, `NaN`, `Infinity`, a string and a bigint each throw `emptyTimeline`'s
error, and `-0` and `0` are the capacity zero.

## Alternatives considered

- **Keep the forwarder and fix its gaps.** Two stores stay, and every member the forwarder restates is a member that can
  drift from the store under it, which is how the defects above arrived.
- **Replace the hand-fed store per capacity (`useMemo` keyed on it).** It drops the store a host holds and the
  subscriptions on it, which is the identity the feed's one store keeps.
- **Compare capacities by identity.** An omitted capacity and the default are one bound, and an identity comparison reads
  them as two and empties a review for nothing.
- **Check only inside `resize` and catch in `configure`.** The feed's inputs and the dock's would have moved first, so a
  caught refusal still leaves them half-applied.
- **A `setCapacity` returning nothing.** The feed could not tell whether the store changed, so it could not tell whether
  to read again, and it would restate "effective capacity" beside the store, which is the duplication this decision
  removes.
- **Release the pause without publishing.** A second subscription that reads `isPaused` would miss the release.
- **Truncate on a smaller capacity, or keep entries on a larger one.** A different feature with its own decisions about
  which entries survive; a resize empties, as the rebuild it replaces did.
- **A `capacity === 0` special case in `accept`.** It would state a rule of the timeline outside `Timeline.ts`.
- **Leave the dock to its later input-mapping rewrite.** The defect ships in the meantime, the rewrite would have no rule
  to keep, and the refused capacity is the same one that already must change nothing anywhere.
- **Let the dock restate the integer check.** Two statements of one rule drift apart, and the dock would be the second.
- **Tell a refusal from a listener's throw by reading the error.** The error's text is not a contract, and the order of
  the checks already tells them apart.

## Consequences

Breaking for `@qadi/devtools`, a minor release marked **Breaking**:

1. `TimelineStore` gains a required `resize`, so an object a host writes as a `TimelineStore`, a test double or a
   wrapper, needs one.
2. Moving between an omitted capacity and `DEFAULT_TIMELINE_CAPACITY` keeps the timeline and reads nothing again.
3. A refused capacity throws from the feed's `configure` and the dock's `configure` with their inputs unchanged.
4. A timeline listener's throw on the dock's capacity change is rethrown after the dock applied the rest.
5. A zero-capacity view publishes nothing for records it cannot keep.
6. `useTimelineStore` follows a changed `capacity`: it empties its store at the new bound and releases a pause.

The upgrade guide section is `0.13: a timeline store owns its capacity`, and the changeset is
`.changeset/devtools-timeline-store-owns-its-capacity.md`.

The store a host holds is the store the scoped read feeds, for the scope's whole life. ADR-QD-137's account of the
timeline's read stands and gains a dated amendment pointing here, and the feed's `timeline`, which was a forwarder, is
the store.

## What enforces it

**The store.** `packages/devtools/test/model/TimelineStore.test.ts`: the `resizing` describe (a new capacity, the held
capacity, a paused store with a new and with the held capacity, each refused value on a paused store, zero and negative
zero, one listener's throw as itself and two as one `AggregateError`, a re-entrant resize, and a missing, `null`, string
and bigint capacity), "a clear after a resize keeps the capacity it was resized to", and "a record at a capacity of zero
notifies no subscriber and keeps the snapshot". `packages/devtools/test/model/Timeline.test.ts` holds "a record a
zero-capacity timeline cannot keep returns the identical timeline" and the capacity-zero cases.

**The feed.** `packages/devtools/test/model/TimelineFeed.test.ts`, TF30 to TF36: a refused capacity changes nothing, a
restart after a refusal reads the source the feed held, a zero-capacity feed tells its listeners nothing, an omitted
capacity and the default are one bound, a listener added before two capacity changes hears each emptied timeline once, a
capacity change while paused releases the pause, and the idle store answers any resize with `false`. TF4, TF14, TF26,
TF27 and TF29, which pin how a listener's throw interleaves with the read, pass unedited.

**The dock.** `packages/devtools/test/model/DockModel.test.ts`, M55 and M56: a refused capacity throws and changes
nothing in the dock, and a timeline listener's throw is rethrown once the rest of the configure is applied. Each was shown
failing against its half of the fix, M55 with `effectiveCapacity` replaced by a plain read of `next.capacity` and M56 with the `try` and
`finally` unwrapped.

**The hook.** `packages/devtools/test/react/useTimeline.test.tsx`, UT4 and UT5: a changed capacity empties the hand-fed
store at the new bound and keeps the store, and a re-render with the same capacity, or none after none, keeps its
entries.

**The types.** `packages/devtools/test/surface.tst.ts` pins `TimelineStore["resize"]` as `(capacity: number) => boolean`
and that a store without it is not a `TimelineStore`, each shown failing once.

**The mutation floor.** Stryker baselines of `Timeline.ts`, `TimelineStore.ts`, `TimelineFeed.ts` and `DockModel.ts` were
taken at the base through `stryker.devtools.mjs`: 107 of 107, 32 of 33 (one survivor), 50 of 50 and 70 of 70 valid
mutants detected. The close may not fall below them, and a drop is answered with a test, never with a new baseline.

**The scripts.** `scripts/check-api-surface.mjs` (gate 13) is unmoved, because the export list does not change;
`scripts/check-house-style.mjs` holds its budgets unmoved; `bash spec/scripts/verify-traceability.sh --strict` holds
this record's registration, tracing and revision.

## Related

- [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md) — a devtools session owns its runs through a scope; amended by this decision
- [ADR-QD-173](./173-the-devtools-headless-interface-is-its-feeds.md) — the feeds are the headless interface, and `TimelineFeed` is exported from the root
- [ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md) — every listener is called and what they threw is rethrown, which a resize's publish and the dock's `finally` keep
- [ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md) — the superseding run behind the feed's read, kept as it is
- [ADR-QD-168](./168-a-port-card-is-a-model-row.md) — the dock model's stores that a configure applies
- [BEH-QD-726](../behaviors/28-devtools-screens.md#beh-qd-726-a-timeline-store-resizes-itself-and-answers-whether-it-did) — a timeline store resizes itself and answers whether it did
- [BEH-QD-727](../behaviors/28-devtools-screens.md#beh-qd-727-a-timeline-feed-holds-one-store-for-its-life) — a timeline feed holds one store for its life
- [BEH-QD-728](../behaviors/28-devtools-screens.md#beh-qd-728-a-capacity-the-timeline-refuses-changes-nothing-in-configure) — a capacity the timeline refuses changes nothing in `configure`
- [BEH-QD-729](../behaviors/27-devtools-timeline.md#beh-qd-729-a-record-a-zero-capacity-timeline-cannot-keep-changes-nothing) — a record a zero-capacity timeline cannot keep changes nothing
- [BEH-QD-730](../behaviors/28-devtools-screens.md#beh-qd-730-the-hand-fed-timeline-store-follows-its-capacity-option) — the hand-fed timeline store follows its capacity option
- BEH-QD-465, BEH-QD-636 and BEH-QD-205, which the records above restate
- [INV-QD-401 and INV-QD-402](../invariants.md) — a capacity the timeline refuses changes nothing, and a timeline feed hands its host one store for its life
