/**
 * Mutation testing for `@qadi/core`.
 *
 * Coverage says which lines executed; it does not say which assertions mean
 * anything. Every enabler in this library was signed off with a hand-run
 * mutation pass quoted into its ADR — this makes that evidence reproducible by
 * someone who is not the author.
 *
 * Scoped to `packages/core/src` deliberately. It is the only package where a
 * surviving mutant is an authorization defect rather than an ergonomics one, and
 * it is the package held at 95% line coverage. `@qadi/react` is a binding over
 * `effect/unstable/reactivity` and `@qadi/testing` exists to be used by tests,
 * so mutating either mostly measures the test doubles.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",

  /**
   * Named explicitly rather than left to the default `["@stryker-mutator/*"]`
   * glob. Under pnpm every entry in `node_modules/@stryker-mutator/` is a symlink
   * into `.pnpm/`, and the sandbox reaches them through a second symlink — the
   * glob does not follow that far and the child process reports
   * "no TestRunner plugins were loaded". An explicit name is imported directly.
   */
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "packages/core/vitest.config.ts",
    dir: "packages/core",
    // `related: true` is left off on purpose. Vitest resolves "related to this
    // source file" against its own root, which is `packages/core`, while Stryker
    // hands it paths from the sandbox root — so it matched nothing and the dry run
    // reported "No tests were found". `coverageAnalysis: "perTest"` already limits
    // each mutant to the tests that covered its line, which is the same saving by
    // a mechanism that does not depend on path resolution.
  },

  /**
   * Deliberately a path that does not exist.
   *
   * Stryker's sandbox rewrites `extends` and `references` in the root tsconfig
   * via `ts.parseConfigFileTextToJson`, which **TypeScript 7 removed** — the run
   * dies with `TypeError: ts.parseConfigFileTextToJson is not a function` before
   * any mutant is tested. The preprocessor no-ops when the named file is not in
   * the project (`ts-config-preprocessor.js:40`), so naming a file that does not
   * exist skips it.
   *
   * Nothing is lost: the rewrite exists for `@stryker-mutator/typescript-checker`
   * and for sandboxes whose tsconfig reaches outside itself. We use neither —
   * Vite transpiles the sandbox, and no type check runs inside it.
   *
   * Revisit when Stryker supports TypeScript 7; then this becomes `tsconfig.json`.
   */
  tsconfigFile: "tsconfig.stryker-disabled.json",
  reporters: ["html", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  coverageAnalysis: "perTest",

  mutate: [
    "packages/core/src/**/*.ts",
    // Barrels re-export; a mutant there is a build error, not a survivor.
    "!packages/core/src/index.ts",
  ],

  // The roadmap set this bar by matching the predecessor's. `break` fails the
  // run, which is what makes it a gate rather than a report.
  thresholds: { high: 90, low: 80, break: 80 },

  // A survivor that cannot be killed is a finding to record, not a number to
  // suppress — so there is no ignore list here. If one becomes necessary it
  // belongs in an ADR first.
  timeoutMS: 20000,
  concurrency: 4,
};
