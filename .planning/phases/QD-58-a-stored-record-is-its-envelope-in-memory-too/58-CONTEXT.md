# Phase 58: A stored record is its envelope in memory too - Context

**Gathered:** 2026-11-19
**Status:** Ready for planning

<domain>
## Phase Boundary

**The change.** On the wire a stored record is `{ environment, record }` (`StoredRecordJson`, `SinkCodec.ts:563`). In memory it is flattened into two `Data.TaggedClass`es, `StoredDecisionRecord` and `StoredObligationRecord` (`DecisionRecord.ts:145-153`), by `stampRecord`/`stampRecordMatch`. About 20 lines of doc explain the prototype-loss trap that the flattening creates. Devtools' timeline writes the shape twice more, as `DecisionRecord & { environment: string }` and `ObligationRecord & { environment: string }` (`Timeline.ts:114,144`). This phase makes the in-memory stored record the envelope itself, so a new `SinkRecord` kind needs no stored class, stamp arm or decode re-stamp.

**In scope:**
- core's `DecisionRecord.ts`, `DecisionLog.ts`, `DecisionStream.ts`, `SinkCodec.ts` and `AttributeResolver.ts` (doc mention);
- http's `DecisionLogHttp.ts`, `DecisionBacklogRoute.ts` and `DecisionStreamRoute.ts`;
- devtools' `Source.ts`, `Timeline.ts` and `TimelineStore.ts`;
- every test, feature, example and doc that names the deleted symbols.

These are the 11 `src` files that name `StoredRecord` on the Phase 57 base. Re-verify the list at plan time.

**Out of scope:**
- The wire shape and the stored byte goldens. They do not change (STOR-02).
- `environment` stays a plain `string` label. The `Stamped` doc's reasoning is kept on the new field.
- `@qadi/audit`'s archive format. Its `storedRecordOrder` mention is doc only, and is updated if the name's meaning changes.
</domain>

<decisions>
## Implementation Decisions

### The envelope (STOR-01), owner choices 2026-11-19

- **D-01, shape:** a stored record is ONE `Data.Class`:
  ```
  class StoredRecord extends Data.Class<{ readonly environment: string; readonly record: SinkRecord }>
  ```
  - It is built with `new StoredRecord({ environment, record })`, and keeps `Equal`, `Hash` and `.pipe`.
  - A reader narrows on `stored.record._tag`.
  - Deleted: `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`, `stampRecordMatch`, and the prototype-loss doc on both.
  - Rejected: a plain readonly interface, because it has no structural equality, unlike every other record type in core. Also rejected: a tagged class per kind with `record` nested, because the tag would then be stated twice.
- **D-02, naming:** the name `StoredRecord` is kept for the envelope class (it was the union type).
  - `Stamped` is deleted, and its `environment` doc (a label, not an input; why it is a plain `string`) moves onto the class field.
  - No aliases and no deprecated re-exports. This is Breaking, and recorded as such.
  - `StoredRecordJson` and `decodeStoredRecord`/`decodeStoredRecordString` keep their names, which now agree with the class.
- **D-03, order (STOR-03):** two typed orders.
  - `sinkRecordOrder: Order.Order<SinkRecord>` reads `at` once, with the INV-QD-039 rule (unknown `NaN` after every known, two unknowns equal). It takes the current body.
  - `storedRecordOrder: Order.Order<StoredRecord>` is `Order.mapInput(sinkRecordOrder, (s) => s.record)`.
  - Each caller orders what it holds: `DecisionLog`'s `byRecord`, `DecisionStream`'s backlog, and devtools' `Source` and `Timeline`'s `isAfter`.
  - The structural `{ readonly at: number }` order type goes away.
- **D-04, timeline (STOR-03):** devtools' timeline ingests the envelope.
  - `ingest` takes a `StoredRecord` and narrows on `stored.record._tag`.
  - The timeline's own entry rows stay flat display rows that it builds from the envelope, so the entry key `(_tag, environment, evaluationId, at)` and the rendering are unchanged.
  - Both intersection spellings are deleted.

### The codec (STOR-02)

