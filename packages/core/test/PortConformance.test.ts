/**
 * One conformance suite, run over every port in the registry (ARCH-10,
 * INV-QD-901): each port's named default, its three exported wrappers, its
 * scripted and recording doubles and its defect constructor must agree with
 * its description.
 *
 * `CASES` is a mapped type over `PortName`, so a port added to the registry
 * without a case here is a compile error rather than a port the suite silently
 * skips. This replaced the per-port copies of the wrapper tests that used to
 * live in `AttributeResolver.test.ts`, `RelationshipResolver.test.ts`,
 * `CustomPredicate.test.ts` and `Ports.test.ts` — which covered three ports'
 * retrying and bounded wrappers, two ports' timing-out wrappers, and only one
 * port's attempt annotation.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as Schedule from "effect/Schedule";
import * as TestClock from "effect/testing/TestClock";
import type * as Tracer from "effect/Tracer";
import {
  AttributeResolverNone,
  attributeResolverBounded,
  attributeResolverPort,
  attributeResolverRetrying,
  attributeResolverTimingOut,
} from "../src/AttributeResolver.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import {
  CustomPredicateNone,
  customPredicateBounded,
  customPredicatePort,
  customPredicateRetrying,
  customPredicateTimingOut,
} from "../src/CustomPredicate.ts";
import {
  DecisionHistoryUnknown,
  decisionHistoryBounded,
  decisionHistoryPort,
  decisionHistoryRetrying,
  decisionHistoryTimingOut,
} from "../src/DecisionHistory.ts";
import { InvalidBoundedPermits } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import type { PortDescription, PortShape } from "../src/PortDescription.ts";
import { PortReply } from "../src/PortDescription.ts";
import { nonePort } from "../src/PortDerivation.ts";
import { recordingPort, replyTable, scriptedPort } from "../src/PortDoubles.ts";
import { portRetriesTotal, portTimeoutsTotal } from "../src/PortMetrics.ts";
import type { PortName } from "../src/PortMetrics.ts";
import type { PortTypes } from "../src/Ports.ts";
import {
  RelationshipResolverNever,
  relationshipResolverBounded,
  relationshipResolverPort,
  relationshipResolverRetrying,
  relationshipResolverTimingOut,
} from "../src/RelationshipResolver.ts";
import {
  SignatureHistoryNone,
  signatureHistoryBounded,
  signatureHistoryPort,
  signatureHistoryRetrying,
  signatureHistoryTimingOut,
} from "../src/SignatureHistory.ts";
import { collectingTracer, forkAllAndSettle, isolatedMetrics } from "./helpers.ts";

/** What the suite needs to know about one port beyond its description. */
interface PortCase<
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
> {
  readonly description: PortDescription<N, Self, Shape, Args, A, E>;
  /** A representative request. */
  readonly args: Args;
  /** A non-default answer to it. */
  readonly answer: A;
  /** The exported named default and the three exported wrappers. */
  readonly none: Layer.Layer<Self>;
  readonly retrying: (
    schedule: Schedule.Schedule<unknown, E>,
  ) => (layer: Layer.Layer<Self>) => Layer.Layer<Self>;
  readonly bounded: (
    permits: number,
  ) => (layer: Layer.Layer<Self>) => Layer.Layer<Self, InvalidBoundedPermits>;
  readonly timingOut: (duration: Duration.Input) => (layer: Layer.Layer<Self>) => Layer.Layer<Self>;
  /**
   * `true` for the one port whose error has no `cause` field and renders a
   * defect with `Cause.pretty` into `reason` instead (`CustomPredicateError`).
   */
  readonly defectRendersCause: boolean;
}

type CaseOf<D> =
  D extends PortDescription<
    infer N extends PortName,
    infer Self,
    infer Shape extends PortShape,
    infer Args extends ReadonlyArray<unknown>,
    infer A,
    infer E
  >
    ? PortCase<N, Self, Shape, Args, A, E>
    : never;

interface CaseVisitor {
  <N extends PortName, Self, Shape extends PortShape, Args extends ReadonlyArray<unknown>, A, E>(
    c: PortCase<N, Self, Shape, Args, A, E>,
  ): void;
}

const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
const aliceId = makeSubjectId("alice");
const doc = makeResourceId("doc-1");

