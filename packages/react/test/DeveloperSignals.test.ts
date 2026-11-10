/**
 * Every developer signal's exact console sentence, and the rule that picks it.
 *
 * `stryker.react.mjs` does not mutate `DeveloperSignals.ts`, so this table is
 * what pins each arm of its `Match`: a reworded sentence, or an arm that says
 * another signal's words, fails here. Consumers grep these messages, so they are
 * compared whole rather than by substring.
 */
import {
  Allow,
  Deny,
  EvaluationServicesNone,
  hasRole,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  makeSubject,
  makeSubjectId,
} from "@qadi/core";
import type { Decision } from "@qadi/core";
import * as Context from "effect/Context";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { currentDecision } from "../src/DecisionOutcome.ts";
import { dehydrateDecisions, hydrateDecisions } from "../src/Hydration.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
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

        // Contained, so not the same function: what it is handed still reaches it.
        const heard: Array<unknown> = [];
        const mine = (value: unknown) => {
          heard.push(value);
        };
        const mismatch = { policy: hasRole("admin"), resource: undefined, seeded, decided };
        const drop = { reason: "MalformedEntry" as const, entries: [1], wholePayload: false };
        expect(
          said(() => {
            hydrationMismatchReporter(mine)?.(mismatch);
            gateIdCollisionReporter(mine)?.(":r1:");
            droppedEntriesReporter(mine)?.([1, 2]);
            hydrationDropReporter(mine)?.(drop);
          }),
        ).toEqual([]);
        expect(heard).toEqual([mismatch, ":r1:", [1, 2], drop]);
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

describe("a supplied reporter that throws (ReporterThrew, INT-04)", () => {
  afterEach(() => vi.restoreAllMocks());

  const threw = (reporter: string, error: string): string =>
    `[qadi] the ${reporter} reporter you supplied threw (${error}). The outcome it was told ` +
    "about stands — nothing was skipped, seeded differently or left uncounted. Fix the reporter.";

  const boom = (): never => {
    throw new TypeError("host boom");
  };

  /** Each resolver, handed a throwing hook, and called with a value naming another subject. */
  const resolvers: ReadonlyArray<{ readonly name: string; readonly call: (supplied: () => never) => void }> = [
    {
      name: "onHydrationMismatch",
      call: (supplied) =>
        hydrationMismatchReporter(supplied)?.({ policy: hasRole("admin"), resource: undefined, seeded, decided }),
    },
    { name: "onGateIdCollision", call: (supplied) => gateIdCollisionReporter(supplied)?.(":secret-u2:") },
    {
      name: "onDropped",
      call: (supplied) => droppedEntriesReporter(supplied)?.([{ subjectId: "secret-u2" }]),
    },
    {
      name: "onDropped",
      call: (supplied) =>
        hydrationDropReporter(supplied)?.({
          reason: "PayloadSubjectMismatch",
          entries: [{ subjectId: "secret-u2" }],
          wholePayload: true,
        }),
    },
    {
      name: "onDeveloperSignal",
      call: (supplied) => providerSignalReporter(supplied)(providerSignals.atomsReplaced()),
    },
  ];

  for (const environment of ["development", "production"] as const) {
    describe(`in ${environment}`, () => {
      const inEnvironment = <A,>(act: () => A): A => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = environment;
        try {
          return act();
        } finally {
          process.env.NODE_ENV = previous;
        }
      };

      for (const { name, call } of resolvers) {
        it(`${name}: the throw does not propagate and ReporterThrew names the hook and the error only`, () => {
          const lines = inEnvironment(() => said(() => call(boom)));
          expect(lines).toEqual([threw(name, "TypeError: host boom")]);
          for (const line of lines) {
            expect(line).not.toContain("secret-u2");
            expect(line).not.toContain("HasRole");
          }
        });
      }

      it("a thrown non-Error is named by its string form", () => {
        const lines = inEnvironment(() =>
          said(() =>
            gateIdCollisionReporter(() => {
              // oxlint-disable-next-line no-throw-literal
              throw "plain string";
            })?.(":r1:"),
          ),
        );
        expect(lines).toEqual([threw("onGateIdCollision", "plain string")]);
      });

      it("a throwing onHydrationMismatch on makeQadiAtoms still settles the re-check and counts it", () => {
        const registry = Context.empty();
        const alice = makeSubject({ id: "u1" });
        const isAdmin = hasRole("admin");
        // The server allowed; this client holds nothing, so it denies: a disagreement.
        const payload = dehydrateDecisions([
          {
            policy: isAdmin,
            decision: new Allow({
              evaluationId: "e1",
              subjectId: makeSubjectId("u1"),
              durationMillis: 1,
              trace: { policyTag: "HasRole", allowed: true, children: [], visibleFields: undefined, obligations: [] },
            }),
          },
        ]);
        const atoms = makeQadiAtoms(EvaluationServicesNone, { onHydrationMismatch: boom });
        const rechecks = () => hydrationRechecksTotal.valueUnsafe(registry).count;
        const mismatches = () => hydrationMismatchesTotal.valueUnsafe(registry).count;

        inEnvironment(() => {
          const before = { rechecks: rechecks(), mismatches: mismatches() };
          let settled: ReturnType<typeof currentDecision> = undefined;
          const lines = said(() => {
            const store = AtomRegistry.make({
              initialValues: [[atoms.subject, alice] as const, ...hydrateDecisions(atoms, payload, alice)],
            });
            settled = currentDecision(store.get(atoms.decision(isAdmin)));
            store.dispose();
          });
          expect(settled).toBeInstanceOf(Deny);
          expect(rechecks() - before.rechecks).toBe(1);
          expect(mismatches() - before.mismatches).toBe(1);
          expect(lines).toEqual([threw("onHydrationMismatch", "TypeError: host boom")]);
        });
      });
    });
  }
});
