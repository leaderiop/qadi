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
    // here instead — see `test/setupTests.ts` (CCR-QD-119).
    //
    // Resolved via `fileURLToPath`, not a bare relative string: a relative
    // `setupFiles` entry resolves against the *process* CWD, not this
    // config's directory. `stryker.devtools.mjs` invokes vitest with
    // `--dir packages/devtools` from the repo root, which left the bare
    // string looking for `<repo-root>/test/setupTests.ts` and failing every
    // test file with `ERR_MODULE_NOT_FOUND` (CCR-QD-119) — `@qadi/react`'s
    // otherwise-identical config has the same latent bug, unexercised only
    // because `src/react` is excluded from mutation testing.
    setupFiles: [fileURLToPath(new URL("./test/setupTests.ts", import.meta.url))],
  },
});
