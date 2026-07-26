# Qadi

Effect-native authorization for TypeScript. Permission tokens, a role DAG, a
schema-derived policy ADT, and a single `Effect`-returning evaluator.

> **Status: feature-complete, unpublished.** Every item the
> [roadmap](./spec/roadmap.md) committed to has shipped, and every access-control
> model in the [adoption matrix](./spec/models/00-adoption-matrix.md) is either
> adopted or explicitly declined. The version is still `0.0.0` and nothing is on
> npm, so the API may still move.

## Why

Qadi is a ground-up rewrite of an earlier `Result`-based authorization library.
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
| `@qadi/core` | Tokens, policy ADT, evaluator, enforcement |
| `@qadi/testing` | Test layers, fixtures, conformance suites, matchers |
| `@qadi/react` | `QadiProvider`, hooks, `Can`/`Cannot`, server-render hydration |
| `@qadi/promise` | A Promise facade for callers who do not use Effect |
| `@qadi/features` | Cucumber BDD acceptance tests (private) |

## Development

```bash
pnpm install
pnpm typecheck     # tsc -b across project references
pnpm test          # vitest
pnpm coverage      # thresholds enforced: 90% workspace, 95% core
pnpm lint          # oxlint + house-style checks
pnpm test:bdd      # Cucumber acceptance scenarios
pnpm spec:examples # compile every runnable example in spec/
pnpm spec:verify:strict  # specification internal consistency
pnpm spec:api      # the documented API surface matches the real one
pnpm mutation      # Stryker, breaking below 80% on packages/core
pnpm check         # all ten gates, in order
```

`pnpm check` is the merge gate, and [CI](./.github/workflows/check.yml) runs that
one command — not its own list of steps, so the two cannot drift apart. Every number
in the specification up to CCR-QD-035 was produced by a person running it by hand.

Conventions are in [`AGENTS.md`](./AGENTS.md) and are enforced, not merely
documented: `scripts/check-house-style.mjs` fails the build on `async`/`await`,
raw `Promise`, barrel `effect` imports, type assertions, and ambient
clock/UUID access in production source.

`packages/core/test/v4-api-smoke.test.ts` is a canary pinning the Effect v4 APIs
the design depends on. Effect v4 is in beta; if a bump renames something, that
test fails first.

## License

MIT, declared in every package manifest. A `LICENSE` file has not been added yet.
