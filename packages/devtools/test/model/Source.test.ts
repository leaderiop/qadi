/**
 * JOB 1 ledger — E1.1 … E1.7.
 *
 * The theme is that **every failure degrades one row and never the stream**. A
 * devtools panel is what you are looking at when something is already wrong, so
 * a panel that dies on a bad frame fails exactly when it is needed.
 *
 * No test here forks a fiber that could block forever: `Stream.take` is always
 * bounded by records the test itself supplies, and the one case that needs live
 * semantics ends the stream explicitly. That constraint is not stylistic —
 * blocking collectors turned the mutation gate from four minutes into three
 * hours once already (CCR-QD-065).
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Result from "effect/Result";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import * as Stream from "effect/Stream";
import { encodeSinkRecordString, makeDecisionLog, MAX_DECODE_DEPTH } from "@qadi/core";
import type { SinkRecord, StoredRecord } from "@qadi/core";
import {
  type DecisionEventSource,
  type MalformedReason,
  mergeSources,
  type Source,
  sourceFromEventSource,
  sourceFromRecords,
} from "../../src/model/Source.ts";
import { makeTimelineStore, runSource } from "../../src/model/TimelineStore.ts";
import { decisionRecord, obligationRecord } from "../helpers.ts";

/**
 * A fake `EventSource` whose frames are queued **before** the stream is run.
 *
 * The first version of this file forked a collector, yielded once, and then
 * emitted. That hung every case here: the fork had not yet reached the point
 * where the adapter attaches its handlers, so each frame went to a no-op and
 * `take` waited forever. It is the exact failure this file's header warns
 * about, built by the person who wrote the warning.
 *
 * So nothing is timed. Frames are queued up front and flushed the moment the
 * adapter has attached **both** handlers — a point the fake can see, and which
 * does not depend on the order the adapter attaches them in. `runCollect` then
 * finds them already in the queue and terminates on `take`.
 */
const fakeEventSource = () => {
  let onMessage: ((data: string) => void) | undefined;
  let onError: (() => void) | undefined;
  let closed = false;
  let failFirst = false;
  const pending: Array<string> = [];

  const flush = () => {
    if (onMessage === undefined || onError === undefined) return;
    if (failFirst) onError();
    for (const frame of pending) onMessage(frame);
    pending.length = 0;
  };

  const source: DecisionEventSource = {
    onMessage: (handler) => {
      onMessage = handler;
      flush();
    },
    onError: (handler) => {
      onError = handler;
      flush();
    },
    close: () => {
      closed = true;
    },
  };

  return {
    open: () => source,
    queue: (frames: ReadonlyArray<string>) => pending.push(...frames),
    queueFailure: () => {
      failFirst = true;
    },
    wasClosed: () => closed,
  };
};

/** Queues frames, runs the stream, and collects exactly `count` records. */
const collect = (
  fake: ReturnType<typeof fakeEventSource>,
  frames: ReadonlyArray<string>,
  count: number,
  options?: {
    readonly onMalformed?: (frame: string, reason: MalformedReason) => void;
    readonly onDisconnect?: () => void;
    readonly failFirst?: boolean;
  },
) =>
  Effect.gen(function* () {
    const source = sourceFromEventSource({
      url: "/__decisions",
      environment: "Server",
      open: fake.open,
      ...(options?.onMalformed === undefined ? {} : { onMalformed: options.onMalformed }),
      ...(options?.onDisconnect === undefined ? {} : { onDisconnect: options.onDisconnect }),
    });

    if (options?.failFirst === true) fake.queueFailure();
    fake.queue(frames);

    // Bounded by `take`, and every call below queues at least `count` decodable
    // frames before this runs, so it terminates without waiting on anything.
    return yield* liveOf(source, count);
  });

/** One scoped read of `source`, and exactly `count` of its live records. */
const liveOf = (source: Source, count: number) =>
  Effect.scoped(
    Effect.flatMap(source.read, (read) =>
      Effect.map(Stream.runCollect(Stream.take(read.live, count)), (records) => Array.from(records))),
  );

