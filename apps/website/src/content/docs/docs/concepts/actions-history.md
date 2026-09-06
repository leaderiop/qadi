---
title: Actions & History
description: hasAction reads the verb of the current call; hasActed/hasNotActed read what a subject has done before, through a three-valued history port that keeps both checks fail-closed.
---

Two different questions get confused because they share a word. A
**permission** is a grant the subject holds — `doc:write` means *may write*.
An **action** is a property of the call happening right now — an action of
`"write"` means *is writing*. `hasAction` asks the second question, never the
first, and a policy that needs both writes both.

A third question is different again: not what's happening now, but what
already happened. `hasActed`/`hasNotActed` ask that, by reading a
`DecisionHistory` port your application wires — Qadi never stores history
itself.

## `hasAction` — the verb of this call

```ts
export const hasAction: (action: string, options?: FieldOptions) => Policy;
```

The action rides into evaluation as a request-scoped input, alongside the
resource, and it reaches every node of the tree unchanged — a rule nested
three `allOf`s deep reads the same verb the root does. Bell–LaPadula (a
classic security model: no reading up, no writing down) has two rules that
become one stored policy this way, with the verb selecting which comparison
applies:

```typescript
import { allOf, anyOf, gte, hasAction, hasResourceAttribute, lt, type Policy } from "@qadi/core";

const starProperty: Policy = anyOf([
  // read down: no higher than the subject's clearance
  allOf([hasAction("read"), hasResourceAttribute("level", lt(3))]),
  // write up: no lower, so information cannot be declassified by copying
  allOf([hasAction("write"), hasResourceAttribute("level", gte(3))]),
]);
```

An evaluation that reads the action while none was supplied fails with
`MissingAction` rather than denying — the same "a forgotten argument is a
wiring error, not a decision" rule `MissingResource` already follows.

## `hasActed` / `hasNotActed` — what the subject already did

```ts
export const hasActed: (event: string, options?: HistoryOptions) => Policy;
export const hasNotActed: (event: string, options?: HistoryOptions) => Policy;
```

Both read through one port, `DecisionHistory.hasActed`, which answers a
`(subjectId, event, resourceId?)` query with **three** values, not two:

<svg viewBox="0 0 520 260" width="100%" style="max-width: 520px" role="img" aria-label="Diagram: a grid showing how hasActed and hasNotActed each resolve against the three answers a DecisionHistory port can give. Acted: hasActed allows, hasNotActed denies. NotActed: hasActed denies, hasNotActed allows. Unknown, marked with a gold border: both hasActed and hasNotActed deny — the reason the port needs a third value instead of a boolean.">
  <text x="270" y="24" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="11" fill="var(--sl-color-gray-3)">DecisionHistory answers with:</text>
  <text x="195" y="46" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">"Acted"</text>
  <text x="315" y="46" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">"NotActed"</text>
  <text x="435" y="46" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">"Unknown"</text>
  <text x="10" y="98" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-gray-2)">hasActed(e)</text>
  <rect x="140" y="70" width="110" height="56" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="195" y="103" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="oklch(0.75 0.14 150)">Allow</text>
  <rect x="260" y="70" width="110" height="56" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="315" y="103" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="oklch(0.65 0.16 25)">Deny</text>
  <rect x="380" y="70" width="110" height="56" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--qadi-seal-gold)" stroke-width="2"/>
  <text x="435" y="103" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="oklch(0.65 0.16 25)">Deny</text>
  <text x="10" y="168" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-gray-2)">hasNotActed(e)</text>
  <rect x="140" y="140" width="110" height="56" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="195" y="173" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="oklch(0.65 0.16 25)">Deny</text>
  <rect x="260" y="140" width="110" height="56" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="315" y="173" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="oklch(0.75 0.14 150)">Allow</text>
  <rect x="380" y="140" width="110" height="56" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--qadi-seal-gold)" stroke-width="2"/>
  <text x="435" y="173" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="oklch(0.65 0.16 25)">Deny</text>
  <text x="270" y="220" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">"Unknown" — an unwired port's default — denies both polarities.</text>
  <text x="270" y="238" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">A boolean port can't do that: a false-answering default grants hasNotActed.</text>
</svg>

That third value is why `hasNotActed` is its own variant rather than
`not(hasActed(e))`. `not` inverts a decision — so under `"Unknown"`, where
`hasActed` denies, `not(hasActed(e))` would **allow**, from a port nobody
wired. `hasNotActed` denies instead. This is the one rule in the spec that's
a security property rather than a modelling preference, which is why it's a
distinct policy variant and not a derived one — a comment doesn't hold it,
the schema does.

`scope` picks the question's breadth: `"Resource"` (the default) asks about
this subject, this event, *this resource*; `"Any"` asks *ever*. Brewer–Nash
Chinese Wall (a conflict-of-interest model: once you've touched one company
in a class, you're walled off from its rivals) is two calls against this one
port — no bespoke conflict-class type needed:

```typescript
import { anyOf, hasActed, hasNotActed, type Policy } from "@qadi/core";

// The conflict class names the event; the resource in hand is the company.
const withinWall = (conflictClass: string): Policy =>
  anyOf([
    // a free first access: no engagement anywhere in this class
    hasNotActed(conflictClass, { scope: "Any" }),
    // or an engagement with this very company
    hasActed(conflictClass, { scope: "Resource" }),
  ]);
```

The first branch has to be `hasNotActed`, never `not(hasActed(…))` — with no
store wired, the negated form would grant access to every company in the
class, which is exactly what Chinese Wall forbids.

A store that **is** wired but unreachable fails with
`DecisionHistoryUnavailable` rather than answering `"Unknown"` — an outage is
a failure, never a denial, the same split every resolver in this library
draws between absent information and a broken lookup.

For the full requirement set — `MissingResourceId` on a resource-scoped query
with no resource id, the observability span attribute, and the closed-world
semantics of the in-memory test layer — see
[10 — The Action Dimension](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/10-actions.md)
and
[12 — Decision History](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/12-history.md).
