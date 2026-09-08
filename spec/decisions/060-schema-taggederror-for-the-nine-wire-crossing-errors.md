# ADR-QD-060 — `Schema.TaggedError` for the nine wire-crossing errors

> **Document Control**
>
> | Property       | Value                                           |
> | -------------- | ------------------------------------------------ |
> | Document ID    | QADI-ADR-060                                      |
> | Revision       | 1.0                                               |
> | Effective Date | 2026-09-08                                        |
> | Status         | Accepted                                          |
> | Author         | Qadi Engineering                                  |
> | Classification | Architecture Decision Record                      |
> | Change History | 1.0 (2026-09-08): Initial release (CCR-QD-140)    |

---

## Context

The September 8, 2026 Effect-Idiom Conformance audit (`reports/audit-2026-09-08/`,
doctrine item D1) flagged the wire bridge `SinkCodec.ts` built for
`EvaluationError` — the nine tags that cross a process boundary inside a
`SinkRecord` (`MissingResource`, `MissingAction`, `AttributeResolveError`,
`RelationshipResolveError`, `MissingResourceId`, `DecisionHistoryUnavailable`,
`PolicyTooDeep`, `CustomPredicateError`, `SignatureHistoryUnavailable`).
AGENTS.md §4 requires `Data.TaggedError` for every error class; a
`Data.TaggedError` has no schema of its own, so `SinkCodec.ts` carried a
second, hand-maintained description of the same nine shapes: one all-optional
`ErrorSchema` struct serving all nine (`?? ""`/`?? 0` fallbacks papering over
fields that do not apply to a given tag), plus two ~60-line
`Match.tagsExhaustive`/`Match.value` mappers translating between the two
descriptions by hand. `everyError` (`SinkCodec.test.ts`)'s round-trip property
test was the only thing keeping the two in lock-step; nothing made a drift
between them a compile error.

