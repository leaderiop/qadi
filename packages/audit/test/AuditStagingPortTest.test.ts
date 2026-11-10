import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as TestClock from "effect/testing/TestClock";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import { AuditPortReply } from "../src/AuditPortReply.ts";
import { AuditStagingPort } from "../src/AuditStagingPort.ts";
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

  it.effect("options present without stage or commit scripts still stage and commit normally", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      // `options` itself is truthy here, unlike AuditStagingPortTest() with
      // no arguments at all — exercises the "options defined, script absent"
      // paths `options?.stage` and `options?.commit` specifically guard.
      const { layer, staged, committed } = AuditStagingPortTest({});

      yield* Effect.gen(function* () {
        const handle = yield* AuditStagingPort.stage(entry);
        yield* AuditStagingPort.commit(handle);
        assert.deepStrictEqual(staged(), []);
        assert.deepStrictEqual(committed(), [handle]);
      }).pipe(Effect.provide(layer));
    }));

  it.effect("a scripted Ok stage issues the next handle and lists it as staged", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged, stageCalls } = AuditStagingPortTest({ stage: () => AuditPortReply.Ok() });

      const handle = yield* AuditStagingPort.stage(entry).pipe(Effect.provide(layer));
      assert.strictEqual(handle, 0);
      assert.deepStrictEqual(staged(), [0]);
      assert.deepStrictEqual(stageCalls(), [entry]);
    }));

  it.effect("a scripted Fail stage fails with the staged entry and the cause, and issues no handle", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged, stageCalls } = AuditStagingPortTest({
        stage: (_entry, call) => (call === 0 ? AuditPortReply.Fail({ cause: "staging offline" }) : undefined),
      });

      yield* Effect.gen(function* () {
        const result = yield* Effect.result(AuditStagingPort.stage(entry));
        assert.isTrue(Result.isFailure(result));
        if (Result.isFailure(result)) {
          assert.strictEqual(result.failure._tag, "AuditStagingError");
          assert.strictEqual(result.failure.entry, entry);
          assert.strictEqual(result.failure.cause, "staging offline");
        }
        assert.deepStrictEqual(staged(), []);
        // The failed call issued nothing, so the next one gets handle 0.
        assert.strictEqual(yield* AuditStagingPort.stage(entry), 0);
      }).pipe(Effect.provide(layer));
      assert.deepStrictEqual(stageCalls(), [entry, entry]);
    }));

  it.effect("a scripted Ok commit moves the handle to committed", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged, committed, commitCalls } = AuditStagingPortTest({
        commit: () => AuditPortReply.Ok(),
      });

      yield* Effect.gen(function* () {
        const handle = yield* AuditStagingPort.stage(entry);
        yield* AuditStagingPort.commit(handle);
        assert.deepStrictEqual(staged(), []);
        assert.deepStrictEqual(committed(), [handle]);
        assert.deepStrictEqual(commitCalls(), [handle]);
      }).pipe(Effect.provide(layer));
    }));

  it.effect("a scripted Fail commit carries the entry staged under that handle, not another", () =>
    Effect.gen(function* () {
      const first = yield* encodeAuditEntry(decisionRecord({ evaluationId: "first" }));
      const second = yield* encodeAuditEntry(decisionRecord({ evaluationId: "second" }));
      const seen: Array<readonly [unknown, string, number]> = [];
      const { layer, staged, committed } = AuditStagingPortTest({
        commit: (handle, entry, call) => {
          seen.push([handle, entry.record.evaluationId, call]);
          return AuditPortReply.Fail({ cause: "commit refused" });
        },
      });

      yield* Effect.gen(function* () {
        const a = yield* AuditStagingPort.stage(first);
        const b = yield* AuditStagingPort.stage(second);
        const result = yield* Effect.result(AuditStagingPort.commit(a));
        assert.isTrue(Result.isFailure(result));
        if (Result.isFailure(result)) {
          assert.strictEqual(result.failure._tag, "AuditStagingError");
          assert.strictEqual(result.failure.entry, first);
          assert.strictEqual(result.failure.cause, "commit refused");
        }
        yield* Effect.result(AuditStagingPort.commit(b));
        assert.deepStrictEqual(staged(), [a, b]);
        assert.deepStrictEqual(committed(), []);
      }).pipe(Effect.provide(layer));
      assert.deepStrictEqual(seen, [
        [0, "first", 0],
        [1, "second", 1],
      ]);
    }));

  it.effect("a commit of a handle never issued is scripted with the most recent stage's entry", () =>
    Effect.gen(function* () {
      const first = yield* encodeAuditEntry(decisionRecord({ evaluationId: "first" }));
      const second = yield* encodeAuditEntry(decisionRecord({ evaluationId: "second" }));
      const third = yield* encodeAuditEntry(decisionRecord({ evaluationId: "third" }));
      const seen: Array<readonly [unknown, string]> = [];
      const { layer, committed, commitCalls } = AuditStagingPortTest({
        stage: (entry) => (entry === third ? AuditPortReply.Fail({ cause: "x" }) : undefined),
        commit: (handle, entry) => {
          seen.push([handle, entry.record.evaluationId]);
          return undefined;
        },
      });

      yield* Effect.gen(function* () {
        yield* AuditStagingPort.stage(first);
        yield* AuditStagingPort.stage(second);
        yield* Effect.result(AuditStagingPort.stage(third));
        yield* AuditStagingPort.commit("forged");
      }).pipe(Effect.provide(layer));
      assert.deepStrictEqual(seen, [["forged", "third"]]);
      assert.deepStrictEqual(committed(), ["forged"]);
      assert.deepStrictEqual(commitCalls(), ["forged"]);
    }));

  it.effect("a scripted commit before any stage dies: there is no entry to answer with", () =>
    Effect.gen(function* () {
      let consulted = false;
      const { layer, committed, commitCalls } = AuditStagingPortTest({
        commit: () => {
          consulted = true;
          return undefined;
        },
      });

      const exit = yield* Effect.exit(AuditStagingPort.commit(7)).pipe(Effect.provide(layer));
      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) {
        const defect = Cause.findDefect(exit.cause);
        assert.isTrue(Result.isSuccess(defect));
        if (Result.isSuccess(defect)) assert.include(String(defect.success), "no entry to answer with");
      }
      assert.isFalse(consulted);
      assert.deepStrictEqual(committed(), []);
      assert.deepStrictEqual(commitCalls(), [7]);
    }));

  it.effect("without a commit script, a never-issued handle commits as before", () =>
    Effect.gen(function* () {
      const { layer, committed, commitCalls } = AuditStagingPortTest();

      yield* AuditStagingPort.commit(7).pipe(Effect.provide(layer));
      assert.deepStrictEqual(committed(), [7]);
      assert.deepStrictEqual(commitCalls(), [7]);
    }));

  it.effect("Never and Latch on stage and commit do not settle within an hour", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const stageLatch = yield* Latch.make();
      const commitLatch = yield* Latch.make();
      const { layer, staged, committed, stageCalls, commitCalls } = AuditStagingPortTest({
        stage: (_entry, call) =>
          call === 0 ? undefined : call === 1 ? AuditPortReply.Never() : AuditPortReply.Latch({ latch: stageLatch }),
        commit: (_handle, _entry, call) =>
          call === 0 ? AuditPortReply.Never() : AuditPortReply.Latch({ latch: commitLatch }),
      });

      yield* Effect.gen(function* () {
        const handle = yield* AuditStagingPort.stage(entry);
        const fibers = [
          yield* Effect.forkChild(Effect.timeoutOption(AuditStagingPort.stage(entry), "1 hour")),
          yield* Effect.forkChild(Effect.timeoutOption(AuditStagingPort.stage(entry), "1 hour")),
          yield* Effect.forkChild(Effect.timeoutOption(AuditStagingPort.commit(handle), "1 hour")),
          yield* Effect.forkChild(Effect.timeoutOption(AuditStagingPort.commit(handle), "1 hour")),
        ];
        yield* stageLatch.await;
        yield* commitLatch.await;
        yield* TestClock.adjust("1 hour");
        for (const fiber of fibers) {
          const settled: Option.Option<unknown> = yield* Fiber.join(fiber);
          assert.isTrue(Option.isNone(settled));
        }
        assert.deepStrictEqual(staged(), [handle]);
        assert.deepStrictEqual(committed(), []);
      }).pipe(Effect.provide(layer));
      assert.strictEqual(stageCalls().length, 3);
      assert.strictEqual(commitCalls().length, 2);
    }));

  it.effect("Die and Interrupt on commit leave the handle staged", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, staged, committed } = AuditStagingPortTest({
        commit: (_handle, _entry, call) =>
          call === 0 ? AuditPortReply.Die({ defect: "boom" }) : AuditPortReply.Interrupt(),
      });

      yield* Effect.gen(function* () {
        const handle = yield* AuditStagingPort.stage(entry);
        const died = yield* Effect.exit(AuditStagingPort.commit(handle));
        assert.isTrue(Exit.isFailure(died) && Cause.hasDies(died.cause));
        const interrupted = yield* Effect.exit(AuditStagingPort.commit(handle));
        assert.isTrue(Exit.isFailure(interrupted) && Cause.hasInterruptsOnly(interrupted.cause));
        assert.deepStrictEqual(staged(), [handle]);
        assert.deepStrictEqual(committed(), []);
      }).pipe(Effect.provide(layer));
    }));
});
