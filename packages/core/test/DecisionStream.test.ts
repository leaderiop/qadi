/**
 * The decision stream's order, written by `encodeDecisionStream` (ARCH-60): the
 * backlog in cursor order whatever a log returned, one `synced` counting the
 * backlog frames kept, then live frames, each record frame carrying its cursor.
 *
 * Driven over a structural `readEntries` fake and an `encodeRecord` that answers
 * with the evaluation id (or `None` to drop a record), so each rule of the order is
 * pinned without a codec or a transport. The route's bytes are `@qadi/http`'s
 * `decisionStream.test.ts`.
 *
 * `decodeDecisionStream` reads the order back, so the two properties that join
 * the directions live here too: the round trip, and the resume a backlog sent out
 * of cursor order broke. A mutant in either direction is killed by this
 * package's own tests; the transports keep only the tests of what they adapt.
 *
 * Nothing here waits on a stream that can run forever unless `TestClock` drives
 * it: the properties feed the decoder finite frames, and a live read is bounded by
 * `Stream.take` against frames the test itself queued.
 */
import { assert, describe, it } from "@effect/vitest";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import fc from "fast-check";
import {
  Allow,
  Decided,
  DecisionRecord,
  ObligationRecord,
  decodeDecisionStream,
  decodeStoredRecordString,
  encodeDecisionStream,
  encodeStoredRecordString,
  hasPermission,
  makeDecisionLog,
  makeSubjectId,
  permission,
  stampRecord,
} from "../src/index.ts";
import type {
  DecisionLog,
  DecisionLogEntries,
  DecisionStreamFrame,
  DecisionStreamRead,
  LogCursor,
  LogEntry,
  ReceivedFrame,
  SinkRecord,
  StoredRecord,
} from "../src/index.ts";

const entry = (seq: number, evaluationId = `r${seq}`): LogEntry => ({
  cursor: { epoch: 7, seq },
  record: stampRecord(
    new ObligationRecord({ evaluationId, at: 100 - seq, outcome: "Discharged", obligationIds: ["o"] }),
    "Server",
  ),
});

/** Every record's data is its evaluation id; an id starting with `refused` is dropped. */
const byId = (record: StoredRecord): Effect.Effect<Option.Option<string>> =>
  Effect.succeed(record.evaluationId.startsWith("refused") ? Option.none() : Option.some(record.evaluationId));

/** A log that answers every read with `read`, and remembers each cursor it was asked after. */
const fakeLog = (read: DecisionLogEntries) => {
  const asked: Array<LogCursor | undefined> = [];
  return {
    asked,
    log: {
      readEntries: (after?: LogCursor) =>
        Effect.sync(() => {
          asked.push(after);
          return read;
        }),
    },
  };
};

const framesOf = (read: DecisionLogEntries, after?: string) =>
  Effect.map(
    Stream.runCollect(encodeDecisionStream(fakeLog(read).log, { after, encodeRecord: byId })),
    (frames) => Array.from(frames),
  );

