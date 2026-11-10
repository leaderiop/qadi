/**
 * The hydration event table, one arm at a time.
 *
 * `HydrationEvent.ts` is the one place an exit from `dehydrateDecisions` or
 * `hydrateDecisions` becomes a count and a report, so each tag's arm is pinned
 * here at its own interface: the exact deltas on all five metrics and the exact
 * argument its hook receives. No codec is involved.
 *
 * Every count is a **delta**: the writer is off fiber and always updates the
 * default registry, which a test cannot scope.
 */
import {
  Deny,
  hasRole,
  hydrationDehydratedTotal,
  hydrationDropReasons,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
  makeSubjectId,
} from "@qadi/core";
import type { HydrationDropReason } from "@qadi/core";
import * as Context from "effect/Context";
import { describe, expect, it } from "vitest";
import type { HydrationDrop, HydrationMismatch } from "../src/DeveloperSignals.ts";
import type { DecisionEntry } from "../src/HydrationEvent.ts";
import { HydrationEvent, emitHydration } from "../src/HydrationEvent.ts";
import { SeededAllow } from "../src/SeededDecision.ts";

const registry = Context.empty();

/** Every metric, as one comparable snapshot. */
const snapshot = () => ({
  dehydrated: hydrationDehydratedTotal.valueUnsafe(registry).count,
  seeded: hydrationSeededTotal.valueUnsafe(registry).count,
  rechecks: hydrationRechecksTotal.valueUnsafe(registry).count,
  mismatches: hydrationMismatchesTotal.valueUnsafe(registry).count,
  dropped: new Map(
    hydrationDropReasons.map((reason) => [
      reason,
      hydrationDroppedTotal.valueUnsafe(registry).occurrences.get(reason) ?? 0,
    ]),
  ),
});

interface Delta {
  readonly dehydrated: number;
  readonly seeded: number;
  readonly rechecks: number;
  readonly mismatches: number;
  readonly dropped: ReadonlyMap<HydrationDropReason, number>;
}

/** What `act` moved, across all five metrics; a drop key appears only if it moved. */
const moved = (act: () => void): Delta => {
  const before = snapshot();
  act();
  const after = snapshot();
  return {
    dehydrated: after.dehydrated - before.dehydrated,
    seeded: after.seeded - before.seeded,
    rechecks: after.rechecks - before.rechecks,
    mismatches: after.mismatches - before.mismatches,
    dropped: new Map(
      hydrationDropReasons
        .map((reason): readonly [HydrationDropReason, number] => [
          reason,
          (after.dropped.get(reason) ?? 0) - (before.dropped.get(reason) ?? 0),
        ])
        .filter(([, n]) => n !== 0),
    ),
  };
};

/** A delta that is zero everywhere but where named. */
const only = (delta: Partial<Omit<Delta, "dropped">> & { readonly dropped?: ReadonlyArray<readonly [HydrationDropReason, number]> }): Delta => ({
  dehydrated: delta.dehydrated ?? 0,
  seeded: delta.seeded ?? 0,
  rechecks: delta.rechecks ?? 0,
  mismatches: delta.mismatches ?? 0,
  dropped: new Map(delta.dropped ?? []),
});

const entry = (subject: string): DecisionEntry => ({
  policy: hasRole("admin"),
  decision: new Deny({
    evaluationId: `e-${subject}`,
    subjectId: makeSubjectId(subject),
    durationMillis: 1,
    trace: { policyTag: "HasRole", allowed: false, reason: "no", children: [], obligations: [] },
  }),
});

const mismatch: HydrationMismatch = {
  policy: hasRole("admin"),
  resource: undefined,
  seeded: new SeededAllow({
    evaluationId: "e0",
    subjectId: makeSubjectId("u1"),
    durationMillis: 1,
    visibleFields: undefined,
    obligations: [],
    disclosure: { _tag: "Withheld" },
  }),
  decided: entry("u1").decision,
};

/** Hooks that record everything they hear, by kind. */
const recording = () => {
  const leftOut: Array<ReadonlyArray<DecisionEntry>> = [];
  const dropped: Array<HydrationDrop<unknown>> = [];
  const mismatches: Array<HydrationMismatch> = [];
  return {
    heard: { leftOut, dropped, mismatches },
    hooks: {
      leftOut: (entries: ReadonlyArray<DecisionEntry>) => leftOut.push(entries),
      dropped: (drop: HydrationDrop<unknown>) => dropped.push(drop),
      mismatch: (m: HydrationMismatch) => mismatches.push(m),
    },
  };
};

const silent = { leftOut: [], dropped: [], mismatches: [] };

