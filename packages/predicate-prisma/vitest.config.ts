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
    // Absolute, like the alias above: a relative path resolves against the process
    // cwd, which in Stryker's sandbox is the sandbox root, not this package.
    globalSetup: [fileURLToPath(new URL("./test/globalSetup.ts", import.meta.url))],
    // A real Prisma engine boots per test file; the default 5 s is for pure code.
    testTimeout: 30_000,
  },
});