/** One scoped read of `source`, and every live record until its stream ends. */
const allLiveOf = (source: Source) =>
  Effect.scoped(
    Effect.flatMap(source.read, (read) =>
      Effect.map(Stream.runCollect(read.live), (records) => Array.from(records))),
  );

/** The backlog one scoped read of `source` returns — absent stays absent. */
const backlogOf = (source: Source) => Effect.scoped(Effect.map(source.read, (read) => read.backlog));

/** Whether one scoped read of `source` has a `backlog` key at all. */
const hasBacklog = (source: Source) => Effect.scoped(Effect.map(source.read, (read) => "backlog" in read));

/** A record as the frame data a current sender emits: the one outbound operation's text. */
const frameOf = (record: SinkRecord): string =>
  Result.match(encodeSinkRecordString(record), {
    onSuccess: (text) => text,
    onFailure: (error) => assert.fail(`refused: ${error.refusal._tag}`),
  });

/** Reads one log annotation without an `as`. */
const annotationOf = (annotations: unknown, key: string): unknown =>
  typeof annotations === "object" && annotations !== null && key in annotations
    ? Object.entries(annotations).find(([k]) => k === key)?.[1]
    : undefined;

describe("sourceFromRecords", () => {
  it.effect("answers for the past and has nothing live", () =>
    Effect.gen(function* () {
      const records = [decisionRecord({ evaluationId: "a" })];
      const source = sourceFromRecords(records);

      assert.deepStrictEqual(yield* backlogOf(source), records);
      assert.deepStrictEqual(yield* allLiveOf(source), []);
    }));

  // E1.7 — zero records ever.
  it.effect("an empty set is an empty backlog, not a missing one", () =>
    Effect.gen(function* () {
      const source = sourceFromRecords([]);
      assert.isTrue(yield* hasBacklog(source));
      assert.deepStrictEqual(yield* backlogOf(source), []);
    }));
});

/**
 * A `DecisionLog` is a `Source` as it is — no adapter (ARCH-11 D-11-c). Its
 * stamping, prototype preservation and handoff are tested where they live, in
 * `@qadi/core`'s `DecisionLog.test.ts`; this pins only that the timeline gets
 * the backlog, then the live records, each exactly once.
 */
describe("a DecisionLog used as a source", () => {
  it.effect("hands the timeline its backlog then its live records, exactly once", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Client" });
      yield* log.ingest(obligationRecord({ evaluationId: "past", at: 1 }));

      const store = makeTimelineStore();
      const running = yield* Effect.forkChild(runSource(store, log), { startImmediately: true });
      yield* log.ingest(obligationRecord({ evaluationId: "next", at: 2 }));
      // The live half is pulled on the running fiber; let it drain.
      yield* Effect.yieldNow;
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(running);

      const entries = store.getSnapshot().entries;
      assert.deepStrictEqual(entries.map((entry) => entry.evaluationId), ["past", "next"]);
      assert.isTrue(entries.every((entry) => entry.environment === "Client"));
    }));
});

