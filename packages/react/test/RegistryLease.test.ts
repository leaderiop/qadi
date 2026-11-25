/**
 * The lease that decides when a provider's registry is recycled, driven headless: no React,
 * no atoms, a counting `recycle` and a defer the test fires by hand.
 *
 * Every transition is followed by a further operation, so a mutated state is observed by
 * what the lease does next and not only by what it did. One test uses the default defer,
 * because an injected one never runs it.
 */
import { describe, expect, it } from "vitest";
import type { LeaseDefer } from "../src/RegistryLease.ts";
import { makeRegistryLease } from "../src/RegistryLease.ts";

/** A defer that really cancels: `cancel` removes exactly the run it was returned for. */
const fakeDefer = () => {
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
    const runs = pending;
    pending = [];
    for (const run of runs) run();
  };
  return { counts, defer, fire };
};

const counting = () => {
  const recycles = { count: 0 };
  return {
    recycles,
    recycle: (): void => {
      recycles.count += 1;
    },
  };
};

const afterMacrotask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));

describe("makeRegistryLease", () => {
  it("RL1 a hold, a release and a hold in one tick recycle nothing", () => {
    const { counts, defer, fire } = fakeDefer();
    const { recycle, recycles } = counting();
    const lease = makeRegistryLease(recycle, defer);

    lease.hold();
    lease.release();
    lease.hold();
    expect(counts).toEqual({ defers: 1, cancels: 1 });

    fire();
    expect(recycles.count).toBe(0);

    lease.release();
    fire();
    expect(counts.defers).toBe(2);
    expect(recycles.count).toBe(1);
  });

  it("RL2 a release recycles once when its deferred run fires", () => {
    const { defer, fire } = fakeDefer();
    const { recycle, recycles } = counting();
    const lease = makeRegistryLease(recycle, defer);

    lease.hold();
    lease.release();
    expect(recycles.count).toBe(0);
    fire();
    expect(recycles.count).toBe(1);

    fire();
    expect(recycles.count).toBe(1);

    lease.hold();
    lease.release();
    fire();
    expect(recycles.count).toBe(2);
  });

  it("RL3 a second release while one is pending defers nothing more", () => {
    const { counts, defer, fire } = fakeDefer();
    const { recycle, recycles } = counting();
    const lease = makeRegistryLease(recycle, defer);

    lease.hold();
    lease.release();
    lease.release();
    expect(counts.defers).toBe(1);

    fire();
    expect(recycles.count).toBe(1);
    fire();
    expect(recycles.count).toBe(1);
  });

  it("RL4 a release on a lease never held defers nothing", () => {
    const { counts, defer, fire } = fakeDefer();
    const { recycle, recycles } = counting();
    const lease = makeRegistryLease(recycle, defer);

    lease.release();
    fire();
    expect(counts).toEqual({ defers: 0, cancels: 0 });
    expect(recycles.count).toBe(0);

    lease.hold();
    lease.release();
    fire();
    expect(counts.defers).toBe(1);
    expect(recycles.count).toBe(1);
  });

  it("RL5 a hold while a release is pending cancels it exactly once", () => {
    const { counts, defer, fire } = fakeDefer();
    const { recycle, recycles } = counting();
    const lease = makeRegistryLease(recycle, defer);

    lease.hold();
    lease.release();
    lease.hold();
    lease.hold();
    expect(counts.cancels).toBe(1);
    fire();
    expect(recycles.count).toBe(0);

    lease.release();
    expect(counts.defers).toBe(2);
    fire();
    expect(recycles.count).toBe(1);
    expect(counts.cancels).toBe(1);
  });

  it("RL6 after a recycle the lease is unheld until it is held again", () => {
    const { counts, defer, fire } = fakeDefer();
    const { recycle, recycles } = counting();
    const lease = makeRegistryLease(recycle, defer);

    lease.hold();
    lease.release();
    fire();
    expect(recycles.count).toBe(1);

    lease.release();
    fire();
    expect(counts.defers).toBe(1);
    expect(recycles.count).toBe(1);

    lease.hold();
    expect(counts.cancels).toBe(0);

    lease.release();
    fire();
    expect(counts.defers).toBe(2);
    expect(recycles.count).toBe(2);
  });

  it("RL7 a recycle that throws leaves the lease usable", () => {
    const { counts, defer, fire } = fakeDefer();
    let calls = 0;
    const lease = makeRegistryLease(() => {
      calls += 1;
      if (calls === 1) throw new Error("recycle refused");
    }, defer);

    lease.hold();
    lease.release();
    expect(() => fire()).toThrow("recycle refused");
    expect(calls).toBe(1);

    lease.hold();
    expect(counts.cancels).toBe(0);

    lease.release();
    expect(counts.defers).toBe(2);
    fire();
    expect(calls).toBe(2);
  });

  it("RL8 a defer that throws leaves the lease held", () => {
    const inner = fakeDefer();
    const { recycle, recycles } = counting();
    let attempts = 0;
    const refusing: LeaseDefer = (run) => {
      attempts += 1;
      if (attempts === 1) throw new Error("defer refused");
      return inner.defer(run);
    };
    const lease = makeRegistryLease(recycle, refusing);

    lease.hold();
    expect(() => lease.release()).toThrow("defer refused");

    lease.hold();
    expect(inner.counts.cancels).toBe(0);

    lease.release();
    expect(inner.counts.defers).toBe(1);
    inner.fire();
    expect(recycles.count).toBe(1);
  });

  it("RL10 a hold after a second release still cancels the one pending recycle", () => {
    const { counts, defer, fire } = fakeDefer();
    const { recycle, recycles } = counting();
    const lease = makeRegistryLease(recycle, defer);

    lease.hold();
    lease.release();
    lease.release();
    lease.hold();
    expect(counts).toEqual({ defers: 1, cancels: 1 });
    fire();
    expect(recycles.count).toBe(0);

    lease.release();
    fire();
    expect(recycles.count).toBe(1);
  });

  it("RL9 the default defer recycles after a real macrotask and a hold before it cancels", async () => {
    const { recycle, recycles } = counting();
    const lease = makeRegistryLease(recycle);

    lease.hold();
    lease.release();
    expect(recycles.count).toBe(0);
    await afterMacrotask();
    expect(recycles.count).toBe(1);

    lease.hold();
    lease.release();
    lease.hold();
    await afterMacrotask();
    expect(recycles.count).toBe(1);

    lease.release();
    await afterMacrotask();
    expect(recycles.count).toBe(2);
  });
});
