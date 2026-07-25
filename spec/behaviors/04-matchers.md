# 04 — Matcher DSL

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-04                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-025: Matchers are data

> **See:** [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)

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

## BEH-QD-026: Value references

```ts
export const subject: (path: string) => ValueRef;   // subject attributes
export const subjectId: () => ValueRef;             // the subject's own id
export const resource: (path: string) => ValueRef;  // resource fields
export const literal: (value: unknown) => ValueRef; // a constant
```

A comparison may target a constant, an attribute of the subject, the subject's
identifier, or a field of the resource. Together these express relational rules
such as "the document's owner is me":

```ts
hasResourceAttribute("owner", eq(subjectId()))
```

```
REQUIREMENT: `subject(path)` MUST address the subject's *attributes* only. The
             subject's identity MUST NOT be reachable through a path, because a
             reserved path would be shadowed by — or would shadow — an attribute
             that happened to share its name.
```

```
REQUIREMENT: `subjectId()` MUST be a distinct variant of the union rather than a
             reserved path or a magic string, so that it survives serialization
             as data and can never collide with an attribute name.
```

```
REQUIREMENT: Paths MUST be dot-separated and MUST yield `undefined` at any
             missing step rather than throwing. A reference that resolves to
             nothing denies; it is not an error, because an unset attribute is a
             legitimate answer rather than a policy defect.
```

## BEH-QD-027: Constructors and semantics

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

## BEH-QD-028: Evaluation is pure

```ts
export const evaluateMatcher: (
  self: Matcher,
  value: unknown,
  context: MatcherContext,
) => boolean;

export interface MatcherContext {
  /** The subject's attributes. Its identity is `subjectId`, kept separate. */
  readonly subject: Readonly<Record<string, unknown>>;
  readonly subjectId: string;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
}
```

```
REQUIREMENT: Matcher evaluation MUST be synchronous and total. Attribute
             *resolution* may perform I/O, but it completes before a matcher
             runs, so matchers need no Effect.
```

---

_Previous: [03 — Policy ADT](./03-policy-adt.md) | Next: [05 — Evaluator](./05-evaluator.md)_
