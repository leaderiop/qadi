import { assert, describe, it } from "@effect/vitest";
import * as Clock from "effect/Clock";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import * as TestClock from "effect/testing/TestClock";
import * as FastCheck from "fast-check";
import { makeCircuitBreaker } from "../src/CircuitBreaker.ts";
import type { CircuitBreaker } from "../src/CircuitBreaker.ts";
import { isolatedMetrics } from "./helpers.ts";

type FrequencySnapshot = Extract<Metric.Metric.Snapshot, { type: "Frequency" }>;

const OPTIONS = { failureThreshold: 3, resetTimeoutMs: 10_000 };

/** One admitted write that fails, as the sink's `attempt` reports it. */
const failOnce = (b: CircuitBreaker) =>
  b.withPermit((p) =>
    Match.value(p).pipe(
      Match.tagsExhaustive({
        Refused: () => Effect.void,
        Admitted: (a) => a.attempt(Effect.fail("offline")).pipe(Effect.asVoid),
      }),
    ),
  );

/** One admitted write that succeeds. */
const succeedOnce = (b: CircuitBreaker) =>
  b.withPermit((p) =>
    Match.value(p).pipe(
      Match.tagsExhaustive({
        Refused: () => Effect.void,
        Admitted: (a) => a.attempt(Effect.void).pipe(Effect.asVoid),
      }),
    ),
  );

/** What the breaker would admit this caller as, without settling anything. */
const permitOf = (b: CircuitBreaker) =>
  b.withPermit((p) =>
    Effect.succeed(p._tag === "Admitted" ? (p.probe ? "probe" : "admitted") : "refused"),
  );

/**
 * Forks a caller that holds its permit without ever settling it; `latch` opens
 * once the permit is held. Interrupting the returned fiber is the only way out.
 */
const holdPermit = (b: CircuitBreaker, latch: Latch.Latch) =>
  Effect.forkChild(b.withPermit(() => latch.open.pipe(Effect.andThen(Effect.never))));

const trip = (b: CircuitBreaker) =>
  Effect.gen(function* () {
    yield* failOnce(b);
    yield* failOnce(b);
    yield* failOnce(b);
  });

