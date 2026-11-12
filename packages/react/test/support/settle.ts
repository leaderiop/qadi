/**
 * Settles the deferred sweep: enough macrotask turns for a registry release, the
 * signal it raises and the forked sweep.
 *
 * `Effect.yieldNow` resumes on a macrotask. A release after an unmount needs two
 * or more turns and the sweep one more, and `TestClock` does not control a fiber
 * started by `Effect.runFork`, so the tests take a fixed number of real turns.
 */
import * as Effect from "effect/Effect";

export const settleTurns: Effect.Effect<void> = Effect.gen(function* () {
  for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
});

export const settle = (): Promise<void> => Effect.runPromise(settleTurns);
