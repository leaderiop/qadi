---
title: Explanation & Simplification
description: What a policy says versus what one evaluation did, and the opt-in rewrite that shrinks a policy tree without changing either.
---

Two operations over a `Policy`, and neither one evaluates it. `explain` reads
a policy tree and describes what it *requires*, with no subject in sight.
`simplify` reads a policy tree and rewrites it to an equivalent, smaller one.
Both leave the tree's meaning untouched; only `simplify` changes its shape.

## Explanation: what a policy says, not what happened

`explain` answers "what does this rule require" — the question a security
reviewer asks *before* anyone is evaluated against it, and the one an admin
screen listing policies has to answer without running an evaluation at all.
Its signature cannot take a subject:

```ts
export const explain: (policy: Policy) => Explanation;
export const renderExplanation: (explanation: Explanation, options?: RenderOptions) => string;
```

That's the load-bearing difference from a **trace**: a `Trace` is what one
evaluation *did*, for one subject, and it says which branches were actually
taken. An `Explanation` that varied by subject would be a trace wearing a
different name — and showing one on an admin screen would leak whether the
viewer themselves satisfies a policy they were only meant to *read*.

<svg viewBox="0 0 640 220" width="100%" style="max-width: 640px" role="img" aria-label="Diagram: the same policy tree feeding two different outputs. Explain, with no subject, produces a static description of every branch. Evaluate, with a subject, produces a trace of only the branches actually taken, marked allowed or denied.">
  <defs>
    <marker id="expl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="255" y="8" width="130" height="34" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="320" y="30" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">anyOf([A, B])</text>
  <path d="M 280 42 L 160 68" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#expl-arrow)"/>
  <path d="M 360 42 L 480 68" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#expl-arrow)"/>
  <rect x="20" y="70" width="280" height="120" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">EXPLAIN(policy)</text>
  <text x="40" y="116" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-2)">"either requires role A</text>
  <text x="40" y="132" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-2)">or requires permission B"</text>
  <text x="40" y="156" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">no subject — both branches</text>
  <text x="40" y="172" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">described, neither "taken"</text>
  <rect x="340" y="70" width="280" height="120" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="360" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">EVALUATE(policy, subject)</text>
  <text x="360" y="116" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.65 0.16 25)">A: denied — no role held</text>
  <text x="360" y="132" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.75 0.14 150)">B: allowed — permission held</text>
  <text x="360" y="156" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">trace, for this one subject —</text>
  <text x="360" y="172" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">reveals which branch decided</text>
</svg>

`Explanation` is a tree — `All`, `Any`, `Negated`, `Named`, `Owing`, `Table`,
and the leaf `Requirement` — not a string, because Qadi owns no prose
dialect. `renderExplanation` is the one place English gets assembled from it;
a caller wanting links, chips, or another language renders the tree
themselves.

```typescript
import { allOf, explain, hasPermission, hasRole, permission, renderExplanation } from "@qadi/core";

const canPublish = allOf([
  hasRole("editor"),
  hasPermission(permission("post", "publish"), { fields: ["id", "title"] }),
]);

const explanation = explain(canPublish);
const sentence = renderExplanation(explanation);
// "requires role `editor` and requires permission `post:publish`, exposing
//  only `id`, `title`" — computed with no subject at all.
```

Composite children render parenthesized rather than joined bare, because
`anyOf([a, allOf([b, c])])` and `allOf([anyOf([a, b]), c])` would otherwise
produce the same sentence while admitting different subjects — a rendering
that can't be mapped back to exactly one policy is worse than no rendering.

## Simplification: fewer nodes, same rule

```ts
export const simplify: (policy: Policy) => Policy;
```

`simplify` is an **opt-in** structural rewrite: it collapses a single-child
composite and flattens a composite nested directly inside one of the same
tag *and the same field strategy* — the structure that accumulates from
composing policies out of helper functions, and that carries no meaning of
its own.

<svg viewBox="0 0 620 170" width="100%" style="max-width: 620px" role="img" aria-label="Diagram: before and after simplify. Before: allOf containing a single-child allOf containing hasRole editor. After: allOf directly containing hasRole editor, two fewer nodes, same verdict and same field set.">
  <rect x="20" y="20" width="260" height="130" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="42" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" font-weight="500" style="letter-spacing:0.08em" fill="var(--sl-color-gray-3)">BEFORE</text>
  <rect x="40" y="52" width="220" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="150" y="69" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">allOf([ ... ])</text>
  <rect x="60" y="86" width="180" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="150" y="103" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">allOf([ ... ])</text>
  <rect x="80" y="120" width="140" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="150" y="137" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">hasRole("editor")</text>
  <path d="M 300 85 L 340 85" fill="none" stroke="var(--sl-color-accent)" stroke-width="1.5"/>
  <text x="320" y="76" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-accent-high)">simplify</text>
  <rect x="340" y="20" width="260" height="130" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="360" y="42" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" font-weight="500" style="letter-spacing:0.08em" fill="var(--sl-color-gray-3)">AFTER</text>
  <rect x="380" y="87" width="180" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="470" y="104" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">hasRole("editor")</text>
</svg>

```typescript
import { allOf, hasRole, simplify } from "@qadi/core";

const verbose = allOf([allOf([hasRole("editor")])]);
const tidy = simplify(verbose);
// { _tag: "HasRole", role: "editor" }
// — two fewer AllOf wrappers, same verdict, same field set, same obligations.
```

Two rewrites, deliberately, and nothing cleverer: an equal-strategy nested
composite gets flattened, and that's it. An `allOf`/`anyOf` nested under a
**different** field strategy is left alone — flattening it would still
preserve the verdict but change *which fields survive the merge*, and field
visibility is the reason this library exists. An **empty** `allOf`/`anyOf`
is also left alone: one always allows and the other never does, so
"simplifying" it away would replace it with a different policy, not a
smaller one.

`not(not(p))` is deliberately **not** rewritten to `p` here either — that's
double negation, and it's unsound at this level: a `Not` node carries no
field set and no obligations by design, so removing two of them can hand
back fields or obligations the original tree never exposed.

**Nothing in the library calls `simplify` automatically** — not `evaluate`,
not `check`, not `toPredicate`, not `explain`. A simplified policy produces a
*shallower trace* than the one an author actually wrote, so applying it
silently would make a denial's trace, and `explain`'s own rendering, describe
a policy nobody stored
([ADR-QD-030](https://github.com/leaderiop/qadi/blob/main/spec/decisions/030-policy-simplification.md)).
Reach for it only where the tree itself is the deliverable — building an
admin UI over a policy, say — not on the evaluation path.

For the full rewrite rules and the trace-shape argument in detail, see
[18 — Policy Explanation](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/18-explanation.md)
and
[20 — Simplification](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/20-simplification.md).
