---
title: Enforcement
description: The line between calls that report a decision and calls that enforce it — and why an obligation can only be ignored on the reporting side.
---

Every entry point built on `evaluate` falls on one side of a single line:
**reporting versus enforcing**. A reporting call hands back an answer and runs
nothing else, leaving any obligation on an `Allow` for the caller to notice and
discharge themselves. An enforcing call either runs work or hands back data, so
it refuses to do that for an allow whose obligation nobody has discharged
([ADR-QD-019](https://github.com/leaderiop/qadi/blob/main/spec/decisions/019-obligations.md)).

## Which one to call

<svg viewBox="0 0 680 280" width="100%" style="max-width: 680px" role="img" aria-label="Diagram: evaluate produces a Decision, which splits into six calls across two groups. Report — decide, check — never throws; a denial is carried in the Decision and an allow's obligation is the caller's to discharge. Enforce — assert, enforce, enforceProjected, filter — fails with AccessDenied on a denial and the wrapped effect never runs; on an allow the obligation is already discharged.">
  <defs>
    <marker id="enf-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="200" y="8" width="280" height="34" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="340" y="30" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">evaluate() → Decision</text>
  <path d="M 280 42 L 160 68" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#enf-arrow)"/>
  <path d="M 400 42 L 520 68" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#enf-arrow)"/>
  <rect x="20" y="70" width="280" height="190" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">REPORT</text>
  <rect x="40" y="104" width="240" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="160" y="123" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">decide</text>
  <rect x="40" y="142" width="240" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="160" y="161" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">check</text>
  <line x1="40" y1="184" x2="280" y2="184" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="206" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.75 0.14 150)">On Allow → obligation is yours to discharge</text>
  <text x="40" y="228" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.65 0.16 25)">On Deny → carried in the Decision, never thrown</text>
  <rect x="380" y="70" width="280" height="190" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="400" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">ENFORCE</text>
  <rect x="400" y="104" width="110" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="455" y="122" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">assert</text>
  <rect x="520" y="104" width="110" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="575" y="122" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">enforce</text>
  <rect x="400" y="136" width="110" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="455" y="154" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">enforceProjected</text>
  <rect x="520" y="136" width="110" height="26" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="575" y="154" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">filter</text>
  <line x1="400" y1="184" x2="640" y2="184" stroke="var(--sl-color-hairline)"/>
  <text x="400" y="206" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.75 0.14 150)">On Allow → obligation already discharged for you</text>
  <text x="400" y="228" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.65 0.16 25)">On Deny → fails with AccessDenied; the effect never runs</text>
</svg>

| Call | Use when | Returns | On denial |
| ---- | -------- | ------- | --------- |
| `decide` | You need the full decision — trace, visible fields, obligations — to inspect, log, or hand off. | `Decision` (`Allow \| Deny`) | Carried in the `Decision`, never thrown |
| `check` | You need a plain yes/no, **and the policy carries no obligation**. | `boolean` | `false` |
| `assert` | You have no `Effect` to wrap — a standalone precondition before an otherwise-imperative block. | `void` | Fails with `AccessDenied` |
| `enforce` | You have one `Effect` to guard, and its result should pass through unchanged. | `A`, the wrapped effect's own result | Fails with `AccessDenied`; the wrapped effect never runs |
| `enforceProjected` | You have one `Effect` returning a record, and the caller on the other side should see only the fields the policy allows. | `Partial<A>` | Fails with `AccessDenied`; the wrapped effect never runs |
| `filter` | You have a list of items to authorize one at a time, each as the evaluation's resource, and want back only the allowed ones. | `ReadonlyArray<A>` | Denied items are dropped, not surfaced individually |

`decide` and `check` are the closest pair — both report, so the choice is just
how much of the decision you need. Reach for `decide` by default, and drop to
`check` only once you're sure the policy in question never carries an
obligation: a `boolean` has no room to represent one, so an obligation reached
through `check` is silently never discharged. `enforce` and `enforceProjected`
are the other close pair — identical enforcement behavior, differing only in
whether the wrapped effect's result is a record whose fields get filtered on
the way out.

```ts
import * as Effect from "effect/Effect";
import { enforce, enforceProjected, hasPermission, permission } from "@qadi/core";

const readDoc = permission("doc", "read");

declare const deleteDocument: (id: string) => Effect.Effect<void>;
declare const loadDocument: (
  id: string,
) => Effect.Effect<{ id: string; title: string; internalNotes: string }>;

// Denied: the deletion never starts.
const remove = deleteDocument("doc-1").pipe(enforce(hasPermission(readDoc)));

// Allowed: only the exposed fields come back.
const read = loadDocument("doc-1").pipe(
  enforceProjected(hasPermission(readDoc, { fields: ["id", "title"] })),
);
```

`filterStream` is `filter`'s streamed sibling — same per-item decision, a
`Stream` in and out instead of an array — worth reaching for only when the
collection itself is a stream or too large to hold in memory. `filter` stays
the default for a collection you already have in hand.

## A denial carries its trace, not just a sentence

```ts
export class AccessDenied extends Data.TaggedError("AccessDenied")<{
  readonly subjectId: SubjectId;
  readonly policyTag: string;
  readonly reason: string;
  readonly trace: Trace;
}> {}
```

`reason` is the denied decision's root-trace reason — a short summary that's
safe to put in a log line. `trace` is the full tree behind it, which is what
lets you answer "which branch actually refused?" without re-running the
evaluation through `decide` just to get visibility back. That's also the
disclosure line to keep in mind: a trace names every node's tag and reasoning,
so it belongs in a log or a thrown error, never in a response body —
`@qadi/http`'s `toResponse` returns an empty body for every enforcement error
for exactly this reason.

```ts
import * as Effect from "effect/Effect";
import { enforce, hasPermission, permission, renderTrace } from "@qadi/core";

declare const deleteDocument: (id: string) => Effect.Effect<void>;

const guarded = deleteDocument("doc-1").pipe(
  enforce(hasPermission(permission("doc", "delete"))),
  Effect.tapError((error) =>
    error._tag === "AccessDenied" ? Effect.logDebug(renderTrace(error.trace)) : Effect.void,
  ),
);
```

## Beyond the six

`guard` doesn't sit on the report/enforce line the six calls above are built
from. Rather than wrapping an existing `Effect`, `guard(permission, policy)(resource, handler)`
hands your handler an `Authorized<P>` witness that the check already succeeded,
as a value — useful when downstream code needs proof of authorization rather
than just an unblocked effect. See
[ADR-QD-035](https://github.com/leaderiop/qadi/blob/main/spec/decisions/035-witness-guard-primitive.md).

```typescript
import * as Effect from "effect/Effect";
import { guard, hasPermission, permission } from "@qadi/core";
import type { Authorized } from "@qadi/core";

const deleteDoc = permission("doc", "delete");
const canDelete = hasPermission(deleteDoc);

declare const deleteDocument: (id: string) => Effect.Effect<void>;

// `handler` cannot be called without a `guard` call site upstream having
// produced the witness — there is no other way to construct `Authorized<P>`.
const handler = (_authorized: Authorized<typeof deleteDoc>, doc: { readonly id: string }) =>
  deleteDocument(doc.id);

const removed = guard(deleteDoc, canDelete)({ id: "doc-1" }, handler);
// Effect<void, EnforcementError, EvaluationServices>
```

For the full requirements — field-projection edge cases, and why a guarded
resource can never be overridden by `EnforceOptions` — see
[07 — Enforcement](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/07-enforcement.md).
