import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@qadi/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
  test: {
    name: "react",
    environment: "happy-dom",
    include: ["test/**/*.test.tsx", "test/**/*.test.ts"],
    // `@testing-library/react`'s auto-cleanup registers via a global
    // `afterEach`, which only exists when `test.globals` is `true`. This
    // config does not set `globals`, so the cleanup is registered explicitly
    // here instead — see `test/setupTests.ts`.
    // Resolved against this file, not the process CWD: `stryker.react.mjs`
    // runs vitest from the repo root with `--dir packages/react`, which left a
    // bare "./test/setupTests.ts" pointing at `<repo-root>/test/` and failing
    // every file (the same fix `packages/devtools/vitest.config.ts` carries).
    setupFiles: [fileURLToPath(new URL("./test/setupTests.ts", import.meta.url))],
  },
});
