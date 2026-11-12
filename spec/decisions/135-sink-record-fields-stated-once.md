# ADR-QD-135 — A sink record's fields are stated once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-135                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-11                                     |
> | Status         | Accepted — amends ADR-QD-095; reads ADR-QD-002, ADR-QD-060, ADR-QD-096, ADR-QD-100, ADR-QD-106 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-11): Initial (ARCH-71, CCR-QD-413) |

---

## Context

A sink record's fields were written five times, in four modules, and nothing tied the five together.

- **The record class.** `DecisionRecord` (`evaluationId`, `at`, `subjectId`, `policy`, and the optional
  `resource`, `action`, `cache`, with `outcome`) and `ObligationRecord` (`evaluationId`, `at`, `outcome`,
  `obligationIds`, and the optional `subjectId`, `action`, `resourceId`), in `DecisionRecord.ts`.
- **The version-2 wire struct**, one per tag, in `SinkCodec.ts` (`decisionV2Fields`,
  `obligationsV2Fields`), with `CacheOutcome`'s three literals and `ObligationOutcome`'s four restated as
  `Schema.Literals(...)` beside the types they restated, neither checked against its type.
- **`project`**, which listed every field of each record by hand to build the object the schema encodes,
  with a conditional spread for each optional key.
- **`rebuild`**, which listed every field again to construct the record, with the same spreads and a hand
  re-application of the `SubjectId` and `ResourceId` brands (the wire declared both as `Schema.String`
  although `SubjectIdSchema` and `ResourceIdSchema` exist).
- **`failedRecord` and `decidedRecord`** in `SinkEmit.ts`, two projections of a `Question` into a decision
  record that differed only in `cache`, beside `obligationRecordFor`.

`SinkWire.ts` also restated `SinkRecordTag = "Decision" | "Obligations"`, pinned equal to
`SinkRecord["_tag"]` by a type test, because `Errors.ts` imports `SinkWire.ts` and `DecisionRecord.ts`
imports `Errors.ts`.

**What it cost, measured on the phase base before any source change** (plan 23-01). Three scratch
mutations, each applied alone to `SinkCodec.ts`, never committed: `action` out of `project`'s `Decision`
arm (m1), `cache` out of `rebuild`'s `Decision` arm (m2), `resourceId` out of `rebuild`'s `Obligations`
arm (m3). All three compiled (m3 only after keeping its now-unused import in use; the field itself drops
without a type error). The existing suite caught all three: m1 by the writer golden and three more tests, m2
by an `allow` round trip that carries `cache: "miss"` and by the cache-literal test, m3 by the
identity-key test. So the defect was never a live data loss, and the planning evidence that the old suite
would miss at least one of them did not hold. What the old suite never had was coverage by construction: its
round-trip property built only `DecisionRecord`s and varied only `resource`, and a sixth field added later
would have been caught only if some hand-written fixture happened to carry it.

**One asymmetry the review did not name.** `failedRecord` and `decidedRecord` passed `resource`, `action`
and `cache` through as possibly-`undefined` values, so a record `evaluate` emitted carried `undefined`-valued
own keys; `obligationRecordFor` omitted them. `Equal.equals` tells `{ b: undefined }` from `{}`, so a record
`evaluate` emitted was not `Equal` to its own round trip, and INV-QD-096 covered it only through its named
normalisation ("an `undefined`-valued property as absent").

## Options

- **A.** One `Schema.Struct` per record in a package-private leaf. The record class stays a
  `Data.TaggedClass`, its field type the struct's `Type`; the wire structs spread the same fields.
- **B.** `Schema.TaggedClass` over the same fields, so the class is the schema.
- **C.** Keep the five statements, pinned harder.

`CONTEXT.md` offered C honestly. Nothing in the evidence argued for it: the protection gap was real (a field
dropped from `project` or `rebuild` compiles), and the cost of closing it under A is one new module.

## Decision

### The answer the human gave