describe("sourceFromEventSource", () => {
  it.effect("a well-formed frame becomes a stamped record", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      const got = yield* collect(fake, [frameOf(decisionRecord({ evaluationId: "a" }))], 1);

      assert.strictEqual(got.length, 1);
      assert.strictEqual(got[0]?.evaluationId, "a");
      assert.strictEqual(got[0]?.environment, "Server");
      // Same prototype-preservation guarantee `sourceFromFeed` pins: a
      // `{ ...record, environment }` spread would silently drop `.pipe`.
      assert.strictEqual(typeof got[0]?.pipe, "function");
    }));

  // E1.1 — a frame that is not JSON at all: a broken transport.
  it.effect("a frame that is not JSON drops that row, and says the transport broke", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      const reported: Array<[string, string]> = [];

      const got = yield* collect(
        fake,
        ["}{ not json", frameOf(decisionRecord({ evaluationId: "after" }))],
        1,
        { onMalformed: (frame, reason) => reported.push([frame, reason]) },
      );

      assert.deepStrictEqual(reported, [["}{ not json", "not-json"]]);
      assert.strictEqual(got[0]?.evaluationId, "after");
    }));

  // E1.2 — well-formed JSON that is not a record: a protocol mismatch.
  it.effect("JSON that fails to decode drops that row, and says the protocol disagreed", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      const reported: Array<[string, string]> = [];

      const got = yield* collect(
        fake,
        [
          JSON.stringify({ _tag: "Decision", evaluationId: 42 }),
          frameOf(decisionRecord({ evaluationId: "after" })),
        ],
        1,
        { onMalformed: (frame, reason) => reported.push([frame, reason]) },
      );

      // The two failures are different problems with different fixes — a
      // truncating proxy versus a `@qadi/core` on the far side that does not
      // agree about the wire form — and a reader that cannot tell them apart
      // debugs the wrong one.
      assert.strictEqual(reported.length, 1);
      assert.strictEqual(reported[0]?.[1], "not-a-record");
      assert.strictEqual(got[0]?.evaluationId, "after");
    }));

  /**
   * H6 — the inbound depth guard, exercised through the real SSE path.
   *
   * Reported as `too-deep`, its own reason since ARCH-09: a current sender
   * refuses to emit such a record (`encodeSinkRecord`'s matching bound), so a
   * too-deep frame means an older or foreign sender, a third fix distinct from
   * a broken transport or a protocol mismatch.
   *
   * Before `SinkCodec.ts`'s inbound decode gained a depth guard ahead of
   * `Schema`'s recursive descent, a frame nesting a policy past the call
   * stack's limit raised a raw `RangeError` *defect* out of the decode —
   * and `decodeFrame`'s `Effect.result` only catches the typed error channel,
   * not a defect, so that `RangeError` would kill the whole `live` stream
   * rather than drop one row, freezing the timeline for every other frame
   * still arriving. This pins the fix from the consumer's side: the same
   * shape `SinkCodec.test.ts`'s `wireWithNestedPolicy` builds, decoded here
   * through `sourceFromEventSource` rather than a direct `decodeSinkRecord` call,
   * must be reported and dropped like any other malformed frame — and the
   * stream must keep delivering what comes after it.
   */
  it.effect(
    "a policy nested past MAX_DECODE_DEPTH is dropped, not a stream-killing defect",
    () =>
      Effect.gen(function* () {
        const fake = fakeEventSource();
        const reported: Array<[string, string]> = [];

        let policy: unknown = { _tag: "HasRole", role: "x" };
        for (let i = 0; i < MAX_DECODE_DEPTH + 10; i++) {
          policy = { _tag: "Not", policy };
        }
        const deepFrame = JSON.stringify({
          _tag: "Decision",
          evaluationId: "too-deep",
          at: 0,
          subjectId: "attacker",
          policy,
        });

        const got = yield* collect(
          fake,
          [deepFrame, frameOf(decisionRecord({ evaluationId: "after" }))],
          1,
          { onMalformed: (frame, reason) => reported.push([frame, reason]) },
        );

        assert.strictEqual(reported.length, 1);
        assert.strictEqual(reported[0]?.[1], "too-deep");
        assert.strictEqual(got[0]?.evaluationId, "after");
      }),
  );

  // E1.3 — a record naming no outcome is not a record: dropped as malformed,
  // never rebuilt as a verdict or as an invented error (tickets 96, 155).
  it.effect("a Decision frame with no outcome is dropped as not-a-record, never rebuilt", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      const reported: Array<readonly [string, MalformedReason]> = [];
      const frame = JSON.stringify({
        _tag: "Decision",
        evaluationId: "broken",
        at: 1,
        subjectId: "alice",
        policy: { _tag: "HasPermission", permission: { resource: "doc", action: "read" } },
      });

      const got = yield* collect(fake, [frame, frameOf(decisionRecord({ evaluationId: "after" }))], 1, {
        onMalformed: (bad, reason) => reported.push([bad, reason]),
      });

      assert.deepStrictEqual(reported, [[frame, "not-a-record"]]);
      assert.strictEqual(got[0]?.evaluationId, "after");
    }));

  /**
   * Wire versions (ADR-QD-903): a panel reads a server older than itself and
   * one on its own version, and names a server newer than itself — whose fix
   * is upgrading this panel — apart from a malformed record.
   */
  describe("wire versions", () => {
    const record = decisionRecord({ evaluationId: "versioned" });
    /** The record as a server on this release frames it (version 2), or as an older one did (version 1). */
    const framed = (wireVersion: 1 | 2): string => {
      const v2 = frameOf(record);
      if (wireVersion === 2) return v2;
      // Version 1 by hand, the way a release before the versioned wire wrote
      // it: no `version`, and the decision under `decided`, last.
      const { version: _version, outcome, ...envelope } = JSON.parse(v2);
      return JSON.stringify({ ...envelope, decided: outcome.decision });
    };
    const withField = (text: string, key: string, value: unknown): string =>
      JSON.stringify({ ...JSON.parse(text), [key]: value });

    it.effect("a v2 frame and a v1 frame from an older server decode to the same record", () =>
      Effect.gen(function* () {
        const got = yield* collect(fakeEventSource(), [framed(2), framed(1)], 2);
        assert.strictEqual(got.length, 2);
        assert.deepStrictEqual(got[0], got[1]);
        assert.strictEqual(got[0]?.evaluationId, "versioned");
      }));

    it.effect("a frame with an unknown envelope key decodes (a newer server's additive metadata)", () =>
      Effect.gen(function* () {
        const got = yield* collect(fakeEventSource(), [withField(framed(2), "traceparent", "00-abc")], 1);
        assert.strictEqual(got[0]?.evaluationId, "versioned");
      }));

    it.effect("a v1 frame naming both outcomes is dropped as not-a-record", () =>
      Effect.gen(function* () {
        const reported: Array<readonly [string, MalformedReason]> = [];
        const both = withField(framed(1), "failed", { _tag: "MissingResource", attribute: "owner" });
        const got = yield* collect(fakeEventSource(), [both, framed(2)], 1, {
          onMalformed: (frame, reason) => reported.push([frame, reason]),
        });
        assert.deepStrictEqual(reported, [[both, "not-a-record"]]);
        assert.strictEqual(got[0]?.evaluationId, "versioned");
      }));

    it.effect("a version-3 frame is dropped as unsupported-version, not as not-a-record", () =>
      Effect.gen(function* () {
        const reported: Array<readonly [string, MalformedReason]> = [];
        const newer = withField(framed(2), "version", 3);
        const got = yield* collect(fakeEventSource(), [newer, framed(2)], 1, {
          onMalformed: (frame, reason) => reported.push([frame, reason]),
        });
        assert.deepStrictEqual(reported, [[newer, "unsupported-version"]]);
        assert.strictEqual(got[0]?.evaluationId, "versioned");
      }));
  });

  /**
   * E1.1/E1.2 through the default reporter.
   *
   * The message and the annotation are asserted, not just the fact that
   * something was logged — a warning saying only "a frame was bad" without the
   * frame tells an operator nothing actionable, which is the same standard
   * `DecisionSinkForwarding.test.ts` holds its own default warning to.
   */
  it.effect("without onMalformed the drop is logged, with the frame attached", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      const logs: Array<{ message: unknown; annotations: unknown }> = [];

      const got = yield* collect(
        fake,
        ["not json", frameOf(decisionRecord({ evaluationId: "after" }))],
        1,
      ).pipe(
        Effect.provide(
          Logger.layer([
            Logger.make((o) => {
              logs.push({
                message: o.message,
                annotations: o.fiber.getRef(References.CurrentLogAnnotations),
              });
            }),
          ]),
        ),
      );

      assert.strictEqual(got[0]?.evaluationId, "after");
      assert.strictEqual(logs.length, 1);
      assert.include(String(logs[0]?.message), "not a decision record");
      assert.include(String(annotationOf(logs[0]?.annotations, "qadi.frame")), "not json");
      assert.strictEqual(annotationOf(logs[0]?.annotations, "qadi.reason"), "not-json");
    }));

  // E1.4 — the connection drops.
  it.effect("a connection error is reported and the stream keeps running", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      let disconnects = 0;

      const got = yield* collect(fake, [frameOf(decisionRecord({ evaluationId: "a" }))], 1, {
        failFirst: true,
        onDisconnect: () => {
          disconnects += 1;
        },
      });

      assert.strictEqual(disconnects, 1);
      assert.strictEqual(got[0]?.evaluationId, "a");
    }));

  it.effect("a connection error with no handler is not a crash", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      const got = yield* collect(fake, [frameOf(decisionRecord({ evaluationId: "a" }))], 1, {
        failFirst: true,
      });
      assert.strictEqual(got[0]?.evaluationId, "a");
    }));

  it.effect("the connection is closed when the stream's scope ends", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      yield* collect(fake, [frameOf(decisionRecord({ evaluationId: "a" }))], 1);
      assert.isTrue(fake.wasClosed());
    }));

  // E1.5 — SSE cannot answer for the past on its own.
  it.effect("has no backlog: a live feed cannot answer for the past", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      const source = sourceFromEventSource({
        url: "/__decisions",
        environment: "Server",
        open: fake.open,
      });
      assert.isFalse(yield* hasBacklog(source));
    }));

});

