/**
 * A scoped run that a newer run supersedes, owned by a scope.
 *
 * Three stores (the timeline feed, the diagnostics feed and the simulation session)
 * each restated this protocol by hand and drifted: a counter naming the current
 * run, a closed flag, a finalizer, a fiber handle, and a check before each landed
 * write. It lives here once (ADR-QD-150). A store keeps only what it does with a
 * result that lands.
 *
 * The interface is two steps. `begin` supersedes the run before it and returns a
 * token; the store then publishes whatever it shows while a run starts; `fork` runs
 * the effect only while the token is still current, and says whether it did. A
 * store publishes between the two, so a subscriber may supersede the run before it
 * starts, and `fork` re-checks. A `begin` is paired with a `fork` or a `stop`: a
 * `begin` alone leaves the run before it running, fenced by its token, until the
 * next `fork` or `stop`.
 *
 * The finalizer is registered after the handle, so on a close it runs first: the
 * run the handle then interrupts is not current, so a store that checks
 * `isCurrent` drops whatever that run lands as its scope closes. That order holds
 * only under the default `"sequential"` finalizer strategy; a
 * `Scope.make("parallel")` forks its finalizers and voids it. A `begin` after the
 * close returns a token that is never current.
 *
 * A run's synchronous prefix runs inside `fork`, so a store sees the state a first
 * step reaches before `fork` returns. A fork requested while another fork's start
 * is still running (a prefix that starts a command that starts a newer run) is
 * held in one slot and installed when that start returns, re-checked until nothing
 * is held, so the newest run is live and the stale outer one is interrupted. A token
 * is forked once: a second fork of the same token from inside a start overwrites the
 * held one, so the first never starts although it answered `true`.
 *
 * Package-private (ADR-QD-099).
 */
import * as Effect from "effect/Effect";
import * as FiberHandle from "effect/FiberHandle";
import type * as Scope from "effect/Scope";

const tokenBrand: unique symbol = Symbol("qadi.devtools.RunToken");

/** Names one run. Opaque: a store asks `isCurrent(token)` and nothing else. */
export interface RunToken {
  readonly [tokenBrand]: true;
}

/** One run at a time; a newer run supersedes and interrupts the one before it. */
export interface SupersedingRun {
  /** Supersedes the current run and returns the token of the next one. */
  readonly begin: () => RunToken;
  /**
   * Runs `run` while `token` is current; answers whether it did (it was started, or held to start).
   * A token is forked once: a second fork of the same token from inside a start overwrites the held one.
   */
  readonly fork: (token: RunToken, run: Effect.Effect<void, unknown>) => boolean;
  /** Whether `token` names the run that is current now. */
  readonly isCurrent: (token: RunToken) => boolean;
  /** Supersedes the current run and starts nothing; does nothing visible when no run is live. */
  readonly stop: () => void;
  /** Whether the owning scope has closed. */
  readonly closed: () => boolean;
}

interface Held {
  readonly token: RunToken;
  readonly run: Effect.Effect<void, unknown>;
}

export const makeSupersedingRun = Effect.fn(function* (): Effect.fn.Return<SupersedingRun, never, Scope.Scope> {
  let current: RunToken | undefined;
  let isClosed = false;
  let starting = false;
  let held: Held | undefined;

  const handle = yield* FiberHandle.make<void>();
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      current = undefined;
      isClosed = true;
    }),
  );
  const install = yield* FiberHandle.runtime(handle)<never>();

  const isCurrent = (token: RunToken): boolean => token === current;

  const begin = (): RunToken => {
    const token: RunToken = { [tokenBrand]: true };
    if (!isClosed) current = token;
    return token;
  };

  // Installs `first`, then whatever a nested fork held meanwhile, until nothing is held.
  const drain = (first: Held): void => {
    starting = true;
    try {
      let next: Held | undefined = first;
      while (next !== undefined) {
        held = undefined;
        if (isCurrent(next.token)) install(next.run);
        next = held;
      }
    } finally {
      starting = false;
      held = undefined;
    }
  };

  const fork = (token: RunToken, run: Effect.Effect<void, unknown>): boolean => {
    if (!isCurrent(token)) return false;
    if (starting) {
      held = { token, run };
      return true;
    }
    drain({ token, run });
    return true;
  };

  return {
    begin,
    fork,
    isCurrent,
    stop: () => {
      fork(begin(), Effect.void);
    },
    closed: () => isClosed,
  };
});