describe("CircuitBreaker — threshold boundary, scripted rather than generated", () => {
  it.effect("stays closed at failureThreshold - 1 consecutive failures", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* failOnce(breaker);
      yield* failOnce(breaker);
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("trips open on exactly the failureThreshold-th consecutive failure", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      assert.strictEqual(yield* breaker.status, "Open");
    }));

  it.effect("a success resets the consecutive-failure count", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* failOnce(breaker);
      yield* failOnce(breaker);
      yield* succeedOnce(breaker);
      yield* failOnce(breaker);
      yield* failOnce(breaker);
      // Two more failures after the reset — still short of three in a row.
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("stays open before resetTimeoutMs elapses", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("9999 millis");
      assert.strictEqual(yield* breaker.status, "Open");
    }));

  it.effect("transitions to half-open once resetTimeoutMs elapses, on the next status read", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
    }));

  it.effect("a success while half-open closes the breaker", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      yield* succeedOnce(breaker);
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("a failure while half-open reopens the breaker", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      yield* failOnce(breaker);
      assert.strictEqual(yield* breaker.status, "Open");
    }));

  it.effect("reopening from half-open restarts the resetTimeoutMs window", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      yield* failOnce(breaker);
      yield* TestClock.adjust("9999 millis");
      assert.strictEqual(yield* breaker.status, "Open");
      yield* TestClock.adjust("1 milli");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
    }));

  it.effect(
    "a claimed probe that never settles (a caller that forgot) still ages out of half-open",
    () =>
      Effect.gen(function* () {
        // Defense-in-depth path (H4, ticket #38): a probe whose `use` returned
        // without ever calling `attempt` would otherwise wedge `HalfOpen`
        // forever. `status` itself ages a stale claim out once
        // `resetTimeoutMs` has elapsed since the window began, independent of
        // the release finalizer (which only fires on a failing exit).
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        assert.strictEqual(yield* permitOf(breaker), "probe", "claim the one probe, never settle it");

        // Still within the window: the claim stands, nothing ages out yet.
        yield* TestClock.adjust("9999 millis");
        assert.strictEqual(yield* breaker.status, "HalfOpen");

        // Past resetTimeoutMs since the window began, with the claim never
        // settled: the fallback in `status` reopens it.
        yield* TestClock.adjust("1 milli");
        assert.strictEqual(yield* breaker.status, "Open");

        // And the reopened window behaves like an ordinary Open→HalfOpen
        // transition — a fresh claim is available once it elapses again.
        yield* TestClock.adjust("10 seconds");
        assert.strictEqual(yield* breaker.status, "HalfOpen");
        assert.strictEqual(yield* permitOf(breaker), "probe", "the aged-out window issues a fresh claim");
      }),
  );

  it.effect("withPermit admits exactly one probe per half-open window, not the whole fan-out", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");

      // Ten concurrent callers, the Qadi.ts filter/filterStream fan-out
      // shape. The prober holds its permit while the rest race it.
      const held = yield* Latch.make();
      const prober = yield* holdPermit(breaker, held);
      yield* held.await;
      const permits = yield* Effect.all(
        Array.from({ length: 10 }, () => permitOf(breaker)),
        { concurrency: "unbounded" },
      );
      assert.strictEqual(permits.filter((p) => p === "probe").length, 0, "the probe is already held");
      assert.strictEqual(permits.filter((p) => p === "refused").length, 10);
      yield* Fiber.interrupt(prober);
    }));

  it.effect("ten concurrent callers racing a fresh half-open window yield exactly one probe", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      const gate = yield* Latch.make();
      const racers = yield* Effect.all(
        Array.from({ length: 10 }, () =>
          Effect.forkChild(
            breaker.withPermit((p) =>
              gate.await.pipe(
                Effect.andThen(
                  Effect.succeed(p._tag === "Admitted" ? (p.probe ? "probe" : "admitted") : "refused"),
                ),
              ),
            ),
          ),
        ),
      );
      yield* gate.open;
      const permits = yield* Effect.all(racers.map((f) => Fiber.join(f)));
      assert.strictEqual(permits.filter((p) => p === "probe").length, 1, "exactly one caller is the probe");
      assert.strictEqual(permits.filter((p) => p === "refused").length, 9);
    }));

  it.effect(
    "a lost claim's re-read can show Closed, not just HalfOpen or Open — ticket #46's disambiguation",
    () =>
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* trip(breaker);
        yield* TestClock.adjust("10 seconds");
        assert.strictEqual(yield* breaker.status, "HalfOpen");

        // Two concurrent callers both read HalfOpen; one wins the claim.
        const held = yield* Latch.make();
        const settle = yield* Latch.make();
        const prober = yield* Effect.forkChild(
          breaker.withPermit((p) =>
            p._tag === "Admitted"
              ? held.open.pipe(
                  Effect.andThen(settle.await),
                  Effect.andThen(p.attempt(Effect.void)),
                  Effect.asVoid,
                )
              : Effect.void,
          ),
        );
        yield* held.await;
        assert.strictEqual(yield* permitOf(breaker), "refused", "a second caller's claim is refused");

        // The prober's write then succeeds, closing the breaker. A caller who
        // lost the claim and assumed "still HalfOpen, so behave as Open"
        // would be wrong the instant it re-reads status: it is Closed.
        yield* settle.open;
        yield* Fiber.join(prober);
        assert.strictEqual(yield* breaker.status, "Closed");
        assert.strictEqual(yield* permitOf(breaker), "admitted", "not refused: the breaker closed");
      }),
  );

  it.effect("the probe claim resets on the next half-open window, whichever direction closed the last one", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen"); // the read that performs the transition
      const held = yield* Latch.make();
      const prober = yield* holdPermit(breaker, held);
      yield* held.await;
      assert.strictEqual(yield* permitOf(breaker), "refused", "already claimed for this window");

      // Reopen, then reach half-open again — a fresh window, a fresh probe.
      yield* Fiber.interrupt(prober);
      assert.strictEqual(yield* breaker.status, "Open");
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      assert.strictEqual(yield* permitOf(breaker), "probe", "a new half-open window admits a new probe");
    }));

  it.effect("no probe is issued outside a half-open window", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      assert.strictEqual(yield* permitOf(breaker), "admitted", "closed — an ordinary write, not a probe");
      yield* trip(breaker);
      assert.strictEqual(yield* permitOf(breaker), "refused", "open, before resetTimeoutMs");
    }));

  it.effect("withPermit releases an unsettled probe when use is interrupted anywhere", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      const held = yield* Latch.make();
      const prober = yield* holdPermit(breaker, held);
      yield* held.await;
      yield* Fiber.interrupt(prober);
      assert.strictEqual(yield* breaker.status, "Open", "the claim is released at once");
      yield* TestClock.adjust("9999 millis");
      assert.strictEqual(yield* breaker.status, "Open");
      yield* TestClock.adjust("1 milli");
      assert.strictEqual(yield* permitOf(breaker), "probe", "a probe is admitted exactly resetTimeoutMs later");
    }));

  it.effect("a released probe announces exactly one more Open transition", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const breaker = yield* makeCircuitBreaker(OPTIONS);
          yield* trip(breaker);
          yield* TestClock.adjust("10 seconds");
          const held = yield* Latch.make();
          const prober = yield* holdPermit(breaker, held);
          yield* held.await;
          yield* Fiber.interrupt(prober);
          return yield* Metric.snapshot;
        }),
      );
      const occurrences = snapshots
        .find(
          (s): s is FrequencySnapshot =>
            s.type === "Frequency" && s.id === "qadi_audit_circuit_breaker_transitions_total",
        )
        ?.state.occurrences;
      assert.strictEqual(occurrences?.get("Open"), 2, "the trip, then the release");
      assert.strictEqual(occurrences?.get("HalfOpen"), 1);
    }));

  it.effect("attempt records only the first outcome per permit", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      yield* breaker.withPermit((p) =>
        p._tag === "Admitted"
          ? p.attempt(Effect.fail("offline")).pipe(Effect.andThen(p.attempt(Effect.void)))
          : Effect.void,
      );
      assert.strictEqual(yield* breaker.status, "Open", "the later success did not close it");
    }));

  it.effect("a lone success on an already-closed breaker is a no-op", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* succeedOnce(breaker);
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("starts closed", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      assert.strictEqual(yield* breaker.status, "Closed");
    }));
});

