# ADR-QD-184 — Developer-signal reporters are resolved through one table

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-184                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-22                                     |
> | Status         | Accepted — extends ADR-QD-041 and ADR-QD-052   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-22): A row's condition is read in one place, holdsHere, and a row that speaks everywhere takes no condition; the budget counts every let or var binding outside a function or class body from the syntax tree; the characterisation's rows are unchanged, not unedited (ARCH-118, CCR-QD-463)<br>1.0 (2026-11-22): Initial release (ARCH-118, CCR-QD-463) |

---

## Context

`@qadi/react` raises eight developer signals, and each one's reporter was resolved by a
hand-written function. Four of those functions restated the same three rules: a supplied
reporter replaces the default outright and is contained, the default speaks only in
development, and a throw is announced under the name of the reporter's option. The list of
those names, `ReporterName`, was kept by hand beside them.

The name was fixed per resolver rather than per entry point, and that was a defect.
`makeQadiAtoms` builds its gate registry and forwards its own `onGateIdCollision` to it
under the registry's option; the collision resolver named a throw `onGateIdCollision`
whichever entry point it was reached through. A direct `makeGateRegistry({ onIdCollision })`
caller whose reporter threw was told about an option they never passed. A failing test on
the code before this decision showed it.

AGENTS.md §13 also said no module-scope state was left in `@qadi/react`, while the
production-instrumentation line's once-per-process latch was exactly that.

## Decision

1. **One table, `SIGNALS` in `packages/react/src/DeveloperSignals.ts`**, a record over the
   tag of every developer signal, total by `satisfies SignalTable`. Each row states where
   its console default speaks (`Development`, `Production` or `Everywhere`), how often
   (`PerEvent`, or `OncePerProcess` for `InstrumentedInProduction` alone), the default
   itself (`says`) and, for each entry point that takes a reporter for the signal, the
   option it is passed under and when the entry point resolves it (`OncePerAtomSet`,
   `OncePerRegistry`, `OncePerCall` or `OnEveryReport`). `ReporterThrew` has no entry
   point, because it is never routed to a supplied reporter.
2. **`ReporterName` is derived from the table**: the union of every option any row names.
   A `ReporterThrew` carries a member of it.
3. **One resolver, `reporterFor(row, entry, supplied)`.** A supplied reporter is contained
   under the option the row gives that entry point; with none, the row's default is given
   under the row's own condition, or nothing where the condition does not hold. A throw is
   announced through `ReporterThrew`'s own row, which speaks in every environment, so the
   containment rule is written once and read from a row like any other. `providerSignalReporter`
   is a projection of it over the signal's own row; it never returns `undefined`, because
   the provider detects each situation itself and the row decides whether the default speaks.
   **A row's condition is read in one place, `holdsHere`**, which the resolver asks whether a
   default speaks and `QadiProvider` asks of `InstrumentedInProduction`'s row whether the
   situation exists at all, so the provider carries no environment check of its own. A row
   that speaks everywhere has no condition: `holdsHere` and the resolver take only the rows
   that have one, and `ReporterThrew`'s default is read through a function that takes only a
   row that speaks everywhere, so a row changed to speak under a condition fails to compile
   at the function that announced it rather than being skipped.
4. **The entry point decides the name.** The registry closure is `buildGateRegistry` in the
   package-private `GateWriter.ts`, handed a reporter that is already resolved. The atom set
   resolves its own reporter under `makeQadiAtoms` and `makeGateRegistry` resolves its own
   under `makeGateRegistry`, so each names the option its caller passed, no throw is
   contained twice and no public type changes. `makeOwnedGateRegistry` is replaced by it.
5. **Each hydration call site reads its own row.** `dehydrateDecisions` resolves its
   reporter from the `DehydrationDropped` row and `hydrateDecisions` from the
   `HydrationDropped` row, so the dehydrate default cannot be paired with the hydrate slot.
6. **Every reporter is resolved where it was, and the table says when**: once per atom set,
   once per registry, once per call, and on every report for `QadiProvider`, which reads
   its reporter through a ref so that an inline callback stays current.
7. **The production-instrumentation latch stays process-scoped**, as the one rebindable
   module-scope binding in library source. Several providers can share a process and the
   point of the default is one line per bundle. It is counted by `MODULE_STATE_BUDGET` in
   `scripts/check-house-style.mjs`, with its table in AGENTS.md §6, and AGENTS.md §13 is
   corrected in place, the sentence it once had kept in
   `spec/process/house-rules-evidence.md` §7.

