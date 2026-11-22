# Phase 70: Hydration's drop events come from its buckets - Context

**Gathered:** 2026-11-22
**Status:** Ready for planning

<domain>
## Phase Boundary

`@qadi/react`'s `HydrationEngine.ts` reports what hydration drops with hand-written `if` lines, one per reason:
- **Hydrate side** (`planHydration`, `:511-558`): three arrays (`tooDeep`, `malformed`, `undecodable`) and a
  `bucketOf: Record<EntryDropReason, Array<unknown>>` that points at them. `:543` pushes `malformed.push(entry)`
  directly, not through `bucketOf`. `:550-557` emits three hand-written `if (x.length > 0) events.push(EntriesDropped…)`.
- **Dehydrate side** (`planDehydration`, `:353-389`): two arrays (`foreign`, `unencodable`) and two hand-written
  `if … events.push(LeftOut…)`. No reason-keyed record exists at all.
- **Payload path** (`planHydration`'s `refuse`, `:481-509`): a payload is refused whole, with exactly one
  `PayloadRefusalReason`. `payloadRefusalReason` maps the decoder's refusal tag to a reason (`Match.tagsExhaustive`
  over the refusal), and the subject check names `PayloadSubjectMismatch` by hand.

**Live defect:** nothing links bucket to event. A fourth entry reason given a bucket and no `if` compiles, and its
entries are never reported or counted. That breaks INV-QD-045 ("no entry leaves hydration unaccounted for") without any
error. The dehydrate side has the same shape for `DehydrationDropReason`. ADR-QD-152 recorded, as a consequence, that a
new `payload` or `dehydration` row "compiles everywhere… nothing emits it". It turned down a reason-keyed record in the
payload path only because "a later phase shares the file". No later phase in this milestone edits `HydrationEngine.ts`
(Phase 71 edits `DeveloperSignals.ts` and `GateRegistry.ts`), so that reason no longer applies.

After this phase, every hydration drop reason of every kind is tied to its producer and its event by the compiler. A new
`entry`, `dehydration` or `payload` row in core's `HYDRATION_DROP_TABLE` fails to compile in react until something
produces it and reports it. The events, their order and their counts are byte-identical to the phase base.

ARCH-117. Package: `@qadi/react` only (a **patch** changeset; no public surface change, no `spec/overview.md` change,
no new export). Records:
- ADR-QD-183
- CCR-QD-462
- BEH-QD-686–690
- INV-QD-385–386
- traceability

A reserved id the planner does not use is named "Unused" in the CCR row.

