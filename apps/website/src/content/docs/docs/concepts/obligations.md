---
title: Obligations
description: Permit, provided the access is logged — the duty fields can't express, and why an enforcing call refuses an allow nobody has discharged.
---

`fields` restricts what a subject sees. It has no way to say "permit, but
only if you also do this" — log the access, notify an owner, capture a
reason. That's a different kind of condition: not a restriction on what comes
back, but a duty the caller owes *in exchange for* the permit. That's an
**obligation**.

```ts
export const Obligation = Schema.Struct({
  id: Schema.String,
  attributes: Schema.Record(Schema.String, Schema.Unknown),
  advisory: Schema.Boolean,
});
```

`obliged(obligation, policy)` attaches one to a policy. The obligation only
reaches the decision when the wrapped policy actually **allows** — a denied
`obliged` policy carries no duty, because there's nothing being permitted in
exchange for it.

```typescript
import { hasPermission, obligation, obliged, permission } from "@qadi/core";

const readSensitiveDoc = obliged(
  obligation("log-access", { reason: "compliance-review" }),
  hasPermission(permission("doc", "read")),
);
// An allow under readSensitiveDoc carries one obligation with id "log-access".
```

## Advisory versus binding

`advisory` (default `false`) is the one bit that changes what happens next.
An advisory obligation is XACML's *advice* (XACML is an older, XML-based
policy language this vocabulary borrows from) — the caller may ignore it and
the enforcement machinery never blocks on it. A **binding** obligation (the
default) is different: `Qadi.enforce` and its siblings refuse to proceed past
an allow carrying one that nobody discharged.

<svg viewBox="0 0 640 260" width="100%" style="max-width: 640px" role="img" aria-label="Diagram: an Allow decision carrying a binding obligation. With an onObligations handler supplied, the handler runs and discharges it, then the guarded effect proceeds. Without a handler, an enforcing call fails with UndischargedObligation before the guarded effect ever runs.">
  <rect x="240" y="10" width="160" height="34" rx="7" fill="oklch(0.19 0.014 260)" stroke="oklch(0.75 0.14 150)"/>
  <text x="320" y="32" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="oklch(0.75 0.14 150)">Allow + obligation</text>
  <defs>
    <marker id="ob-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <path d="M 280 44 L 160 70" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ob-arrow)"/>
  <path d="M 360 44 L 480 70" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ob-arrow)"/>
  <text x="160" y="66" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">onObligations supplied</text>
  <text x="480" y="66" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">no handler supplied</text>
  <rect x="70" y="76" width="180" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="160" y="95" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">handler(obligations)</text>
  <path d="M 160 106 L 160 128" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ob-arrow)"/>
  <rect x="70" y="130" width="180" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="oklch(0.75 0.14 150)"/>
  <text x="160" y="149" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="oklch(0.75 0.14 150)">discharged</text>
  <path d="M 160 160 L 160 182" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ob-arrow)"/>
  <rect x="60" y="184" width="200" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="160" y="203" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">guarded effect runs</text>
  <rect x="390" y="76" width="180" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="480" y="95" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">UndischargedObligation</text>
  <path d="M 480 106 L 480 128" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#ob-arrow)"/>
  <rect x="390" y="130" width="180" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="480" y="149" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">effect never runs</text>
</svg>

The handler runs **before** the guarded effect, on purpose: an obligation is
a condition on the permission, not a follow-up to it, so if discharging it
fails, the protected work must never start.

```typescript
import * as Effect from "effect/Effect";
import { enforce, hasPermission, obligation, obliged, permission } from "@qadi/core";
import type { Obligation } from "@qadi/core";

const readDoc = permission("doc", "read");
const readWithAudit = obliged(obligation("log-access"), hasPermission(readDoc));

declare const loadDocument: (id: string) => Effect.Effect<{ id: string; title: string }>;
declare const auditLog: (obligations: ReadonlyArray<Obligation>) => Effect.Effect<void>;

const read = loadDocument("doc-1").pipe(
  enforce(readWithAudit, { onObligations: auditLog }),
);
// Without `onObligations`, this same call fails with UndischargedObligation
// instead of running `loadDocument` — the obligation is binding by default.
```

## Reporting calls don't discharge anything

`decide` and `check` never run a handler — they report the `Decision` as-is,
obligations included, and leave discharging them to the caller. That's the
whole reporting/enforcing split
([Enforcement](./enforcement/)): a reporting call has nowhere to run a
handler, so a binding obligation reached through `decide` is simply data on
the `Allow` until an enforcing call (or the caller's own code) discharges it.
`check`'s `boolean` return makes this sharper — there's no room in a boolean
to represent an obligation at all, so one reached through `check` is silently
never discharged, which is exactly why `check` is the fallback rather than
the default.

For the full combination rules — how obligations merge across `allOf`'s
children (union, never intersection — narrowing here would be a quiet grant,
not a restriction) and how `not` interacts with an obliged policy — see
[11 — Obligations](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/11-obligations.md)
and
[ADR-QD-019](https://github.com/leaderiop/qadi/blob/main/spec/decisions/019-obligations.md).
