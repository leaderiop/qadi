import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import { AuditTrailPort, AuditWriteError } from "../src/AuditTrailPort.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { decisionRecord } from "./helpers.ts";

describe("AuditTrailPortTest", () => {
  it.effect("records every write, in order, readable live", () =>
    Effect.gen(function* () {
      const { layer, written } = AuditTrailPortTest();
      const entryA = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const entryB = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));

      yield* Effect.gen(function* () {
        yield* AuditTrailPort.write(entryA);
        assert.strictEqual(written().length, 1);
        yield* AuditTrailPort.write(entryB);
      }).pipe(Effect.provide(layer));

      assert.deepStrictEqual(written(), [entryA, entryB]);
    }));

  it.effect("failWith fails the write instead of recording it", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const failure = new AuditWriteError({ entry, cause: "store offline" });
      const { layer, written } = AuditTrailPortTest({ failWith: () => failure });

      const result = yield* Effect.result(AuditTrailPort.write(entry)).pipe(Effect.provide(layer));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure, failure);
        assert.strictEqual(result.failure._tag, "AuditWriteError");
        assert.strictEqual(result.failure.cause, "store offline");
      }
      assert.strictEqual(written().length, 0);
    }));

  it.effect("failWith returning undefined for a given entry lets that write through", () =>
    Effect.gen(function* () {
      const entryA = yield* encodeAuditEntry(decisionRecord({ evaluationId: "keep" }));
      const entryB = yield* encodeAuditEntry(decisionRecord({ evaluationId: "reject" }));
      const { layer, written } = AuditTrailPortTest({
        failWith: (entry) =>
          entry.record.evaluationId === "reject"
            ? new AuditWriteError({ entry, cause: "denied" })
            : undefined,
      });

      yield* Effect.gen(function* () {
        yield* AuditTrailPort.write(entryA);
        const result = yield* Effect.result(AuditTrailPort.write(entryB));
        assert.strictEqual(result._tag, "Failure");
      }).pipe(Effect.provide(layer));

      assert.deepStrictEqual(written(), [entryA]);
    }));

  it.effect("options present without failWith still records normally", () =>
    Effect.gen(function* () {
      // `options` itself is truthy here, unlike AuditTrailPortTest() with no
      // arguments at all — exercises the "options defined, failWith absent"
      // path `options?.failWith?.(entry)` specifically guards.
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, written } = AuditTrailPortTest({});

      yield* AuditTrailPort.write(entry).pipe(Effect.provide(layer));
      assert.deepStrictEqual(written(), [entry]);
    }));
});
