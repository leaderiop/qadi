/**
 * Mutation testing for `@qadi/predicate-prisma`.
 *
 * A fourth configuration rather than a glob in `stryker.config.mjs`, for the
 * same reason `stryker.predicate-sql.mjs` is one: that file pins `vitest.dir`
 * to `packages/core`, so a mutant here would have no covering test, survive,
 * and fail the gate for a reason unrelated to the change under review.
 *
 * `index.ts` is the renderer, not a barrel. The leaf rules it used to carry (safe
 * values, identifiers, `maxInValues`, NULL handling) are `@qadi/core`'s
 * `toRenderable` now (ADR-QD-077), so their mutants are measured under
 * `stryker.config.mjs` against core's tests; what is mutated here is Prisma's
 * grammar and its vacuous-identity folding, killed by the goldens and by the
 * real-engine properties (`test/EngineAgreement.test.ts`: Prisma Client over
 * SQLite). The reserved-key `Set` and the shape tables are static and not measured
 * under `ignoreStatic` (ADR-QD-076), so the goldens pin their values. One branch
 * is unreachable from `compilePrismaWhere` by construction (`excludeNull` on a
 * filter that already holds `not`: a `Neq` admits NULL, so it is never
 * `ExcludeNull`); it is kept correct rather than silently wrong and shows up as
 * "no coverage". A surviving mutant here is a real correctness gap in the Prisma
 * compiler INV-QD-048 exists to rule out, so it is held at the same bar as
 * `@qadi/core`.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",

  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "packages/predicate-prisma/vitest.config.ts",
    dir: "packages/predicate-prisma",
  },

  // Deliberately a path that does not exist — see `stryker.config.mjs`.
  tsconfigFile: "tsconfig.stryker-disabled.json",
  reporters: ["html", "json", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation-predicate-prisma/index.html" },
  jsonReporter: { fileName: "reports/mutation-predicate-prisma/mutation.json" },
  coverageAnalysis: "perTest",
  // Skips mutants in code that runs once at import time (ADR-QD-076): Stryker re-runs the whole
  // suite for each, and they dominated the run time. Set false to examine them by hand.
  ignoreStatic: true,

  mutate: ["packages/predicate-prisma/src/**/*.ts"],

  thresholds: { high: 90, low: 80, break: 80 },

  timeoutMS: 20000,
  concurrency: 4,
};
