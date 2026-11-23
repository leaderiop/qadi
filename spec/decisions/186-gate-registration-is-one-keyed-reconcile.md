# ADR-QD-186 — Gate registration is one keyed reconcile

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-186                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-22                                     |
> | Status         | Accepted — extends ADR-QD-140 and ADR-QD-111   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-22): new — gate registration is one keyed reconcile (ARCH-120, CCR-QD-465) |

---

## Context

Registering a mounted guard with its atom set's gate registry was one rule written in three
places, each holding a piece of it.

`reconcile` registered and unregistered from two index-aligned arrays, `wanted` and
`current`, and did no update. The hook that called it kept four refs and three effects, one
of them a hand-written state diff keyed on the joined states. `useGates` passed two
`Record.values` results to it and relied on their key order agreeing. And the registry's
handle had its own equal-state check, which made the rule "did the state change" a third
statement of one fact.

Nothing failed if the two arrays drifted apart: the type was `ReadonlyArray` on both sides,
so a reordered record paired one guard's identity with another guard's state, and a missing
current entry silently fell back to `Pending`. Only rendering reached the state half, so the
rule could not be tested beside the rest of `reconcile`.

## Decision

1. **The wanted set is a `ReadonlyMap<string, GateWanted>` keyed by gate id.** `GateWanted`
   is `{ identity, state }`. `GateIdentity` has no `id`: the key is the id, so a key and an
   id cannot disagree and two entries cannot share an id. The committed render's `policy`
   and `resource` ride on the identity, so there is no second array to pass and
   `GateCurrent` does not exist.
2. **One step registers, updates and unregisters.** For each live id, when `wanted` holds
   it with the same identity, the entry is kept (the same `Registered` object) and its
   handle is told the wanted state; otherwise it unregisters. Then each wanted id that was
   not kept registers with its identity's `kind`, `policy` and `resource`, the wanted
   `state`, and the marker's element for a wrapping identity. Unregistering runs before
   registering, so a changed identity re-registers under its own id without colliding with
   itself. The step returns a new `Map` and never mutates `live`.
3. **`sameIdentity` compares exactly `kind`, `atom`, `wraps` and `marker`.** A changed
   `policy` or `resource` alone does not re-register: the atom changes with the question,
   so a different question is a different atom, and the kept handle is told the new state.
4. **The equal-state rule is written once, in `GateHandle.update`** (`buildGateRegistry`).
   `reconcile` tells every kept handle its wanted state and compares nothing; `Registered`
   holds no copy of the state; the hook holds no state diff.
5. **Pure means what ADR-QD-140 made it mean.** `GateWriter.ts` imports nothing from React.
   `reconcile` is deterministic in its arguments, acts only through the writer and the
   handles it is handed, and returns a fresh map.
6. **The failure rule.** If a step throws, the steps after it do not run; every
   registration this call made is unregistered, each in turn, a throwing one not stopping
   the rest; then `reconcile` throws by
   [ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md)'s count rule: one
   value is thrown as it is, more than one as one `AggregateError` holding them in the
   order thrown. `reconcile` never mutates `live`: if a step throws after an earlier step
   unregistered an entry, `live` still holds that entry, its handle already unregistered,
   and unregistering that handle again is a no-op. A handle from `buildGateRegistry` never
   throws, so with the package's registry nothing stays registered that the caller's map
   does not hold, and the caller's teardown, unregistering every handle its map holds, ends
   with nothing registered.
7. **`useGateRegistrations(writer, wanted)` keeps one ref, `registered`, and one
   registration effect with no dependency list**, which calls `reconcile` with the committed
   render's own `wanted`. Beside it stays the teardown keyed on `writer`, declared first,
   whose cleanup unregisters every registration when the hook unmounts or its writer
   changes. "One effect" means one registration effect: an effect's cleanup is React's only
   unmount signal and also runs before every re-run, so a single effect would either
   re-register on every commit, the two notifications per transition
   [ADR-QD-140](./140-a-gates-write-side-is-a-leaf-below-the-atom-set.md) removed, or leak
   on unmount. When `writer` is `undefined` the effect returns at once, so off still means
   absent.
8. **`useGates` makes one keyed pass over the questions** (`Record.map`) that yields, for
   each name, its `GateRead` and its `GateWanted`, built from the same values. `wanted` is
   built from that pass as `new Map(…)` of id and wanted pairs, keyed by the entry's own id
   (`base`, or `` `${base}/${name}` `` for a grouped hook). No callback fills a collection by
   a side effect, and nothing depends on two collections agreeing on key order.

