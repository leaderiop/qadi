/**
 * Mutation testing for `@qadi/http`.
 *
 * A surviving mutant here is an authorization defect, not an ergonomics one —
 * the boundary between "this endpoint is guarded" and "this endpoint is
 * public" is exactly the boundary ADR-QD-036 got wrong, twice, before this
 * gate existed: revisions 1.0 through 1.2 shipped "unannotated = unguarded"
 * despite that alternative being named and rejected on day one, and
 * `PermissionRegistry`'s `/__permissions` route shipped unguarded by default
 * (BEH-QD-180). Both were caught by a later manual read of the code against
 * the ADR, not by the package's own suite — checked against INV-QD-034. Same
 * reasoning `stryker.audit.mjs` gives for its own gate (ADR-QD-056); this
 * package gets one for the same reason.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "packages/http/vitest.config.ts",
    dir: "packages/http",
  },
  tsconfigFile: "tsconfig.stryker-disabled.json",
  reporters: ["html", "json", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation-http/index.html" },
  coverageAnalysis: "perTest",

  mutate: [
    "packages/http/src/**/*.ts",
    // A real barrel, unlike the predicate compilers' index.ts (which IS
    // their implementation) — a mutant there is a build error, not a
    // survivor, the same reasoning stryker.config.mjs's own exclusion gives.
    "!packages/http/src/index.ts",
  ],

  thresholds: { high: 90, low: 80, break: 80 },
  timeoutMS: 20000,
  concurrency: 4,
};
