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
const qadi = makeQadi(layer);

if (await qadi.check(subject, policy)) {
  // ...
}
```

`layer` is an Effect `Layer` supplying `@qadi/core`'s evaluation ports
(`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `EvaluationId`,
`CustomPredicate`, `SignatureHistory`) — real Effect knowledge this facade
otherwise lets you skip. For a first check against a policy with no external
lookups, `@qadi/core` exports `EvaluationServicesNone`, a ready-made layer
wiring every port to its fail-closed default:

```ts
import { EvaluationServicesNone } from "@qadi/core";

const qadi = makeQadi(EvaluationServicesNone);
```

Once a policy needs a real port — `hasAttribute`, say — replace just that one
with `Layer.mergeAll`, keeping every other port on its fail-closed default:

```ts
import * as Layer from "effect/Layer";
import { AttributeResolver, EvaluationServicesNone } from "@qadi/core";

const qadi = makeQadi(
  Layer.mergeAll(
    EvaluationServicesNone,
    Layer.succeed(AttributeResolver, { resolve: (id, attribute) => /* ... */ }),
  ),
);
```

## This facade cannot discharge a binding obligation

There is no `onObligations` anywhere on this package — every method here takes
the plain `EvaluateOptions`, never `@qadi/core`'s `EnforceOptions` that adds a
handler. That is a hard ceiling, not an oversight: every knob added to this
facade is a second decision path waiting to rot, and an obligation handler is
exactly that kind of knob. The consequence differs by method:

- `check` resolves `true` for an allow carrying a binding obligation, **with
  the obligation silently undischarged** — a boolean has no room to say
  "permitted, but something was owed and nothing paid it."
- `assert` and `filter` reject with `UndischargedObligation` instead, the same
  as `@qadi/core`'s own `assert`/`filter` do with no handler supplied.
- An obligation that is purely advisory never blocks either way.

If your policies carry obligations you intend to discharge, use `@qadi/core`
directly and supply `onObligations`; this facade cannot reach that path.

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
