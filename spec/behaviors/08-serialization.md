# 08 — Serialization

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-08                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-057: The codec is derived

> **Invariant:** [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)
> **See:** [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)

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

## BEH-QD-058: Round-trip identity

```
REQUIREMENT: For every policy `p`, `fromJson(toJson(p))` MUST be structurally
             equal to `p`, and MUST evaluate identically against any subject.
```

This is the guarantee the rewrite exists to provide. It is verified three ways:

- a unit test pinning the exact defect (`Union` visibility narrowing to `First`);
- a property test over ~60 generated policy trees;
- a Gherkin scenario, `@REQ-QD-008`.

## BEH-QD-059: Decoding rejects hostile input

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
