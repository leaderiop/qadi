# Phase 58: A stored record is its envelope in memory too - Research

**Researched:** 2026-11-19
**Domain:** In-memory shape of a decision log's stored record (`@qadi/core`), its codec, and its three consumers (`@qadi/http`, `@qadi/devtools`, tests/gates). Effect v4 (`effect@4.1.2`).
**Confidence:** HIGH (every blast-radius figure below was measured by applying the change in a scratch copy of `HEAD` and running tsc, vitest, madge, the doc-fence gates and gate 13; the scratch copy is outside the repo and nothing in the repo was edited)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The envelope (STOR-01), owner choices 2026-11-19**

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

**The codec (STOR-02)**

- **D-05:** The stored codec is the record codec plus one field.
  - Decode: `untrustedDecoder` (Phase 57's `storedWire`) gives `{ environment, record }`, then `decodeSinkRecord` on `record`, then `new StoredRecord({ environment, record })`. No stamp step.
  - Encode: the envelope's `environment` is written beside the encoded record.
  - The stored byte goldens committed on the phase base must be byte-identical after.
  - The Phase 57 refusal tags and messages (D-17/D-18 there) are unchanged.

**Consumers (STOR-03)**

- **D-06:** `DecisionLog` constructs the envelope where it stamped, at the `LogEntry` record.
  - `snapshot` and backlog presentation use `storedRecordOrder`.
  - The http encoders (`DecisionLogHttp.ts`) encode the envelope directly.
  - `DecisionStream`'s backlog sorts by `storedRecordOrder`.
  - devtools' `Source` merges backlogs by `storedRecordOrder` and passes envelopes to the timeline.

**Tests and mutation**

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

**Records**

- **D-10 (WX-02):** ARCH-105 and ADR-QD-171.
  - ADR-QD-171 makes ADR-QD-097 D-11-e true in memory as well as on the wire, records D-01..D-04 with the rejected alternatives, and amends any ADR that names `stampRecord` or the flattened classes as the design.
  - Also CCR-QD-449, BEH-QD-626..630 and INV-QD-361..362. The CCR row names any unused reservation as "Unused: ...".
  - Never run `scripts/next-id.mjs`. The numbers are reserved.
- **D-11 (WX-03, WX-07):**
  - `spec/overview.md` follows gate 13 for every removed or changed export: `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`, `Stamped`, `StoredRecord`, `storedRecordOrder`, and the new `sinkRecordOrder`.
  - Each affected package gets a **Breaking** changeset: `@qadi/core`, `@qadi/http` and `@qadi/devtools` at minor (pre-1.0, like Phases 56 and 57).
  - Add an `upgrading.md` 0.13 entry with the migration (`record.environment` becomes `stored.environment`; `stored._tag` becomes `stored.record._tag`; `stampRecord(r, e)` becomes `new StoredRecord({ environment: e, record: r })`).
  - Nothing is released.

### Claude's Discretion

- Where `sinkRecordOrder` lives (beside `at` in `DecisionRecord.ts` is the default).
- How the round trip and goldens are phrased, the exact test titles, and any helper for building an envelope in tests. A helper is test-only, and `src` gets no new factory beyond the constructor.

### Deferred Ideas (OUT OF SCOPE)

- Phase 57's carried Info (IN-01, `project`'s "reads no value" doc wording, shared with ADR-QD-170 D-19). Handle it in the next change to `UntrustedDecode.ts`, not here.
- Phase 57's owner question of whether the hydration payload should be `ignore` (its D-09 report).

