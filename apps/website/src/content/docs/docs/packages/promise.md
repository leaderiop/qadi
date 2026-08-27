---
title: "@qadi/promise"
description: A Promise-returning facade over @qadi/core for callers who do not use Effect — every method forwards to the core evaluator, no second decision path.
---

`@qadi/promise` is a Promise-returning facade over
[`@qadi/core`](/docs/packages/core/), for callers who do not use Effect.

```sh
pnpm add @qadi/promise @qadi/core effect
```

## One rule, and it is the whole package

**No branch in it decides anything.** Every method is
`runtime.runPromise(coreFunction(...))` and nothing else. A facade that only
forwards cannot drift from the thing it wraps; one that decides can — the
predecessor library shipped a second, undertested evaluation path that
destroyed short-circuiting and left an entire async API unreachable. That
history is why this package carries exactly one rule instead of a feature
list.

```ts
import { makeQadi } from "@qadi/promise";

const qadi = makeQadi(layer);

if (await qadi.check(subject, policy)) {
  // ...
}
```

## A denial resolves; a failure rejects

`try { check() } catch { return false }` is the natural Promise idiom, and it
is exactly the shape that turns an attribute-store outage into a silent
lockout. So a **denial** is a resolved value, and only a broken dependency
rejects:

| Outcome | JavaScript |
| ------- | ---------- |
| Allowed | `check` resolves `true`; `decide` resolves an `Allow` |
| **Denied** | `check` resolves **`false`**; `decide` resolves a `Deny` |
| Resolver down, missing action, policy too deep | the promise **rejects** |

`assert` is the deliberate exception: there the caller has said "proceed only
if permitted," so a denial rejects too, with the same `AccessDenied` the
Effect API fails with.

## The subject travels per call

`CurrentSubject` is not part of the layer this facade takes — the subject is
passed to every call instead:

```ts
await qadi.check(subject, policy, options);
```

That keeps one runtime usable across every user of a server process: a login
never rebuilds the attribute resolver, and a long-lived runtime never ends up
holding one subject as ambient state.

## License

MIT