const CASES: { readonly [K in PortName]: CaseOf<PortTypes[K]> } = {
  AttributeResolver: {
    description: attributeResolverPort,
    args: [aliceId, "level"],
    answer: 5,
    none: AttributeResolverNone,
    retrying: attributeResolverRetrying,
    bounded: attributeResolverBounded,
    timingOut: attributeResolverTimingOut,
    defectRendersCause: false,
  },
  DecisionHistory: {
    description: decisionHistoryPort,
    args: [{ subjectId: aliceId, event: "approved", resourceId: doc }],
    answer: "Acted",
    none: DecisionHistoryUnknown,
    retrying: decisionHistoryRetrying,
    bounded: decisionHistoryBounded,
    timingOut: decisionHistoryTimingOut,
    defectRendersCause: false,
  },
  RelationshipResolver: {
    description: relationshipResolverPort,
    args: [{ subjectId: aliceId, relation: "owner", resourceId: doc, depth: undefined }],
    answer: "Related",
    none: RelationshipResolverNever,
    retrying: relationshipResolverRetrying,
    bounded: relationshipResolverBounded,
    timingOut: relationshipResolverTimingOut,
    defectRendersCause: false,
  },
  CustomPredicate: {
    description: customPredicatePort,
    args: ["isOwner", alice, { id: "doc-1" }, { strict: true }],
    answer: true,
    none: CustomPredicateNone,
    retrying: customPredicateRetrying,
    bounded: customPredicateBounded,
    timingOut: customPredicateTimingOut,
    defectRendersCause: true,
  },
  SignatureHistory: {
    description: signatureHistoryPort,
    args: [{ subjectId: aliceId, resourceId: doc }],
    answer: [{ signerId: aliceId, meaning: "approved", signedAt: 0 }],
    none: SignatureHistoryNone,
    retrying: signatureHistoryRetrying,
    bounded: signatureHistoryBounded,
    timingOut: signatureHistoryTimingOut,
    defectRendersCause: false,
  },
};

/** One run per port; a mapped type, so a missing port is a compile error here too. */
const RUN: { readonly [K in PortName]: (f: CaseVisitor) => void } = {
  AttributeResolver: (f) => f(CASES.AttributeResolver),
  DecisionHistory: (f) => f(CASES.DecisionHistory),
  RelationshipResolver: (f) => f(CASES.RelationshipResolver),
  CustomPredicate: (f) => f(CASES.CustomPredicate),
  SignatureHistory: (f) => f(CASES.SignatureHistory),
};

/**
 * An error's identifying fields, with an `Error` cause reduced to its message
 * — so two errors built from equal but distinct `Error`s compare equal.
 */
const fieldsOf = (error: unknown): ReadonlyArray<readonly [string, unknown]> => [
  ["_tag", Predicate.hasProperty(error, "_tag") ? error._tag : undefined],
  ...Object.entries(Predicate.isObject(error) ? error : {}).map(
    ([key, value]): readonly [string, unknown] => [
      key,
      value instanceof Error ? value.message : value,
    ],
  ),
];

const reasonOf = (error: unknown): unknown =>
  Predicate.hasProperty(error, "reason") ? error.reason : undefined;