describe("encodeDecisionStream", () => {
  it.effect("frames the backlog in cursor order, whatever order the log returned it in", () =>
    Effect.gen(function* () {
      const frames = yield* framesOf({ backlog: [entry(3), entry(1), entry(2)], live: Stream.make(entry(4)) });
      assert.deepStrictEqual(frames, [
        { event: "backlog", id: "7.1", data: "r1" },
        { event: "backlog", id: "7.2", data: "r2" },
        { event: "backlog", id: "7.3", data: "r3" },
        { event: "synced", data: '{"backlog":3}' },
        { event: "message", id: "7.4", data: "r4" },
      ]);
    }));

  it.effect("a dropped record loses only its own frame, and synced counts the backlog frames kept", () =>
    Effect.gen(function* () {
      const frames = yield* framesOf({
        backlog: [entry(1), entry(2, "refused-b"), entry(3)],
        live: Stream.make(entry(4, "refused-l"), entry(5)),
      });
      assert.deepStrictEqual(frames, [
        { event: "backlog", id: "7.1", data: "r1" },
        { event: "backlog", id: "7.3", data: "r3" },
        { event: "synced", data: '{"backlog":2}' },
        { event: "message", id: "7.5", data: "r5" },
      ]);
    }));

  it.effect("an empty read is one synced frame with backlog 0", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* framesOf({ backlog: [], live: Stream.empty }), [
        { event: "synced", data: '{"backlog":0}' },
      ]);
    }));

  it.effect("after: cursor text resumes the read; any other text is no cursor", () =>
    Effect.gen(function* () {
      const cases: ReadonlyArray<readonly [string | undefined, LogCursor | undefined]> = [
        ["7.2", { epoch: 7, seq: 2 }],
        [undefined, undefined],
        ["not-a-cursor", undefined],
        ["7.2.1", undefined],
        ["-7.2", undefined],
      ];
      for (const [after, expected] of cases) {
        const { asked, log } = fakeLog({ backlog: [], live: Stream.empty });
        yield* Stream.runDrain(encodeDecisionStream(log, { after, encodeRecord: byId }));
        assert.deepStrictEqual(asked, [expected], String(after));
      }
    }));

  it.effect("the read opens when the stream is first pulled, not when it is built", () =>
    Effect.gen(function* () {
      const { asked, log } = fakeLog({ backlog: [], live: Stream.empty });
      const stream = encodeDecisionStream(log, { encodeRecord: byId });
      assert.strictEqual(asked.length, 0);
      yield* Stream.runDrain(stream);
      assert.strictEqual(asked.length, 1);
    }));
});

/** A record's frame data through the real codec: the envelope, or `None` when the codec refuses it. */
const viaCodec = (record: StoredRecord): Effect.Effect<Option.Option<string>> =>
  Effect.succeed(Result.getSuccess(encodeStoredRecordString(record)));

/** Frame data back to a record through the real codec: `None` for anything that is not one. */
const fromCodec = (data: string): Effect.Effect<Option.Option<StoredRecord>> =>
  Effect.succeed(Result.getSuccess(decodeStoredRecordString(data)));

const labelOf = (record: StoredRecord): string => `${record.evaluationId}@${record.environment}`;

const labels = (records: ReadonlyArray<StoredRecord> | undefined): ReadonlyArray<string> =>
  (records ?? []).map(labelOf);