describe("CircuitBreaker — a failure landing on an already-Open breaker is not a transition", () => {
  const openOccurrences = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>) =>
    snapshots
      .find(
        (s): s is FrequencySnapshot =>
          s.type === "Frequency" && s.id === "qadi_audit_circuit_breaker_transitions_total",
      )
      ?.state.occurrences.get("Open");

  it.effect("a late failure neither re-announces Open nor restarts the open window", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const breaker = yield* makeCircuitBreaker(OPTIONS);
          // Admitted while Closed, settling only after the trip below.
          const held = yield* Latch.make();
          const settle = yield* Latch.make();
          const late = yield* Effect.forkChild(
            breaker.withPermit((p) =>
              p._tag === "Admitted"
                ? held.open.pipe(
                    Effect.andThen(settle.await),
                    Effect.andThen(p.attempt(Effect.fail("offline"))),
                    Effect.asVoid,
                  )
                : Effect.void,
            ),
          );
          yield* held.await;
          yield* trip(breaker);
          yield* TestClock.adjust("9 seconds");
          yield* settle.open;
          yield* Fiber.join(late);
          yield* TestClock.adjust("1 second");
          assert.strictEqual(yield* breaker.status, "HalfOpen", "the window is measured from the trip");
          return yield* Metric.snapshot;
        }),
      );
      assert.strictEqual(openOccurrences(snapshots), 1);
    }));

  it.effect("failureThreshold + 5 concurrent failures record exactly one Open transition", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const breaker = yield* makeCircuitBreaker({ failureThreshold: 25, resetTimeoutMs: 10_000 });
          yield* Effect.all(
            Array.from({ length: 30 }, () => failOnce(breaker)),
            { concurrency: "unbounded" },
          );
          assert.strictEqual(yield* breaker.status, "Open");
          return yield* Metric.snapshot;
        }),
      );
      assert.strictEqual(openOccurrences(snapshots), 1);
    }));
});