The shape and the key convention were answered by the project owner on 2026-11-11, before execution, in
`.planning/phases/_DECISIONS-v1.2.md`: **A, with absent keys**, with this standing instruction quoted
verbatim: **"the recommendation should be the cleanest solution, not the simplest one; we can override any
ADR if it causes us problems."** The recommendation held unless the bench showed B within noise and B added
no throw on the evaluation path. It showed neither.

### The bench (plan 23-01, `packages/core/bench/SinkRecord.bench.ts`)

Record construction, five interleaved rounds with the `Evaluate` and `SinkCodec` benches, median per record,
`(max - min) / median` as noise:

| Shape | Today | A | B | B over today |
| ----- | ----- | - | - | ------------ |
| one node | 0.097 us | 0.098 us (within noise) | 0.912 us | 9.4x |
| allOf x8 | 0.097 us | 0.094 us (within noise) | 3.060 us | 31.5x |
| allOf x64 | 0.096 us | 0.097 us (within noise) | 13.496 us | 140x |
| obligation record | 0.097 us | 0.093 us (within noise) | 0.518 us | 5.3x |

B is not within noise on any shape: its delta is 44 times today's spread on one node, and 12.9% of a
one-node `evaluate` (6.294 us, noise 7.6%) and 35.7% of a wide one (8.297 us, noise 6.0%). The reason is in
`effect`'s `makeClass` (`Schema.ts`, lines 17364-17386): a caller's `new` has no trusted payload, so the
constructor runs `struct.make(input)` on every call. For a `DecisionRecord` that walks the whole `Policy`, a
recursive `Schema.suspend`, so the cost grows with the policy (0.91, 3.06, 13.50 us) while today's class
stays flat. `evaluate` constructs a record on every evaluation, sink wired or not, and a `struct.make` that
throws on invalid input would be a defect on the evaluation path, which AGENTS.md §4 forbids. **A stands.**

### What A is

1. **One leaf, `packages/core/src/SinkRecordFields.ts`, package-private** (not in the barrel, ADR-QD-099, so
   no public name is added). It holds `decisionRecordFields` and `obligationRecordFields`, each a
   `Schema.Struct` in today's wire order (a struct's encode writes keys in field order, so the order is the
   byte order); the two record tags; and `ObligationOutcomeSchema` and `CacheOutcomeSchema`, so the literal
   lists are stated once and `ObligationOutcome` and `CacheOutcome` are `typeof …Schema.Type` under their
   unchanged public names and modules. The leaf imports `effect/*`, `Policy.ts` and `Identity.ts` only.
2. **The classes derive from it.** `DecisionRecord` is a `Data.TaggedClass` over
   `typeof decisionRecordFields.Type & { readonly outcome: DecisionOutcome }`, `ObligationRecord` over
   `typeof obligationRecordFields.Type`. The decision's `outcome` stays out of the struct: in memory it is
   `Decided | Failed`, on the wire `OutcomeWire`, and `rebuildOutcome`'s checks sit between them
   (ADR-QD-106). Field documentation lives on the struct's entries and still reaches a consumer's hover and
   the emitted `.d.ts` (checked through the TypeScript API).
3. **The wire structs spread the leaf**, so the record type and the v2 envelope cannot list different
   fields. The subject and resource ids are declared with their branded schemas, so `rebuild` no longer
   re-applies a brand.
4. **`project` adds `version` and, for a decision, the encoded outcome; `rebuild` strips `version`, runs
   `rebuildOutcome` unchanged and constructs.** Neither names an envelope field, and neither holds a
   conditional spread. ADR-QD-106's checks, and `Inconsistent`, are untouched. `Match.tagsExhaustive` stays,
   so a third record tag is a compile error.
5. **An `undefined`-valued optional is dropped by one generic filter in `project`** (`omitUndefined`), not by
   a per-field encode transformation. A first attempt put a `SchemaTransformation.transformOptional` on each
   optional field; it passed every test and cost 0.2 to 0.3 us per optional field on the outbound encode
   (small-record encode 13 to 23 percent slower in a paired run), so it was replaced.
