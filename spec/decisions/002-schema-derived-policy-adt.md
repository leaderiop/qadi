# ADR-QD-002: The policy ADT is schema-derived

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

Policies are persisted as JSON and reloaded, so they cross a trust boundary in
both directions.

The predecessor maintained three artefacts by hand: the TypeScript union in
`policy/types.ts`, a serializer, and a deserializer. They drifted. The
serializer never wrote `fieldStrategy`, so a policy stored and reloaded silently
reverted to the default merge strategy — narrowing field visibility from
`["title", "author"]` to `["title"]` with no error anywhere. This was verified
against the original code before this rewrite began.

The reference style used elsewhere in this ecosystem models domain types as
hand-written interfaces and reserves `effect/Schema` for meta-programming. That
is a good default for types that never leave the process.

## Decision

The policy union's recursive TypeScript type (`Policy`/`PolicyEncoded`) is
hand-written first, because `Schema.suspend` needs a named type to close a
self-referential loop. The `Schema.Union` of `Schema.TaggedStruct` variants is
then built and type-asserted against that type (`Schema.Codec<Policy,
PolicyEncoded>`), so the two cannot silently diverge. The JSON codec is
derived from that schema (`Schema.fromJsonString(Policy)`).

`fieldStrategy` is a **required** field, not optional. An omitted optional is
precisely what went missing before.

This is a deliberate, documented deviation from the hand-written-interface norm.
It is justified by the trust boundary: cloud-resource props are constructed in
source and never parsed from untrusted input, whereas a policy is.

## Consequences

**Positive**:

- Type and codec cannot drift; the defect class is unrepresentable.
- Roughly 400 lines of hand-written serialization deleted.
- Decoding validates untrusted input for free, rejecting unknown tags and
  malformed permission segments.

**Negative**:

- Literal-type inference through a schema-derived union is weaker than through
  hand-written generic interfaces.
- Schema adds a runtime dependency to the policy module.

**Trade-off accepted**: the combinators (`hasPermission`, `allOf`, …) remain the
public construction surface and can preserve literal types where it matters, so
the inference loss is confined to the raw union type. A property test over
generated trees asserts `fromJson(toJson(p))` equals `p`, standing guard over
the guarantee this decision buys.
