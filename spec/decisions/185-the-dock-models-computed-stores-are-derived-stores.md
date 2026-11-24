# ADR-QD-185 — The dock model's computed stores are derived stores

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-185                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-11-22                                     |
> | Status         | Accepted — extends ADR-QD-168, amends ADR-QD-047, corrects ADR-QD-169; amended 2026-11-24 (sameFields is exported and applied by the feeds and the dock, ADR-QD-192) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-11-24): amended by ADR-QD-192 (CCR-QD-471)<br>1.2 (2026-11-22): decision 7 states what a parent whose subscribe throws and a release that throws each do (CCR-QD-464)<br>1.1 (2026-11-22): correction — key equality is over own enumerable string-keyed fields, the finalizer is registered before the parents are subscribed, and the store-list test lists the model's members and is kept equal to BEH-QD-700 by review (CCR-QD-464)<br>1.0 (2026-11-22): new — the dock model's three computed stores are derived stores (ARCH-119, CCR-QD-464) |

---

## Context

The dock model computed three stores by hand: the shown reading (the diagnostics store),
the questions join and the services view. Each kept its own last key in a `let`, compared
it field by field in hand-written code, and subscribed itself to its parents. The questions
and services stores also checked a closed flag that the shown reading did not, so a closed
model still merged a later reading into the diagnostics store.

A key field added to a compute's input and missed by the hand compare would leave a store
stale with nothing failing: the type still compiled and the store stopped recomputing when
that field changed.

The number of stores was stated in five places: ADR-QD-047's amendments, ADR-QD-162,
ADR-QD-168, BEH-QD-465 and the header of `DockModel.ts`. Each new store meant a new
sentence in each, and the ordinals drifted from one another.

## Decision

1. **One scoped constructor in `ExternalStore.ts`: `makeDerivedStore({ parents, key,
   compute })`**, an `Effect.fn("qadi.devtools.makeDerivedStore")` returning
   `Effect<DerivedStore<A>, never, Scope.Scope>`. `parents` is a non-empty tuple of
   `Parent`, which is anything with `ExternalStore`'s `subscribe`. `key` is a thunk read on
   every trigger, because a key may read the model's own inputs, which `configure` assigns
   before the feeds publish, so that one `configure` publishes one join. `compute` runs once
   at construction without notifying. `DerivedStore<A>` is the read half plus `refresh()`,
   the trigger for a key input that is not a parent.
2. **Key equality is per-field identity** over the own enumerable string-keyed fields of
   both keys, by one module-private comparison, `sameFields`. A field on one side only is
   a change, and values compare with `===`, as `set` compares them. A field that is
   inherited, non-enumerable or symbol-keyed is not part of the key and is not compared.
3. **What enforces what.** The compiler refuses a key type with an optional field
   (`K extends object & Required<K>`), an empty parent list, and a compute reading a field
   outside its key; a key reader typed with the compute's input type is refused when it
   misses a field. A test pins per-field recompute and keys of other shapes. Neither
   enforces that a compute reads only its key: a compute that closes over state outside
   its key compiles and passes, and the doc comment says so. The dock's three computes are
   module-scope functions of their key.
4. **The read half has one name, `ReadableStore<A>`**, used at every site that spelled it
   as a `Pick` of `ExternalStore`, so one type is not spelled two ways.
5. **On a trigger with an unchanged key nothing runs.** Otherwise the store computes, then
   commits the key, then `set`s. A throwing compute commits nothing, and the next trigger
   recomputes. A change notifies once, or not at all when the compute returns the
   reference already held. A refresh from inside the store's own listener sees the
   committed key, so one change does not notify twice.
6. **ADR-QD-177 holds unchanged for the store's listeners**, and is pointed at rather than
   restated. The store's refresh is a listener in each parent, subscribed in the listed
   order at construction, so it moves before every listener added after it, and a throw
   from its listeners enters the parent's loop as one value.
7. **A finalizer in the caller's scope releases every parent and stops the store.** It is
   registered before the parents are subscribed. A parent whose `subscribe` throws while
   the store is built fails the build with that throw as a defect and returns no store, and
   closing the scope releases every parent subscribed before it. After the scope closes
   there is no key read and no compute, `refresh` does nothing, the last snapshot is kept,
   and `subscribe` registers but nothing notifies. The finalizer releases every parent even
   when a release throws, and then fails the close with what was thrown, one value as itself
   and more than one as one `AggregateError`: ADR-QD-177's rule for listeners, chosen over
   the gates feed's swallowing of a release because the gates feed's registry is the host's
   and every parent here is the package's own store, so a release that throws is a defect
   the close can state. A parent's `subscribe` must return a release that cannot throw. The
   rule is the same for all three stores, so a closed model's diagnostics store no longer
   merges a later reading: closing the scope ends what the model started
   ([ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md)), and
   `DiagnosticsFeed`'s `configure` already refuses a command on a closed feed. The dock
   never hands a closed model, so nothing it shows changes.
8. **`ExternalStore.ts` stays out of the barrel**
   ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)); the root export count and
   `spec/overview.md` do not change. The timeline fan-out is not a computed store, because
   it pushes a command into the explorer, the simulation and the dock session, and
   `sightings` is a thunk, so neither moves onto it.
