/**
 * Pins the breaker's transitions through its own surface, on the phase base.
 *
 * 45-02 moves every rule into one pure transition function, so this table,
 * written against the base's observable behaviour, is what each converted event
 * is checked against. It reads the status through `breaker.status`, the
 * generation through `Admitted.generation` (opaque to callers, but readable) and
 * the announcements through `transitionsTotal`, never through a metric id
 * literal (`METRIC_ID_LITERAL_BUDGET`). Row ids follow the base's transition
 * table: O observe, S success, F failure, C claim, R release.
 *
 * `peek` admits a permit and settles nothing, so on a half-open breaker it
 * claims the probe and leaves the claim to the age-out; a row that peeks twice
 * sees the second permit refused.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as Metric from "effect/Metric";
import * as TestClock from "effect/testing/TestClock";
import { isolatedMetrics } from "@qadi/testing";
import { makeCircuitBreaker, transitionsTotal } from "../src/CircuitBreaker.ts";
import type { CircuitBreaker } from "../src/CircuitBreaker.ts";

const OPTIONS = { failureThreshold: 3, resetTimeoutMs: 10_000 };

const STATUSES: ReadonlyArray<string> = ["Closed", "Open", "HalfOpen"];

/** One admitted write that fails, as the sink's `attempt` reports it. */
const failOnce = (b: CircuitBreaker) =>
  b.withPermit((p) =>
    p._tag === "Admitted" ? p.attempt(Effect.fail("offline")).pipe(Effect.asVoid) : Effect.void,
  );

/** One admitted write that succeeds. */
const succeedOnce = (b: CircuitBreaker) =>
  b.withPermit((p) =>
    p._tag === "Admitted" ? p.attempt(Effect.void).pipe(Effect.asVoid) : Effect.void,
  );

const trip = (b: CircuitBreaker) =>
  Effect.gen(function* () {
    yield* failOnce(b);
    yield* failOnce(b);
    yield* failOnce(b);
  });

/** What the breaker admits this caller as, without settling anything; `undefined` when refused. */
const peek = (b: CircuitBreaker) =>
  b.withPermit((p) =>
    Effect.succeed(p._tag === "Admitted" ? { probe: p.probe, generation: p.generation } : undefined),
  );

/**
 * Forks a caller that holds its permit without ever settling it; `latch` opens
 * once the permit is held. Interrupting the returned fiber is the only way out.
 */
const holdPermit = (b: CircuitBreaker, latch: Latch.Latch) =>
  Effect.forkChild(b.withPermit(() => latch.open.pipe(Effect.andThen(Effect.never))));

/** Admitted now, settles with `ok` only when `settle` opens. */
const settleLater = (b: CircuitBreaker, held: Latch.Latch, settle: Latch.Latch, ok: boolean) =>
  Effect.forkChild(
    b.withPermit((p) =>
      p._tag === "Admitted"
        ? held.open.pipe(
            Effect.andThen(settle.await),
            Effect.andThen(p.attempt(ok ? Effect.void : Effect.fail("offline"))),
            Effect.asVoid,
          )
        : Effect.void,
    ),
  );

/** How many times each status was announced, as `[Closed, Open, HalfOpen]`; an unannounced status is 0. */
const announced = Effect.map(Metric.value(transitionsTotal), ({ occurrences }) => {
  assert.deepStrictEqual(
    [...occurrences.keys()].filter((key) => !STATUSES.includes(key)),
    [],
    "the metric holds no word but the three statuses",
  );
  return STATUSES.map((status) => occurrences.get(status) ?? 0);
});

