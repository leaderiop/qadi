import { defineConfig } from "vitest/config";

/**
 * The wiring tests, in a DOM.
 *
 * Deliberately **not** part of the root workspace's `projects: ["packages/*"]`:
 * this app is not a package, its coverage is not the library's coverage, and
 * pulling it into the 90% global threshold would mean measuring a demonstration
 * as if it were a dependency. It runs inside the example's own `check`, which is
 * one step of `pnpm check`.
 *
 * `happy-dom`, matching `@qadi/react` and `@qadi/devtools`. No layout and no
 * hit-testing — which is exactly why the lens is tested in a real browser
 * instead, under `e2e/`.
 */
export default defineConfig({
  test: {
    name: "example-nextjs",
    environment: "happy-dom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
