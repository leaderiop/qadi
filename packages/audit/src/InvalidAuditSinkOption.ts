/**
 * A breaker or audit sink option that cannot work, refused when the layer is built.
 *
 * A `failureThreshold: NaN` built a breaker that never opened, and a non-positive
 * duration either flapped the breaker or timed every store call out at once. The
 * thresholds are deployment configuration, often read from the environment, so a
 * composition must be able to report a bad one: that is why this is a typed error,
 * where BEH-QD-166 makes a bound written as a constant in code a defect
 * (ARCH-92, ADR-QD-158).
 *
 * `received` is the raw input, not its decoded form, because `NaN` decodes to a zero
 * duration and would otherwise be reported as `0`. A `Data.TaggedError`, since no
 * codec carries it (`SCHEMA_ERROR_BUDGET` is unchanged).
 */
import * as Data from "effect/Data";
import type * as Duration from "effect/Duration";
import * as Formatter from "effect/Formatter";

type SinkOption = "failureThreshold" | "resetTimeoutMs" | "storeCallTimeout";

// A closed record: a fourth option without an entry is TS2741.
const REQUIRED: Record<SinkOption, string> = {
  failureThreshold: "a positive whole number",
  resetTimeoutMs: "a finite, positive, whole number of milliseconds",
  storeCallTimeout: "a positive duration, or Duration.infinity for no deadline",
};

export class InvalidAuditSinkOption extends Data.TaggedError("InvalidAuditSinkOption")<{
  readonly option: SinkOption;
  readonly received: Duration.Input;
}> {
  override get message(): string {
    return `${this.option} must be ${REQUIRED[this.option]}; received ${Formatter.format(this.received)}`;
  }
}