The table and the resolver live in `DeveloperSignals.ts`, which stays the one file that
writes to `console` or reads `process.env` ([ADR-QD-041](./041-a-mismatch-is-announced.md)).

This decision and its shape were decided autonomously on 2026-11-22 under the owner's
instruction to take the most complete, clean option: the latch kept process-scoped and
recorded rather than moved (decision 7), and the entry point naming its own option rather
than the registry guessing it (decision 4).

## Alternatives considered

- **The latch under an atom set.** Rejected: an atom set is narrower than a process, so a
  page with two providers would print the line twice, and a provider can be handed atom
  sets it did not build.
- **The latch under a provider ref.** Rejected, for the same reason: a supplied reporter
  already gets once per mount, and the console default's point is one line per bundle,
  which a per-mount latch cannot give.
- **Passing the atom set's contained reporter on to `makeGateRegistry`.** Rejected: the
  throw would be contained twice and announced twice.
- **A new public option naming the entry point.** Rejected: it changes a public type for a
  name the library already knows from the call it is making.
- **Keeping the four resolvers as separate functions that project the table.** Rejected:
  four names for one rule, and the containment, the environment check and the latch read
  would be written in each. The provider's is the one that stays, as a projection.
- **A `const` holding a mutable container, counted by the budget too.** Rejected: it would
  flag `Policy.ts`'s depth memo and the read-only lookup tables, none of which a caller can
  observe. Rebinding is the shared state, so the budget counts a `let` or `var`.

## Consequences

- What the compiler refuses, each with a type pin in `packages/react/test/DeveloperSignals.tst.ts`
  that was seen failing when its guarantee was removed: a signal without a row (TS2741 at
  the table, naming it); a second row that speaks once per process; an entry point a row
  does not name; the hydrate row given the dehydrate reporter; a `ReporterName` that is
  not the union of the table's option names, written out in the pin; and a row that speaks
  everywhere asked whether its condition holds. A row for no signal fails the pin that
  writes the tags out, which was not gutted.
- What it does not, and what pins each instead. When each reporter is resolved: `resolved`
  is read by no code, so the table-facts test in `DeveloperSignals.test.ts` compares it
  with a written-out table, which detects a row changed without review and is no evidence
  of when a reporter is resolved; the timing itself is held by `DeveloperSignalReporters.test.tsx`,
  which pins every reporter through its public entry point, its rows unchanged by this
  decision. The sentences and each row's condition are held by that characterisation and by
  the sentence tests, not by a type; a row changed to the wrong condition fails
  `InstrumentedInProduction`'s tests in development, and `holdsHere`'s own. That an entry
  point passes its own name is held by the regression pair in `GateRegistry.store.test.ts`:
  a call site could name another entry point of the same row, which compiles.
- `MODULE_STATE_BUDGET` counts every `let` or `var` binding a library file declares outside
  a function or class body, read from the file's syntax tree and not from its lines, so an
  indented declaration, `export let`, one in a top-level block and each name of `let a, b`
  all count. It counts no `const`, so a `const` holding a mutable container (`Policy.ts`'s
  depth memo, a `Metric`), a `static` class field and what a function declares are outside
  it. A new binding in any other file fails, and so does the count moving.
- The only change a consumer can observe is a direct `makeGateRegistry` caller's reporter
  that throws, now announced under `onIdCollision`, so `@qadi/react` takes a patch
  changeset. No export is added or removed, and `spec/overview.md` is untouched.
- INV-QD-387 and INV-QD-388 state the rules, and BEH-QD-691 to BEH-QD-695 state what a
  developer sees.

## Related

[ADR-QD-041](./041-a-mismatch-is-announced.md),
[ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md),
[ADR-QD-053](./053-a-gate-can-be-found.md),
[ADR-QD-080](./080-a-gate-registry-belongs-to-its-atom-set.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-140](./140-a-gates-write-side-is-a-leaf-below-the-atom-set.md),
[INV-QD-251](../invariants.md#inv-qd-251-a-supplied-reporter-cannot-change-a-hydration-outcome),
INV-QD-387, INV-QD-388, BEH-QD-691 to BEH-QD-695.
