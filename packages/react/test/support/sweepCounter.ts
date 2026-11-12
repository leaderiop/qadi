/**
 * Counts the forks and sweeps of one atom set handed its fork through
 * `withSweepFork`.
 *
 * A sweep that evicts nothing leaves no trace in `asked()`, so the count is read
 * at the fork: `sweepsAtFork` records how many sweeps had run when each episode
 * began. The real sweep still runs and is counted after it, and nothing is
 * mocked.
 */
import * as Effect from "effect/Effect";
import type { SweepFork } from "../../src/SweepScheduler.ts";

export interface SweepCounts {
  forks: number;
  sweeps: number;
  readonly sweepsAtFork: Array<number>;
}

export const makeSweepCounter = (
  onFork: () => void = () => undefined,
): { readonly fork: SweepFork; readonly counts: SweepCounts; readonly reset: () => void } => {
  const counts: SweepCounts = { forks: 0, sweeps: 0, sweepsAtFork: [] };
  const fork: SweepFork = (episode) => {
    counts.forks += 1;
    counts.sweepsAtFork.push(counts.sweeps);
    onFork();
    return Effect.runFork(
      episode.pipe(
        Effect.andThen(
          Effect.sync(() => {
            counts.sweeps += 1;
          }),
        ),
      ),
    );
  };
  const reset = (): void => {
    counts.forks = 0;
    counts.sweeps = 0;
    counts.sweepsAtFork.length = 0;
  };
  return { fork, counts, reset };
};
