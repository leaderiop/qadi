# 04 — Matcher DSL

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-04                                    |
> | Revision       | 1.4                                            |
> | Effective Date | 2026-09-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.4 (2026-09-08): `gte`/`lt` extended — both operands, not only the policy-authored bound, MUST be finite; the resolved value side was unguarded, so a `gte(...)` bound matched an `Infinity`-valued attribute regardless of the bound (issue #67, CCR-QD-115)<br>1.3 (2026-09-07): `Eq`/`Neq` corrected to deny on an absent operand on either side — `Neq` matched when a reference resolved to nothing, contradicting this document's own requirement; supersedes the "accepted as-is" call in commit `dab09bc`, which this document's Revision 1.2 never reflected (CCR-QD-112)<br>1.2 (2026-07-26): the `Dominates` matcher (CCR-QD-017)<br>1.1 (2026-07-26): `action()` value reference and `referencesAction` (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## BEH-QD-025: Matchers are data

> **See:** [ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)

Matchers contain no closures, so they serialize with the policy that holds them.
Like `Policy`, the `Matcher` type below is hand-written first, and the
`Schema.Codec` is built and type-asserted against it.

```ts
export type Matcher =
  | { readonly _tag: "Eq"; readonly ref: ValueRef }
  | { readonly _tag: "Neq"; readonly ref: ValueRef }
  | { readonly _tag: "Dominates"; readonly ref: ValueRef }
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
export const action: () => ValueRef;                // the request's verb
export const literal: (value: unknown) => ValueRef; // a constant
```

A comparison may target a constant, an attribute of the subject, the subject's
identifier, a field of the resource, or the action being performed. Together
these express relational rules such as "the document's owner is me":

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

```
REQUIREMENT: `Eq` and `Neq` MUST deny when either operand is `undefined` —
             the resolved reference, the value being compared, or both. An
             absent operand is unknown, not "equal to nothing"; asserting
             equality or inequality about an unknown would treat an
             unchecked attribute as though it had been checked (CCR-QD-112).
             This holds even for a `literal` reference explicitly
             constructed as `undefined`: `exists()` is the DSL's
             purpose-built way to test for absence, and `Eq` MUST NOT double
             as an implicit second one.
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
REQUIREMENT: `gte` and `lt` MUST return false unless BOTH operands — the
             policy-authored bound and the resolved attribute value — are
             finite. A `Matcher` crosses the same untrusted-JSON trust
             boundary a `Policy` does: JSON has no literal spelling for
             `Infinity`, but `1e400` decodes to it, on either side of the
             comparison. Guarding only the bound left `gte(3)` satisfied by
             an `Infinity`-valued attribute regardless of the bound
             (`Infinity >= 3` is `true`); `lt` already failed closed in the
             mirror case, but is guarded the same way for consistency
             (CCR-QD-115).
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
  /** What the caller is doing. `undefined` when none was supplied. */
  readonly action: string | undefined;
}

export const referencesAction: (self: Matcher) => boolean;
```

```
REQUIREMENT: Matcher evaluation MUST be synchronous and total. Attribute
             *resolution* may perform I/O, but it completes before a matcher
             runs, so matchers need no Effect.
```

Totality has a consequence the evaluator has to absorb. A matcher cannot report
that it lacked an input, so anything a matcher *needs* must be checked before it
runs. `referencesAction` is that check for the action; see
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one).

---

_Previous: [03 — Policy ADT](./03-policy-adt.md) | Next: [05 — Evaluator](./05-evaluator.md)_