describe("CircuitBreaker — an outcome counts only toward the window that admitted it", () => {
  /** Admitted now, settles with `outcome` only when `settle` opens. */
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

  it.effect("a stale failure from before the trip does not reopen a newer half-open window", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      const aHeld = yield* Latch.make();
      const aSettle = yield* Latch.make();
      const a = yield* settleLater(breaker, aHeld, aSettle, false);
      yield* aHeld.await; // A is admitted while Closed
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      const bHeld = yield* Latch.make();
      const bSettle = yield* Latch.make();
      const b = yield* settleLater(breaker, bHeld, bSettle, true); // B holds the probe
      yield* bHeld.await;

      yield* aSettle.open;
      yield* Fiber.join(a);
      assert.strictEqual(yield* breaker.status, "HalfOpen", "A's late failure is not B's window's evidence");

      yield* bSettle.open;
      yield* Fiber.join(b);
      assert.strictEqual(yield* breaker.status, "Closed", "the probe's own success counts");
    }));

  it.effect("releasing a probe whose window already moved on does not steal the newer window's claim", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      const aHeld = yield* Latch.make();
      const aSettle = yield* Latch.make();
      const a = yield* settleLater(breaker, aHeld, aSettle, true); // probe A, never settled
      yield* aHeld.await;
      yield* TestClock.adjust("10 seconds"); // A's window ages out: Open
      assert.strictEqual(yield* breaker.status, "Open");
      yield* TestClock.adjust("10 seconds");
      const bHeld = yield* Latch.make();
      const bSettle = yield* Latch.make();
      const b = yield* settleLater(breaker, bHeld, bSettle, true); // probe B, a newer window
      yield* bHeld.await;

      yield* Fiber.interrupt(a); // A's release must find B's claim not its own
      assert.strictEqual(yield* breaker.status, "HalfOpen", "B's window is untouched");
      assert.strictEqual(yield* permitOf(breaker), "refused", "B still holds the claim");

      yield* bSettle.open;
      yield* Fiber.join(b);
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("a failure after the probe already settled does not reopen the breaker through the release", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      yield* Effect.exit(
        breaker.withPermit((p) =>
          p._tag === "Admitted"
            ? p.attempt(Effect.void).pipe(Effect.andThen(Effect.die("after the write")))
            : Effect.void,
        ),
      );
      assert.strictEqual(yield* breaker.status, "Closed", "the settled probe's release is a no-op");
    }));

  it.effect("only a permit's first attempt counts, even within the same window", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 10_000 });
      yield* breaker.withPermit((p) =>
        p._tag === "Admitted"
          ? p.attempt(Effect.void).pipe(Effect.andThen(p.attempt(Effect.fail("offline"))))
          : Effect.void,
      );
      yield* failOnce(breaker);
      assert.strictEqual(yield* breaker.status, "Closed", "the second attempt's failure was not counted");
    }));

  it.effect("a stale success from before the trip does not close a newer half-open window", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      const aHeld = yield* Latch.make();
      const aSettle = yield* Latch.make();
      const a = yield* settleLater(breaker, aHeld, aSettle, true);
      yield* aHeld.await;
      yield* trip(breaker);
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      yield* aSettle.open;
      yield* Fiber.join(a);
      assert.strictEqual(yield* breaker.status, "HalfOpen", "a stale success does not close it");
    }));
});

describe("CircuitBreaker — concurrent record() calls (Qadi.ts's filter/filterStream fan-out)", () =>
  it.effect(
    "exactly failureThreshold consecutive failures trips it, even run concurrently — no lost update, no double-count",
    () =>
      Effect.gen(function* () {
        const snapshots = yield* isolatedMetrics(
          Effect.gen(function* () {
            const breaker = yield* makeCircuitBreaker({ failureThreshold: 25, resetTimeoutMs: 10_000 });

            yield* Effect.all(
              Array.from({ length: 25 }, () => failOnce(breaker)),
              { concurrency: "unbounded" },
            );

            // A lost update (two fibers reading the same stale count) would
            // leave this still Closed.
            assert.strictEqual(yield* breaker.status, "Open");
            return yield* Metric.snapshot;
          }),
        );

        // A double-counted transition — the other failure mode a non-atomic
        // read-compute-write allows — would inflate this past exactly one.
        const transitions = snapshots.find(
          (s): s is FrequencySnapshot =>
            s.type === "Frequency" && s.id === "qadi_audit_circuit_breaker_transitions_total",
        );
        assert.strictEqual(transitions?.state.occurrences.get("Open"), 1);
      }),
  ));

