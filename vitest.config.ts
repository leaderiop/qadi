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
      },
    },
  },
});
