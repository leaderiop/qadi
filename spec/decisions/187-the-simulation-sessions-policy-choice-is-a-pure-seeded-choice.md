# ADR-QD-187 — The simulation session's policy choice is a pure seeded choice

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-187                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-23                                     |
> | Status         | Accepted — extends ADR-QD-047                  |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-23): corrected in code review: what each transition answers, the draft's one path and the clear, and the overview's row (CCR-QD-466)<br>1.0 (2026-11-23): new — the simulation session's policy choice is a pure seeded choice (ARCH-121, CCR-QD-466) |

---

## Context

The simulation session held which policy is simulated, and where it came from, in three
mutable values around a `makeHeldChoice` cell: the cell over the rail's sightings, the last
row seeded from, and the replayed row's policy. Every rule about that choice was written
inline around them, and the session's tests needed a scoped Effect session to exercise a
rule that is a plain function of those values.

The menu's order was written twice: `selectedOf` and `policyMenuOf` put the replayed row or
an evicted choice first, and `leading` recounted how many entries lead so that a menu
position could be turned back into a sighting. "Clear the run" was written three times, as
`supersede()` followed by setting the run `Idle`, in `reseed`, `choosePolicy` and
`setPorts`. The draft was assigned in four places, while `edit`'s comment called itself the
one path a draft changes by.

Nothing failed when the two orderings of the menu drifted apart, or when one of the three
clears was missed: each was a rule restated by hand beside its twin.

## Decision

1. **`SeededChoice.ts` is a pure module beside `HeldChoice.ts`, package-private.** A
   `SeededChoice` is an immutable value of `sightings`, `held` and `seed`. The `seed` is a
   `SeedRow` of the row seeded from and, while that row's policy is the running one, a
   `ReplayedPolicy` of its policy and its unseeded fields. It is built on `HeldChoice.ts`'s
   pure `resolveHeld`, `pinHead` and `heldValue`, not on its mutable cell. The transitions
   are `seededChoice`, `withSightings`, `seedFrom` and `choose`. `withSightings` and
   `choose` map a `SeededChoice` to a `SeededChoice`, and `seededChoice` and `seedFrom`
   answer a `Seeding`: the choice, and the input a replayed row gives. The readings are
   `policyChoice`, `policyOf`, `seedOf`, `seededFrom`, `menuOf` and `sightingAt`. A
   transition that changes nothing answers its input object, inside the `Seeding` for
   `seedFrom`, so a caller detects a no-op with `===`. The session stores nothing of its
   own for one.
2. **The pin rule.** The constructor, `withSightings` and `seedFrom` each pin the head
   exactly when no replayed policy is held, and `choose` holds a value and pins nothing.
   The rule lives inside the transitions, so no caller can forget it or apply it while a
   replayed policy is held.
3. **The orphan rule.** While a replayed policy is held, the seed is its row; otherwise a
   row that is not a `TimelineDecision` stays the baseline row, and a decision row the
   reviewer walked away from is no seed. It is the rule `seedOf` held before, unchanged.
4. **The one menu list.** The menu is one list of entries, each with its value, its label
   and the sighting it names, and `menuOf` and `sightingAt` both read it, so a position that
   names no sighting answers nothing. The replayed row's entry and an evicted choice's entry
   name no sighting; a non-integer position and a position past the list answer nothing too.
   `leading` does not exist. The public `PolicyMenu` and `PolicyMenuOption` shapes are
   unchanged.
5. **The no-op split.** `choose` returns its input when no replayed policy is held and the
   held sighting has the chosen policy, and the session publishes nothing only when `choose`
   returned its input and the run is `Idle`. The policy half of the no-op is the module's and
   the run half is the session's: with a run that is not `Idle`, choosing the held policy
   again still clears the run and publishes.
6. **One replay decode.** `seedFrom` calls `replayInput` once and answers the next choice
   with the input the session writes as its draft, a `Seeding`; the constructor answers the
   same. An entry that does not replay, and `undefined`, answer no input. Replay is decoded
   in one place.
7. **The moved types.** `PolicyChoice`, `PolicyMenu` and `PolicyMenuOption` are declared in
   `SeededChoice.ts`, and the barrel names them from there under the same names. The
   compile-time tie of `PolicyChoice`'s first three arms to `HeldChoice<PolicySighting>`
   moves with the type.