6. **`SinkRecordTag` is derived** from the two record tags
   (`typeof DECISION_RECORD_TAG | typeof OBLIGATION_RECORD_TAG`, a type-only import of the leaf into
   `SinkWire.ts`), and its restatement and type test are gone: the leaf's closure does not reach
   `Errors.ts`, so `pnpm circular` reports no cycle (205 files). `Errors.tst.ts` keeps its pin, retitled to
   say the tag is derived.
7. **One projection of a question into a decision record.** `failedRecord` and `decidedRecord` are
   `decisionRecordFor(question, stamp, outcome, cache?)` in `SinkEmit.ts` (plan 23-03), with `Lifecycle.ts`'s
   two emit sites calling it.

### The key convention: absent

Every projection of a record leaves an absent `resource`, `action` or `cache` **absent**, as
`obligationRecordFor` already did. A record `evaluate` emits is therefore `Equal` to its own round trip.
This is the one change to what a sink receives (see Consequences). It was written test first
(`DecisionSink.test.ts`, "a record evaluate emits is its own round trip (ARCH-71)", seen failing on the
base's `SinkEmit.ts` on `Object.hasOwn(record, "resource")` before `decisionRecordFor` existed).

### The wire did not change, and no version moved

The version-2 bytes are identical: the goldens in `fixtures/sinkWireV2.ts` and the golden describes in
`SinkCodec.test.ts` are untouched since the phase base, and the encoded value of every record keeps today's
ordered keys with no `undefined`-valued own key (pinned in `SinkCodec.test.ts`, "ARCH-71: the encoded value
keeps today's keys"). ADR-QD-096's rule that a change to the wire's content is a new version therefore did
not fire, and the version 3 it queues (the next wire version omits the decision's duplicated fields, by its
ADR-106 amendment) is untouched.

### The cost, measured (plan 23-02)

Paired on one machine in one session, three rounds each, the phase base's sources against the new ones:

| Row | Base | After | Change |
| --- | ---- | ----- | ------ |
| `evaluate`, one node | 167,308 hz (noise 4.4%) | 171,991 hz (1.2%) | +2.8%, noise |
| `evaluate`, allOf x8 | 127,673 hz (6.0%) | 132,761 hz (2.0%) | +4.0%, noise |
| `encodeSinkRecord`, one node | 306,380 hz (4.5%) | 275,691 hz (2.7%) | -10.0% (3.26 to 3.63 us) |
| `encodeSinkRecord`, allOf x64 | 14,809 hz (2.5%) | 14,581 hz (0.6%) | -1.5%, noise |
| `encodeSinkRecord`, `Failed` with a 20-key resource | 286,075 hz (3.7%) | 271,624 hz (5.8%) | -5.1% (3.50 to 3.68 us) |

Evaluation does not move: it constructs the same class. **A small record's encode is 5 to 10 percent slower
(0.19 to 0.36 us), outside the base's noise band, and that is accepted.** Cause, measured by microbench of the
projection alone: `{ ...record, version: 2 }` spreads a `Data.TaggedClass` instance, which costs about
0.21 us more than building the same object from a literal with explicit keys (0.233 us against 0.021 us); the
undefined filter is about 0.01 us and the schema encode is not the cause. It is inherent to a projection that
names no field, is paid once per record per sink, and is under 0.4 us against a 6 us evaluation. A
hand-written literal projection would recover it and reintroduce the field list; that remains the owner's
call and is not taken here. A wide policy's encode, where the walk dominates, does not move.

## Alternatives

- **B, `Schema.TaggedClass`.** The class would be the schema, the most literal reading of ADR-QD-002's "the
  schema and the type are one definition." Rejected on the numbers above: 5.3x to 140x per record on the
  evaluation path, growing with the policy, plus a constructor that can throw there. It also changes what
  `DecisionRecord` is for every consumer that extends or mirrors it (`StoredDecisionRecord` reads the
  constructor's parameter type).
- **C, keep five statements.** Rejected: the protection gap was real, and the old suite's catching of the
  three scratch mutations was luck of fixture contents, not construction. Under A a field added to the leaf
  reaches the class, the wire, the projection and the rebuild with no other edit, and a field cannot be
  written to the wire and dropped on read.
- **Making `Decided` and `Failed` schema classes** so `outcome` joins the shared struct. Deferred: it needs a
  transformation that carries ADR-QD-106's checks and would turn `Inconsistent` into `Malformed` unless done
  carefully. The same duplication in `AccessDenied` (ADR-QD-106's Consequences) is likewise out of scope.

## Consequences

- **The wire is byte-identical, no version moved, and no public name was added or removed.**
  `SinkRecordFields.ts` is not in the barrel; `spec/overview.md` is unchanged and gate 13 (`pnpm spec:api`) passes.
- **A sink now receives a `DecisionRecord` with no own `resource`, `action` or `cache` key where it used to
  receive `undefined`-valued ones.** A sink that reads `record.action` sees `undefined` either way; one that
  tests `Object.hasOwn(record, "action")`, enumerates keys, or compares with `Equal.equals` against a record
  it built with an explicit `undefined` sees the difference. The key is also absent when the question had no
  resource or action, and `cache` is absent when no cache was wired or the outcome is `Failed`. The encoded
  value and the JSON text are unchanged: they never carried such a key.
- **Same shape as the Policy ADT, and the second schema-first exception.** AGENTS.md §7 names the Policy ADT
  as the deliberate exception to hand-written domain types because policies cross a trust boundary and
  hand-written codecs caused the data-loss defect the library was rewritten to fix. A sink record's envelope
  crosses the same kind of boundary (forwarding, the decision stream, the audit row), and a hand-written
  projection in both directions is that defect's shape. AGENTS.md §7 gains one paragraph saying so. No budget
  table or count moves: no `Schema.TaggedError`, `any`, `switch` or `Effect.fnUntraced` is added.
- **ADR-QD-095's projection is now the schema's encode.** Its dated amendment says so; D-09-b's "`SinkRecordTag`
  restates `SinkRecord["_tag"]`" no longer holds.
- **ADR-QD-100 and BEH-QD-183 name `failedRecord` and `decidedRecord`, which no longer exist.** Their text
  describes the projection as it stood; `decisionRecordFor` is the one projection now. ADR-QD-100 is history
  and is left as written; BEH-QD-183's note and BEH-QD-195's note are corrected in the same change.
- **A new field is one edit.** It is added to the leaf's struct; the class type, the wire, `project`,
  `rebuild` and every test that spreads a record follow. INV-QD-290 states the property and
  `SinkRecord.tst.ts` plus the generated every-shape round trip enforce it.
- **Mutation.** The per-file Stryker score of every file this phase touched was recorded on the base
  (`SinkCodec.ts` 0.913, the rest 1.0) and is not lower after; the new leaf is held to the config's break
  threshold of 80.

## Related

Amends [ADR-QD-095](./095-sinkcodec-owns-both-directions.md). Reads
[ADR-QD-002](./002-schema-derived-policy-adt.md),
[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-060](./060-schema-taggederror-for-the-nine-wire-crossing-errors.md),
[ADR-QD-096](./096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-100](./100-a-question-is-asked-once.md),
[ADR-QD-106](./106-a-decision-is-constructed-from-its-trace.md).
[INV-QD-096](../invariants.md#inv-qd-096-whatever-the-record-codec-emits-it-accepts),
[INV-QD-290](../invariants.md#inv-qd-290-a-records-class-and-its-wire-envelope-list-the-same-fields);
[BEH-QD-183](../behaviors/24-decision-sink.md#beh-qd-183-a-record-is-complete),
[BEH-QD-199](../behaviors/25-inspection.md#beh-qd-199-a-record-has-a-wire-form-encoded-and-decoded-by-one-operation-each-way),
[BEH-QD-450](../behaviors/25-inspection.md#beh-qd-450-a-records-wire-envelope-is-its-fields-plus-a-version-stated-once),
[BEH-QD-451](../behaviors/24-decision-sink.md#beh-qd-451-an-absent-optional-is-an-absent-key-on-every-record-core-emits).
