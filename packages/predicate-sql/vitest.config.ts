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
    name: "predicate-sql",
    include: ["test/**/*.test.ts"],
    // `node:sqlite` is behind a flag on the Node floor (22.12.0) and still accepted
    // on later Nodes; the sqlite engine tests import it (`test/sqlEngines.ts`).
    execArgv: ["--experimental-sqlite"],
    // A PGlite instance boots per test file; the default 5 s is for pure code.
    testTimeout: 30_000,
  },
});
