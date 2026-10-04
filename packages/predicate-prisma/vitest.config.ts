import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve workspace packages to source, matching tsconfig `paths`.
      "@qadi/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
  test: {
    name: "predicate-prisma",
    include: ["test/**/*.test.ts"],
    // Generates the fixture Prisma client when it is missing (Stryker's sandbox).
    globalSetup: ["./test/globalSetup.ts"],
    // A real Prisma engine boots per test file; the default 5 s is for pure code.
    testTimeout: 30_000,
  },
});
