# 04 — Matcher DSL

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-BEH-04                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

---

## BEH-EG-025: Matchers are data

> **See:** [ADR-EG-002](../decisions/002-schema-derived-policy-adt.md)

Matchers contain no closures, so they serialize with the policy that holds them.
Like `Policy`, the union is schema-defined and the type is derived from it.

```ts
export type Matcher =
  | { readonly _tag: "Eq"; readonly ref: ValueRef }
  | { readonly _tag: "Neq"; readonly ref: ValueRef }
  | { readonly _tag: "In"; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "Exists" }
  | { readonly _tag: "Gte"; readonly value: number }
  | { readonly _tag: "Lt"; readonly value: number }
  | { readonly _tag: "Contains"; readonly value: unknown }
  | { readonly _tag: "FieldMatch"; readonly field: string; readonly matcher: Matcher }
  | { readonly _tag: "SomeMatch"; readonly matcher: Matcher }
  | { readonly _tag: "EveryMatch"; readonly matcher: Matcher }
  | { readonly _tag: "Size"; readonly matcher: Matcher };
```

## BEH-EG-026: Value references

```ts
export const subject: (path: string) => ValueRef;
export const resource: (path: string) => ValueRef;
export const literal: (value: unknown) => ValueRef;
```

A comparison may target a constant, a field of the subject, or a field of the
resource — the last of which expresses relational rules such as "the document's
owner equals the subject's id".

```
REQUIREMENT: Paths MUST be dot-separated and MUST yield `undefined` at any
             missing step rather than throwing.
```

## BEH-EG-027: Constructors and semantics

```ts
export const eq: (ref: ValueRef) => Matcher;
export const neq: (ref: ValueRef) => Matcher;
export const inArray: (values: ReadonlyArray<unknown>) => Matcher;
export const exists: () => Matcher;
export const gte: (value: number) => Matcher;
export const lt: (value: number) => Matcher;
export const contains: (value: unknown) => Matcher;
export const fieldMatch: (field: string, matcher: Matcher) => Matcher;
export const someMatch: (matcher: Matcher) => Matcher;
export const everyMatch: (matcher: Matcher) => Matcher;
export const size: (matcher: Matcher) => Matcher;
```

```
REQUIREMENT: `exists` MUST distinguish absence from falsity. `0` and `""` exist;
             `null` and `undefined` do not.
```

```
REQUIREMENT: `gte` and `lt` MUST return false for non-numeric values rather than
             coercing. `"5"` does not satisfy `gte(3)`.
```

```
REQUIREMENT: `contains` MUST apply to arrays and strings only.
             `someMatch`, `everyMatch` MUST apply to arrays only.
             `size` MUST apply to arrays and strings only.
             Any other input type MUST yield false, never an error.
```

## BEH-EG-028: Evaluation is pure

```ts
export const evaluateMatcher: (
  self: Matcher,
  value: unknown,
  context: MatcherContext,
) => boolean;
```

```
REQUIREMENT: Matcher evaluation MUST be synchronous and total. Attribute
             *resolution* may perform I/O, but it completes before a matcher
             runs, so matchers need no Effect.
```

---

_Previous: [03 — Policy ADT](./03-policy-adt.md) | Next: [05 — Evaluator](./05-evaluator.md)_
