# 08 — Serialization

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-BEH-08                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

---

## BEH-EG-057: The codec is derived

> **Invariant:** [INV-EG-003](../invariants.md#inv-eg-003-codec-type-identity)
> **See:** [ADR-EG-002](../decisions/002-schema-derived-policy-adt.md)

```ts
export const PolicyFromJson: Schema.Codec<Policy, string>;
export const toJson: (policy: Policy) => Effect.Effect<string, SchemaError>;
export const fromJson: (json: unknown) => Effect.Effect<Policy, SchemaError>;
export const toJsonValue: (policy: Policy) => Effect.Effect<unknown, SchemaError>;
export const fromJsonValue: (value: unknown) => Effect.Effect<Policy, SchemaError>;
```

```
REQUIREMENT: Serialization MUST be derived from the policy schema. It MUST NOT
             be hand-written.
```

## BEH-EG-058: Round-trip identity

```
REQUIREMENT: For every policy `p`, `fromJson(toJson(p))` MUST be structurally
             equal to `p`, and MUST evaluate identically against any subject.
```

This is the guarantee the rewrite exists to provide. It is verified three ways:

- a unit test pinning the exact defect (`Union` visibility narrowing to `First`);
- a property test over ~60 generated policy trees;
- a Gherkin scenario, `@REQ-EG-008`.

## BEH-EG-059: Decoding rejects hostile input

```
REQUIREMENT: Decoding MUST reject an unknown `_tag`, a permission segment
             containing `:`, an empty permission segment, and malformed JSON.
```

```
REQUIREMENT: Decoding MUST bound recursion, so a deeply nested payload cannot
             exhaust the stack.
```

---

_Previous: [07 — Enforcement](./07-enforcement.md) | Next: [09 — React Integration](./09-react.md)_
