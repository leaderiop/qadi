# 08 — Serialization

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-08                                    |
> | Revision       | 1.6                                            |
> | Effective Date | 2026-09-19                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.6 (2026-11-20): BEH-QD-666; BEH-QD-622 and BEH-QD-623 amended (ARCH-113, CCR-QD-457)<br>1.5 (2026-11-19): BEH-QD-621 refuses an open object member (an index signature or a rest element) too<br>1.4 (2026-11-19): BEH-QD-621..623, the unknown-key policy; BEH-QD-486 takes required options (ADR-QD-170)<br>1.3 (2026-11-12): BEH-QD-057 drops PolicyFromJson and adds PolicyNotJson; BEH-QD-059 restated (the bound lives in UntrustedDecode.ts); BEH-QD-486 and BEH-QD-487 new (ARCH-78, CCR-QD-421)<br>1.2 (2026-09-19): BEH-QD-058 narrowed — the round-trip guarantee holds for policies whose segment-shaped and `HasRelationship.depth` fields already satisfy the checks decode enforces (`toJson`/`toJsonValue` do not re-run them on the way out), not for every `Policy` value the type admits; BEH-QD-059 gains a requirement that decoding reject a non-integer, negative, or out-of-`[0, DEFAULT_MAX_DEPTH]` `HasRelationship.depth` — previously a bare `Schema.Number` deferred entirely to `Evaluate.ts`'s runtime clamp (100-lens audit: BL-05, GB-02, MO-02, NW-02; GC-03, WZ-02)<br>1.1 (2026-09-08): BEH-QD-057 — `fromJson` took `json: unknown`, not `string`, and both `fromJson`/`fromJsonValue` were missing `PolicyDecodeTooDeep` from the error channel; BEH-QD-059 now names `PolicyDecodeTooDeep` as the error enforcing the recursion bound (CCR-QD-125)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-057: The codec is derived

> **Invariant:** [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)
> **See:** [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)

```ts
export const toJson: (policy: Policy) => Effect.Effect<string, SchemaError>;
export const fromJson: (
  json: string,
) => Effect.Effect<Policy, PolicyDecodeTooDeep | PolicyNotJson | Schema.SchemaError>;
export const toJsonValue: (policy: Policy) => Effect.Effect<unknown, SchemaError>;
export const fromJsonValue: (
  value: unknown,
) => Effect.Effect<Policy, PolicyDecodeTooDeep | Schema.SchemaError>;
```

```
REQUIREMENT: Serialization MUST be derived from the policy schema. It MUST NOT
             be hand-written.
```

## BEH-QD-058: Round-trip identity

```
REQUIREMENT: For every policy `p`, `fromJson(toJson(p))` MUST be structurally
             equal to `p`, and MUST evaluate identically against any subject.
```

This is the guarantee the rewrite exists to provide. It is verified three ways:

- a unit test pinning the exact defect (`Union` visibility narrowing to `First`);
- a property test over ~60 generated policy trees;
- a Gherkin scenario, `@REQ-QD-008`.