9. **The dock model states each store's parents, key and compute and nothing else.**
   `shownReading` has the diagnostics feed as its parent, the feed's snapshot and the
   supplied reading as its key, and the module-scope `mergedOf` as its compute.
   `questions` has the gates feed and `shownReading` as parents, `JoinKey` as its key and
   the join as its compute. `services` has `shownReading` as its parent, `ServicesInput` as
   its key and `portCards` as its compute. They are built in that order, and `configure`
   refreshes `shownReading` where it once re-merged by hand. `DockModel.ts` holds no last
   key and no closed state.
10. **The store count is stated once, in
    [BEH-QD-700](../behaviors/28-devtools-screens.md#beh-qd-700-the-dock-models-stores-are-listed-once)**,
    as the list of `DockModel` members that have `subscribe` and `getSnapshot`. A test of a
    built model lists the members that have both and fails when one is added or removed;
    the list there and the list in BEH-QD-700 are kept equal by review, not by a gate.
    ADR-QD-047 and BEH-QD-465 get one dated
    amendment each pointing at it; ADR-QD-162, ADR-QD-168 and ADR-QD-169 get dated notes;
    every earlier amendment and change-history cell is kept as written (AGENTS.md §15).
11. **The model, not a panel `useMemo`, is where a computed view lives**, as
    [ADR-QD-168](./168-a-port-card-is-a-model-row.md) said of the port cards. A computed
    store belongs to the model and is built as a derived store.

This decision and its shape were decided autonomously on 2026-11-22 under the owner's
instruction to take the most complete, clean option: the shown reading stopped after
close like the other two (decision 7) rather than kept as a second rule, and the key read
as a thunk (decision 1) rather than held in stores `configure` sets last.

## Alternatives considered

- **`Data.struct` keys compared with `Equal.equals`.** Rejected: in effect v4 it compares
  plain objects and arrays structurally, so it would deep-compare the gates snapshot's
  guard arrays and policies on every tick, and it would turn the identity rule the model
  pins into a structural one.
- **A record of per-field readers.** Rejected: the type of its result cannot be built
  without a cast.
- **A key schema.** Rejected: a schema is a codec for an untrusted boundary
  (AGENTS.md §7), and a key crosses none.
- **Key inputs held in stores that `configure` sets last.** Rejected: the questions join
  would publish twice for one `configure`, once when the gates feed publishes and once
  when the reading lands.
- **One derived store per feed.** Rejected: the questions join reads two parents, and a
  store per feed would need a second store to join them.
- **Making the derived store public.** Rejected: it freezes an internal mechanism that no
  package outside `@qadi/devtools` needs.
- **Leaving the shown reading unguarded after close.** Rejected: it keeps two rules for
  three stores, and a closed model would still move a snapshot that nothing follows.

## Consequences

- The derived store's rules are tested once, against `makeDerivedStore` alone, and the
  dock's tests keep one test per store: its key, and its order against a host listener on
  its parent.
- `DockModel.ts` has no hand compare left to miss a field. A field added to a key type
  that the key reader does not write is a compile error at the reader, and one that the
  reader writes is compared without any further edit.
- A closed model's diagnostics store keeps its last snapshot. No changeset: no export or
  public type changes, and a closed model is unreachable through `DevtoolsDock`, which
  never hands one.
- A store added to or removed from the model fails the store-list test until its list is
  updated, and review keeps that list equal to BEH-QD-700's, so the count is one sentence
  to keep in step and not five.
- ADR-QD-169's consequence that the model keeps its closed flag and its last join is
  corrected: the model holds neither.
- INV-QD-389 and INV-QD-390 state the rules, and BEH-QD-696 to BEH-QD-700 state what a
  host sees.

## Related

[ADR-QD-047](./047-a-headless-devtools-model.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md),
[ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md),
[ADR-QD-168](./168-a-port-card-is-a-model-row.md),
[ADR-QD-169](./169-the-questions-panels-two-host-inputs-are-one-feed.md),
[ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md),
[BEH-QD-696](../behaviors/28-devtools-screens.md#beh-qd-696-a-derived-store-recomputes-exactly-when-a-field-of-its-key-changes-identity),
[BEH-QD-697](../behaviors/28-devtools-screens.md#beh-qd-697-a-derived-store-notifies-once-per-change-before-the-listeners-added-after-it),
[BEH-QD-698](../behaviors/28-devtools-screens.md#beh-qd-698-a-derived-store-does-nothing-after-its-scope-closes),
[BEH-QD-699](../behaviors/28-devtools-screens.md#beh-qd-699-the-dock-models-three-computed-stores-are-derived-stores),
[BEH-QD-700](../behaviors/28-devtools-screens.md#beh-qd-700-the-dock-models-stores-are-listed-once),
[INV-QD-389](../invariants.md#inv-qd-389-a-derived-store-recomputes-exactly-when-its-key-changes-and-does-nothing-after-its-scope-closes),
[INV-QD-390](../invariants.md#inv-qd-390-the-dock-models-computed-stores-are-derived-stores-and-their-count-is-stated-once).

> **Amended 2026-11-24 (CCR-QD-471): `sameFields` is the rule the feeds and the dock apply.**
> Decision 2 called `sameFields` a module-private comparison. It is exported from `ExternalStore.ts`, still out of both
> barrels, with `sameFieldsOrAbsent` beside it for an input that may be absent (absent equals only absent), and every feed
> and the dock apply it to their inputs after one normaliser per input type has made them complete records, so a field
> left out and a field holding `undefined` are one field
> ([ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md)). The comparison itself is unchanged:
> own enumerable string-keyed fields, values by `===`, and a field on one side only is a change. Context and Alternatives
> considered keep their history.