describe("decodeDecisionStream — the prelude (ADR-QD-097)", () => {
  const data = (evaluationId: string, at = 1): string =>
    Result.getOrElse(
      encodeStoredRecordString(
        stampRecord(new ObligationRecord({ evaluationId, at, outcome: "Discharged", obligationIds: ["o"] }), "Server"),
      ),
      () => assert.fail(`${evaluationId} did not encode`),
    );
  const backlog = (evaluationId: string, at = 1): ReceivedFrame => ({ event: "backlog", data: data(evaluationId, at) });
  const message = (evaluationId: string, at = 1): ReceivedFrame => ({ event: "message", data: data(evaluationId, at) });
  const synced = (n: number): ReceivedFrame => ({ event: "synced", data: `{"backlog":${n}}` });

  const ids = (records: ReadonlyArray<StoredRecord> | undefined) => (records ?? []).map((r) => r.evaluationId);

  /** One read of a finite frame list: its backlog (absent stays absent) and every live record. */
  const readAll = (
    frames: ReadonlyArray<ReceivedFrame>,
    decodeRecord: (data: string) => Effect.Effect<Option.Option<StoredRecord>> = fromCodec,
  ) =>
    Effect.scoped(
      Effect.gen(function* () {
        const read = yield* decodeDecisionStream(Stream.fromIterable(frames), { decodeRecord });
        const live = Array.from(yield* Stream.runCollect(read.live));
        return { hasBacklog: "backlog" in read, backlog: read.backlog, live };
      }),
    );

  /** One read of frames that never end: they are queued up front, and nothing more arrives. */
  const readOpen = <A>(
    frames: ReadonlyArray<ReceivedFrame>,
    syncTimeout: Duration.Input | undefined,
    use: (read: DecisionStreamRead) => Effect.Effect<A>,
  ) =>
    Effect.scoped(
      Effect.gen(function* () {
        const queue = yield* Queue.unbounded<ReceivedFrame>();
        for (const frame of frames) Queue.offerUnsafe(queue, frame);
        const read = yield* decodeDecisionStream(Stream.fromQueue(queue), {
          decodeRecord: fromCodec,
          ...(syncTimeout === undefined ? {} : { syncTimeout }),
        });
        return yield* use(read);
      }),
    );

  /** Whether the read had a backlog, and its first `count` live records. */
  const firstLive = (count: number) => (read: DecisionStreamRead) =>
    Effect.map(Stream.runCollect(Stream.take(read.live, count)), (live) => ({
      hasBacklog: "backlog" in read,
      live: Array.from(live),
    }));

  it.effect("a prelude becomes the backlog, presented in storedRecordOrder whatever order it arrived in", () =>
    Effect.gen(function* () {
      const got = yield* readAll([backlog("late", 300), backlog("early", 100), synced(2), message("live", 400)]);
      assert.deepStrictEqual(ids(got.backlog), ["early", "late"]);
      assert.deepStrictEqual(ids(got.live), ["live"]);
    }));

  it.effect("synced with no backlog frames is an empty backlog, not an absent one (BEH-QD-203)", () =>
    Effect.gen(function* () {
      const got = yield* readAll([synced(0), message("live")]);
      assert.isTrue(got.hasBacklog);
      assert.deepStrictEqual(got.backlog, []);
      assert.deepStrictEqual(ids(got.live), ["live"]);
    }));

  it.effect("a message before synced is live, not backlog, and the wait for the prelude continues", () =>
    Effect.gen(function* () {
      const got = yield* readAll([message("early"), backlog("past"), synced(1), message("late")]);
      assert.deepStrictEqual(ids(got.backlog), ["past"]);
      assert.deepStrictEqual(ids(got.live), ["early", "late"]);
    }));

  it.effect("frames in the same chunk as synced start the live half in order; a later synced is skipped", () =>
    Effect.gen(function* () {
      const got = yield* readAll([
        backlog("b1"),
        synced(1),
        message("m1"),
        message("m2"),
        synced(0),
        backlog("again"),
        message("m3"),
      ]);
      assert.deepStrictEqual(ids(got.backlog), ["b1"]);
      assert.deepStrictEqual(ids(got.live), ["m1", "m2", "again", "m3"]);
    }));

  it.effect("a stream that ends before a prelude leaves the backlog absent and delivers its frames live", () =>
    Effect.gen(function* () {
      const got = yield* readAll([backlog("partial"), message("first")]);
      assert.isFalse(got.hasBacklog);
      assert.deepStrictEqual(ids(got.live), ["partial", "first"]);
    }));

  it.effect("synced's count is not read: a count that disagrees changes nothing (ARCH-28 D-28-e)", () =>
    Effect.gen(function* () {
      const got = yield* readAll([backlog("only"), synced(7), synced(-1)]);
      assert.deepStrictEqual(ids(got.backlog), ["only"]);
      assert.deepStrictEqual(got.live, []);
    }));

  it.effect("decodeRecord's None drops only that frame, in the backlog and on the live half", () =>
    Effect.gen(function* () {
      const asked: Array<string> = [];
      const got = yield* readAll(
        [
          { event: "backlog", data: "}{ not json" },
          backlog("kept"),
          synced(2),
          { event: "message", data: "[]" },
          message("live"),
        ],
        (data) => Effect.flatMap(Effect.sync(() => asked.push(data)), () => fromCodec(data)),
      );
      assert.deepStrictEqual(ids(got.backlog), ["kept"]);
      assert.deepStrictEqual(ids(got.live), ["live"]);
      // Every record frame is offered once; `synced` never is.
      assert.deepStrictEqual(asked.length, 4);
      assert.isFalse(asked.some((d) => d.startsWith('{"backlog"')));
    }));

  it.effect("no synced within syncTimeout: the backlog is absent and the frames seen arrive live, in order", () =>
    Effect.gen(function* () {
      const reading = yield* Effect.forkChild(
        readOpen([backlog("partial"), message("first"), message("second")], "1 second", firstLive(3)),
        { startImmediately: true },
      );
      yield* TestClock.adjust("999 millis");
      assert.isUndefined(reading.pollUnsafe());
      yield* TestClock.adjust("1 millis");
      const got = yield* Fiber.join(reading);
      assert.isFalse(got.hasBacklog);
      assert.deepStrictEqual(ids(got.live), ["partial", "first", "second"]);
    }));

  it.effect("a silent server: after syncTimeout the backlog is absent and the read still answers", () =>
    Effect.gen(function* () {
      const reading = yield* Effect.forkChild(
        readOpen([], "500 millis", (read) => Effect.succeed("backlog" in read)),
        { startImmediately: true },
      );
      yield* TestClock.adjust("499 millis");
      assert.isUndefined(reading.pollUnsafe());
      yield* TestClock.adjust("1 millis");
      assert.isFalse(yield* Fiber.join(reading));
    }));

  it.effect("the default syncTimeout is two seconds", () =>
    Effect.gen(function* () {
      const reading = yield* Effect.forkChild(
        readOpen([], undefined, (read) => Effect.succeed("backlog" in read)),
        { startImmediately: true },
      );
      yield* TestClock.adjust("1999 millis");
      assert.isUndefined(reading.pollUnsafe());
      yield* TestClock.adjust("1 millis");
      assert.isFalse(yield* Fiber.join(reading));
    }));

  it.effect("a prelude that arrives before syncTimeout ends the wait at once, and the live half keeps reading", () =>
    Effect.gen(function* () {
      const got = yield* readOpen([backlog("b"), synced(1), message("m")], "1 second", firstLive(1));
      assert.isTrue(got.hasBacklog);
      assert.deepStrictEqual(ids(got.live), ["m"]);
    }));
});

