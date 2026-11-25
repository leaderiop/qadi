# ADR-QD-196 — The diagnostics feed folds its reading as a value

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-196                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-25                                     |
> | Status         | Accepted — amends ADR-QD-173, ADR-QD-169 and ADR-QD-047 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-25): the test that pins a sample's four fields reads the raw sample and is named for it (CCR-QD-475)<br>1.1 (2026-11-25): its Related list links the behaviours and invariants that state it (CCR-QD-475)<br>1.0 (2026-11-25): new (CCR-QD-475) |

---

## Context

`@qadi/devtools`' diagnostics feed held its reading twice and described one field it never wrote.

- **A store with no subscriber of its own.** The diagnostics module (`DiagnosticsStore.ts`) built a store, `makeDiagnosticsStore`,
  with `subscribe`, `getSnapshot` and `accept`. Its one caller was the feed, and its `subscribe` was reached only by its own
  test. The feed already published `{ status, reading }` through its own view store, so the reading lived in the store and in
  the view, and `show` copied one into the other.
- **A wrapper and a replacement around it.** `start()` wrapped the store in `marking`, which put the run guard, the `sampled`
  flag and the `Live` mark in front of `accept`, and `off()` replaced the store with a fresh one, which was how the reading
  reset.
- **A five-clause `===` chain.** The store decided whether a fold had moved anything by comparing each field with `===` after
  `keep` had chosen its reference: a second list of the reading's fields that a new field could silently miss, and five more
  mutants that only the chain's own tests could judge.
- **An engine that took more than it used.** `runDiagnostics` took the whole `DiagnosticsStore` and called only `accept`.
  `runSource` takes `Pick<TimelineStore, "accept">`.
- **A field the poll never writes.** `Diagnostics.questions` was written `undefined` on every sample and copied from a
  supplied reading by `mergeReading`. Questions are the gates feed's input
  ([ADR-QD-169](./169-the-questions-panels-two-host-inputs-are-one-feed.md)), and the dock's join already reads a supplied list
  from `held.reading?.questions`, never from the reading. Nothing in the source, the documentation or the examples read
  `Diagnostics.questions`, but it was observable: `mergeReading` is public, and the dock model's `diagnostics` readout
  carried a supplied reading's questions in `reading.questions`. A decision recorded that it stays
  ([ADR-QD-169](./169-the-questions-panels-two-host-inputs-are-one-feed.md) decision 10), so removing it is a public type
  change and this record is where the reasoning is kept.

## Decision

1. **The fold is one pure function and states its law once.** `foldReading(previous: Diagnostics, next: Diagnostics):
   Diagnostics` is declared in `Diagnostics.ts` beside `mergeReading`, and exported from that module only, never from either
   barrel ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)). Each field keeps `previous`'s reference while
   `Equal.equals(previous.f, next.f)` holds and takes `next.f` otherwise, through the module-private `keep`. When no field
   moved it returns `previous` itself, decided by `sameFields(folded, previous)` from `ExternalStore.ts`, the one rule the feeds
   already use to decide whether something moved ([ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md)),
   not by a hand-written chain. The folded value is an object literal naming every field and the return type is `Diagnostics`,
   so a field added to `Diagnostics` is a compile error until the fold lists it, and the identity check covers it with no edit.

2. **The feed holds its reading in the one snapshot it publishes.** `view.getSnapshot().reading` is the reading. There is no
   store, no `let reading` beside the snapshot and no `marking`. `show(status, reading)` takes the pair together and drops an
   unchanged pair, so one transition is one publish. `Off` is `runs.stop(); sampled = false; view.set(diagnosticsOff)`:
   `diagnosticsOff.reading` is `noDiagnostics`, so the reading resets by the constant and nothing is replaced.

3. **The engine takes a sink.** `runDiagnostics(sink: DiagnosticsSink, options?: DiagnosticsOptions)`, where
   `DiagnosticsSink` is `{ readonly accept: (sample: Diagnostics) => void }`, declared in `Diagnostics.ts`, package-private and
   out of both barrels. The span `qadi.devtools.runDiagnostics`, the scoped layer build, the `Schedule.spaced` cadence, the
   `never` error channel and a defect ending the run are unchanged. The sample is exactly the four fields the poll reads
   (`wiring`, `activity`, `hydration`, `portCalls`): the `Effect.all` record itself, with no manufactured `questions`.

4. **The sink the feed builds per `start()` keeps the order the wrapper had.** First `if (!runs.isCurrent(token)) return`,
   before anything is read or folded, so a superseded run's sample neither marks nor folds (FC9, F33). Then the fold into the
   shown reading, then `sampled = true`, then the publish of `Live` (or the current `Live`), so an unchanged sample still
   marks `Live` and `restart()` over an unchanged world notifies twice (FC7, F19). `start()` keeps
   `try { show(Starting) } finally { runs.fork(…) }` ([ADR-QD-194](./194-a-run-of-calls-applies-every-call-whatever-one-throws.md)),
   so no unguarded step returns, and `onFailure` states `Stopped({ reason, sampled })` over the reading it holds.

