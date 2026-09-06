---
title: Witness & Guard
description: Authorized<P> as a compile-time proof a check succeeded, and guard as the only combinator that can produce one.
---

Every other enforcing call ([`enforce`, `enforceProjected`, `filter` — see
Enforcement](/docs/concepts/enforcement/)) wraps an `Effect` and either runs
it or doesn't. `guard` is different: instead of
wrapping an effect, it hands your handler a **value** proving the check
already succeeded, called a witness. That value is `Authorized<P>`, and the
only way to get one is to go through `guard` first.

## The witness is not a boolean

```ts
export type Authorized<P extends Permission> = Brand.Branded<
  { readonly permission: P },
  "Authorized"
>;
```

`Authorized<P>` carries the exact permission it was checked for as a **real
field**, not a phantom type parameter — which is what makes it a stronger
guarantee than a `boolean` or a discarded `Decision`. A `boolean` says "a
check happened, at some point, for something" once it's a few lines from the
call site; `Authorized<typeof deletePermission>` and `Authorized<typeof
readPermission>` are structurally different types, so a witness for one
permission is not assignable where a different permission's witness is
required. A function that types its parameter as `Authorized<typeof
deletePermission>` literally cannot compile against a witness produced for
`read` — the compiler enforces it, not a code reviewer.

## `guard`: the only way to produce one

```ts
export const guard: <P extends Permission, EO = never, RO = never>(
  permission: P,
  policy: Policy,
  options?: EnforceOptions<EO, RO>,
) => <A extends Resource, B, E, R>(
  resource: A,
  handler: (authorized: Authorized<P>, resource: A) => Effect.Effect<B, E, R>,
) => Effect.Effect<B, E | EnforcementError | EO, R | EvaluationServices | RO>;
```

`guard(permission, policy)(resource, handler)` evaluates `policy` against
`resource`, and only if it allows does it call `handler` — with a freshly
constructed `Authorized<P>` as the first argument. There's no exported way to
build one any other way: no public constructor, no way to fabricate a
witness by hand. If `handler` typechecks, a `guard` call site upstream is the
reason.

<svg viewBox="0 0 660 200" width="100%" style="max-width: 660px" role="img" aria-label="Diagram: a handler requiring Authorized of the delete permission cannot be called with no witness in scope. A guard call evaluates the policy; on allow it produces the witness value; only then does the handler typecheck and run.">
  <defs>
    <marker id="wg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="20" y="20" width="200" height="50" rx="8" fill="none" stroke="var(--sl-color-hairline-light)"/>
  <text x="120" y="42" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-2)">no witness in scope</text>
  <text x="120" y="58" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">handler(?) — won't compile</text>
  <path d="M 220 90 L 260 90" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#wg-arrow)"/>
  <rect x="20" y="100" width="200" height="50" rx="8" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-accent)"/>
  <text x="120" y="122" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">guard(perm, policy)</text>
  <text x="120" y="138" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">evaluates against resource</text>
  <path d="M 260 90 L 400 90" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#wg-arrow)"/>
  <path d="M 260 125 L 400 125" fill="none" stroke="var(--sl-color-accent)" marker-end="url(#wg-arrow)"/>
  <rect x="440" y="20" width="200" height="50" rx="8" fill="none" stroke="oklch(0.65 0.16 25)"/>
  <text x="540" y="42" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="oklch(0.65 0.16 25)">Deny</text>
  <text x="540" y="58" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">handler never called</text>
  <rect x="440" y="100" width="200" height="50" rx="8" fill="oklch(0.19 0.014 260)" stroke="oklch(0.75 0.14 150)"/>
  <text x="540" y="122" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="oklch(0.75 0.14 150)">Allow → Authorized&lt;P&gt;</text>
  <text x="540" y="138" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">handler(witness, resource) runs</text>
</svg>

```typescript
import * as Effect from "effect/Effect";
import { guard, hasPermission, permission } from "@qadi/core";
import type { Authorized } from "@qadi/core";

const deleteDoc = permission("doc", "delete");
const canDelete = hasPermission(deleteDoc);

declare const deleteDocument: (id: string) => Effect.Effect<void>;
declare const notifyDeleted: (id: string) => Effect.Effect<void>;

// The parameter type is the proof requirement: this function cannot be
// called with anything except a witness for exactly `deleteDoc`.
const handleDeletion = (
  _authorized: Authorized<typeof deleteDoc>,
  doc: { readonly id: string },
) => Effect.andThen(deleteDocument(doc.id), notifyDeleted(doc.id));

const deletion = guard(deleteDoc, canDelete)({ id: "doc-1" }, handleDeletion);
// Effect<void, EnforcementError, EvaluationServices>
```

Try passing `handleDeletion` anywhere that hasn't gone through
`guard(deleteDoc, ...)` first — there's no other value of type
`Authorized<typeof deleteDoc>` to hand it. That's the guarantee `enforce`
alone can't express: `enforce(policy)(effect)` proves the check happened at
*that call site*, but nothing stops a differently-typed effect from being
substituted in later. A handler parameter typed to require a witness closes
that gap at the type level.

## Why not just `enforce`?

`guard` is built on `enforce` — it shares the same obligation-discharge and
denial handling, not a second enforcement path — but it's shaped
differently on purpose. `enforce` wraps an *existing* `Effect` and hands back
its result unchanged; `guard` takes a *resource* and a *handler function*,
because the witness has to go somewhere once the check succeeds, and a
already-constructed `Effect` has nowhere to receive it. Reach for `guard`
specifically when downstream code should be **unable to compile** without
proof of authorization, not merely unable to *run* without it — a
distinction that matters most for a handler shared across several call
sites, some of which might otherwise forget to guard it.

See [ADR-QD-035](https://github.com/leaderiop/qadi/blob/main/spec/decisions/035-witness-guard-primitive.md)
for the full rationale, including why a per-permission `Context.Service`
registry was tried first and rejected (it needed an unsound cast at
retrieval), and [Enforcement](/docs/concepts/enforcement/) for where `guard`
sits relative to the six report/enforce calls.
