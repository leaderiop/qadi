import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import { isAllowed } from "../src/Decision.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { decisionSinkAll, decisionSinkForwarding } from "../src/DecisionSinkForwarding.ts";
import { decisionSinkRing } from "../src/DecisionSinkRing.ts";
import { evaluate } from "../src/Evaluate.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { decodeRecord } from "../src/SinkCodec.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const allowed = subjectWith({ permissions: ["doc:read"] });
const policy = P.hasPermission(read);

describe("decisionSinkForwarding", () => {
  it.effect("hands each record onward, already encoded", () =>
    Effect.gen(function* () {
      const sent: Array<unknown> = [];

      yield* evaluate(policy).pipe(
        Effect.provide(
          decisionSinkForwarding({
            send: (encoded) =>
              Effect.sync(() => {
                sent.push(encoded);
              }),
          }),
        ),
      );

      assert.strictEqual(sent.length, 1);
      // Encoded, so a transport can hand it straight to JSON without knowing
      // anything about the record type.
      assert.doesNotThrow(() => JSON.stringify(sent[0]));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a send that FAILS cannot change the decision", () =>
    Effect.gen(function* () {
      const failing = decisionSinkForwarding({
        send: () => Effect.fail("the devtools page is gone"),
        onFailure: () => undefined,
      });

      const expected = yield* evaluate(policy);
      const actual = yield* evaluate(policy).pipe(Effect.provide(failing));

      // Nobody watching is the most ordinary thing that can go wrong here.
      assert.isTrue(isAllowed(actual));
      assert.deepStrictEqual(actual.trace, expected.trace);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a send that DIES cannot change the decision either", () =>
    Effect.gen(function* () {
      // `send` is a caller's function, so it can die as easily as fail.
      const dying = decisionSinkForwarding({
        send: () => Effect.die(new Error("socket exploded")),
        onFailure: () => undefined,
      });

      const actual = yield* evaluate(policy).pipe(Effect.provide(dying));
      assert.isTrue(isAllowed(actual));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a failure is reported through onFailure", () =>
    Effect.gen(function* () {
      const seen: Array<unknown> = [];

      yield* evaluate(policy).pipe(
        Effect.provide(
          decisionSinkForwarding({
            send: () => Effect.fail("unreachable"),
            onFailure: (error) => seen.push(error),
          }),
        ),
      );

      // A forwarder dropping every record while looking healthy is the defect
      // `onDropped` and `onUnknownParent` exist to prevent elsewhere.
      assert.strictEqual(seen.length, 1);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("with no onFailure it warns rather than going quiet", () =>
    Effect.gen(function* () {
      const logs: Array<unknown> = [];

      yield* evaluate(policy).pipe(
        Effect.provide(
          decisionSinkForwarding({ send: () => Effect.fail("unreachable") }),
        ),
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

      assert.strictEqual(logs.length, 1);
      const entry = logs[0] as { message: unknown; annotations: unknown };
      assert.include(String(entry.message), "could not be forwarded");
      // The cause is the whole diagnostic value of the warning — a line saying
      // only "could not be forwarded" tells an operator nothing actionable.
      assert.include(
        String((entry.annotations as Record<string, unknown>)["qadi.cause"]),
        "unreachable",
      );
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a successful send logs nothing", () =>
    Effect.gen(function* () {
      const logs: Array<unknown> = [];

      yield* evaluate(policy).pipe(
        Effect.provide(decisionSinkForwarding({ send: () => Effect.void })),
        Effect.provide(Logger.layer([Logger.make((o) => { logs.push(o.message); })])),
      );

      assert.deepStrictEqual(logs, []);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("decisionSinkAll", () => {
  it.effect("writes to every sink", () =>
    Effect.gen(function* () {
      // The shape a server with devtools wants: answer for itself locally AND
      // forward to wherever the merged timeline lives.
      const local = decisionSinkRing({ environment: "Server" });
      const sent: Array<unknown> = [];
      const remote = decisionSinkForwarding({
        send: (e) => Effect.sync(() => { sent.push(e); }),
      });

      yield* evaluate(policy).pipe(
        Effect.provide(decisionSinkAll([local.layer, remote])),
      );

      assert.strictEqual((yield* local.snapshot).length, 1);
      assert.strictEqual(sent.length, 1);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("merging two layers for one service would NOT do this", () =>
    Effect.gen(function* () {
      // The trap this function exists to avoid, asserted rather than described:
      // `Layer.merge` on one tag keeps the last, so the first sink sees nothing.
      const first = decisionSinkRing({ environment: "A" });
      const second = decisionSinkRing({ environment: "B" });

      yield* evaluate(policy).pipe(
        Effect.provide(Layer.merge(first.layer, second.layer)),
      );

      const a = yield* first.snapshot;
      const b = yield* second.snapshot;
      assert.strictEqual(a.length + b.length, 1, "exactly one sink should have seen it");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("an empty list is a sink that does nothing, and still decides", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(policy).pipe(Effect.provide(decisionSinkAll([])));
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("writes in the order given", () =>
    Effect.gen(function* () {
      const order: Array<string> = [];
      const named = (name: string) =>
        Layer.succeed(DecisionSink, {
          record: () => Effect.sync(() => { order.push(name); }),
        });

      yield* evaluate(policy).pipe(
        Effect.provide(decisionSinkAll([named("first"), named("second"), named("third")])),
      );

      // Sequential, so what a reader sees is deterministic.
      assert.deepStrictEqual(order, ["first", "second", "third"]);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("forward and ingest, end to end", () => {
  it.effect("a record made in one process arrives in another's log", () =>
    Effect.gen(function* () {
      // Two processes, standing in for a replica and an aggregator. Nothing but
      // the encoded value crosses between them — which is the property that
      // makes replicas and serverless serviceable at all.
      const aggregator = decisionSinkRing({ environment: "Aggregator" });
      const wire: Array<unknown> = [];

      yield* evaluate(policy, { resource: { id: "doc-1" }, action: "read" }).pipe(
        Effect.provide(
          decisionSinkForwarding({ send: (e) => Effect.sync(() => { wire.push(e); }) }),
        ),
      );

      // ... crosses a boundary ...
      const json: unknown = JSON.parse(JSON.stringify(wire[0]));

      // ... and is ingested under the SENDER's label, not the aggregator's.
      const record = yield* decodeRecord(json);
      yield* aggregator.ingest(record, "Replica-3");

      const stored = yield* aggregator.snapshot;
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0]?.environment, "Replica-3");
      assert.strictEqual(stored[0]?._tag, "Decision");
      const first = stored[0];
      if (first?._tag === "Decision") {
        assert.strictEqual(first.action, "read");
        assert.deepStrictEqual(first.resource, { id: "doc-1" });
        assert.deepStrictEqual(first.policy, policy);
      }
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("ingest falls back to the ring's own label", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* ring.ingest({
        _tag: "Obligations",
        evaluationId: "e",
        at: 0,
        outcome: "Refused",
        obligationIds: ["audit.log"],
      });

      assert.strictEqual((yield* ring.snapshot)[0]?.environment, "Server");
    }));

  it.effect("ingested records respect capacity like any other", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server", capacity: 2 });

      for (const id of ["a", "b", "c"]) {
        yield* ring.ingest({
          _tag: "Obligations",
          evaluationId: id,
          at: 0,
          outcome: "Discharged",
          obligationIds: [],
        });
      }

      // One bound for both paths — an aggregator taking records from n replicas
      // is exactly where an unbounded log would hurt most.
      assert.deepStrictEqual(
        (yield* ring.snapshot).map((r) => r.evaluationId),
        ["b", "c"],
      );
    }));
});
