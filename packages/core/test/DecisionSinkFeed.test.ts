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
});
