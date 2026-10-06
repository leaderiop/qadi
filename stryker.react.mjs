/**
 * Mutation testing for `@qadi/react`'s **decision read**, and nothing else in
 * that package.
 *
 * `stryker.config.mjs` keeps `@qadi/react` out of the core run because the
 * package is "a thin binding over `effect/reactivity` plus render code" — and
 * that is still true of every file but one. `DecisionOutcome.ts` is neither: it
 * is pure decision logic, the one place a `DecisionResult` becomes something a
 * guard renders, and a surviving mutant there is an authorization defect — a
 * re-check that reads as its old allow (ADR-QD-017), a failure that reads as a
 * denial (INV-QD-006), a seed that reads as pending (BEH-QD-149). The same
 * argument `stryker.devtools.mjs` makes for scoping to `src/model/`: mutate what
 * decides, not what renders (ADR-QD-093).
 *
 * A separate configuration for the `vitest.dir` reason every per-package config
 * here gives: `stryker.config.mjs` pins `vitest.dir` to `packages/core`, so a
 * mutant in this package would have no covering test there. The covering tests
 * are `packages/react/test/DecisionOutcome.test.ts` (no rendering, fast), plus
 * whatever else in the package reaches the module — `perTest` coverage analysis
 * runs only those.
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
    configFile: "packages/react/vitest.config.ts",
    dir: "packages/react",
  },

  // Deliberately a path that does not exist — see `stryker.config.mjs`.
  // Stryker's tsconfig preprocessor calls `ts.parseConfigFileTextToJson`, which
  // TypeScript 7 removed, and no-ops when the named file is absent.
  tsconfigFile: "tsconfig.stryker-disabled.json",
  reporters: ["html", "json", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation-react/index.html" },
  jsonReporter: { fileName: "reports/mutation-react/mutation.json" },
  coverageAnalysis: "perTest",
  // Skips mutants in code that runs once at import time (ADR-QD-076): Stryker re-runs the whole
  // suite for each, and they dominated the run time. Set false to examine them by hand.
  ignoreStatic: true,

  mutate: ["packages/react/src/DecisionOutcome.ts"],

  thresholds: { high: 90, low: 80, break: 80 },

  timeoutMS: 20000,
  // No `concurrency`: Stryker's default, a worker per core — see `stryker.config.mjs`.
};
