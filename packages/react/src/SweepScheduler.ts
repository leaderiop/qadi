/**
 * Coalesces an atom set's sweep requests into one deferred sweep per pressure
 * episode.
 *
 * A registry disposes and re-reads in one synchronous stack and a render reads on
 * the render path, so a sweep in either would see a held question at zero.
 * `Effect.runFork` runs synchronously to its first yield, so an episode begins
 * with `Effect.yieldNow` and the sweep happens after the call that requested it
 * has returned. One pending flag per atom set gives one sweeper per atom set by
 * construction, however many registries or providers share it, and each fiber is
 * one-shot: there is no timer and no lifetime to tear down. `AtomRegistry`'s
 * `scheduleTask` and `defaultIdleTTL` stay off limits (CCR-QD-150). The decision
 * is ADR-QD-148.
 *
 * Out of the barrel (AGENTS.md §9): `QadiAtoms.ts` is its one caller, and the
 * package's own tests reach the fork through {@link withSweepFork}.
 */
import * as Effect from "effect/Effect";
import type * as Fiber from "effect/Fiber";

/** How a scheduler starts an episode; tests pass one that records the fibers. */
export type SweepFork = (effect: Effect.Effect<void>) => Fiber.Fiber<void>;

export interface SweepScheduler {
  /** Asks for a sweep after the current call returns; a no-op while one is pending. */
  readonly request: () => void;
  /** Whether a sweep has been requested and has not yet run. */
  readonly pending: () => boolean;
}

/**
 * Builds a scheduler over `sweep`.
 *
 * The flag clears before the sweep runs, so a request raised by the sweep starts
 * the next episode and a throwing sweep cannot wedge the scheduler. A fork that
 * throws clears it too and rethrows, so the next request forks again.
 *
 * A runtime that discards the default fork's timer leaves its episode suspended,
 * and nothing here can tell: the flag stays set and the bound stops holding for
 * that atom set. Node and browsers do not do this.
 */
export const makeSweepScheduler = (
  sweep: () => void,
  fork: SweepFork = (effect) => Effect.runFork(effect),
): SweepScheduler => {
  let pending = false;
  const episode = Effect.yieldNow.pipe(
    Effect.andThen(
      Effect.sync(() => {
        pending = false;
        sweep();
      }),
    ),
  );
  return {
    request: () => {
      if (pending) return;
      pending = true;
      try {
        fork(episode);
      } catch (cause) {
        pending = false;
        throw cause;
      }
    },
    pending: () => pending,
  };
};

/**
 * Carries a fork in a class-private slot, for {@link withSweepFork} and
 * {@link sweepForkOf}.
 *
 * Private to the module, as `GateWriter.ts`'s writer slot is (ADR-QD-080): the
 * slot is unreachable by reflection and there is no module-scope table.
 */
class SweepForkCarrier {
  readonly #fork: SweepFork;

  constructor(fork: SweepFork) {
    this.#fork = fork;
  }

  static of(options: object): SweepFork | undefined {
    return #fork in options ? options.#fork : undefined;
  }
}

/**
 * Returns `options` with a fork a test hands one atom set.
 *
 * `makeQadiAtoms` is re-exported from the barrel, so the fork cannot be a
 * parameter or an option without becoming public. The result carries every option
 * of `options` and the fork in a slot a spread copy does not carry.
 */
export const withSweepFork = <O extends object>(options: O, fork: SweepFork): O =>
  Object.assign(new SweepForkCarrier(fork), options);

/** The fork {@link withSweepFork} gave `options`, if any. */
export const sweepForkOf = (options: object | undefined): SweepFork | undefined =>
  options === undefined ? undefined : SweepForkCarrier.of(options);
