/**
 * Decides when a provider's registry is recycled: one macrotask after the last
 * release, unless it is held again first.
 *
 * React runs an effect's cleanup on a StrictMode double effect, on every hide of an
 * `<Activity>` and on unmount, and gives no sign which. The provider holds the lease
 * in its effect and releases it in the cleanup; this module decides whether a release
 * was the last. It never touches the registry or the sweep (ADR-QD-148): the caller's
 * `recycle` does, and a recycle runs at most once per release however many cleanups
 * ran. The decision is ADR-QD-195.
 *
 * Out of the barrel (AGENTS.md §9): `QadiProvider.tsx` is its one caller, and the
 * package's own tests reach it directly.
 */
import * as Match from "effect/Match";

/**
 * How a lease defers a recycle: runs `run` later and returns the function that
 * cancels it. Tests pass one that records both.
 */
export type LeaseDefer = (run: () => void) => () => void;

export interface RegistryLease {
  /** A mount or a reveal: cancels a pending recycle, and does nothing when none is pending. */
  readonly hold: () => void;
  /** A cleanup: defers one recycle, and does nothing when one is pending or none is held. */
  readonly release: () => void;
}

type Unheld = { readonly _tag: "Unheld" };
type Held = { readonly _tag: "Held" };
type Releasing = { readonly _tag: "Releasing"; readonly cancel: () => void };
type LeaseState = Unheld | Held | Releasing;

const timeoutDefer: LeaseDefer = (run) => {
  const handle = setTimeout(run, 0);
  return () => {
    clearTimeout(handle);
  };
};

/**
 * Builds a lease over `recycle`.
 *
 * `cancel` is the only cancellation: a fired run sets the lease unheld before it
 * calls `recycle`, so a throwing recycle leaves the lease usable, and a `defer`
 * that throws leaves it held, because the state is assigned only once `defer`
 * has returned. The two matchers are built once per lease, inside this function
 * and not at module scope, so each arm is a mutant the mutation run judges.
 */
export const makeRegistryLease = (
  recycle: () => void,
  defer: LeaseDefer = timeoutDefer,
): RegistryLease => {
  let state: LeaseState = { _tag: "Unheld" };
  const fire = (): void => {
    state = { _tag: "Unheld" };
    recycle();
  };
  const afterHold = Match.type<LeaseState>().pipe(
    Match.tagsExhaustive({
      Unheld: (): LeaseState => ({ _tag: "Held" }),
      Held: (held): LeaseState => held,
      Releasing: (releasing): LeaseState => {
        releasing.cancel();
        return { _tag: "Held" };
      },
    }),
  );
  const afterRelease = Match.type<LeaseState>().pipe(
    Match.tagsExhaustive({
      Unheld: (unheld): LeaseState => unheld,
      Held: (): LeaseState => ({ _tag: "Releasing", cancel: defer(fire) }),
      Releasing: (releasing): LeaseState => releasing,
    }),
  );
  return {
    hold: () => {
      state = afterHold(state);
    },
    release: () => {
      state = afterRelease(state);
    },
  };
};
