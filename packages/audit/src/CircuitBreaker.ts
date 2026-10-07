/**
 * A half-open circuit breaker that admits, guards and settles one write at a
 * time, protecting `AuditTrailPort.write` from a caller's store being down.
 *
 * The probe protocol is this module's own detail: read status, claim the one
 * half-open probe, re-read on a lost claim, settle the outcome, and release an
 * unsettled claim on every exit path. {@link CircuitBreaker.withPermit} is the
 * single admission entry point, so the claim's lifetime and its release guard
 * share one scope by construction (ARCH-07 C4b: the sink used to scope the
 * guard to the write rather than to the claim, and a probe interrupted during
 * staging held the claim until the age-out).
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
 * practice, the exact defect this map exists to avoid repeating. A refusal
 * here is a plain {@link Refused} value, not an error; nothing outside this
 * module ever constructs or inspects a failure from it.
 *
 * The state machine's shape was never HexDi's defect, only its wiring and its
 * `Date.now()` usage were — kept as-is: `closed → open` after
 * `failureThreshold` consecutive failures, `open → half-open` after
 * `resetTimeoutMs`, `half-open → closed` on the next success, `half-open →
 * open` on the next failure. Added since (ticket #38 / H4, narrowed by
 * ticket #47): `half-open → open` also on a probe that never resolves at
 * all. `Effect.exit` around the write folds a typed failure, a defect and an
 * adapter's own self-interruption into a recorded failure. A *caller's*
 * interruption is not folded (the fiber itself is interrupted), so for a probe
 * the release finalizer is the primary path, and for a non-probe write nothing
 * is recorded. `status`'s own age-out check is the last fallback — so none of
 * these can wedge the breaker `HalfOpen` forever.
 *
 * Package-private: not exported from the barrel or any entry point
 * (ADR-QD-099); this module is assembly-internal.
 */
import * as Clock from "effect/Clock";
import * as Data from "effect/Data";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import * as Record from "effect/Record";
import * as Ref from "effect/Ref";

export type CircuitBreakerStatus = "Closed" | "Open" | "HalfOpen";

export interface CircuitBreakerOptions {
  readonly failureThreshold: number;
  /**
   * `Duration.Input`, not a bare `number` — `@qadi/http`'s `DecisionStreamOptions.reauth.interval`
   * is the convention this now matches (issue #107). The field keeps its
   * `Ms`-suffixed name for source compatibility (every existing caller
   * passing a plain millisecond number is still valid `Duration.Input`,
   * unchanged); only the type widened.
   */
  readonly resetTimeoutMs: Duration.Input;
}

/** No write this time: the breaker is Open, or another caller holds this half-open window's probe. */
export class Refused extends Data.TaggedClass("Refused")<Record<never, never>> {}

/**
 * A write may be attempted; `probe` is true when it is this half-open window's
 * one trial write.
 *
 * `attempt` runs the write under `Effect.exit` and records its outcome on the
 * breaker, but only the first time it is called for this permit; later calls
 * run the write and return its `Exit` without recording.
 */
export class Admitted extends Data.TaggedClass("Admitted")<{
  readonly probe: boolean;
  /** The window this permit was admitted under; opaque to callers, used by the release guard. */
  readonly generation: number;
  readonly attempt: <A, E, R>(
    write: Effect.Effect<A, E, R>,
  ) => Effect.Effect<Exit.Exit<A, E>, never, R>;
}> {}

export type Permit = Refused | Admitted;

