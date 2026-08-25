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

  it.effect("distinct stages hand out distinct handles", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged } = AuditStagingPortTest();

      yield* Effect.gen(function* () {
        const a = yield* AuditStagingPort.stage(entry);
        const b = yield* AuditStagingPort.stage(entry);
        assert.notStrictEqual(a, b);
        assert.strictEqual(staged().length, 2);
      }).pipe(Effect.provide(layer));
    }));

  it.effect("failStageWith fails stage without minting a handle", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const failure = new AuditStagingError({ entry, cause: "staging store offline" });
      const { layer, staged } = AuditStagingPortTest({ failStageWith: () => failure });

      const result = yield* Effect.result(AuditStagingPort.stage(entry)).pipe(Effect.provide(layer));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure, failure);
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