5. **`Diagnostics.questions` is removed; `DiagnosticsReading.questions` is kept.** `Diagnostics` is exactly what the poll
   samples. `mergeReading` does not carry a supplied reading's questions, and its comment and the field's comment say that the
   dock's join reads them from the supplied reading, beside the merged one. The timing is unchanged, for two reasons, and each is
   checkable in `DockModel.ts` and in the tests below.
   - **The shown reading's key is the feed's snapshot and the supplied reading, by identity.**
     `shownReading` is a derived store over `diagnosticsFeed` whose key is `{ fed: diagnosticsFeed.getSnapshot(), supplied:
     held.reading }`. A supplied reading therefore moves the shown reading's key exactly when it did before, and the key never
     mentioned `questions`. FC11 pins that one `configure` handing a reading with questions publishes the shown reading and the
     questions store once each, and it passes unedited.
   - **The join reads `held.reading?.questions`, unchanged.** The questions join's key is
     `{ feed, supplied: held.reading?.questions, unsampled }`, read from the dock's input, never from the shown reading, so
     removing the field from the merged reading changes no value the join reads and no moment it reads it. MR2 pins that the
     questions store lists the supplied questions on the `configure` that hands them.
   - Rejected below: routing the questions through the shown reading, which would move the moment the join sees them.

6. **Two existing assertions are flipped, and the before and after are recorded.** A change to a held test's text is the
   evidence that the removal changed observable behaviour, so each is named here.

   | Test | Before | After |
   | ---- | ------ | ----- |
   | `DiagnosticsFeed.test.ts`, F2 | `assert.isUndefined(reading.questions);` | `assert.isFalse("questions" in reading);` |
   | `Diagnostics.test.ts`, `mergeReading` | two cases, "supplied questions win" (`mergeReading(sampled, { questions: suppliedQuestions }).questions` is `suppliedQuestions`) and "absent questions fall through to the sample" (it is `sampledQuestions`) | one case, "a supplied reading's questions are not part of the merged reading": `assert.isFalse("questions" in mergeReading(sampled, { questions: suppliedQuestions }))` |

   F2's title is unchanged. Neither flip weakens a pin: each states the same fact about the field in the form that still
   compiles once the field is gone.

7. **The module is renamed to say what it holds.** `DiagnosticsStore.ts`, its test and its type test become `Diagnostics.ts`,
   `Diagnostics.test.ts` and `Diagnostics.tst.ts`, by `git mv` in a commit of their own, with every importer, doc comment and
   register that names a path moved in the same commit and no identifier changed, so the commit is green on its own and
   `git log --follow` crosses it. There is no store left for the old name to describe. No re-export stays at the old path.

### What changes, and the test that pins it

| Behaviour | Before | After | Test |
| --------- | ------ | ----- | ---- |
| Where the reading lives | in the store and again in the view, copied by `show` | in the snapshot the feed publishes, and nowhere else | FC1 to FC10, the tape of every publish with the reading's identity; FC2, FC3, FC4 and FC7 to FC10 fail with the fold's keep removed |
| A sample equal to the last | folded by the store, compared by the `===` chain | folded to `previous` itself by `foldReading`, so nothing publishes after the first | FC3, `foldReading` "changes identity once however many identical samples are folded in" |
| One field moves | the other fields kept by `keep`, the chain notices the move | only that field takes a new reference, and the reading is new once | FC4, `foldReading` "gives only the field that moved a new reference, for each field" |
| Equality is structural | `keep`'s `Equal.equals`, the chain's `===` over the kept references | `Equal.equals` per field, then `sameFields` over the kept references | `foldReading` "decides each field by structural equality, not by reference", "returns the previous reading itself for a structurally equal fresh sample" |
| A field added to `Diagnostics` | compiled, and the chain could miss it | a compile error until the fold lists it; the row table over the fields shows it in review | `foldReading` "has a row for every field of the reading" |
| First sample against the empty reading | kept the fields equal to the empty reading's | keeps them | `foldReading` "keeps the empty reading's fields for a first sample that equals them", FC2 |
| `restart()` over an unchanged world | `Starting`, then `Live` over the same reading object | the same | FC7, F19 |
| `Off` | the store replaced by a fresh one | the constant `diagnosticsOff`, so the reading resets by identity | FC8 |
| A start after `Off` | folded into the fresh store's empty reading | folds into `noDiagnostics`, not the reading shown before `Off` | FC10 |
| A stop | `Stopped` over the kept reading, `sampled` from the flag | the same | FC5, FC6, F23 |
| A superseded run's sample | dropped by `marking` before the store | dropped by the sink's guard before the fold | FC9, F33 |
| The engine's parameter | the whole `DiagnosticsStore` | a `DiagnosticsSink`, whose one member is `accept` | `Diagnostics.tst.ts` "a layer's typed failure is not the run's failure", "a valid call passes the parameter check, so the refusals below can fail", "a run with no options has nothing to fail with either"; `Diagnostics.test.ts`'s `runDiagnostics` describe |
| The poll's sample | the four reads plus `questions: undefined` | the four reads | `Diagnostics.test.ts` "the sample the poll hands the sink carries exactly the four fields it reads" |
| `Diagnostics.questions` | a public field the poll never wrote | removed | `Diagnostics.tst.ts` "the reading carries no questions field", `surface.tst.ts` "the root's Diagnostics holds exactly the four sampled fields" |
| `DiagnosticsReading.questions` | kept | kept | `Diagnostics.tst.ts` "a supplied reading carries its questions", `surface.tst.ts` "the root's DiagnosticsReading carries questions" |
| A supplied reading's questions in the merged reading | copied by `mergeReading` | not part of it | `Diagnostics.test.ts` "a supplied reading's questions are not part of the merged reading" (the flip above), MR1 |
| A supplied reading's questions reach the dock's join | from `held.reading?.questions`, on the `configure` that hands them | the same, at the same moment | MR2, FC11 |
| An empty options object | a `Live` feed whose reading had `questions` `undefined` | a `Live` feed whose reading has no `questions` key | F2 (the flip above) |
| The sink and the fold from the root | not applicable | neither `foldReading` nor `DiagnosticsSink` is exported | `surface.tst.ts`'s refusals of the two names from the root |

