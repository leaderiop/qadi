---
title: Security Labels
description: SecurityLabel, dominance, and why join/meet exist even though the evaluator never calls them.
---

A `SecurityLabel` is `(level, compartments)` — a clearance like "Secret,
cleared for CRYPTO and BIO" or a document's own classification. Qadi never
constructs one: a label arrives as ordinary resolved data, through an
attribute or a resource field, exactly like any other value a matcher
compares.

```ts
export interface SecurityLabel {
  readonly level: number;
  readonly compartments: ReadonlyArray<string>;
}
```

## Dominance is not "greater than"

Two labels compare by **dominance**, not by treating `level` as a plain
number: `a` dominates `b` only when `a` is at least as high *and* at least as
broad. `(Secret, {CRYPTO})` and `(Secret, {BIO})` are both level 2, but
neither dominates the other — reading them as scalars would say they're
equal and let each read the other, which is a different, wrong relation.

<svg viewBox="0 0 620 260" width="100%" style="max-width: 620px" role="img" aria-label="Diagram: a small label lattice with four labels. Confidential-empty is at the bottom. Secret-CRYPTO and Secret-BIO sit above it, each dominating it, but are incomparable with each other. Secret-CRYPTO-BIO sits at the top, dominating both. Its join with a lower label is marked, and a meet is marked between the two incomparable middle labels.">
  <defs>
    <marker id="lbl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <path d="M 310 190 L 200 130" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#lbl-arrow)"/>
  <path d="M 310 190 L 420 130" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#lbl-arrow)"/>
  <path d="M 200 108 L 310 48" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#lbl-arrow)"/>
  <path d="M 420 108 L 310 48" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#lbl-arrow)"/>
  <rect x="245" y="192" width="130" height="40" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="310" y="209" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">Confidential</text>
  <text x="310" y="223" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">{ }</text>
  <rect x="130" y="110" width="140" height="40" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-accent)"/>
  <text x="200" y="127" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">Secret</text>
  <text x="200" y="141" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">{ CRYPTO }</text>
  <rect x="350" y="110" width="140" height="40" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-accent)"/>
  <text x="420" y="127" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">Secret</text>
  <text x="420" y="141" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">{ BIO }</text>
  <rect x="240" y="8" width="140" height="40" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="310" y="25" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">Secret</text>
  <text x="310" y="39" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">{ CRYPTO, BIO }</text>
  <text x="310" y="175" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-accent-high)">Secret/CRYPTO and Secret/BIO: incomparable — neither dominates the other</text>
  <text x="310" y="260" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">top = join(CRYPTO, BIO) · bottom = meet(CRYPTO, BIO)</text>
</svg>

```ts
export type LabelOrdering = "Equal" | "Dominates" | "DominatedBy" | "Incomparable";

export const compareLabels: (a: SecurityLabel, b: SecurityLabel) => LabelOrdering;
export const labelDominates: (a: SecurityLabel, b: SecurityLabel) => boolean;
```

`compareLabels` returns all four cases rather than a boolean, because
"incomparable" collapsing into `false` is right for a test and wrong for an
explanation — Qadi's answer to "why was this denied" is that the information
exists rather than has to be inferred. `labelDominates` derives the boolean
from it, admitting only `"Equal"` and `"Dominates"`, and is reflexive: a
label dominates itself, so acting at your own level is always permitted.

## The matcher: `dominates`

`dominates` is the first matcher to take a `ValueRef` instead of a plain
value — dominance relates two *live* values (a subject's clearance, a
resource's classification), which `gte`/`lt` can't express since they
compare against a plain number. Both halves of Bell–LaPadula (a classic
security model: no reading up, no writing down) reduce to this one
comparison with the operands swapped, never negated:

```typescript
import {
  allOf,
  anyOf,
  dominates,
  hasAction,
  hasAttribute,
  hasResourceAttribute,
  resource,
  subject,
  type Policy,
  type SecurityLabel,
} from "@qadi/core";

const bellLaPadula: Policy = anyOf([
  // no read up
  allOf([hasAction("read"), hasAttribute("clearance", dominates(resource("label")))]),
  // no write down
  allOf([
    hasAction("write"),
    hasResourceAttribute("label", dominates(subject("clearance"))),
  ]),
]);

const clearance: SecurityLabel = { level: 2, compartments: ["CRYPTO"] };
const classification: SecurityLabel = { level: 2, compartments: ["BIO"] };
// Incomparable — both the read and the write above are refused, even though
// a scalar comparison would say `2 >= 2` and let each through.
```

A missing or malformed label denies the same way any other missing resolved
value does — `gte(3)` on `undefined` is `false` — so this needs no separate
"absent label" rule.

## `join` and `meet`: exported, never called internally

```ts
export const join: (a: SecurityLabel, b: SecurityLabel) => SecurityLabel;
export const meet: (a: SecurityLabel, b: SecurityLabel) => SecurityLabel;
```

`join` is the least upper bound — the label of something assembled from
both inputs: the **maximum** level and the **union** of compartments. `meet`
is the greatest lower bound: the minimum level and the **intersection**.
Qadi's own evaluator never imports either — deriving a label is computing a
classification, not deciding an access, and that line is deliberate
([ADR-QD-021](https://github.com/leaderiop/qadi/blob/main/spec/decisions/021-label-lattice.md)).

They're exported anyway because the arithmetic fails silently by hand. The
natural mistake is to take the higher level and carry *its* compartments —
for `join(Secret/{CRYPTO}, Confidential/{BIO})` that's `Secret/{CRYPTO}`,
a label the correct `Secret/{CRYPTO, BIO}` dominates. The result
**under-classifies**: a reader without `BIO` clearance reads `BIO` material,
and every subsequent comparison behaves correctly against the wrong label —
nothing catches it downstream.

```typescript
import { join, meet, type SecurityLabel } from "@qadi/core";

const fromCrypto: SecurityLabel = { level: 2, compartments: ["CRYPTO"] };
const fromBio: SecurityLabel = { level: 1, compartments: ["BIO"] };

const assembled = join(fromCrypto, fromBio);
// { level: 2, compartments: ["CRYPTO", "BIO"] } — the label to attach to a
// document built from both sources, computed correctly before it's ever
// compared against anything.

const sharedFloor = meet(fromCrypto, fromBio);
// { level: 1, compartments: [] } — the most both labels admit in common.
```

For the full order-law requirements (reflexivity, antisymmetry, transitivity,
and the absorption laws `join`/`meet` must satisfy) see
[13 — The Label Lattice](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/13-labels.md)
and [ADR-QD-029](https://github.com/leaderiop/qadi/blob/main/spec/decisions/029-lattice-join-and-meet.md).