describe("the breaker's transitions through its adapter (BRKR-04)", () => {
  it.effect("O1: a Closed breaker read twice stays Closed, announces nothing and keeps generation 0", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        assert.strictEqual(yield* breaker.status, "Closed");
        assert.strictEqual(yield* breaker.status, "Closed");
        assert.deepStrictEqual(yield* peek(breaker), { probe: false, generation: 0 });
        assert.deepStrictEqual(yield* announced, [0, 0, 0]);
      }),
    ));

  it.effect("O2: an Open breaker read at 9999 ms stays Open", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("9999 millis");
        assert.strictEqual(yield* breaker.status, "Open");
        assert.isUndefined(yield* peek(breaker), "an Open breaker refuses");
        assert.deepStrictEqual(yield* announced, [0, 1, 0]);
      }),
    ));

  it.effect("O3: an Open breaker read at exactly 10 000 ms enters HalfOpen once, and the probe's generation is 2", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        assert.strictEqual(yield* breaker.status, "HalfOpen");
        assert.strictEqual(yield* breaker.status, "HalfOpen");
        assert.deepStrictEqual(yield* announced, [0, 1, 1]);
        assert.deepStrictEqual(yield* peek(breaker), { probe: true, generation: 2 });
        assert.deepStrictEqual(yield* announced, [0, 1, 1]);
      }),
    ));

  it.effect("O4: a claimed HalfOpen read at 9999 ms keeps its claim, and a second permit is refused", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        const held = yield* Latch.make();
        yield* holdPermit(breaker, held);
        yield* held.await;
        yield* TestClock.adjust("9999 millis");
        assert.strictEqual(yield* breaker.status, "HalfOpen");
        assert.isUndefined(yield* peek(breaker), "the claim is still held");
        assert.deepStrictEqual(yield* announced, [0, 1, 1]);
      }),
    ));

  it.effect("O5: a claimed HalfOpen aged exactly 10 s reopens, Open is counted twice, and the next probe's generation is 4", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        const held = yield* Latch.make();
        yield* holdPermit(breaker, held);
        yield* held.await;
        yield* TestClock.adjust("10 seconds");
        assert.strictEqual(yield* breaker.status, "Open");
        assert.deepStrictEqual(yield* announced, [0, 2, 1]);
        yield* TestClock.adjust("10 seconds");
        assert.deepStrictEqual(yield* peek(breaker), { probe: true, generation: 4 });
        assert.deepStrictEqual(yield* announced, [0, 2, 2]);
      }),
    ));

  it.effect("S1: a stale success does not close a newer window", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        const aHeld = yield* Latch.make();
        const aSettle = yield* Latch.make();
        const a = yield* settleLater(breaker, aHeld, aSettle, true);
        yield* aHeld.await; // A is admitted while Closed, under generation 0
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        const bHeld = yield* Latch.make();
        yield* holdPermit(breaker, bHeld); // B holds the probe of generation 2
        yield* bHeld.await;
        yield* aSettle.open;
        yield* Fiber.join(a);
        assert.strictEqual(yield* breaker.status, "HalfOpen", "A's late success is not B's window's evidence");
        assert.deepStrictEqual(yield* announced, [0, 1, 1]);
      }),
    ));

  it.effect("S2: a success while Closed resets the count with no transition, and the generation stays 0", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* failOnce(breaker);
        yield* failOnce(breaker);
        yield* succeedOnce(breaker);
        yield* failOnce(breaker);
        yield* failOnce(breaker);
        assert.strictEqual(yield* breaker.status, "Closed", "two more failures after the reset are short of three");
        assert.deepStrictEqual(yield* peek(breaker), { probe: false, generation: 0 });
        assert.deepStrictEqual(yield* announced, [0, 0, 0]);
      }),
    ));

  it.effect("S3: a probe's success closes the breaker once, and the next permit's generation is 3", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        yield* succeedOnce(breaker);
        assert.strictEqual(yield* breaker.status, "Closed");
        assert.deepStrictEqual(yield* announced, [1, 1, 1]);
        assert.deepStrictEqual(yield* peek(breaker), { probe: false, generation: 3 });
        assert.deepStrictEqual(yield* announced, [1, 1, 1]);
      }),
    ));

  it.effect("F1: a stale failure does not reopen a newer window, and Open is counted once", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        const aHeld = yield* Latch.make();
        const aSettle = yield* Latch.make();
        const a = yield* settleLater(breaker, aHeld, aSettle, false);
        yield* aHeld.await; // A is admitted while Closed, under generation 0
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        const bHeld = yield* Latch.make();
        yield* holdPermit(breaker, bHeld); // B holds the probe of generation 2
        yield* bHeld.await;
        yield* aSettle.open;
        yield* Fiber.join(a);
        assert.strictEqual(yield* breaker.status, "HalfOpen", "A's late failure is not B's window's evidence");
        assert.isUndefined(yield* peek(breaker), "B still holds the claim");
        assert.deepStrictEqual(yield* announced, [0, 1, 1]);
      }),
    ));

  it.effect("F2: a failure below the threshold stays Closed with no transition", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* failOnce(breaker);
        yield* failOnce(breaker);
        assert.strictEqual(yield* breaker.status, "Closed");
        assert.deepStrictEqual(yield* peek(breaker), { probe: false, generation: 0 });
        assert.deepStrictEqual(yield* announced, [0, 0, 0]);
      }),
    ));

  it.effect("F3: the threshold-th failure opens once, and the probe's generation is 2", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        assert.strictEqual(yield* breaker.status, "Open");
        assert.deepStrictEqual(yield* announced, [0, 1, 0]);
        yield* TestClock.adjust("10 seconds");
        assert.deepStrictEqual(yield* peek(breaker), { probe: true, generation: 2 });
        assert.deepStrictEqual(yield* announced, [0, 1, 1]);
      }),
    ));

  it.effect("F4: a probe's failure reopens, and the window restarts from the failure", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        yield* failOnce(breaker);
        assert.strictEqual(yield* breaker.status, "Open");
        assert.deepStrictEqual(yield* announced, [0, 2, 1]);
        yield* TestClock.adjust("9999 millis");
        assert.strictEqual(yield* breaker.status, "Open", "the window is measured from the failure");
        yield* TestClock.adjust("1 milli");
        assert.strictEqual(yield* breaker.status, "HalfOpen");
        assert.deepStrictEqual(yield* peek(breaker), { probe: true, generation: 4 });
        assert.deepStrictEqual(yield* announced, [0, 2, 2]);
      }),
    ));

  it.effect("C1: the first half-open permit is the probe, with generation 2", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        assert.deepStrictEqual(yield* peek(breaker), { probe: true, generation: 2 });
        assert.strictEqual(yield* breaker.status, "HalfOpen", "the claim is not a transition");
        assert.deepStrictEqual(yield* announced, [0, 1, 1]);
      }),
    ));

  it.effect("C2: a second permit while the probe is held is refused", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        const held = yield* Latch.make();
        yield* holdPermit(breaker, held);
        yield* held.await;
        assert.isUndefined(yield* peek(breaker), "the window's one probe is held");
        assert.strictEqual(yield* breaker.status, "HalfOpen");
        assert.deepStrictEqual(yield* announced, [0, 1, 1]);
      }),
    ));

  it.effect("R1: an interrupted probe reopens, measured from the release", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        const held = yield* Latch.make();
        const prober = yield* holdPermit(breaker, held);
        yield* held.await;
        yield* TestClock.adjust("3 seconds");
        yield* Fiber.interrupt(prober);
        assert.strictEqual(yield* breaker.status, "Open", "the claim is released at once");
        assert.deepStrictEqual(yield* announced, [0, 2, 1]);
        yield* TestClock.adjust("9999 millis");
        assert.strictEqual(yield* breaker.status, "Open", "the window is measured from the release");
        yield* TestClock.adjust("1 milli");
        assert.deepStrictEqual(yield* peek(breaker), { probe: true, generation: 4 });
        assert.deepStrictEqual(yield* announced, [0, 2, 2]);
      }),
    ));

  it.effect("R2: an older window's release does not steal a newer claim", () =>
    isolatedMetrics(
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        const aHeld = yield* Latch.make();
        const a = yield* holdPermit(breaker, aHeld); // probe A, generation 2, never settled
        yield* aHeld.await;
        yield* TestClock.adjust("10 seconds"); // A's window ages out: Open, generation 3
        assert.strictEqual(yield* breaker.status, "Open");
        yield* TestClock.adjust("10 seconds");
        const bHeld = yield* Latch.make();
        yield* holdPermit(breaker, bHeld); // probe B claims generation 4
        yield* bHeld.await;
        yield* Fiber.interrupt(a); // A's release finds B's claim, not its own
        assert.strictEqual(yield* breaker.status, "HalfOpen", "B's window is untouched");
        assert.isUndefined(yield* peek(breaker), "B still holds the claim");
        assert.deepStrictEqual(yield* announced, [0, 2, 2]);
      }),
    ));
});