const conform: CaseVisitor = (c) => {
  const d = c.description;
  const ask = Effect.flatMap(d.service, (shape) => d.invoke(shape)(...c.args));
  const nameOf = Effect.map(d.service, (shape) => shape.name);
  /** A hand-made implementation of this port, named `name`. */
  const layerOf = (name: string, call: Parameters<typeof d.make>[1]) =>
    Layer.succeed(d.service, d.make(name, call));
  /** The same, with no name at all. */
  const unnamed = (call: Parameters<typeof d.make>[1]) =>
    Layer.succeed(d.service, { ...d.make("x", call), name: undefined });
  const deadline = `${d.port}.${d.method} did not settle within the configured deadline`;

  describe(d.port, () => {
    describe("default (INV-QD-007, ADR-QD-040)", () => {
      it.effect("the exported default is named and answers as the description says", () =>
        Effect.gen(function* () {
          assert.strictEqual(yield* nameOf.pipe(Effect.provide(c.none)), d.none.name);
          assert.deepStrictEqual(yield* ask.pipe(Effect.provide(c.none)), d.none.answer);
          assert.deepStrictEqual(
            yield* ask.pipe(Effect.provide(nonePort(d))),
            yield* ask.pipe(Effect.provide(c.none)),
          );
        }));

      it("a shared default answer cannot be changed by a caller", () => {
        const answer = d.none.answer;
        if (Array.isArray(answer)) assert.isTrue(Object.isFrozen(answer));
      });
    });

    describe("retrying", () => {
      it.effect("retries until it answers, annotating every attempt and counting failures", () =>
        Effect.gen(function* () {
          let attempt = 0;
          const double = scriptedPort(d, () => {
            attempt += 1;
            return attempt < 3 ? PortReply.fail("flaky") : PortReply.answer(c.answer);
          });
          const spans: Array<Tracer.Span> = [];
          const answer = yield* Effect.withSpan("caller")(
            ask.pipe(Effect.provide(c.retrying(Schedule.recurs(5))(double.layer))),
          ).pipe(Effect.provide(collectingTracer(spans)));

          assert.deepStrictEqual(answer, c.answer);
          assert.strictEqual(double.calls.length, 3);
          const caller = spans.find((s) => s.name === "caller");
          assert.deepStrictEqual(Object.fromEntries(caller?.attributes ?? []), {
            "qadi.attempts": 3,
          });
          const retries = yield* Metric.value(portRetriesTotal);
          assert.strictEqual(retries.occurrences.get(d.port), 2);
        }).pipe(isolatedMetrics));

      it.effect("surfaces the port's own error instance once the schedule is exhausted", () =>
        Effect.gen(function* () {
          const original = d.failure(c.args, "down");
          const invoked = yield* Ref.make(0);
          const failing = layerOf("failing", () =>
            Effect.flatMap(Ref.update(invoked, (n) => n + 1), () => Effect.fail(original)),
          );
          const spans: Array<Tracer.Span> = [];
          const result = yield* Effect.withSpan("caller")(
            Effect.result(ask.pipe(Effect.provide(c.retrying(Schedule.recurs(2))(failing)))),
          ).pipe(Effect.provide(collectingTracer(spans)));

          assert.isTrue(Result.isFailure(result));
          if (!Result.isFailure(result)) return;
          assert.strictEqual(result.failure, original);
          assert.strictEqual(yield* Ref.get(invoked), 3);
          const caller = spans.find((s) => s.name === "caller");
          assert.deepStrictEqual(Object.fromEntries(caller?.attributes ?? []), {
            "qadi.attempts": 3,
          });
          const retries = yield* Metric.value(portRetriesTotal);
          assert.strictEqual(retries.occurrences.get(d.port), 3);
        }).pipe(isolatedMetrics));
    });

    describe("bounded", () => {
      it.effect("never runs more than `permits` calls at once", () =>
        Effect.gen(function* () {
          const inFlight = yield* Ref.make(0);
          const peak = yield* Ref.make(0);
          const gate = yield* Latch.make();
          const blocking = layerOf("blocking", () =>
            Effect.gen(function* () {
              const current = yield* Ref.updateAndGet(inFlight, (n) => n + 1);
              yield* Ref.update(peak, (max) => Math.max(max, current));
              yield* gate.await;
              yield* Ref.update(inFlight, (n) => n - 1);
              return c.answer;
            }),
          );
          const results = yield* Effect.gen(function* () {
            const fibers = yield* forkAllAndSettle(Array.from({ length: 5 }, () => ask));
            assert.strictEqual(yield* Ref.get(inFlight), 2);
            yield* gate.open;
            return yield* Effect.forEach(fibers, (f) => Effect.result(Fiber.join(f)));
          }).pipe(Effect.provide(c.bounded(2)(blocking)));

          for (const result of results) assert.isTrue(Result.isSuccess(result));
          assert.strictEqual(yield* Ref.get(peak), 2);
          assert.strictEqual(yield* Ref.get(inFlight), 0);
        }));

      it.effect("passes the port's own failure through unchanged", () =>
        Effect.gen(function* () {
          const original = d.failure(c.args, "down");
          const result = yield* Effect.result(
            ask.pipe(Effect.provide(c.bounded(1)(layerOf("failing", () => Effect.fail(original))))),
          );
          assert.isTrue(Result.isFailure(result));
          if (!Result.isFailure(result)) return;
          assert.strictEqual(result.failure, original);
        }));

      it.effect("rejects a permit count that is not a positive integer, and accepts one", () =>
        Effect.gen(function* () {
          for (const permits of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
            const result = yield* Effect.result(ask.pipe(Effect.provide(c.bounded(permits)(c.none))));
            assert.isTrue(Result.isFailure(result), `permits ${permits}`);
            if (!Result.isFailure(result)) continue;
            assert.instanceOf(result.failure, InvalidBoundedPermits);
          }
          assert.deepStrictEqual(
            yield* ask.pipe(Effect.provide(c.bounded(1)(c.none))),
            d.none.answer,
          );
        }));
    });

    describe("timing out", () => {
      it.effect("turns a call that never settles into the port's own error, and counts it", () =>
        Effect.gen(function* () {
          const fiber = yield* Effect.forkChild(
            Effect.result(ask.pipe(Effect.provide(c.timingOut("1 second")(layerOf("hung", () => Effect.never))))),
          );
          yield* TestClock.adjust("1 second");
          const result = yield* Fiber.join(fiber);

          assert.isTrue(Result.isFailure(result));
          if (!Result.isFailure(result)) return;
          assert.deepStrictEqual(
            fieldsOf(result.failure),
            fieldsOf(d.failure(c.args, new Error(deadline))),
          );
          const timeouts = yield* Metric.value(portTimeoutsTotal);
          assert.strictEqual(timeouts.occurrences.get(d.port), 1);
        }).pipe(isolatedMetrics));

      it.effect("passes an answer and the port's own failure through when they settle in time", () =>
        Effect.gen(function* () {
          const answering = layerOf("answering", () => Effect.succeed(c.answer));
          assert.deepStrictEqual(
            yield* ask.pipe(Effect.provide(c.timingOut("1 second")(answering))),
            c.answer,
          );
          const original = d.failure(c.args, "down");
          const result = yield* Effect.result(
            ask.pipe(Effect.provide(c.timingOut("1 second")(layerOf("failing", () => Effect.fail(original))))),
          );
          assert.isTrue(Result.isFailure(result));
          if (!Result.isFailure(result)) return;
          assert.strictEqual(result.failure, original);
        }));
    });

    describe("names (BEH-QD-196)", () => {
      it.effect("each wrapper composes its name onto the one it wraps", () =>
        Effect.gen(function* () {
          const name = (layer: Layer.Layer<typeof d.service.Identifier, unknown>) =>
            nameOf.pipe(Effect.provide(layer));
          assert.strictEqual(yield* name(c.retrying(Schedule.recurs(1))(c.none)), `${d.none.name} (retrying)`);
          assert.strictEqual(yield* name(c.bounded(2)(c.none)), `${d.none.name} (bounded 2)`);
          assert.strictEqual(yield* name(c.timingOut("1 second")(c.none)), `${d.none.name} (timing out)`);
          const inner = unnamed(() => Effect.succeed(c.answer));
          assert.strictEqual(yield* name(c.retrying(Schedule.recurs(1))(inner)), "? (retrying)");
          assert.strictEqual(yield* name(c.bounded(3)(inner)), "? (bounded 3)");
          assert.strictEqual(yield* name(c.timingOut("1 second")(inner)), "? (timing out)");
        }));
    });

    describe("scripted double", () => {
      it.effect("answers, fails, dies and throws per request, falls through, and logs in order", () =>
        Effect.gen(function* () {
          const replies = [
            PortReply.answer(c.answer),
            PortReply.fail("down"),
            PortReply.die("dead"),
            PortReply.throw("thrown"),
            undefined,
          ];
          let next = 0;
          const double = scriptedPort(d, () => replies[next++]);
          const exits = yield* Effect.forEach(replies, () =>
            Effect.exit(ask.pipe(Effect.provide(double.layer))),
          );

          assert.deepStrictEqual(exits[0], Exit.succeed(c.answer));
          assert.deepStrictEqual(exits[1], Exit.fail(d.failure(c.args, "down")));
          for (const exit of [exits[2], exits[3]]) {
            assert.isTrue(exit !== undefined && Exit.isFailure(exit) && Cause.hasDies(exit.cause));
          }
          assert.deepStrictEqual(exits[4], Exit.succeed(d.none.answer));
          assert.deepStrictEqual(double.calls, replies.map(() => c.args));
          assert.strictEqual(yield* nameOf.pipe(Effect.provide(double.layer)), `scripted ${d.port}`);
        }));

      it.effect("a reply table answers by the description's key", () =>
        Effect.gen(function* () {
          const double = scriptedPort(d, replyTable(d, [[c.args, PortReply.answer(c.answer)]]));
          assert.deepStrictEqual(yield* ask.pipe(Effect.provide(double.layer)), c.answer);
        }));
    });

    describe("recording decorator", () => {
      it.effect("passes the inner exit through and reports it", () =>
        Effect.gen(function* () {
          const failing = scriptedPort(d, () => PortReply.fail("down"));
          const seen: Array<Exit.Exit<unknown, unknown>> = [];
          const recording = recordingPort(d, failing.layer, (_args, exit) => {
            seen.push(exit);
          });
          const exit = yield* Effect.exit(ask.pipe(Effect.provide(recording.layer)));
          assert.deepStrictEqual(exit, Exit.fail(d.failure(c.args, "down")));
          assert.deepStrictEqual(seen, [exit]);
          assert.deepStrictEqual(recording.calls, [c.args]);
        }));
    });

    describe("defect constructor (ADR-QD-077)", () => {
      it("names the same request as a failure would", () => {
        const defect = new Error("boom");
        const cause = Cause.die(defect);
        const fromDefect = d.defect(c.args, cause);
        if (c.defectRendersCause) {
          assert.strictEqual(reasonOf(fromDefect), Cause.pretty(cause));
          assert.deepStrictEqual(
            fieldsOf(fromDefect).filter(([key]) => key !== "reason"),
            fieldsOf(d.failure(c.args, defect)).filter(([key]) => key !== "reason"),
          );
        } else {
          assert.deepStrictEqual(fieldsOf(fromDefect), fieldsOf(d.failure(c.args, defect)));
        }
      });
    });
  });
};