export interface CircuitBreaker {
  /**
   * Current status, transitioning `Open` to `HalfOpen` as a side effect of
   * the read once `resetTimeoutMs` has elapsed — that transition only ever
   * matters at the moment something is about to ask "should I attempt a
   * write", so there is no separate ambient timer to keep in sync.
   */
  readonly status: Effect.Effect<CircuitBreakerStatus>;
  /**
   * Admits, guards and settles one write: runs `use` with a {@link Permit}.
   *
   * **One probe per window.** A half-open breaker admits exactly one
   * concurrent probe write; every other caller racing it gets {@link Refused}
   * and must behave as though the breaker were still `Open`. Without this,
   * `Qadi.ts`'s `filter`/`filterStream` fan-out would let a recovering store
   * receive the whole fan-out the instant `resetTimeoutMs` elapses, not the
   * one trial write half-open's own name promises.
   *
   * **A lost claim has two causes** a single `Refused` fallback would
   * conflate (ticket #46): another caller holds this window's slot (still
   * `HalfOpen`), or the breaker moved on while this call was in flight, most
   * notably the prober's write just succeeded and closed it. Admission re-reads
   * `status` after a lost claim: `Closed` means this call may write normally;
   * anything else is {@link Refused}.
   *
   * **Release on every exit.** The claim is acquired uninterruptibly and
   * released when `use` exits unsuccessfully, wherever in `use` that happens —
   * staging included (ticket #38 / H4, ARCH-07 C4b). The release reopens the
   * breaker exactly as a failed probe would, and is a no-op once `attempt` has
   * settled the window, so a finalizer after a normal completion cannot
   * double-transition the state or restart the reset-timeout window. A `use`
   * that succeeds without calling `attempt` on a probe permit leaves the claim
   * to `status`'s age-out.
   *
   * `attempt` records only its first outcome per permit, and only toward the
   * window that admitted it: a write admitted before a trip and settling after
   * it (or after a later half-open window began) is not evidence about the
   * store since, so the breaker ignores its outcome. The caller still sees the
   * write's `Exit` and meters it.
   */
  readonly withPermit: <A, E, R>(
    use: (permit: Permit) => Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
}

/**
 * The breaker's state, one variant per status so each field exists only where
 * it means something. `Open`'s `openedAt` and `HalfOpen`'s `halfOpenAt` give
 * `status`'s reset and age-out checks a moment to measure from.
 *
 * Every variant carries a `generation`, incremented on each change of status. A
 * permit captures the generation it was admitted under, and its outcome counts
 * only while that generation is current (see {@link CircuitBreaker.withPermit}).
 */
class StateClosed extends Data.TaggedClass("Closed")<{
  readonly generation: number;
  readonly consecutiveFailures: number;
}> {}
class StateOpen extends Data.TaggedClass("Open")<{
  readonly generation: number;
  readonly openedAt: number;
}> {}
class StateHalfOpen extends Data.TaggedClass("HalfOpen")<{
  readonly generation: number;
  readonly halfOpenAt: number;
  /** See {@link CircuitBreaker.withPermit}. */
  readonly probeClaimed: boolean;
}> {}
type State = StateClosed | StateOpen | StateHalfOpen;

/**
 * Every `CircuitBreakerStatus` — {@link transitionsTotal}'s closed domain.
 *
 * A `Record<CircuitBreakerStatus, true>` rather than an array literal, the
 * `Decision.ts`/`Evaluate.ts` `*_BY_TAG` idiom: TypeScript requires every key
 * of the type to be present (TS2741 otherwise), so a fourth status added to
 * the state machine without a matching entry here is a compile error rather
 * than a word silently missing from this metric's snapshot.
 */
const CIRCUIT_BREAKER_STATUSES_BY_STATUS: Record<CircuitBreakerStatus, true> = {
  Closed: true,
  HalfOpen: true,
  Open: true,
};

const CIRCUIT_BREAKER_STATUSES: ReadonlyArray<CircuitBreakerStatus> = Record.keys(
  CIRCUIT_BREAKER_STATUSES_BY_STATUS,
);

/**
 * Circuit breaker state transitions, by the state transitioned to.
 *
 * **A tagged frequency, not a `0 = Closed, 1 = HalfOpen, 2 = Open` gauge**
 * (issue #107). The gauge encoded state as a number a reader could only
 * decode against this file's own comment — exactly the "unregistered word"
 * problem `preregisteredWords` exists to close, just for a metric whose
 * words were digits instead of names. This also retires the hand-rolled
 * `Metric.withAttributes`-per-status dispatch table the counter version
 * needed (`transitionsToOpen`/`transitionsToHalfOpen`/`transitionsToClosed`,
 * looked up through a `Record<CircuitBreakerStatus, Metric.Counter<number>>`)
 * — a `Metric.frequency` already *is* "count occurrences, by name," which is
 * what that table was building by hand.
 *
 * **What this trades away, deliberately.** A gauge is queryable for its
 * *current* value; a frequency's `occurrences` are cumulative counts with no
 * per-word timestamp, so "which state is the breaker in right now" is no
 * longer answerable from this metric alone the way `qadi_audit_circuit_breaker_state
 * == 2` could answer it before. `CircuitBreaker.status` is the channel for
 * that question — a live, in-process `Effect.Effect<CircuitBreakerStatus>`
 * this metric was never the only way to reach — and `AuditDecisionSinkLive.ts`
 * already reads it directly rather than through the metrics registry. What
 * this metric answers, and what a gauge snapshot alone could not without a
 * second time series to diff against, is churn: how many times has this
 * breaker gone `Open`, not just whether it is `Open` at this instant.
 */
const transitionsTotal = Metric.frequency("qadi_audit_circuit_breaker_transitions_total", {
  description: "Circuit breaker state transitions, by the state transitioned to.",
  preregisteredWords: CIRCUIT_BREAKER_STATUSES,
});

/**
 * Emits the transition-frequency update for a status this call actually
 * caused — never called for a `Ref.modify` that left status unchanged, so
 * reading `status` while already half-open does not re-count a transition
 * that happened on an earlier call.
 */
const announceTransition = (to: CircuitBreakerStatus): Effect.Effect<void> =>
  Metric.update(transitionsTotal, to);

export const makeCircuitBreaker = Effect.fn("qadi.audit.makeCircuitBreaker")(function* (
  options: CircuitBreakerOptions,
) {
  // Decoded once, here, rather than on every `Ref.modify` comparison below:
  // `Duration.toMillis` is cheap, but `status` runs on every `record()` call,
  // and the plain `Ref.modify` callback it runs inside is not the place to
  // re-decode a caller-supplied `Duration.Input` on each read.
  const resetTimeoutMillis = Duration.toMillis(options.resetTimeoutMs);

  const ref = yield* Ref.make<State>(new StateClosed({ generation: 0, consecutiveFailures: 0 }));

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
  type Observed = readonly [CircuitBreakerStatus, number];
  type Observation = readonly [readonly [Observed, boolean], State];
  const observe: Effect.Effect<Observed> = Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const [observed, justTransitioned] = yield* Ref.modify(
      ref,
      (state): Observation =>
        Match.value(state).pipe(
          Match.tagsExhaustive({
            Closed: (closed): Observation => [[[closed._tag, closed.generation], false], closed],
            // Defense in depth alongside the release finalizer (ticket #38 /
            // H4): a half-open window that has outlived `resetTimeoutMs`
            // without resolving is reopened here too, on the next status
            // read, rather than left to wedge forever.
            HalfOpen: (halfOpen): Observation =>
              now - halfOpen.halfOpenAt < resetTimeoutMillis
                ? [[[halfOpen._tag, halfOpen.generation], false], halfOpen]
                : [
                    [["Open", halfOpen.generation + 1], true],
                    new StateOpen({ generation: halfOpen.generation + 1, openedAt: now }),
                  ],
            Open: (open): Observation =>
              now - open.openedAt < resetTimeoutMillis
                ? [[[open._tag, open.generation], false], open]
                : [
                    [["HalfOpen", open.generation + 1], true],
                    new StateHalfOpen({
                      generation: open.generation + 1,
                      halfOpenAt: now,
                      probeClaimed: false,
                    }),
                  ],
          }),
        ),
    );
    if (justTransitioned) yield* announceTransition(observed[0]);
    return observed;
  });