8. **The session keeps runs and the form.** It holds one `let choice: SeededChoice`; the
   mutable values and the readings and menu functions the module replaces leave its file.
   `stale` stays in the session, because it compares a run's question with the form.
9. **One clear.** Once the session is built, `writeDraft` is the one place the draft and its
   resource text are assigned, and `clearRun` is the one operation that stops the run in
   flight and sets it `Idle`, called from `reseed`, `choosePolicy` and `setPorts`. `start`'s
   `Refused` path still calls `supersede`, because it sets `Refused`, not `Idle`, and so is
   not a clear.
10. **One draft path.** `edit`, `reseed`, `editResourceText` and `renameSubject` reach the
    draft only through `writeDraft`, which holds the no-op rule and the resource-text rule;
    `renameSubject` goes through `edit`, since a rename never touches the resource. `edit`'s
    comment, which says it is the one path, is true.

This decision and its shape were decided autonomously on 2026-11-23 under the owner's
instruction to take the most complete, clean option: the choice as a value with transitions
rather than a cell the owner sequences, the pin and orphan rules inside the module rather
than at its callers, and the draft's one path made true rather than its comment corrected.

## What enforces it

The compiler enforces: `PolicyChoice`'s first three arms equal `HeldChoice<PolicySighting>`,
and the menu option's shape is the one `PolicyMenuOption` states. Each is pinned in
`SeededChoice.tst.ts`.

Tests alone enforce: the rules of decisions 2 to 6, as plain values with no scope in
`SeededChoice.test.ts`, each no-op row asserting that the same object came back; and
behaviour preserved, which is every snapshot, no-op and notification count of the session,
in `SimulationSession.characterisation.test.ts`.

Neither enforces that the draft and its resource text are assigned only in `writeDraft`, or
that the run is set `Idle` only in `clearRun`. Review does, and no gate counts the
assignments.

## Alternatives considered

- **A mutable cell like `makeHeldChoice`.** Rejected: the owner sequences its calls, and a
  test has to build and drive an object to read a rule that is a function of three values.
- **Widening `HeldChoice.ts`.** Rejected: its rule, a value held against a list, has no
  notion of a seed, and it serves the explorer session and the role viewer's store.
- **Correcting `edit`'s comment to list the exceptions.** Rejected: the exceptions were one
  rule written four times, and a comment that lists them keeps all four.

## Consequences

- [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md) and
  [ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md) are untouched: the session
  still owns its runs through a scope, and one run supersedes the one before it.
- [ADR-QD-047](./047-a-headless-devtools-model.md)'s v1.11 amendment still holds: the menu is
  read under the session's snapshot, and only where it is computed moved.
- BEH-QD-466, BEH-QD-460 and INV-QD-107 gain one dated amendment each; no sentence of theirs
  is rewritten.
- No public name changes and `check-api-surface` stays at 941 exports, so there is no
  changeset and `spec/overview.md` does not change.
- The behaviours are
  [BEH-QD-706](../behaviors/29-devtools-simulator.md#beh-qd-706-the-head-is-pinned-only-while-no-replayed-row-is-held),
  [BEH-QD-707](../behaviors/29-devtools-simulator.md#beh-qd-707-a-row-with-no-decision-stays-the-baseline-row),
  [BEH-QD-708](../behaviors/29-devtools-simulator.md#beh-qd-708-the-policy-menu-and-its-reverse-lookup-read-one-list),
  [BEH-QD-709](../behaviors/29-devtools-simulator.md#beh-qd-709-choosing-the-held-policy-again-changes-nothing-while-the-run-is-idle)
  and
  [BEH-QD-710](../behaviors/29-devtools-simulator.md#beh-qd-710-a-draft-is-written-in-one-place-and-a-run-is-cleared-by-one-operation),
  and the invariants are
  [INV-QD-393](../invariants.md#inv-qd-393-the-simulators-seeded-choice-is-a-pure-value)
  and
  [INV-QD-394](../invariants.md#inv-qd-394-the-simulation-session-writes-its-draft-in-one-place-and-clears-its-run-through-one-operation).

## Related

[ADR-QD-047](./047-a-headless-devtools-model.md),
[ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md),
[ADR-QD-150](./150-a-scoped-run-that-a-newer-run-supersedes.md),
[BEH-QD-466](../behaviors/28-devtools-screens.md#beh-qd-466-a-choice-from-a-list-has-one-shape).
