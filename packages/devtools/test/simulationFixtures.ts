/**
 * The helpers the simulation session's tests share.
 *
 * Read by `SimulationSession.test.ts`, `SimulationSession.runs.test.ts`,
 * `SimulationSession.characterisation.test.ts`, `SeededChoice.test.ts`,
 * `react/Simulator.test.tsx` and `react/useSimulationSession.test.tsx`, so a
 * sighting, a timeline entry, two logged rows and the form a replay fills in, the
 * policy and menu projections a row compares, a slow resolver and the commands that
 * drive a run are one definition rather than a copy a file keeps beside its own
 * tests. A helper is here when two or more of those files read it, or when one does
 * and another helper here calls it; `KEYS`, read only by `seededOf`, is not exported.
 * Tests of other modules read the same helpers rather than keep a copy:
 * `ExplorerSessionRefusal.test.ts` reads `sighting`, `Replay.test.ts` and
 * `react/DecisionLog.test.tsx` read `entryOf`, and `DockModel.test.ts` reads `slow`.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { AttributeResolver, hasPermission, portsLayer } from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel } from "../src/model/Catalogue.ts";
import type { PolicySighting } from "../src/model/Catalogue.ts";
import type { PolicyChoice, PolicyMenu } from "../src/model/SeededChoice.ts";
import type { SimulationField } from "../src/model/SimulationFields.ts";
import type { SimulationInput } from "../src/model/SimulationInput.ts";
import type { SimulationSession } from "../src/model/SimulationSession.ts";
import { emptyTimeline, ingestAll } from "../src/model/Timeline.ts";
import type { TimelineEntry } from "../src/model/Timeline.ts";
import { decisionRecord, obligationRecord, read } from "./helpers.ts";

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

// Two logged rows, the form a replay of one fills in, and a policy choice and a menu
// as a row compares them.

/** The seven fields a replayed row leaves for the reviewer, in the form's order. */
const KEYS: ReadonlyArray<SimulationField> = [
  "roles",
  "permissions",
  "subjectAttributes",
  "attributes",
  "relationships",
  "history",
  "signatures",
];

export const rowRead = entryOf(
  decisionRecord({
    evaluationId: "ev-read",
    policy: hasPermission(read),
    subjectId: "carol",
    action: "read",
    resource: { id: "doc-1" },
  }),
);

export const orphan = entryOf(obligationRecord({ evaluationId: "ev-orphan" }));

/** The form a replay of `rowRead` fills in. */
export const carolDraft: SimulationInput = {
  subject: { id: "carol" },
  action: "read",
  resource: { id: "doc-1" },
};

export type PolicyView =
  | Exclude<PolicyChoice, { readonly _tag: "Seeded" }>
  | {
      readonly _tag: "Seeded";
      readonly entry: TimelineEntry;
      readonly policy: Policy;
      readonly unseeded: ReadonlyArray<SimulationField>;
    };

export const policyView = (choice: PolicyChoice): PolicyView =>
  choice._tag === "Seeded"
    ? {
        _tag: "Seeded",
        entry: choice.entry,
        policy: choice.policy,
        unseeded: choice.unseeded.map((u) => u.key),
      }
    : choice;

export const listed = (value: PolicySighting, index: number): PolicyView => ({
  _tag: "Listed",
  value,
  index,
});

export const evictedOf = (value: PolicySighting): PolicyView =>
  ({ _tag: "Evicted", value });

export const seededOf = (row: TimelineEntry, policy: Policy): PolicyView => ({
  _tag: "Seeded",
  entry: row,
  policy,
  unseeded: KEYS,
});

export const zero = (policy: Policy): PolicySighting => ({
  policy,
  label: policyLabel(policy),
  count: 0,
  allows: 0,
  denies: 0,
  errors: 0,
  lastAt: undefined,
});

export const menu = (
  options: ReadonlyArray<readonly [string, string]>,
  selected: string,
): PolicyMenu => ({
  options: options.map(([value, label]) => ({ value, label })),
  selected,
});

export const seededEntry: readonly [string, string] =
  ["seeded", "from the replayed row"];

export const evictedEntry = (sighting: PolicySighting): readonly [string, string] => [
  "evicted",
  `${sighting.label} — no longer in the log`,
];

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