Requirements: DRPE-01..05, plus the cross-cutting WX-01..07 (WX rows stay Pending until the milestone closes).

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE13-CONTEXT.md`)
- **D1 (scope):** all eight review candidates become phases. **D2 (branch):** `arch-wave-13`, no merge, no release.
- Strictly serial; reserved numbers only; **never run `node scripts/next-id.mjs`**.

### The payload-path owner question (decided autonomously, 2026-11-22, under the owner's instruction "do not ask me; always pick the most complete and clean solutions… Qadi should be very clean")
- **D-01: The payload path is folded in.** Every `PayloadRefusalReason` gets a row in a reason-keyed record, typed
  `{ readonly [R in PayloadRefusalReason]: … }` (or `Record<PayloadRefusalReason, …>`). The row states how that reason is
  produced: the decoder refusal it answers (`TooDeep`, `Malformed`, `UnsupportedPayloadVersion`) or the subject check
  (`PayloadSubjectMismatch`). A new `payload` row in core's table is then a compile error in react (TS2741) until its
  producer is stated, the same guarantee the entry and dehydration sides get. The refusal-to-reason direction is derived
  from that record, or checked against it at compile time, so the two directions cannot disagree. No `as`, no `any`, no
  `Record<string, unknown>` widening.
  - Emission is unchanged: a refused payload is still exactly one `PayloadRefused` event, with the same reason and
    entries as on the base. The payload path is exclusive (one reason per payload), so it gets no buckets. Its
    reason-keyed record states the producer, not a bucket.
  - **Rejected:** leaving it as is. ADR-QD-152's only reason, a later phase sharing the file, no longer holds, and it
    would leave one of the three kinds able to gain a reason nothing produces.
  - **Rejected:** forcing the payload path into buckets with one non-empty bucket. That misstates an exclusive refusal
    as a partition, and buys nothing the producer record does not.
- **D-02:** ADR-QD-183 records D-01. It cites ADR-QD-152, and says the "a later phase shares the file" reason no longer
  applies because no later v1.8 phase edits `HydrationEngine.ts`. It amends ADR-QD-152's consequence that a `payload` or
  `dehydration` row "compiles everywhere": all three kinds are now compile errors until produced and reported. Whether
  ADR-QD-152 itself gets a Revision bump with a forward pointer is the planner's call. A pointer is the cleaner reading,
  done through `scripts/spec-revise.mjs`.

### The hydrate side (DRPE-02)
- **D-03:** The buckets are one record keyed by `EntryDropReason`, built once per call by a small total constructor.
  There are no named per-reason arrays. Every drop goes through the record, including today's `malformed.push(entry)`
  for an entry whose fields disagree with its policy (`entryAgrees`), which becomes a push to the `MalformedEntry`
  bucket. No array is reachable except through its reason's key.
- **D-04:** `EntriesDropped` events are derived from the record in one place, by one function, total over the reason
  union. It emits one event per non-empty bucket, then the caller appends `Seeded` exactly as on the base.
- **D-05: Emission order is declared once in react, and it is the base's order.** On the hydrate side that is
  `EntryTooDeep`, `MalformedEntry`, `UndecodablePolicy`. Core's table order is different (`MalformedEntry`,
  `UndecodablePolicy`, `EntryTooDeep`), and DRPE-04 requires byte-identical events, so the order is not read off
  `hydrationDropReasons`. It is stated as a reason-keyed ordering (a record whose key order is the emission order, or a
  tuple with a compile-time check that it lists every member exactly once). A missing reason must be a compile error,
  never a silently skipped bucket. On the dehydrate side the order is `ForeignSubject`, then `UnencodablePolicy`.

### The dehydrate side (DRPE-03)
- **D-06:** `LeftOut` events are derived the same way, from a record keyed by `DehydrationDropReason`. One generic
  derivation serves both sides: parameterised by the reason union, the declared order and the event constructor. Not two
  copies. The subject filter still runs first, so an entry that is both foreign and unencodable stays `ForeignSubject`.
  `Dehydrated` is still appended last.
- **D-07: Home.** The generic bucket record and its event derivation live in one new **package-private** react module,
  `packages/react/src/HydrationBuckets.ts`. It is not exported from `packages/react/src/index.ts`. ADR-QD-099: a module
  kept out of the barrel is private and free to change. `HydrationEngine.ts` uses it on both sides. The payload producer
  record (D-01) stays in `HydrationEngine.ts`, next to the decoder refusal it maps. The planner may move it into
  `HydrationBuckets.ts` if a reviewer reading the payload path would find it there first, but must justify the move.

### Tests (DRPE-01, DRPE-04, WX-06)
- **D-08: Characterisation first, on the phase base, green.** A table test through `hydrateWith`/`dehydrateWith`, or the
  narrowest public or package-internal entry that exposes the events. It pins the exact events (tags, reasons, entries,
  counts) and their order for:
  - each entry reason alone;
  - every pair and all three together (order);
  - the `entryAgrees` malformed case;
  - each payload refusal reason;
  - each dehydration reason alone and both together.

  It must stay green unchanged after the phase (DRPE-04). Metric counts and reporter calls are pinned where an existing
  test does not already pin them.
- **D-09: RED, shown failing once, two ways.**
  1. **Type level (tstyche).** A pin that the derivation and the bucket record are total over each reason union, and that
     the payload producer record covers every `PayloadRefusalReason`. Written on the base, it fails there: the module
     and records do not exist, and the hand-written `if` lines are total over nothing. It is green after.
     - Every negative pin needs its positive twin, and `NOT_CALLABLE_PIN_BUDGET` with its AGENTS.md §6 table is updated
       together if a negative `toBeCallableWith`/`toBeConstructableWith` pin is added.
     - Prefer `@ts-expect-error`-style checked directives or `toBeAssignableTo` for record totality, where that is
       cleaner than a callable pin.
  2. **Recorded base experiment** (ADR-QD-152's precedent). On the phase base, add a throwaway fourth `entry` row to
     core's table plus a bucket and no `if`. Show that it compiles and that its entries reach no event and no count.
     After the phase, show that the same experiment fails to compile at the derivation. Do the same for a throwaway
     `payload` row: on the base it compiles with nothing producing it; after, it is a compile error at D-01's record.
     Record the commands and their first output lines in `70-RED-EVIDENCE.md`. The experiment is never committed to
     source.
- **D-10:** The tstyche pins go in react's existing `packages/react/test/Hydration.tst.ts`, or a new
  `HydrationBuckets.tst.ts` if that reads cleaner. A new type-test file must be selected by tstyche, which the
  `[not-callable-pin]` walk and `pnpm test:tstyche`'s `--listFiles` check enforce.

### Mutation and records (WX-02, WX-05)
- **D-11:** Mutation base at the phase base, before any edit, on `HydrationEngine.ts`, with the same scorer discipline as
  Phase 69 (`70-mutation-base.json` / `70-mutation-close.json`, compared by a phase-local scorer modelled on
  `69-mutation.mjs`, including its clean-tree and single-head rules). `HydrationBuckets.ts` is close-only, with no open
  mutant allowed. A drop is closed with a test, never re-baselined.
- **D-12: Records.**
  - **ADR-QD-183:** D-01, D-02 and D-05's order rule.
  - **INV-QD-385:** every hydration drop reason, of every kind, has exactly one producer and exactly one reporting
    path, and a reason that has neither does not compile. This is INV-QD-045's enforcement restated.
  - **INV-QD-386:** emission order is declared once per side and is total. Or name it "Unused" in the CCR row if the
    planner folds it into INV-QD-385.
  - **BEH-QD-686..690:** across `spec/behaviors/19-hydration.md`, one per observable rule. Hydrate events from the
    buckets, dehydrate events from the buckets, the payload producer record, the emission order, the unchanged counts.
    An unused id is named in the CCR row.
  - **CCR-QD-462:** cites every revision it makes.
  - Traceability rows; one `@qadi/react` patch changeset.
  - Spec registers are revised through `scripts/spec-revise.mjs --date 2026-11-22`.

### Claude's Discretion
- The generic derivation's exact signature and names, and whether the order is a record or a checked tuple. The
  constraints: total, no cast, a compile error on a missing reason, byte-identical output.
- Whether `entryDropReason`'s `malformed` parameter stays, or the two decode sites name their reason directly.
- Splitting into plans: suggested waves are characterisation and RED, then mutation base, then the module and both
  sides, then the payload record, then records and close. The strict serial order with one test runner at a time stays.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HydrationDropReasonOf<K>` (core `HydrationMetrics.ts:223`) already partitions the reasons by kind. React's
  `EntryDropReason`, `PayloadRefusalReason` and `DehydrationDropReason` are read off it (`HydrationEvent.ts:93,102`).