// ---------------------------------------------------------------------------
// PROPERTY: the real breaker agrees with a pure reference model.
//
// The scripted tests above pin exact edges; random generation alone rarely lands
// on them (ADR-QD-056), so `AdvanceToEdge` draws times relative to the current
// window's deadline (±1 ms). The model encodes D-07-c/d/e: a failure on an
// `Open` breaker is a no-op, an outcome counts only toward the window that
// admitted it, and interrupting an unsettled probe releases its claim.
// ---------------------------------------------------------------------------

interface Model {
  tag: "Closed" | "Open" | "HalfOpen";
  failures: number;
  /** `openedAt` while Open, `halfOpenAt` while HalfOpen, unused while Closed. */
  since: number;
  claimed: boolean;
  generation: number;
  now: number;
  transitions: { Open: number; HalfOpen: number; Closed: number };
}

type Command =
  | { readonly kind: "Fail" }
  | { readonly kind: "Succeed" }
  | { readonly kind: "Permit" }
  | { readonly kind: "Hold" }
  | { readonly kind: "Settle"; readonly index: number; readonly ok: boolean }
  | { readonly kind: "Release"; readonly index: number }
  | { readonly kind: "Advance"; readonly millis: number }
  | { readonly kind: "AdvanceToEdge"; readonly delta: number };

const commands: FastCheck.Arbitrary<Command> = FastCheck.oneof(
  FastCheck.constant<Command>({ kind: "Fail" }),
  FastCheck.constant<Command>({ kind: "Succeed" }),
  FastCheck.constant<Command>({ kind: "Permit" }),
  FastCheck.constant<Command>({ kind: "Hold" }),
  FastCheck.record({ index: FastCheck.nat(8), ok: FastCheck.boolean() }).map(
    ({ index, ok }): Command => ({ kind: "Settle", index, ok }),
  ),
  FastCheck.nat(8).map((index): Command => ({ kind: "Release", index })),
  FastCheck.nat(30_000).map((millis): Command => ({ kind: "Advance", millis })),
  FastCheck.integer({ min: -1, max: 1 }).map((delta): Command => ({ kind: "AdvanceToEdge", delta })),
);

const moveTo = (m: Model, tag: Model["tag"]): void => {
  m.tag = tag;
  m.since = m.now;
  m.claimed = false;
  m.generation++;
  m.transitions[tag]++;
};

const observeModel = (m: Model, resetMillis: number): void => {
  if (m.tag === "Open" && m.now - m.since >= resetMillis) moveTo(m, "HalfOpen");
  else if (m.tag === "HalfOpen" && m.now - m.since >= resetMillis) moveTo(m, "Open");
};

/** Mirrors `admit`: the permit kind plus the generation it was admitted under. */
const admitModel = (
  m: Model,
  resetMillis: number,
): { readonly kind: "refused" | "admitted" | "probe"; readonly generation: number } => {
  observeModel(m, resetMillis);
  if (m.tag === "Closed") return { kind: "admitted", generation: m.generation };
  if (m.tag === "HalfOpen" && !m.claimed) {
    m.claimed = true;
    return { kind: "probe", generation: m.generation };
  }
  return { kind: "refused", generation: m.generation };
};

const settleModel = (m: Model, generation: number, ok: boolean, threshold: number): void => {
  if (m.generation !== generation) return;
  if (ok) {
    if (m.tag === "HalfOpen") {
      moveTo(m, "Closed");
      m.failures = 0;
    } else if (m.tag === "Closed") m.failures = 0;
  } else if (m.tag === "HalfOpen") moveTo(m, "Open");
  else if (m.tag === "Closed") {
    m.failures++;
    if (m.failures >= threshold) moveTo(m, "Open");
  }
};

const releaseModel = (m: Model, generation: number): void => {
  if (m.tag === "HalfOpen" && m.claimed && m.generation === generation) moveTo(m, "Open");
};

interface Held {
  readonly fiber: Fiber.Fiber<void>;
  readonly command: Deferred.Deferred<boolean>;
  readonly generation: number;
  readonly probe: boolean;
}