/** One arrival in a generated log: what it is, when it says it was decided, and who made it. */
interface Arrival {
  /** `refused` is a record the codec cannot encode: it is retained, and never framed. */
  readonly kind: "obligation" | "refused";
  readonly at: number;
  readonly edge: boolean;
}

const arrivalRecord = (arrival: Arrival, index: number): SinkRecord => {
  const evaluationId = `r${index}`;
  return arrival.kind === "obligation"
    ? new ObligationRecord({ evaluationId, at: arrival.at, outcome: "Discharged", obligationIds: ["o"] })
    : new DecisionRecord({
      evaluationId,
      at: arrival.at,
      subjectId: makeSubjectId("alice"),
      policy: hasPermission(permission("devtools", "read")),
      // A `Set` has no JSON form: the codec refuses the record (`Opaque`).
      resource: { tags: new Set(["x"]) },
      outcome: new Decided({
        decision: new Allow({
          evaluationId,
          subjectId: makeSubjectId("alice"),
          durationMillis: 1,
          trace: { policyTag: "HasPermission", allowed: true, children: [], obligations: [] },
        }),
      }),
    });
};

/**
 * A generated log: 0–40 arrivals whose `at` is any integer or unknown (`NaN`)
 * and independent of arrival order, some from the Edge, some the codec refuses,
 * kept by a log whose capacity may evict the oldest.
 */
const generatedLog = fc.record({
  arrivals: fc.array(
    fc.record({
      kind: fc.constantFrom<Arrival["kind"]>("obligation", "obligation", "refused"),
      at: fc.oneof(fc.integer(), fc.constant(Number.NaN)),
      edge: fc.boolean(),
    }),
    { maxLength: 40 },
  ),
  capacity: fc.integer({ min: 1, max: 48 }),
});