This decision and its shape were decided autonomously on 2026-11-22 under the owner's
instruction to take the most complete, clean option: the id stated once by its key
(decision 1) rather than beside it, the update done in the one step (decision 2) rather than
in a second effect, and the throwing rule stated in full (decision 6) rather than left to
the caller.

## What enforces it

The compiler enforces: `wanted` is a `ReadonlyMap` (an array is refused), `GateIdentity` has
no `id`, `GateCurrent` does not exist, and `Registered` has only `identity` and `handle`. The
pins are in `GateWriter.reconcile.tst.ts`.

Tests alone enforce: the step's rules and its call order, and the failure rule, including a
second unregister of an entry left in `live` (`GateWriter.reconcile.test.ts`, and the
registry's own "unregister is idempotent" in `GateRegistry.store.test.ts`); the equal-state
no-op (`GateRegistry.store.test.ts`, `GateWriter.test.tsx`); and behaviour preserved, which
is what registers, under which id, in what state and with how many notifications
(`GateRegistration.characterisation.test.tsx`).

Neither enforces that no other module diffs states. Review and the behaviours below do.

## Alternatives considered

- **Keeping `identity.id` beside the key.** Rejected: two statements of one fact, which can
  disagree.
- **A `Record<string, …>` for the wanted set.** Rejected: a gate id is an arbitrary string,
  so a record coerces its keys, and a record's key order is not the order guards mounted in.
- **An array of `GateWanted`.** Rejected: the order is again the caller's to keep straight,
  and two entries can share an id.
- **Comparing state in `reconcile` against a copy kept in `Registered`.** Rejected: a second
  copy of the registry's own field and a second place for the rule.
- **A plan/apply split, a pure `reconcile` returning a closed union of steps and an
  interpreter applying them.** Rejected: deciding between an update and nothing needs the
  state copy rejected above, and returning handles for the next map needs the writer, so it
  adds a union and an interpreter and removes nothing.
- **Folding the teardown into the registration effect.** Rejected: it re-registers on every
  commit or leaks on unmount (decision 7).
- **A best-effort step that keeps going after a throw.** Rejected: it leaves a half-applied
  step whose throw is lost.

## Consequences

- AGENTS.md §13 is unaffected: the registry records that a guard exists and what it renders
  now, never a retained verdict, and the hook keeps its registrations and nothing else.
- No export changes: `GateWriter.ts` and `useGate.ts` are out of the barrel
  ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)), so there is no changeset and
  `spec/overview.md` does not change.
- The notification count per transition is unchanged: a state change notifies once, and a
  commit that changed nothing notifies not at all.
- [ADR-QD-140](./140-a-gates-write-side-is-a-leaf-below-the-atom-set.md) and
  [ADR-QD-111](./111-a-gate-writer-is-resolved-once-by-its-provider.md) get one dated
  amendment each, and [ADR-QD-103](./103-a-question-is-opened-once.md) a dated note.
  [ADR-QD-053](./053-a-gate-can-be-found.md) names `useGateRegistrations` beside `useGates`,
  which stays true.
- The behaviours are
  [BEH-QD-701](../behaviors/09-react.md#beh-qd-701-a-guards-wanted-registration-is-keyed-by-its-gate-id),
  [BEH-QD-702](../behaviors/09-react.md#beh-qd-702-one-step-registers-updates-and-unregisters),
  [BEH-QD-703](../behaviors/09-react.md#beh-qd-703-a-state-change-notifies-once-and-an-unchanged-commit-not-at-all),
  [BEH-QD-704](../behaviors/09-react.md#beh-qd-704-registrations-end-when-the-guard-unmounts-or-its-writer-changes)
  and
  [BEH-QD-705](../behaviors/09-react.md#beh-qd-705-a-grouped-hook-registers-each-question-by-its-key-in-any-order),
  and the invariants are
  [INV-QD-391](../invariants.md#inv-qd-391-gate-registration-is-reconciled-in-one-step-keyed-by-gate-id)
  and
  [INV-QD-392](../invariants.md#inv-qd-392-the-registration-hook-keeps-nothing-between-commits-but-its-registrations).

## Related

[ADR-QD-053](./053-a-gate-can-be-found.md),
[ADR-QD-080](./080-a-gate-registry-belongs-to-its-atom-set.md),
[ADR-QD-103](./103-a-question-is-opened-once.md),
[ADR-QD-111](./111-a-gate-writer-is-resolved-once-by-its-provider.md),
[ADR-QD-140](./140-a-gates-write-side-is-a-leaf-below-the-atom-set.md),
[ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md).
