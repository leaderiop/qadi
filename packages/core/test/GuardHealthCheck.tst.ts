/**
 * Pins that a readiness probe asks the ports and nothing else: it requires
 * the current subject and `PortServices`, not `EvaluationId` (ARCH-16).
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type { CurrentSubject } from "../src/CurrentSubject.ts";
import type { GuardHealthCheckResult } from "../src/GuardHealthCheck.ts";
import { createGuardHealthCheck } from "../src/GuardHealthCheck.ts";
import { hasRole } from "../src/Policy.ts";
import type { PortServices } from "../src/Ports.ts";

test("createGuardHealthCheck requires only the subject and the ports", () => {
  const probe = createGuardHealthCheck(hasRole("a"));
  expect(probe).type.toBeAssignableTo<
    Effect.Effect<GuardHealthCheckResult, never, CurrentSubject | PortServices>
  >();
  expect<Effect.Services<typeof probe>>().type.toBe<CurrentSubject | PortServices>();
});