## Alternatives considered

- **Keep the five-clause `===` chain.** Rejected: it is a second list of the reading's fields that can silently miss a new
  one, and each clause adds a mutant that only the chain's tests judge. `sameFields` is the rule the other feeds already use.
- **A `let reading` beside the snapshot.** Rejected: it recreates the two copies, a store and a view, under another name, and
  the two can disagree.
- **Keep a store with no subscriber.** Rejected: it is what this decision removes. A store is for something that subscribes.
- **`Pick<DiagnosticsStore, "accept">` for the engine.** Rejected: no store type remains to pick from.
- **An inline structural sink type.** Rejected: it would be unnamed at the feed and at the three pin sites that read the
  engine's parameter.
- **Make the engine a `Stream` the feed consumes.** Rejected: it would give the two engines two shapes, and `runSource` is the
  precedent for a poll that hands each sample to something that accepts it.
- **Keep `Diagnostics.questions` as it was.** Rejected: a public field the poll never writes, documented as `undefined` unless a
  supplied reading carries questions, is a second route to one value, and the poll's sample would keep a manufactured
  `questions: undefined`.
- **Keep it and route a supplied reading's questions through the shown reading.** Rejected: the join would then see new
  questions on the shown reading's publish instead of from its own key, which changes when the join sees them.
- **Drop `DiagnosticsReading.questions` as well.** Rejected, as [ADR-QD-169](./169-the-questions-panels-two-host-inputs-are-one-feed.md)
  rejected it: a reading taken in another process brings its own questions.
- **A re-export shim at the old path.** Rejected: it would be a second name for one module.
- **Rename inside the refactor commit.** Rejected: the rename's diff becomes unreviewable and `git log --follow` is lost.
- **Keep the module's name.** Rejected: no store remains, so `DiagnosticsStore.ts` would name what the module does not hold.
- **Derive `sampled` from the reading.** Deferred: coupling "has a sample" to `hydration !== undefined` would rest on an
  incidental fact of the reads, and the flag is what the closed status table is stated over.

## Consequences

- A field added to `Diagnostics` is a compile error until `foldReading` lists it, and the identity check needs no edit.
- No export is added or removed, so `scripts/check-api-surface.mjs` (gate 13) is unmoved. `Diagnostics` loses a field, which is
  a **Breaking** change for `@qadi/devtools`: one minor changeset announces it, and the upgrade guide has a before and an after.
  A host that read `reading.questions` reads the `DiagnosticsReading` it supplied, or the model's `questions` store.
  `scripts/check-package-install.mjs` (gate 14) refuses a `Diagnostics` literal with `questions` in the packed artifact and
  expects the packed feed's live reading to carry no such key.
- The store, `makeDiagnosticsStore`, `marking` and the store replacement in `off()` do not exist. The feed's publishes are the
  closed table the characterisation pins, and its identity facts hold by the fold.
- The module is named for what it holds: the reading's type, its constant, its two per-field laws (`mergeReading` lays a
  supplied reading over a sample, `foldReading` folds a sample into the last reading), the options, the sink and the poll.
