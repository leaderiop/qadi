/**
 * Registers `@testing-library/react`'s auto-cleanup for this package's suite.
 *
 * RTL's own auto-cleanup only registers itself when it finds a global
 * `afterEach` — which vitest only installs when `test.globals` is `true`.
 * This package does not set `globals` (it is not otherwise needed here), so
 * without this file no test's rendered tree was ever unmounted: a manual
 * `document.body.innerHTML = ""` some test files run only erases the DOM, not
 * React's own record of what is mounted, so effect cleanups (subscriptions,
 * `GateRegistry` entries, timers) leaked from one test into the next.
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
