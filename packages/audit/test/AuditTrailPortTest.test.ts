import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import { AuditTrailPort } from "../src/AuditTrailPort.ts";
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

  it.effect("options present without a write script still records normally", () =>
    Effect.gen(function* () {
      // `options` itself is truthy here, unlike AuditTrailPortTest() with no
      // arguments at all — exercises the "options defined, write absent" path
      // `options?.write` specifically guards. A failing write is a `Fail`
      // reply (AuditPortReply.test.ts), never a hand-built error.
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, written } = AuditTrailPortTest({});

      yield* AuditTrailPort.write(entry).pipe(Effect.provide(layer));
      assert.deepStrictEqual(written(), [entry]);
    }));
});
