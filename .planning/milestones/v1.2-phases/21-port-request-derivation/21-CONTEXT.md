# Phase 21: The port request is derived from its description - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Ticket:** ARCH-69 · 2026-11-11 review candidate 1 (PREQ-01..05, WX-01..06)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md` (base `965ff14c`, numbering,
the correction to the review)

<domain>
## Phase Boundary

Four of the five port descriptions (`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `SignatureHistory`) stop
writing `key` and `defect` by hand. A package-private builder derives both from facts the description already states: the
key is `canonicalKey` over the port's **wire question**, and the defect is `failure(args, Cause.squash(cause))`.
`CustomPredicate` keeps its own `key` and `defect`, documented as the one override and why.

The hand-written restatements that stay (`toQuestion` and the span's `pose`) become **exhaustive by type**: a question or a
span question that leaves a member out does not compile. One law test at `PortDescription`'s interface states the key law
for every derived port as a property; the per-port key-text and defect pins it replaces are deleted after it is green.

Out of scope: the public `PortDescription` interface (unchanged: `key` and `defect` stay members every consumer reads), the
Shape request types (`SignatureQuery`, `ActedQuery`, `RelationshipCheck`), the wire bytes, `PortAccess.ts` (Phase 22).

**Amended 2026-11-11 for Phase 22's answered D-05 (`state once`, `_DECISIONS-v1.2.md`):** Phase 22 adds `PortDescription.asks`, the
one leaf→request function per port, and removes the facet's `leaves`. This phase does not add `asks` (it means nothing until
Phase 22 routes the reads through it). Its one obligation: `makePortDescription`'s spec type stays an `Omit` of `PortDescription`
(D-02), so the new member reaches the four derived ports with no change to the spec type (21-03's must-haves say so).
</domain>

<evidence>
## Evidence (re-verified on `965ff14c`, 2026-11-11, by reading and grepping the tree)

**The review's claims hold, with the line numbers below.**

- Hand keys, one tuple of fields per port, typed `unknown[]` by `canonicalKey(value: unknown)`:
  `AttributeResolver.ts:185` `[subjectId, attribute]`; `RelationshipResolver.ts:250-251` `[subjectId, relation, resourceId, depth]`;
  `DecisionHistory.ts:192` `[subjectId, event, resourceId]`; `SignatureHistory.ts:264-265`
  `[subjectId, resourceId, meaning, signerRole]`. A forgotten field compiles.
- Hand defects, all `failure`'s fields plus `Cause.squash(cause)`: `AttributeResolver.ts:183-184`, `RelationshipResolver.ts:244-249`,
  `DecisionHistory.ts:190-191`, `SignatureHistory.ts:258-263`. `CustomPredicate.ts:218` uses `Cause.pretty` on purpose (its error
  has no `cause` field, D-10-e), and its key (`CustomPredicate.ts:219-229`) covers the whole subject (roles, permissions,
  attributes), the resource and non-JSON `params`, none of which its wire question carries (the wire sends only the subject's
  id, `CustomPredicate.ts:115-122`).
- SignatureHistory states its request fields in: `SignatureQuery` (:49-63), the span struct (:123-138), `pose` (:143-149), the wire
  schema (:176-181), `toQuestion` (:183-189), `fromQuestion` (:190-197), `failure`/`defect` (:252-263), `key` (:264-265), and
  `PortAccess.ts:449-465` (Phase 22's).
- `toQuestion` drops an absent optional member with a conditional spread: `RelationshipResolver.ts:182` (depth),
  `DecisionHistory.ts:140` (resourceId), `SignatureHistory.ts:186-188` (three), `CustomPredicate.ts:152-153` (two). Leaving a spread
  out compiles, because the wire schema declares those members `Schema.optionalKey`.

**Where the tree differs from, or adds to, the review.**

- Who catches a dropped key field today: the exact key-text pins (`PortConformance.test.ts:525-567`, "request keys") and the reach
  rows (`PortConformance.test.ts:673-779`, "every argument reaches the key"). Nothing else: the other key consumers compute keys
  symmetrically through the same `d.key` (`PortDoubles.ts:117,121`; `devtools/src/model/Capture.ts:106,215`;
  `SignatureHistory.ts:334`), so a dropped field still agrees with itself there.
- Harm, per `_WAVE7-CONTEXT.md`'s correction: evaluation never reads the key (`DecisionCache` and `Question` use `Equal.equals`). A
  dropped field is a wrong devtools replay or a wrong test-double answer, not a production grant.
- `toQuestion` is typed `Result<Q, EncodeRefusal>` (`PortWireEncode.ts:47`) but is `Result.succeed(...)` in four ports
  (`AttributeResolver.ts:125`, `RelationshipResolver.ts:177`, `DecisionHistory.ts:136`, `SignatureHistory.ts:183`). Only
  `CustomPredicate.ts:132-156` can refuse (JSON conversion of `resource` and `params`). So for the four, the wire question is total.
- `toQuestion` does not encode branded ids: `makeSubjectId`/`makeResourceId` are `Brand.nominal` (`Identity.ts:45,51`), a runtime
  identity, and the four question schemas encode by identity (`SubjectIdSchema`, `ResourceIdSchema`, `Schema.String`,
  `RelationshipDepth`). So `canonicalKey` of the value `toQuestion` builds equals `canonicalKey` of the JSON `encodeQuestion`
  produces, for every request the wire encodes. The law test pins exactly that.
- `pairKey` (`SignatureHistory.ts:334`) keys a partial query `{ subjectId, resourceId }` on both sides of the fixture (build :338,
  lookup :374). A key built from the wire question keys it as `{subjectId}` or `{subjectId, resourceId}` on both sides, so the
  grouping is unchanged: verified by reading both call sites.
- Key text is in-process only: Phase 17 (`17-06-SUMMARY.md`, CCR-QD-407) found no key persisted or sent on a wire, and the only
  literal key texts in the tree are `PortConformance.test.ts`'s pins (`/usr/bin/grep -rlnF '[s"'` over `packages/*/test`,
  `packages/*/src`, `features`, `spec`, `apps/website/src`: one file).
- `fromQuestion`'s spreads are a different matter from `toQuestion`'s. `RelationshipCheck.depth` and `ActedQuery.resourceId` are
  required keys typed `| undefined`, so forgetting one in `fromQuestion` is already TS2741. `SignatureQuery.meaning`/`signerRole`
  are optional keys (`SignatureHistory.ts:60-62`), and the spreads at :194-195 keep an absent member an absent key, which an
  `Equal`-based consumer sees. Forgetting one is caught by the wire round-trip conformance row
  (`PortConformance.test.ts:461-469`), whose `c.args` sets both (`PortConformance.test.ts:173`).
- `pose` returns `SpanType<…>`, every member optional (`PortSpan.ts:51-55`), so a pose that forgets a member compiles too. The
  review did not name this; it is the same defect class as `toQuestion` and is in PREQ-05's scope.
- Numbering: `BEH-QD-440` and `INV-QD-286` already appear in `spec/README.md`, only inside CCR-QD-410's and CCR-QD-409's
  "Unused:" ranges (`BEH-QD-440–448`, `INV-QD-286–289`). They are free; a reservation grep must drop "Unused" lines.
  `node scripts/next-id.mjs` **reserves** a number each time it runs (it writes the shared reservation file under the git common
  directory), so no plan runs it; plans check by grep.
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (the wire question is total by type, PREQ-04, PREQ-05):** `PortWireSpec.toQuestion` returns a question with **every**
  member present: a required member keeps its type, an optional one becomes a required key typed `| undefined`
  (`QuestionOf<Q>`, package-private in `PortWireEncode.ts`). `portWire` drops the `undefined` members (`presentMembers`) before the
  schema encode, which moves from `Schema.encodeResult` to `Schema.encodeUnknownResult` so no cast is needed. Every conditional
  spread in the five `toQuestion` bodies goes. Wire bytes are unchanged (pinned first, 21-01).
- **D-02 (derived key and defect, PREQ-01, PREQ-02):** a package-private builder `makePortDescription` (AGENTS.md §8 `make…`) in
  `PortDerivation.ts` takes a description minus `wire`/`key`/`defect`, plus the wire spec with a **total** `toQuestion`
  (`(args) => QuestionOf<Q>`, no `Result`), and returns a full `PortDescription`: `wire = portWire(...)`,
  `key = (args) => canonicalKey(presentMembers(toQuestion(args)))`, `defect = (args, cause) => failure(args, Cause.squash(cause))`.
  Its spec type has no `key` or `defect` field, so a derived port cannot state one. The four ports are built with it.
  `CustomPredicate` stays a plain `PortDescription` literal with its own `key` and `defect`, and its doc comment says why (its
  question does not carry what its key must cover; its error renders a defect with `Cause.pretty`).
- **D-03 (the key law, PREQ-03):** "the wire question" means the value `toQuestion` builds with its `undefined` members dropped,
  which is what `encodeQuestion` encodes. The law test (`PortDescription.test.ts`, FastCheck, one arbitrary per derived port in a
  table typed over a closed, written-out `DerivedPort` union) asserts, for every generated request, that `d.key(args)` succeeds
  with `canonicalKey(JSON.parse(JSON.stringify(encodeQuestion(args))))`'s text, and that `d.defect(args, Cause.die(x))` has the same
  tag and fields as `d.failure(args, x)`. It is RED on the phase base (today's tuple keys are not the question's key). Deleted
  after it is green: the four ports' lines of "request keys" (exact key texts) and the per-port "defect constructor" describe in
  `conform`, for the four (CustomPredicate's `Cause.pretty` pin moves to its own describe). The reach rows ("every argument
  reaches the key") stay: they are the runtime net under D-01's compile-time one.
- **D-04 (the span question is total by type, PREQ-05):** a package-private typed identity `portSpan` in `PortSpanEncode.ts`
  types each port's `pose` to return every question member but `interpreter` (`PoseOf`, required keys typed `| undefined`;
  `PortAccess.ts` adds `interpreter`). The five span literals are wrapped in it. No runtime change.
- **D-05 (one struct per port: rejected, with the reason recorded, PREQ-05):** the span question and the wire question are not
  one struct, and cannot be: ADR-QD-107 rejected span structs as the wire; INV-QD-044 forbids a span field holding a value the wire
  must carry (an attribute's value, a predicate's `params` and `resource`); span fields are `SpanValue` leaves under `qadi.*` keys
  while wire fields are branded schemas, `RelationshipDepth` and `Json`; `scope` exists only on the span, derived. The Shape
  request interfaces stay hand-written: deriving `SignatureQuery` from the wire struct turns `resourceId: ResourceId | undefined`
  into an optional key under `exactOptionalPropertyTypes`, Breaking for every adapter. What D-01, D-02 and D-04 do instead is make
  each remaining restatement either derived (key, defect) or exhaustive by type (question, pose). `fromQuestion` keeps its spreads
  (see Evidence) and its coverage comes from TS2741 for required members and the round-trip row for SignatureQuery's two optional
  members. ADR-QD-133 records this.
- **D-06 (test first, WX-06):** on the phase base, 21-01 (a) demonstrates PREQ-04's RED by hand: drop `signerRole` from
  `SignatureHistory.ts`'s key, show `tsc` passes and only `PortConformance.test.ts`'s reach row fails, revert; (b) commits RED a
  type test (`PortRequest.tst.ts`) that a question or a pose leaving out a member is not assignable to its slot; (c) commits RED
  the law test; (d) pins the wire bytes green.
- **D-07 (records, WX-02):** ADR-QD-133 (new; amends ADR-QD-094's key sentence, reads ADR-QD-107 and ADR-QD-109); BEH-QD-409
  amended; BEH-QD-440 (a derived port states no key and no defect) and BEH-QD-441 (a question or span question cannot leave a
  member out) new in `spec/behaviors/06-services.md`; INV-QD-286 (a derived port's key names exactly its wire question's members);
  CCR-QD-411; traceability; `spec/README.md` history; changeset `@qadi/core` patch (key text changes; no type changes); AGENTS.md
  §3's sentence listing what a description states. `spec/overview.md`: no export added or removed (every new name is
  package-private), confirmed by `pnpm spec:api`. Unused: BEH-QD-442..444, INV-QD-287.

### Claude's Discretion
- The exact spelling of `QuestionOf` and `PoseOf` (both must keep a required member required and non-`undefined`, and make an
  optional one required with `| undefined`, under `exactOptionalPropertyTypes`; the tstyche file pins the behaviour, not the
  spelling).
- Whether `makePortDescription`'s generics are inferred from the annotated const's type or passed explicitly; whether
  `presentMembers` lives in `PortWireEncode.ts` (recommended) or `PortDerivation.ts`. `pnpm circular` decides any import cycle.
- Arbitrary sizes in the law test (fixed `numRuns` >= 200, no seed).
</decisions>

<canonical_refs>
## Canonical References
- `packages/core/src/PortDescription.ts`, `PortDerivation.ts`, `PortWireEncode.ts`, `PortSpanEncode.ts`, `PortSpan.ts`, `PortKey.ts`,
  `AttributeResolver.ts`, `RelationshipResolver.ts`, `DecisionHistory.ts`, `SignatureHistory.ts`, `CustomPredicate.ts`, `Ports.ts`
- `packages/core/test/PortConformance.test.ts`, `PortDescription.test.ts`, `PortWire.tst.ts`, `PortKey.test.ts`, `PortRemote.test.ts`
- ADR-QD-094 (described once; Rev 1.8 key law), ADR-QD-107 (wire), ADR-QD-109 (pose/disclose), ADR-QD-114 (serving), ADR-QD-129
- `.planning/phases/17-injective-request-key/` (Phase 17: `canonicalKey`, `KeyRefusal`, the key law's equality)
- BEH-QD-409, BEH-QD-410, BEH-QD-310; INV-QD-280, INV-QD-095, INV-QD-044
</canonical_refs>

<deferred>
## Deferred Ideas
- A type-level check that every wire-question member is on the span question or in a declared exclusion list (CustomPredicate's
  `resource`/`params`). The exclusions are disclosure decisions (INV-QD-044) and the question types are module-private; revisit if
  a sixth port is ever added.
- Deriving the Shape request interfaces from the wire struct (Breaking under `exactOptionalPropertyTypes`, see D-05).
</deferred>

---
*Phase: 21-port-request-derivation · Context gathered: 2026-11-11*
