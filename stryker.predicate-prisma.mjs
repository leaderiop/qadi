/**
 * Mutation testing for `@qadi/predicate-prisma`.
 *
 * A fourth configuration rather than a glob in `stryker.config.mjs`, for the
 * same reason `stryker.predicate-sql.mjs` is one: that file pins `vitest.dir`
 * to `packages/core`, so a mutant here would have no covering test, survive,
 * and fail the gate for a reason unrelated to the change under review.
 *
 * `index.ts` is the whole implementation, not a barrel. A surviving mutant
 * here is a real correctness gap in the Prisma compiler INV-QD-048 exists to
 * rule out, so it is held at the same bar as `@qadi/core`.
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
  coverageAnalysis: "perTest",

  mutate: ["packages/predicate-prisma/src/**/*.ts"],

  thresholds: { high: 90, low: 80, break: 80 },

  timeoutMS: 20000,
  concurrency: 4,
};