/**
 * The log, filled, and read as `readEntries` presents it — backlog in
 * `storedRecordOrder`, which is what a writer must not send in — with the live
 * half ended, so every frame stream here is finite and nothing waits on a clock.
 */
const filled = (generated: typeof generatedLog extends fc.Arbitrary<infer A> ? A : never) =>
  Effect.gen(function* () {
    const log = yield* makeDecisionLog({ environment: "Server", capacity: generated.capacity });
    yield* Effect.forEach(
      generated.arrivals,
      (arrival, index) => log.ingest(arrivalRecord(arrival, index), arrival.edge ? "Edge" : undefined),
      { discard: true },
    );
    const finite: Pick<DecisionLog, "readEntries"> = {
      readEntries: (after) => Effect.map(log.readEntries(after), (read) => ({ ...read, live: Stream.empty })),
    };
    // What a reader is owed: every retained record the codec can encode, in `storedRecordOrder`.
    const owed = (yield* log.snapshot).filter((record) => Result.isSuccess(encodeStoredRecordString(record)));
    return { finite, owed };
  });

const preludeOf = (log: Pick<DecisionLog, "readEntries">, after?: string) =>
  Effect.map(
    Stream.runCollect(
      Stream.takeUntil(encodeDecisionStream(log, { after, encodeRecord: viaCodec }), (f) => f.event === "synced"),
    ),
    (frames): ReadonlyArray<DecisionStreamFrame> => Array.from(frames),
  );

/** Frames as one reader would receive them, read back. */
const decodeAll = (frames: ReadonlyArray<ReceivedFrame>) =>
  Effect.scoped(
    Effect.gen(function* () {
      const read = yield* decodeDecisionStream(Stream.fromIterable(frames), { decodeRecord: fromCodec });
      return { backlog: read.backlog, live: Array.from(yield* Stream.runCollect(read.live)) };
    }),
  );

describe("the order, written and read back (ARCH-60)", () => {
  it.effect("round trip: decode(encode(log)) is the log's retained, encodable records in storedRecordOrder", () =>
    Effect.promise(() =>
      fc.assert(
        fc.asyncProperty(generatedLog, (generated) =>
          Effect.runPromise(
            Effect.gen(function* () {
              const { finite, owed } = yield* filled(generated);
              const prelude = yield* preludeOf(finite);
              const last = prelude.at(-1);
              // `synced`'s count is the backlog frames actually sent (the writer's law
              // the reader does not check, D-54-d).
              assert.deepStrictEqual(last, { event: "synced", data: `{"backlog":${prelude.length - 1}}` });
              assert.strictEqual(prelude.length - 1, owed.length);

              const read = yield* decodeAll(prelude);
              assert.deepStrictEqual(labels(read.backlog), labels(owed));
              assert.deepStrictEqual(read.live, []);
            }),
          )),
        { numRuns: 100, seed: 12_021 },
      )));

  it.effect("resume: a reconnect after any record frame loses no retained record and repeats none", () =>
    Effect.promise(() =>
      fc.assert(
        fc.asyncProperty(generatedLog, (generated) =>
          Effect.runPromise(
            Effect.gen(function* () {
              const { finite, owed } = yield* filled(generated);
              const whole = yield* preludeOf(finite);
              for (const [index, cut] of whole.entries()) {
                if (cut.event === "synced") continue;
                // The connection drops after `cut`; the reader reconnects with its id as
                // `Last-Event-ID` and cannot tell the two connections' frames apart.
                const resumed = yield* preludeOf(finite, cut.id);
                const read = yield* decodeAll([...whole.slice(0, index + 1), ...resumed]);
                assert.deepStrictEqual(
                  labels(read.backlog),
                  labels(owed),
                  `cut after frame ${index + 1} of ${whole.length - 1}`,
                );
              }
            }),
          )),
        { numRuns: 100, seed: 12_022 },
      )));
});
