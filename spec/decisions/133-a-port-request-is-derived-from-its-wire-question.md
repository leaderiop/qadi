# ADR-QD-133 — A port's request is derived from its wire question

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-133                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-11                                     |
> | Status         | Accepted — amends ADR-QD-094; reads ADR-QD-107, ADR-QD-109 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-11): Initial (ARCH-69, CCR-QD-411) |

---

## Context

A port description states a request's fields in several places. Four of the five ports
(`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `SignatureHistory`) wrote two of
them by hand, each in the same shape as the others:

- `key`, a tuple of the request's fields handed to `canonicalKey`:
  `AttributeResolver.ts` `[subjectId, attribute]`, `RelationshipResolver.ts`
  `[subjectId, relation, resourceId, depth]`, `DecisionHistory.ts`
  `[subjectId, event, resourceId]`, `SignatureHistory.ts`
  `[subjectId, resourceId, meaning, signerRole]`. `canonicalKey` takes an `unknown`, so a tuple that
  forgot a field compiled.
- `defect`, `failure(args, Cause.squash(cause))`, restated four times.

The wire question's members were listed a second time in each `toQuestion`, where an absent optional
member was dropped with a conditional spread, so a spread left out compiled too (the wire schema
declares those members `Schema.optionalKey`). The span's `pose` was a third listing: it returns a
`SpanType` whose members are all optional, so a pose that forgot a member compiled.
`SignatureHistory` stated its four request fields about eight times, and ADR-QD-109 had to touch all
of them to add `meaning` and `signerRole`.

The defect was shown by hand on the phase base: removing `signerRole` from `SignatureHistory`'s key
passes `tsc -b packages/core` and fails exactly two `PortConformance.test.ts` rows (the exact key
text and "every argument reaches the key"). Nothing else saw it (21-01, PREQ-04).

**What the harm was, and was not.** Evaluation never reads the port key: `DecisionCache` and
`Question` use `Equal.equals` (Phase 17 verified it). The key is read by devtools' capture and replay
(`Capture.ts`), by `scriptedPort`'s `replyTable` (`PortDoubles.ts`) and by `SignatureHistory`'s
`pairKey`. A dropped field was therefore a wrong replay or a wrong test-double answer, which can hide
or invent a decision during review. It was never a production grant, and this record does not
claim one.

## Decision

**D-01. The wire question is total by type.** `PortWireSpec.toQuestion` returns a `QuestionOf<Q>`: every
member of the question is present, a required one keeps its type and an optional one becomes a
required key typed `| undefined` (`exactOptionalPropertyTypes` stays on). `portWire` drops the
`undefined` members (`presentMembers`) before the strict schema encode, which is
`Schema.encodeUnknownResult`, so no cast is needed. Every conditional spread in the five `toQuestion`
bodies is gone, and a question that leaves a member out is a compile error. The wire bytes are
unchanged; they were pinned green first (`PortWire.test.ts`, "the wire bytes of a question").

**D-02. A derived port states no key and no defect.** A package-private builder,
`makePortDescription` in `PortDerivation.ts`, takes a description minus `wire`, `key` and `defect`,
plus a wire spec whose `toQuestion` is total, and returns a full `PortDescription`:
`key = (args) => canonicalKey(presentMembers(toQuestion(args)))` and
`defect = (args, cause) => failure(args, Cause.squash(cause))`. Its spec type is an `Omit` of
`PortDescription`, so a member the description gains reaches the four ports with no change to the
builder. The four ports are built with it. `PortDescription`'s interface is unchanged: `key` and
`defect` stay members every consumer reads.

**D-03. `CustomPredicate` states its own, and says why.** Its key must cover the whole subject (roles,
permissions, attributes), the resource and non-JSON `params`, none of which its wire question carries
(the wire sends only the subject's id). Its error has no `cause` field, so its defect renders with
`Cause.pretty`. It stays a plain `PortDescription` literal with both written, documented as the one
override, and pinned by its own tests.

**D-04. The key law is stated once, as a property.** "The wire question" is the value `toQuestion`
builds with its `undefined` members dropped, which is what `encodeQuestion` encodes. For every request
of each derived port, `key(args)` succeeds with `canonicalKey` of the encoded question's text, and
`defect(args, Cause.die(x))` has the same tag and fields as `failure(args, x)`.
`PortDescription.test.ts` checks it with FastCheck, one arbitrary per port in a table typed over the
closed, written-out `DerivedPort` union. It was red on the phase base (a tuple key is not the
question's key). The per-port exact key-text pins and the per-port defect-constructor cases it
replaced were deleted after it was green; the reach rows ("every argument reaches the key") stay as
the runtime net under the compile-time one.

**D-05. The span question is total by type.** A package-private typed identity, `portSpan` in
`PortSpanEncode.ts`, holds each port's `pose` to `PoseOf` the span question: every member but
`interpreter` (which `PortAccess.ts` adds), each a required key typed `| undefined`. The five span
literals are wrapped in it. There is no runtime change; the encoded `qadi.*` attributes are pinned
exactly, per port, for a full and a sparse request (`PortSpan.test.ts`).

## Alternatives considered

- **One struct per port, from which the question, the span question and the Shape request are all
  derived.** Rejected, for three reasons. (1) ADR-QD-107 rejected span structs as the wire, and the
  Amendment of ADR-QD-109 keeps it so: a span never becomes the wire. (2) INV-QD-044 forbids a span
  field holding a value the wire must carry (an attribute's value, a predicate's `params` and
  `resource`); span fields are `SpanValue` leaves under `qadi.*` keys while wire fields are branded
  schemas, `RelationshipDepth` and `Json`, and `scope` exists only on the span, derived. (3) Deriving
  the Shape request types (`SignatureQuery`, `ActedQuery`, `RelationshipCheck`) from the wire struct
  turns `resourceId: ResourceId | undefined` into an optional key under
  `exactOptionalPropertyTypes`, **Breaking** for every adapter. What D-01, D-02 and D-05 do instead
  makes each remaining restatement either derived (key, defect) or exhaustive by type (question,
  pose). `fromQuestion` keeps its spreads: a forgotten required member is already TS2741, and
  `SignatureQuery`'s two optional members are covered by the wire round-trip row.
- **A key over the encoded question.** Rejected. A schema check (a depth outside `RelationshipDepth`,
  say) would refuse the encode, and the key would be partial in a new way: a request the wire cannot
  carry would have no key. The key is over the question `toQuestion` builds; the four question
  schemas encode by identity, so the two texts agree for every request the wire encodes, which the
  law pins.
- **Keep the tuples and rely on the reach rows.** Rejected. That is the state this decision replaces:
  one net, at runtime, in a test that has to be extended for each new field.

## Consequences

- Key text changes again, for the four ports. It is in-process only: Phase 17 found no key persisted or
  sent on a wire, and the only literal key texts in the tree were `PortConformance.test.ts`'s pins.
  `CustomPredicate`'s key is unchanged.
- `pairKey` in the signature fixture keys a partial query on both sides of the fixture, so its
  grouping is unchanged.
- A sixth port derives its key and defect with no edit beyond stating its question, and a question or
  pose that leaves a member out does not compile.
- No export is added or removed: every new name is package-private, and `spec/overview.md` is
  unchanged.
- The deferred idea of a type-level check that every wire-question member is on the span question or
  in a declared exclusion list is not taken. The exclusions are disclosure decisions (INV-QD-044) and
  the question types are module-private.

## Related

[ADR-QD-094](./094-a-port-is-described-once.md),
[ADR-QD-107](./107-a-port-is-answered-remotely-through-its-description.md),
[ADR-QD-109](./109-a-ports-span-is-projected-once-and-every-read-is-one-body.md),
[BEH-QD-409](../behaviors/06-services.md#beh-qd-409-a-request-key-agrees-with-equal-over-its-domain),
[BEH-QD-440](../behaviors/06-services.md#beh-qd-440-a-derived-port-states-no-key-and-no-defect),
[BEH-QD-441](../behaviors/06-services.md#beh-qd-441-a-ports-question-and-span-question-name-every-member),
[INV-QD-044](../invariants.md#inv-qd-044-a-span-never-carries-a-resolved-attributes-value),
[INV-QD-280](../invariants.md#inv-qd-280-a-request-key-is-equals-text),
[INV-QD-286](../invariants.md#inv-qd-286-a-derived-ports-key-names-exactly-its-wire-questions-members).
