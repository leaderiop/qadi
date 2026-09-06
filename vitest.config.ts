import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
      // Named explicitly, not `packages/*/src/**/index.ts`: `@qadi/promise`'s
      // index.ts is deliberately the whole implementation (ADR-QD-032), not a
      // barrel, and a blanket pattern excluded its real logic from measurement
      // entirely — its 90% gate was passing vacuously with zero files in scope.
      exclude: [
        "packages/core/src/index.ts",
        "packages/react/src/index.ts",
        "packages/testing/src/index.ts",
        "packages/http/src/index.ts",
        // Two barrels, because `@qadi/devtools` ships two entry points: the
        // headless model and the React dock that renders it.
        "packages/devtools/src/index.ts",
        "packages/devtools/src/react/index.ts",
        "packages/audit/src/index.ts",
        "**/*.test-d.ts",
      ],
      // A shortfall is a failure, not a report.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
        // Core is pure logic; hold it higher.
        "packages/core/src/**": {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95,
        },
        // The devtools *model* is pure logic too, and a defect in it is not an
        // ergonomics one: a merge or pairing bug shows the wrong verdict beside
        // the wrong subject, and a reviewer acts on what the tool says. Held at
        // core's bar. The React shell under `src/react/` stays at the 90%
        // default — it renders what the model computed and decides nothing.
        "packages/devtools/src/model/**": {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95,
        },
        // The top-level 90/90/90/90 above is a *workspace-wide average*: a
        // well-tested package can carry an undertested one to a green run
        // without either number showing it. AGENTS.md §10 states 90% as each
        // package's own floor, not the fleet's, so each of the remaining
        // public packages gets its own entry at that same number — a glob
        // with the identical thresholds is not a no-op the way it would look:
        // it changes the pass/fail unit from "the workspace average" to
        // "this package", which is the number a shortfall should actually be
        // measured against.
        "packages/http/src/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "packages/audit/src/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "packages/react/src/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "packages/promise/src/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "packages/testing/src/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  },
});
