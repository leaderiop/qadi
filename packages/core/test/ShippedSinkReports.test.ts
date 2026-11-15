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
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Option from "effect/Option";
import { isAllowed } from "../src/Decision.ts";
import { makeDecisionLog } from "../src/DecisionLog.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { decisionSinkAll, decisionSinkForwarding } from "../src/DecisionSinkForwarding.ts";
import { evaluate } from "../src/Evaluate.ts";
import { evaluationEnvironment } from "../src/EvaluationEnvironment.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { portsLayer } from "../src/Ports.ts";
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

describe("every shipped sink names itself (EMIT-03, D-06)", () => {
  it.effect("N1: decisionSinkForwarding names itself", () =>
    Effect.gen(function* () {
      assert.propertyVal(yield* DecisionSink, "name", "decisionSinkForwarding");
    }).pipe(Effect.provide(decisionSinkForwarding({ send: () => Effect.void }))));

  it.effect("N2: decisionSinkAll names itself, and an empty fan-out reports nothing", () =>
    Effect.gen(function* () {
      const sink = decisionSinkAll([]);
      assert.propertyVal(yield* DecisionSink.pipe(Effect.provide(sink)), "name", "decisionSinkAll");

      const logs = collectingLogger();
      const decision = yield* evaluate(policy).pipe(Effect.provide(Layer.mergeAll(sink, logs.layer)));
      assert.isTrue(isAllowed(decision));
      assert.strictEqual(logs.lines.length, 0);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("N3: a decision log names its sink decisionLog", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "test" });
      assert.propertyVal(yield* DecisionSink.pipe(Effect.provide(log.layer)), "name", "decisionLog");
    }));

  it.effect("N4: the sinkAndCache shadow names its sink evaluationEnvironment.shadow", () =>
    Effect.gen(function* () {
      const shadow = evaluationEnvironment({
        ports: portsLayer(),
        idPrefix: "x",
        clock: Layer.empty,
        shadow: "sinkAndCache",
      });
      // `serviceOption`: the environment's declared outputs do not list the sink it shadows with.
      const installed = yield* Effect.serviceOption(DecisionSink).pipe(Effect.provide(shadow));
      assert.isTrue(Option.isSome(installed));
      assert.propertyVal(Option.getOrUndefined(installed), "name", "evaluationEnvironment.shadow");
    }));
});

const MEMBER_REPORT = "qadi: a fanned-out decision sink failed unexpectedly";
const SINK_REPORT = "qadi: a decision sink failed; the record was not delivered";

/** What a report must never carry: the question's own content. */
const WITHHELD = ["subjectid", "resource", "resourceid", "policy", "action"];

/** Asserts one line that is the fan-out's report of the member `sink`, whose failure said `cause`. */
const assertMemberReport = (lines: ReadonlyArray<CapturedLog>, sink: string, cause: string): void => {
  const line = assertOneLine(lines, cause);
  assert.strictEqual(String(line?.message), MEMBER_REPORT);
  assert.strictEqual(line?.annotations["qadi.sink"], sink);
  for (const key of Object.keys(line?.annotations ?? {})) {
    assert.isFalse(
      WITHHELD.some((word) => key.toLowerCase().includes(word)),
      `the report carries an annotation named ${key}`,
    );
  }
};

/** Evaluates under a fan-out of `members` with `logger` installed. */
const evaluateFanOut = (members: ReadonlyArray<Layer.Layer<DecisionSink>>, logger: Layer.Layer<never>) =>
  evaluate(policy).pipe(Effect.provide(Layer.mergeAll(decisionSinkAll(members), logger)));

const dyingMember = (text: string) =>
  Layer.succeed(DecisionSink, { record: () => Effect.die(new Error(text)) });

const billing = { name: "billing-audit", record: () => Effect.die(new Error("billing down")) };

