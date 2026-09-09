/**
 * The feed, tested **without forking a fiber that could wait forever**.
 *
 * The first version of this file forked a collector and published into it. That
 * reads naturally and turned the mutation gate from four minutes into three
 * hours: kill the publish and the forked fiber blocks until Stryker's timeout,
 * once per mutant with coverage here. A test suite that makes its own gate
 * impractical is a defect in the suite.
 *
 * Every case below terminates on its own — `replay` lets a subscriber read
 * records published before it, and the one case that genuinely needs live
 * semantics bounds itself with a timeout rather than trusting a publisher.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import { isAllowed } from "../src/Decision.ts";
import { decisionSinkFeed } from "../src/DecisionSinkFeed.ts";
import { evaluate } from "../src/Evaluate.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const allowed = subjectWith({ permissions: ["doc:read"] });
const policy = P.hasPermission(read);

describe("decisionSinkFeed", () => {
  it.effect("records reach a subscriber", () =>
    Effect.gen(function* () {
      const feed = yield* decisionSinkFeed({ replay: 4 });

      yield* evaluate(policy, { evaluationId: "a" }).pipe(Effect.provide(feed.layer));
      yield* evaluate(policy, { evaluationId: "b" }).pipe(Effect.provide(feed.layer));

      const records = yield* Stream.runCollect(Stream.take(feed.stream, 2));
      assert.deepStrictEqual(
        Array.from(records).map((r) => r.evaluationId),
        ["a", "b"],
      );
    }).pipe(Effect.provide(testLayer(allowed))));

  // `it.live`, not `it.effect`: the timeout below is wall-clock, and under the
  // `TestClock` every other case here runs on it would never fire — the test
  // would hang rather than assert, which is the failure this file exists to
  // avoid.
  it.live("without replay a subscriber sees nothing published before it", () =>
    Effect.gen(function* () {
      // The live-feed contract. Bounded by a timeout rather than by trusting a
      // concurrent publisher, so a mutant that breaks publishing fails this fast
      // instead of hanging the gate.
      const feed = yield* decisionSinkFeed();

      yield* evaluate(policy).pipe(Effect.provide(feed.layer));

      const got = yield* Stream.runCollect(Stream.take(feed.stream, 1)).pipe(
        Effect.timeoutOption("20 millis"),
      );
      assert.isTrue(Option.isNone(got));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("two subscribers each get their own copy", () =>
    Effect.gen(function* () {
      // Two open devtools pages must not steal records from one another.
      const feed = yield* decisionSinkFeed({ replay: 4 });

      yield* evaluate(policy, { evaluationId: "only" }).pipe(Effect.provide(feed.layer));

      const one = yield* Stream.runCollect(Stream.take(feed.stream, 1));
      const two = yield* Stream.runCollect(Stream.take(feed.stream, 1));

      assert.strictEqual(Array.from(one)[0]?.evaluationId, "only");
      assert.strictEqual(Array.from(two)[0]?.evaluationId, "only");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("publishing with NO reader at all does not block the decision", () =>
    Effect.gen(function* () {
      // The whole point. A capacity of one with nobody draining would deadlock a
      // publisher that awaited; sliding drops instead.
      const feed = yield* decisionSinkFeed({ capacity: 1 });

      for (let i = 0; i < 50; i += 1) {
        const d = yield* evaluate(policy).pipe(Effect.provide(feed.layer));
        assert.isTrue(isAllowed(d));
      }
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("the oldest record is dropped, not the newest", () =>
    Effect.gen(function* () {
      // Sliding, not dropping: a reader that reconnects wants the most recent
      // decisions, which is also how `decisionSinkRing` evicts.
      const feed = yield* decisionSinkFeed({ capacity: 2, replay: 2 });

      for (const id of ["a", "b", "c"]) {
        yield* evaluate(policy, { evaluationId: id }).pipe(Effect.provide(feed.layer));
      }

      const records = yield* Stream.runCollect(Stream.take(feed.stream, 2));
      assert.deepStrictEqual(
        Array.from(records).map((r) => r.evaluationId),
        ["b", "c"],
      );
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect(
    "with an ACTIVE reader already subscribed, overflow evicts the oldest UNREAD record, not the newest",
    () =>
      Effect.gen(function* () {
        // `replay` populates a subscriber's backlog from a *separate* buffer
        // that a `PubSub` fills regardless of whether anyone has subscribed
        // yet — it can never observe the defect this pins, because a pubsub
        // with no subscriber never reports its own ring full in the first
        // place. Only a reader that has already subscribed makes the ring
        // itself fill, which is the one place `publishUnsafe`'s missing
        // sliding eviction was ever observable.
        const feed = yield* decisionSinkFeed({ capacity: 2 });
        const drained = yield* Latch.make();

        // `startImmediately` runs the forked fiber synchronously, right here,
        // up to its first real suspension. Subscribing happens inside that
        // first `pull`, fused with waiting for a first record to exist — so
        // this reader unavoidably consumes one record as soon as it arrives,
        // then deliberately stalls on `drained` rather than pulling again,
        // exactly like an SSE route that reads one chunk and is slow to ask
        // for the next: subscribed and idle while five more records publish.
        const reading = yield* Effect.forkChild(
          Effect.gen(function* () {
            const pull = yield* Stream.toPull(feed.stream);
            const first = yield* pull;
            yield* drained.await;
            const rest = yield* pull;
            return [...first, ...rest];
          }).pipe(Effect.scoped),
          { startImmediately: true },
        );

        for (const id of ["a", "b", "c", "d", "e"]) {
          yield* evaluate(policy, { evaluationId: id }).pipe(Effect.provide(feed.layer));
        }
        yield* drained.open;

        const records = yield* Fiber.join(reading);
        // `a` is the one record the reader consumed before it stalled. `b`
        // and `c` are the middle records a full buffer had to make room for;
        // `d` and `e` are the newest two, and the ones a newest-wins policy
        // must never be the pair sacrificed to admit nothing.
        assert.deepStrictEqual(
          records.map((r) => r.evaluationId),
          ["a", "d", "e"],
        );
      }).pipe(Effect.provide(testLayer(allowed))),
  );

  it("rejects a capacity that is not a positive integer", () => {
    // Positive, not merely non-negative: a zero-capacity feed would be silently
    // dead rather than coherently empty. Thrown at the call site, as the ring's
    // is, so it fails where the mistake was made.
    for (const capacity of [0, -1, 1.5, Number.NaN]) {
      assert.throws(
        () => decisionSinkFeed({ capacity }),
        /positive integer/,
        `capacity ${capacity}`,
      );
    }
  });

  it("rejects a replay that is not a non-negative integer", () => {
    // Same failure shape as the capacity check above — thrown synchronously at
    // the call site, not deferred into the returned Effect — so a negative or
    // fractional `replay` can't be silently coerced into something PubSub
    // accepts. Unlike capacity, 0 is valid here (it's the documented default).
    for (const replay of [-1, 1.5, Number.NaN]) {
      assert.throws(
        () => decisionSinkFeed({ replay }),
        /non-negative integer/,
        `replay ${replay}`,
      );
    }
  });
});
