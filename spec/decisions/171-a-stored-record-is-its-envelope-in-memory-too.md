# ADR-QD-171 — A stored record is its envelope in memory too

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-171                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-19                                     |
> | Status         | Accepted — amends ADR-QD-097, ADR-QD-135, ADR-QD-159 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-19): Initial release (ARCH-105, CCR-QD-449) |

---

## Context

[ADR-QD-097](./097-a-decision-log-is-a-sink-and-its-own-history.md) D-11-e put the producer's environment in an
envelope on the wire: every frame and backlog element is `{ environment, record }`. In memory the same fact had a
different shape. A stored record was the record flattened together with `Stamped`'s `environment`
(`StoredDecisionRecord`, `StoredObligationRecord`), built by `stampRecord` through a per-tag `stampRecordMatch`, because a
spread of a `Data.TaggedClass` loses the prototype and so its `Equal`, its `Hash` and its `instanceof`. About twenty lines
of doc explained that trap.

- **The codec** decoded the envelope and then stamped it again, so the wire's own shape was taken apart and rebuilt in the
  other direction.
- **Devtools' timeline** wrote the flattened shape twice more, as `DecisionRecord & { environment: string }` and
  `ObligationRecord & { environment: string }`.
- **The order** over stored records was structural over `{ at }`, so it could not say which kind of value it ordered.
- **A new `SinkRecord` kind** would have needed a stored class, a stamp arm and a decode re-stamp.

Every reader translated one fact between two shapes.

## Decision

Each item cites the phase decision it records.

1. **D-01: a stored record is one `Data.Class`.** `class StoredRecord extends Data.Class<{ readonly environment: string;
   readonly record: SinkRecord }>`, built with `new StoredRecord({ environment, record })`. It keeps `Equal`, `Hash` and
   `.pipe`, as every record type in core does, and a reader narrows on `stored.record._tag`. `StoredDecisionRecord`,
   `StoredObligationRecord`, `stampRecord`, `stampRecordMatch` and the prototype-loss doc on both are deleted: nothing
   spreads a record any more, so there is no prototype to lose.
2. **D-02: the name `StoredRecord` is kept, with no aliases.** It was the union type and is now the envelope class.
   `Stamped` is deleted and its `environment` doc (a label the producer states, not an input; why it is a plain `string`)
   moves onto the class's field. No deprecated re-export of a deleted name exists. This is Breaking and is recorded as
   such. `StoredRecordJson`, `decodeStoredRecord` and `decodeStoredRecordString` keep their names, which now agree with
   the class.
3. **D-03: two orders, each reader orders what it holds.** `sinkRecordOrder: Order.Order<SinkRecord>` reads `at` once and
   carries INV-QD-039's body unchanged (an unknown `NaN` after every known, two unknowns equal, arrival order stable).
   `storedRecordOrder: Order.Order<StoredRecord>` is `Order.mapInput(sinkRecordOrder, (stored) => stored.record)`.
   `DecisionLog`'s `byRecord`, `DecisionStream`'s backlog, devtools' `Source` and its timeline's `isAfter` each use the
   one that fits what they hold. The structural `{ readonly at: number }` order type goes away.
4. **D-04, D-13: the timeline ingests the envelope and its rows stay flat.** `ingest` takes a `StoredRecord` and narrows on
   `stored.record._tag`. The timeline's own entry rows stay flat display rows built from the envelope, so the entry key
   `(_tag, environment, evaluationId, at)` and the rendering do not move, and both intersection spellings are deleted.
   `Timeline` orders its own rows with `Order.mapInput(sinkRecordOrder, recordOf)`, where `recordOf` maps a row to its
   record (`entry.decision` or `entry.obligations`); it is not exported, and a test with an orphan beside decisions of
   differing `at` kills both arms.
