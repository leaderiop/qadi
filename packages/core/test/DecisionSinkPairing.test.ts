/**
 * The documented ring + feed pairing, pinned as expected failures (ARCH-11 T1).
 *
 * Each case states a property a host wiring `decisionSinkRing` and
 * `decisionSinkFeed` through `decisionSinkAll` needs and does not get. They are
 * `.fails` so the suite stays green while the defects stand; when the decision
 * log fixes one, its marker fails loudly and the case moves to the log's suite.
 *
 * Nothing here forks a collector that can wait forever
 * (`DecisionSinkFeed.test.ts`'s rule): the one live case bounds itself with a
 * wall-clock timeout under `it.live`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import { ObligationRecord } from "../src/DecisionRecord.ts";
import { decisionSinkAll } from "../src/DecisionSinkForwarding.ts";
import { decisionSinkFeed } from "../src/DecisionSinkFeed.ts";
import { decisionSinkRing } from "../src/DecisionSinkRing.ts";
import { evaluate } from "../src/Evaluate.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { decodeSinkRecord } from "../src/SinkCodec.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const allowed = subjectWith({ permissions: ["doc:read"] });
const policy = P.hasPermission(read);

describe("the ring + feed pairing", () => {
  it.live.fails(
    "the documented pairing loses a record made between backlog and live (C9)",
    () =>
      Effect.gen(function* () {
        const ring = decisionSinkRing({ environment: "Server" });
        const feed = yield* decisionSinkFeed();
        const sink = decisionSinkAll([ring.layer, feed.layer]);

        yield* evaluate(policy, { evaluationId: "before" }).pipe(Effect.provide(sink));
        const backlog = yield* ring.snapshot;
        yield* evaluate(policy, { evaluationId: "between" }).pipe(Effect.provide(sink));

        const reading = yield* Effect.forkChild(
          Stream.runCollect(Stream.take(feed.stream, 2)).pipe(Effect.timeoutOption("50 millis")),
          { startImmediately: true },
        );
        yield* evaluate(policy, { evaluationId: "after" }).pipe(Effect.provide(sink));
        const live = yield* Fiber.join(reading);

        const seen = [
          ...backlog.map((r) => r.evaluationId),
          ...Option.match(live, { onNone: () => [], onSome: (rs) => rs.map((r) => r.evaluationId) }),
        ];
        assert.include(seen, "between");
      }).pipe(Effect.provide(testLayer(allowed))),
  );

  it.live.fails("an ingested record reaches a live reader (C10)", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });
      const feed = yield* decisionSinkFeed();
      const reading = yield* Effect.forkChild(
        Stream.runCollect(Stream.take(feed.stream, 1)).pipe(Effect.timeoutOption("50 millis")),
        { startImmediately: true },
      );

      yield* ring.ingest(
        new ObligationRecord({ evaluationId: "edge-1", at: 1, outcome: "Discharged", obligationIds: ["o"] }),
        "Edge",
      );

      const live = yield* Fiber.join(reading);
      assert.isTrue(Option.isSome(live));
    }));

  it.effect.fails("the backlog a host serves decodes (C7)", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });
      yield* evaluate(policy).pipe(Effect.provide(ring.layer));

      const served: ReadonlyArray<unknown> = JSON.parse(JSON.stringify(yield* ring.snapshot));
      assert.isAbove(served.length, 0);
      for (const element of served) assert.isTrue(Result.isSuccess(decodeSinkRecord(element)));
    }).pipe(Effect.provide(testLayer(allowed))));
});
