/**
 * Mutation testing for `@qadi/audit`.
 *
 * A surviving mutant here is a compliance defect, not an ergonomics one — an
 * audit trail an operator or reviewer trusts that quietly encodes, stages,
 * breaks, retains or discharges the wrong thing. Same reasoning `stryker.
 * predicate-sql.mjs`/`stryker.predicate-prisma.mjs` give for their own gates
 * (ADR-QD-054, CCR-QD-080); this package gets one for the same reason,
 * against ADR-QD-056.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "packages/audit/vitest.config.ts",
    dir: "packages/audit",
  },
  tsconfigFile: "tsconfig.stryker-disabled.json",
  reporters: ["html", "json", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation-audit/index.html" },
  coverageAnalysis: "perTest",

  mutate: [
    "packages/audit/src/**/*.ts",
    // A real barrel, unlike the predicate compilers' index.ts (which IS
    // their implementation) — a mutant there is a build error, not a
    // survivor, the same reasoning stryker.config.mjs's own exclusion gives.
    "!packages/audit/src/index.ts",
  ],

  thresholds: { high: 90, low: 80, break: 80 },
  timeoutMS: 20000,
  concurrency: 4,
};
