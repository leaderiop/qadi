/**
 * Registers `@testing-library/react`'s auto-cleanup for this package's suite.
 *
 * Mirrors `packages/react/test/setupTests.ts` — same gap, same fix. RTL's own
 * auto-cleanup only registers itself when it finds a global `afterEach`, which
 * vitest only installs when `test.globals` is `true`; `packages/devtools/vitest.config.ts`
 * does not set `globals`, so without this file no test's rendered tree was ever
 * unmounted. Every `test/react/*.test.tsx` file previously hand-rolled
 * `afterEach(() => { document.body.innerHTML = ""; })` instead, which erases the
 * DOM but not React's own record of what is mounted — effect cleanups
 * (subscriptions, `GateRegistry` entries, timers) leaked from one test into the
 * next, the same defect `packages/react/test/setupTests.ts`'s doc comment
 * names (CCR-QD-115).
 *
 * A plain `afterEach(cleanup)` here, wired through `test.setupFiles` in
 * `vitest.config.ts`, is the fix vitest's own docs recommend for exactly this
 * gap and needs no `globals` flag.
 */
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
