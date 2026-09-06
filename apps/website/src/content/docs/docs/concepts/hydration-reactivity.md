---
title: Hydration & Reactivity
description: How a server's decisions survive the trip to the browser, and why a decision being re-checked is treated as not decided at all.
---

`@qadi/react` answers every authorization question exactly once per policy,
shares that answer across every component asking it, and recomputes it only
when something that could change the answer actually happens — a login, an
invalidation, a grant revoked. That's a reactive graph, built on
`effect/unstable/reactivity`'s `Atom` rather than a bespoke React cache, and
it's what this page is about at the concept level. (For the hydration API's
full request/response shape — the `dehydrateDecisions`/`hydrateDecisions`
signatures, the mismatch-reporting contract — see
[Server-Render Hydration](../../packages/react/hydration/), the package-level
companion to this page.)

<svg viewBox="0 0 680 260" width="100%" style="max-width: 680px" role="img" aria-label="Diagram: the server evaluates a policy and dehydrates the decision into a payload bound to a subject id. The client hydrates it into its atom registry as a first-paint seed. The seed is soon replaced by the client's own re-check, which passes through a waiting state treated as not decided before settling into its own Allow or Deny.">
  <defs>
    <marker id="hr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <text x="105" y="16" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" style="letter-spacing:0.08em" fill="var(--sl-color-gray-3)">SERVER</text>
  <rect x="10" y="22" width="190" height="30" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="105" y="41" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">evaluate() → Decision</text>
  <path d="M 105 52 L 105 66" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#hr-arrow)"/>
  <rect x="10" y="66" width="190" height="30" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="105" y="85" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">dehydrateDecisions()</text>
  <line x1="235" y1="0" x2="235" y2="260" stroke="var(--sl-color-hairline)" stroke-dasharray="4 4"/>
  <text x="235" y="130" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="9" fill="var(--sl-color-gray-3)" transform="rotate(90 235 130)">network — bound to subject id</text>
  <path d="M 200 81 L 300 60" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#hr-arrow)"/>
  <text x="270" y="16" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" style="letter-spacing:0.08em" fill="var(--sl-color-gray-3)">CLIENT</text>
  <rect x="270" y="22" width="200" height="30" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="370" y="41" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">hydrateDecisions()</text>
  <path d="M 370 52 L 370 74" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#hr-arrow)"/>
  <rect x="200" y="74" width="320" height="166" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="220" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">ATOM REGISTRY (one per QadiProvider)</text>
  <rect x="220" y="112" width="90" height="30" rx="6" fill="none" stroke="oklch(0.75 0.14 150)"/>
  <text x="265" y="131" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="oklch(0.75 0.14 150)">seed: Allow</text>
  <path d="M 310 127 L 335 127" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#hr-arrow)"/>
  <rect x="335" y="112" width="90" height="30" rx="6" fill="none" stroke="var(--sl-color-hairline-light)"/>
  <text x="380" y="131" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">waiting…</text>
  <text x="380" y="158" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="9" fill="var(--sl-color-gray-3)">= not decided,</text>
  <text x="380" y="170" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="9" fill="var(--sl-color-gray-3)">even while holding the seed</text>
  <path d="M 400 142 L 440 198" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#hr-arrow)"/>
  <path d="M 400 142 L 480 198" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#hr-arrow)"/>
  <rect x="400" y="200" width="70" height="26" rx="6" fill="none" stroke="oklch(0.75 0.14 150)"/>
  <text x="435" y="217" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="oklch(0.75 0.14 150)">Allow</text>
  <rect x="480" y="200" width="70" height="26" rx="6" fill="none" stroke="oklch(0.65 0.16 25)"/>
  <text x="515" y="217" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="oklch(0.65 0.16 25)">Deny</text>
  <text x="465" y="240" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="9" fill="var(--sl-color-gray-3)">the client's own answer — read from here on</text>
</svg>

## Atom, atom registry: one evaluation per question, not per component

`@qadi/react` builds one `Atom` per distinct authorization question —
`makeQadiAtoms`'s `decision(policy)` and `decisionFor(policy, resource)`.
`Atom.family` keys structurally, so ten components in different parts of the
tree asking the identical question share one evaluation rather than each
running its own. The **atom registry** — one per `QadiProvider` — is what
computes those atom values, tracks their dependencies, and disposes them once
nothing is watching; because each provider owns its own registry, two
authorization contexts in the same page are structurally unable to see each
other's decisions.

```typescript
import { currentDecision, makeQadiAtoms } from "@qadi/react";
import type { QadiLayer } from "@qadi/react";
import { hasPermission, permission } from "@qadi/core";

declare const qadiLayer: QadiLayer;

const atoms = makeQadiAtoms(qadiLayer, {
  onHydrationMismatch: (mismatch) => {
    // Runs at most once per question, the first time the client's own
    // answer disagrees with a hydrated seed — see below.
    console.warn("server/client disagreed on", mismatch.policy);
  },
});

const canReadDoc = hasPermission(permission("doc", "read"));
const decisionAtom = atoms.decision(canReadDoc);
// `currentDecision(result)` reads back `undefined` whenever `result.waiting`
// is true — even though `result` may still be a `Success` carrying last
// decision's value underneath.
```

## Waiting is not a decision

An `AsyncResult` that's re-checking carries a `waiting` flag, and the value
it's waiting to replace can still be a `Success` — for most cached data
that's stale-while-revalidate, a feature. For authorization it's an
over-permission: the subject may have just signed out, had a grant revoked,
or been swapped for a different subject whose decision is still in flight.
Every convenience API in this package reads a waiting result as **not
decided**, full stop — `currentDecision` returns `undefined`, not the stale
value. See [ADR-QD-017](https://github.com/leaderiop/qadi/blob/main/spec/decisions/017-stale-decisions-are-not-decisions.md).

**Invalidation** is what puts a decision into `waiting` on purpose: writing
to `atoms.invalidate` discards every held decision and re-evaluates the
mounted ones. It exists because authority changes independently of
identity — a role granted server-side leaves the same subject id holding
different powers, and nothing in the atom graph notices that on its own.

## Hydration is a seed, not an authority

A server-rendered page has already answered every policy that needed no
resolver, by the time `renderToString` finishes. `dehydrateDecisions` and
`hydrateDecisions` carry that answer to the client so the first paint shows
it directly instead of a `pending` flash — but the seed is a **first-paint
cover**, read only until the client produces its own answer, never again
after. That's the same discipline as the waiting rule above, applied to the
server's answer specifically: the server decided earlier, with its own
resolvers, about a subject whose grants may already have changed. A payload
is bound to a subject id and refused whole on a mismatch, and it carries no
trace by default — a trace names a policy's internal structure and which
branch a specific subject failed, which doesn't belong on the wire unasked.

```ts
// Server: collect every decision made during renderToString, ship them down.
const payload = dehydrateDecisions(serverEntries);

// Client: seed the atom registry before first paint.
const initialValues = hydrateDecisions(atoms, payload, clientSubject);
// → passed directly as <QadiProvider initialValues={initialValues}>
```

See the full request/response contract, the mismatch-reporting rules, and
what gets dropped and why, in
[Server-Render Hydration](../../packages/react/hydration/). The underlying
spec: [ADR-QD-028](https://github.com/leaderiop/qadi/blob/main/spec/decisions/028-decision-hydration.md),
[ADR-QD-014](https://github.com/leaderiop/qadi/blob/main/spec/decisions/014-react-via-atoms.md),
[9 — React](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/09-react.md), and
[19 — Hydration](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/19-hydration.md).