describe("a fan-out names the member that failed and keeps going (EMIT-03, D-10)", () => {
  it.effect("A1: an unnamed member that dies is reported once as unnamed, and the next member still records", () =>
    Effect.gen(function* () {
      const logs = collectingLogger();
      const after = recording();
      const decision = yield* evaluateFanOut([dyingMember("member died"), after.layer], logs.layer);

      assertMemberReport(logs.lines, "unnamed", "member died");
      assert.strictEqual(after.records.length, 1);
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("A2: a named member that dies is reported once with its name", () =>
    Effect.gen(function* () {
      const logs = collectingLogger();
      const after = recording();
      const decision = yield* evaluateFanOut([Layer.succeed(DecisionSink, billing), after.layer], logs.layer);

      assertMemberReport(logs.lines, "billing-audit", "billing down");
      assert.strictEqual(after.records.length, 1);
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("A3: a member whose name getter throws is reported once as unnamed, and the next member still records", () =>
    Effect.gen(function* () {
      const hostile = {
        get name(): string {
          throw new Error("name getter exploded");
        },
        record: () => Effect.die(new Error("member died")),
      };
      const logs = collectingLogger();
      const after = recording();
      const decision = yield* evaluateFanOut([Layer.succeed(DecisionSink, hostile), after.layer], logs.layer);

      assertMemberReport(logs.lines, "unnamed", "member died");
      assert.strictEqual(after.records.length, 1);
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("A4: a member whose record throws before returning an effect is reported once, and the next member still records", () =>
    Effect.gen(function* () {
      const throwing = Layer.succeed(DecisionSink, {
        record: () => {
          throw new Error("member threw");
        },
      });
      const logs = collectingLogger();
      const after = recording();
      const decision = yield* evaluateFanOut([throwing, after.layer], logs.layer);

      assertMemberReport(logs.lines, "unnamed", "member threw");
      assert.strictEqual(after.records.length, 1);
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("A5: a nested fan-out reports a dying member once, at the innermost level, naming that member", () =>
    Effect.gen(function* () {
      const logs = collectingLogger();
      const after = recording();
      const inner = decisionSinkAll([Layer.succeed(DecisionSink, billing)]);
      const decision = yield* evaluateFanOut([inner, after.layer], logs.layer);

      assertMemberReport(logs.lines, "billing-audit", "billing down");
      assert.strictEqual(after.records.length, 1);
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("A6: a logger that throws while a member is reported does not stop the next member", () =>
    Effect.gen(function* () {
      const exploding = Logger.layer([
        Logger.make(() => {
          throw new Error("logger exploded");
        }),
      ]);
      const after = recording();
      const decision = yield* evaluateFanOut([dyingMember("member died"), after.layer], exploding);

      assert.strictEqual(after.records.length, 1);
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("a fan-out and an interruption (EMIT-03)", () => {
  it.effect("A7: a member that interrupts itself is reported once, and the next member still records", () =>
    Effect.gen(function* () {
      const logs = collectingLogger();
      const after = recording();
      const selfInterrupting = Layer.succeed(DecisionSink, { record: () => Effect.interrupt });
      const decision = yield* evaluateFanOut([selfInterrupting, after.layer], logs.layer);

      assertMemberReport(logs.lines, "unnamed", "Interrupt");
      assert.strictEqual(after.records.length, 1);
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("A8: interrupting the evaluation while a member runs ends as an interrupt and reports nothing", () =>
    Effect.gen(function* () {
      const entered = yield* Deferred.make<void>();
      const logs = collectingLogger();
      const after = recording();
      const blocked = Layer.succeed(DecisionSink, {
        record: () => Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never)),
      });

      const fiber = yield* Effect.forkChild(evaluateFanOut([blocked, after.layer], logs.layer));
      yield* Deferred.await(entered);
      const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

      assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause));
      assert.strictEqual(logs.lines.length, 0);
      assert.strictEqual(after.records.length, 0);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("a forwarder's own failures (EMIT-03, D-09)", () => {
  it.effect("F1: a send that throws before returning an effect reaches onFailure as the thrown error, and nothing is logged", () =>
    Effect.gen(function* () {
      const seen: Array<unknown> = [];
      const logs = collectingLogger();
      const decision = yield* evaluate(policy).pipe(
        Effect.provide(
          Layer.mergeAll(
            decisionSinkForwarding({
              send: () => {
                throw new Error("send threw");
              },
              onFailure: (error) => {
                seen.push(error);
              },
            }),
            logs.layer,
          ),
        ),
      );

      assert.strictEqual(seen.length, 1);
      assert.instanceOf(seen[0], Error);
      assert.strictEqual(seen[0] instanceof Error ? seen[0].message : undefined, "send threw");
      assert.strictEqual(logs.lines.length, 0);
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("F2: a send failure whose onFailure throws is reported by the emitter, naming decisionSinkForwarding", () =>
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

      const line = assertOneLine(logs.lines, "onFailure exploded");
      assert.strictEqual(String(line?.message), SINK_REPORT);
      assert.strictEqual(line?.annotations["qadi.sink"], "decisionSinkForwarding");
      assert.strictEqual(line?.annotations["qadi.record_tag"], "Decision");
      assert.isTrue(isAllowed(decision));
    }).pipe(Effect.provide(testLayer(allowed))));
});
