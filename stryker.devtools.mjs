/**
 * Mutation testing for `@qadi/devtools`'s **model**.
 *
 * A second configuration rather than a second glob in `stryker.config.mjs`, and
 * the reason is the test runner rather than tidiness. That file pins
 * `vitest.dir` to `packages/core`, so a mutant in another package would have no
 * covering test, survive, and fail the gate for a reason that has nothing to do
 * with the change under review. Repointing the existing run at the root vitest
 * config would fix that by making every core mutant's initial run execute four
 * other packages' suites — a cost paid on the gate that already has the longest
 * history of being the slow one (CCR-QD-065).
 *
 * Scoped to `src/model/` deliberately, on exactly the reasoning
 * `stryker.config.mjs` uses to exclude `@qadi/react`: the model decides what a
 * reviewer is shown — how records merge, which rows pair, whether a node was
 * short-circuited or denied — and a surviving mutant there is a defect someone
 * would act on. `src/react/` renders what the model computed; mutating JSX
 * mostly measures the renderer.
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
    configFile: "packages/devtools/vitest.config.ts",
    dir: "packages/devtools",
  },

  // Deliberately a path that does not exist — see `stryker.config.mjs`.
  // Stryker's tsconfig preprocessor calls `ts.parseConfigFileTextToJson`, which
  // TypeScript 7 removed, and no-ops when the named file is absent.
  tsconfigFile: "tsconfig.stryker-disabled.json",
  reporters: ["html", "json", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation-devtools/index.html" },
  coverageAnalysis: "perTest",

  mutate: ["packages/devtools/src/model/**/*.ts"],

  thresholds: { high: 90, low: 80, break: 80 },

  timeoutMS: 20000,
  concurrency: 4,
};
