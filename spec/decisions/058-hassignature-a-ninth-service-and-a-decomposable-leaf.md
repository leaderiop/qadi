# ADR-QD-058 — `hasSignature`: a ninth service, and a decomposable leaf

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-058                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-25                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-25): Initial release (CCR-QD-089) |

---

## Context

[ADR-QD-056](./056-audit-companion-package.md) (`@qadi/audit`) explicitly
ruled e-signature *check* — a `hasSignature`-shaped `Policy` predicate — out
of its own scope: "a `@qadi/core` change on the scale of ADR-QD-016's own
narrowing, not a corollary of it... needs its own future ADR and grilling
session." This is that session, chartered as the "hasSignature: extending
the Policy ADT for e-signature checks" wayfinder map and resolved across
five tickets (#13–#17).

HexDi's own `hasSignature` (`libs/guard/core/src/evaluator/evaluate.ts:234-358`)
is a real, wired policy predicate — the one genuinely assembled piece across
the whole reference implementation compared against on the audit map. This
ADR is built from scratch against Qadi's own patterns, not copied from
HexDi — [ADR-QD-055](./055-a-named-registered-custom-predicate.md)
(`hasCustom`) is the closer, more directly relevant precedent: it is the
most recent addition of both a new `Policy` leaf and a new required service
at once, and this decision follows its shape throughout.

## Decision

### `Signature` and `SignatureHistory` (ticket #13)

`packages/core/src/Signature.ts` defines the canonical shape, `Schema`-derived
per [ADR-QD-002](./002-schema-derived-policy-adt.md)'s trust-boundary
condition:

```ts
export const Signature = Schema.Struct({
  signerId: Schema.String.pipe(Schema.brand("SubjectId")),
  meaning: Schema.String,
  signerRole: Schema.optional(Schema.String),
  signedAt: Schema.Number,
  algorithm: Schema.optional(Schema.String),
  keyId: Schema.optional(Schema.String),
});
export type Signature = typeof Signature.Type;
```

`SIGNATURE_MEANINGS`/`SignatureMeaning` — a recommended, non-exhaustive
vocabulary — moved here from `@qadi/audit`'s `ElectronicSignature` (see the
harmonization ADR, [ADR-QD-057](./057-audit-signature-harmonization.md)).
`signerRole` is new — `@qadi/audit`'s predecessor type never carried it.

`packages/core/src/SignatureHistory.ts` mirrors `DecisionHistory`/`HasActed`
exactly: one `signaturesFor({subjectId, resourceId?})` method, not two,
returning `Effect<ReadonlyArray<Signature>, SignatureHistoryUnavailable>`.
Scope (resource-scoped vs. subject-global) is the presence or absence of
`resourceId`, the same split `HasActed`/`HasNotActed` already use — not a
second concept. The default, `SignatureHistoryNone`, answers `[]`: an empty
array denies unambiguously, so — unlike `DecisionHistory`'s three-valued
`ActedResult` — no polarity argument applies here; `hasSignature` has no
`hasNotSigned` counterpart for `"Unknown"` to protect against.

### `HasSignature`, the leaf (ticket #14)

```ts
const HasSignature = Schema.TaggedStruct("HasSignature", {
  meaning: Schema.String,
  signerRole: Schema.optional(Schema.String),
  scope: HistoryScope,
  fields: Fields,
});

export interface SignatureOptions extends FieldOptions {
  readonly scope?: HistoryScope;
  readonly signerRole?: string;
}

export const hasSignature: (
  meaning: string | SignatureMeaning,
  options?: SignatureOptions,
) => Policy;
```

`scope` reuses `HistoryScope` (`"Resource" | "Any"`) verbatim rather than a
distinct type — same semantics `HasActed`/`HasNotActed` already give it.
`meaning`'s wire schema stays an open `Schema.String`, the same
open-namespace treatment `HasAttribute.attribute` and `HasCustom.name` get;
the TypeScript parameter narrows to `string | SignatureMeaning` for editor
autocomplete over the recommended vocabulary, at zero runtime cost.

### `evaluateHasSignature` (ticket #16)

Wired into `evaluateNode` the same way `evaluateActed`/`evaluateHasRelationship`
are — extracted, `Effect.fn("qadi.hasSignature")`. Allows when **any**
signature `SignatureHistory.signaturesFor` returns satisfies:

```ts
signatures.some(
  (s) => s.meaning === policy.meaning &&
    (policy.signerRole === undefined || s.signerRole === policy.signerRole)
)
```

