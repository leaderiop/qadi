/**
 * A store call that never settles must not stall the decision that recorded it.
 *
 * Before `storeCallTimeout`, `AuditDecisionSinkLive` ran `stage`, `write` and
 * `commit` with no time limit, and `evaluate` awaits `DecisionSink.record`
 * inline (`SinkEmit.ts`'s `sinkEmitter`): a hung store hung the evaluation, and
 * the breaker never counted it. Each hung call here is observed only through a
 * `TestClock`-driven `Effect.timeoutOption`, so a regression fails fast rather
 * than timing the suite out.
 *
 * Every hung store is a scripted double answering `AuditPortReply.Never`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
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
import { AuditPortReply } from "../src/AuditPortReply.ts";
import type { AuditTrailScript } from "../src/AuditPortReply.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import type { AuditStagingPortTestOptions } from "../src/AuditStagingPortTest.ts";
import { AuditStagingError } from "../src/AuditStagingPort.ts";
import type { AuditTrailPort } from "../src/AuditTrailPort.ts";
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

/** A trail answering `write` from `script`, counting attempts. */
const trailBy = (script: AuditTrailScript) => {
  const { layer, calls } = AuditTrailPortTest({ write: script });
  return { layer, attempts: () => calls().length };
};

/** A sink over `ports`, with every outcome collected in order. */
const sinkOver = (
  ports: Layer.Layer<AuditTrailPort>,
  options?: Omit<AuditDecisionSinkOptions, "onOutcome">,
) => {
  const raw: Array<AuditWriteOutcome> = [];
  const layer = Layer.provide(AuditDecisionSinkLive({ ...options, onOutcome: (o) => raw.push(o) }), ports);
  return { layer, outcomes: () => raw.map(describeOutcome), raw: () => raw };
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

      const trail = trailBy(() => AuditPortReply.Never());
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
      const trail = trailBy(() => AuditPortReply.Never());
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
      const failureThreshold = 1;
      const trail = trailBy((_entry, call) =>
        call < failureThreshold ? AuditPortReply.Fail({ cause: "offline" }) : AuditPortReply.Never(),
      );
      const sink = sinkOver(trail.layer, { failureThreshold });

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

  const stagingWith = (script: Pick<AuditStagingPortTestOptions, "stage" | "commit">) => {
    const { layer: trail, written } = AuditTrailPortTest();
    const sink = sinkOver(Layer.merge(trail, AuditStagingPortTest(script).layer));
    return { sink, written };
  };

  it.effect("a hung stage settles as StageFailed and the write still happens", () =>
    Effect.gen(function* () {
      const { sink, written } = stagingWith({ stage: () => AuditPortReply.Never() });

      yield* Effect.gen(function* () {
        const fiber = yield* forkRecord(decisionRecord());
        yield* TestClock.adjust(PAST_DEADLINE);
        assert.deepStrictEqual(sink.outcomes(), ["Written/StageFailed"]);
        assert.strictEqual(written().length, 1);
        yield* TestClock.adjust(OBSERVE);
        yield* Fiber.join(fiber);
      }).pipe(Effect.provide(sink.layer));
    }));

  it.effect("a hung commit's cause is the staging error for its entry, carrying a TimeoutError", () =>
    Effect.gen(function* () {
      const trail = AuditTrailPortTest();
      const staging = AuditStagingPortTest({ commit: () => AuditPortReply.Never() });
      const sink = sinkOver(Layer.merge(trail.layer, staging.layer), { storeCallTimeout: "2 seconds" });

      yield* Effect.gen(function* () {
        const fiber = yield* forkRecord(decisionRecord());
        yield* TestClock.adjust("2 seconds");
        const [outcome] = sink.raw();
        assert.strictEqual(outcome?._tag, "Written");
        const staged = outcome?._tag === "Written" ? outcome.staging : undefined;
        assert.strictEqual(staged?._tag, "CommitFailed");
        const error = staged?._tag === "CommitFailed" ? Cause.squash(staged.cause) : undefined;
        assert.instanceOf(error, AuditStagingError);
        assert.strictEqual(error instanceof AuditStagingError ? error.entry : undefined, staging.stageCalls()[0]);
        const cause = error instanceof AuditStagingError ? error.cause : undefined;
        assert.isTrue(Cause.isTimeoutError(cause), "the deadline is the cause");
        assert.strictEqual(
          Cause.isTimeoutError(cause) ? cause.message : undefined,
          "audit store call did not settle within 2s",
        );
        yield* Fiber.join(fiber);
      }).pipe(Effect.provide(sink.layer));
    }));

  for (const [label, options] of [
    ["the default deadline", undefined],
    ["a one-millisecond deadline", { storeCallTimeout: "1 millis" }],
  ] as const) {
    it.effect(`a healthy store under ${label} is Written and Committed`, () =>
      Effect.gen(function* () {
        const trail = AuditTrailPortTest();
        const sink = sinkOver(Layer.merge(trail.layer, AuditStagingPortTest().layer), options);
        yield* DecisionSink.use((s) => s.record(decisionRecord())).pipe(Effect.provide(sink.layer));
        assert.deepStrictEqual(sink.outcomes(), ["Written/Committed"]);
        assert.strictEqual(trail.written().length, 1);
      }));
  }

  it.effect("a hung commit settles as CommitFailed after a successful write", () =>
    Effect.gen(function* () {
      const { sink, written } = stagingWith({ commit: () => AuditPortReply.Never() });

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

describe("AuditDecisionSinkLive — the deadline's boundaries", () => {
  it.effect("a caller interrupting a write before the deadline is not a store failure (BEH-QD-251)", () =>
    Effect.gen(function* () {
      const arrived = yield* Latch.make();
      const trail = trailBy((_entry, call) => (call === 0 ? AuditPortReply.Latch({ latch: arrived }) : undefined));
      const sink = sinkOver(trail.layer, { failureThreshold: 1 });

      yield* Effect.gen(function* () {
        const fiber = yield* forkRecord(decisionRecord({ evaluationId: "interrupted" }));
        yield* arrived.await;
        yield* TestClock.adjust("4 seconds"); // inside the 5 s deadline
        yield* Fiber.interrupt(fiber);
        yield* DecisionSink.use((s) => s.record(decisionRecord({ evaluationId: "next" })));
        assert.deepStrictEqual(sink.outcomes(), ["Written/NotWired"], "the breaker is still Closed");
        assert.strictEqual(trail.attempts(), 2);
      }).pipe(Effect.provide(sink.layer));
    }));

  it.effect("a caller interrupting a half-open probe releases the claim: a later record is the probe", () =>
    Effect.gen(function* () {
      const arrived = yield* Latch.make();
      const trail = trailBy((_entry, call) =>
        call === 0
          ? AuditPortReply.Fail({ cause: "offline" })
          : call === 1
            ? AuditPortReply.Latch({ latch: arrived })
            : undefined,
      );
      const sink = sinkOver(trail.layer, { failureThreshold: 1 });

      yield* Effect.gen(function* () {
        const record = (evaluationId: string) =>
          DecisionSink.use((s) => s.record(decisionRecord({ evaluationId })));
        yield* record("opens");
        yield* TestClock.adjust("30 seconds");
        const probe = yield* forkRecord(decisionRecord({ evaluationId: "probe" }));
        yield* arrived.await;
        yield* Fiber.interrupt(probe);
        yield* record("reopened");
        yield* TestClock.adjust("30 seconds");
        yield* record("second-probe");
        assert.deepStrictEqual(sink.outcomes(), ["WriteFailed/NotWired", "Skipped/NotWired", "Written/NotWired"]);
        assert.strictEqual(trail.attempts(), 3, "the interrupted probe and the second probe both reached the store");
      }).pipe(Effect.provide(sink.layer));
    }));

  it.effect("a write that interrupts itself is a failed attempt: WriteFailed, then Skipped", () =>
    Effect.gen(function* () {
      const trail = trailBy(() => AuditPortReply.Interrupt());
      const sink = sinkOver(trail.layer, { failureThreshold: 1 });

      yield* Effect.gen(function* () {
        yield* DecisionSink.use((s) => s.record(decisionRecord({ evaluationId: "self-interrupts" })));
        yield* DecisionSink.use((s) => s.record(decisionRecord({ evaluationId: "after" })));
        assert.deepStrictEqual(sink.outcomes(), ["WriteFailed/NotWired", "Skipped/NotWired"]);
        assert.strictEqual(trail.attempts(), 1);
      }).pipe(Effect.provide(sink.layer));
    }));

  it.effect("storeCallTimeout: Duration.infinity opts out: a hung write is still pending after an hour", () =>
    Effect.gen(function* () {
      const trail = trailBy(() => AuditPortReply.Never());
      const sink = sinkOver(trail.layer, { storeCallTimeout: Duration.infinity });

      yield* Effect.gen(function* () {
        const fiber = yield* forkRecord(decisionRecord());
        yield* TestClock.adjust(OBSERVE);
        const settled = yield* Fiber.join(fiber);
        assert.isTrue(Option.isNone(settled), "only the test's own one-hour bound ended it");
        assert.deepStrictEqual(sink.outcomes(), []);
        assert.strictEqual(trail.attempts(), 1);
      }).pipe(Effect.provide(sink.layer));
    }));

  it.effect("storeCallTimeout: Duration.zero (pinned, not chosen): the call starts, then fails at once", () =>
    Effect.gen(function* () {
      const arrived = yield* Latch.make();
      const trail = trailBy(() => AuditPortReply.Latch({ latch: arrived }));
      const sink = sinkOver(trail.layer, { storeCallTimeout: Duration.zero });

      yield* Effect.gen(function* () {
        const fiber = yield* forkRecord(decisionRecord());
        const settled = yield* Fiber.join(fiber); // no clock adjust: it settled without time passing
        assert.isTrue(Option.isSome(settled));
        assert.isTrue(yield* arrived.close, "the store call started: its latch was open");
        assert.deepStrictEqual(sink.outcomes(), ["WriteFailed/NotWired"]);
      }).pipe(Effect.provide(sink.layer));
    }));

  for (const [label, script, outcome] of [
    ["stage", { stage: (_entry: unknown, call: number) => (call === 0 ? AuditPortReply.Never() : undefined) }, "Written/StageFailed"],
    ["commit", { commit: (_h: unknown, _e: unknown, call: number) => (call === 0 ? AuditPortReply.Never() : undefined) }, "Written/CommitFailed"],
  ] as const) {
    it.effect(`a ${label} past the deadline changes only the staging status and does not move the breaker`, () =>
      Effect.gen(function* () {
        const trail = AuditTrailPortTest();
        const sink = sinkOver(Layer.merge(trail.layer, AuditStagingPortTest(script).layer), { failureThreshold: 1 });

        yield* Effect.gen(function* () {
          const fiber = yield* forkRecord(decisionRecord({ evaluationId: "hung" }));
          yield* TestClock.adjust(PAST_DEADLINE);
          yield* Fiber.join(fiber);
          yield* DecisionSink.use((s) => s.record(decisionRecord({ evaluationId: "next" })));
          assert.deepStrictEqual(sink.outcomes(), [outcome, "Written/Committed"]);
          assert.strictEqual(trail.written().length, 2, "the breaker stayed Closed");
        }).pipe(Effect.provide(sink.layer));
      }));
  }
});
