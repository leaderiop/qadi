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

<svg viewBox="0 0 620 210" width="100%" style="max-width: 620px" role="img" aria-label="Diagram: a Matcher's three value references — subject(path), resource(path), and literal(value) — flow into a comparison such as eq or gte, which produces a plain boolean consumed by the Policy leaf that holds the matcher.">
  <defs>
    <marker id="mat-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="20" y="16" width="180" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="110" y="36" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">subject(path)</text>
  <rect x="20" y="66" width="180" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="110" y="86" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">resource(path)</text>
  <rect x="20" y="116" width="180" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="110" y="136" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">literal(value)</text>
  <path d="M 200 31 L 250 76" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#mat-arrow)"/>
  <path d="M 200 81 L 250 81" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#mat-arrow)"/>
  <path d="M 200 131 L 250 86" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#mat-arrow)"/>
  <rect x="250" y="52" width="150" height="64" rx="8" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-accent)"/>
  <text x="325" y="80" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-accent-high)">Matcher</text>
  <text x="325" y="100" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-2)">eq · gte · contains …</text>
  <path d="M 400 84 L 450 84" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#mat-arrow)"/>
  <rect x="450" y="66" width="150" height="36" rx="6" fill="none" stroke="var(--sl-color-hairline-light)"/>
  <text x="525" y="89" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">true / false</text>
  <text x="20" y="185" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">A ValueRef says what's on the other side of the comparison;</text>
  <text x="20" y="200" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">the Matcher itself only ever resolves to a plain boolean.</text>
</svg>

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
equality — see [Security Labels](/docs/concepts/security-labels/) for that
lattice (an ordering where every pair of labels has a narrowest label above
both and a widest label below both).

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

As a full policy leaf, not just a matcher on its own:

```typescript
import { everyMatch, fieldMatch, gte, hasResourceAttribute, someMatch } from "@qadi/core";

// at least one line item has an "approvals" count of 1 or more
const hasApproval = hasResourceAttribute(
  "lineItems",
  someMatch(fieldMatch("approvals", gte(1))),
);

// every line item has a "quantity" of at least 1 — none are back-ordered
const allLinesStocked = hasResourceAttribute(
  "lineItems",
  everyMatch(fieldMatch("quantity", gte(1))),
);
```

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
