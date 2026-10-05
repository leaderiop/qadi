/**
 * The generic derivations (`PortDerivation.ts`) and doubles (`PortDoubles.ts`),
 * pinned against a test-local port rather than one of the five real ones — so
 * what this file proves is the machinery itself, independent of any real
 * port's description. `PortConformance.test.ts` runs the same derivations over
 * every member of the registry.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as Schedule from "effect/Schedule";
import * as TestClock from "effect/testing/TestClock";
import type * as Tracer from "effect/Tracer";
import type { PortDescription } from "../src/PortDescription.ts";
import { PortReply } from "../src/PortDescription.ts";
import {
  boundedPort,
  nonePort,
  retryingPort,
  timingOutPort,
  wrapPort,
} from "../src/PortDerivation.ts";
import { recordingPort, replyTable, scriptedPort } from "../src/PortDoubles.ts";
import { portRetriesTotal, portTimeoutsTotal } from "../src/PortMetrics.ts";
import { collectingTracer, forkAllAndSettle, isolatedMetrics } from "./helpers.ts";

class ProbeError extends Data.TaggedError("ProbeError")<{
  readonly what: string;
  readonly cause: unknown;
}> {}

interface ProbeShape {
  readonly name?: string | undefined;
  readonly ask: (who: string, what: string) => Effect.Effect<number | undefined, ProbeError>;
}

class ProbePort extends Context.Service<ProbePort, ProbeShape>()("qadi/test/ProbePort") {
  static readonly ask = (who: string, what: string) => ProbePort.use((p) => p.ask(who, what));
}

/**
 * Borrows `"AttributeResolver"` as its port name, so the metric words it
 * updates are real ones; nothing else about it is the attribute port's.
 */
const probePort: PortDescription<
  "AttributeResolver",
  ProbePort,
  ProbeShape,
  [who: string, what: string],
  number | undefined,
  ProbeError
> = {
  port: "AttributeResolver",
  method: "ask",
  span: "qadi.attribute",
  service: ProbePort,
  invoke: (shape) => (who, what) => shape.ask(who, what),
  make: (name, call) => ({ name, ask: call }),
  failure: ([, what], cause) => new ProbeError({ what, cause }),
  defect: ([, what], cause) => new ProbeError({ what, cause: Cause.squash(cause) }),
  key: ([who, what]) => JSON.stringify([who, what]),
  none: { name: "ProbeNone", answer: undefined },
};

const named = (name: string | undefined, answer: number): Layer.Layer<ProbePort> =>
  Layer.succeed(ProbePort, { name, ask: () => Effect.succeed(answer) });

/** Fails `failures` times, then answers 7; counts every invocation of `ask`. */
const flaky = (failures: number, invoked: Ref.Ref<number>): Layer.Layer<ProbePort> =>
  Layer.succeed(ProbePort, {
    name: "flaky",
    ask: (_who, what) =>
      Ref.updateAndGet(invoked, (n) => n + 1).pipe(
        Effect.flatMap((n) =>
          n <= failures ? Effect.fail(new ProbeError({ what, cause: "flaky" })) : Effect.succeed(7),
        ),
      ),
  });

const nameOf = (layer: Layer.Layer<ProbePort, unknown>) =>
  Effect.map(Effect.provide(ProbePort.use(Effect.succeed), layer), (p) => p.name);

describe("nonePort", () => {
  it.effect("answers the description's none answer under its name", () =>
    Effect.gen(function* () {
      const layer = nonePort(probePort);
      assert.strictEqual(yield* nameOf(layer), "ProbeNone");
      assert.isUndefined(yield* ProbePort.ask("alice", "x").pipe(Effect.provide(layer)));
    }));
});

describe("wrapPort", () => {
  it.effect("names the wrapper around its inner, and an unnamed inner as ?", () =>
    Effect.gen(function* () {
      const around = (call: (who: string, what: string) => Effect.Effect<number | undefined, ProbeError>) =>
        (who: string, what: string) => Effect.map(call(who, what), (n) => (n ?? 0) + 1);
      assert.strictEqual(yield* nameOf(wrapPort(probePort, named("base", 1), "x", around)), "base (x)");
      assert.strictEqual(yield* nameOf(wrapPort(probePort, named(undefined, 1), "x", around)), "? (x)");
      assert.strictEqual(
        yield* ProbePort.ask("a", "b").pipe(Effect.provide(wrapPort(probePort, named("base", 1), "x", around))),
        2,
      );
    }));
});

