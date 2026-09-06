---
title: Predicates
description: Compiling a policy into a filter over rows the caller hasn't loaded yet — and why a node that can't fold fails rather than being approximated.
---

`evaluate` answers a question about a resource **already in hand**: is this
one document readable? Row-level security needs a different question
answered first — "which of the ten thousand rows in this table should even
be fetched?" — and asking `evaluate` once per row to find out would mean
loading every row just to throw most of them away. `toPredicate` solves this
by compiling a `Policy` into a `Predicate`: an abstract row filter, with no
SQL and no database dependency, that a caller (or a companion package like
`@qadi/predicate-sql`) turns into a real query fragment.

A predicate answers **which rows**, never which columns — that split matters
enough that a policy carrying a `fields` restriction is refused outright by
`toPredicate` rather than silently ignoring the restriction, because a row
filter alone would let a caller select columns the policy meant to withhold.
Narrow the rows with a predicate, then judge the columns with `decide` and
`project` once you have the row in hand.

## Folding: a node that doesn't need the row

Some policy nodes ask about the *subject* — do they hold this role? this
permission? — and a subject doesn't change per row. Those nodes **fold**:
`toPredicate` reduces them to a constant (`True` or `False`) once, up front,
rather than carrying them into the compiled filter at all. Only nodes that
genuinely vary per row — a comparison against a resource's own column —
survive into the `Predicate` tree.

<svg viewBox="0 0 680 320" width="100%" style="max-width: 680px" role="img" aria-label="Diagram: a policy tree, AllOf of HasRole('editor') and HasResourceAttribute('status', eq 'published'), compiled by toPredicate. The HasRole node folds to a constant True and is dropped by and(), since it only asks about the subject. The HasResourceAttribute node survives as a Compare node and compiles into a SQL WHERE clause.">
  <defs>
    <marker id="pred-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
    <marker id="pred-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-accent)"/>
    </marker>
  </defs>
  <rect x="250" y="8" width="180" height="30" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="340" y="28" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">AllOf([...])</text>
  <line x1="300" y1="38" x2="110" y2="64" stroke="var(--sl-color-gray-3)"/>
  <line x1="380" y1="38" x2="530" y2="64" stroke="var(--sl-color-gray-3)"/>
  <rect x="20" y="64" width="180" height="32" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="110" y="84" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">HasRole("editor")</text>
  <rect x="400" y="64" width="260" height="32" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="530" y="84" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-white)">HasResourceAttribute("status", eq("published"))</text>
  <path d="M 110 96 L 300 128" fill="none" stroke="var(--sl-color-accent)" stroke-width="1" marker-end="url(#pred-arrow-accent)"/>
  <path d="M 530 96 L 380 128" fill="none" stroke="var(--sl-color-accent)" stroke-width="1" marker-end="url(#pred-arrow-accent)"/>
  <rect x="260" y="112" width="160" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-accent)"/>
  <text x="340" y="132" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-accent-high)">toPredicate()</text>
  <path d="M 300 142 L 170 168" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#pred-arrow)"/>
  <path d="M 380 142 L 520 168" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#pred-arrow)"/>
  <rect x="40" y="170" width="260" height="32" rx="6" fill="none" stroke="var(--sl-color-gray-4)" stroke-dasharray="4 3"/>
  <text x="170" y="190" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">True — folds (subject-only)</text>
  <rect x="380" y="170" width="280" height="32" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="520" y="190" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">Compare(status, Eq, "published")</text>
  <text x="170" y="218" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">dropped by and() — adds nothing to the row filter</text>
  <path d="M 520 202 L 460 248" fill="none" stroke="var(--sl-color-accent)" stroke-width="1" marker-end="url(#pred-arrow-accent)"/>
  <text x="320" y="246" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="9.5" fill="var(--sl-color-gray-3)">compileSql(predicate, "postgres") →</text>
  <rect x="320" y="252" width="280" height="46" rx="7" fill="oklch(0.13 0.012 260)" stroke="var(--sl-color-hairline)"/>
  <text x="460" y="280" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">WHERE status = 'published'</text>
</svg>

Roles, permissions, the action, and subject attributes all fold this way. A
relationship never can — `hasRelationship` is keyed by the resource's own
id, which is exactly the thing not yet loaded.

## The translatable subset

Not every `Policy` node has a predicate form, and `toPredicate` refuses
rather than approximates the ones that don't:

- **`hasRelationship`** — keyed by the row's id, can't fold, and has no
  column form either.
- **`hasCustom`** — opaque, externally-registered logic. There's nothing in
  the policy tree itself to translate.
- **`hasSignature`** — looked up through an external port, not a column any
  row carries.
- **`obliged`** — a predicate has no channel to carry a duty. Rows selected
  by one would be handed over with an obligation nobody was told about.
- **A `HasResourceAttribute` matcher with no predicate form** — `someMatch`,
  `everyMatch`, `contains`, and a few others have no column-comparison
  equivalent.
- **Any node restricting `fields`** — see the "which rows, never columns"
  rule above.

Each of these fails with `PolicyNotTranslatable` rather than being rendered
as `True`. That distinction is the entire reason this feature is safe to
ship: a node quietly treated as "always matches" would return rows the
original policy actually denies, silently — the one failure mode worse than
the feature not existing at all
([ADR-QD-024](https://github.com/leaderiop/qadi/blob/main/spec/decisions/024-predicate-output.md)).

## The reference interpreter

`evaluatePredicate(predicate, row)` is the executable semantics of a
`Predicate`, run against one plain object. It exists so a second interpreter
— a hand-written SQL or Prisma compiler — is checkable rather than merely
plausible: generate arbitrary rows, evaluate them both ways, and assert
agreement. That's what makes `evaluatePredicate` the thing a compiler is
*differential-tested against*, not just a convenience.

```typescript
import * as Effect from "effect/Effect";
import {
  AttributeResolverNone,
  allOf,
  currentSubjectLayer,
  eq,
  evaluatePredicate,
  fromRoles,
  hasResourceAttribute,
  hasRole,
  literal,
  toPredicate,
} from "@qadi/core";

const canSeePublished = allOf([
  hasRole("editor"),
  hasResourceAttribute("status", eq(literal("published"))),
]);

const compiled = toPredicate(canSeePublished).pipe(
  Effect.provide(currentSubjectLayer(fromRoles({ id: "u1", roles: [] }))),
  Effect.provide(AttributeResolverNone),
);
// Effect<Predicate, PolicyNotTranslatable | ..., DecisionHistory>
// → { _tag: "Compare", column: "status", op: "Eq", value: "published" }
// `hasRole("editor")` folded to True and was dropped — it never appears here.

const isPublished = evaluatePredicate(
  { _tag: "Compare", column: "status", op: "Eq", value: "published" },
  { id: "doc-1", status: "published" },
);
// → true — the same answer a compiled `WHERE status = 'published'` gives.
```

For the full translation rules, the rule-table cost of `FirstApplicable`
(it becomes O(n²) conjuncts, not O(n)), and how `@qadi/predicate-sql` and
`@qadi/predicate-prisma` build on this, see
[16 — Predicates](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/16-predicates.md).
