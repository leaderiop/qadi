# @qadi/promise

A Promise-returning facade over [`@qadi/core`](https://www.npmjs.com/package/@qadi/core),
for callers who do not use Effect.

```sh
pnpm add @qadi/promise @qadi/core effect
```

## One rule, and it is the whole package

**No branch in it decides anything.** Every method forwards to the core
evaluator. A facade that only forwards cannot drift from the thing it wraps; one
that decides can, and the predecessor's second evaluation path destroyed
short-circuiting and left an entire API unreachable.

```ts
const qadi = makeQadi(runtime);

if (await qadi.check(policy, subject)) {
  // ...
}
```

## A denial resolves; a failure rejects

`try { check() } catch { return false }` is the natural Promise idiom and turns
an attribute-store outage into a silent lockout. So a **denial** is a resolved
`false`, and only a broken dependency rejects.

`assert` is the deliberate exception: there the caller has said "proceed only if
permitted", so a denial rejects too.

The subject travels per call rather than living in the layer, so one runtime
serves every user.

## License

MIT
