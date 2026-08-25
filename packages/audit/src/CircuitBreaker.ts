/**
 * Guards `AuditTrailPort.write` against a caller's store being down.
 *
 * **Fully internal, no port.** Unlike `AuditTrailPort`/`AuditStagingPort`,
 * the breaker has no I/O of its own — it is an Effect-native `Ref`-backed
 * state machine [AuditDecisionSinkLive.ts](./AuditDecisionSinkLive.ts)
 * constructs when its `DecisionSink` `Layer` is built, using
 * `Clock.currentTimeMillis` rather than `Date.now()` (AGENTS.md §6), unlike
 * HexDi's version (`libs/guard/core/src/guard/circuit-breaker.ts`).
 *
 * **No public error type.** HexDi's `createCircuitBreaker` returns a
 * `CircuitOpenError` from a `check()` nothing in its real enforcement path
 * ever calls — a well-formed error type reachable only in principle, never in
 * practice, the exact defect this map exists to avoid repeating. Trip state
 * here is a plain internal check `record()` makes before attempting a write;
 * nothing outside this module ever constructs or inspects a failure from it.
 *
 * The state machine's shape was never HexDi's defect, only its wiring and its
 * `Date.now()` usage were — kept as-is: `closed → open` after
 * `failureThreshold` consecutive failures, `open → half-open` after
 * `resetTimeoutMs`, `half-open → closed` on the next success, `half-open →
 * open` on the next failure.
 *
 * Not exported from the package barrel — this module is assembly-internal.
 */
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import * as Ref from "effect/Ref";

export type CircuitBreakerStatus = "Closed" | "Open" | "HalfOpen";

export interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  readonly resetTimeoutMs: number;
}

export interface CircuitBreaker {
  /**
   * Current status, transitioning `Open` to `HalfOpen` as a side effect of
   * the read once `resetTimeoutMs` has elapsed — that transition only ever
   * matters at the moment something is about to ask "should I attempt a
   * write", so there is no separate ambient timer to keep in sync.
   */
  readonly status: Effect.Effect<CircuitBreakerStatus>;
  /** A write attempt succeeded. May close a half-open breaker. */
  readonly recordSuccess: Effect.Effect<void>;
  /** A write attempt failed with `AuditWriteError`. May trip the breaker. */
  readonly recordFailure: Effect.Effect<void>;
}

interface State {
  readonly status: CircuitBreakerStatus;
  readonly consecutiveFailures: number;
  /** Set only while `Open`, so `status`'s reset check has a moment to measure from. */
  readonly openedAt: number | undefined;
}

/**
 * `0 = Closed`, `1 = HalfOpen`, `2 = Open` — a `Metric.gauge` carries a plain
 * number, so the state is reported as one, documented here rather than left
 * to be reverse-engineered from an operator dashboard.
 */
const GAUGE_VALUE: Record<CircuitBreakerStatus, number> = { Closed: 0, HalfOpen: 1, Open: 2 };

const breakerStateGauge = Metric.gauge("qadi_audit_circuit_breaker_state", {
  description: "Current circuit breaker state: 0 = closed, 1 = half-open, 2 = open.",
});

const transitionsTotal = Metric.counter("qadi_audit_circuit_breaker_transitions_total", {
  description: "Circuit breaker state transitions, tagged by the state transitioned to.",
});
const transitionsToOpen = Metric.withAttributes(transitionsTotal, { to: "Open" });
const transitionsToHalfOpen = Metric.withAttributes(transitionsTotal, { to: "HalfOpen" });
const transitionsToClosed = Metric.withAttributes(transitionsTotal, { to: "Closed" });

const transitionMetric: Record<CircuitBreakerStatus, Metric.Counter<number>> = {
  Open: transitionsToOpen,
  HalfOpen: transitionsToHalfOpen,
  Closed: transitionsToClosed,
};

/**
 * Emits the gauge and transition-counter update for a status this call
 * actually caused — never called for a `Ref.modify` that left status
 * unchanged, so reading `status` while already half-open does not re-count
 * a transition that happened on an earlier call.
 */
const announceTransition = (to: CircuitBreakerStatus): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Metric.update(breakerStateGauge, GAUGE_VALUE[to]);
    yield* Metric.update(transitionMetric[to], 1);
  });

export const makeCircuitBreaker = Effect.fn("qadi.audit.makeCircuitBreaker")(function* (
  options: CircuitBreakerOptions,
) {
  const ref = yield* Ref.make<State>({
    status: "Closed",
    consecutiveFailures: 0,
    openedAt: undefined,
  });

  /**
   * Every transition below reads and writes `ref` through a single
   * `Ref.modify` call rather than a separate `Ref.get` followed by a later
   * `Ref.set` — the two-step form lets two fibers both read the same stale
   * state before either writes back, losing an update or double-counting a
   * transition under concurrent `record()` calls (`Qadi.ts`'s `filter`/
   * `filterStream` evaluate items concurrently, so this is a real, not
   * hypothetical, caller shape). `Ref.modify` performs the read-compute-write
   * as one atomic step, which is what actually closes the race rather than
   * just narrowing its window.
   */
  const status: Effect.Effect<CircuitBreakerStatus> = Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const [current, justTransitioned] = yield* Ref.modify(
      ref,
      (state): readonly [readonly [CircuitBreakerStatus, boolean], State] => {
        // `openedAt` is set if and only if `status === "Open"` — this Ref's
        // own invariant — so checking it alone already answers "not open",
        // with no separate `state.status !== "Open"` clause needed (and no
        // narrower one TypeScript could use anyway, since `openedAt` isn't
        // typed as discriminated by `status`).
        if (state.openedAt === undefined || now - state.openedAt < options.resetTimeoutMs) {
          return [[state.status, false], state];
        }
        const next: State = { status: "HalfOpen", consecutiveFailures: state.consecutiveFailures, openedAt: undefined };
        return [["HalfOpen", true], next];
      },
    );
    if (justTransitioned) yield* announceTransition(current);
    return current;
  });

  const recordSuccess: Effect.Effect<void> = Effect.gen(function* () {
    const closedNow = yield* Ref.modify(ref, (state) => {
      if (state.status === "HalfOpen") {
        return [true, { status: "Closed" as const, consecutiveFailures: 0, openedAt: undefined }];
      }
      return [false, { ...state, consecutiveFailures: 0 }];
    });
    if (closedNow) yield* announceTransition("Closed");
  });

  const recordFailure: Effect.Effect<void> = Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const openedNow = yield* Ref.modify(ref, (state) => {
      if (state.status === "HalfOpen") {
        return [true, { status: "Open" as const, consecutiveFailures: 1, openedAt: now }];
      }
      const consecutiveFailures = state.consecutiveFailures + 1;
      if (consecutiveFailures >= options.failureThreshold) {
        return [true, { status: "Open" as const, consecutiveFailures, openedAt: now }];
      }
      return [false, { ...state, consecutiveFailures }];
    });
    if (openedNow) yield* announceTransition("Open");
  });

  return { status, recordSuccess, recordFailure } satisfies CircuitBreaker;
});