- **D-05:** The stored codec is the record codec plus one field.
  - Decode: `untrustedDecoder` (Phase 57's `storedWire`) gives `{ environment, record }`, then `decodeSinkRecord` on `record`, then `new StoredRecord({ environment, record })`. No stamp step.
  - Encode: the envelope's `environment` is written beside the encoded record.
  - The stored byte goldens committed on the phase base must be byte-identical after.
  - The Phase 57 refusal tags and messages (D-17/D-18 there) are unchanged.

### Consumers (STOR-03)

- **D-06:** `DecisionLog` constructs the envelope where it stamped, at the `LogEntry` record.
  - `snapshot` and backlog presentation use `storedRecordOrder`.
  - The http encoders (`DecisionLogHttp.ts`) encode the envelope directly.
  - `DecisionStream`'s backlog sorts by `storedRecordOrder`.
  - devtools' `Source` merges backlogs by `storedRecordOrder` and passes envelopes to the timeline.

### Tests and mutation

- **D-07 (WX-06):** The characterisation tests are written on the phase base and are green before and after:
  - a SinkCodec stored round trip;
  - a `DecisionLog` backlog-stamping test (environment and record survive, prototype intact);
  - an order test (`NaN` last, two unknowns equal, stable arrival);
  - the stored byte goldens.

  A test that reaches the deleted shape (`record.environment`, `StoredDecisionRecord`) is rewritten in the same commit as the source it follows, and is never weakened.
- **D-08 (WX-05):** Mutation evidence follows Phase 57's D-12: Phase 53's D-14 rule with ADR-QD-167 Rev 1.1's static credit.
  - The base JSON is recorded on the phase base for every touched `src` file Stryker covers: core `DecisionRecord.ts`, `DecisionLog.ts`, `DecisionStream.ts`, `SinkCodec.ts`; http `DecisionLogHttp.ts`; devtools `Source.ts`, `Timeline.ts`, `TimelineStore.ts`. Re-verify which configs cover each.
  - A fall passes only as killed mutants that moved, with an unchanged survivor set.
  - Run one Stryker config at a time, never beside vitest.
- **D-09:** Plan order, RED first:
  1. the mutation base;
  2. the characterisation (round trip, backlog stamping, order, byte goldens);
  3. core's envelope and orders;
  4. http, then devtools;
  5. the mutation after-run;
  6. the records and changesets;
  7. the close.

### Records

- **D-10 (WX-02):** ARCH-105 and ADR-QD-171.
  - ADR-QD-171 makes ADR-QD-097 D-11-e true in memory as well as on the wire, records D-01..D-04 with the rejected alternatives, and amends any ADR that names `stampRecord` or the flattened classes as the design.
  - Also CCR-QD-449, BEH-QD-626..630 and INV-QD-361..362. The CCR row names any unused reservation as "Unused: …".
  - Never run `scripts/next-id.mjs`. The numbers are reserved.
- **D-11 (WX-03, WX-07):**
  - `spec/overview.md` follows gate 13 for every removed or changed export: `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`, `Stamped`, `StoredRecord`, `storedRecordOrder`, and the new `sinkRecordOrder`.
  - Each affected package gets a **Breaking** changeset: `@qadi/core`, `@qadi/http` and `@qadi/devtools` at minor (pre-1.0, like Phases 56 and 57).
  - Add an `upgrading.md` 0.13 entry with the migration (`record.environment` becomes `stored.environment`; `stored._tag` becomes `stored.record._tag`; `stampRecord(r, e)` becomes `new StoredRecord({ environment: e, record: r })`).
  - Nothing is released.

### Claude's Discretion

- Where `sinkRecordOrder` lives (beside `at` in `DecisionRecord.ts` is the default).
- How the round trip and goldens are phrased, the exact test titles, and any helper for building an envelope in tests. A helper is test-only, and `src` gets no new factory beyond the constructor.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StoredRecordJson` (`SinkCodec.ts:563`) is already the wire envelope.
- Phase 57's `storedWire` and `fromEnvelope` decode it through `untrustedDecoder`.
- `DecisionRecord`/`ObligationRecord` are `Data.TaggedClass`es typed by `SinkRecordFields.ts` structs (ADR-QD-135).

### Established Patterns
- In-memory records are `Data.TaggedClass`/`Data.Class` with structural equality.
- Orders are `Order.Order<T>` values in core (INV-QD-039).
- Breaking changes are recorded per package with `upgrading.md` (Phases 56 and 57).

### Integration Points
- `DecisionLog.ts:237` stamps at `record`/`ingest`.
- `SinkCodec.ts:616` stamps on decode.
- `DecisionLogHttp.ts:100` encodes `StoredRecordJson`.
- `DecisionStream.ts:291` sorts the backlog.
- devtools `Source.ts:218` merges backlogs.
- `Timeline.ts:114,144,201` ingests and orders.
</code_context>

<specifics>
## Specific Ideas

The owner prefers the cleanest, most complete design over the simplest. Breaking changes are fine and are recorded, never avoided.
</specifics>

<deferred>
## Deferred Ideas

- Phase 57's carried Info (IN-01, `project`'s "reads no value" doc wording, shared with ADR-QD-170 D-19). Handle it in the next change to `UntrustedDecode.ts`, not here.
- Phase 57's owner question of whether the hydration payload should be `ignore` (its D-09 report).
</deferred>
