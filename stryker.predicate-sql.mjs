/**
 * Mutation testing for `@qadi/predicate-sql`.
 *
 * A third configuration rather than a glob in `stryker.config.mjs`, for the
 * same reason `stryker.devtools.mjs` is one: that file pins `vitest.dir` to
 * `packages/core`, so a mutant here would have no covering test, survive, and
 * fail the gate for a reason unrelated to the change under review.
 *
 * `index.ts` is the whole implementation, not a barrel — there is nothing to
 * exclude the way `packages/core/src/index.ts` is excluded from
 * `stryker.config.mjs`'s `mutate` list. A surviving mutant here is a real
 * correctness gap in the SQL compiler INV-QD-047 exists to rule out, not an
 * ergonomics one, so it is held at the same bar as `@qadi/core`.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",

  // Named explicitly for the reason `stryker.config.mjs` gives: under pnpm the
  // default `["@stryker-mutator/*"]` glob does not follow far enough through
  // the sandbox's symlinks and the child reports "no TestRunner plugins".
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "packages/predicate-sql/vitest.config.ts",
    dir: "packages/predicate-sql",
  },

  // Deliberately a path that does not exist — see `stryker.config.mjs`.
  tsconfigFile: "tsconfig.stryker-disabled.json",
  reporters: ["html", "json", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation-predicate-sql/index.html" },
  coverageAnalysis: "perTest",

  mutate: ["packages/predicate-sql/src/**/*.ts"],

  thresholds: { high: 90, low: 80, break: 80 },

  timeoutMS: 20000,
  concurrency: 4,
};
