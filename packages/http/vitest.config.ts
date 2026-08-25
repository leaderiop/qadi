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
    name: "http",
    include: ["test/**/*.test.ts"],
  },
});
