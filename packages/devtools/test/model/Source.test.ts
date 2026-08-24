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
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import * as Stream from "effect/Stream";
import { toWire } from "@qadi/core";
import type { SinkRecord } from "@qadi/core";
import {
  type DecisionEventSource,
  type MalformedReason,
  sourceFromEventSource,
  sourceFromFeed,
  sourceFromRecords,
} from "../../src/model/Source.ts";
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
    return Array.from(yield* Stream.runCollect(Stream.take(source.live, count)));
  });

const frameOf = (record: SinkRecord): string => JSON.stringify(toWire(record));

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

      assert.isDefined(source.backlog);
      assert.deepStrictEqual(yield* source.backlog, records);
      assert.deepStrictEqual(Array.from(yield* Stream.runCollect(source.live)), []);
    }));

  // E1.7 — zero records ever.
  it.effect("an empty set is an empty backlog, not a missing one", () =>
    Effect.gen(function* () {
      const source = sourceFromRecords([]);
      assert.isDefined(source.backlog);
      assert.deepStrictEqual(yield* source.backlog, []);
    }));
});

describe("sourceFromFeed", () => {
  it.effect("stamps the environment core deliberately does not claim", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ evaluationId: "a" });
      const { environment: _dropped, ...bare } = record;

      const source = sourceFromFeed({
        stream: Stream.fromArray<SinkRecord>([bare]),
        environment: "Client",
      });

      const got = Array.from(yield* Stream.runCollect(source.live));
      assert.strictEqual(got.length, 1);
      assert.strictEqual(got[0]?.environment, "Client");
      assert.strictEqual(got[0]?.evaluationId, "a");
    }));

  // E1.5 — a bare feed cannot answer for the past, and says so by absence.
  it("without a backlog the key is absent, not present-and-undefined", () => {
    const source = sourceFromFeed({
      stream: Stream.fromArray<SinkRecord>([]),
      environment: "Server",
    });
    // `in`, not `=== undefined`. Under `exactOptionalPropertyTypes` the two are
    // different facts — "this sink cannot answer for the past" versus "it can,
    // and the answer is nothing" — and a mutant that always set the key
    // survived an `isUndefined` assertion, because a present `undefined` reads
    // as absent through that lens.
    assert.isFalse("backlog" in source);
  });

  it.effect("a supplied backlog is carried through untouched", () =>
    Effect.gen(function* () {
      const backlog = [decisionRecord({ evaluationId: "old" })];
      const source = sourceFromFeed({
        stream: Stream.fromArray<SinkRecord>([]),
        environment: "Server",
        backlog: Effect.succeed(backlog),
      });

      assert.isDefined(source.backlog);
      assert.deepStrictEqual(yield* source.backlog, backlog);
    }));

  it.effect("obligation records travel the same path as decisions", () =>
    Effect.gen(function* () {
      const { environment: _dropped, ...bare } = obligationRecord({ evaluationId: "a" });
      const source = sourceFromFeed({
        stream: Stream.fromArray<SinkRecord>([bare]),
        environment: "Server",
      });

      const got = Array.from(yield* Stream.runCollect(source.live));
      assert.strictEqual(got[0]?._tag, "Obligations");
      assert.strictEqual(got[0]?.environment, "Server");
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

  // E1.3 — the one malformation the codec tolerates rather than rejects.
  it.effect("a Decision frame with no outcome arrives as Failed, never as a verdict", () =>
    Effect.gen(function* () {
      const fake = fakeEventSource();
      const frame = JSON.stringify({
        _tag: "Decision",
        evaluationId: "broken",
        at: 1,
        policy: { _tag: "HasPermission", permission: { resource: "doc", action: "read" } },
      });

      const got = yield* collect(fake, [frame], 1);

      assert.strictEqual(got[0]?._tag, "Decision");
      if (got[0]?._tag !== "Decision") return;
      assert.strictEqual(got[0].outcome._tag, "Failed");
    }));

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
  it("has no backlog: a live feed cannot answer for the past", () => {
    const fake = fakeEventSource();
    const source = sourceFromEventSource({
      url: "/__decisions",
      environment: "Server",
      open: fake.open,
    });
    assert.isFalse("backlog" in source);
  });

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

      const got = Array.from(yield* Stream.runCollect(Stream.take(source.live, 1)));

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

      yield* Stream.runCollect(Stream.take(source.live, 1));

      const instance = instances[0];
      assert.deepStrictEqual(instance?.registered, ["message", "error"]);
      assert.strictEqual(instance?.options?.withCredentials, false);
      assert.strictEqual(disconnects, 1);
    }));

  it("names the fix when the runtime has no EventSource", () => {
    vi.stubGlobal("EventSource", undefined);

    // Thrown at construction, not from inside the stream: a panel that mounts
    // cleanly and then dies when someone opens it is the worst place to learn
    // this. Same reasoning as `decisionSinkFeed`'s capacity check.
    assert.throws(
      () => sourceFromEventSource({ url: "/__decisions", environment: "Server" }),
      /no global EventSource[\s\S]*Supply `open`/,
    );
  });

  it("a supplied `open` needs no global at all", () => {
    vi.stubGlobal("EventSource", undefined);
    const fake = fakeEventSource();
    assert.isDefined(
      sourceFromEventSource({ url: "/__decisions", environment: "Server", open: fake.open }).live,
    );
  });
});