5. **D-05: the codec is the record codec plus one field, and the bytes do not move.** Decode reads `{ environment,
   record }` through Phase 57's `untrustedDecoder`, runs `decodeSinkRecord` on `record` and builds `new StoredRecord({
   environment, record })`, with no stamp step. Encode writes the envelope's `environment` beside the encoded record. The
   stored byte goldens committed on the phase base are byte-identical after, and
   [ADR-QD-170](./170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)'s refusal tags and messages are
   unchanged.
6. **D-06: the log constructs the envelope at `append`.** `DecisionLog` builds `new StoredRecord({ environment, record })`
   where it stamped, and its `snapshot` and backlog presentation use `storedRecordOrder`. The one difference to say aloud:
   the log now holds the sink's `record` **by reference**, where the stamp held a shallow copy of it. Nested fields were
   already shared by that copy, and a `Data.TaggedClass` record is immutable, so the observable change is identity, not
   content. The http encoders encode the envelope directly and `DecisionStream`'s backlog sorts by `storedRecordOrder`.
7. **D-12: the log's two `isolate` catches and test C4 are deleted.** The owner's choice, quoted:
   "delete both `isolate` catches and test C4". With D-01, `append` is `new StoredRecord({ environment, record })`, which reads no record field,
   so `isolate("append")` could no longer fire: its only test, C4, reached it through `stampRecord`'s getter-reading
   spread. `isolate("publish")` sat inside it and was already unreachable.
   - **Where a defect goes now.** A defect in a log's `record` propagates like any sink's, and the sink emitter contains
     and reports it once ([ADR-QD-159](./159-the-sink-emitter-reports-what-it-contains.md) Decision 1,
     `SinkEmit.ts`'s `sinkEmitter`).
   - **The one `ingest` caller outside tests** is `examples/nextjs-newsroom/src/server/api.ts`, which calls
     `log.ingest(record.success, "Edge")` on a record `decodeSinkRecordString` has just built. Such a record is a
     `Data.TaggedClass` the decoder constructed, with no getter to throw, and `ingest` now builds the envelope without
     reading a field in any case; a defect there would reach the caller's own effect, as it would for any effect.
   - Keeping the catches as unreachable defensive code was rejected, below.
8. **D-14: one atomic Breaking commit.** Core's `src` change, devtools' `Timeline.ts`, every test that read the deleted
   shape, `features/` and `scripts/check-package-install.mjs` land together, so the root typecheck is green at every
   commit. The characterisation tests land before it, written through the wire, where the API is the same on both sides
   of the change.
9. **D-15: the `@qadi/http` changeset rests on `DecisionLogReader`.** The http routes take a `DecisionLogReader`, whose
   element type `StoredRecord` changes shape, so a structural reader built from flat records no longer typechecks.
   `@qadi/http` has no `src` code change, only doc edits.
10. **D-16: the mutation rule.** [ADR-QD-170](./170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)'s rule
    adapted for a change that is mostly deletion: the base records killed-mutant ids as well as scores, every touched
    file's survivor set is unchanged at the close, every lost killed mutant must have its source line absent from the
    after file, and any new mutant is killed. See `## Mutation`.

## Alternatives rejected

- **A plain readonly interface** for the envelope. It has no structural equality, unlike every record type in core, so a
  `StoredRecord` could not be compared, hashed or deduplicated the way the record inside it can.
- **A tagged class per kind, with `record` nested.** The tag would be stated twice, once on the envelope and once on the
  record, and a new kind would again need its own stored class: the defect this removes.
- **Keeping the flat shape and adding aliases.** Two shapes for one fact is what this decision removes. An alias would
  keep the translation and add a name for it.
- **Keeping the `isolate` catches as unreachable defensive code.** It is dead code plus a mutation exception to record
  (D-16), for a half-label the emitter's single report no longer needs. The owner chose deletion (D-12).
- **A structural `{ at }` order kept beside the two typed ones.** It would let a caller order a value it cannot name, which
  is how `storedRecordOrder` came to read a field through two shapes.

## Mutation

