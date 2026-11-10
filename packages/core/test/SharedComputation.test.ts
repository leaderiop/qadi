import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import type { CacheOutcome } from "../src/EvaluationMetrics.ts";
import { makeSharedComputation } from "../src/SharedComputation.ts";

/**
 * The single-flight regime `DecisionCache` delegates to, exercised with plain
 * string keys, `Deferred` latches and `Ref` counters: no `Question`, no `Trace`,
 * no walk.
 */
describe("SharedComputation", () => {
  const settleTurns = Effect.gen(function* () {
    for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
  });

  /** A tiny cache over the hooks: settled successes are remembered, failures are not. */
  const harness = () => {
    const cache = new Map<string, number>();
    const settled: Array<string> = [];
    const outcomes: Array<CacheOutcome> = [];
    const shared = makeSharedComputation<string, number, string>({
      cached: (key) => Option.fromUndefinedOr(cache.get(key)),
      claim: (key) => (exit) => {
        settled.push(`${key}:${exit._tag}`);
        if (Exit.isSuccess(exit)) cache.set(key, exit.value);
      },
      onOutcome: (outcome) => Effect.sync(() => outcomes.push(outcome)),
    });
    return { cache, settled, outcomes, shared };
  };

  it.effect("two asks for one key in flight run compute once and both get its value", () =>
    Effect.gen(function* () {
      const { outcomes, shared } = harness();
      const runs = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();
      const compute = Ref.update(runs, (n) => n + 1).pipe(
        Effect.andThen(Deferred.await(gate)),
        Effect.as(7),
      );

      const a = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      const b = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      // Counted while still waiting: the outcome is reported before the answer.
      assert.deepStrictEqual(outcomes, ["miss", "coalesced"]);
      yield* Deferred.succeed(gate, undefined);

      assert.deepStrictEqual(yield* Fiber.join(a), { value: 7, outcome: "miss" });
      assert.deepStrictEqual(yield* Fiber.join(b), { value: 7, outcome: "coalesced" });
      assert.strictEqual(yield* Ref.get(runs), 1);
    }));

  it.effect("asks for two keys run two computes", () =>
    Effect.gen(function* () {
      const { shared } = harness();
      const runs = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();
      const compute = (value: number) =>
        Ref.update(runs, (n) => n + 1).pipe(Effect.andThen(Deferred.await(gate)), Effect.as(value));

      const a = yield* Effect.forkChild(shared.run("a", compute(1)));
      const b = yield* Effect.forkChild(shared.run("b", compute(2)));
      yield* settleTurns;
      assert.strictEqual(yield* Ref.get(runs), 2);
      yield* Deferred.succeed(gate, undefined);

      assert.deepStrictEqual(yield* Fiber.join(a), { value: 1, outcome: "miss" });
      assert.deepStrictEqual(yield* Fiber.join(b), { value: 2, outcome: "miss" });
    }));

  it.effect("a cached value answers hit without running compute", () =>
    Effect.gen(function* () {
      const { cache, outcomes, shared } = harness();
      cache.set("k", 3);
      const runs = yield* Ref.make(0);

      const result = yield* shared.run("k", Ref.update(runs, (n) => n + 1).pipe(Effect.as(9)));

      assert.deepStrictEqual(result, { value: 3, outcome: "hit" });
      assert.deepStrictEqual(outcomes, ["hit"]);
      assert.strictEqual(yield* Ref.get(runs), 0);
    }));

  it.effect("a key cached between two asks is a hit for the second, never a second claim", () =>
    Effect.gen(function* () {
      const { settled, shared } = harness();
      const runs = yield* Ref.make(0);
      const compute = Ref.update(runs, (n) => n + 1).pipe(Effect.as(4));

      const first = yield* shared.run("k", compute);
      const second = yield* shared.run("k", compute);

      assert.deepStrictEqual(first, { value: 4, outcome: "miss" });
      assert.deepStrictEqual(second, { value: 4, outcome: "hit" });
      assert.strictEqual(yield* Ref.get(runs), 1);
      assert.deepStrictEqual(settled, ["k:Success"]);
    }));

  it.effect("a failure settles every waiter with that failure, and the cache keeps nothing", () =>
    Effect.gen(function* () {
      const { cache, settled, shared } = harness();
      const runs = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();
      const compute = Ref.update(runs, (n) => n + 1).pipe(
        Effect.andThen(Deferred.await(gate)),
        Effect.andThen(Effect.fail("down")),
      );

      const a = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      const b = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      yield* Deferred.succeed(gate, undefined);

      assert.deepStrictEqual(yield* Fiber.await(a), Exit.fail("down"));
      assert.deepStrictEqual(yield* Fiber.await(b), Exit.fail("down"));
      assert.strictEqual(yield* Ref.get(runs), 1);
      // The settle saw the failed exit; the test's cache wrote nothing for it.
      assert.deepStrictEqual(settled, ["k:Failure"]);
      assert.strictEqual(cache.size, 0);

      // Nothing is in flight and nothing is cached, so the next ask runs fresh.
      const retry = yield* Effect.exit(shared.run("k", compute));
      assert.deepStrictEqual(retry, Exit.fail("down"));
      assert.strictEqual(yield* Ref.get(runs), 2);
    }));

  it.effect("one of two waiters interrupted: the other still gets the value, compute is not interrupted", () =>
    Effect.gen(function* () {
      const { shared } = harness();
      const gate = yield* Deferred.make<void>();
      const interrupted = yield* Deferred.make<void>();
      const compute = Deferred.await(gate).pipe(
        Effect.as(5),
        Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)),
      );

      const a = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      const b = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      yield* Fiber.interrupt(a);
      const leftExit = yield* Fiber.await(a);
      yield* settleTurns;

      // Leaving cleanly: an interrupt and nothing else, no defect from the leave itself.
      assert.isTrue(Exit.isFailure(leftExit) && Cause.hasInterruptsOnly(leftExit.cause));
      assert.isFalse(yield* Deferred.isDone(interrupted), "compute was interrupted while b still waits");
      yield* Deferred.succeed(gate, undefined);
      assert.deepStrictEqual(yield* Fiber.join(b), { value: 5, outcome: "coalesced" });
      assert.isFalse(yield* Deferred.isDone(interrupted));
    }));

  it.effect("every waiter interrupted: compute is interrupted", () =>
    Effect.gen(function* () {
      const { settled, shared } = harness();
      const gate = yield* Deferred.make<void>();
      const interrupted = yield* Deferred.make<void>();
      const compute = Deferred.await(gate).pipe(
        Effect.as(5),
        Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)),
      );

      const a = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      const b = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      yield* Fiber.interrupt(a);
      yield* Fiber.interrupt(b);
      yield* Deferred.await(interrupted);
      yield* settleTurns;

      assert.deepStrictEqual(settled, ["k:Failure"]);
    }));

  it.effect("the settle runs exactly once per claim, before any waiter observes the result", () =>
    Effect.gen(function* () {
      const log: Array<string> = [];
      const shared = makeSharedComputation<string, number, never>({
        cached: () => Option.none(),
        claim: (key) => () => {
          log.push(`settle:${key}`);
        },
        onOutcome: () => Effect.void,
      });
      const gate = yield* Deferred.make<void>();
      const compute = Deferred.await(gate).pipe(Effect.as(1));
      const observe = (name: string) =>
        shared.run("k", compute).pipe(Effect.tap(() => Effect.sync(() => log.push(name))));

      const a = yield* Effect.forkChild(observe("a"));
      yield* settleTurns;
      const b = yield* Effect.forkChild(observe("b"));
      yield* settleTurns;
      yield* Deferred.succeed(gate, undefined);
      yield* Fiber.join(a);
      yield* Fiber.join(b);

      assert.strictEqual(log[0], "settle:k");
      assert.deepStrictEqual([...log].sort(), ["a", "b", "settle:k"]);
    }));

  it.effect("an interrupted claimant leaves no waiter behind: a later ask joins and gets the value", () =>
    Effect.gen(function* () {
      const { shared } = harness();
      const runs = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();
      const compute = Ref.update(runs, (n) => n + 1).pipe(
        Effect.andThen(Deferred.await(gate)),
        Effect.as(6),
      );

      const claimant = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      const joiner = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      yield* Fiber.interrupt(claimant);
      const later = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      yield* Deferred.succeed(gate, undefined);

      assert.deepStrictEqual(yield* Fiber.join(joiner), { value: 6, outcome: "coalesced" });
      assert.deepStrictEqual(yield* Fiber.join(later), { value: 6, outcome: "coalesced" });
      assert.strictEqual(yield* Ref.get(runs), 1);
    }));

  it.effect("an interrupted claimant's leave is counted: once the rest leave, compute is interrupted", () =>
    Effect.gen(function* () {
      const { shared } = harness();
      const gate = yield* Deferred.make<void>();
      const interrupted = yield* Deferred.make<void>();
      const compute = Deferred.await(gate).pipe(
        Effect.as(5),
        Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)),
      );

      const claimant = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      const joiner = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      yield* Fiber.interrupt(claimant);
      yield* settleTurns;
      assert.isFalse(yield* Deferred.isDone(interrupted));
      // A leaked count (the claimant never decremented) would keep compute alive here.
      yield* Fiber.interrupt(joiner);
      yield* Deferred.await(interrupted);
    }));

  /**
   * Issue #64, uninterruptible regime, at the seam: A's compute is parked in an
   * uninterruptible region when A leaves, so the interrupt that leave sends is
   * only recorded, not delivered. B asks for the same key in that window.
   * Every settle is recorded with the claim it belongs to (1 = A's, 2 = B's).
   */
  const abandonWhileParked = Effect.gen(function* () {
    const settles: Array<{ readonly claim: number; readonly exit: Exit.Exit<number> }> = [];
    let claims = 0;
    const shared = makeSharedComputation<string, number, never>({
      cached: () => Option.none(),
      claim: () => {
        claims += 1;
        const claim = claims;
        return (exit) => {
          settles.push({ claim, exit });
        };
      },
      onOutcome: () => Effect.void,
    });
    const runs = yield* Ref.make(0);
    const started = yield* Deferred.make<void>();
    const gate = yield* Deferred.make<void>();
    const compute = Ref.updateAndGet(runs, (n) => n + 1).pipe(
      Effect.flatMap((n) =>
        Effect.uninterruptible(Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(gate)))).pipe(
          Effect.as(n),
        ),
      ),
    );

    const a = yield* Effect.forkChild(shared.run("k", compute));
    yield* Deferred.await(started);
    // Forked, not awaited: A's leave waits for the parked compute to exit.
    const interrupter = yield* Effect.forkChild(Fiber.interrupt(a));
    yield* settleTurns;
    const b = yield* Effect.forkChild(shared.run("k", compute));
    yield* settleTurns;
    yield* Deferred.succeed(gate, undefined);
    const exitB = yield* Fiber.await(b);
    // A's leave returns only once the abandoned compute has exited.
    yield* Fiber.join(interrupter);
    return { exitB, settles, runs: yield* Ref.get(runs) };
  });

  it.effect("a fresh ask never joins a computation every waiter has abandoned (#64)", () =>
    Effect.gen(function* () {
      const { exitB, runs } = yield* abandonWhileParked;

      assert.deepStrictEqual(exitB, Exit.succeed({ value: 2, outcome: "miss" }));
      assert.strictEqual(runs, 2);
    }));

  it.effect("an abandoned computation writes nothing: only the fresh claim settles", () =>
    Effect.gen(function* () {
      const { settles } = yield* abandonWhileParked;

      assert.deepStrictEqual(settles, [{ claim: 2, exit: Exit.succeed(2) }]);
    }));

  it.effect("reset forgets in-flight claims; the stale compute neither answers nor unclaims the fresh one", () =>
    Effect.gen(function* () {
      // Remembers nothing, so only `inFlight` decides join or claim (what a stale
      // answer may write is the adapter's call: `DecisionCache`'s generation).
      const shared = makeSharedComputation<string, number, never>({
        cached: () => Option.none(),
        claim: () => () => {},
        onOutcome: () => Effect.void,
      });
      const runs = yield* Ref.make(0);
      const stale = yield* Deferred.make<void>();
      const fresh = yield* Deferred.make<void>();
      const compute = Ref.updateAndGet(runs, (n) => n + 1).pipe(
        Effect.flatMap((n) =>
          n === 1 ? Deferred.await(stale).pipe(Effect.as(1)) : Deferred.await(fresh).pipe(Effect.as(2)),
        ),
      );

      const first = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      shared.reset();
      const second = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      assert.strictEqual(yield* Ref.get(runs), 2, "an ask after reset claims afresh");

      // The stale compute settles first; its exit must not remove the fresh claim.
      yield* Deferred.succeed(stale, undefined);
      assert.deepStrictEqual(yield* Fiber.join(first), { value: 1, outcome: "miss" });
      const third = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      assert.strictEqual(yield* Ref.get(runs), 2, "a third ask joins the fresh claim");

      yield* Deferred.succeed(fresh, undefined);
      assert.deepStrictEqual(yield* Fiber.join(second), { value: 2, outcome: "miss" });
      assert.deepStrictEqual(yield* Fiber.join(third), { value: 2, outcome: "coalesced" });
    }));
});