describe("PROPERTY: the breaker matches a pure reference model", () => {
  it.effect("generated command sequences leave status and transition counts in agreement", () =>
    Effect.gen(function* () {
      const scenarios = FastCheck.sample(
        FastCheck.record({
          failureThreshold: FastCheck.integer({ min: 1, max: 6 }),
          resetTimeoutMs: FastCheck.integer({ min: 1, max: 20_000 }),
          commands: FastCheck.array(commands, { minLength: 0, maxLength: 40 }),
        }),
        { numRuns: 150, seed: 52 },
      );

      for (const scenario of scenarios) {
        const { failureThreshold, resetTimeoutMs } = scenario;
        const outcome = yield* isolatedMetrics(
          Effect.gen(function* () {
            const breaker = yield* makeCircuitBreaker({ failureThreshold, resetTimeoutMs });
            const model: Model = {
              tag: "Closed",
              failures: 0,
              since: 0,
              claimed: false,
              generation: 0,
              now: yield* Clock.currentTimeMillis,
              transitions: { Open: 0, HalfOpen: 0, Closed: 0 },
            };
            const held: Array<Held> = [];
            const takeHeld = (index: number): Held | undefined =>
              held.length === 0 ? undefined : held.splice(index % held.length, 1)[0];

            for (const command of scenario.commands) {
              if (command.kind === "Fail" || command.kind === "Succeed") {
                const expected = admitModel(model, resetTimeoutMs);
                if (expected.kind !== "refused") {
                  settleModel(model, expected.generation, command.kind === "Succeed", failureThreshold);
                }
                yield* command.kind === "Succeed" ? succeedOnce(breaker) : failOnce(breaker);
              } else if (command.kind === "Permit") {
                const expected = admitModel(model, resetTimeoutMs);
                assert.strictEqual(yield* permitOf(breaker), expected.kind);
              } else if (command.kind === "Hold") {
                const expected = admitModel(model, resetTimeoutMs);
                const latch = yield* Latch.make();
                const settle = yield* Deferred.make<boolean>();
                const fiber = yield* Effect.forkChild(
                  breaker.withPermit((p) =>
                    p._tag === "Admitted"
                      ? latch.open.pipe(
                          Effect.andThen(Deferred.await(settle)),
                          Effect.flatMap((ok) => p.attempt(ok ? Effect.void : Effect.fail("offline"))),
                          Effect.asVoid,
                        )
                      : Effect.void,
                  ),
                );
                if (expected.kind === "refused") {
                  yield* Fiber.join(fiber);
                } else {
                  yield* latch.await;
                  held.push({
                    fiber,
                    command: settle,
                    generation: expected.generation,
                    probe: expected.kind === "probe",
                  });
                }
              } else if (command.kind === "Settle") {
                const entry = takeHeld(command.index);
                if (entry !== undefined) {
                  observeModel(model, resetTimeoutMs);
                  settleModel(model, entry.generation, command.ok, failureThreshold);
                  yield* Deferred.succeed(entry.command, command.ok);
                  yield* Fiber.join(entry.fiber);
                }
              } else if (command.kind === "Release") {
                const entry = takeHeld(command.index);
                if (entry !== undefined) {
                  observeModel(model, resetTimeoutMs);
                  if (entry.probe) releaseModel(model, entry.generation);
                  yield* Fiber.interrupt(entry.fiber);
                }
              } else {
                const millis =
                  command.kind === "Advance"
                    ? command.millis
                    : Math.max(0, model.since + resetTimeoutMs - model.now + command.delta);
                model.now += millis;
                yield* TestClock.adjust(millis);
              }
              observeModel(model, resetTimeoutMs);
              assert.strictEqual(yield* breaker.status, model.tag, JSON.stringify(command));
            }

            return { snapshot: yield* Metric.snapshot, expected: model.transitions };
          }),
        );
        const frequency = outcome.snapshot.find(
          (s): s is FrequencySnapshot =>
            s.type === "Frequency" && s.id === "qadi_audit_circuit_breaker_transitions_total",
        );
        for (const word of ["Open", "HalfOpen", "Closed"] as const) {
          assert.strictEqual(
            frequency?.state.occurrences.get(word) ?? 0,
            outcome.expected[word],
            `${word} transitions for ${JSON.stringify(scenario)}`,
          );
        }
      }
    }));
});
