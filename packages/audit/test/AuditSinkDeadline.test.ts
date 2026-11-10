/**
 * A store call that never settles must not stall the decision that recorded it.
 *
 * Before this file, `AuditDecisionSinkLive` ran `stage`, `write` and `commit`
 * with no time limit, and `evaluate` awaits `DecisionSink.record` inline
 * (`SinkEmit.ts`'s `sinkEmitter`): a hung store hung the evaluation, and the
 * breaker never counted it. Each hung call here is observed only through a
 * `TestClock`-driven `Effect.timeoutOption`, so a regression fails fast rather
 * than timing the suite out.
 *
 * The ports are hand-written for now; the scripted doubles replace them later
 * in this phase.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as TestClock from "effect/testing/TestClock";
import {
  currentSubjectLayer,
  DecisionSink,
  evaluate,
  EvaluationServicesNone,
  hasPermission,
  makeSubject,
} from "@qadi/core";
import type { SinkRecord } from "@qadi/core";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import type { AuditDecisionSinkOptions } from "../src/AuditDecisionSinkLive.ts";
import { AuditStagingPort } from "../src/AuditStagingPort.ts";
import type { AuditStagingPortShape } from "../src/AuditStagingPort.ts";
import { AuditTrailPort, AuditWriteError } from "../src/AuditTrailPort.ts";
import type { AuditTrailPortShape } from "../src/AuditTrailPort.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import type { AuditWriteOutcome } from "../src/AuditWriteOutcome.ts";
import { decisionRecord, read } from "./helpers.ts";

const alice = makeSubject({ id: "alice", permissions: ["doc:read"] });

/** Long enough that only a hang reaches it: the bound a test observes a record through. */
const OBSERVE = "1 hour";

/** Past a 5 s deadline, well inside the 30 s reset timeout. */
const PAST_DEADLINE = "6 seconds";

/** An outcome and its staging in one comparable string, e.g. "Written/Committed". */
const describeOutcome = (outcome: AuditWriteOutcome): string =>
  "staging" in outcome ? `${outcome._tag}/${outcome.staging._tag}` : outcome._tag;

/** A trail whose first `write` is `first` and every later one never settles, counting attempts. */
const trailBy = (first: AuditTrailPortShape["write"]) => {
  let attempts = 0;
  const layer = Layer.succeed(AuditTrailPort, {
    write: (entry) => {
      attempts++;
      return attempts === 1 ? first(entry) : Effect.never;
    },
  });
  return { layer, attempts: () => attempts };
};

/** A sink over `ports`, with every outcome collected in order. */
const sinkOver = (
  ports: Layer.Layer<AuditTrailPort>,
  options?: Omit<AuditDecisionSinkOptions, "onOutcome">,
) => {
  const outcomes: Array<string> = [];
  const layer = Layer.provide(
    AuditDecisionSinkLive({ ...options, onOutcome: (o) => outcomes.push(describeOutcome(o)) }),
    ports,
  );
  return { layer, outcomes: () => outcomes };
};

/** Forks `record` bounded by {@link OBSERVE}, so the test can advance the clock past it. */
const forkRecord = (sinkRecord: SinkRecord) =>
  DecisionSink.use((sink) => Effect.forkChild(Effect.timeoutOption(sink.record(sinkRecord), OBSERVE)));

