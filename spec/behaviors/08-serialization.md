# 08 — Serialization

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-08                                    |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-09-19                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.2 (2026-09-19): BEH-QD-058 narrowed — the round-trip guarantee holds for policies whose segment-shaped and `HasRelationship.depth` fields already satisfy the checks decode enforces (`toJson`/`toJsonValue` do not re-run them on the way out), not for every `Policy` value the type admits; BEH-QD-059 gains a requirement that decoding reject a non-integer, negative, or out-of-`[0, DEFAULT_MAX_DEPTH]` `HasRelationship.depth` — previously a bare `Schema.Number` deferred entirely to `Evaluate.ts`'s runtime clamp (100-lens audit: BL-05, GB-02, MO-02, NW-02; GC-03, WZ-02)<br>1.1 (2026-09-08): BEH-QD-057 — `fromJson` took `json: unknown`, not `string`, and both `fromJson`/`fromJsonValue` were missing `PolicyDecodeTooDeep` from the error channel; BEH-QD-059 now names `PolicyDecodeTooDeep` as the error enforcing the recursion bound (CCR-QD-125)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-057: The codec is derived

> **Invariant:** [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)
> **See:** [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)

```ts
export const PolicyFromJson: Schema.Codec<Policy, string>;
export const toJson: (policy: Policy) => Effect.Effect<string, SchemaError>;
export const fromJson: (
  json: string,
) => Effect.Effect<Policy, PolicyDecodeTooDeep | Schema.SchemaError>;
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
             and malformed JSON.
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
figure a decode failed at. The multiplier is generous rather than tight because
it bounds the raw JSON structure a decode walks, not the decoded policy tree
`DEFAULT_MAX_DEPTH` bounds — an array-valued node (`AllOf`/`AnyOf`/`Rules`) adds
extra JSON nesting around each `Policy` position that never shows up as an extra
level of evaluation depth, so no policy `evaluate` would ever accept is rejected
here first.

---

_Previous: [07 — Enforcement](./07-enforcement.md) | Next: [09 — React Integration](./09-react.md)_