describe("retryingPort", () => {
  it.effect("retries until the schedule outlasts the failures, counting attempts", () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0);
      const spans: Array<Tracer.Span> = [];
      const layer = retryingPort(probePort)(Schedule.recurs(5))(flaky(2, invoked));

      const answer = yield* Effect.withSpan("caller")(
        ProbePort.ask("alice", "x").pipe(Effect.provide(layer)),
      ).pipe(Effect.provide(collectingTracer(spans)));

      assert.strictEqual(answer, 7);
      assert.strictEqual(yield* Ref.get(invoked), 3);
      const caller = spans.find((s) => s.name === "caller");
      assert.deepStrictEqual(Object.fromEntries(caller?.attributes ?? []), { "qadi.attempts": 3 });
      const retries = yield* Metric.value(portRetriesTotal);
      assert.strictEqual(retries.occurrences.get("AttributeResolver"), 2);
      assert.strictEqual(yield* nameOf(layer), "flaky (retrying)");
    }).pipe(isolatedMetrics));

  it.effect("surfaces the port's own error once the schedule is exhausted", () =>
    Effect.gen(function* () {
      const invoked = yield* Ref.make(0);
      const spans: Array<Tracer.Span> = [];
      const layer = retryingPort(probePort)(Schedule.recurs(2))(flaky(999, invoked));

      const result = yield* Effect.withSpan("caller")(
        Effect.result(ProbePort.ask("alice", "x").pipe(Effect.provide(layer))),
      ).pipe(Effect.provide(collectingTracer(spans)));

      assert.isTrue(Result.isFailure(result));
      if (!Result.isFailure(result)) return;
      assert.deepStrictEqual(result.failure, new ProbeError({ what: "x", cause: "flaky" }));
      assert.strictEqual(yield* Ref.get(invoked), 3);
      const caller = spans.find((s) => s.name === "caller");
      assert.deepStrictEqual(Object.fromEntries(caller?.attributes ?? []), { "qadi.attempts": 3 });
      const retries = yield* Metric.value(portRetriesTotal);
      assert.strictEqual(retries.occurrences.get("AttributeResolver"), 3);
    }).pipe(isolatedMetrics));

  it.effect("re-invokes the method on every attempt, so a script is consulted per attempt", () =>
    Effect.gen(function* () {
      let attempt = 0;
      const double = scriptedPort(probePort, () => {
        attempt += 1;
        return attempt < 3 ? PortReply.fail("down") : PortReply.answer(9);
      });
      const answer = yield* ProbePort.ask("alice", "x").pipe(
        Effect.provide(retryingPort(probePort)(Schedule.recurs(5))(double.layer)),
      );
      assert.strictEqual(answer, 9);
      assert.strictEqual(double.calls.length, 3);
    }));
});