  const status: Effect.Effect<CircuitBreakerStatus> = Effect.map(observe, ([current]) => current);

  // Each outcome applies only while `generation` is still the one its permit
  // was admitted under (D-07-d); otherwise it is left unchanged.
  const recordSuccess = (generation: number): Effect.Effect<void> =>
    Effect.gen(function* () {
      const closedNow = yield* Ref.modify(
        ref,
        (state): readonly [boolean, State] =>
          state.generation !== generation
            ? [false, state]
            : Match.value(state).pipe(
                Match.tagsExhaustive({
                  Closed: (closed): readonly [boolean, State] => [
                    false,
                    new StateClosed({ generation: closed.generation, consecutiveFailures: 0 }),
                  ],
                  HalfOpen: (halfOpen): readonly [boolean, State] => [
                    true,
                    new StateClosed({
                      generation: halfOpen.generation + 1,
                      consecutiveFailures: 0,
                    }),
                  ],
                  Open: (open): readonly [boolean, State] => [false, open],
                }),
              ),
      );
      if (closedNow) yield* announceTransition("Closed");
    });

  const recordFailure = (generation: number): Effect.Effect<void> =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const openedNow = yield* Ref.modify(
        ref,
        (state): readonly [boolean, State] =>
          state.generation !== generation
            ? [false, state]
            : Match.value(state).pipe(
                Match.tagsExhaustive({
                  // A no-op while `Open`: a write admitted before the trip and
                  // settling after it is not evidence about the store since
                  // (ARCH-07 C5, D-07-c). The generation check above already
                  // covers it; this arm keeps the dispatch exhaustive.
                  Open: (open): readonly [boolean, State] => [false, open],
                  HalfOpen: (halfOpen): readonly [boolean, State] => [
                    true,
                    new StateOpen({ generation: halfOpen.generation + 1, openedAt: now }),
                  ],
                  Closed: (closed): readonly [boolean, State] => {
                    const consecutiveFailures = closed.consecutiveFailures + 1;
                    return consecutiveFailures >= options.failureThreshold
                      ? [true, new StateOpen({ generation: closed.generation + 1, openedAt: now })]
                      : [
                          false,
                          new StateClosed({ generation: closed.generation, consecutiveFailures }),
                        ];
                  },
                }),
              ),
      );
      if (openedNow) yield* announceTransition("Open");
    });

  // Atomic with the check: a second concurrent caller reading `undefined` here
  // must never be able to observe `probeClaimed` still false a moment later,
  // or two callers could both believe they hold the one probe slot. Returns
  // the window's generation when the claim is won.
  const claimProbe: Effect.Effect<number | undefined> = Ref.modify(
    ref,
    (state): readonly [number | undefined, State] =>
      state._tag !== "HalfOpen" || state.probeClaimed
        ? [undefined, state]
        : [
            state.generation,
            new StateHalfOpen({
              generation: state.generation,
              halfOpenAt: state.halfOpenAt,
              probeClaimed: true,
            }),
          ],
  );

  // Guarded so a finalizer that runs after the probe already settled has
  // nothing left to undo: a genuinely new half-open window is only ever
  // reachable after `recordSuccess`/`recordFailure` has already moved on, and
  // the generation check means this call cannot steal a *different* window's
  // claim.
  const releaseProbe = (generation: number): Effect.Effect<void> =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const reopened = yield* Ref.modify(
        ref,
        (state): readonly [boolean, State] =>
          state._tag !== "HalfOpen" || !state.probeClaimed || state.generation !== generation
            ? [false, state]
            : [true, new StateOpen({ generation: state.generation + 1, openedAt: now })],
      );
      if (reopened) yield* announceTransition("Open");
    });

  const admit = Effect.gen(function* (): Effect.fn.Return<Permit> {
    const [initialStatus, initialGeneration] = yield* observe;
    const claimed = initialStatus === "HalfOpen" ? yield* claimProbe : undefined;
    // The claim was lost: re-read to tell "still half-open under another
    // caller's probe" apart from "the breaker moved on" (ticket #46).
    const [resolved, resolvedGeneration]: Observed =
      initialStatus === "HalfOpen" && claimed === undefined
        ? yield* observe
        : [initialStatus, initialGeneration];
    const probe = claimed !== undefined;
    if (!probe && resolved !== "Closed") return new Refused();
    const generation = claimed ?? resolvedGeneration;
    const settled = yield* Ref.make(false);
    const attempt = <A, E, R>(write: Effect.Effect<A, E, R>) =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(write);
        const alreadySettled = yield* Ref.getAndSet(settled, true);
        if (!alreadySettled) {
          yield* Exit.isSuccess(exit) ? recordSuccess(generation) : recordFailure(generation);
        }
        return exit;
      });
    return new Admitted({ probe, generation, attempt });
  });

  const withPermit = Effect.fn("qadi.audit.circuitBreaker.withPermit")(function* <A, E, R>(
    use: (permit: Permit) => Effect.Effect<A, E, R>,
  ) {
    return yield* Effect.acquireUseRelease(
      admit,
      (permit) =>
        Effect.annotateCurrentSpan({
          "qadi.audit.permit": permit._tag,
          "qadi.audit.probe": permit._tag === "Admitted" && permit.probe,
        }).pipe(Effect.andThen(use(permit))),
      (permit, exit) =>
        permit._tag === "Admitted" && permit.probe && Exit.isFailure(exit)
          ? releaseProbe(permit.generation)
          : Effect.void,
    );
  });

  return { status, withPermit } satisfies CircuitBreaker;
});