This is charted as wayfinder ticket ["Error-wire schema model for the 9
wire-crossing error tags"](https://github.com/leaderiop/qadi/issues/97),
child of map ["Resolve the September 8, 2026 Effect-Idiom Conformance audit"](https://github.com/leaderiop/qadi/issues/96).
The audit named two options without picking one — a shared fields table
deriving both the class and the wire schema (keeping `Data.TaggedError`
everywhere), or adopting `Schema.TaggedError` directly for these nine tags.
The map's driver chose the latter.

## Decision

The nine `EvaluationError` members are now `Schema.TaggedError<Self>()(tag,
fields)` classes (`Errors.ts`) instead of `Data.TaggedError`. This is a
narrow, named exception to AGENTS.md §4 — every other error class in the
codebase (`AccessDenied`, `UndischargedObligation`,
`CircularRoleInheritance`, `DuplicateRoleDefinition`,
`InvalidPermissionSegment`, `PolicyNotTranslatable`,
`InvalidBoundedPermits`, `PolicyDecodeTooDeep`) stays `Data.TaggedError`, and
the house rule stays the default for every future error: this exception is
earned by actually crossing a process boundary, not claimed pre-emptively.

Consequences of the class itself now being the schema:

- `SinkCodec.ts`'s all-optional `ErrorSchema` and both hand-written
  `Match.tagsExhaustive`/`Match.value` mappers (`encodeError`/`decodeError`)
  are deleted. `SinkRecordWire`'s `failed` field is
  `Schema.optional(Schema.Union([MissingResource, MissingAction, …]))` — the
  nine classes directly. `toWire`/`fromWire` pass the error value through
  unchanged; `Schema.encodeEffect(SinkRecordWire)`/`decodeUnknownEffect`
  already know how to encode/decode each member, because each member *is*
  its own schema now.
- A tenth tag added to `EvaluationError` without a matching union member is
  a compile error at `SinkRecordWire`'s definition site — the same
  exhaustiveness the deleted `Match.tagsExhaustive` gave, but enforced by
  the type checker instead of a hand-written arm someone has to remember to
  add. `everyError` (`SinkCodec.test.ts`) is retyped
  `Record<EvaluationError["_tag"], () => EvaluationError>` for the same
  reason at the test-fixture level.
- `AttributeResolveError`/`RelationshipResolveError`/
  `DecisionHistoryUnavailable`/`SignatureHistoryUnavailable`'s `cause: unknown`
  field is now `Schema.Defect()` — the library schema built for exactly this
  shape (an unknown thrown value crossing a JSON boundary): an `Error` encodes
  to `{ name, message, cause? }` and decodes back to one; anything else is
  formatted and falls back to a string. This is a strictly more capable
  encoding than the old `renderCause` helper it replaces (which only ever
  produced a string), deleted along with it.
- `RelationshipResolveError.resourceId`/`SignatureHistoryUnavailable.resourceId`/
  `subjectId` — `ResourceId`/`SubjectId` stay `Brand.nominal`, not
  `Schema.brand` (`Identity.ts`'s own reasoning: caller-supplied identity from
  an open namespace, nothing to validate). `Identity.ts` gains
  `ResourceIdSchema`/`SubjectIdSchema`, `Schema.String.pipe(Schema.fromBrand(...))`
  wrapping the *same* `Brand.Constructor`s — a schema view of an unchanged
  brand, not a second, independently-typed one.
- The wire's `code: Schema.optional(Schema.String)` field — the stable
  `ACL###` written on encode and, by the deleted schema's own doc comment,
  "ignored on decode" — is **not** carried forward. A wire consumer wanting
  the stable code for a decoded record now computes it from `_tag` via
  `errorCode()`/`ERROR_CODES` (`Errors.ts`, unchanged, still exhaustive over
  `QadiError`), rather than trusting a value embedded by the sender that
  decode never validated in the first place. This is named as a wire-format
  change, not an oversight: see Consequences.

## Alternatives considered

- **Shared fields table, keep `Data.TaggedError`.** The map's other named
  option: one `{ tag: fields }` object generating a per-tag `Schema.Struct`
  and the class shape from a single source, with `Data.TaggedError` intact
  everywhere. Keeps AGENTS.md §4 with zero exceptions, and `httpApiStatus`
  could still be annotated on the derived per-tag struct directly (an
  annotation, not a `Schema.TaggedError`-exclusive feature) — so this was not
  rejected for blocking wayfinder ticket ["How far does packages/http commit
  to the HttpApi framework"](https://github.com/leaderiop/qadi/issues/98).
  Rejected because the map's driver chose the smaller, more idiomatic
  diff over preserving the house rule without exception; recorded as the
  road not taken rather than as wrong.
- **Preserve the wire `code` field via a constructor default.** Considered
  keeping wire-embedded `code` for exact backward compatibility, via
  `Schema.withConstructorDefault` so existing call sites need not pass it.
  Rejected: `withConstructorDefault` only fires on `make*`/construction, not
  on decode, so a literal-typed `code` field would make decode *reject* a
  record whose `code` does not match its `_tag` — a stricter failure mode
  than today's "decode never reads it" tolerance — while a loosely-typed
  `Schema.optional(Schema.String)` field would accept any string and
  preserve nothing worth calling a contract. The field's own value was
  already documented as decode-ignored before this ADR; recomputing it from
  `_tag` on the reading side is strictly more trustworthy than carrying a
  value nothing ever validated.

## Consequences

**Positive**:

- `SinkCodec.ts` loses its `ErrorSchema` struct and both
  `Match.tagsExhaustive`/`Match.value` mappers (roughly 200 lines) —
  `toWire`/`fromWire` no longer hand-translate `EvaluationError` at all.
- A new `EvaluationError` tag is a compile error at `SinkRecordWire`'s
  definition and at `everyError`'s fixture, not a silent gap a round-trip
  test happens to catch (or doesn't, if nobody added a fixture entry).
- `cause`'s wire representation (`Schema.Defect()`) is a maintained library
  schema rather than a one-line `String(cause)` this file owned and tested
  alone.
- `Schema.TaggedError`'s per-tag classes are exactly what wayfinder ticket
  ["How far does packages/http commit to the HttpApi framework"](https://github.com/leaderiop/qadi/issues/98)
  needs for `httpApiStatus` annotations on the HTTP error channel — no
  further wire-shape work required there, only the annotation.

**Negative** (named honestly, not minimized):

- AGENTS.md §4's "not suggestions" rule now has a real, if narrow and named,
  exception: nine of the library's ~17 error tags are `Schema.TaggedError`,
  the rest stay `Data.TaggedError`. A reviewer checking "is this a
  `Data.TaggedError`" now also has to check "does this cross the wire" before
  flagging a `Schema.TaggedError` as a violation.
- A wire consumer outside this repository that read `.code` off a decision
  sink's JSON payload (a devtools build, a forwarding pipeline) needs to
  switch to deriving the code from `_tag` — this is a real, if narrow, wire
  contract change. No consumer inside this repository read `wire.failed.code`
  outside `SinkCodec.test.ts`'s own assertions, which are updated in the same
  change.
- `check-house-style.mjs`'s `no-...-taggederrorclass` rule matches the literal
  identifier `TaggedErrorClass`, which does not exist in
  `effect@4.0.0-rc.112` (`Schema.TaggedError` is the current name) — so this
  change trips no gate either way. AGENTS.md §4's prose is stale on the exact
  API name it forbids; this ADR is the correction, the same way CCR-QD-077
  corrected §2's example signature.

**Implemented**: `packages/core/src/Errors.ts`, `packages/core/src/Identity.ts`,
`packages/core/src/SinkCodec.ts`, `packages/core/test/SinkCodec.test.ts`.