/**
 * The default `open`, which is the only part of this module that touches a
 * browser global.
 *
 * Driven through `vi.stubGlobal` rather than through whatever the test
 * environment happens to provide: a test whose outcome depends on happy-dom's
 * feature list is a test that changes meaning when happy-dom is upgraded.
 */
describe("the default EventSource", () => {
  const instances: Array<FakeEventSource> = [];
  let closed = 0;

  /**
   * Stands in for the DOM class, and flushes on the second `addEventListener`
   * for the reason the hand-driven fake above does: nothing here may depend on
   * when a forked fiber happens to get scheduled.
   */
  class FakeEventSource {
    readonly listeners = new Map<string, (event: { data: string }) => void>();
    readonly registered: Array<string> = [];
    constructor(
      readonly url: string,
      readonly options?: { withCredentials?: boolean },
    ) {
      instances.push(this);
    }
    addEventListener(type: string, listener: (event: { data: string }) => void) {
      this.registered.push(type);
      this.listeners.set(type, listener);
      if (this.listeners.size < 2) return;
      // Both are driven: the error one must reach `onDisconnect`, and the
      // message one must reach the stream.
      this.listeners.get("error")?.({ data: "" });
      this.listeners.get("message")?.({
        data: frameOf(decisionRecord({ evaluationId: "viaGlobal" })),
      });
    }
    close() {
      closed += 1;
    }
  }

  beforeEach(() => {
    instances.length = 0;
    closed = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect("opens the url, forwards frames, and closes with the scope", () =>
    Effect.gen(function* () {
      vi.stubGlobal("EventSource", FakeEventSource);

      const source = sourceFromEventSource({
        url: "/__decisions",
        environment: "Edge",
        withCredentials: true,
      });

      const got = yield* liveOf(source, 1);

      const instance = instances[0];
      assert.isDefined(instance);
      assert.strictEqual(instance?.url, "/__decisions");
      assert.strictEqual(instance?.options?.withCredentials, true);
      assert.strictEqual(got[0]?.evaluationId, "viaGlobal");
      assert.strictEqual(got[0]?.environment, "Edge");
      assert.strictEqual(closed, 1);
    }));

  /**
   * Registration and defaults, which the case above cannot see.
   *
   * It reaches the error listener through `listeners.get("error")`, so an
   * adapter that registered the wrong event name would simply find nothing and
   * no-op — the test would pass while the real panel never learned it had been
   * disconnected. Two mutants of that line survived on exactly that.
   */
  it.effect("registers message and error, and defaults withCredentials to false", () =>
    Effect.gen(function* () {
      vi.stubGlobal("EventSource", FakeEventSource);
      let disconnects = 0;

      const source = sourceFromEventSource({
        url: "/__decisions",
        environment: "Server",
        onDisconnect: () => {
          disconnects += 1;
        },
      });

      yield* liveOf(source, 1);

      const instance = instances[0];
      assert.deepStrictEqual(instance?.registered, ["message", "error"]);
      assert.strictEqual(instance?.options?.withCredentials, false);
      assert.strictEqual(disconnects, 1);
    }));

  it("names the fix when the runtime has no EventSource", () => {
    vi.stubGlobal("EventSource", undefined);

    // Thrown at construction, not from inside the stream: a panel that mounts
    // cleanly and then dies when someone opens it is the worst place to learn
    // this. Same reasoning as `makeDecisionLog`'s capacity check.
    assert.throws(
      () => sourceFromEventSource({ url: "/__decisions", environment: "Server" }),
      /no global EventSource[\s\S]*Supply `open`/,
    );
  });

  it("a supplied `open` needs no global at all", () => {
    vi.stubGlobal("EventSource", undefined);
    const fake = fakeEventSource();
    assert.isDefined(
      sourceFromEventSource({ url: "/__decisions", environment: "Server", open: fake.open }).read,
    );
  });
});

/**
 * JOB 1 ledger — E1.8 … E1.13.
 *
 * Built from `Source` literals rather than from the three constructors, which is
 * this file's own standard: `mergeSources` takes a `Source` and knows nothing
 * about transports, so a transport in the way would test the wrong boundary.
 */
describe("mergeSources", () => {
  /** A producer that cannot answer for the past — an older server over SSE. */
  const liveOnly = (records: ReadonlyArray<StoredRecord>): Source => ({
    read: Effect.succeed({ live: Stream.fromArray(records) }),
  });

  /** A producer that can — a decision log, or a captured session. */
  const withBacklog = (
    backlog: ReadonlyArray<StoredRecord>,
    records: ReadonlyArray<StoredRecord> = [],
  ): Source => ({
    read: Effect.succeed({ backlog, live: Stream.fromArray(records) }),
  });

  // The reason this function exists. A server decides during the render and the
  // browser re-checks after it; the two records carry one `evaluationId`, and
  // `pairedEntries` can only pair what reached one `Timeline`.
  it.effect("carries every producer's live records", () =>
    Effect.gen(function* () {
      const merged = mergeSources([
        liveOnly([decisionRecord({ evaluationId: "ev-1", environment: "Server" })]),
        liveOnly([decisionRecord({ evaluationId: "ev-1", environment: "Client" })]),
      ]);

      const got = yield* allLiveOf(merged);

      // Asserted as a set: under concurrent merging the arrival order is the
      // producers' order, not this array's, and asserting a sequence here would
      // be asserting a scheduler.
      assert.strictEqual(got.length, 2);
      assert.deepStrictEqual(
        got.map((record) => record.environment).sort(),
        ["Client", "Server"],
      );
    }));

  /**
   * The property `concurrency: "unbounded"` buys, and it is not a tuning knob.
   *
   * Merged sequentially, `mergeAll` drains one producer before pulling the next
   * — and the producer this exists for is an SSE connection that **never
   * completes**. The browser's own decisions would then never be read at all,
   * and a panel would show the server's half of every pair and none of the
   * client's, looking merely quiet rather than broken.
   *
   * `it.live`, not `it.effect`: the ordering is the assertion, and under
   * `TestClock` the sleep would never elapse. Two mutants — `{}` and
   * `concurrency: ""`, both of which Effect reads as *one at a time* — survived
   * every other case here, because a merge of two already-finished streams
   * cannot tell the two apart.
   */
  it.live("does not make one producer wait for another to finish", () =>
    Effect.gen(function* () {
      const slow: Source = {
        read: Effect.succeed({
          live: Stream.fromArray([decisionRecord({ evaluationId: "slow" })]).pipe(
            Stream.mapEffect((record) => Effect.as(Effect.sleep("50 millis"), record)),
          ),
        }),
      };
      const fast: Source = {
        read: Effect.succeed({ live: Stream.fromArray([decisionRecord({ evaluationId: "fast" })]) }),
      };

      const got = yield* allLiveOf(mergeSources([slow, fast]));

      // Second producer, first record.
      assert.deepStrictEqual(got.map((record) => record.evaluationId), ["fast", "slow"]);
    }));

  it.effect("orders the merged backlog by time, not by source", () =>
    Effect.gen(function* () {
      const merged = mergeSources([
        withBacklog([decisionRecord({ evaluationId: "third", at: 3_000 })]),
        withBacklog([
          decisionRecord({ evaluationId: "first", at: 1_000 }),
          decisionRecord({ evaluationId: "second", at: 2_000 }),
        ]),
      ]);

      const backlog = yield* backlogOf(merged);
      assert.isDefined(backlog);
      const got = backlog ?? [];

      assert.deepStrictEqual(
        got.map((record) => record.evaluationId),
        ["first", "second", "third"],
      );
    }));

  // INV-QD-039: an unknown time sorts after every known one. `a.at - b.at`
  // would leave a `NaN` row wherever `Array.prototype.sort` happened to place
  // it, which is not the total order this timeline documents.
  it.effect("sorts a NaN-timed row after every known time", () =>
    Effect.gen(function* () {
      const merged = mergeSources([
        withBacklog([
          decisionRecord({ evaluationId: "unknown", at: Number.NaN }),
          decisionRecord({ evaluationId: "third", at: 3_000 }),
        ]),
        withBacklog([decisionRecord({ evaluationId: "first", at: 1_000 })]),
      ]);

      const backlog = yield* backlogOf(merged);
      assert.isDefined(backlog);
      const got = backlog ?? [];

      assert.deepStrictEqual(
        got.map((record) => record.evaluationId),
        ["first", "third", "unknown"],
      );
    }));

  // BEH-QD-203: absent means "cannot answer for the past", empty means "can, and
  // there was nothing". A merge of two feeds must not answer `[]` and so claim a
  // history was looked at.
  // `in`, not `=== undefined`: the key is absent, not present-and-undefined. A
  // reader asking `"backlog" in read` — which is the honest way to ask "can this
  // answer for the past" — must get `false`.
  it.effect("cannot answer for the past when no producer can", () =>
    Effect.gen(function* () {
      const merged = mergeSources([liveOnly([]), liveOnly([])]);
      assert.isFalse(yield* hasBacklog(merged));
    }));

  it.effect("one producer answering for the past is enough", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ evaluationId: "kept" });
      const merged = mergeSources([liveOnly([]), withBacklog([record]), liveOnly([])]);

      const backlog = yield* backlogOf(merged);
      assert.isDefined(backlog);
      const got = backlog ?? [];

      // Exactly one, not three: a producer with no backlog contributes nothing
      // rather than an empty run the reader would have to distinguish.
      assert.deepStrictEqual(got.map((r) => r.evaluationId), ["kept"]);
    }));

  it.effect("merging nothing answers nothing, and does not pretend to", () =>
    Effect.gen(function* () {
      const merged = mergeSources([]);
      assert.isFalse(yield* hasBacklog(merged));
      assert.deepStrictEqual(yield* allLiveOf(merged), []);
    }));

  // Deliberately not deduplicated. `EventSource` reconnects on its own and
  // re-reads the server's backlog, so duplicates are expected — and the
  // timeline already folds by evaluation id. Doing it twice would be two places
  // to be wrong, and this pins the contract so a future "helpful" dedupe here
  // fails rather than silently hiding a replay.
  it.effect("does not deduplicate — that is the timeline's job", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ evaluationId: "ev-1", at: 1_000 });
      const merged = mergeSources([withBacklog([record]), withBacklog([record])]);

      const got = (yield* backlogOf(merged)) ?? [];
      assert.strictEqual(got.length, 2);
    }));
});
