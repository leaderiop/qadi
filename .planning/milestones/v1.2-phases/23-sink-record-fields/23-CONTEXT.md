# Phase 23: Sink record fields stated once - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Ticket:** ARCH-71 · review candidate 6 (2026-11-11 architecture review) · requirements SREC-01..05, WX-01..06
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md` (base commit, numbering row 23)

<domain>
## Phase Boundary

`@qadi/core`'s two sink records (`DecisionRecord`, `ObligationRecord`) state their fields once. The record
class's field type and the version-2 wire struct both derive from that one statement, so `SinkCodec.ts`'s
`project` only adds `version` (and the encoded outcome), and `rebuild` only strips `version` and runs
`rebuildOutcome`'s checks (ADR-QD-106 keeps them). `SinkEmit.ts`'s `failedRecord` and `decidedRecord` become
one projection. `SinkWire.ts`'s restated `SinkRecordTag` goes if the import cycle allows.

The wire does not change: the goldens in `packages/core/test/fixtures/sinkWireV2.ts` and the golden
describes in `SinkCodec.test.ts` stay byte-for-byte as they are (SREC-05). No version moves (ADR-QD-096).

Not in this phase: the port modules and `PortAccess.ts` (Phases 21–22); merging `SinkWire.ts` into another
module (barrel policy, AGENTS.md §9, ADR-QD-099; v1.2 Out of Scope); a wire version 3 (queued by ADR-QD-096/106).
</domain>

<evidence>
## Evidence (re-verified 2026-11-11 against `965ff14c`, by reading the four files whole and by greps and a tsx probe)

### The review's evidence, confirmed
- The record shape is written five times, at the lines the review gave:
  - `packages/core/src/DecisionRecord.ts:59-114` (`DecisionRecord`) and `:135-156` (`ObligationRecord`), with
    the field doc comments (the `at`, `subjectId`, `resource` and `cache` comments carry INV references).
  - `packages/core/src/SinkCodec.ts:138-149` `decisionV2Fields` and `:152-165` `obligationsV2Fields`.
  - `SinkCodec.ts:202-228` `project` and `:278-315` `rebuild`, each listing every field by hand.
  - `packages/core/src/SinkEmit.ts:66-133` (`failedRecord`, `decidedRecord`, `obligationRecordFor`).
- `SinkWire.ts:29` restates `SinkRecordTag = "Decision" | "Obligations"`; `packages/core/test/Errors.tst.ts:70-71`
  pins it equal to `SinkRecord["_tag"]`. The cycle is real: `DecisionRecord.ts:25` imports `type EvaluationError`
  from `Errors.ts`, and `Errors.ts:58` imports `type { DecodeRefusal, SinkRecordTag }` from `SinkWire.ts`
  (madge counts type edges, ADR-QD-037).
- Conditional spreads for the obligation record's optional keys appear three times: `SinkEmit.ts:130-131`,
  `SinkCodec.ts:211-213`, `SinkCodec.ts:288-292`. The decision record's are at `SinkCodec.ts:222-224` and
  `:308-310` as well.
- `failedRecord` (`SinkEmit.ts:66-75`) and `decidedRecord` (`:78-93`) differ only in `cache`. Callers:
  `Lifecycle.ts:142` and `:188`, nothing else in `packages/*/src` (test helpers named `failedRecord` in
  `packages/{audit,devtools}/test/helpers.ts` are unrelated local builders).
- `git log --since=2026-09-01 -- packages/core/src/SinkCodec.ts` counts 16 commits.

### Where the evidence differs from `_WAVE7-CONTEXT.md` (reshapes the RED step, not the phase)
1. **No live data loss on the base.** Every field reaches the wire and comes back today. The defect is a
   protection gap: a field dropped from `project` or `rebuild` compiles. So WX-06's "seen RED on the phase base"
   is met by RED-under-scratch-mutation on the base (plan 23-01), plus one committed RED test in plan 23-03 if
   the checkpoint adopts the absent-key convention (item 5).
2. **"INV-QD-096's round trip catches it only if its generator produces the field" is half right.** The
   property (`SinkCodec.test.ts:1524-1556`) builds only `DecisionRecord`s, varying only `resource`: it never
   produces `action`, `cache`, or any `ObligationRecord`. But the writer goldens catch a field dropped from
   `project`: `V2_DECISION_FULL_ENVELOPE` (resource, action, cache; `:1697-1699`) and
   `V2_OBLIGATIONS_FULL_ENVELOPE` (`:1693-1695`). `rebuild` is weaker: the decode-golden loop compares a decode
   with a decode (`recordOf(v2)` against `recordOf(stringOf(original))`, `:1769-1774`), so dropping `action` or
   `cache` from `rebuild`'s `Decision` arm loses it on both sides and passes. The obligation identity keys are
   caught (`:1786-1795`). Plan 23-01 confirms each case by scratch mutation.
3. **Two more restatements the review missed.** `SinkCodec.ts:147` restates `CacheOutcome`
   (`EvaluationMetrics.ts:56`) as `Schema.Literals(["hit", "coalesced", "miss"])`, and `SinkCodec.ts:157`
   restates `ObligationOutcome` (`DecisionRecord.ts:166-170`). Neither is compiler-checked against its type.
   `rebuild` also re-applies the brands by hand (`makeSubjectId` at `:288`, `:306`; `makeResourceId` at `:292`)
   because the wire declares `subjectId`/`resourceId` as `Schema.String`, though `SubjectIdSchema` and
   `ResourceIdSchema` exist (`Identity.ts:45-53`) and `Errors.ts:55` already uses them.
4. **The `Schema.TaggedClass` caveat is confirmed, and is worse than "may validate".** In `effect@4.1.2`,
   `makeClass` (`node_modules/effect/src/Schema.ts:17364-17386`) runs `struct.make(input, options)` in every
   constructor call. `disableChecks: true` skips only filters, not structural parsing (doc at `:17567`). For a
   `DecisionRecord` that means walking the whole `Policy` (a recursive `Schema.suspend`) on every `new`, and a
   throw on invalid input inside `evaluate`, which would be a defect on the evaluation path (AGENTS.md §4).
   `evaluate` builds a record on every evaluation, sink or not: `Lifecycle.ts:142,188` construct it before
   `emit`, which is a no-op when no sink is wired (`SinkEmit.ts:49-55`).
5. **An asymmetry the review did not name.** `failedRecord`/`decidedRecord` pass `resource`, `action` (and
   `cache`) as possibly-`undefined` values, so a record `evaluate` emits carries `undefined`-valued own keys.
   `obligationRecordFor` omits them ("an absent `action` or resource id is an absent key, never an
   `undefined`-valued one", `SinkEmit.ts:113-114`, pinned by `DecisionSink.test.ts:561` and `:584`).
   `Equal.equals` tells `{ b: undefined }` from `{}` (tsx probe on two `Data.TaggedClass` instances: `false`), so a
   record `evaluate` emits is not `Equal` to its own round trip. INV-QD-096 covers this only through its named
   normalisation ("an `undefined`-valued property as absent").
6. **Byte identity is reachable with a schema-driven projection** (tsx probe against `effect@4.1.2`):
   `Schema.encodeUnknownSync(Schema.Struct(...))` emits keys in the schema's field order whatever the input's key
   order, and drops excess keys (the default `onExcessProperty: "ignore"`). So encoding
   `{ ...record, version: 2, outcome }` reproduces today's bytes as long as the shared struct lists fields in
   today's order. One trap: an `undefined`-valued optional key stays an own key of the encoded value. The JSON
   text is unchanged and `wireHazard` treats it as absence (`JsonHazard.ts:86`), but `encodeSinkRecord`'s value
   (what forwarding's `send`, the audit row and `StoredRecordJson` carry) would gain the key. The phase keeps
   today's value shape: no `undefined`-valued own key.
7. **Numbering.** The Phase 23 reservations are free by use. But `INV-QD-290–294` appear in
   `spec/README.md:347` as *unused* reservations of CCR-QD-409 (wave 6, Phase 19). A plain grep for INV-QD-290
   hits that row. Plan 23-01's check excludes that one line, and the CCR-QD-413 row says the number was earlier
   reserved and left unused. `node scripts/next-id.mjs INV` printed 288 at planning time.

### Facts the plans rely on
- `SinkRecordJson` (`SinkCodec.ts:332`) is `Schema.toEncoded(SinkRecordWire)`; `@qadi/audit` embeds it. The
  `DECISION_KEYS`/`OBLIGATIONS_KEYS` envelope sets (`:183-184`) are already read from the field objects.
- `StoredDecisionRecord`/`StoredObligationRecord` (`DecisionRecord.ts:203-209`) already derive from
  `ConstructorParameters<typeof …>[0]`, so they follow whatever the records become.
- `DecisionRecord.ts`, `SinkCodec.ts`, `SinkWire.ts` and `EvaluationMetrics.ts` are all `export *`'d by
  `packages/core/src/index.ts` (lines 10, 52, 53). Any new export from them is public (gate 13, WX-03). A
  package-private leaf that is not in the barrel adds nothing to the public interface.
- `Policy.ts`'s import closure does not reach `Errors.ts` (madge is green with `Errors.ts → Decision.ts →
  Policy.ts`). `EvaluationMetrics.ts:47` imports `type EvaluationError` from `Errors.ts`.
- Benches: `packages/core/bench/*.bench.ts`, run by `pnpm bench <file>` (root `vitest bench --run`); siblings use
  `test(name, async ({ bench }) => bench.compare(...))` with `{ time: 1000, warmupTime: 300 }`.
  `Evaluate.bench.ts`'s "evaluate" test has the "one node" and "wide — allOf of 8" rows; `SinkCodec.bench.ts`
  measures the outbound encode.
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (test first, SREC-03, WX-06):** before any src change, show on the phase base that dropping a field
  compiles and what catches it, by three scratch mutations that are never committed: (m1) `action` out of
  `project`'s `Decision` arm, (m2) `cache` out of `rebuild`'s `Decision` arm, (m3) `resourceId` out of
  `rebuild`'s `Obligations` arm. Then commit a generated round trip over **both** tags and **every** optional
  key (absent, present, present-`undefined`). It is green on the base and is shown failing under each of m1–m3.
  Characterisation pins committed with it: today's encoded-value key sets (no `undefined`-valued key) and a
  tstyche pin of the public record types.
- **D-02 (bench first, SREC-01):** one bench, `packages/core/bench/SinkRecord.bench.ts`, measures record
  construction for today's class, (A) `Data.TaggedClass` whose field type is a shared `Schema.Struct`'s `Type`,
  and (B) `Schema.TaggedClass` over the same fields, on one-node, allOf×8 and allOf×64 policies. It runs
  interleaved with `Evaluate.bench.ts` and `SinkCodec.bench.ts`, five rounds, medians. A is runtime-identical to
  today's class (only types change); the bench proves it rather than assuming it. The GO/NO-GO is the phase's
  one `checkpoint:decision`, recommending A unless B is within noise. NO-GO (keep five statements) is offered
  honestly.
- **D-03 (one statement, SREC-02):** each record's envelope fields are one `Schema.Struct` in a package-private
  leaf module (not in the barrel), in today's wire order: decision `evaluationId, at (Finite), subjectId
  (SubjectIdSchema), policy (Policy), resource?, action?, cache?`; obligations `evaluationId, at, outcome,
  obligationIds, subjectId?, action?, resourceId? (ResourceIdSchema)`. The decision's `outcome` stays out of
  the struct: in memory it is `Decided | Failed`, on the wire `OutcomeWire`, and `rebuildOutcome` sits between
  them (ADR-QD-106). Under A the classes are `Data.TaggedClass(tag)<typeof fields.Type & { readonly outcome:
  DecisionOutcome }>` (obligations without the extra member). The v2 structs are `{ _tag, version,
  ...fields.fields, outcome }`. `CacheOutcome` and `ObligationOutcome` keep their public names and modules;
  their literal lists are stated once, so the wire schema and the type cannot disagree (the closed-union rule).
- **D-04 (projection, SREC-02, SREC-05):** `project` encodes `{ ...record, version: 2 }` (plus
  `outcome: outcomeOf(record.outcome)` for a decision) and names no envelope field; `rebuild` strips `version`,
  runs `rebuildOutcome` unchanged, and constructs. `encodeSinkRecord`'s value keeps today's shape (no
  `undefined`-valued own key). The goldens and their describes are not edited.
- **D-05 (one projection, SREC-04):** `failedRecord` and `decidedRecord` become one function in `SinkEmit.ts`.
  The checkpoint's second line decides the key convention: **absent** (recommended: a record `evaluate` emits
  omits an absent `resource`/`action`/`cache`, as `obligationRecordFor` already does, and so is `Equal` to its
  own round trip; committed RED first) or **as-is** (today's keys exactly, pinned).
- **D-06 (SREC-04):** `SinkRecordTag` is derived if a leaf can state the two tags without `Errors.ts` in its
  import closure, imported by both `SinkWire.ts` and `DecisionRecord.ts`. `pnpm circular` decides. If it cannot,
  the restatement and its type test stay, and the reason is written in the SUMMARY and ADR-QD-135.
- **D-07 (no new budget item, WX-04):** no new `Schema.TaggedError` (SCHEMA_ERROR_BUDGET stays 12), no `as`
  beyond the file's existing `as const`, no `switch`, no `Effect.fnUntraced`.
- **D-08 (records, WX-02):** ADR-QD-135 records the checkpoint outcome with its numbers. Under A or B it says
  that the record envelope is schema-first like the Policy ADT (ADR-QD-002) and the wire errors (ADR-QD-060),
  amends ADR-QD-095 (the projection is the schema's encode), and AGENTS.md §7 gains a sentence naming the
  second schema-first exception. Under C it records the NO-GO and why. Also CCR-QD-413, BEH-QD-450..451,
  INV-QD-290 (A/B only), traceability, and a changeset (`@qadi/core` patch).

### Claude's Discretion
- The leaf's name (suggested `SinkRecordFields.ts`) and whether the record tags live in it or in a second leaf.
- How the encode drops an `undefined`-valued optional: a `SchemaTransformation.transformOptional` on the wire
  side, or one generic filter in `project`, as long as it adds no `as` and names no field.
- Whether `project`/`rebuild` keep their `Match.tagsExhaustive` shape (recommended: keep it; a third tag must
  stay a compile error).
- Where the field doc comments live after the move (on the struct entries), provided `DecisionRecord`'s
  emitted `.d.ts` and hover still show them. If TypeScript drops them through the schema's `Type`, keep them on
  the struct and record it.
</decisions>

<canonical_refs>
## Canonical References
- `packages/core/src/DecisionRecord.ts`, `SinkCodec.ts`, `SinkEmit.ts`, `SinkWire.ts`, `Lifecycle.ts`,
  `EvaluationMetrics.ts`, `Identity.ts`, `Errors.ts`, `JsonHazard.ts`, `index.ts`
- `packages/core/test/SinkCodec.test.ts`, `fixtures/sinkWireV2.ts`, `DecisionSink.test.ts`, `Errors.tst.ts`,
  `DecisionSink.tst.ts`; `packages/audit/test/AuditEntry.test.ts` (bytes agree across sinks)
- `packages/core/bench/Evaluate.bench.ts`, `SinkCodec.bench.ts`
- `node_modules/effect/src/Schema.ts` (`makeClass`, `optional`), `Data.ts` (`TaggedClass`)
- ADR-QD-002, ADR-QD-037, ADR-QD-060, ADR-QD-095, ADR-QD-096 (and its ADR-105/106 amendments), ADR-QD-099,
  ADR-QD-105, ADR-QD-106; INV-QD-096, INV-QD-097, INV-QD-170; BEH-QD-183, BEH-QD-195, BEH-QD-199/200
- Prior phase: `.planning/milestones/v1.0-phases/09-sink-record-projection/` (ARCH-54, which put every
  projection in `SinkEmit.ts`)
</canonical_refs>

<deferred>
## Deferred Ideas
- Wire version 3 omitting the decision's duplicated fields (ADR-QD-096's ADR-106 amendment queues it).
- Making `Decided`/`Failed` schema classes so the decision's `outcome` joins the shared struct (needs a
  transformation that carries ADR-QD-106's checks; changes `Inconsistent` into `Malformed` unless done carefully).
- The same duplication in `AccessDenied` (ADR-QD-106 Consequences).
</deferred>

---
*Phase: 23-sink-record-fields · Context gathered: 2026-11-11*
