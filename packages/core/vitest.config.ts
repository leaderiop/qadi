import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "core",
    include: ["test/**/*.test.ts"],
    typecheck: {
      enabled: false,
      include: ["test/**/*.test-d.ts"],
    },
    // Benchmarks are measurement, not a gate: `pnpm check` does not run them.
    // A timing threshold in CI fails on a noisy runner and says nothing about
    // the change under test.
    benchmark: {
      include: ["bench/**/*.bench.ts"],
    },
  },
});
