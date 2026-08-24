# @qadi/core

Effect-native authorization. Permission tokens, a role DAG, a schema-derived
policy ADT, and an evaluator that returns a full trace for every decision.

```sh
pnpm add @qadi/core effect
```

## The shape of it

A policy is a value. Evaluating one is an `Effect`, so its dependencies are
`Layer`s and its result is a `Decision` carrying the tree of nodes that produced
it.

```ts
import * as Effect from "effect/Effect";
import { currentSubjectLayer, decide, hasPermission, makeSubject, permission } from "@qadi/core";

const read = permission("doc", "read");
const policy = hasPermission(read);

const program = Effect.gen(function* () {
  const decision = yield* decide(policy);
  return decision._tag; // "Allow" | "Deny"
}).pipe(Effect.provide(currentSubjectLayer(makeSubject({ id: "u1", permissions: ["doc:read"] }))));
```

## Three ideas worth knowing before you wire it

**Failure is not denial.** A broken attribute lookup raises; it never returns
"not authorized". Reporting an outage as a denial sends an engineer to audit
permissions instead of the backend, so the two are kept in different channels
throughout.

**Defaults fail closed.** An unwired resolver denies. A missing subject holds
nothing. A wiring omission shows up as denials in testing rather than as a
silent grant in production.

**A denial explains itself.** Every decision carries a `Trace`, and `explain`
turns a policy into prose. `renderTrace` renders what actually happened to one
subject; `explain` describes what the rule requires, of anyone.

## Enforcing

`decide` and `check` **report** — they hand back an answer and run nothing.
`assert`, `enforce`, `enforceProjected` and `filter` **enforce** — each either
runs work or hands over data, so each refuses an allow whose obligation nobody
discharged.

```ts
import * as Effect from "effect/Effect";
import { enforce, hasPermission, permission } from "@qadi/core";

const publish = hasPermission(permission("doc", "publish"));

// The guarded effect does not run when the policy denies.
const guarded = enforce(publish)(Effect.succeed("published"));
```

## Documentation

The specification in [`spec/`](https://github.com/leaderiop/qadi/tree/main/spec)
is normative, and every TypeScript example in it is compiled by the merge gate.
Start with [`spec/overview.md`](https://github.com/leaderiop/qadi/blob/main/spec/overview.md).

## License

MIT
