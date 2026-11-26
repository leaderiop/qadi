/**
 * Pins what a bounded port's refused construction says: the count it was given.
 *
 * `InvalidBoundedPermits` carries `permits`, so a host that logs the failure can say
 * which count it passed. A wrapper that dropped the field would still fail with the
 * right tag, so the tag alone does not hold it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import {
  AttributeResolver,
  attributeResolverBounded,
  attributeResolverFromRecord,
  makeSubjectId,
} from "../src/index.ts";

describe("a bounded port's refused construction", () => {
  it.effect("names the permits it was given, for every count that is not a positive integer", () =>
    Effect.gen(function* () {
      for (const permits of [0, -1, 1.5]) {
        const result = yield* Effect.result(
          AttributeResolver.resolve(makeSubjectId("u-1"), "tier").pipe(
            Effect.provide(attributeResolverBounded(permits)(attributeResolverFromRecord({ tier: "gold" }))),
          ),
        );
        assert.isTrue(Result.isFailure(result), `permits ${permits} should fail`);
        if (!Result.isFailure(result)) continue;
        const failure = result.failure;
        assert.strictEqual(failure._tag, "InvalidBoundedPermits");
        if (failure._tag !== "InvalidBoundedPermits") continue;
        assert.strictEqual(failure.permits, permits);
      }
    }),
  );
});