describe("AuditDecisionSinkLive — a store call that never settles", () => {
  it.effect("a trail write that never settles does not stall evaluate", () =>
    Effect.gen(function* () {
      const policy = hasPermission(read);
      const subject = currentSubjectLayer(alice);
      const unsunk = yield* evaluate(policy).pipe(Effect.provide(Layer.merge(EvaluationServicesNone, subject)));

      const trail = trailBy(() => Effect.never);
      const sink = Layer.provide(AuditDecisionSinkLive(), trail.layer);
      const fiber = yield* Effect.forkChild(
        evaluate(policy).pipe(
          Effect.provide(Layer.mergeAll(EvaluationServicesNone, subject, sink)),
          Effect.timeoutOption(OBSERVE),
        ),
      );
      yield* TestClock.adjust(OBSERVE);
      const settled = yield* Fiber.join(fiber);

      assert.strictEqual(trail.attempts(), 1, "the sink was reached");
      assert.strictEqual(
        Option.getOrUndefined(settled)?._tag,
        unsunk._tag,
        "evaluate settled with the decision it gives without a sink (INV-QD-035)",
      );
    }));

  it.effect("with failureThreshold 1, the first hung write opens the breaker and later records are Skipped", () =>
    Effect.gen(function* () {
      const trail = trailBy(() => Effect.never);
      const sink = sinkOver(trail.layer, { failureThreshold: 1 });

      yield* Effect.gen(function* () {
        const fibers: Array<Fiber.Fiber<Option.Option<void>>> = [];
        for (const evaluationId of ["hung", "after-1", "after-2"]) {
          fibers.push(yield* forkRecord(decisionRecord({ evaluationId })));
          yield* TestClock.adjust(PAST_DEADLINE);
        }
        assert.deepStrictEqual(sink.outcomes(), ["WriteFailed/NotWired", "Skipped/NotWired", "Skipped/NotWired"]);
        assert.strictEqual(trail.attempts(), 1, "only the first record reached the store");
        yield* TestClock.adjust(OBSERVE);
        yield* Fiber.joinAll(fibers);
      }).pipe(Effect.provide(sink.layer));
    }));

  it.effect("a hung half-open probe settles and reopens the breaker", () =>
    Effect.gen(function* () {
      const trail = trailBy((entry) => Effect.fail(new AuditWriteError({ entry, cause: "offline" })));
      const sink = sinkOver(trail.layer, { failureThreshold: 1 });

      yield* Effect.gen(function* () {
        const opened = yield* forkRecord(decisionRecord({ evaluationId: "opens" }));
        yield* TestClock.adjust("30 seconds"); // past resetTimeoutMs: the next record is the probe
        const probe = yield* forkRecord(decisionRecord({ evaluationId: "probe" }));
        yield* TestClock.adjust(PAST_DEADLINE);
        assert.deepStrictEqual(sink.outcomes(), ["WriteFailed/NotWired", "WriteFailed/NotWired"]);

        const later = yield* forkRecord(decisionRecord({ evaluationId: "inside-the-reset-window" }));
        yield* TestClock.adjust(PAST_DEADLINE);
        assert.deepStrictEqual(sink.outcomes().slice(2), ["Skipped/NotWired"]);
        assert.strictEqual(trail.attempts(), 2, "the reopened breaker attempted no further write");
        yield* TestClock.adjust(OBSERVE);
        yield* Fiber.joinAll([opened, probe, later]);
      }).pipe(Effect.provide(sink.layer));
    }));

  const stagingWith = (shape: AuditStagingPortShape) => {
    const { layer: trail, written } = AuditTrailPortTest();
    const sink = sinkOver(Layer.merge(trail, Layer.succeed(AuditStagingPort, shape)));
    return { sink, written };
  };

  it.effect("a hung stage settles as StageFailed and the write still happens", () =>
    Effect.gen(function* () {
      const { sink, written } = stagingWith({ stage: () => Effect.never, commit: () => Effect.void });

      yield* Effect.gen(function* () {
        const fiber = yield* forkRecord(decisionRecord());
        yield* TestClock.adjust(PAST_DEADLINE);
        assert.deepStrictEqual(sink.outcomes(), ["Written/StageFailed"]);
        assert.strictEqual(written().length, 1);
        yield* TestClock.adjust(OBSERVE);
        yield* Fiber.join(fiber);
      }).pipe(Effect.provide(sink.layer));
    }));

  it.effect("a hung commit settles as CommitFailed after a successful write", () =>
    Effect.gen(function* () {
      const { sink, written } = stagingWith({ stage: () => Effect.succeed(0), commit: () => Effect.never });

      yield* Effect.gen(function* () {
        const fiber = yield* forkRecord(decisionRecord());
        yield* TestClock.adjust(PAST_DEADLINE);
        assert.deepStrictEqual(sink.outcomes(), ["Written/CommitFailed"]);
        assert.strictEqual(written().length, 1);
        yield* TestClock.adjust(OBSERVE);
        yield* Fiber.join(fiber);
      }).pipe(Effect.provide(sink.layer));
    }));
});
