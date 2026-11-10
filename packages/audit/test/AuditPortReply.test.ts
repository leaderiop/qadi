/**
 * Every `AuditPortReply` mode, answered through the shipped doubles.
 *
 * A reply that does not behave as named makes a deadline or breaker test pass
 * vacuously — a `Never` that secretly settles would let a hung-store test pass
 * without a deadline. So each non-settling mode is observed past an hour of
 * `TestClock`, through `Effect.timeoutOption`, never by joining an unbounded fiber.
 */
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
import { AuditTrailPort } from "../src/AuditTrailPort.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { decisionRecord } from "./helpers.ts";

/** Whether `eff` settles within an hour of test time. */
const settlesWithinAnHour = <A, E>(eff: Effect.Effect<A, E>) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(Effect.timeoutOption(Effect.exit(eff), "1 hour"));
    yield* TestClock.adjust("1 hour");
    const settled = yield* Fiber.join(fiber);
    return Option.isSome(settled);
  });

describe("AuditPortReply through AuditTrailPortTest", () => {
  it.effect("Ok records the entry", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, written, calls } = AuditTrailPortTest({ write: () => AuditPortReply.Ok() });

      yield* AuditTrailPort.write(entry).pipe(Effect.provide(layer));
      assert.deepStrictEqual(written(), [entry]);
      assert.deepStrictEqual(calls(), [entry]);
    }));

  it.effect("a script answering undefined is Ok", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, written } = AuditTrailPortTest({ write: () => undefined });

      yield* AuditTrailPort.write(entry).pipe(Effect.provide(layer));
      assert.deepStrictEqual(written(), [entry]);
    }));

  it.effect("Fail fails with the port's error, built from the entry and the cause, and records nothing", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, written, calls } = AuditTrailPortTest({
        write: () => AuditPortReply.Fail({ cause: "store offline" }),
      });

      const result = yield* Effect.result(AuditTrailPort.write(entry)).pipe(Effect.provide(layer));
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "AuditWriteError");
        assert.strictEqual(result.failure.entry, entry);
        assert.strictEqual(result.failure.cause, "store offline");
      }
      assert.deepStrictEqual(written(), []);
      assert.deepStrictEqual(calls(), [entry]);
    }));

  it.effect("Die dies with the defect", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const defect = new Error("adapter crashed");
      const { layer, written } = AuditTrailPortTest({ write: () => AuditPortReply.Die({ defect }) });

      const exit = yield* Effect.exit(AuditTrailPort.write(entry)).pipe(Effect.provide(layer));
      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) {
        const found = Cause.findDefect(exit.cause);
        assert.isTrue(Result.isSuccess(found));
        if (Result.isSuccess(found)) assert.strictEqual(found.success, defect);
        assert.isFalse(Cause.hasInterrupts(exit.cause));
      }
      assert.deepStrictEqual(written(), []);
    }));

  it.effect("Interrupt exits interrupted, and the caller carries on", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, written } = AuditTrailPortTest({ write: () => AuditPortReply.Interrupt() });

      const exit = yield* Effect.exit(AuditTrailPort.write(entry)).pipe(Effect.provide(layer));
      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) {
        assert.isTrue(Cause.hasInterruptsOnly(exit.cause));
      }
      assert.deepStrictEqual(written(), []);
      // Reaching this line is the point: the caller was not interrupted.
      const after = yield* Effect.succeed("carried on");
      assert.strictEqual(after, "carried on");
    }));

  it.effect("Never does not settle within an hour, and records nothing", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, written, calls } = AuditTrailPortTest({ write: () => AuditPortReply.Never() });

      const settled = yield* settlesWithinAnHour(AuditTrailPort.write(entry).pipe(Effect.provide(layer)));
      assert.isFalse(settled);
      assert.deepStrictEqual(written(), []);
      assert.deepStrictEqual(calls(), [entry]);
    }));

  it.effect("Latch opens its latch when the call starts, then does not settle", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const latch = yield* Latch.make();
      const { layer, written } = AuditTrailPortTest({ write: () => AuditPortReply.Latch({ latch }) });

      assert.isFalse(Latch.isOpen(latch));
      const fiber = yield* Effect.forkChild(
        Effect.timeoutOption(AuditTrailPort.write(entry).pipe(Effect.provide(layer)), "1 hour"),
      );
      yield* latch.await;
      assert.isTrue(Latch.isOpen(latch));
      yield* TestClock.adjust("1 hour");
      assert.isTrue(Option.isNone(yield* Fiber.join(fiber)));
      assert.deepStrictEqual(written(), []);
    }));

  it.effect("call counts 0, 1, 2 across three writes; calls() logs every mode, written() only Ok", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));
      const c = yield* encodeAuditEntry(decisionRecord({ evaluationId: "c" }));
      const seen: Array<readonly [string, number]> = [];
      const replies = [AuditPortReply.Fail({ cause: "x" }), AuditPortReply.Ok(), AuditPortReply.Die({ defect: "y" })];
      const { layer, written, calls } = AuditTrailPortTest({
        write: (entry, call) => {
          seen.push([entry.record.evaluationId, call]);
          return replies[call];
        },
      });

      yield* Effect.gen(function* () {
        yield* Effect.exit(AuditTrailPort.write(a));
        assert.deepStrictEqual(calls(), [a]);
        yield* Effect.exit(AuditTrailPort.write(b));
        yield* Effect.exit(AuditTrailPort.write(c));
      }).pipe(Effect.provide(layer));

      assert.deepStrictEqual(seen, [
        ["a", 0],
        ["b", 1],
        ["c", 2],
      ]);
      assert.deepStrictEqual(calls(), [a, b, c]);
      assert.deepStrictEqual(written(), [b]);
    }));

  it.effect("without a script, every call is still logged", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const { layer, calls } = AuditTrailPortTest();

      yield* AuditTrailPort.write(entry).pipe(Effect.provide(layer));
      assert.deepStrictEqual(calls(), [entry]);
    }));
});
