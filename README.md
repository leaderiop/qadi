# Guard

Effect-native authorization for TypeScript. Permission tokens, a role DAG, a
schema-derived policy ADT, and a single `Effect`-returning evaluator.

> **Status: Phase 0 — scaffold.** The API is being designed in [`spec/`](./spec/)
> before implementation. Nothing here is stable yet.

## Why

Guard is a ground-up rewrite of an earlier `Result`-based authorization library.
The rewrite exists to remove a class of defect structurally rather than by
discipline. In the previous implementation:

- the policy serializer and the policy type were maintained by hand and drifted,
  silently narrowing field-level visibility on a JSON round-trip;
- an async relationship-resolver API was declared and never called;
- async evaluation resolved every attribute up front, destroying short-circuiting;
- one error code was assigned to two unrelated failures.

Each of those is a consequence of maintaining two representations of one thing.
Here the policy union is defined **once** as an Effect `Schema` and both the
TypeScript type and the JSON codec are derived from it, so they cannot diverge.

## Packages

| Package | Description |
| ------- | ----------- |
| `@guard/core` | Tokens, policy ADT, evaluator, enforcement |
| `@guard/testing` | Test layers, fixtures, conformance suites, matchers |
| `@guard/react` | `GuardProvider`, hooks, `Can`/`Cannot` |
| `@guard/features` | Cucumber BDD acceptance tests (private) |

## Development

```bash
pnpm install
pnpm typecheck     # tsc -b across project references
pnpm test          # vitest
pnpm coverage      # thresholds enforced: 90% workspace, 95% core
pnpm lint          # oxlint + house-style checks
pnpm check         # everything, as CI runs it
```

Conventions are in [`AGENTS.md`](./AGENTS.md) and are enforced, not merely
documented: `scripts/check-house-style.mjs` fails the build on `async`/`await`,
raw `Promise`, barrel `effect` imports, type assertions, and ambient
clock/UUID access in production source.

`packages/core/test/v4-api-smoke.test.ts` is a canary pinning the Effect v4 APIs
the design depends on. Effect v4 is in beta; if a bump renames something, that
test fails first.

## License

MIT