describe("HydrationEvent", () => {
  describe("Dehydrated", () => {
    it("moves the dehydrated counter by its count and nothing else, and announces nothing", () => {
      const { heard, hooks } = recording();
      expect(moved(() => emitHydration(HydrationEvent.Dehydrated({ count: 3 }), hooks))).toEqual(
        only({ dehydrated: 3 }),
      );
      expect(heard).toEqual(silent);
    });
  });

  describe("LeftOut", () => {
    it("counts each entry against its reason and hands the leftOut hook the entries", () => {
      const entries = [entry("u2"), entry("u3")];
      const { heard, hooks } = recording();
      expect(
        moved(() => emitHydration(HydrationEvent.LeftOut({ reason: "ForeignSubject", entries }), hooks)),
      ).toEqual(only({ dropped: [["ForeignSubject", 2]] }));
      expect(heard).toEqual({ ...silent, leftOut: [entries] });
    });
  });

  describe("PayloadRefused", () => {
    it("counts a refusal carrying nothing as one, and tells the hook the payload was refused whole", () => {
      const { heard, hooks } = recording();
      expect(
        moved(() =>
          emitHydration(HydrationEvent.PayloadRefused({ reason: "PayloadSubjectMismatch", entries: [] }), hooks),
        ),
      ).toEqual(only({ dropped: [["PayloadSubjectMismatch", 1]] }));
      expect(heard).toEqual({
        ...silent,
        dropped: [{ reason: "PayloadSubjectMismatch", entries: [], wholePayload: true }],
      });
    });

    it("counts every entry it carried when it carried more than one", () => {
      expect(
        moved(() => emitHydration(HydrationEvent.PayloadRefused({ reason: "MalformedPayload", entries: [1, 2, 3] }), {})),
      ).toEqual(only({ dropped: [["MalformedPayload", 3]] }));
    });

    it("counts a refused version against its own key", () => {
      expect(
        moved(() =>
          emitHydration(HydrationEvent.PayloadRefused({ reason: "UnsupportedPayloadVersion", entries: [1] }), {}),
        ),
      ).toEqual(only({ dropped: [["UnsupportedPayloadVersion", 1]] }));
    });
  });

  describe("EntriesDropped", () => {
    it("counts exactly the entries given, and tells the hook it was not the whole payload", () => {
      const { heard, hooks } = recording();
      expect(
        moved(() =>
          emitHydration(HydrationEvent.EntriesDropped({ reason: "UndecodablePolicy", entries: ["a", "b"] }), hooks),
        ),
      ).toEqual(only({ dropped: [["UndecodablePolicy", 2]] }));
      expect(heard).toEqual({
        ...silent,
        dropped: [{ reason: "UndecodablePolicy", entries: ["a", "b"], wholePayload: false }],
      });
    });

    it("counts nothing for no entries", () => {
      expect(
        moved(() => emitHydration(HydrationEvent.EntriesDropped({ reason: "EntryTooDeep", entries: [] }), {})),
      ).toEqual(only({}));
    });

    it("counts the other two entry reasons against their own keys", () => {
      expect(
        moved(() => emitHydration(HydrationEvent.EntriesDropped({ reason: "EntryTooDeep", entries: [1] }), {})),
      ).toEqual(only({ dropped: [["EntryTooDeep", 1]] }));
      expect(
        moved(() => emitHydration(HydrationEvent.EntriesDropped({ reason: "MalformedEntry", entries: [1] }), {})),
      ).toEqual(only({ dropped: [["MalformedEntry", 1]] }));
    });
  });

  describe("Seeded", () => {
    it("moves the seeded counter by its count and nothing else, and announces nothing", () => {
      const { heard, hooks } = recording();
      expect(moved(() => emitHydration(HydrationEvent.Seeded({ count: 2 }), hooks))).toEqual(only({ seeded: 2 }));
      expect(heard).toEqual(silent);
    });
  });

  describe("Rechecked", () => {
    it("moves the re-check counter alone for an agreement, and calls no hook", () => {
      const { heard, hooks } = recording();
      expect(moved(() => emitHydration(HydrationEvent.Rechecked({ mismatch: undefined }), hooks))).toEqual(
        only({ rechecks: 1 }),
      );
      expect(heard).toEqual(silent);
    });

    it("moves both counters for a disagreement and tells the mismatch hook once", () => {
      const { heard, hooks } = recording();
      expect(moved(() => emitHydration(HydrationEvent.Rechecked({ mismatch }), hooks))).toEqual(
        only({ rechecks: 1, mismatches: 1 }),
      );
      expect(heard).toEqual({ ...silent, mismatches: [mismatch] });
    });
  });

  describe("order and absence", () => {
    it("counts before it announces", () => {
      const read = () => hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("UndecodablePolicy") ?? 0;
      const before = read();
      let seenByHook = -1;
      emitHydration(HydrationEvent.EntriesDropped({ reason: "UndecodablePolicy", entries: [1] }), {
        dropped: () => {
          seenByHook = read() - before;
        },
      });
      expect(seenByHook).toBe(1);
    });

    it("an event with no hook still counts", () => {
      expect(
        moved(() => emitHydration(HydrationEvent.PayloadRefused({ reason: "MalformedPayload", entries: [] }), {})),
      ).toEqual(only({ dropped: [["MalformedPayload", 1]] }));
      expect(moved(() => emitHydration(HydrationEvent.Rechecked({ mismatch }), {}))).toEqual(
        only({ rechecks: 1, mismatches: 1 }),
      );
    });
  });
});
