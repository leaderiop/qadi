/**
 * The decision stream's order, written by `encodeDecisionStream` (ARCH-60): the
 * backlog in cursor order whatever a log returned, one `synced` counting the
 * backlog frames kept, then live frames, each record frame carrying its cursor.
 *
 * Driven over a structural `readEntries` fake and an `encodeRecord` that answers
 * with the evaluation id (or `None` to drop a record), so each rule of the order is
 * pinned without a codec or a transport. The route's bytes are `@qadi/http`'s
 * `decisionStream.test.ts`; the reader's half and the round-trip properties are
 * 12-02's.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import { ObligationRecord, encodeDecisionStream, stampRecord } from "../src/index.ts";
import type { DecisionLogEntries, LogCursor, LogEntry, StoredRecord } from "../src/index.ts";

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
