/**
 * A defer for a lease that really cancels and runs only when a test fires it by hand.
 *
 * The lease's own test builds the same helper inline; that file is held byte for byte, so
 * the helper is copied here for the suites that drive an owner over a lease.
 * `counts` says how often a recycle was deferred and how often one was cancelled, and
 * `fire` runs every run pending when it is called, in the order deferred, and skips one
 * that an earlier run in the same batch cancelled.
 */
import type { LeaseDefer } from "../../src/RegistryLease.ts";

export interface RecordingDefer {
  readonly counts: { defers: number; cancels: number };
  readonly defer: LeaseDefer;
  readonly fire: () => void;
}

/** A defer that really cancels: `cancel` removes exactly the run it was returned for. */
export const makeRecordingDefer = (): RecordingDefer => {
  let pending: Array<() => void> = [];
  const counts = { defers: 0, cancels: 0 };
  const defer: LeaseDefer = (run) => {
    counts.defers += 1;
    pending.push(run);
    return () => {
      counts.cancels += 1;
      pending = pending.filter((queued) => queued !== run);
    };
  };
  const fire = (): void => {
    for (const run of pending) {
      if (!pending.includes(run)) continue;
      pending = pending.filter((queued) => queued !== run);
      run();
    }
  };
  return { counts, defer, fire };
};
