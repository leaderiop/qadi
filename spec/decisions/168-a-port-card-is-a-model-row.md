# ADR-QD-168 — A port card is a model row, not a view join

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-168                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-11-18                                     |
> | Status         | Accepted — amends ADR-QD-047; follows ADR-QD-162; keeps ADR-QD-160; amended 2026-11-22 (ADR-QD-185: `services` is a derived store; the count is BEH-QD-700's); amended 2026-11-25 (ADR-QD-198: the hydration block is the second model row of its kind) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-11-25): noted: the hydration block is the second model row of its kind (CCR-QD-477)<br>1.2 (2026-11-22): note — the 2026-11-22 note says what the store-list test holds (CCR-QD-464)<br>1.1 (2026-11-22): notes — the store is a derived store and the count is BEH-QD-700's (ARCH-119, CCR-QD-464)<br>1.0 (2026-11-18): Initial release (ARCH-102, CCR-QD-446) |

---

## Context

The devtools Services tab drew each port card by joining three readings in `ServicesPanel.tsx`'s render: the wiring report's
`report.ports`, the port activity and the call log. The three are keyed three ways: `PortReport.port` is a `WiredServiceName`,
`PortActivity.port` was a `string`, and a call's tag is a `PortName`. The join paired them by string comparison, a `find` per
card for the activity and a `filter` per card for the calls, and the same render function decided every word the card
printed: the state, the activity line and its suffixes, the consequence's voice, the cache's one line, the newest-first list
with its `and N earlier`, the `· N attempts` suffix, the `translation` and `served` labels and `in flight`.

Two consequences followed. A misspelt or renamed port was not an error: its card read `never called`, a true-looking
statement about a port nothing was counting. And every one of those rules sat outside the mutation glob
(`packages/devtools/src/model/**/*.ts`), reachable only by rendering the dock.

[ADR-QD-047](./047-a-headless-devtools-model.md) already says the panel renders the model and computes nothing, and
[ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) applied it to the Questions tab:
`joinQuestions` is a pure function and its result a dock model store, with the panel written on a characterisation made on the
base. The Services tab was the other screen still joining in its view. [ADR-QD-160](./160-port-facts-are-read-from-the-description.md)
had already moved the port facts and the consequence sentences into `PortReading.ts`; the join over them stayed.

## Decision

1. **`portCards` is one pure function in `PortCards.ts`** (D-01), package-private (ADR-QD-099) and the counterpart of
   `joinQuestions`. It takes a `ServicesInput` (the wiring read, the activity, the call log and the unsampled flag, all read at
   one moment) and returns a `ServicesView`.
2. **`ServicesView` has four tags** (D-02 as amended): `Withheld` (no layer handed and no sample yet, which the panel renders as
   nothing, as `QuestionsView.Unsampled` does), `NotHanded` (a sample that found no layer), `Failed { reason }` and
   `Read { rows, cache }`. The wiring-state match moved into the model, and the panel never reads `unsampled` itself.
3. **A row is words** (D-02, D-04, D-10, D-11, D-12). Each `PortCardRow` carries its state, its activity line, its consequence,
   its tone (`Warning` when defaulted, else `Plain`), its `data-defaulted` value and its `CallsView`. The cache is one string
   (`N completed entries` or `absent`). `SHOWN_PER_PORT` and `NO_ACTIVITY_READING` moved with their comments, and the model
   supplies each call's React key with the value it had (`${span}-${at}-${text}`).
4. **Calls are a closed union** (D-02): `CallsView` is `Hidden` (no collector while unsampled, or a collector that saw nothing for
   this row), `Uncollected` (the note that the detail needs `portCalls`) or `Listed { calls, earlier }` (the newest five, with
   `and N earlier` beyond them). A call row is its text (the reading table's sentence, plus ` · N attempts` only above one),
   its interpreter label (`translation` for `toPredicate`, `served` for `remote`, none for `evaluate` or an unrecorded one),
   its duration (`in flight`, never a zero, or `x.x ms`) and its key.
5. **Activity and calls are grouped once** (D-07). `activityByPort` and `callsByPort` read the list and the log once into
   per-port records, `{ readonly [K in PortName]: … }`, built by `tabulatePorts` over a `Map`, so a missing port is a compile
   error, a host-supplied word such as `__proto__` is a key of nothing and no card filters the log. A row that is not a registry
   port (`EvaluationId`, `CurrentSubject`, `DecisionCache`, `DecisionSink`) takes the not-a-port branch through
   `isPortName`, an own-key test of the registry (`Object.hasOwn(PORTS, name)`), never a string comparison. The guard lives
   in `PortCards.ts`, so `Wiring.ts` changed only for item 6.
6. **`PortActivity.port` is a `PortName`** (D-05, D-06). `portActivity` reads one entry per registry port through
   `forEveryPort`, looking up each port's own name in the four metrics, and keeps the `> 0` reached filter (issue #107). It no
   longer iterates the metrics' string keys, so a word written to a port metric outside the registry is not reported, where it
   was before. This is **Breaking** for `@qadi/devtools`, which exports `PortActivity`.
7. **`DockModel.services` is the dock model's ninth store** (D-03 as amended). It holds the `ServicesView` and is recomputed
   only when the wiring read, the activity, the call log or the unsampled flag changes identity, the way `questions`
   is. A poll that moved none of them notifies nothing. Counting the stores once: seven before `questions` (the timeline, the
   dock session, the explorer, the role choice, the simulation, the diagnostics and the timeline status), `questions` the eighth,
   `services` the ninth.

> **Amended 2026-11-22 (CCR-QD-464).** `services` is a derived store, and the count is BEH-QD-700's, listed once ([ADR-QD-185](./185-the-dock-models-computed-stores-are-derived-stores.md)).

8. **The panel renders the store and computes nothing.** `ServicesPanel` takes the store and reads it with `useStoreSnapshot`,
   as `QuestionsPanel` does, and maps the view's tags to JSX through hoisted exhaustive matchers. The fixed prose stays in the
   view because it is text and not a rule: the process-wide scope note, the cache card's sentences and the two notes. Every
   word and `data-testid` is byte-identical to the base (D-09), including `never called` on the four non-port cards, kept
   and deferred rather than fixed here.
9. **Proof.** A characterisation of sixteen cells, `ServicesPanel.characterisation.test.tsx`, was written on the phase base
   before any source edit and never edited (D-13). Each render case became a headless `PortCards.test.ts` case before it was
   deleted (D-14). `PortCards.tst.ts` pins the two compile errors, a misspelt port in a `PortActivity` literal and in the
   per-port records (D-08), and `DockModel.test.ts` M48 to M54 pin the store.

### Two things that differ from what was first planned

- **M54 and `Off` to `Live`.** The plan and its research read the store as keeping its reference when a feed's status changes
  but its sampled flag does not. That holds for `Live` to `Stopped` after a sample, and M54 pins it. It does not hold from `Off`
  to `Live`: `configure` publishes `Starting` (unsampled) between the two, so the store notifies twice and ends on a new,
  structurally equal reference. That is a harmless re-render, so `reservice` was not narrowed, and BEH-QD-615 states the rule as
  identity of the four inputs, not as a promise about any one status transition.

> **Amended 2026-11-22 (CCR-QD-464).** The rule is the derived store's per-field identity over the same four inputs, unchanged in effect
> ([ADR-QD-185](./185-the-dock-models-computed-stores-are-derived-stores.md)).

- **A metric word outside the registry is no longer reported.** The narrowing of `PortActivity.port` makes a word the registry
  does not know impossible to hold in the type, so `portActivity` stopped reading it. Nothing on a card could show it.

## Alternatives rejected

- **The join kept in the view.** It is the defect: every rule reachable only by mounting the dock, outside the mutation glob.
- **A `useMemo` in the panel instead of a store.** It still computes in the panel, outside the mutation glob, and it makes
  `ServicesPanel` the one panel that owns what the others read from the model ([ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md)'s
  precedent).
- **`port` left a `string` behind a runtime check.** The check is the comparison this removes, and a misspelling would still
  compile.
- **A per-card `filter` of the log.** It reads the whole log once per card, where `callsByPort` reads it once.
- **The view testing `unsampled` or an empty list itself.** `Withheld` and `Hidden` exist so the view never asks.
- **An interpreter lookup table.** `interpreterLabel` is an exhaustive matcher; a lookup table in its place leaves an
  equivalent mutant the exhaustive matcher does not.

## Mutation

Measured with Stryker over the three files the move touched, on the phase base and on the final tree
(`node .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation.mjs`, the committed
`55-mutation-base.json`, `55-mutation-after.json` and `55-mutation-static.json`). Scores are the unrounded stored values;
"detected" is killed plus timeout, "scored" is detected plus survived plus no-coverage.

| File | Base score (detected/scored) | After score (detected/scored) | Survivors |
| ---- | ---------------------------- | ----------------------------- | --------- |
| `packages/devtools/src/model/DockModel.ts` | 1 (123/123) | 1 (145/145) | none |
| `packages/devtools/src/model/PortCards.ts` | not on the base | 1 (126/126) | none |
| `packages/devtools/src/model/Wiring.ts` | 1 (50/50) | 1 (48/48) | none |

`DockModel.ts` gained 22 detected mutants, the `services` store, with no survivor. `Wiring.ts` lost 2 detected mutants and kept
its score; the one logic change in the file is `portActivity`, whose union of the four metrics' keys became one read per
registry port, and the two lost mutants were not traced to individual lines. `PortCards.ts` is new, so it has no base, and
its score is 1 with no survivor and no uncovered mutant.

D-15's comparison held: `node 55-mutation.mjs compare 55-mutation-static.json` prints `WX-05 holds (D-15)`. No touched file's
score fell, so no drop had to be attributed to mutants that moved into `PortCards.ts`.

The static-ignored credit is counted for `PortCards.ts` only, as ADR-QD-167 Rev 1.1 accepted it. Stryker's `ignoreStatic`
ignores mutants in sites that run once at module load, and `PortCards.ts` has 14 of them. An evidence-only run with the repo's devtools config and `ignoreStatic: false`, over
the same `--mutate` list on the same tree, kills all 14 of them: `PortCards.ts` is 140 Killed in that run, 126 detected in the
gate run plus the 14. `DockModel.ts` had two static-ignored mutants at the base and has the same two now, and one of them
survives the evidence run; D-15 gives static credit to `PortCards.ts` only and judges `DockModel.ts` on its gate-run score, so
it neither costs nor earns anything. `55-mutation.mjs`, `55-mutation-base.json` and `stryker.devtools.mjs` were not edited
for this phase.

## Consequences

- **A sixth port needs no edit in `PortCards.ts`.** Its activity and call records are built by `tabulatePorts`, so a port
  added to the registry is a key of both, and the compiler names the reading row in `PortReading.ts` as before
  ([ADR-QD-160](./160-port-facts-are-read-from-the-description.md), BEH-QD-575).
- **The dock model has nine stores.** The count is stated here, in the ADR-QD-047 amendment, in BEH-QD-465 and in the
  `DockModel.ts` header; each earlier ordinal is kept as written and corrected by a dated note.

> **Amended 2026-11-22 (CCR-QD-464).** Superseded: BEH-QD-700 lists the stores, and says how a test of a built model holds that list
> ([ADR-QD-185](./185-the-dock-models-computed-stores-are-derived-stores.md)).

- **The four non-port cards still read `never called`** (or `no activity reading`), although no metric counts them. That is
  kept byte-identical under D-09 and left for a later phase, which could say that no calls are counted for a service that is
  not a port.
- **`@qadi/devtools` takes a minor with one Breaking entry**, `PortActivity.port` is now a `PortName`. A host that built a
  `PortActivity` with a string for `port` must use a registry name. The panel's wording is unchanged.
- **`spec/overview.md` is unchanged.** No export was added or removed: `portCards`, `ServicesView`, `isPortName` and the
  records are package-private, and `PortActivity` kept its name.
- **Enforcement.** [INV-QD-355](../invariants.md#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function)
  and [INV-QD-356](../invariants.md#inv-qd-356-the-services-panel-computes-nothing) state it;
  [BEH-QD-611](../behaviors/28-devtools-screens.md#beh-qd-611-a-port-card-is-one-model-row-keyed-by-its-wired-service) to
  [BEH-QD-615](../behaviors/28-devtools-screens.md#beh-qd-615-the-services-store-is-one-moment-and-keeps-its-reference-when-nothing-moved)
  describe it; `PortCards.test.ts`, `PortCards.tst.ts`, `DockModel.test.ts` and the characterisation pin it.

## Related

- [ADR-QD-047](./047-a-headless-devtools-model.md) — the panel renders the model and computes nothing; amended here for the
  Services tab.
- [ADR-QD-160](./160-port-facts-are-read-from-the-description.md) — the port facts and the reading table, kept where they are.
- [ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) — the Questions tab's store
  and the characterisation precedent this decision follows.
- [INV-QD-355](../invariants.md#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function),
  [INV-QD-356](../invariants.md#inv-qd-356-the-services-panel-computes-nothing)
- [BEH-QD-611](../behaviors/28-devtools-screens.md#beh-qd-611-a-port-card-is-one-model-row-keyed-by-its-wired-service),
  [BEH-QD-612](../behaviors/28-devtools-screens.md#beh-qd-612-a-cards-wording-is-stated-once-in-the-model),
  [BEH-QD-613](../behaviors/28-devtools-screens.md#beh-qd-613-a-cards-recent-calls-are-a-closed-union-the-panel-prints),
  [BEH-QD-614](../behaviors/28-devtools-screens.md#beh-qd-614-port-activity-reads-one-entry-per-registry-port),
  [BEH-QD-615](../behaviors/28-devtools-screens.md#beh-qd-615-the-services-store-is-one-moment-and-keeps-its-reference-when-nothing-moved)
- ARCH-102, CCR-QD-446

> **Noted 2026-11-25 (CCR-QD-477).** The hydration block of the Questions tab is the second model row of this kind: a pure
> function of the shown reading in `HydrationView.ts`, served as the model's own derived store and rendered by a panel that
> computes nothing, with its rate, drops and scope sentences composed in the model and the fixed advice left beside the markup,
> as this decision leaves the Services tab's fixed labels in the view ([ADR-QD-198](./198-the-hydration-block-is-a-model-row.md)).
