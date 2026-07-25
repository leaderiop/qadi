import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
      exclude: ["packages/*/src/**/index.ts", "**/*.test-d.ts"],
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
