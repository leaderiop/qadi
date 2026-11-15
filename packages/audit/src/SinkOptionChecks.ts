/**
 * The checks that refuse a breaker or audit sink option that cannot work.
 *
 * Package-private: not in the barrel. Each check answers the decoded value it
 * approved, so the caller never decodes twice (ARCH-92, ADR-QD-158).
 */
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { InvalidAuditSinkOption } from "./InvalidAuditSinkOption.ts";

/** Refuses a failure threshold that is not a positive whole number; `NaN` and `Infinity` built a breaker that never opened. */
export const checkFailureThreshold = (received: number): Effect.Effect<number, InvalidAuditSinkOption> =>
  Number.isInteger(received) && received > 0
    ? Effect.succeed(received)
    : Effect.fail(new InvalidAuditSinkOption({ option: "failureThreshold", received }));

/**
 * Refuses a reset that is not a finite, positive, whole number of milliseconds.
 *
 * A cooldown at or below zero flapped Open to HalfOpen on every read, and a
 * malformed value died when the breaker was built. The decoded duration is tested
 * and the raw input reported, because `NaN` decodes to a zero duration.
 */
export const checkResetTimeoutMs = (received: Duration.Input): Effect.Effect<number, InvalidAuditSinkOption> => {
  const millis = Option.filter(Duration.fromInput(received), (d) => Duration.isFinite(d) && Duration.isPositive(d)).pipe(
    Option.map(Duration.toMillis),
    Option.filter(Number.isInteger),
  );
  return Option.isSome(millis)
    ? Effect.succeed(millis.value)
    : Effect.fail(new InvalidAuditSinkOption({ option: "resetTimeoutMs", received }));
};

/**
 * Refuses a store-call deadline that is not a positive duration; `Duration.infinity` is accepted as no deadline.
 *
 * A zero, negative or `NaN` deadline timed every store call out at once, so every record was
 * `WriteFailed` and the breaker tripped from configuration alone. `Duration.infinity` stays the
 * documented opt-out (BEH-QD-379, ADR-QD-126), so finiteness is not tested. The raw input is
 * reported, because `NaN` decodes to a zero duration.
 */
export const checkStoreCallTimeout = (received: Duration.Input): Effect.Effect<Duration.Duration, InvalidAuditSinkOption> => {
  const deadline = Option.filter(Duration.fromInput(received), Duration.isPositive);
  return Option.isSome(deadline)
    ? Effect.succeed(deadline.value)
    : Effect.fail(new InvalidAuditSinkOption({ option: "storeCallTimeout", received }));
};
