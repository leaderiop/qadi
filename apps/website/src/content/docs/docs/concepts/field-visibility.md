---
title: Field Visibility
description: Why an absent field set means everything, not nothing — and how a composite policy merges what its children agree a subject may see.
---

Authorization in Qadi isn't just a yes/no gate — a policy can also say *which
fields* of an allowed record a subject may see. `hasPermission(perm, { fields:
["id", "title"] })` means "yes, and only these two fields." That set of
visible fields is projected onto the record by `enforceProjected`, so
authorization becomes a projection, not just a boolean.

The one rule that trips people up: **an absent field set means all fields**,
not none. If you don't say `fields`, the policy doesn't restrict visibility at
all — it's the top of a **lattice** (an ordering where every pair of field
sets has both a narrowest set that contains both and a widest set contained
in both), not the bottom. Reading an absent set as "nothing visible" would
silently invert the meaning of every unrestricted policy in the codebase.

<svg viewBox="0 0 460 260" width="100%" style="max-width: 460px" role="img" aria-label="Diagram: a field-visibility lattice with all fields (absent) at the top, narrower field sets in the middle, and the empty set at the bottom, connected by arrows pointing downward toward narrower visibility.">
  <defs>
    <marker id="fv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="100" y="10" width="260" height="34" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-accent)"/>
  <text x="230" y="32" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-accent-high)">⊤ — absent fields = everything</text>
  <path d="M 200 44 L 150 90" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#fv-arrow)"/>
  <path d="M 260 44 L 310 90" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#fv-arrow)"/>
  <rect x="40" y="92" width="160" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="120" y="111" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">{ id, title, body }</text>
  <rect x="260" y="92" width="160" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="340" y="111" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">{ id, title }</text>
  <path d="M 120 122 L 175 168" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#fv-arrow)"/>
  <path d="M 340 122 L 285 168" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#fv-arrow)"/>
  <rect x="150" y="170" width="160" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="230" y="189" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">{ id }</text>
  <path d="M 230 200 L 230 216" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#fv-arrow)"/>
  <rect x="100" y="218" width="260" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="oklch(0.65 0.16 25)"/>
  <text x="230" y="237" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="oklch(0.65 0.16 25)">⊥ — {} — a denial's projection</text>
</svg>

Every step down the lattice discloses less. `project(decision, record)` walks
this same idea at runtime: a `Deny` always projects to `{}`, and an
unrestricted `Allow` projects the whole record.

```typescript
import { hasPermission, permission, project } from "@qadi/core";
import type { Decision } from "@qadi/core";

const readTitleOnly = hasPermission(permission("doc", "read"), { fields: ["id", "title"] });

declare const decision: Decision;
declare const document: { readonly id: string; readonly title: string; readonly body: string };

const visible = project(decision, document);
// If `decision` allowed under `readTitleOnly`: { id: "...", title: "..." } — no `body`.
// If `decision` denied: {}
```

## How a composite policy merges field sets

`allOf`/`anyOf` don't just AND/OR their children's verdicts — they also have
to decide what the combined field set is when more than one child allows and
each names different fields. That's `fieldStrategy`, and it's a **required**
field on the schema rather than an optional one: the predecessor library left
it optional and never wrote it, so a policy that was stored and reloaded
silently reverted to the default, narrowing visibility on every round trip
with no error anywhere
([ADR-QD-006](https://github.com/leaderiop/qadi/blob/main/spec/decisions/006-field-strategy-always-encoded.md)).

<svg viewBox="0 0 620 200" width="100%" style="max-width: 620px" role="img" aria-label="Diagram: two allowing children with field sets id-title and id-body merged three ways — Intersection produces id only, Union produces id title body, First produces id title (the first child's set).">
  <text x="10" y="20" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-gray-2)">child A → { id, title }</text>
  <text x="10" y="38" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-gray-2)">child B → { id, body }</text>
  <line x1="0" y1="52" x2="620" y2="52" stroke="var(--sl-color-hairline)"/>
  <rect x="10" y="66" width="180" height="110" rx="8" fill="none" stroke="var(--sl-color-hairline-light)"/>
  <text x="100" y="86" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">Intersection</text>
  <text x="100" y="110" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">{ id }</text>
  <text x="100" y="150" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">least privilege —</text>
  <text x="100" y="164" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">default for allOf</text>
  <rect x="220" y="66" width="180" height="110" rx="8" fill="none" stroke="var(--sl-color-hairline-light)"/>
  <text x="310" y="86" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">Union</text>
  <text x="310" y="110" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">{ id, title, body }</text>
  <text x="310" y="150" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">observes every child —</text>
  <text x="310" y="164" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">no short-circuit</text>
  <rect x="430" y="66" width="180" height="110" rx="8" fill="none" stroke="var(--sl-color-hairline-light)"/>
  <text x="520" y="86" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" fill="var(--sl-color-accent-high)">First</text>
  <text x="520" y="110" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">{ id, title }</text>
  <text x="520" y="150" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">first allowing child —</text>
  <text x="520" y="164" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">default for anyOf, short-circuits</text>
</svg>

`Intersection` keeps only what every allowing child agrees on — the default
for `allOf`, and the least-privileged choice when two branches of a policy
each restrict differently. `Union` merges every allowing child's fields,
which is also the one case that forfeits short-circuiting: `evaluate` has to
keep going after the first allowing child of an `anyOf` just to collect the
rest of the fields, because narrowing would silently hide something a later
child would have shown. `First` — the default for `anyOf` — takes the first
allowing child's set and stops there, same as `anyOf` already does for the
verdict itself.

```typescript
import { allOf, eq, hasPermission, hasResourceAttribute, literal, permission } from "@qadi/core";

const readDoc = permission("doc", "read");

// Intersection (allOf's default): a reader only ever sees what both
// conditions independently agree they may show.
const restricted = allOf([
  hasPermission(readDoc, { fields: ["id", "title", "body"] }),
  hasResourceAttribute("status", eq(literal("published")), { fields: ["id", "title"] }),
]);
// An allow under `restricted` projects to { id, title } — never `body`.
```

For the encoding requirements and the `Union` short-circuit exception, see
[07 — Enforcement](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/07-enforcement.md)
and [INV-QD-004](https://github.com/leaderiop/qadi/blob/main/spec/invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top).