**Out of scope (Phase Boundary):** the wire shape and the stored byte goldens (STOR-02); `environment` stays a plain `string`; `@qadi/audit`'s archive format (its `storedRecordOrder` mention is doc only, and is updated if the name's meaning changes).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STOR-01 | In memory the stored record is the envelope; the two flattened classes, `stampRecord`, `stampRecordMatch` and the prototype-loss doc are deleted | §Envelope class (spike proves `Data.Class` gives structural `Equal`/`Hash`/`.pipe`); §Blast radius (4 src files change code) |
| STOR-02 | The stored codec is the record codec plus one field; stored byte goldens unchanged | §Codec (two one-line edits in `SinkCodec.ts`); §Goldens (the eight hand-written `V2_*` fixtures x environments reproduce byte-for-byte after the change) |
| STOR-03 | `DecisionLog` stamping, `storedRecordOrder`, http encoders and devtools' timeline read the envelope | §Orders, §Devtools timeline, §Consumers; http needs no code edit (type-neutral) |
| STOR-04 | ADR-QD-171 makes ADR-QD-097 D-11-e true in memory; **Breaking** in each affected package's changeset and in `upgrading.md` | §Records |
| WX-01 | `pnpm check:pr` green at close | §Validation Architecture; §Pitfalls (gate 14 script, features need a built `lib/`) |
| WX-02 | ADR/CCR/BEH/INV with reserved numbers only | §Records (all reserved ids confirmed free by `git grep`) |
| WX-03 | `spec/overview.md` follows gate 13 | §Records (gate 13 prints 936 on base; 933 after, measured) |
| WX-04 | nothing new from the banned list | §Pitfalls (scratch change passes `check-house-style`, oxlint, madge) |
| WX-05 | coverage holds; Stryker score of touched files does not fall | §Mutation; **§Open Question 1 (the log's `isolate("append")` becomes unreachable)** |
| WX-06 | characterisation tests on the base first | §Validation Architecture (shape-neutral phrasing through the wire) |
| WX-07 | Breaking recorded per package and in `upgrading.md`; nothing released | §Records |
</phase_requirements>

## Summary

The change is smaller in `src` than the 11 names suggest and larger in tests. Applying the whole design in a scratch copy of HEAD (`9115f411`, whose code equals the Phase 57 close: `git diff 82389fc7 HEAD -- packages scripts spec features examples apps .changeset AGENTS.md` is empty) shows exactly **four `src` files change code**: core `DecisionRecord.ts`, `DecisionLog.ts`, `SinkCodec.ts` and devtools `Timeline.ts`. Every other `src` file that names `StoredRecord` (`DecisionStream.ts`, `AttributeResolver.ts`, `Source.ts`, `TimelineStore.ts`, `DecisionLogHttp.ts`, the two http routes, `AuditArchive.ts`) is type-neutral because `StoredRecord` keeps its name and becomes the class; they need doc edits at most. `@qadi/http` has **no code change at all**. Tests are the bulk: 6 vitest projects plus tstyche, `features/` and one gate script reach the deleted shape (see the blast-radius tables, all counts measured).

Two findings the CONTEXT does not anticipate and the planner must resolve (details in Open Questions). (1) D-03 lists `Timeline`'s `isAfter` as ordering "what it holds", but `isAfter` orders the timeline's own `TimelineEntry` rows, which are neither `SinkRecord` nor `StoredRecord`; the scratch spike orders them with `Order.mapInput(sinkRecordOrder, recordOf)` where `recordOf` picks `entry.decision` or `entry.obligations`. (2) **The log's `isolate("append")` catch becomes unreachable by any test.** ADR-QD-159 states "The decision log's append half is reachable through `ingest` with a record that carries an enumerable throwing getter (C4)"; that reachability exists only because `stampRecord`'s `{ ...r, environment }` spread read every enumerable getter. `new StoredRecord({ environment, record })` reads none, so test C4 (`ShippedSinkReports.test.ts:129`) fails at runtime (measured: "expected +0 to equal 1"), and its removal or the removal of the catch is a decision the owner has not made.

Byte goldens are safe: all eight hand-written `V2_*` wire fixtures (`packages/core/test/fixtures/sinkWireV2.ts`) times three environments (`Server`, `édge ✓`, `a"b`) encode through the new envelope to exactly `{"environment":<json>,"record":<fixture>}` (24/24 true in the spike).

**Primary recommendation:** do the change as the CONTEXT orders it (mutation base, characterisation, one atomic core+consumer commit, records), but (a) get an owner decision on the `isolate` halves before the core plan, (b) take `Timeline`'s order from `Order.mapInput(sinkRecordOrder, recordOf)`, (c) fix `scripts/check-package-install.mjs` (it imports `stampRecord`; no grep over `packages/` finds it), and (d) build `lib/` (`pnpm exec tsc -b tsconfig.json`) before running `features/`, which resolves `@qadi/core` through `lib/`, not `src/`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| The stored record's in-memory shape (`StoredRecord`) and its orders | `@qadi/core` (library domain) | — | One owner beside `at`/`SinkRecord` in `DecisionRecord.ts` (ADR-QD-097 D-11-h) |
| Stamping the producer's label | `DecisionLog` (core) at `LogEntry` creation | `decodeStoredRecord` (wire reader) | Label is stated once at the producer; a reader never states it (ADR-QD-097 D-11-e) |
| Wire form `{ environment, record }` | `SinkCodec.ts` (core) | — | Unchanged by this phase; `StoredRecordJson` stays the codec |
| Encoding the envelope for SSE/JSON | `@qadi/http` `DecisionLogHttp.ts` | core `encodeStoredRecord*` | Already passes the `StoredRecord` straight to core's codec; no change |
| Folding records into display rows | `@qadi/devtools` model (`Timeline.ts`) | — | Builds flat `TimelineDecision`/`TimelineOrphan` rows from the envelope |
| Presenting a backlog in time order | each reader (`DecisionLog`, `decodeDecisionStream`, devtools `mergeSources`, `Timeline`) | — | INV-QD-039: one order, each caller orders what it holds |

## Standard Stack

No new libraries. The change uses only what core already imports. [VERIFIED: `git grep` over `packages/core/src/DecisionRecord.ts` imports, read this session]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 [VERIFIED: `node_modules/effect/package.json` `"version"`] | `Data.Class`, `Order.mapInput`, `Order.isGreaterThan` | Already the house base; `Data.Class` is the sibling of the `Data.TaggedClass` every record uses |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Data.Class` envelope (D-01, locked) | plain readonly interface | rejected by owner: no structural equality |
| `Data.Class` envelope | `Schema.Class` / `Schema.TaggedClass` | rejected on ADR-QD-135's measured numbers: "5.3x to 140x per record on the evaluation path, growing with the policy, plus a constructor that can throw there" (`spec/decisions/135-...md:170-173`); the log builds one envelope per decision |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed or added by this phase. Audit not applicable. Packages removed: none. Packages flagged: none.

## Architecture Patterns

### System Architecture Diagram

```
evaluate / enforcement entry points
        | SinkRecord (DecisionRecord | ObligationRecord)
        v
DecisionSink.record ---> DecisionLog.accept(record, environment)
                              | new StoredRecord({ environment, record })      <- was stampRecord (spread + Match)
                              v
                   entries: Chunk<LogEntry { cursor, record: StoredRecord }>
                     |  snapshot / presented()  --toSorted(byRecord = storedRecordOrder)-->  StoredRecord[]
                     |  readEntries ---------------------------------------------+
                     v                                                           v
       encodeDecisionStream (cursor order)                              DecisionLogRead {backlog, live}
                     | encodeRecord: StoredRecord -> Option<string>               |
                     v                                                           v
 @qadi/http recordData -> core encodeStoredRecordString                 devtools Source (log is a Source)
   = encodeSinkRecord(stored.record) + { environment }  [wire unchanged]   mergeSources: sort(storedRecordOrder)
                     | SSE frame "{environment, record}"                         |
                     v                                                           v
 EventSource -> decodeStoredRecordString                                 Timeline.ingest(self, stored)
   storedWire (untrustedDecoder, ignore, record unwalked)                  stored.record._tag -> ingestDecision(self, env, record)
   -> decodeSinkRecord(record) -> new StoredRecord({environment, record})                      ingestObligations(self, env, record)
        [no stamp step]                                                    rows stay flat: TimelineDecision / TimelineOrphan
                                                                           isAfter = isGreaterThan(mapInput(sinkRecordOrder, recordOf))
```

### Recommended Project Structure
No new files in `src`. `DecisionRecord.ts` gains `sinkRecordOrder` and the `StoredRecord` class and loses 4 exports. Tests may gain one test-only builder per package (devtools already has `test/helpers.ts`).

### Pattern 1: the envelope class (D-01, D-02)
**What:** a two-field `Data.Class`, doc on the field. **Spike result (compiled and run in the scratch copy):**
```typescript
// Source: scratch spike; Data.Class signature read at node_modules/effect/src/Data.ts:50-59
export class StoredRecord extends Data.Class<{
  /** Where this evaluation happened ... (the `Stamped.environment` doc moves here verbatim) */
  readonly environment: string;
  /** What core reported, unchanged: a `DecisionRecord` or an `ObligationRecord` instance, kept by reference. */
  readonly record: SinkRecord;
}> {}
```
Measured semantics (node, `effect@4.1.2`): `Equal.equals(new S({environment:"Server",record:r1}), new S({environment:"Server",record:r2}))` is `true` for structurally equal nested `Data.TaggedClass` records and `false` when `environment` differs; `Hash.hash` agrees (`true`); `.pipe` is a function and `s.pipe(x => x.environment)` returns `"Server"`; own keys are `["environment","record"]`; prototype is `S.prototype`. `toJSON` is **undefined** and `String(s)` is `"[object Object]"`, so `JSON.stringify(stored)` yields an in-memory-shaped nesting, not the wire form. Nothing in `src` stringifies a stored record directly (`grep JSON.stringify` over devtools/http/core stream+log: only `DecisionBacklogRoute.ts:61` stringifies already-encoded elements) [VERIFIED: grep this session].

**Narrowing** compiles on a property path: `stored.record._tag === "Decision" ? f(stored.record) : g(stored.record)` narrows `stored.record` (the scratch `Timeline.ts` uses exactly this and typechecks).

### Pattern 2: the two orders (D-03)
`Order.mapInput` is data-last-dual in effect@4: `Order.mapInput(Order.Number, (s: string) => s.length)` [CITED: `node_modules/effect/src/Order.ts:545-575`]. Module order matters: `sinkRecordOrder` must be declared before `storedRecordOrder` (module-scope initialiser).
```typescript
export const sinkRecordOrder: Order.Order<SinkRecord> = Order.make((a, b) => { /* body of today's storedRecordOrder, unchanged */ });
export const storedRecordOrder: Order.Order<StoredRecord> = Order.mapInput(sinkRecordOrder, (s: StoredRecord) => s.record);
```
Today's body, verbatim, [VERIFIED: `packages/core/src/DecisionRecord.ts:205-210`]:
```ts
export const storedRecordOrder: Order.Order<{ readonly at: number }> = Order.make((a, b) => {
  const aUnknown = Number.isNaN(a.at);
  const bUnknown = Number.isNaN(b.at);
  if (aUnknown || bUnknown) return aUnknown === bUnknown ? 0 : aUnknown ? 1 : -1;
  return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
});
```

### Pattern 3: each call site orders what it holds (measured at HEAD)

| Site | Holds | Edit |
|------|-------|------|
| `DecisionLog.ts:160` `byRecord = (a: LogEntry, b: LogEntry) => storedRecordOrder(a.record, b.record)` | `LogEntry.record: StoredRecord` | none (type-compatible) |
| `DecisionStream.ts:291` `backlog.flatMap(Option.toArray).toSorted(storedRecordOrder)` | `StoredRecord[]` | none |
| devtools `Source.ts:218` `backlogs.flat().sort(storedRecordOrder)` | `StoredRecord[]` | none |
| devtools `Timeline.ts:201` `const isAfter = Order.isGreaterThan(storedRecordOrder);` used at `:223` `isAfter(existing, entry)` | **`TimelineEntry` rows** | **edit: see Open Question 2** |
| `AuditArchive.ts:102` doc "Ordering them by `at` is a reader's job (`storedRecordOrder`, ADR-QD-056)" | archive entries are bare `SinkRecord`s | doc: rename to `sinkRecordOrder` (the meaning changed); same in `spec/behaviors/33-audit-pipeline.md:772` |

No caller in `packages/*/src` orders bare `SinkRecord`s today (the only `sort`/`toSorted`/`Order.` call sites are the ones above plus `ArchiveFacts.ts` by sequence number) [VERIFIED: grep this session]. So `sinkRecordOrder` has no src consumer other than `storedRecordOrder` and `Timeline.ts`.

### Pattern 4: the codec edits (D-05)
Current code [VERIFIED: `packages/core/src/SinkCodec.ts:574-577, 611-616`]:
```ts
export const encodeStoredRecord = (
  stored: StoredRecord,
): Result.Result<StoredRecordJson, SinkRecordNotEncodable> =>
  Result.map(encodeSinkRecord(stored), (record) => ({ environment: stored.environment, record }));
...
const fromEnvelope = (
  read: Result.Result<typeof StoredEnvelopeWire.Type, UntrustedRefusal>,
): Result.Result<StoredRecord, SinkRecordNotDecodable> =>
  Result.isFailure(read)
    ? notDecodable(decodeRefusalOf(read.failure))
    : Result.map(decodeSinkRecord(read.success.record), (record) => stampRecord(record, read.success.environment));
```
Changes (each measured to compile in the spike): `encodeSinkRecord(stored)` becomes `encodeSinkRecord(stored.record)`; the `stampRecord(...)` arm becomes `new StoredRecord({ environment: read.success.environment, record })`; the import line 63-64 changes (`StoredRecord` moves from `import type` to a value import, `stampRecord` is dropped). `StoredRecordJson`, `StoredEnvelopeWire`, `storedWire`, `decodeStoredRecord`, `decodeStoredRecordString`, `encodeStoredRecordString` are untouched. Docs to rewrite: `SinkCodec.ts:608-610` ("The one isolated `stampRecord` call") and `:642-643` ("The record is rebuilt and stamped here, with `stampRecord`").

`UNTRUSTED_DECODE_BUDGET` is unaffected (the edit adds no `JSON.parse`, `Schema.decode*`, `onExcessProperty` or `exceedsJsonDepth` token) [VERIFIED: `node scripts/check-house-style.mjs` in the scratch copy: "556 file(s) clean (3 declared switch(es))"].

### Pattern 5: `DecisionLog` (D-06)
[VERIFIED: `packages/core/src/DecisionLog.ts:237`] `const entry: LogEntry = { cursor: { epoch, seq }, record: stampRecord(record, environment) };` becomes `record: new StoredRecord({ environment, record })`; the import at `:38-39` becomes `import { StoredRecord, storedRecordOrder } ...` plus `import type { SinkRecord }`. **Behavioural note:** the log now retains the caller's record *instance* (by reference) where it used to retain a shallow copy. Only top-level fields were ever copied (`policy`, `outcome`, `resource` were already shared by reference), so the observable difference is that a later runtime mutation of a top-level field of the sink's record is now visible in the log. Records are typed `readonly` but not frozen (test C4 itself adds a property with `Object.defineProperty`). A backlog-stamping characterisation row can assert identity (`stored.record === original`) after the change; it cannot be green on the base.

### Pattern 6: devtools timeline (D-04) - the proven shape
This compiled clean in the scratch copy (`tsc -b tsconfig.json`: 0 errors):
```ts
export const ingest = (self: Timeline, stored: StoredRecord): Timeline =>
  stored.record._tag === "Decision"
    ? ingestDecision(self, stored.environment, stored.record)
    : ingestObligations(self, stored.environment, stored.record);

const ingestDecision = (self: Timeline, environment: string, record: DecisionRecord): Timeline => { ... };
const ingestObligations = (self: Timeline, environment: string, record: ObligationRecord): Timeline => { ... };

const sameSlot = (entry: TimelineEntry, environment: string, record: { evaluationId: string; at: number }): boolean =>
  sameEvaluation(entry, environment, record) && entry.at === record.at;
const sameEvaluation = (entry: TimelineEntry, environment: string, record: { evaluationId: string }): boolean =>
  entry.evaluationId === record.evaluationId && entry.environment === environment;
```
`entryKey` (`Timeline.ts:102-103`, `` `${entry._tag}|${entry.environment}|${entry.evaluationId}|${entry.at}` ``) and `TimelineDecision`/`TimelineOrphan` are untouched, so rendering and the key are unchanged (D-04). `ingestAll` (`reduce(ingest, self)`) and `TimelineStore.accept: (record: StoredRecord) => void` keep their types; rename the parameter to `stored` for the reader.

### Anti-Patterns to Avoid
- **Reintroducing a flat convenience (getter, helper, alias) so tests keep compiling.** D-02 forbids aliases; tests are rewritten, not shimmed.
- **A `Stored*` alias export "for one minor".** Rejected by the owner.
- **Making `StoredRecord` a `Schema.Class`.** Rejected on ADR-QD-135's measurements; also its constructor can throw on the log's per-decision path.
- **`switch` / `as` / `!` / `any` to narrow.** None is needed: property-path narrowing compiles.

## Blast radius (measured)

Method: `git archive HEAD` into the scratchpad, applied the design, ran `tsc -b tsconfig.json`, `tsc -p tsconfig.test.json`, the six vitest projects, the `features` project, `check-doc-examples.mjs`, `check-website-doc-examples.mjs`, `check-api-surface.mjs`, `madge --circular`, `check-house-style.mjs`, `oxlint`. Baseline on HEAD has 9 pre-existing tsc errors, all in `packages/predicate-prisma/test` (gitignored `prisma/generated` absent); ignore them.

### `src` per package: code vs doc

| File | Word hits (`StoredRecord`/deleted names/`storedRecordOrder`) | Change |
|------|------|--------|
| `packages/core/src/DecisionRecord.ts` | 4 / 14 / 1 | **code**: delete `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecordMatch`, `stampRecord` and the `Match` import; add `StoredRecord` class, `sinkRecordOrder`; `storedRecordOrder` re-typed |
| `packages/core/src/DecisionLog.ts` | 5 / 2 / 5 | **code**: 1 import line pair + `:237` |
| `packages/core/src/SinkCodec.ts` | 6 / 4 / 0 | **code**: imports, `:577`, `:616`; docs `:608-610`, `:642-643` |
| `packages/devtools/src/model/Timeline.ts` | 3 / 0 / 3 | **code**: 8 tsc errors on the new core; Pattern 6 |
| `packages/core/src/DecisionStream.ts` | 6 / 0 / 5 | none (docs name `storedRecordOrder`, still true) |
| `packages/core/src/AttributeResolver.ts:51` | 1 / 0 / 0 | none ("same category as `StoredRecord.environment`" stays true) |
| `packages/devtools/src/model/Source.ts` | 5 / 0 / 3 | none for code; doc `:106` says "decodeStoredRecordString, which stamps the producer's label" (rephrase), `:225-227` likewise |
| `packages/devtools/src/model/TimelineStore.ts` | 2 / 0 / 0 | rename param only (optional) |
| `packages/http/src/DecisionLogHttp.ts` | 3 / 0 / 0 | **none**: `encodeStoredRecord(stored: StoredRecord)` is already handed the stored value whole |
| `packages/http/src/DecisionBacklogRoute.ts`, `DecisionStreamRoute.ts` | doc only | none |
| `packages/audit/src/AuditArchive.ts:102` | doc | rename `storedRecordOrder` to `sinkRecordOrder` (CONTEXT: "updated if the name's meaning changes"; it does) |

Nothing else in `packages/*/src` (react, testing, promise, predicate-*, audit besides the doc line) names a stored record. `@qadi/devtools/react` reads `TimelineEntry` rows only (`entry.environment`), never a stored record [VERIFIED: grep of `.environment` across `packages/*/src`].

**Nothing in `src` relies on `stored._tag`** other than `Timeline.ingest`. No `Match.tagsExhaustive` runs over a `StoredRecord`; `DecisionStreamFrame`/`encodeDecisionStream`/`decodeDecisionStream` see a stored record only through opaque `encodeRecord`/`decodeRecord` callbacks [VERIFIED: `DecisionStream.ts:124, 249, 275`].

### Tests: files reaching the deleted shape (tsc errors after the change, measured with `stampRecord` etc. removed, then re-measured with a shim to expose hidden downstream errors)

| File | Errors | Nature |
|------|--------|--------|
| `packages/core/test/SinkCodec.test.ts` | 10 (9 re-measured with shim) | imports `stampRecord`/`StoredDecisionRecord`/`StoredObligationRecord` (lines 15-17); `instanceOf` at `:2156`, `:2168`; flat `_tag`/`evaluationId`/`outcome` reads `:2148-2161`; builders `:2100-2133`, `:2244` |
| `packages/core/test/DecisionRecord.test.ts` | 12 | the INV-QD-039 law grid calls the order with `{ at }` doubles (`:20-58`) and sorts `{ at, id }` rows (`:49`); must be rebuilt on `SinkRecord`s (`ObligationRecord` is the cheapest) |
| `packages/core/test/DecisionLog.test.ts` | 11 | imports (`:29`), `instanceOf` `:69`, `:379`, `:405`, flat reads |
| `packages/core/test/DecisionSinkForwarding.test.ts` | 7 | `encodeSinkRecord(stored)` at `:54` (a flat stored record used to typecheck as a `SinkRecord`); flat reads `:492-535` |
| `packages/core/test/DecisionStream.test.ts` | 5 (4 w/ shim) | `stampRecord` import `:48`, builders `:64`, `:201`; `.evaluationId` reads |
| `packages/core/test/EvaluationEnvironment.test.ts` | 2 | `:58` flat `_tag`/`cache` |
| `packages/core/test/DecisionSink.tst.ts` | 3 | tstyche pin `:70-76` "StoredRecord ... narrows on _tag" must become `.record._tag`; keep `expect<StoredRecord["environment"]>().type.toBe<string>()` |
| `packages/core/test/ShippedSinkReports.test.ts` | 0 type errors, **1 runtime failure** | C4 (`:129`): see Open Question 1 |
| `packages/devtools/test/model/Source.test.ts` | 27 | flat reads; plus `:314` comment names `stampRecord` |
| `packages/devtools/test/helpers.ts` | 1 | `decisionRecord`/`obligationRecord` builders (`:107`, `:150`) call `stampRecord`; one rewrite fixes every devtools test that builds through them |
| `packages/http/test/decisionStream.test.ts` | 4 | `stored` builder `:141`, flat `.evaluationId` `:930`, `:1069`, `:1101` |
| `packages/http/test/DecisionLogHttp.test.ts` | 3 | `stored` builder `:56`, `:134` |
| `packages/http/test/decisionBacklog.test.ts` | 1 | `:110` |
| `packages/react/test/QadiAtoms.test.ts` | 1 | `:572` flat `_tag` on `log.snapshot` |
| `packages/testing/test/QadiReviewLayer.test.ts` | 2 | `:56` flat `_tag`/`cache` |
| `features/features/decision-log/decision-log.steps.test.ts` | 5 | flat `_tag`/`at`/`evaluationId` `:197`, `:301`, `:304` |
| `features/features/merged-sources/merged-sources.steps.test.ts` | 3 | builder `:62`, `:260` |
| `features/features/devtools/devtools.steps.test.ts`, `devtools-screens`, `devtools-simulator` | constructors only (7, 2, 4 `stampRecord` tokens) | mechanical |
| `scripts/check-package-install.mjs:419, :487` | n/a (a template string compiled by gate 14) | **imports and calls `stampRecord`**; see Pitfall 1 |

**Only go through public APIs that keep working (no edit needed):** `packages/core/test/UntrustedSeams.test.ts`, all of `packages/audit/test`, `packages/devtools/test/model/{DockModel,Replay,TimelineFeed}.test.ts` and `test/react/*` (they build through `helpers.ts` and only annotate `StoredRecord`), `*.tst.ts` for `DecisionLog`, `DecisionStream`, `DecisionLogHttp`, `Source` (types only). Runtime failures after a core-only change with a temporary shim: core 39 (7 files), devtools 31 (all `Source.test.ts`), http 19 (3 files), react 1, testing 1, audit 0; with the shim removed every failure is a compile error, so `pnpm typecheck` is the exhaustive detector.

### Non-`src`, non-test artefacts

| Where | Names | Needs |
|-------|-------|-------|
| `spec/overview.md` `:347-350` | `Stamped`, `StoredRecord`, `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`, `storedRecordOrder` rows; `:314`, `:319` prose names `storedRecordOrder` | gate 13: drop 4 rows' names, add `sinkRecordOrder`, re-describe `StoredRecord` and `storedRecordOrder`. **Measured: `spec:api` prints 936 on HEAD; after the change the scratch gate reported exactly 5 drifts (add `sinkRecordOrder`; drop `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`), so the close value is 933** |
| `spec/decisions/097-...md` | `:131` "the prototype-preserving stamp"; `:137` "`stampRecord` and the `Stored*` types stay"; `:149-155` D-11-e "the decode stamps the producer's label"; `:173-175` D-11-h "`Stamped`, the `Stored*` classes and `stampRecord` move to `DecisionRecord.ts`" | amend (ADR-QD-171 amends it; Rev 1.5) |
| `spec/decisions/135-...md:173` | "`StoredDecisionRecord` reads the constructor's parameter type" | addendum: that dependency is gone |
| `spec/decisions/159-...md` `:119-120`, `:178-179`; `spec/behaviors/24-decision-sink.md` `:397-404`, `:603-604` | C4 reachability, W6/W7 | only if Open Question 1 is resolved by amending |
| `spec/behaviors/24`, `25:668`, `26`, `27`, `33:772`; `spec/invariants.md` INV-QD-039 `:1624`, `:1631`; `spec/traceability.md` `:195`, `:496` | prose and signature listings (`ts` fences are not compiled) | update where they say the flat shape or "stamped" |
| `apps/website` docs | only `upgrading.md` names these symbols; no fence reads a flat field | new 0.13 section; `spec:examples` (116 blocks) and `spec:website-examples` (68 blocks) compile unchanged in the spike |
| `examples/nextjs-newsroom/e2e/decision-log.spec.ts:13,74` | `decodeStoredRecord(element)` then `Result.isSuccess` | none |
| `.changeset/` | `core-untrusted-decoder-states-unknown-keys.md` mentions `decodeStoredRecord` only | none; add 3 new Breaking changesets |
| `packages/*/CHANGELOG.md` | history | never edited (release owns them) |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| An order over `StoredRecord` | a second comparator or a `{ at }` structural type | `Order.mapInput(sinkRecordOrder, (s) => s.record)` | INV-QD-039's rule (NaN last, unknowns equal) is stated once |
| A test builder for envelopes in `src` | a `stored(...)`/`makeStoredRecord` factory | `new StoredRecord({ environment, record })` (CONTEXT: "src gets no new factory beyond the constructor"); test-only helpers are fine | the constructor is the factory |
| Prototype preservation | a spread plus class dispatch (`stampRecordMatch`) | the envelope holds the record by reference | the trap was caused by the flattening |
| Byte goldens for the stored envelope | encoder-captured strings | compose the hand-written `V2_*` fixtures: `` `{"environment":${JSON.stringify(env)},"record":${V2_X}}` `` | the fixtures were "Hand-written from the ADR ... not captured from the encoder, so the encoder is checked against them" (`test/fixtures/sinkWireV2.ts:1-12`) |

**Key insight:** the flattened classes exist only to translate one fact between two shapes; the deletion test is that the wire already has the right shape.

## Runtime State Inventory

Not a rename/migration phase of persisted data: the wire and every stored byte are unchanged by construction (STOR-02), and nothing persists an in-memory `StoredRecord` (the log is a process-lifetime `Chunk`). Categories answered explicitly:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None - verified: the log holds `StoredRecord`s in a `Chunk` in memory; audit stores bare `SinkRecord` wire JSON, not stored records | none |
| Live service config | None - verified by grep of examples and website for `StoredRecord` usage: only `decodeStoredRecord` in an e2e | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/*/lib` (tsc build output). `features/` resolves `@qadi/core` through `lib/` (package `exports` `import: ./lib/index.js`), unlike core/devtools/http vitest configs which alias to `src/` (devtools `vitest.config.ts:7-8`) | rebuild before `pnpm test:bdd`: `pnpm exec tsc -b tsconfig.json` (a stale `lib/` made 27 features tests fail in the spike where 3 truly fail) |

## Common Pitfalls

### Pitfall 1: `scripts/check-package-install.mjs` imports `stampRecord`
**What goes wrong:** gate 14 (`pnpm spec:package`) packs the packages and typechecks a consumer; its template imports `stampRecord` from `@qadi/core` (`:419`) and calls it (`:487`) building `ingest(emptyTimeline(), stampRecord(new DecisionRecord(...), "Server"))`.
**Why it happens:** a grep over `packages/` and `features/` never sees `scripts/`.
**How to avoid:** change to `new StoredRecord({ environment: "Server", record: new DecisionRecord({...}) })` and import `StoredRecord`. The template is inside a JS template literal; keep the existing escaping.
**Warning signs:** `pnpm spec:package` fails at the consumer's typecheck.

### Pitfall 2: the log's append half no longer dies (see Open Question 1)
**What goes wrong:** `ShippedSinkReports.test.ts` C4 fails; `isolate`'s `catchCause` body has no covering test, which is NoCoverage mutants (D-08) and a few uncovered lines.
**How to avoid:** the owner decides before the core plan (Open Question 1).

### Pitfall 3: `features/` and gate scripts read `lib/`, not `src/`
**What goes wrong:** vitest results for `features/` reflect the last `tsc -b`. **How to avoid:** `pnpm exec tsc -b tsconfig.json` before `pnpm test:bdd`; `pnpm typecheck` does it.

### Pitfall 4: a one-commit break across six test projects
**What goes wrong:** with no aliases (D-02), core's `src` change breaks typecheck of devtools `src`, http/react/testing/devtools tests, `features/` and the gate script at once. **How to avoid:** either one atomic `feat(58-NN)!` commit that carries core src, `Timeline.ts` and every test rewrite (green at each commit; large but mechanical), or two sequential plans accepting a red root typecheck between them (core-project green, root red) with the gate run after both. Recommend the atomic commit for `src` plus the *shape-reaching* test rewrites, kept separate from the characterisation commits that precede it.

### Pitfall 5: shape-reading characterisation tests cannot be green before and after
**What goes wrong:** a base-written test that reads `stored.environment` / `stored._tag` is red after; one that reads `stored.record` is red before. **How to avoid:** phrase the D-07 tests **through the wire**, which has the same API on both sides: `encodeStoredRecordString(stored)` then `JSON.parse` and read `.environment`, `.record.evaluationId`, `.record._tag`. Order: ingest records with `at` `[3, NaN-ish via hand-built, 1, ...]` into a log and compare the snapshot's *encoded* order; also through `mergeSources` and `decodeDecisionStream`'s backlog. Byte-fixed-point round trip: `text -> decodeStoredRecordString -> encodeStoredRecordString === text`. Prototype intact: `typeof stored.pipe === "function"` and `Equal.equals(a, b)` work on both sides (and `.record` identity/`instanceof DecisionRecord` rows are RED-on-base new-shape rows, like Phase 57's D-01/D-17/D-18 rows).

### Pitfall 6: `Equal`/hash and `toJSON` expectations
`Equal.equals` is deep and structural through `record`, as before. `JSON.stringify(stored)` is not the wire form (no `toJSON`); the wire is `encodeStoredRecord*` only. No `src` caller stringifies a stored record.

### Pitfall 7: devtools `Source.test.ts` and `helpers.ts`
`helpers.ts` is the single leverage point (its `decisionRecord`/`obligationRecord` call `stampRecord`); rewrite it first and most devtools tests compile unchanged. `Source.test.ts` (27 flat reads) is the one devtools file needing a real rewrite.

### Pitfall 8: budgets and gates that do NOT interact
`METRIC_ID_LITERAL_BUDGET`, `PORT_DOUBLE_BUDGET`, `DECISION_READ_BUDGET`, `UNTRUSTED_DECODE_BUDGET`, `SWITCH_BUDGET`, `UNTRUSTED_BUDGET` are unaffected: the scratch change passes `node scripts/check-house-style.mjs` ("556 file(s) clean (3 declared switch(es))"), `oxlint` on the four files (no output), `madge --circular` ("No circular dependency found!"), `check-doc-examples` ("116 block(s) compile"), `check-website-doc-examples` ("68 block(s) compile"). The only gates that move are gate 13 (936 to 933) and gate 14 (script above). Do not write a placeholder id (`ADR-QD-NEXT` etc.; `[no-numbering-placeholder]`).

## Code Examples

### The shape-neutral golden (written on the base, unchanged after)
```typescript
// Source: spike (24/24 true); fixtures: packages/core/test/fixtures/sinkWireV2.ts exports
// V2_DECIDED_ALLOW, V2_DECIDED_ALLOW_ALL_FIELDS, V2_DECIDED_DENY, V2_FAILED_MISSING_RESOURCE,
// V2_FAILED_ATTRIBUTE_ERROR_CAUSE, V2_OBLIGATIONS, V2_OBLIGATIONS_FULL_ENVELOPE, V2_DECISION_FULL_ENVELOPE
for (const environment of ["Server", "édge ✓", 'a"b']) {
  const record = Result.getOrThrow(decodeSinkRecordString(fixture));          // a SinkRecord on both sides
  const stored = /* base: stampRecord(record, environment)   after: new StoredRecord({ environment, record }) */;
  assert.strictEqual(
    Result.getOrThrow(encodeStoredRecordString(stored)),
    `{"environment":${JSON.stringify(environment)},"record":${fixture}}`,
  );
}
```
Only the construction line differs between base and after (one test-only builder). Existing stored golden today is a single row, `SinkCodec.test.ts:2178-2182` `'{"environment":"Edge","record":{"_tag":"Obligations","version":2,...}}'` [VERIFIED: read this session]; the plan adds the Decision outcomes (Allow, Deny, Failed x2), the all-fields rows and the non-ASCII/quoted environments, and the SSE frame goldens already in `decisionStream.test.ts:541, :903, :980` stay.

### The log (core)
```ts
// Source: spike; DecisionLog.ts:235-241 after
const append = (record: SinkRecord, environment: string): LogEntry => {
  seq += 1;
  const entry: LogEntry = { cursor: { epoch, seq }, record: new StoredRecord({ environment, record }) };
  entries = Chunk.append(entries, entry);
  if (Chunk.size(entries) > capacity) entries = Chunk.drop(entries, 1);
  return entry;
};
```

### The timeline order (Open Question 2, recommended)
```ts
// Source: spike (tsc clean); a row's record is the one it was built from, so `entry.at === recordOf(entry).at` always
const recordOf = (entry: TimelineEntry): SinkRecord =>
  entry._tag === "TimelineDecision" ? entry.decision : entry.obligations;
const isAfter = Order.isGreaterThan(Order.mapInput(sinkRecordOrder, recordOf));
```
(`TimelineDecision.obligations` is `ObligationRecord | undefined`, but the orphan arm is `TimelineOrphan.obligations: ObligationRecord`, and the ternary narrows `_tag` first, so this typechecks.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| flattened `Stored*` classes + `stampRecord` (ADR-QD-097 D-11-h) | the envelope in memory (ADR-QD-171) | this phase | a new `SinkRecord` kind needs no stored class, stamp arm or decode re-stamp |
| structural `Order<{ at }>` | `Order<SinkRecord>` / `Order<StoredRecord>` | this phase | callers order what they hold |

**Deprecated/outdated:** `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord` (removed, no alias).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Stryker wall times for the devtools and http configs are of the same order as Phase 57's measured core 32 s, audit 12 s, react 30 s (devtools/http not measured; Stryker was not run by this research) | Mutation | planner under-schedules; low |
| A2 | If the `isolate` halves are removed (Open Question 1, Option B), a defect in the log's append path is reported once by the sink emitter naming `decisionLog` (the premise comes from `upgrading.md:773-775` "The emitter now contains every one of them and logs it once"; `SinkEmit.ts` was not read this session) | Open Question 1 | Option B's behavioural claim wrong; verify against `SinkEmit.ts` before choosing B |
| A3 | Stryker will report no new survivors for `Order.mapInput(sinkRecordOrder, (s) => s.record)` and `recordOf` once order tests exist through the log, merge and timeline (not run) | Mutation | planner schedules a gap-closing test round as Phase 57's 57-07 did |

## Open Questions

1. **What happens to `isolate("append")` and test C4? (owner decision; blocks the core plan)**
   - What we know: [VERIFIED: `DecisionLog.ts:180-185, 251-268`] `append` runs inside `Effect.sync` under `isolate("append")`, with `isolate("publish")` inside it. ADR-QD-159 [VERIFIED: `spec/decisions/159-...md:178-179`] says "The decision log's append half is reachable through `ingest` with a record that carries an enumerable throwing getter (C4)." `ShippedSinkReports.test.ts:141-147` adds `Object.defineProperty(first, "trap", { enumerable: true, get() { throw ... } })`. That throws today only because `stampRecord` spreads `{ ...r, environment }`. In the spike, `new StoredRecord({ environment, record })` reads no getter, C4 fails (`expected +0 to equal 1`, zero log lines), and nothing else in `append` (`seq += 1`, `Chunk.append`, `Chunk.drop`) can throw. The publish half is already "reachable by no test" (`spec/behaviors/24-decision-sink.md:401-402`). After this phase neither half is reachable, so `isolate`'s `catchCause` body has no covering test.
   - What's unclear: whether the owner wants (A) both catches kept as unreachable defensive code (C4 deleted; D-08's "unchanged survivor set" then needs an explicit recorded exception, because the `isolate` body's string, `annotateLogs` and call mutants become `NoCoverage`), (B) both catches and the `isolate` helper deleted because neither half can die and the emitter already contains and reports any sink defect once naming `decisionLog` (ADR-QD-159's own rule is "keep only the reports that change behaviour or say something else"; the half's name was the "something else"). B amends ADR-QD-159 W6/W7, BEH-QD-569 (`24-decision-sink.md:397-404`, `:603-604`), the traceability row for `ShippedSinkReports.test.ts`, and removes C4; its mutation story is a pure deletion (see Mutation).
   - Recommendation: ask once (Option B is the cleaner design and matches the owner's stated preference for the most complete design; A keeps dead code and breaks D-08's literal rule). Whichever is chosen, record it in ADR-QD-171 (D-10 already lets it amend ADRs that rest on the flattened stamping) and name it in the CCR row. Do not silently delete C4.

2. **Which order does `Timeline`'s `isAfter` use? (D-03 gap; Claude's discretion, low stakes)**
   - What we know: D-03 says each caller orders what it holds and the structural `{ at }` type goes away; `isAfter` holds `TimelineEntry` rows (`Timeline.ts:201,223`).
   - Recommendation: `Order.mapInput(sinkRecordOrder, recordOf)` above, no new export. Alternative (rejected unless the owner wants it): a core `Order<number>` for an instant, which adds an export and a gate-13 row outside D-03's list. Test it with an orphan beside decisions of differing `at` so the `recordOf` ternary's both arms are killed (Mutation).

3. **Why does `@qadi/http` need a Breaking changeset when its `src` has no code change?**
   - What we know: D-11 locks a Breaking changeset for core, http and devtools. http's public routes take a `DecisionLogReader` (`Pick<DecisionLog, "read" | "readEntries">`), whose element type `StoredRecord` changes shape, so a structural fake reader built from flat records no longer typechecks (the http tests' `stored` builders are exactly that).
   - Recommendation: write the http changeset around that fact (the reader's element type), so it is honest and not an empty Breaking claim.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | gates, scripts | yes | (ran `node`, `pnpm exec` in the scratch copy) | — |
| pnpm / vitest 5.1.0 | tests | yes [VERIFIED: vitest banner `RUN  v5.1.0`] | 5.1.0 | — |
| tsc, madge, oxlint | typecheck, circular, lint | yes | — | — |
| Stryker | WX-05 | not run (instructed); configs present: `stryker.config.mjs` (core), `stryker.devtools.mjs`, `stryker.http.mjs`, `stryker.audit.mjs`, `stryker.react.mjs` | — | — |
| `packages/predicate-prisma/prisma/generated` | tsc of its tests | no (9 pre-existing baseline errors) | — | ignore; identical before and after |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest`; tstyche (`*.tst.ts`); Stryker for mutation |
| Config file | root `vitest.config.ts` (projects `packages/*`); `features/vitest.config.ts`; `tstyche.json`; `stryker*.mjs` |
| Quick run command | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts packages/core/test/DecisionLog.test.ts packages/core/test/DecisionRecord.test.ts packages/core/test/DecisionStream.test.ts packages/core/test/ShippedSinkReports.test.ts < /dev/null` |
| Full suite command | `pnpm check:pr < /dev/null` (repo root, stdin closed) |

A whole `--project devtools` run took about 6 s and `--project core` a few seconds in the spike, so per-task full-project runs are cheap.

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STOR-02 | stored bytes identical: `V2_*` x {Server, édge ✓, a"b} (and Obligations "Edge" existing row) | unit golden, written on base | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts < /dev/null` | extend `describe("the stored-record envelope ...")` at `:2111` |
| STOR-02 | byte fixed point: `text -> decode -> encode === text` | unit | same | new row |
| STOR-03 | log backlog stamping: environment per `ingest`, own label default, records survive, `.pipe`/`Equal` work (read through the wire) | unit | `... packages/core/test/DecisionLog.test.ts` | rows exist flat-shaped (`:60-70`, `:395-406`); add wire-neutral ones |
| STOR-03 | order: NaN last, two unknowns equal, stable arrival, via log snapshot, `mergeSources`, `decodeDecisionStream` backlog | unit | core `DecisionLog`/`DecisionStream` tests; `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts < /dev/null` | new rows; the grid in `DecisionRecord.test.ts` is rewritten on `SinkRecord`s |
| STOR-01 | `StoredRecord` narrows on `.record._tag`; `["record"]` is `SinkRecord` | tstyche | `pnpm exec tstyche packages/core/test/DecisionSink.tst.ts` | rewrite `:70-76` |
| STOR-03 | devtools timeline ingests an envelope; entry key unchanged; orphan beside decisions orders by `at` | unit | `pnpm exec vitest run --project devtools < /dev/null` | via `helpers.ts` builders |
| WX-05 | mutation not lower | harness | adapt `57-mutation.mjs` (below) | new `58-mutation.mjs` |
| WX-03 | gate 13 | gate | `pnpm -s spec:api` prints 933 | — |
| STOR-04/WX-02/07 | records, changesets, upgrading | gate | `node scripts/spec-revise.mjs --check`; `pnpm spec:verify:strict`; `pnpm -s spec:website-examples` | — |

### Sampling Rate
- **Per task commit:** the quick run for the touched project, plus `node scripts/check-house-style.mjs` when a budget could move (none expected).
- **Per wave merge:** `pnpm exec tsc -b tsconfig.json && pnpm exec tsc -p tsconfig.test.json` (this is the exhaustive blast-radius detector; expect only the 9 predicate-prisma baseline errors), then `pnpm exec vitest run --project core|devtools|http|react|testing|audit < /dev/null`, then `pnpm test:tstyche`, `pnpm lint`, `pnpm circular`; `pnpm test:bdd` only after the `tsc -b`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the Stryker runs one at a time, then the compare.

### Wave 0 Gaps
- [ ] `58-mutation.mjs` and `58-mutation-base.json` (below), committed alone first.
- [ ] Shape-neutral characterisation rows (goldens, fixed point, log stamping, order through three readers) written and green on the base; RED rows for the new shape (`stored.record` identity, `instanceof DecisionRecord`) committed failing before the core commit.
- [ ] Framework: none to install.

## Mutation (D-08)

**Which configs cover which file** [VERIFIED: `mutate` globs read this session]:
- `stryker.config.mjs` (core, vitest `dir: packages/core`, `ignoreStatic: true`, `coverageAnalysis: perTest`): `packages/core/src/**/*.ts` minus `index.ts` => `DecisionRecord.ts`, `DecisionLog.ts`, `DecisionStream.ts`, `SinkCodec.ts`.
- `stryker.devtools.mjs`: `packages/devtools/src/model/**/*.ts` => `Source.ts`, `Timeline.ts`, `TimelineStore.ts`.
- `stryker.http.mjs` **exists** (`packages/http/src/**/*.ts` minus `index.ts`) => `DecisionLogHttp.ts`, `DecisionBacklogRoute.ts`, `DecisionStreamRoute.ts`. So WX-05 for http is satisfied by a real config, not by a precedent workaround. Because http `src` is doc-only here, a base is optional for code; recommend recording it for `DecisionLogHttp.ts` anyway (single-file `--mutate`) because its test builders are rewritten and a rewrite must not weaken kills.
- `stryker.audit.mjs`: `AuditArchive.ts` is touched by one comment only; no mutant changes, so no base needed.
- Never edit a Stryker config; use `--mutate` on the command line, as Phase 57 did for `HydrationEngine.ts`.

**Run times:** Phase 57 measured core 32 s, audit 12 s, react 30 s, evidence run 25 s [CITED: `57-07-SUMMARY.md`]. Devtools/http unmeasured (A1).

**Adapting `57-mutation.mjs`** [VERIFIED: read in full]. It stores per-file `counts`, `measured`, `survivors` (as `idOf` strings built from mutator, status, replacement, mutated text and the *normalised source line*, not line numbers) and `ignored`; `compare` lets a `MOVED` file fall only with an unchanged survivor set and requires `det(receiver) + proven + gain >= left`. Phase 58 differs in two ways:
1. **Receivers are mostly absent.** The deleted `stampRecordMatch` arms (`DecisionRecord.ts:177-187`) have no receiver: `new StoredRecord(...)` carries no mutants. The `gained + static >= left` check cannot hold. Replace it for pure deletions with: store the *killed* mutant ids at the base too (add a `killed` list built with the same `idOf`); at compare, every base-killed mutant absent from the after report must be a deleted one, defined as: its normalised source-line text does not occur in the after file's normalised lines. Declare the deleted files and expected deleted statements in the script before the change, as 57 declared `MOVED`. Survivor sets must be unchanged (or, for Option A above, changed only by the declared `isolate` body).
2. **New code with mutants:** `Order.mapInput(...)` arrow, `recordOf` ternary, `Timeline.ts`'s `ingest` ternary and changed `sameSlot`/`sameEvaluation` signatures. These must be fully killed (no new survivor), via the order and orphan rows through the three readers (A3).
Files expected to fall: `DecisionRecord.ts` (killed `stampRecordMatch` mutants leave), `DecisionLog.ts` only under Option B (the `isolate` mutants leave). `SinkCodec.ts`, `Timeline.ts`, `Source.ts`, `TimelineStore.ts`, `DecisionStream.ts` may not fall: a fall is closed with a test.
Per the owner rule, run exactly one Stryker config at a time and never beside vitest; evidence runs for `ignoreStatic: false` go through a scratchpad config spreading the gate config, never the repository (Phase 57's pattern).

## Records (D-10, D-11) - measured facts

- **Reserved ids free** [VERIFIED: `git grep -nE 'ARCH-105|ADR-QD-171|CCR-QD-449|BEH-QD-62[6-9]|BEH-QD-630|INV-QD-36[12]' -- . ':!.planning/phases/QD-58*'`]: matches only `.planning/PROJECT.md:239`, `.planning/REQUIREMENTS.md:50,55`, `.planning/ROADMAP.md:398,564,571` and a Phase 57 plan's check. Nothing in `spec/`, `packages/`, `.changeset/`, `AGENTS.md`, `features/`, `scripts/`. Table [VERIFIED: `_WAVE11-CONTEXT.md:44-47`]: `| 58 | 105 | 171 | 449 | 626–630 | 361–362 |`. Previous phase used ADR 170, CCR 448, BEH 621-625, INV 359-360.
- **ADR-QD-097 D-11-e** [VERIFIED: `spec/decisions/097-...md:149-155`]: "**The environment travels in an envelope** (D-11-e): every SSE frame and backlog element is `StoredRecordJson = { environment, record }`, ... the decode stamps the producer's label, so devtools stamps nothing." It is Rev 1.4 with three prior amendments (2026-10-06, 10-07, 11-10), so ADR-QD-171 amends it as Rev 1.5; also amend `:131` ("the prototype-preserving stamp"), `:137`, `:173-175` (D-11-h). ADR-QD-135 `:173` gets an addendum. ADR-QD-159 per Open Question 1.
- **Templates for the record work:** Phase 57's `57-08-PLAN.md` (ADR + amendments), `57-09-PLAN.md` (BEH/INV/traceability), `57-10-PLAN.md` (overview rows, changesets, upgrade guide, CCR row), `57-11-PLAN.md`/`57-scan.mjs` (phase scan). `ADR` Document ID must equal the file number (gate 10).
- **Changeset format** [VERIFIED: `.changeset/devtools-malformed-frame-is-a-decode-refusal.md`]: frontmatter `"@qadi/<pkg>": minor`, body `**Breaking.** ...` then "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`." Existing names: `core-*.md`, `devtools-*.md`; there is no `http-*.md` yet.
- **`upgrading.md`**: last 0.13 section is `:926` "## 0.13: untrustedDecoder states the envelope's unknown-key policy" (file is 966 lines); append "## 0.13: a stored record is its envelope in memory" with the three migrations from D-11 and a compiled `typescript` fence (the website gate compiles it against current `src`).
- **Gate 13**: see Blast radius (936 to 933). Rows to rewrite at `spec/overview.md:347-350`; `StoredRecord` keeps a row but becomes a value class; `sinkRecordOrder` is new; `storedRecordOrder` is re-typed.
- **Spec prose to update, not exhaustive:** `24-decision-sink.md:345, 363, 416, 679-689`; `26-decision-stream.md:41-42, 277, 338-339, 588-594`; `27-devtools-timeline.md:33-34, 78-90, 242, 252`; INV-QD-039 enforcement (`traceability.md:195`, `invariants.md:1624-1631`); `traceability.md:496` (`DecisionRecord.test.ts`). `spec/README.md:268`-region mentions of the deleted names are change history and are exempt.

## Security Domain

`security_enforcement` is enabled (absent = enabled in `.planning/config.json`; level 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 | no | not touched |
| V5 Input Validation | yes (the stored envelope is untrusted wire input) | unchanged: `untrustedDecoder` (`storedWire`) then `decodeSinkRecord`; AGENTS.md §7a. This phase adds no decode token (house-style clean) |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| An envelope field mislabelled or fabricated by a reader | Spoofing | the label comes only from the decoded envelope (`read.success.environment`), never the reader's; keep the test "the environment is the producer's and survives unchanged, whatever it says" (`SinkCodec.test.ts:2171-2175`) |
| A hostile record with a throwing getter or `NaN` `at` | Denial of service / tampering | `NaN` order law (INV-QD-039) and the log's containment; see Open Question 1 for the containment test that changes |
| Aliasing: the log now holds the sink's record instance | Tampering | note in the ADR; nested fields were already shared by reference |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Effect v4; submodule namespace imports only for `effect` (`import * as Order from "effect/Order"`), relative imports with `.ts`, `import type` for type-only (`verbatimModuleSyntax`). `StoredRecord` becomes a **value** import where `new` is used (`DecisionLog.ts`, `SinkCodec.ts`) and stays `import type` elsewhere.
- No `as`, `!`, `any`, `switch` on `_tag` (§5a uses `Match`), no `Effect.fnUntraced` additions, no `async`/`await`, no ambient `console`/`process.env`/clock; budgets change only with their AGENTS.md table. A ternary on `_tag` already exists in the code being edited (`Timeline.ts`), and the new `recordOf` follows it.
- Doc comments: one-line summary first, the why after (AGENTS.md preamble).
- §9/§15: a removed or added export is a `spec/overview.md` edit in the same change (gate 13). §11: `spec/` is normative; behavior doc, invariant and traceability change together. §12: `typescript` fences compile; `ts` fences are listings.
- `pnpm check` is the only definition of done; `check:pr` skips only the mutation step.
- Never `Record<string, unknown>` as a widened type, never `old | "New"` widening, prefer the cleanest complete design, breaking is fine and recorded, no releases (memory).
- Shell: zsh with `grep` aliased to ugrep (use `/usr/bin/grep`); vitest from the repo root with stdin closed; never run `scripts/next-id.mjs`; do not run Stryker from research; do not edit source or commit.

## Sources

### Primary (HIGH confidence)
- Repository at HEAD `9115f411` (code equals Phase 57 close): `packages/core/src/{DecisionRecord,DecisionLog,SinkCodec,DecisionStream,AttributeResolver}.ts`, `packages/devtools/src/model/{Timeline,Source,TimelineStore}.ts`, `packages/http/src/{DecisionLogHttp,DecisionBacklogRoute,DecisionStreamRoute}.ts`, `packages/audit/src/AuditArchive.ts`, `scripts/check-package-install.mjs`, the test files cited, `stryker.{config,devtools,http}.mjs`, `spec/decisions/{097,135,159,167}-*.md`, `spec/behaviors/24-decision-sink.md`, `spec/overview.md`, `apps/website/.../upgrading.md`, `.changeset/*`.
- `node_modules/effect@4.1.2` source: `src/Data.ts:20-101` (`Class`, `TaggedClass`), `src/Order.ts:545-575, 869-872` (`mapInput`, `isGreaterThan`).
- Scratch experiments (outside the repo): `Data.Class` equality/hash/pipe/toJSON run under node; the full change applied to a `git archive HEAD` copy and run through tsc, vitest (core, devtools, http, react, testing, audit, features), doc-fence gates, gate 13, madge, house-style, oxlint.
- Phase 57 artefacts: `57-mutation.mjs`, `57-VALIDATION.md`, `57-07-SUMMARY.md`, `57-01-SUMMARY.md`, `57-REVIEW-DISPOSITION.md`.

### Secondary / Tertiary
- None. Context7 and other MCP providers timed out and were not needed: the question is about this repo and the installed `effect` source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages; `effect@4.1.2` source read.
- Architecture: HIGH - the design compiled and passed the gates in a scratch copy.
- Pitfalls: HIGH for the measured ones (gate script, `lib/` staleness, C4); MEDIUM for Stryker outcomes (not run: A1, A3).

**Research date:** 2026-11-19
**Valid until:** until Phase 58 execution starts or any `packages/core/src/Decision*.ts` / `SinkCodec.ts` / devtools `Timeline.ts` changes (re-measure with the same scratch method); otherwise 30 days.