describe("boundedPort", () => {
  it.effect("never runs more than `permits` calls at once", () =>
    Effect.gen(function* () {
      const inFlight = yield* Ref.make(0);
      const peak = yield* Ref.make(0);
      const gate = yield* Latch.make();
      const blocking = Layer.succeed(ProbePort, {
        name: "blocking",
        ask: () =>
          Effect.gen(function* () {
            const current = yield* Ref.updateAndGet(inFlight, (n) => n + 1);
            yield* Ref.update(peak, (max) => Math.max(max, current));
            yield* gate.await;
            yield* Ref.update(inFlight, (n) => n - 1);
            return 1;
          }),
      });
      const layer = boundedPort(probePort)(2)(blocking);

      const results = yield* Effect.gen(function* () {
        const fibers = yield* forkAllAndSettle(
          Array.from({ length: 5 }, (_, i) => ProbePort.ask(`u${i}`, "x")),
        );
        assert.strictEqual(yield* Ref.get(inFlight), 2);
        yield* gate.open;
        return yield* Effect.forEach(fibers, (f) => Effect.result(Fiber.join(f)));
      }).pipe(Effect.provide(layer));

      for (const result of results) assert.isTrue(Result.isSuccess(result));
      assert.strictEqual(yield* Ref.get(peak), 2);
      assert.strictEqual(yield* nameOf(layer), "blocking (bounded 2)");
    }));

  it.effect("fails construction with InvalidBoundedPermits for a count that is not a positive integer", () =>
    Effect.gen(function* () {
      for (const permits of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        const result = yield* Effect.result(
          ProbePort.ask("a", "x").pipe(Effect.provide(boundedPort(probePort)(permits)(named("n", 1)))),
        );
        assert.isTrue(Result.isFailure(result), `permits ${permits} should fail`);
        if (!Result.isFailure(result)) continue;
        assert.strictEqual(result.failure._tag, "InvalidBoundedPermits");
      }
      assert.strictEqual(
        yield* ProbePort.ask("a", "x").pipe(Effect.provide(boundedPort(probePort)(1)(named("n", 4)))),
        4,
      );
    }));
});

describe("timingOutPort", () => {
  it.effect("fails with the port's own error, the exact deadline message, and counts it", () =>
    Effect.gen(function* () {
      const layer = timingOutPort(probePort)("1 second")(
        Layer.succeed(ProbePort, { name: "hung", ask: () => Effect.never }),
      );
      const fiber = yield* Effect.forkChild(
        Effect.result(ProbePort.ask("alice", "x").pipe(Effect.provide(layer))),
      );
      yield* TestClock.adjust("1 second");
      const result = yield* Fiber.join(fiber);

      assert.isTrue(Result.isFailure(result));
      if (!Result.isFailure(result)) return;
      assert.strictEqual(result.failure._tag, "ProbeError");
      assert.strictEqual(result.failure.what, "x");
      assert.instanceOf(result.failure.cause, Error);
      if (!(result.failure.cause instanceof Error)) return;
      assert.strictEqual(
        result.failure.cause.message,
        "AttributeResolver.ask did not settle within the configured deadline",
      );
      const timeouts = yield* Metric.value(portTimeoutsTotal);
      assert.strictEqual(timeouts.occurrences.get("AttributeResolver"), 1);
      assert.strictEqual(yield* nameOf(layer), "hung (timing out)");
    }).pipe(isolatedMetrics));

  it.effect("passes an answer and the port's own failure through when they settle in time", () =>
    Effect.gen(function* () {
      assert.strictEqual(
        yield* ProbePort.ask("a", "x").pipe(
          Effect.provide(timingOutPort(probePort)("1 second")(named("n", 3))),
        ),
        3,
      );
      const failing = scriptedPort(probePort, () => PortReply.fail("down"));
      const result = yield* Effect.result(
        ProbePort.ask("a", "x").pipe(
          Effect.provide(timingOutPort(probePort)("1 second")(failing.layer)),
        ),
      );
      assert.isTrue(Result.isFailure(result));
      if (!Result.isFailure(result)) return;
      assert.deepStrictEqual(result.failure, new ProbeError({ what: "x", cause: "down" }));
      const timeouts = yield* Metric.value(portTimeoutsTotal);
      assert.strictEqual(timeouts.occurrences.get("AttributeResolver"), 0);
    }).pipe(isolatedMetrics));
});