No comparison against `signedAt` — **trust-on-presence**, settled during
charting: whoever populates the port's data already validated the signature
(typically `@qadi/audit`'s capture flow through `ObligationHandler`);
`hasSignature` is synchronous-data-shaped, not a live crypto-verification
call. A resource-scoped query with no resource, or a resource with no `id`,
fails with the **existing, generic** `MissingResourceId`, populated with
`policy.meaning` — the same reuse `evaluateActed`/`evaluateHasRelationship`
make of it, substituting the leaf's own identifying field for
`event`/`relation`. No new error type for this case.

`SignatureHistoryUnavailable` (declared in ticket #13, deliberately not yet a
member of either error union until this ticket) now joins `EvaluationError`
and `QadiError`, the same way `DecisionHistoryUnavailable` and
`RelationshipResolveError` already do — a wired store that could not be
reached, distinct from `SignatureHistoryNone`'s legitimate "no signatures"
answer. `SignatureHistory` becomes `EvaluationServices`'s **seventh required**
member (ninth service overall, after `DecisionCache`/`DecisionSink`, both
optional).

The deny reason distinguishes, at no extra cost since the port already
returns the full list before filtering: "no signatures are on file for
subject 'X'" when the list is empty, versus "subject 'X' has no signature
matching meaning 'Y'" when it is non-empty but nothing matched — the same
granularity `DecisionHistory`'s three-valued channel buys `hasActed`, reached
here without a third port value.

### `explain()`, `toPredicate`, `SinkCodec` (ticket #16)

**Decomposable, not opaque.** `HasCustom` renders as an opaque leaf because
`explain` cannot see inside externally-registered logic
([ADR-QD-055](./055-a-named-registered-custom-predicate.md)). `HasSignature`
has no such opacity — `meaning`, `signerRole` and `scope` are public fields on
the policy itself — so `explain()` decomposes it the way `HasActed` is
decomposed, scope-aware: "the subject has a signature meaning 'approved' for
this resource".

**`toPredicate` always refuses `HasSignature`**, with `PolicyNotTranslatable`
— but the *reason* mirrors `HasRelationship`'s, not `HasCustom`'s. A
signature is looked up through an external port, keyed by subject/resource,
and cannot fold into a resource-independent expression — the same shape of
refusal `HasRelationship` gives, not `HasCustom`'s opacity. Recorded as
**INV-QD-056**, mirroring INV-QD-050's "never appears in a compiled
`Predicate`" shape.

`SinkCodec.ts`'s `TRACE_TAGS` gains `"HasSignature"`; its `ErrorSchema`
gains `"SignatureHistoryUnavailable"` with a `subjectId` wire field, encoded
and decoded the same way every other `EvaluationError` variant is.

### Consumer wiring (ticket #17)

Full, in the same change — no "implementation follow-up" left half-assembled,
the standard the audit map held itself to. `@qadi/testing` gains a
`signatures` shorthand on `qadiReviewLayer`/`qadiTestLayer`, mirroring
`history`'s (`SignatureHistory` is data-fetching, unlike opaque
`CustomPredicate`, which earns no such shorthand). `@qadi/http`'s exhaustive
error match maps `SignatureHistoryUnavailable` to 502, the same status every
other resolver outage in that match gets. `@qadi/devtools` gains a complete
`SignatureHistory` entry across its wiring report, port-call log (span
`"qadi.hasSignature"`), capture/replay (key `(subjectId, resourceId?)`,
replay default `[]` matching `SignatureHistoryNone`'s own answer) and
fixture-mode simulation. `@qadi/promise` and `@qadi/react` needed **no**
changes — the former derives its required-services type generically, the
latter references no required service by name at all.

## Alternatives considered

- **A distinct scope type for `HasSignature`**, rather than reusing
  `HistoryScope`. Rejected: identical semantics (resource-scoped vs.
  subject-global), no reason to fork a parallel type — the map's own
  charting-time gloss (`"resource" | "subject"`) was corrected to match the
  real precedent rather than kept.
- **A new error type for the resource-scoped-with-no-resource case**,
  distinct from `MissingResourceId`. Rejected: the existing, generic error
  already carries exactly the shape needed (`relation: string`), and every
  other `scope`-bearing leaf reuses it.
- **Opaque rendering for `explain()`**, matching `HasCustom`. Rejected:
  `HasCustom`'s opacity is about *not being able to see inside* registered
  logic — `HasSignature`'s fields are public and nothing prevents
  decomposition, so treating it as opaque would withhold information
  `explain()` actually has.
- **A comparison against `signedAt`** (an expiry window), giving `hasSignature`
  live-validation semantics. Rejected during charting: trust-on-presence was
  the deliberate choice, and a time-window check would reintroduce the
  live-crypto-verification concept charting explicitly ruled out — validity
  is the capture flow's responsibility, not the check's.

## Consequences

**Positive**:

- Closes the one piece ADR-QD-056 named and deferred, using the same
  "nothing left half-assembled" standard that map held itself to.
- `HasSignature` gets the full treatment every other declarative leaf gets —
  explainable, wire-codable, devtools-visible — unlike `HasCustom`, which
  trades those properties away deliberately for its escape-hatch role.
- The deny-reason distinction ("no signatures at all" vs. "no match") costs
  nothing beyond what the port already returns, and gives a reader real
  diagnostic information instead of one collapsed sentence.

**Negative**:

- `SignatureHistory` is a seventh required service every `EvaluationServices`
  caller must now wire — the same one-line `SignatureHistoryNone` cost every
  required-service addition has paid historically, but a cost nonetheless.
- `toPredicate` refuses `HasSignature` unconditionally — a `Policy` using it
  cannot be pushed down to SQL/Prisma, a named, declared limitation rather
  than a silent one.

**Implemented**: `Signature.ts`, `SignatureHistory.ts`, `Policy.ts`'s
`HasSignature`/`hasSignature`, `Evaluate.ts`'s `evaluateHasSignature`,
`Explanation.ts`, `Predicate.ts`, `SinkCodec.ts`, `Simplify.ts`; consumer
wiring across `@qadi/testing`, `@qadi/http`, `@qadi/devtools`, the Next.js
example and the Gherkin feature suite; INV-QD-056.
