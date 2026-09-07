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
    setupFiles: ["./test/setupTests.ts"],
  },
});
