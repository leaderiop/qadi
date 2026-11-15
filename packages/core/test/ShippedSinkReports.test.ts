/**
 * Pins that each shipped sink reports a failure exactly once, and names itself.
 *
 * The characterisation rows (C1-C4) were committed green on the phase base, so the
 * count of reports per failure was measured before any change; the rows below
 * them were committed in a later commit, RED on that base. Reports are counted
 * with `collectingLogger`, never `console`. Names are read from the shape
 * `yield* DecisionSink` returns, never through the type, so this file compiles on
 * the base, where `DecisionSinkShape` has no `name`, and its RED is the
 * behaviour's rather than the compiler's (ARCH-93, EMIT-03).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { isAllowed } from "../src/Decision.ts";
import { makeDecisionLog } from "../src/DecisionLog.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { decisionSinkForwarding } from "../src/DecisionSinkForwarding.ts";
import { evaluate } from "../src/Evaluate.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { collectingLogger, subjectWith, testLayer } from "./helpers.ts";
import type { CapturedLog } from "./helpers.ts";

const read = permission("doc", "read");
const allowed = subjectWith({ permissions: ["doc:read"] });
const policy = P.hasPermission(read);

/** A sink that remembers every record it is handed. */
const recording = () => {
  const records: Array<SinkRecord> = [];
  const layer = Layer.succeed(DecisionSink, {
    record: (record) =>
      Effect.sync(() => {
        records.push(record);
      }),
  });
  return { records, layer };
};

/** Asserts exactly one `Warn` line whose `qadi.cause` includes `cause`, and returns it. */
const assertOneLine = (lines: ReadonlyArray<CapturedLog>, cause: string): CapturedLog | undefined => {
  assert.strictEqual(lines.length, 1);
  const line = lines[0];
  assert.strictEqual(line?.level, "Warn");
  assert.include(String(line?.annotations["qadi.cause"]), cause);
  return line;
};

describe("one failure, one report, before and after (EMIT-03)", () => {
  it.effect("C1: a send failure whose onFailure throws is reported exactly once, and the allow is unchanged", () =>
    Effect.gen(function* () {
      const logs = collectingLogger();
      const decision = yield* evaluate(policy).pipe(
        Effect.provide(
          Layer.mergeAll(
            decisionSinkForwarding({
              send: () => Effect.fail("offline"),
              onFailure: () => {
                throw new Error("onFailure exploded");
              },
            }),
            logs.layer,
          ),
        ),
      );

      // The message is not asserted: D-09 moves this report from the forwarder's
      // outer catch to the emitter, and the count is what holds across that change.
      assertOneLine(logs.lines, "onFailure exploded");
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect(
    "C2: a send that throws before returning an effect is reported once as could not be forwarded, and the allow is unchanged",
    () =>
      Effect.gen(function* () {
        const logs = collectingLogger();
        const decision = yield* evaluate(policy).pipe(
          Effect.provide(
            Layer.mergeAll(
              decisionSinkForwarding({
                send: () => {
                  throw new Error("send threw");
                },
              }),
              logs.layer,
            ),
          ),
        );

        const line = assertOneLine(logs.lines, "send threw");
        assert.include(String(line?.message), "could not be forwarded");
        assert.isTrue(isAllowed(decision));
      }).pipe(Effect.provide(testLayer(allowed))),
  );

  it.effect("C3: a refusal whose onFailure throws is reported exactly once, as the hook failing", () =>
    Effect.gen(function* () {
      const logs = collectingLogger();
      const decision = yield* evaluate(policy, { resource: { tags: new Set(["finance"]) } }).pipe(
        Effect.provide(
          Layer.mergeAll(
            decisionSinkForwarding({
              send: () => Effect.void,
              onFailure: () => {
                throw new Error("hook exploded");
              },
            }),
            logs.layer,
          ),
        ),
      );

      const line = assertOneLine(logs.lines, "hook exploded");
      assert.strictEqual(String(line?.message), "qadi: an encode-refusal hook threw");
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("C4: an append that dies is reported once as the append half, nothing is retained, and the next record is kept", () =>
    Effect.gen(function* () {
      const capture = Effect.gen(function* () {
        const sink = recording();
        yield* evaluate(policy).pipe(Effect.provide(sink.layer));
        return sink.records[0];
      });
      const first = yield* capture;
      const second = yield* capture;
      assert.isDefined(first);
      assert.isDefined(second);
      if (first === undefined || second === undefined) return;
      // Enumerable, so the log's copy of the record reads it and throws.
      Object.defineProperty(first, "trap", {
        enumerable: true,
        get: (): unknown => {
          throw new Error("append trap");
        },
      });

      const log = yield* makeDecisionLog({ environment: "test" });
      const logs = collectingLogger();
      yield* log.ingest(first).pipe(Effect.provide(logs.layer));
      const line = assertOneLine(logs.lines, "append trap");
      assert.strictEqual(String(line?.message), "qadi: a decision log's append half failed");
      assert.strictEqual((yield* log.snapshot).length, 0);

      yield* log.ingest(second).pipe(Effect.provide(logs.layer));
      assert.strictEqual(logs.lines.length, 1);
      assert.strictEqual((yield* log.snapshot).length, 1);
    }).pipe(Effect.provide(testLayer(allowed))));
});
