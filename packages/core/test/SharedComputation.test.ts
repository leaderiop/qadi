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
      settle: (key, exit) => {
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

      // Abandoned, so its interrupted exit is dropped rather than settled (#64).
      assert.deepStrictEqual(settled, []);
    }));

  it.effect("the settle runs exactly once per claim, before any waiter observes the result", () =>
    Effect.gen(function* () {
      const log: Array<string> = [];
      const shared = makeSharedComputation<string, number, never>({
        cached: () => Option.none(),
        settle: (key) => {
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
   * Every settle's exit is recorded; the compute's value is its run count, so
   * a value of 2 names B's claim.
   */
  const abandonWhileParked = Effect.gen(function* () {
    const settles: Array<Exit.Exit<number>> = [];
    const shared = makeSharedComputation<string, number, never>({
      cached: () => Option.none(),
      settle: (_key, exit) => {
        settles.push(exit);
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

      assert.deepStrictEqual(settles, [Exit.succeed(2)]);
    }));

  it.effect("reset supersedes in-flight claims: the stale compute settles nothing and neither answers nor unclaims the fresh one", () =>
    Effect.gen(function* () {
      // Remembers nothing, so only `inFlight` decides join or claim; it records what
      // is settled, because what a stale answer may write is the module's rule: a
      // reset supersedes the claims in flight, and a superseded exit is never settled.
      const settled: Array<Exit.Exit<number>> = [];
      const shared = makeSharedComputation<string, number, never>({
        cached: () => Option.none(),
        settle: (_key, exit) => {
          settled.push(exit);
        },
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
      assert.deepStrictEqual(settled, [], "the superseded exit is never settled");
      const third = yield* Effect.forkChild(shared.run("k", compute));
      yield* settleTurns;
      assert.strictEqual(yield* Ref.get(runs), 2, "a third ask joins the fresh claim");

      yield* Deferred.succeed(fresh, undefined);
      assert.deepStrictEqual(yield* Fiber.join(second), { value: 2, outcome: "miss" });
      assert.deepStrictEqual(yield* Fiber.join(third), { value: 2, outcome: "coalesced" });
      assert.deepStrictEqual(settled, [Exit.succeed(2)]);
    }));

  /** What each named compute did: started, and was cut short by an interrupt. */
  interface Recording {
    readonly started: Array<string>;
    readonly interrupted: Array<string>;
  }
  const recorder = (): Recording => ({ started: [], interrupted: [] });

  /** A compute that records its start, waits on `latch` interruptibly, and records an interrupt. */
  const latched = (
    record: Recording,
    name: string,
    value: number,
    latch: Deferred.Deferred<void>,
  ) =>
    Effect.sync(() => record.started.push(name)).pipe(
      Effect.andThen(Deferred.await(latch)),
      Effect.as(value),
      Effect.onInterrupt(() => Effect.sync(() => record.interrupted.push(name))),
    );

  /** As `latched`, but parked in an uninterruptible region (a port's checkout window) until `gate`. */
  const parked = (
    record: Recording,
    name: string,
    value: number,
    started: Deferred.Deferred<void>,
    gate: Deferred.Deferred<void>,
  ) =>
    Effect.sync(() => record.started.push(name)).pipe(
      Effect.andThen(
        Effect.uninterruptible(Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(gate)))),
      ),
      Effect.as(value),
      Effect.onInterrupt(() => Effect.sync(() => record.interrupted.push(name))),
    );

  it.effect("stale-last race: a superseded compute that settles after the fresh one answers its own waiter and writes nothing", () =>
    Effect.gen(function* () {
      const { cache, settled, shared } = harness();
      const record = recorder();
      const stale = yield* Deferred.make<void>();
      const fresh = yield* Deferred.make<void>();

      const first = yield* Effect.forkChild(shared.run("k", latched(record, "stale", 1, stale)));
      yield* settleTurns;
      shared.reset();
      const second = yield* Effect.forkChild(shared.run("k", latched(record, "fresh", 2, fresh)));
      yield* settleTurns;
      assert.deepStrictEqual(record.started, ["stale", "fresh"], "an ask after reset claims afresh");

      yield* Deferred.succeed(fresh, undefined);
      assert.deepStrictEqual(yield* Fiber.join(second), { value: 2, outcome: "miss" });
      assert.deepStrictEqual(settled, ["k:Success"]);
      assert.strictEqual(cache.get("k"), 2);

      yield* Deferred.succeed(stale, undefined);
      assert.deepStrictEqual(yield* Fiber.join(first), { value: 1, outcome: "miss" });
      yield* settleTurns;
      assert.deepStrictEqual(settled, ["k:Success"], "the superseded exit is never settled");
      assert.strictEqual(cache.get("k"), 2, "the stale answer does not overwrite the fresh one");

      const later = yield* shared.run("k", latched(record, "later", 3, stale));
      assert.deepStrictEqual(later, { value: 2, outcome: "hit" });
      assert.deepStrictEqual(record.started, ["stale", "fresh"]);
      assert.deepStrictEqual(record.interrupted, []);
    }));

  it.effect("stale-first race: a superseded compute that settles first writes nothing, and a third ask coalesces onto the fresh claim", () =>
    Effect.gen(function* () {
      const { cache, outcomes, settled, shared } = harness();
      const record = recorder();
      const stale = yield* Deferred.make<void>();
      const fresh = yield* Deferred.make<void>();

      const first = yield* Effect.forkChild(shared.run("k", latched(record, "stale", 1, stale)));
      yield* settleTurns;
      shared.reset();
      const second = yield* Effect.forkChild(shared.run("k", latched(record, "fresh", 2, fresh)));
      yield* settleTurns;
      assert.deepStrictEqual(record.started, ["stale", "fresh"], "an ask after reset claims afresh");

      yield* Deferred.succeed(stale, undefined);
      assert.deepStrictEqual(yield* Fiber.join(first), { value: 1, outcome: "miss" });
      yield* settleTurns;
      assert.deepStrictEqual(settled, [], "the superseded exit is never settled");
      assert.isFalse(cache.has("k"));

      const third = yield* Effect.forkChild(shared.run("k", latched(record, "third", 3, fresh)));
      yield* settleTurns;
      assert.deepStrictEqual(record.started, ["stale", "fresh"], "the third ask starts no compute");
      assert.deepStrictEqual(outcomes, ["miss", "miss", "coalesced"]);

      yield* Deferred.succeed(fresh, undefined);
      assert.deepStrictEqual(yield* Fiber.join(second), { value: 2, outcome: "miss" });
      assert.deepStrictEqual(yield* Fiber.join(third), { value: 2, outcome: "coalesced" });
      assert.deepStrictEqual(settled, ["k:Success"]);
      assert.strictEqual(cache.get("k"), 2);
      assert.deepStrictEqual(record.interrupted, []);
    }));

  it.effect("two-key race: one reset supersedes the claims of both keys; a superseded waiter is answered, a superseded compute whose last waiter leaves is interrupted, and neither writes", () =>
    Effect.gen(function* () {
      const { cache, settled, shared } = harness();
      const record = recorder();
      const staleA = yield* Deferred.make<void>();
      const staleB = yield* Deferred.make<void>();
      const freshA = yield* Deferred.make<void>();
      const freshB = yield* Deferred.make<void>();

      const waiterA = yield* Effect.forkChild(shared.run("a", latched(record, "stale a", 1, staleA)));
      const waiterB = yield* Effect.forkChild(shared.run("b", latched(record, "stale b", 2, staleB)));
      yield* settleTurns;
      shared.reset();
      const nextA = yield* Effect.forkChild(shared.run("a", latched(record, "fresh a", 3, freshA)));
      const nextB = yield* Effect.forkChild(shared.run("b", latched(record, "fresh b", 4, freshB)));
      yield* settleTurns;
      assert.deepStrictEqual(
        [...record.started].sort(),
        ["fresh a", "fresh b", "stale a", "stale b"],
        "an ask after reset claims afresh, for each key",
      );

      yield* Deferred.succeed(staleA, undefined);
      assert.deepStrictEqual(yield* Fiber.join(waiterA), { value: 1, outcome: "miss" });
      yield* settleTurns;
      assert.deepStrictEqual(settled, [], "the superseded exit is never settled");

      // Returns once the superseded compute is interrupted: its last waiter was the one leaving.
      yield* Fiber.interrupt(waiterB);
      assert.deepStrictEqual(record.interrupted, ["stale b"]);
      assert.deepStrictEqual(settled, []);

      yield* Deferred.succeed(freshA, undefined);
      yield* Deferred.succeed(freshB, undefined);
      assert.deepStrictEqual(yield* Fiber.join(nextA), { value: 3, outcome: "miss" });
      assert.deepStrictEqual(yield* Fiber.join(nextB), { value: 4, outcome: "miss" });
      assert.deepStrictEqual([...settled].sort(), ["a:Success", "b:Success"]);
      assert.strictEqual(cache.get("a"), 3);
      assert.strictEqual(cache.get("b"), 4);
      assert.deepStrictEqual(record.interrupted, ["stale b"], "no fresh compute was interrupted");
    }));

  it.effect("parked-uninterruptible race: of two superseded computes parked uninterruptibly, the awaited one answers its waiter, the one its last waiter left is interrupted when its region ends, and neither writes", () =>
    Effect.gen(function* () {
      const { cache, settled, shared } = harness();
      const record = recorder();
      const keptParked = yield* Deferred.make<void>();
      const leftParked = yield* Deferred.make<void>();
      const gate = yield* Deferred.make<void>();
      const fresh = yield* Deferred.make<void>();

      const keptWaiter = yield* Effect.forkChild(
        shared.run("kept", parked(record, "stale kept", 1, keptParked, gate)),
      );
      const leftWaiter = yield* Effect.forkChild(
        shared.run("left", parked(record, "stale left", 2, leftParked, gate)),
      );
      yield* Deferred.await(keptParked);
      yield* Deferred.await(leftParked);
      shared.reset();
      const nextKept = yield* Effect.forkChild(shared.run("kept", latched(record, "fresh kept", 3, fresh)));
      const nextLeft = yield* Effect.forkChild(shared.run("left", latched(record, "fresh left", 4, fresh)));
      yield* settleTurns;
      assert.deepStrictEqual(
        [...record.started].sort(),
        ["fresh kept", "fresh left", "stale kept", "stale left"],
        "an ask after reset claims afresh, for each key",
      );

      // The last leaver waits for the parked compute to leave its region: the stated cost.
      const leaveReturned = yield* Deferred.make<void>();
      yield* Effect.forkChild(
        Fiber.interrupt(leftWaiter).pipe(Effect.andThen(Deferred.succeed(leaveReturned, undefined))),
      );
      yield* settleTurns;
      assert.isFalse(yield* Deferred.isDone(leaveReturned), "the leave waits while the compute is parked");
      assert.deepStrictEqual(record.interrupted, []);

      yield* Deferred.succeed(gate, undefined);
      assert.deepStrictEqual(yield* Fiber.join(keptWaiter), { value: 1, outcome: "miss" });
      yield* Deferred.await(leaveReturned);
      assert.deepStrictEqual(record.interrupted, ["stale left"]);
      yield* settleTurns;
      assert.deepStrictEqual(settled, [], "the superseded exits are never settled");
      assert.isFalse(cache.has("kept"));
      assert.isFalse(cache.has("left"));

      yield* Deferred.succeed(fresh, undefined);
      assert.deepStrictEqual(yield* Fiber.join(nextKept), { value: 3, outcome: "miss" });
      assert.deepStrictEqual(yield* Fiber.join(nextLeft), { value: 4, outcome: "miss" });
      assert.deepStrictEqual([...settled].sort(), ["kept:Success", "left:Success"]);
      assert.deepStrictEqual(record.interrupted, ["stale left"], "no fresh compute was interrupted");
    }));
});
