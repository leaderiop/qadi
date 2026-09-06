# Qadi

Effect-native authorization for TypeScript. Permission tokens, a role DAG, a
schema-derived policy ADT, and a single `Effect`-returning evaluator.

> **Status: feature-complete, partially published.** Every item the
> [roadmap](./spec/roadmap.md) committed to has shipped, and every access-control
> model in the [adoption matrix](./spec/models/00-adoption-matrix.md) is either
> adopted or explicitly declined. All nine packages are staged at `0.3.0`;
> `@qadi/core`, `@qadi/testing`, `@qadi/react` and `@qadi/promise` are published
> on npm (latest release `0.2.0`), and `@qadi/audit`, `@qadi/http`,
> `@qadi/devtools`, `@qadi/predicate-sql` and `@qadi/predicate-prisma` have not
> been published yet — the API may still move.

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
Here the policy union and the matcher DSL are each defined once: the recursive
type is written by hand and the `Schema.Codec` is built and type-checked
against it, so the TypeScript type and the JSON codec cannot diverge.

## Packages

| Package | Description |
| ------- | ----------- |
| `@qadi/core` | Tokens, policy ADT, evaluator, enforcement |
| `@qadi/testing` | Fixtures, deterministic layers, recording resolvers |
| `@qadi/react` | `QadiProvider`, hooks, `Can`/`Cannot`, server-render hydration |
| `@qadi/promise` | A Promise facade for callers who do not use Effect |
| `@qadi/http` | `effect/unstable/http`/`httpapi` bindings — enforcement middleware, subject extraction, permission registry |
| `@qadi/audit` | Audit trail, staging, circuit breaker, retention/archival, e-signature capture, composed onto `DecisionSink` |
| `@qadi/devtools` | A headless decision timeline and a React dock that renders it |
| `@qadi/predicate-sql` | Compiles a `Predicate` into a parameterized SQL fragment — PostgreSQL, MySQL, or SQLite |
| `@qadi/predicate-prisma` | Compiles a `Predicate` into a Prisma `WhereInput` |

`@qadi/features` (Cucumber BDD acceptance tests, private) lives at repo-root
`features/`, not under `packages/` like the ones above.

## Development

```bash
pnpm install
pnpm typecheck     # tsc -b across project references
pnpm test          # vitest
pnpm coverage      # thresholds enforced: 90% workspace, 95% core
pnpm lint          # oxlint + house-style checks
pnpm circular      # madge — no circular imports across any package's src/
pnpm test:tstyche  # type-level tests (*.tst.ts)
pnpm test:bdd      # Cucumber acceptance scenarios
pnpm spec:examples # compile every runnable example in spec/
pnpm spec:verify:strict  # specification internal consistency
pnpm spec:api      # the documented API surface matches the real one
pnpm spec:package  # the packed packages install, resolve and authorize
pnpm spec:gates    # the DoD table is the merge gate pnpm check actually runs
pnpm spec:claims   # spec/devtools-spec says why each absence still holds
pnpm bench         # dispatch and evaluation throughput (measurement, not a gate)
pnpm mutation      # Stryker on packages/core, the devtools model, predicate-sql, predicate-prisma, audit
pnpm check         # all twenty-two gates, in order
```

`pnpm check` is the merge gate, and [CI](./.github/workflows/check.yml) runs that
one command — not its own list of steps, so the two cannot drift apart. Every number
in the specification up to CCR-QD-035 was produced by a person running it by hand.

Conventions are in [`AGENTS.md`](./AGENTS.md) and are enforced, not merely
documented: `scripts/check-house-style.mjs` fails the build on `async`/`await`,
raw `Promise`, barrel `effect` imports, type assertions, ambient clock/UUID
access, and any `switch` beyond the four declared hot-path dispatchers — in
production source.

`packages/core/test/v4-api-smoke.test.ts` is a canary pinning the Effect v4 APIs
the design depends on. Effect v4 is in beta; if a bump renames something, that
test fails first.

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 Mohammad AL Mechkor.
