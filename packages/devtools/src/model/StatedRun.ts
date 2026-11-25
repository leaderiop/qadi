/**
 * The scoped run a store starts, and the one place that states why it stopped.
 *
 * The timeline feed, the diagnostics feed and the simulation session each started a run the
 * same way (publish what shows while it starts, then fork it) and each decided by hand what a
 * run's end meant, and the three decided differently: two read the exit through a hook that
 * skipped an interruption, the third stringified the cause. A store supplies what it publishes
 * and the engine it runs; this module owns the order, the guards and the stop.
 *
 * **A stop is stated for a current run whose own work ended on anything but success.** An
 * interruption the run gave itself is a stop too: nothing outside asked for it, so a status
 * that stayed `Reading` or `Live` would look current while nothing ran. An interruption from
 * outside (a newer start, `stop`, the scope closing, a release that dies as it closes) is never
 * stated, because each replaces or clears the current run before it interrupts it, so the run's
 * exit is never read. A run that ends on its own after a newer one began is not current
 * and is not stated either. The reason is `causeMessage`'s text (ADR-QD-182): a `Cause.pretty`
 * trace whenever one renders, and the one placeholder when the failed value cannot be read, so
 * a hostile value cannot throw out of the stop. It is for the host's own process and must not
 * cross a trust boundary. A layer that fails to build is not a defect of the run, and a store
 * that reads one decides for itself.
 *
 * **Publish, then fork** (ADR-QD-150, ADR-QD-194). `start` supersedes the run before it, calls
 * the plan's `starting`, and forks the engine in a `finally`, because a subscriber may supersede
 * the run from inside the publish and `fork` re-checks the token. The callback form is what lets
 * a store publish between the two steps. A throw on the published state is the listeners' own:
 * every listener is called, and what they threw is rethrown out of `start` once the new run has
 * started, one value as itself and several as one `AggregateError`, so a status never says a run
 * is under way with nothing running. The engine is built inside the run's own fiber, after
 * `starting` returns, so a plan can read what the publish changed, and an engine that throws as
 * it is built is a defect of the run, stated like any other, which never replaces the listeners' throw.
 *
 * The scope owns the run: closing it interrupts the engine, and a `start` after the close does
 * nothing, so a restart on a closed store publishes no state that nothing follows.
 *
 * ADR-QD-200 is the decision for this module, applying ADR-QD-150's superseding run.
 * Package-private (ADR-QD-099).
 */
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type * as Scope from "effect/Scope";
import { causeMessage } from "@qadi/core";
import { makeSupersedingRun } from "./SupersedingRun.ts";

/** What an engine is told about its own run: whether it is still the current one, and a guard for its writes. */
export interface RunLive {
  /** Whether no newer run has begun and the scope is open. */
  readonly current: () => boolean;
  /** A writer that drops a value from a run that is not current, before the value is read. */
  readonly guard: <A>(write: (a: A) => void) => (a: A) => void;
}

/** What a store starts: the state it publishes first, and the engine it forks. */
export interface RunPlan {
  /** Publishes the state shown while the run starts; it may throw, and the engine starts all the same. */
  readonly starting: () => void;
  /**
   * The run itself, built in the run's fiber after `starting` returns, so a throw while building
   * it is a defect of the run; a non-success exit of a current run is stated.
   */
  readonly engine: (live: RunLive) => Effect.Effect<void, unknown>;
}

/** One run at a time, started from a plan, with its stop stated once. */
export interface StatedRun {
  /** Supersedes the current run, publishes, then forks the plan's engine; does nothing once the scope has closed. */
  readonly start: (plan: RunPlan) => void;
  /** Supersedes the current run and starts nothing; states nothing. */
  readonly stop: () => void;
  /** Whether the owning scope has closed. */
  readonly closed: () => boolean;
}

/** Builds the stated run in the caller's scope; `stopped` receives the reason of each stop. */
export const makeStatedRun = Effect.fn(function* (
  stopped: (reason: string) => void,
): Effect.fn.Return<StatedRun, never, Scope.Scope> {
  const runs = yield* makeSupersedingRun();

  const start = (plan: RunPlan): void => {
    if (runs.closed()) return;
    const token = runs.begin();
    const live: RunLive = {
      current: () => runs.isCurrent(token),
      guard: (write) => (value) => {
        if (!runs.isCurrent(token)) return;
        write(value);
      },
    };
    try {
      plan.starting();
    } finally {
      runs.fork(
        token,
        Effect.exit(Effect.suspend(() => plan.engine(live))).pipe(
          Effect.flatMap((exit) =>
            Effect.sync(() => {
              if (runs.isCurrent(token) && Exit.isFailure(exit)) stopped(causeMessage(exit.cause));
            }),
          ),
        ),
      );
    }
  };

  return { start, stop: runs.stop, closed: runs.closed };
});