for (const run of Record.values(RUN)) run(conform);

/**
 * The request keys, pinned exactly: `@qadi/devtools`' capture and replay key
 * by them (INV-QD-043), so a key that changed shape would orphan every saved
 * capture. Each includes the subject, and an absent resource is `null` so an
 * "ever, at all" question never collides with a resource-scoped one.
 */
describe("request keys", () => {
  it("are the collision-safe JSON of the question each port is asked", () => {
    assert.strictEqual(attributeResolverPort.key([aliceId, "level"]), '["alice","level"]');
    assert.strictEqual(
      decisionHistoryPort.key([{ subjectId: aliceId, event: "approved", resourceId: undefined }]),
      '["alice","approved",null]',
    );
    assert.strictEqual(
      decisionHistoryPort.key([{ subjectId: aliceId, event: "approved", resourceId: doc }]),
      '["alice","approved","doc-1"]',
    );
    assert.strictEqual(
      relationshipResolverPort.key([
        { subjectId: aliceId, relation: "owner", resourceId: doc, depth: 3 },
      ]),
      '["alice","owner","doc-1"]',
    );
    assert.strictEqual(
      customPredicatePort.key(["isOwner", alice, { id: "doc-1" }, { strict: true }]),
      '["alice","isOwner",{"strict":true}]',
    );
    assert.strictEqual(
      signatureHistoryPort.key([{ subjectId: aliceId, resourceId: undefined }]),
      '["alice",null]',
    );
    assert.strictEqual(
      signatureHistoryPort.key([{ subjectId: aliceId, resourceId: doc }]),
      '["alice","doc-1"]',
    );
  });
});

/**
 * `CustomPredicateError` has no `cause` field, so a failure's cause is
 * rendered into `reason` — and the rendering must be total, or a failure
 * would turn into a defect while being described.
 */
describe("customPredicatePort's failure reason", () => {
  const reasonFor = (cause: unknown) =>
    customPredicatePort.failure(["isOwner", alice, undefined, undefined], cause).reason;

  it("is a string as given, an Error's message, or anything else's String rendering", () => {
    assert.strictEqual(reasonFor("down"), "down");
    assert.strictEqual(reasonFor(new Error("slow")), "slow");
    assert.strictEqual(reasonFor(42), "42");
  });

  it("is a placeholder for a value that cannot be rendered", () => {
    const unrenderable = {
      toString: () => {
        throw new Error("no");
      },
    };
    assert.strictEqual(reasonFor(unrenderable), "<unrenderable cause>");
  });
});
