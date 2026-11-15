/**
 * The checks that refuse a breaker or audit sink option that cannot work.
 *
 * Package-private: not in the barrel. Each check answers the decoded value it
 * approved, so the caller never decodes twice (ARCH-92, ADR-QD-158).
 */
import * as Effect from "effect/Effect";
import { InvalidAuditSinkOption } from "./InvalidAuditSinkOption.ts";

/** Refuses a failure threshold that is not a positive whole number; `NaN` and `Infinity` built a breaker that never opened. */
export const checkFailureThreshold = (received: number): Effect.Effect<number, InvalidAuditSinkOption> =>
  Number.isInteger(received) && received > 0
    ? Effect.succeed(received)
    : Effect.fail(new InvalidAuditSinkOption({ option: "failureThreshold", received }));
