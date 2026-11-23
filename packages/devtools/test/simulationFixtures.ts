/**
 * The helpers the simulation session's tests share.
 *
 * Read by `SimulationSession.test.ts`, `SimulationSession.runs.test.ts` and
 * `SimulationSession.characterisation.test.ts`, so a sighting, a timeline entry, a
 * slow resolver and the commands that drive a run are one definition rather than a
 * copy a file keeps beside its own tests.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { AttributeResolver, portsLayer } from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel } from "../src/model/Catalogue.ts";
import type { PolicySighting } from "../src/model/Catalogue.ts";
import type { SimulationSession } from "../src/model/SimulationSession.ts";
import { emptyTimeline, ingestAll } from "../src/model/Timeline.ts";
import type { TimelineEntry } from "../src/model/Timeline.ts";

export const sighting = (policy: Policy): PolicySighting => ({
  policy,
  label: policyLabel(policy),
  count: 1,
  allows: 1,
  denies: 0,
  errors: 0,
  lastAt: 100,
});

export const entryOf = (
  record: Parameters<typeof ingestAll>[1][number],
): TimelineEntry => {
  const [entry] = ingestAll(emptyTimeline(), [record]).entries;
  if (entry === undefined) throw new Error("expected an entry");
  return entry;
};

/** A resolver that takes a second, and counts how it ended. No error is constructed. */
export const slow = () => {
  const tally = { started: 0, finished: 0, interrupted: 0 };
  const ports = portsLayer({
    AttributeResolver: Layer.succeed(AttributeResolver, {
      name: "slow",
      resolve: () =>
        Effect.sync(() => {
          tally.started += 1;
        }).pipe(
          Effect.andThen(Effect.sleep("1 second")),
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              tally.interrupted += 1;
            }),
          ),
          Effect.andThen(
            Effect.sync(() => {
              tally.finished += 1;
              return 9;
            }),
          ),
        ),
    }),
  });
  return { tally, ports };
};

export const counted = (session: SimulationSession) => {
  const seen = { notified: 0 };
  session.subscribe(() => {
    seen.notified += 1;
  });
  return seen;
};

// The helpers below drive the scoped interface (ARCH-73, ADR-QD-137): `run` is a
// command that forks into the session's own handle, so a test starts one and then
// waits on the snapshot rather than joining a fiber it was handed.

/** Starts a run, and lets its program reach the sleeping port. */
export const startRun = (session: SimulationSession, kind: "Run" | "Sweep" = "Run") =>
  Effect.gen(function* () {
    session.run(kind);
    yield* TestClock.adjust("10 millis");
  });

/**
 * Resumes once no run is in flight: at once when none is, else on the notification
 * that ends it.
 */
export const settled = (session: SimulationSession) =>
  Effect.callback<void>((resume) => {
    const idle = () => session.getSnapshot().run._tag !== "Running";
    if (idle()) {
      resume(Effect.void);
      return;
    }
    const off = session.subscribe(() => {
      if (!idle()) return;
      off();
      resume(Effect.void);
    });
    return Effect.sync(off);
  });

/** One run or sweep, waited for. */
export const ran = (session: SimulationSession, kind: "Run" | "Sweep" = "Run") =>
  Effect.suspend(() => {
    session.run(kind);
    return settled(session);
  });
