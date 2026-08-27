---
title: Matchers
description: The data-only comparison DSL that Policy leaves like hasAttribute evaluate against a resolved value.
---

A `Matcher` is a comparison, expressed as data rather than a function. It
describes how to compare *some value* — a subject attribute, a resource field —
against a reference, without knowing yet what that value will turn out to be.
Because a matcher contains no closures, it serializes right along with the
policy that holds it, the same way `Policy` itself does.

`Matcher` values don't appear on their own; they're the second argument to the
`Policy` leaves that need a comparison — `hasAttribute(attribute, matcher)` and
`hasResourceAttribute(attribute, matcher)`:

```ts
import { eq, hasAttribute, subjectId } from "@qadi/core";

// "the resource's owner attribute equals this subject's own id"
const ownsResource = hasAttribute("owner", eq(subjectId()));
```

## Comparisons

```ts
export const eq: (ref: ValueRef) => Matcher;
export const neq: (ref: ValueRef) => Matcher;
export const inArray: (values: ReadonlyArray<unknown>) => Matcher;
export const exists: () => Matcher;
export const gte: (value: number) => Matcher;
export const lt: (value: number) => Matcher;
export const contains: (value: unknown) => Matcher;
export const dominates: (ref: ValueRef) => Matcher;
```

A few of these are stricter than they might look: `exists` distinguishes
absence from falsity — `0` and `""` exist, `null` and `undefined` don't. `gte`
and `lt` return `false` for a non-numeric value rather than coercing it, so
`"5"` never satisfies `gte(3)`. `contains` only applies to arrays and strings,
and anything else it's given evaluates to `false` rather than throwing.
`dominates` compares against a security-label ordering rather than plain
equality — see `SecurityLabel.ts` for that lattice.

## What the reference points at

A `ValueRef` says what the *other side* of a comparison is:

```ts
export const subject: (path: string) => ValueRef;   // an attribute of the subject
export const subjectId: () => ValueRef;              // the subject's own identifier
export const resource: (path: string) => ValueRef;   // a field of the resource
export const action: () => ValueRef;                 // the verb being performed
export const literal: (value: unknown) => ValueRef;  // a constant
```

`subject(path)` and `subjectId()` are deliberately distinct: `subject("id")`
means "the attribute literally named `id`", which is normally absent, while
`subjectId()` is the subject's actual identifier as its own variant of the
union. That separation is what stops an attribute happening to be named `id`
from ever shadowing — or being shadowed by — the subject's identity. Paths are
dot-separated and resolve to `undefined` at any missing step rather than
throwing: an unset attribute is a legitimate answer, not a policy defect.

## Reaching into structure

`fieldMatch`, `someMatch`, `everyMatch`, and `size` let a matcher look inside a
nested value rather than comparing it whole:

```ts
import { fieldMatch, gte, size, someMatch } from "@qadi/core";

// at least one item in the array has an "approvals" field of 1 or more
someMatch(fieldMatch("approvals", gte(1)));

size(gte(1)); // the array or string has at least one element/character
```

`someMatch`/`everyMatch` only apply to arrays, and `size` only to arrays and
strings — anything else is `false`, never an error, matching the same
never-throw discipline as `contains` above.

## Composing at the policy level

Matchers themselves don't have `allOf`/`anyOf`/`not` — those combinators live on
`Policy`, one level up, and combine whole leaves (`hasAttribute(...)`,
`hasRole(...)`, and so on), not raw matchers:

```ts
import { allOf, eq, hasAttribute, hasRole, not, subjectId } from "@qadi/core";

const canEdit = allOf([
  hasAttribute("owner", eq(subjectId())),
  not(hasRole("suspended")),
]);
```

See [The Policy ADT](/docs/concepts/policy-adt/) for how those combinators fit
into the tree, and
[04 — Matcher DSL](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/04-matchers.md)
for the full constructor list and evaluation requirements.