The three mutation gates (`stryker.config.mjs`, `stryker.devtools.mjs`, `stryker.http.mjs`, all unedited, narrowed by
`--mutate` to the touched files) were run on the phase base and on the closing tree by `58-mutation.mjs`, each score as
`(detected/scored)`, where detected is killed plus timeout and scored adds survivors and no-coverage mutants (D-16). The
numbers are those of `58-mutation-base.json` and `58-mutation-after.json`.

| File | Base | After |
| ---- | ---- | ----- |
| `DecisionLog.ts` | 0.9857 (69/70) | 1 (66/66) |
| `DecisionRecord.ts` | 1 (21/21) | 1 (17/17) |
| `DecisionStream.ts` | 0.9722 (70/72) | 0.9722 (70/72) |
| `SinkCodec.ts` | 0.9683 (122/126) | 0.9685 (123/127) |
| `Source.ts` | 1 (80/80) | 1 (80/80) |
| `Timeline.ts` | 1 (103/103) | 1 (107/107) |
| `TimelineStore.ts` | 0.9697 (32/33) | 0.9697 (32/33) |
| `DecisionLogHttp.ts` | 1 (17/17) | 1 (17/17) |

Detected counts fell only where killed mutants moved out with deleted code: `DecisionLog.ts` lost 11 (6 deleted, 5
rewritten), `DecisionRecord.ts` 5 (all deleted: the stamp classes and `stampRecordMatch`), `SinkCodec.ts` 3 (deleted, the
re-stamp) and `Timeline.ts` 50 (46 deleted, 4 rewritten) while gaining 54 on the envelope's own lines. The one survivor
that left `DecisionLog.ts`, the `isolate("publish")` string literal, was on a deleted line. `SinkCodec.ts`'s four survivors
(lines 322, 324, 387, 391) and `DecisionStream.ts`'s two are unchanged, and `TimelineStore.ts`'s one is the base's. The
static-ignored mutants new in `DecisionRecord.ts` (1), `SinkCodec.ts` (2) and `Timeline.ts` (4) were measured too, with
`ignoreStatic: false` (`58-mutation-static.json`): all seven are `Killed`. No test was added for the gate: the comparison
held on its first run. The comparison printed `WX-05 holds (D-16)`.

## Consequences

- **Breaking** for `@qadi/core`: `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord` and `Stamped` are removed
  with no alias, `StoredRecord` is re-shaped from a union to the envelope class, `sinkRecordOrder` is new, and
  `storedRecordOrder` is re-typed over the envelope; `spec:api` counts 936 exports before and 933 after. For
  `@qadi/devtools`, `ingest` takes the envelope. For `@qadi/http`, the `DecisionLogReader` element type changes shape
  (D-15).
- **The wire is unchanged.** The stored bytes and Phase 57's refusals are what they were (D-05), and `@qadi/audit`'s
  archive format is untouched; only its doc names `sinkRecordOrder`.
- **The log has no catch of its own.** A defect in a log's `record` is reported once by the emitter (D-12).
- **A new `SinkRecord` kind needs no stored class, no stamp arm and no decode re-stamp:** the envelope holds it as
  `record`.
- INV-QD-361 and INV-QD-362 state the two properties and BEH-QD-626..630 the behaviours; BEH-QD-569 and INV-QD-039 are
  amended to say what a stored record and the order now are. Their anchors are written with the specification, not here.
- Migration: `record.environment` becomes `stored.environment`, `stored._tag` becomes `stored.record._tag`, and
  `stampRecord(record, environment)` becomes `new StoredRecord({ environment, record })`.

## Related

[ADR-QD-095](./095-sinkcodec-owns-both-directions.md), [ADR-QD-097](./097-a-decision-log-is-a-sink-and-its-own-history.md),
[ADR-QD-135](./135-sink-record-fields-stated-once.md), [ADR-QD-159](./159-the-sink-emitter-reports-what-it-contains.md),
[ADR-QD-170](./170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md),
BEH-QD-569, BEH-QD-626..630, INV-QD-039, INV-QD-361, INV-QD-362, ARCH-105, CCR-QD-449.
