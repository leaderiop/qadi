/**
 * Every developer signal's exact console sentence, and the rule that picks it.
 *
 * `stryker.react.mjs` does not mutate `DeveloperSignals.ts`, so this table is
 * what pins each arm of its `Match`: a reworded sentence, or an arm that says
 * another signal's words, fails here. Consumers grep these messages, so they are
 * compared whole rather than by substring.
 */
import { Deny, hasRole, makeSubjectId } from "@qadi/core";
import type { Decision } from "@qadi/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  droppedEntriesReporter,
  gateIdCollisionReporter,
  hydrationDropReporter,
  hydrationMismatchReporter,
  providerSignalReporter,
  providerSignals,
} from "../src/DeveloperSignals.ts";
import { SeededAllow } from "../src/SeededDecision.ts";

const decided: Decision = new Deny({
  evaluationId: "eval-1",
  subjectId: makeSubjectId("u1"),
  durationMillis: 1,
  trace: {
    policyTag: "HasRole",
    allowed: false,
    reason: "subject lacks role 'admin'",
    children: [],
    obligations: [],
  },
});

const seeded = new SeededAllow({
  evaluationId: "eval-0",
  subjectId: makeSubjectId("u1"),
  durationMillis: 1,
  visibleFields: undefined,
  obligations: [],
  disclosure: { _tag: "Withheld" },
});

const said = (act: () => void): ReadonlyArray<string> => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    act();
    return warn.mock.calls.map((call) => String(call[0]));
  } finally {
    warn.mockRestore();
  }
};

const useProduction = () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  return () => {
    process.env.NODE_ENV = previous;
  };
};

describe("DeveloperSignals", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("the sentence each signal says by default", () => {
    it("SeedSuperseded", () => {
      expect(
        said(() => hydrationMismatchReporter(undefined)?.({ policy: hasRole("admin"), resource: undefined, seeded, decided })),
      ).toEqual([
        "[qadi] hydration mismatch for HasRole: the server allowed, this client denied — " +
          "subject lacks role 'admin'. This client's answer is the one in effect.",
      ]);
    });

    it("GateIdCollision", () => {
      expect(said(() => gateIdCollisionReporter(undefined)?.(":r1:"))).toEqual([
        '[qadi] two React roots minted the gate id ":r1:" for one gate registry. ' +
          "Both guards are kept, the second under a disambiguated panel id. Give each " +
          "root a distinct `identifierPrefix` in its hydrateRoot/createRoot options " +
          "to fix the cause.",
      ]);
    });

    it("PayloadMixedSubjects", () => {
      expect(said(() => droppedEntriesReporter(undefined)?.([1, 2]))).toEqual([
        "[qadi] dehydrateDecisions dropped 2 decision(s) belonging to a different subject " +
          "than the payload's. A payload mixing subjects has no safe reading, so the " +
          "others were discarded — check what fed this call.",
      ]);
    });

    it("HydrationDropped, entry by entry", () => {
      expect(
        said(() =>
          hydrationDropReporter(undefined)?.({
            reason: "UndecodablePolicy",
            entries: [1],
            wholePayload: false,
          }),
        ),
      ).toEqual([
        "[qadi] hydrateDecisions did not seed 1 decision(s): their policies did not decode. " +
          "The usual cause is version skew: the server encoded a policy shape this client's " +
          "schema does not know. Those questions will be asked again from scratch.",
      ]);
    });

    it("HydrationDropped, the payload whole", () => {
      expect(
        said(() =>
          hydrationDropReporter(undefined)?.({
            reason: "UnsupportedPayloadVersion",
            entries: [],
            wholePayload: true,
          }),
        ),
      ).toEqual([
        "[qadi] hydrateDecisions refused the payload (0 decision(s) in it): the payload's " +
          "version is one this client does not read. A page cached by one deploy and hydrated " +
          "by the next does this for as long as the deploy takes; if it persists, the server " +
          "and the client are running different @qadi/react releases. Those questions will be " +
          "asked again from scratch.",
      ]);
    });

    it("InstrumentedInProduction", () => {
      const restore = useProduction();
      try {
        expect(
          said(() => providerSignalReporter(undefined)(providerSignals.instrumentedInProduction())),
        ).toEqual([
          "[qadi] <QadiProvider instrument> is true outside development. This is a debug " +
            "affordance: it registers every guarded control's policy, resource and verdict " +
            "for @qadi/devtools, readable by any script on the page. Pass instrument only in " +
            "development, or gate it the way you gate the devtools dock itself.",
        ]);
        // Once per process: the second is the same signal, not a new one.
        expect(
          said(() => providerSignalReporter(undefined)(providerSignals.instrumentedInProduction())),
        ).toEqual([]);
      } finally {
        restore();
      }
    });

    it("AtomsReplaced", () => {
      expect(said(() => providerSignalReporter(undefined)(providerSignals.atomsReplaced()))).toEqual([
        "[qadi] <QadiProvider>'s `atoms` prop changed identity after mount. " +
          "makeQadiAtoms() must be called once per context, at module scope " +
          "(or memoised) — this provider's registry is not rebuilt for a new " +
          "atom set, so the new atoms' initial values are silently ignored and " +
          "decisions from the previous atom set keep answering until this " +
          "provider unmounts.",
      ]);
    });

    it("UnwritableGateRegistry", () => {
      expect(
        said(() => providerSignalReporter(undefined)(providerSignals.unwritableGateRegistry())),
      ).toEqual([
        "[qadi] <QadiProvider>'s `gates` was not built by makeGateRegistry(); " +
          "guards under this provider will not register.",
      ]);
    });
  });

  describe("when the default speaks", () => {
    it("the four hydration defaults are absent in production, and a supplied reporter replaces them", () => {
      const restore = useProduction();
      try {
        expect(hydrationMismatchReporter(undefined)).toBeUndefined();
        expect(gateIdCollisionReporter(undefined)).toBeUndefined();
        expect(droppedEntriesReporter(undefined)).toBeUndefined();
        expect(hydrationDropReporter(undefined)).toBeUndefined();

        const mine = () => {};
        expect(hydrationMismatchReporter(mine)).toBe(mine);
        expect(gateIdCollisionReporter(mine)).toBe(mine);
        expect(droppedEntriesReporter(mine)).toBe(mine);
        expect(hydrationDropReporter(mine)).toBe(mine);
      } finally {
        restore();
      }
    });

    it("the two development-only provider signals are silent in production", () => {
      const restore = useProduction();
      try {
        expect(
          said(() => {
            providerSignalReporter(undefined)(providerSignals.atomsReplaced());
            providerSignalReporter(undefined)(providerSignals.unwritableGateRegistry());
          }),
        ).toEqual([]);
      } finally {
        restore();
      }
    });

    it("a supplied provider reporter replaces the default and hears every signal", () => {
      const seen: Array<string> = [];
      const mine = providerSignalReporter((signal) => seen.push(signal._tag));
      expect(
        said(() => {
          mine(providerSignals.instrumentedInProduction());
          mine(providerSignals.atomsReplaced());
          mine(providerSignals.unwritableGateRegistry());
        }),
      ).toEqual([]);
      expect(seen).toEqual(["InstrumentedInProduction", "AtomsReplaced", "UnwritableGateRegistry"]);
    });
  });
});