- `HydrationEvent.EntriesDropped` / `LeftOut` / `PayloadRefused` / `Seeded` / `Dehydrated` constructors
  (`HydrationEvent.ts`).
- `payloadRefusalReason` (`HydrationEngine.ts:200`) and `entryDropReason` (`:217`) are `Match.tagsExhaustive`
  dispatchers over the decoder's refusal.
- Phase 69's `69-mutation.mjs` is the model for the phase scorer.

### Established Patterns
- ADR-QD-152: one table in core, unions read off it. TS2741 at a reason-keyed record is the compile-time guard.
- `planHydration` / `planDehydration` are pure and private (ARCH-51, ADR-QD-078). Metrics and reporters run in
  `hydrateWith` / `dehydrateWith` off the returned events, so deriving events changes no metric or reporter code.
- AGENTS.md §5a: a table indexed by a tag its own code wrote needs no `Object.hasOwn`. §6: no `as`, `!` or `any`.

### Integration Points
- `packages/react/src/HydrationEngine.ts` (both plan functions and the payload refusal).
- Tests: `packages/react/test/HydrationEngine.test.ts`, `HydrationCounts.test.ts`, `HydrationPayload.test.ts`,
  `HydrationEvent.test.ts`, `Hydration.test.ts`, `Hydration.tst.ts`, `UntrustedSeams.test.ts`.
- Spec: `spec/behaviors/19-hydration.md`, `spec/invariants.md` (INV-QD-045, INV-QD-323), ADR-QD-152.

</code_context>

<specifics>
## Specific Ideas

- The success test for the phase: on the closed tree, adding a throwaway reason of any kind to core's table produces a
  react compile error naming the record that lacks it, and the throwaway is removed again.

</specifics>

<deferred>
## Deferred Ideas

None. The payload-path question, the only open one, is decided (D-01).

</deferred>
