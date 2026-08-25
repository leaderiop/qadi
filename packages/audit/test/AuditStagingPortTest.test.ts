import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import { AuditStagingPort, AuditStagingError } from "../src/AuditStagingPort.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { decisionRecord } from "./helpers.ts";

describe("AuditStagingPortTest", () => {
  it.effect("stage records a handle as staged; commit moves it to committed", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged, committed } = AuditStagingPortTest();

      yield* Effect.gen(function* () {
        const handle = yield* AuditStagingPort.stage(entry);
        assert.deepStrictEqual(staged(), [handle]);
        assert.deepStrictEqual(committed(), []);
        yield* AuditStagingPort.commit(handle);
        assert.deepStrictEqual(staged(), []);
        assert.deepStrictEqual(committed(), [handle]);
      }).pipe(Effect.provide(layer));
    }));

  it.effect("distinct stages hand out sequential, distinct handles", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged } = AuditStagingPortTest();

      yield* Effect.gen(function* () {
        const a = yield* AuditStagingPort.stage(entry);
        const b = yield* AuditStagingPort.stage(entry);
        // Sequential values, not just "not equal to each other" — pins the
        // increment's direction, since this implementation's own tests are
        // the only place its opaque handle scheme can be pinned at all.
        assert.strictEqual(a, 0);
        assert.strictEqual(b, 1);
        assert.strictEqual(staged().length, 2);
      }).pipe(Effect.provide(layer));
    }));

  it.effect("committing one staged handle leaves the others staged", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged, committed } = AuditStagingPortTest();

      yield* Effect.gen(function* () {
        const a = yield* AuditStagingPort.stage(entry);
        const b = yield* AuditStagingPort.stage(entry);
        yield* AuditStagingPort.commit(a);
        assert.deepStrictEqual(staged(), [b]);
        assert.deepStrictEqual(committed(), [a]);
      }).pipe(Effect.provide(layer));
    }));

  it.effect("options present without failCommitWith still commits normally", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      // `options` itself is truthy here, unlike AuditStagingPortTest() with
      // no arguments at all — exercises the "options defined, failCommitWith
      // absent" path `options?.failCommitWith?.(handle)` specifically guards.
      const { layer, staged, committed } = AuditStagingPortTest({ failStageWith: () => undefined });

      yield* Effect.gen(function* () {
        const handle = yield* AuditStagingPort.stage(entry);
        yield* AuditStagingPort.commit(handle);
        assert.deepStrictEqual(staged(), []);
        assert.deepStrictEqual(committed(), [handle]);
      }).pipe(Effect.provide(layer));
    }));

  it.effect("failStageWith fails stage without minting a handle", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const failure = new AuditStagingError({ entry, cause: "staging store offline" });
      const { layer, staged } = AuditStagingPortTest({ failStageWith: () => failure });

      const result = yield* Effect.result(AuditStagingPort.stage(entry)).pipe(Effect.provide(layer));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure, failure);
        assert.strictEqual(result.failure._tag, "AuditStagingError");
        assert.strictEqual(result.failure.cause, "staging store offline");
      }
      assert.strictEqual(staged().length, 0);
    }));

  it.effect("failCommitWith fails commit, leaving the handle staged", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged, committed } = AuditStagingPortTest({
        failCommitWith: (handle) => new AuditStagingError({ entry, cause: `commit ${String(handle)} failed` }),
      });

      yield* Effect.gen(function* () {
        const handle = yield* AuditStagingPort.stage(entry);
        const result = yield* Effect.result(AuditStagingPort.commit(handle));
        assert.strictEqual(result._tag, "Failure");
        assert.deepStrictEqual(staged(), [handle]);
        assert.deepStrictEqual(committed(), []);
      }).pipe(Effect.provide(layer));
    }));
});