**This holds for policies whose checked fields already satisfy the checks
decode enforces** — the segment-shaped brands (`RoleName`, `ActionName`, …)
and `HasRelationship.depth`'s `[0, DEFAULT_MAX_DEPTH]` bound — which is every
policy the property test above generates, but not necessarily every value
`Policy`'s TypeScript type admits. `toJson`/`toJsonValue` do not re-run those
checks on the way out: `Schema`'s checks validate untrusted input on decode,
and an in-memory `Policy` is not untrusted input on encode. The smart
constructors are deliberately total (`Policy.ts`'s `makeRoleName` comment),
so `hasRole("a:b")` builds and encodes without error; the resulting JSON then
fails `fromJson`. `toJson(p)` succeeding is therefore not itself a guarantee
that `fromJson(toJson(p))` will.

## BEH-QD-059: Decoding rejects hostile input

```
REQUIREMENT: Decoding MUST reject an unknown `_tag`, a permission segment
             containing `:`, an empty permission segment, a non-integer,
             negative, or out-of-`[0, DEFAULT_MAX_DEPTH]` `HasRelationship.depth`,
             and text that is not JSON (`fromJson` fails with `PolicyNotJson`,
             BEH-QD-487).
```

```
REQUIREMENT: Decoding MUST bound recursion, so a deeply nested payload cannot
             exhaust the stack. `fromJson` and `fromJsonValue` MUST fail with
             `PolicyDecodeTooDeep` — rather than raising a raw `RangeError` —
             once the raw JSON nests past the bound.
```

The bound is `MAX_DECODE_DEPTH` — **256**, four times
[BEH-QD-038](./05-evaluator.md#beh-qd-038-bounded-recursion)'s evaluation-time
`DEFAULT_MAX_DEPTH` (64) — and is itself normative: `PolicyDecodeTooDeep.maxDepth`
carries it to every caller, so a caller can log or assert against the exact
figure a decode failed at. It is declared in `UntrustedDecode.ts`, beside the
strict decode options it was calibrated with, and applied by every untrusted
seam through `untrustedDecoder` (BEH-QD-486), not by each seam's own guard. The
multiplier is generous rather than tight because
it bounds the raw JSON structure a decode walks, not the decoded policy tree
`DEFAULT_MAX_DEPTH` bounds — an array-valued node (`AllOf`/`AnyOf`/`Rules`) adds
extra JSON nesting around each `Policy` position that never shows up as an extra
level of evaluation depth, so no policy `evaluate` would ever accept is rejected
here first.

## BEH-QD-486: Untrusted JSON is decoded through one decoder

> **Invariant:** [INV-QD-305](../invariants.md#inv-qd-305-every-untrusted-json-seam-is-guarded-by-construction), [INV-QD-306](../invariants.md#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder), [INV-QD-359](../invariants.md#inv-qd-359-one-option-states-an-envelopes-unknown-key-policy-and-no-seam-hand-builds-it)
> **See:** [ADR-QD-143](../decisions/143-untrusted-json-is-decoded-through-one-module.md), [ADR-QD-170](../decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)

```ts
export const MAX_DECODE_DEPTH: number;
export type UntrustedRefusal = Data.TaggedEnum<{
  NotJson: { readonly message: string };
  TooDeep: { readonly maxDepth: number };
  Malformed: { readonly message: string; readonly error: Schema.SchemaError };
}>;
export type UntrustedValueRefusal = Exclude<UntrustedRefusal, { readonly _tag: "NotJson" }>;
export type UnwalkedKey<A> = /* the keys of A typed `unknown` or `ReadonlyArray<unknown>` */ string;
export type UnknownKeyPolicy = "refuse" | "ignore";
export interface UntrustedDecoderOptions<A, R extends { readonly _tag: string }> {
  readonly unknownKeys: UnknownKeyPolicy;
  readonly unwalked?: ReadonlyArray<UnwalkedKey<A>>;
  readonly prepare?: (input: unknown) => Result.Result<unknown, R>;
}
export interface UntrustedDecoder<A, R extends { readonly _tag: string }> {
  readonly decode: (input: unknown) => Result.Result<A, UntrustedValueRefusal | R>;
  readonly decodeText: (text: string) => Result.Result<A, UntrustedRefusal | R>;
}
export const untrustedDecoder: <S extends Schema.ConstraintDecoder<unknown>, R extends { readonly _tag: string } = never>(
  schema: S,
  options: UntrustedDecoderOptions<S["Encoded"], R>,
) => UntrustedDecoder<S["Type"], R>;
```

```
REQUIREMENT: `untrustedDecoder(schema, options)` MUST return decoders that
             run, in this fixed order: `JSON.parse` (`decodeText` only), the
             projection `options.unknownKeys` states, the depth guard over the
             projection without its `unwalked` keys, `prepare` when supplied
             (it receives the projection), then a strict decode (an excess
             property is refused). No option MAY loosen the strictness or the
             bound, except that `ignore` drops an undeclared top-level key
             before the guard (BEH-QD-622); a declared key is never loosened.
```

```
REQUIREMENT: Both decoders MUST return a `Result` and MUST NOT throw. The
             refusal MUST be the closed `UntrustedRefusal`: `NotJson` only
             from `decodeText`, `TooDeep { maxDepth }` when the walked part
             nests past `MAX_DECODE_DEPTH`, and `Malformed` carrying the
             `Schema.SchemaError` otherwise. A `prepare` refusal MUST be
             returned as it is, and its `_tag` MUST NOT collide with the
             three above.
```

```
REQUIREMENT: A key named in `unwalked` MUST be a top-level key the schema
             types `unknown` or `ReadonlyArray<unknown>`, and the guard MUST
             leave it out; whatever the seam reads from it MUST be decoded
             through a decoder of its own, from its own root.
```

A decoder is built once, at module scope, and a seam keeps only a total
mapping from the refusal into its own error (`Match.tagsExhaustive`). The
strict options and the depth walk are not exported: `untrustedDecoder` is the
only way to decode untrusted JSON strictly, and `[untrusted-decode]` in
`scripts/check-house-style.mjs` fails any other file in `packages/*/src` that
tries.

## BEH-QD-487: `fromJson` says when the text is not JSON

> **Invariant:** [INV-QD-305](../invariants.md#inv-qd-305-every-untrusted-json-seam-is-guarded-by-construction)
> **See:** [ADR-QD-143](../decisions/143-untrusted-json-is-decoded-through-one-module.md)

```
REQUIREMENT: `fromJson` MUST fail with `PolicyNotJson` (code `ACL021`) for
             text that is not JSON, and MUST NOT report it as a
             `Schema.SchemaError`. It MUST NOT throw, whatever the text:
             text nested past `MAX_DECODE_DEPTH` is `PolicyDecodeTooDeep`,
             JSON that is not a policy is the `Schema.SchemaError` with its
             issue tree, and text that does not parse — including a deeply
             nested one missing its closing brace — is `PolicyNotJson`.
```

`PolicyNotJson` is a `Data.TaggedError` carrying `message`, the parser's own
text. `fromJsonValue`, which takes an already-parsed value, cannot raise it.
There is no other policy text decoder: `PolicyFromJson`, a schema that decoded
text with no depth guard, was removed (ADR-QD-143).

## BEH-QD-621: Every untrusted decoder states its unknown-key policy

> **Invariant:** [INV-QD-359](../invariants.md#inv-qd-359-one-option-states-an-envelopes-unknown-key-policy-and-no-seam-hand-builds-it)
> **See:** [ADR-QD-170](../decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)

```
REQUIREMENT: Every call to `untrustedDecoder` MUST state `unknownKeys` as
             `"refuse"` or `"ignore"`. The option is required, closed, and
             read through one table keyed by the policy, so a third value is a
             compile error and an omitted one does not compile.
REQUIREMENT: The record wire and the stored record envelope MUST state
             `ignore`; every other seam (the policy, the port wires, the
             hydration payload and its entries, the archive envelope and the
             audit row) MUST state `refuse`.
```

`refuse` leaves the input as it is, so an undeclared top-level key reaches the
strict decode and is `Malformed`: what every decoder did before the policy was
stated. `ignore` is for an envelope a newer sender may extend with metadata
([ADR-QD-096](../decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)
D-15-c). The policy is a separate option from `unwalked`: the first says what an
undeclared key does, the second which declared key the guard leaves to a decoder
of its own ([INV-QD-306](../invariants.md#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder)).
Before it was stated two envelopes in one module held their own tolerance, and
a deep unknown key was refused by one and ignored by the other.

## BEH-QD-622: An ignored key is never walked, so it cannot refuse the input

> **Invariant:** [INV-QD-360](../invariants.md#inv-qd-360-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input), [INV-QD-305](../invariants.md#inv-qd-305-every-untrusted-json-seam-is-guarded-by-construction)
> **See:** [ADR-QD-170](../decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)

```
REQUIREMENT: Under `ignore`, an undeclared top-level key of a plain object MUST
             be dropped before the depth guard, so it is never walked and
             MUST NOT make the input `TooDeep` or `Malformed`, however deep it
             nests.
REQUIREMENT: Every declared key MUST still be walked and strictly decoded, and
             the refusal precedence MUST hold for it: `TooDeep`, then
             `UnsupportedVersion`, then `Malformed`.
REQUIREMENT: An input that is not a plain object (text that parsed to an array
             or a scalar, `null`) MUST pass through the projection unchanged
             and be refused by the strict decode.
```

The projection is a top-level copy of the declared keys, and it reads no value
below the top level and no undeclared value ([BEH-QD-666](#beh-qd-666-the-ignore-projection-reads-names-then-copies-only-the-declared-values)), so it
cannot overflow on hostile nesting. This is a widening of what is accepted: a
deep unknown key on the record wire was `TooDeep` before ADR-QD-170. A change to
what is nested still needs a new wire version, not a new envelope key.

## BEH-QD-623: The declared keys are read from the schema's encoded side

> **Invariant:** [INV-QD-359](../invariants.md#inv-qd-359-one-option-states-an-envelopes-unknown-key-policy-and-no-seam-hand-builds-it)
> **See:** [ADR-QD-170](../decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)

```
REQUIREMENT: Under `ignore`, the declared keys MUST be those of the schema's
             encoded side (`SchemaAST.toEncoded`), for the union member the
             input's own enumerable `_tag` selects; an unknown, absent,
             inherited or non-enumerable `_tag` MUST take the first member,
             and the strict decode then refuses it.
REQUIREMENT: A schema whose keys cannot be derived (one that is not an object
             or a union of objects with distinct literal `_tag`s, or whose
             object has an index signature or a rest element) MUST refuse
             `ignore` when the decoder is built, with a message beginning
             `unknownKeys "ignore" needs`.
```

No key list is written beside a schema: the keys come from the schema the strict
decode reads, so a field added to it is declared without a second edit.
`EnvelopeKeys.ts` does this read, is package-private, and imports `effect`
only.

## BEH-QD-666: The ignore projection reads names, then copies only the declared values

> **Invariant:** [INV-QD-377](../invariants.md#inv-qd-377-the-ignore-projection-never-reads-an-undeclared-value)
> **See:** [ADR-QD-170](../decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)

```
REQUIREMENT: Under `ignore`, the projection of a plain object MUST read its
             own enumerable key names first, then copy the value of each key
             the selected member declares into a fresh object, reading it
             once. It MUST NOT read the value of an undeclared key, so an
             undeclared accessor on an in-process value is never invoked.
REQUIREMENT: Choosing the member MUST read the object's own enumerable `_tag`
             only for a union, once, so a union's `_tag` is read twice: once
             to choose the member and once as a kept value. A one-object
             schema chooses no member: a declared `_tag` MUST be read once, as
             a kept value, and an undeclared `_tag` accessor MUST NOT be
             invoked.
```

`decodeSinkRecord`, `decodeSinkRecordWithJson` and `decodeStoredRecord` take any
value, not only what `JSON.parse` returns, and an in-process value can carry
accessors. The projection used to take the object's own entries, which read every
own value before it kept the declared ones, so an undeclared accessor that threw
was thrown out of the decode. A union's own enumerable `_tag` is read twice, once
to choose the member ([BEH-QD-623](#beh-qd-623-the-declared-keys-are-read-from-the-schemas-encoded-side))
and once as a kept value. Only the top level is projected: below it, and
everywhere under `refuse`, the depth guard and the strict decode still read own
values, accessors included ([INV-QD-377](../invariants.md#inv-qd-377-the-ignore-projection-never-reads-an-undeclared-value)).

---

_Previous: [07 — Enforcement](./07-enforcement.md) | Next: [09 — React Integration](./09-react.md)_
