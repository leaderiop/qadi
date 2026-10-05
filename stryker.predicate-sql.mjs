/**
 * Mutation testing for `@qadi/predicate-sql`.
 *
 * A third configuration rather than a glob in `stryker.config.mjs`, for the
 * same reason `stryker.devtools.mjs` is one: that file pins `vitest.dir` to
 * `packages/core`, so a mutant here would have no covering test, survive, and
 * fail the gate for a reason unrelated to the change under review.
 *
 * `index.ts` is the renderer, not a barrel — there is nothing to exclude the way
 * `packages/core/src/index.ts` is excluded from `stryker.config.mjs`'s `mutate`
 * list. The leaf rules it used to carry (safe values, identifiers, `maxInValues`,
 * NULL handling) are `@qadi/core`'s `toRenderable` now (ADR-QD-079), so their
 * mutants are measured under `stryker.config.mjs` against core's tests; what is
 * mutated here is syntax, killed by the goldens and by the real-engine properties
 * (`test/EngineAgreement.test.ts`: PGlite and `node:sqlite`). The syntax tables
 * (`SYNTAX`, the operator and guard `Record`s) are static and not measured under
 * `ignoreStatic` (ADR-QD-076), so the goldens pin their values. A surviving mutant
 * here is a real correctness gap in the SQL compiler INV-QD-047 exists to rule
 * out, not an ergonomics one, so it is held at the same bar as `@qadi/core`.
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
  jsonReporter: { fileName: "reports/mutation-predicate-sql/mutation.json" },
  coverageAnalysis: "perTest",
  // Skips mutants in code that runs once at import time (ADR-QD-076): Stryker re-runs the whole
  // suite for each, and they dominated the run time. Set false to examine them by hand.
  ignoreStatic: true,

  mutate: ["packages/predicate-sql/src/**/*.ts"],

  thresholds: { high: 90, low: 80, break: 80 },

  timeoutMS: 20000,
  concurrency: 4,
};
