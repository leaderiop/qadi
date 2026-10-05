import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Predicate from "effect/Predicate";
import * as References from "effect/References";
import * as Result from "effect/Result";
import { isAllowed } from "../src/Decision.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { DecisionRecord, Failed, ObligationRecord } from "../src/DecisionRecord.ts";
import { decisionSinkAll, decisionSinkForwarding } from "../src/DecisionSinkForwarding.ts";
import { decisionSinkRing } from "../src/DecisionSinkRing.ts";
import { PolicyTooDeep, SinkRecordNotEncodable } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import { makeSubjectId } from "../src/Identity.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { decodeSinkRecord, encodeSinkRecord } from "../src/SinkCodec.ts";
import * as V2 from "./fixtures/sinkWireV2.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const allowed = subjectWith({ permissions: ["doc:read"] });
const policy = P.hasPermission(read);

describe("decisionSinkForwarding", () => {
  it.effect("hands each record onward, already encoded", () =>
    Effect.gen(function* () {
      const sent: Array<unknown> = [];
      const ring = decisionSinkRing({ environment: "Server" });

      yield* evaluate(policy).pipe(
        Effect.provide(
          decisionSinkAll([
            decisionSinkForwarding({
              send: (encoded) =>
                Effect.sync(() => {
                  sent.push(encoded);
                }),
            }),
            ring.layer,
          ]),
        ),
      );

      assert.strictEqual(sent.length, 1);
      // Encoded, so a transport can hand it straight to JSON without knowing
      // anything about the record type — and encoded by the one outbound
      // operation, so it is exactly what any other sink emits for the record.
      const [stored] = yield* ring.snapshot;
      assert.isDefined(stored);
      if (stored === undefined) return;
      assert.deepStrictEqual(
        sent[0],
        Result.match(encodeSinkRecord(stored), { onSuccess: (json) => json, onFailure: () => "refused" }),
      );
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("send receives wire-version-2 bytes", () =>
    Effect.gen(function* () {
      const record = new ObligationRecord({ evaluationId: "g", at: 1, outcome: "Discharged", obligationIds: ["audit.log"] });
      const sent: Array<string> = [];
      const forwarding = decisionSinkForwarding({
        send: (encoded) => Effect.sync(() => void sent.push(JSON.stringify(encoded))),
      });
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(record);
      }).pipe(Effect.provide(forwarding));
      assert.deepStrictEqual(sent, [V2.V2_OBLIGATIONS]);
    }));

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
      // Regression test: `onFailure` is typed and documented as `(error:
      // unknown) => void`, receiving the value `send` failed with — not an
      // Effect-internal `Cause` wrapping it. Asserting only `seen.length`
      // would pass unchanged whether `seen[0]` were `"unreachable"` or a
      // `Cause` object with no `.message` (BEH-QD-187, CCR-QD-122).
      assert.strictEqual(seen[0], "unreachable");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a failure that DIES is also reported as its plain defect, not a Cause", () =>
    Effect.gen(function* () {
      const seen: Array<unknown> = [];
      const boom = new Error("socket exploded");

      yield* evaluate(policy).pipe(
        Effect.provide(
          decisionSinkForwarding({
            send: () => Effect.die(boom),
            onFailure: (error) => seen.push(error),
          }),
        ),
      );

      assert.strictEqual(seen.length, 1);
      assert.strictEqual(seen[0], boom);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("with no onFailure it warns rather than going quiet", () =>
    Effect.gen(function* () {
      const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];

      yield* evaluate(policy).pipe(
        Effect.provide(Layer.mergeAll(decisionSinkForwarding({ send: () => Effect.fail("unreachable") }), Logger.layer([
            Logger.make((o) => {
              logs.push({
                message: o.message,
                annotations: o.fiber.getRef(References.CurrentLogAnnotations),
              });
            }),
          ]))),
      );

      assert.strictEqual(logs.length, 1);
      const [entry] = logs;
      assert.isDefined(entry);
      if (entry === undefined) return;
      assert.include(String(entry.message), "could not be forwarded");
      // The cause is the whole diagnostic value of the warning — a line saying
      // only "could not be forwarded" tells an operator nothing actionable.
      assert.include(String(entry.annotations["qadi.cause"]), "unreachable");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a successful send logs nothing", () =>
    Effect.gen(function* () {
      const logs: Array<unknown> = [];

      yield* evaluate(policy).pipe(
        Effect.provide(
          Layer.mergeAll(
            decisionSinkForwarding({ send: () => Effect.void }),
            Logger.layer([Logger.make((o) => { logs.push(o.message); })]),
          ),
        ),
      );

      assert.deepStrictEqual(logs, []);
    }).pipe(Effect.provide(testLayer(allowed))));
});

/**
 * An encode refusal is not a delivery failure (ARCH-09 T1 #7/#8). A record the
 * receiver would refuse must be refused at the sender, reported as a refusal,
 * and never handed to `send`.
 */
describe("decisionSinkForwarding refuses what the receiver would refuse", () => {
  const isTooDeepRefusal = (value: unknown): boolean =>
    Predicate.isTagged(value, "SinkRecordNotEncodable") &&
    Predicate.hasProperty(value, "refusal") &&
    Predicate.isTagged(value.refusal, "TooDeep");

  it.effect(
    "a record whose policy is 5,000 levels deep is refused as TooDeep and reported as a refusal, " +
      "never as a send failure",
    () =>
      Effect.gen(function* () {
        let deep: P.Policy = policy;
        for (let i = 0; i < 5_000; i++) deep = P.not(deep);
        const record = new DecisionRecord({
          evaluationId: "deep",
          at: 0,
          subjectId: makeSubjectId("u1"),
          policy: deep,
          outcome: new Failed({ error: new PolicyTooDeep({ maxDepth: 64 }) }),
        });
        const sent: Array<unknown> = [];
        const seen: Array<unknown> = [];

        yield* Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(record);
        }).pipe(
          Effect.provide(
            decisionSinkForwarding({
              send: (encoded) => Effect.sync(() => void sent.push(encoded)),
              onFailure: (error) => void seen.push(error),
            }),
          ),
        );

        assert.strictEqual(sent.length, 0);
        assert.strictEqual(seen.length, 1);
        assert.isTrue(isTooDeepRefusal(seen[0]));
        const path =
          Predicate.hasProperty(seen[0], "refusal") && Predicate.hasProperty(seen[0].refusal, "path")
            ? seen[0].refusal.path
            : undefined;
        assert.isTrue(Array.isArray(path) && path[0] === "policy");
      }),
  );

  it.effect(
    "a successful evaluation the receiver would refuse (allOf×130, maxDepth 200) is refused at the sender instead",
    () =>
      Effect.gen(function* () {
        let nested: P.Policy = policy;
        for (let i = 0; i < 130; i++) nested = P.allOf([nested]);
        const sent: Array<unknown> = [];
        const seen: Array<unknown> = [];

        const decision = yield* evaluate(nested, { maxDepth: 200 }).pipe(
          Effect.provide(
            decisionSinkForwarding({
              send: (encoded) => Effect.sync(() => void sent.push(encoded)),
              onFailure: (error) => void seen.push(error),
            }),
          ),
        );

        assert.isTrue(isAllowed(decision));
        assert.strictEqual(sent.length, 0);
        assert.strictEqual(seen.length, 1);
        assert.isTrue(isTooDeepRefusal(seen[0]));
      }).pipe(Effect.provide(testLayer(allowed))),
  );
});

describe("decisionSinkForwarding reports a refusal as a refusal (ARCH-09 T6)", () => {
  const cyclicResource = (): Record<string, unknown> => {
    const resource: Record<string, unknown> = { id: "doc-1" };
    resource.self = resource;
    return resource;
  };

  it.effect("a refusal is reported through onFailure as a SinkRecordNotEncodable, not a Cause", () =>
    Effect.gen(function* () {
      const sent: Array<unknown> = [];
      const seen: Array<unknown> = [];

      const decision = yield* evaluate(policy, { resource: cyclicResource() }).pipe(
        Effect.provide(
          decisionSinkForwarding({
            send: (encoded) => Effect.sync(() => void sent.push(encoded)),
            onFailure: (error) => void seen.push(error),
          }),
        ),
      );

      assert.isTrue(isAllowed(decision));
      assert.strictEqual(sent.length, 0);
      assert.strictEqual(seen.length, 1);
      assert.instanceOf(seen[0], SinkRecordNotEncodable);
      if (seen[0] instanceof SinkRecordNotEncodable) {
        assert.strictEqual(seen[0].refusal._tag, "Circular");
        assert.strictEqual(seen[0].evaluationId, decision.evaluationId);
      }
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("with no onFailure, a refusal logs its own message, distinct from a send failure", () =>
    Effect.gen(function* () {
      const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];

      yield* evaluate(policy, { resource: { tags: new Set(["finance"]) } }).pipe(
        Effect.provide(
          Layer.mergeAll(
            decisionSinkForwarding({ send: () => Effect.void }),
            Logger.layer([
              Logger.make((o) => {
                logs.push({
                  message: o.message,
                  annotations: o.fiber.getRef(References.CurrentLogAnnotations),
                });
              }),
            ]),
          ),
        ),
      );

      assert.strictEqual(logs.length, 1);
      const [entry] = logs;
      if (entry === undefined) return;
      assert.include(String(entry.message), "could not be encoded for forwarding");
      assert.notInclude(String(entry.message), "could not be forwarded");
      assert.strictEqual(entry.annotations["qadi.refusal"], "Opaque");
      assert.strictEqual(entry.annotations["qadi.path"], "resource.tags");
      assert.isString(entry.annotations["evaluationId"]);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a refusal with no path (EncodeFailed) logs an empty qadi.path", () =>
    Effect.gen(function* () {
      const logs: Array<Record<string, unknown>> = [];
      const hostile = {
        get boom(): unknown {
          throw new Error("getter exploded");
        },
      };

      yield* evaluate(policy, { resource: { nested: hostile } }).pipe(
        Effect.provide(
          Layer.mergeAll(
            decisionSinkForwarding({ send: () => Effect.void }),
            Logger.layer([Logger.make((o) => void logs.push(o.fiber.getRef(References.CurrentLogAnnotations)))]),
          ),
        ),
      );

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.["qadi.refusal"], "EncodeFailed");
      assert.strictEqual(logs[0]?.["qadi.path"], "");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("an onFailure that throws on a refusal still cannot change the decision", () =>
    Effect.gen(function* () {
      const decision = yield* evaluate(policy, { resource: cyclicResource() }).pipe(
        Effect.provide(
          decisionSinkForwarding({
            send: () => Effect.void,
            onFailure: () => {
              throw new Error("alerting is down too");
            },
          }),
        ),
      );
      assert.isTrue(isAllowed(decision));
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

  // JA-02: a member is documented — via `record`'s `never` error channel —
  // to swallow its own failures, but a member that dies anyway (a bug in its
  // own `record`, not the ordinary delivery failure it already catches) must
  // not stop `Effect.forEach` and, with it, every sink after it in the list.
  it.effect("a member that DIES does not stop delivery to the sinks after it", () =>
    Effect.gen(function* () {
      const dying = Layer.succeed(DecisionSink, {
        record: () => Effect.die(new Error("boom")),
      });
      const after: Array<unknown> = [];
      const survivor = Layer.succeed(DecisionSink, {
        record: (record) =>
          Effect.sync(() => {
            after.push(record);
          }),
      });

      const decision = yield* evaluate(policy).pipe(
        Effect.provide(decisionSinkAll([dying, survivor])),
      );

      // Belt-and-suspenders: a dying sink must not change the decision either
      // (INV-QD-035), though `record`'s `never` error channel already forces
      // this at the type level regardless of what this test checks.
      assert.isTrue(isAllowed(decision));
      // The property this test exists for: the sink placed AFTER the dying
      // one still received the record.
      assert.strictEqual(after.length, 1);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a member's death is reported through a log, not silently swallowed", () =>
    Effect.gen(function* () {
      const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];
      const dying = Layer.succeed(DecisionSink, {
        record: () => Effect.die(new Error("boom")),
      });

      yield* evaluate(policy).pipe(
        Effect.provide(
          Layer.mergeAll(
            decisionSinkAll([dying]),
            Logger.layer([
              Logger.make((o) => {
                logs.push({
                  message: o.message,
                  annotations: o.fiber.getRef(References.CurrentLogAnnotations),
                });
              }),
            ]),
          ),
        ),
      );

      assert.strictEqual(logs.length, 1);
      const [entry] = logs;
      assert.isDefined(entry);
      if (entry === undefined) return;
      assert.include(String(entry.message), "failed unexpectedly");
      assert.include(String(entry.annotations["qadi.cause"]), "boom");
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
      const record = yield* Effect.fromResult(decodeSinkRecord(json));
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

      yield* ring.ingest(
        new ObligationRecord({
          evaluationId: "e",
          at: 0,
          outcome: "Refused",
          obligationIds: ["audit.log"],
        }),
      );

      assert.strictEqual((yield* ring.snapshot)[0]?.environment, "Server");
    }));

  it.effect("ingested records respect capacity like any other", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server", capacity: 2 });

      for (const id of ["a", "b", "c"]) {
        yield* ring.ingest(
          new ObligationRecord({
            evaluationId: id,
            at: 0,
            outcome: "Discharged",
            obligationIds: [],
          }),
        );
      }

      // One bound for both paths — an aggregator taking records from n replicas
      // is exactly where an unbounded log would hurt most.
      assert.deepStrictEqual(
        (yield* ring.snapshot).map((r) => r.evaluationId),
        ["b", "c"],
      );
    }));
});
