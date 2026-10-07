/**
 * The production-instrumentation warning's once-per-process latch.
 *
 * Alone in its file on purpose: the latch is module state in
 * `DeveloperSignals.ts`, and vitest isolates a module graph per file, so this is
 * the only test in the suite that can observe it fresh.
 */
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Can, QadiProvider, makeQadiAtoms } from "../src/index.ts";

const canRead = hasPermission(permission("doc", "read"));
const atoms = makeQadiAtoms(EvaluationServicesNone);
const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });

describe("instrument in a production bundle", () => {
  it("warns once when instrument is true outside development (ticket 153)", () => {
    // `instrument` hands any script on the page a list of what the current
    // user may and may not do — a debug affordance that, unlike this
    // codebase's other prod-visible conditionals (`isDevelopment()` in
    // `DeveloperSignals.ts`, per-request logging in
    // `permissionRegistryRouteUnguarded`), had no runtime signal when it
    // reached a production bundle.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const first = render(
        <QadiProvider atoms={atoms} subject={reader} instrument>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>,
      );
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain("instrument");
      first.unmount();

      // A second instrumented provider reaching production is the same signal,
      // not a new one — this is a "did instrumentation ever ship" warning, not
      // a per-instance one.
      render(
        <QadiProvider atoms={atoms} subject={reader} instrument>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>,
      );
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      process.env.NODE_ENV = previous;
      warn.mockRestore();
    }
  });
});