- `runSource` still takes `Pick<TimelineStore, "accept">`. Giving it a named sink for symmetry touches the timeline engine and
  is left for a later change.
- **The mutation record.** `Diagnostics.ts` and `DiagnosticsFeed.ts` stay under the devtools mutation run's `mutate` glob
  (`packages/devtools/src/model/**/*.ts`). The fold has no chain to carry a mutant only its own tests judge: each field of
  `foldReading` and each step of the sink's order is judged by the value tests and the characterisation, and a surviving
  mutant there would mean a field that is not kept, or a sample taken from a run that was superseded.

## What enforces it

- `packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts`: FC1 to FC11, every publish of the feed transition by
  transition (a bare feed, a first sample, identical samples, one field moving, a stop after and before a sample, a restart, `Off`,
  a superseded run's sample, a start after `Off`) as a tape of status, sampled flag and which of the four fields kept its
  reference, and the dock's row for a supplied reading's questions.
- `packages/devtools/test/model/Diagnostics.test.ts`: the `foldReading` describe (the law as values, with no Effect, no store
  and no clock, and a row for every field), the `runDiagnostics` describe over a recording sink, and the `mergeReading`
  describe with its flipped case.
- `packages/devtools/test/model/DiagnosticsFeed.test.ts`: F1 to F33, held, with F2's one flipped assertion.
- `packages/devtools/test/model/DockModel.reading.test.ts`: MR1 and MR2, the supplied reading's questions beside the shown
  reading.
- `packages/devtools/test/model/Diagnostics.tst.ts` and `packages/devtools/test/surface.tst.ts`: the type pins, the
  `Diagnostics` field list, the sink parameter, and the refusals of `foldReading` and `DiagnosticsSink` from the root.
  `NOT_CALLABLE_PIN_BUDGET`'s key is the renamed type-test file with its count unchanged.
- `scripts/check-package-install.mjs`'s `REFUSED_SHAPE_PROBES` entry for `Diagnostics` and `questions`, and its expectation on
  the packed feed's reading.
- The merge gate by command (`pnpm check`), never by number.

## Related

- [ADR-QD-047](./047-a-headless-devtools-model.md) — the headless model; its 2026-11-19 amendment named the diagnostics store as an engine that stays; amended by this decision
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — `foldReading` and `DiagnosticsSink` stay out of both barrels
- [ADR-QD-169](./169-the-questions-panels-two-host-inputs-are-one-feed.md) — decision 10 kept `Diagnostics.questions`; amended by this decision
- [ADR-QD-173](./173-the-devtools-headless-interface-is-its-feeds.md) — the engines' modules stay package-private; decisions 2 and 3 amended by this decision
- [ADR-QD-192](./192-feeds-and-the-dock-model-take-inputs-only-through-configure.md) — `sameFields`, the one per-field rule the fold reuses
- [ADR-QD-194](./194-a-run-of-calls-applies-every-call-whatever-one-throws.md) — `start()`'s `try`/`finally` and its guard, kept
- [BEH-QD-751](../behaviors/28-devtools-screens.md#beh-qd-751-a-sample-is-folded-into-the-last-reading-by-one-function-and-a-sample-that-changed-nothing-publishes-nothing) — a sample is folded into the last reading by one function, and a sample that changed nothing publishes nothing
- [BEH-QD-752](../behaviors/28-devtools-screens.md#beh-qd-752-the-poll-hands-each-sample-to-a-sink-and-the-feeds-sink-drops-a-superseded-runs-sample-before-it-folds) — the poll hands each sample to a sink, and the feed's sink drops a superseded run's sample before it folds
- [BEH-QD-753](../behaviors/28-devtools-screens.md#beh-qd-753-off-resets-the-reading-and-the-sampled-flag-by-the-empty-constant) — `Off` resets the reading and the sampled flag by the empty constant
- [BEH-QD-754](../behaviors/28-devtools-screens.md#beh-qd-754-diagnostics-carries-only-what-the-poll-samples-and-a-supplied-readings-questions-reach-the-docks-join-beside-it) — `Diagnostics` carries only what the poll samples, and a supplied reading's questions reach the dock's join beside it
- [BEH-QD-755](../behaviors/28-devtools-screens.md#beh-qd-755-the-diagnostics-feeds-status-and-reading-transitions-are-a-closed-table) — the feed's status and reading transitions are a closed table
- [INV-QD-411](../invariants.md#inv-qd-411-the-diagnostics-reading-changes-identity-only-when-a-field-moved-and-an-equal-field-keeps-its-reference) — the reading changes identity only when a field moved, and an equal field keeps its reference
- [INV-QD-412](../invariants.md#inv-qd-412-the-public-diagnostics-holds-exactly-the-fields-the-poll-samples) — the public `Diagnostics` holds exactly the fields the poll samples