describe("scriptedPort", () => {
  it.effect("answers, fails, dies, throws and falls through, logging every request in order", () =>
    Effect.gen(function* () {
      const double = scriptedPort(probePort, (_who, what) => {
        if (what === "answer") return PortReply.answer(5);
        if (what === "fail") return PortReply.fail("down");
        if (what === "die") return PortReply.die("dead");
        if (what === "throw") return PortReply.throw(new Error("thrown"));
        return undefined;
      });
      const ask = (what: string) =>
        Effect.exit(ProbePort.ask("alice", what).pipe(Effect.provide(double.layer)));

      assert.deepStrictEqual(yield* ask("answer"), Exit.succeed(5));
      assert.deepStrictEqual(
        yield* ask("fail"),
        Exit.fail(new ProbeError({ what: "fail", cause: "down" })),
      );
      const died = yield* ask("die");
      assert.isTrue(Exit.isFailure(died) && Cause.hasDies(died.cause));
      assert.isTrue(Exit.isFailure(died) && Cause.squash(died.cause) === "dead");
      const thrown = yield* ask("throw");
      assert.isTrue(Exit.isFailure(thrown) && Cause.hasDies(thrown.cause));
      assert.deepStrictEqual(yield* ask("other"), Exit.succeed(undefined));

      assert.deepStrictEqual(double.calls, [
        ["alice", "answer"],
        ["alice", "fail"],
        ["alice", "die"],
        ["alice", "throw"],
        ["alice", "other"],
      ]);
      assert.strictEqual(yield* nameOf(double.layer), "scripted AttributeResolver");
    }));

  it("throws synchronously from the method body on a Throw reply", () => {
    const double = scriptedPort(probePort, () => PortReply.throw(new Error("thrown")), "custom");
    const shape = Effect.runSync(Effect.provide(ProbePort.use(Effect.succeed), double.layer));
    assert.strictEqual(shape.name, "custom");
    assert.throws(() => shape.ask("a", "b"), "thrown");
  });
});

describe("replyTable", () => {
  it.effect("replies by the description's key and falls through otherwise", () =>
    Effect.gen(function* () {
      const double = scriptedPort(
        probePort,
        replyTable(probePort, [
          [["alice", "level"], PortReply.answer(3)],
          [["alice", "boom"], PortReply.fail("down")],
        ]),
      );
      const ask = (who: string, what: string) =>
        Effect.exit(ProbePort.ask(who, what).pipe(Effect.provide(double.layer)));
      assert.deepStrictEqual(yield* ask("alice", "level"), Exit.succeed(3));
      assert.deepStrictEqual(
        yield* ask("alice", "boom"),
        Exit.fail(new ProbeError({ what: "boom", cause: "down" })),
      );
      // Same attribute, another subject: a different key, so the default.
      assert.deepStrictEqual(yield* ask("bob", "level"), Exit.succeed(undefined));
    }));
});

describe("recordingPort", () => {
  it.effect("passes success, typed failure and defect through unchanged, and reports each exit", () =>
    Effect.gen(function* () {
      const inner = scriptedPort(probePort, (_who, what) => {
        if (what === "fail") return PortReply.fail("down");
        if (what === "die") return PortReply.die("dead");
        return PortReply.answer(1);
      });
      const seen: Array<readonly [string, Exit.Exit<number | undefined, ProbeError>]> = [];
      const recording = recordingPort(probePort, inner.layer, ([, what], exit) => {
        seen.push([what, exit]);
      });
      const ask = (what: string) =>
        Effect.exit(ProbePort.ask("alice", what).pipe(Effect.provide(recording.layer)));

      const ok = yield* ask("ok");
      const failed = yield* ask("fail");
      const died = yield* ask("die");

      assert.deepStrictEqual(ok, Exit.succeed(1));
      assert.deepStrictEqual(failed, Exit.fail(new ProbeError({ what: "fail", cause: "down" })));
      assert.isTrue(Exit.isFailure(died) && Cause.hasDies(died.cause));
      assert.deepStrictEqual(
        seen.map(([what]) => what),
        ["ok", "fail", "die"],
      );
      assert.deepStrictEqual(seen[0]?.[1], ok);
      assert.deepStrictEqual(seen[1]?.[1], failed);
      assert.deepStrictEqual(recording.calls, [
        ["alice", "ok"],
        ["alice", "fail"],
        ["alice", "die"],
      ]);
      assert.strictEqual(yield* nameOf(recording.layer), "scripted AttributeResolver (recording)");
    }));

  it.effect("observes nothing by default and still records", () =>
    Effect.gen(function* () {
      const recording = recordingPort(probePort, named("base", 2));
      assert.strictEqual(
        yield* ProbePort.ask("a", "b").pipe(Effect.provide(recording.layer)),
        2,
      );
      assert.deepStrictEqual(recording.calls, [["a", "b"]]);
    }));
});
