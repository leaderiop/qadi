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
 * open` on the next failure. Added since (ticket #38 / H4, narrowed by
 * ticket #47): `half-open → open` also on a probe that never resolves at
 * all — `recordFailure` itself now covers a defecting or interrupted probe
 * write directly (`AuditDecisionSinkLive.ts` runs `trailPort.write` under
 * `Effect.exit`), with `releaseProbe` (from `AuditDecisionSinkLive.ts`'s
 * `Effect.onExit`) and `status`'s own age-out check left as fallbacks for
 * whatever settles *after* that — so an interrupted or defecting probe
 * cannot wedge the breaker `HalfOpen` forever.
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
  /**
   * Claims the single write half-open admits, for a caller who has already
   * read `status` as `"HalfOpen"`.
   *
   * `true` for exactly one caller per half-open window; `false` for every
   * other concurrent caller in that same window, who must behave as though
   * the breaker were still `Open` (skip the write) rather than each
   * attempting one of their own. Without this, `Qadi.ts`'s `filter`/
   * `filterStream` — the same concurrent-`record()` shape `recordSuccess`/
   * `recordFailure`'s own `Ref.modify` docs already name — would let a
   * recovering store receive the whole fan-out at once the instant
   * `resetTimeoutMs` elapses, not the one trial write half-open's own name
   * promises.
   *
   * Resets on the next transition away from `HalfOpen`, whichever direction,
   * so the following half-open window admits a fresh probe.
   *
   * `false` is ambiguous by itself: it means either "another caller already
   * holds this window's slot" (still `HalfOpen`) or "the breaker is no
   * longer `HalfOpen` at all" (e.g. the prober's write just succeeded and
   * closed it). `AuditDecisionSinkLive.ts`'s `record()` re-reads `status`
   * after a lost claim to tell the two apart, rather than treating every
   * loss as `Open` — see the comment there (ticket #46).
   */
  readonly claimProbe: Effect.Effect<boolean>;
  /**
   * Releases a claimed probe that never resolved through `recordSuccess` or
   * `recordFailure` — reopens the breaker exactly as a failed probe would,
   * so a fresh `HalfOpen` window (and a fresh `claimProbe`) becomes
   * reachable again after `resetTimeoutMs`, rather than the probe's caller
   * holding the one slot forever.
   *
   * **Ticket #38 (H4).** The probe write in `AuditDecisionSinkLive.ts` used
   * to run under `Effect.result`, which only catches the write's own `E`
   * channel — an interruption (client disconnect, `Effect.timeout`, filter
   * fan-out) or a defecting store adapter unwound past it without ever
   * reaching `recordSuccess`/`recordFailure`, and `status`'s own read never
   * recovers a `HalfOpen` whose `openedAt` is `undefined` (it is only ever
   * set while `Open`). Before this fix that wedged the breaker permanently
   * `HalfOpen`: every later call would lose `claimProbe`, re-read `status`
   * as `HalfOpen` (not `Closed`), and so treat itself as `Open` forever —
   * staged rows never committed, or entries dropped silently, and the
   * backend could recover and it would make no difference.
   *
   * **Narrowed by ticket #47.** `trailPort.write` now runs under
   * `Effect.exit` instead, so a defecting or interrupted write already
   * reaches `recordFailure` directly — which reopens a `HalfOpen` breaker
   * exactly as this method does. `releaseProbe` remains the fallback for the
   * narrower window *after* that `Exit` is captured (`recordFailure` itself,
   * or a metric update after it, getting interrupted before completing),
   * rather than the primary path for the write's own failure.
   *
   * `AuditDecisionSinkLive.ts` calls this from an `Effect.onExit` wrapped
   * around the probe's write, so it fires on every abnormal exit. It is a
   * no-op unless the breaker is still `HalfOpen` **and** this window's claim
   * is still held: a probe that already settled normally
   * (`recordSuccess`/`recordFailure` already ran, moving `status` off
   * `HalfOpen`) leaves this call nothing to do, so a finalizer that runs
   * after a normal completion cannot double-transition the state or restart
   * the reset-timeout window a second time.
   */
  readonly releaseProbe: Effect.Effect<void>;
}

interface State {
  readonly status: CircuitBreakerStatus;
  readonly consecutiveFailures: number;
  /** Set only while `Open`, so `status`'s reset check has a moment to measure from. */
  readonly openedAt: number | undefined;
  /**
   * Set only while `HalfOpen`, mirroring `openedAt` — gives `status`'s
   * age-out check (see below) a moment to measure a stuck window from.
   * Reset to `undefined` on every transition away from `HalfOpen`.
   */
  readonly halfOpenAt: number | undefined;
  /** Meaningful only while `status === "HalfOpen"`; see `claimProbe`. */
  readonly probeClaimed: boolean;
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
    halfOpenAt: undefined,
    probeClaimed: false,
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
        // Defense in depth alongside `releaseProbe` (ticket #38 / H4): a
        // half-open window that has outlived `resetTimeoutMs` without
        // resolving — claimed but neither `recordSuccess`, `recordFailure`
        // nor `releaseProbe` ever ran — is reopened here too, on the next
        // status read, rather than left to wedge forever. `releaseProbe`
        // (called from `AuditDecisionSinkLive.ts`'s `Effect.onExit` around
        // the probe write) is the primary release path; this is the
        // fallback for a claim that somehow never reached it.
        if (state.status === "HalfOpen") {
          if (state.halfOpenAt === undefined || now - state.halfOpenAt < options.resetTimeoutMs) {
            return [[state.status, false], state];
          }
          const reopened: State = {
            status: "Open",
            consecutiveFailures: state.consecutiveFailures + 1,
            openedAt: now,
            halfOpenAt: undefined,
            probeClaimed: false,
          };
          return [["Open", true], reopened];
        }
        // `openedAt` is set if and only if `status === "Open"` — this Ref's
        // own invariant — so checking it alone already answers "not open",
        // with no separate `state.status !== "Open"` clause needed (and no
        // narrower one TypeScript could use anyway, since `openedAt` isn't
        // typed as discriminated by `status`).
        if (state.openedAt === undefined || now - state.openedAt < options.resetTimeoutMs) {
          return [[state.status, false], state];
        }
        const next: State = {
          status: "HalfOpen",
          consecutiveFailures: state.consecutiveFailures,
          openedAt: undefined,
          halfOpenAt: now,
          probeClaimed: false,
        };
        return [["HalfOpen", true], next];
      },
    );
    if (justTransitioned) yield* announceTransition(current);
    return current;
  });

  const recordSuccess: Effect.Effect<void> = Effect.gen(function* () {
    const closedNow = yield* Ref.modify(ref, (state) => {
      if (state.status === "HalfOpen") {
        return [
          true,
          {
            status: "Closed" as const,
            consecutiveFailures: 0,
            openedAt: undefined,
            halfOpenAt: undefined,
            probeClaimed: false,
          },
        ];
      }
      return [false, { ...state, consecutiveFailures: 0 }];
    });
    if (closedNow) yield* announceTransition("Closed");
  });

  const recordFailure: Effect.Effect<void> = Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const openedNow = yield* Ref.modify(ref, (state) => {
      if (state.status === "HalfOpen") {
        return [
          true,
          {
            status: "Open" as const,
            consecutiveFailures: 1,
            openedAt: now,
            halfOpenAt: undefined,
            probeClaimed: false,
          },
        ];
      }
      const consecutiveFailures = state.consecutiveFailures + 1;
      if (consecutiveFailures >= options.failureThreshold) {
        return [
          true,
          {
            status: "Open" as const,
            consecutiveFailures,
            openedAt: now,
            halfOpenAt: undefined,
            probeClaimed: false,
          },
        ];
      }
      return [false, { ...state, consecutiveFailures }];
    });
    if (openedNow) yield* announceTransition("Open");
  });

  // Atomic with the check: a second concurrent caller reading `false` here
  // must never be able to observe `probeClaimed` still false a moment later,
  // or two callers could both believe they hold the one probe slot.
  const claimProbe: Effect.Effect<boolean> = Ref.modify(ref, (state) => {
    if (state.status !== "HalfOpen" || state.probeClaimed) return [false, state];
    return [true, { ...state, probeClaimed: true }];
  });

  // See the interface doc comment (ticket #38 / H4). Guarded so a finalizer
  // that runs after the probe already settled normally has nothing left to
  // undo: the `state.status !== "HalfOpen" || !state.probeClaimed` check is
  // the same shape `claimProbe` itself uses, and holds for the same reason —
  // a genuinely new half-open window is only ever reachable after this (or
  // `recordSuccess`/`recordFailure`) has already reset `probeClaimed`, so
  // there is no window in which this call could steal a *different* claim.
  const releaseProbe: Effect.Effect<void> = Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const reopened = yield* Ref.modify(ref, (state) => {
      if (state.status !== "HalfOpen" || !state.probeClaimed) return [false, state];
      return [
        true,
        {
          status: "Open" as const,
          consecutiveFailures: state.consecutiveFailures + 1,
          openedAt: now,
          halfOpenAt: undefined,
          probeClaimed: false,
        },
      ];
    });
    if (reopened) yield* announceTransition("Open");
  });

  return { status, recordSuccess, recordFailure, claimProbe, releaseProbe } satisfies CircuitBreaker;
});
