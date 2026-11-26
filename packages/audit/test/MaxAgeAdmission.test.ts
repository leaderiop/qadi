/**
 * Pins that a retention limit is admitted only as a number from zero up, and that nothing else is read as one.
 *
 * The type says `maxAgeMs` is a number, but a host's config or a JavaScript caller can hand over any value, and a
 * relational check coerces: `null`, `false`, `""` and `[]` compare as `0`, `"5"` as `5`, an object through its own
 * `valueOf`, and a Symbol throws. For a deletion selector a limit read as `0` expires every row, so each plan refuses
 * every value that is not a number as `MaxAgeInvalid` with the value given, without converting it and without throwing.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { planPurge, planRetention } from "../src/Retention.ts";
import type { RetentionInputInvalid, RetentionPolicy } from "../src/Retention.ts";
import { decisionRecord } from "./helpers.ts";

/**
 * What a JavaScript caller can hand over where the type says something else: `Reflect.get`
 * on an `object` answers `any`, which is what an untyped config or store client gives.
 */
const handedOver = <T>(value: unknown): T => {
  const box: object = { value };
  return Reflect.get(box, "value");
};

const NOW = 100_000;
/** A codec row 99 seconds old: past a limit read as `0`, within one of ten thousand seconds. */
const old: AuditEntry = Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: "old", at: 1_000 })));

/** An archive read back from the bytes a store would return for `rows`. */
const storedArchive = (rows: ReadonlyArray<AuditEntry>) =>
  Result.getOrThrow(readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail(rows, 0))))));

/** The value a plan's `MaxAgeInvalid` refusal carries, or a failed assertion naming what the plan did instead. */
const refusedLimit = (result: Result.Result<unknown, RetentionInputInvalid>): { readonly value: unknown } => {
  if (Result.isSuccess(result)) return assert.fail("the plan admitted the limit");
  const refusal = result.failure.refusal;
  return refusal._tag === "MaxAgeInvalid" ? { value: refusal.value } : assert.fail(`the plan refused ${refusal._tag}`);
};

/** Asks each plan to refuse `given` as `MaxAgeInvalid` carrying that very value. */
const eachPlanRefuses = (given: unknown) => {
  const policy = handedOver<RetentionPolicy>({ maxAgeMs: given });
  const retention = refusedLimit(planRetention([old], policy, NOW));
  const purge = refusedLimit(planPurge([old], policy, NOW, storedArchive([old])));
  assert.strictEqual(retention.value, given);
  assert.strictEqual(purge.value, given);
};

describe("a retention limit that is not a number is refused as given", () => {
  it("M1 null, false, an empty string and an empty list, which compare as 0, are MaxAgeInvalid with the value given in each plan", () => {
    for (const given of [null, false, "", []]) eachPlanRefuses(given);
  });

  it("M2 a numeric string and true are MaxAgeInvalid with the value given in each plan", () => {
    for (const given of ["5", true]) eachPlanRefuses(given);
  });

  it("M3 a boxed number and an object with its own valueOf are MaxAgeInvalid with the value given in each plan, and valueOf is never called", () => {
    const calls = { valueOf: 0 };
    const object = {
      valueOf: () => {
        calls.valueOf += 1;
        return 10_000_000;
      },
    };
    for (const given of [Object(10_000_000), object]) eachPlanRefuses(given);
    assert.strictEqual(calls.valueOf, 0);
  });

  it("M4 a Symbol and an object with no prototype are MaxAgeInvalid with the value given in each plan, and neither throws", () => {
    for (const given of [Symbol("limit"), Object.create(null)]) eachPlanRefuses(given);
  });
});
