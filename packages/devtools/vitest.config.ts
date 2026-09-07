import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve workspace packages to source, matching tsconfig `paths`.
      "@qadi/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
      "@qadi/testing": fileURLToPath(new URL("../testing/src/index.ts", import.meta.url)),
    },
  },
  test: {
    name: "devtools",
    // `happy-dom` for the whole project rather than per-file, as `@qadi/react`
    // does. The model tests do not need it and do not notice it; splitting the
    // package into two vitest projects to spare them would be a second
    // definition of one package's test run.
    environment: "happy-dom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    // `@testing-library/react`'s auto-cleanup registers via a global
    // `afterEach`, which only exists when `test.globals` is `true`. This
    // config does not set `globals`, so the cleanup is registered explicitly
    // here instead — see `test/setupTests.ts` (CCR-QD-115).
    setupFiles: ["./test/setupTests.ts"],
  },
});
