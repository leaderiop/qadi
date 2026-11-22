/**
 * Every developer signal's exact console sentence, the condition each default speaks
 * under, and the facts the signal table states about where, how often and through which
 * option each entry point resolves a reporter.
 *
 * This file is what pins each arm of `DeveloperSignals.ts`'s `Match` and each literal of
 * its table: a reworded sentence, an arm that says another signal's words, or a table row
 * that says something else fails here. Consumers grep these messages, so they are
 * compared whole rather than by substring.
 */
import { Deny, hasRole, makeSubjectId } from "@qadi/core";
import type { Decision } from "@qadi/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SignalTag } from "../src/DeveloperSignals.ts";
import {
  holdsHere,
  providerSignalReporter,
  providerSignals,
  reporterFor,
  SIGNALS,
} from "../src/DeveloperSignals.ts";
import { SeededAllow } from "../src/SeededDecision.ts";
import { hostile, hostileError } from "./support/hostile.ts";
import { threw } from "./support/reporterThrew.ts";

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

type Environment = "development" | "production";

const environments: ReadonlyArray<Environment> = ["development", "production"];

const withEnvironment = <A,>(environment: Environment, act: () => A): A => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = environment;
  try {
    return act();
  } finally {
    process.env.NODE_ENV = previous;
  }
};

const useProduction = () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  return () => {
    process.env.NODE_ENV = previous;
  };
};

const boom = (): never => {
  throw new TypeError("host boom");
};

/** One entry point of one row: its reporter option, and a call carrying another subject's data. */
interface EntryPoint {
  readonly row: SignalTag;
  readonly entry: string;
  readonly option: string;
  readonly call: (supplied: () => never) => void;
}

/** Every (row, entry point) pair the table states, each handed a throwing hook. */
const entryPoints: ReadonlyArray<EntryPoint> = [
  {
    row: "SeedSuperseded",
    entry: "makeQadiAtoms",
    option: "onHydrationMismatch",
    call: (supplied) =>
      reporterFor(SIGNALS.SeedSuperseded, "makeQadiAtoms", supplied)?.({
        policy: hasRole("admin"),
        resource: undefined,
        seeded,
        decided,
      }),
  },
  {
    row: "GateIdCollision",
    entry: "makeQadiAtoms",
    option: "onGateIdCollision",
    call: (supplied) =>
      reporterFor(SIGNALS.GateIdCollision, "makeQadiAtoms", supplied)?.(":secret-u2:"),
  },
  {
    row: "GateIdCollision",
    entry: "makeGateRegistry",
    option: "onIdCollision",
    call: (supplied) =>
      reporterFor(SIGNALS.GateIdCollision, "makeGateRegistry", supplied)?.(":secret-u2:"),
  },
  {
    row: "DehydrationDropped",
    entry: "dehydrateDecisions",
    option: "onDropped",
    call: (supplied) =>
      reporterFor(SIGNALS.DehydrationDropped, "dehydrateDecisions", supplied)?.({
        reason: "ForeignSubject",
        entries: [{ subjectId: "secret-u2" }],
        wholePayload: false,
      }),
  },
  {
    row: "HydrationDropped",
    entry: "hydrateDecisions",
    option: "onDropped",
    call: (supplied) =>
      reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", supplied)?.({
        reason: "PayloadSubjectMismatch",
        entries: [{ subjectId: "secret-u2" }],
        wholePayload: true,
      }),
  },
  {
    row: "InstrumentedInProduction",
    entry: "QadiProvider",
    option: "onDeveloperSignal",
    call: (supplied) =>
      providerSignalReporter(supplied)(providerSignals.instrumentedInProduction()),
  },
  {
    row: "AtomsReplaced",
    entry: "QadiProvider",
    option: "onDeveloperSignal",
    call: (supplied) => providerSignalReporter(supplied)(providerSignals.atomsReplaced()),
  },
  {
    row: "UnwritableGateRegistry",
    entry: "QadiProvider",
    option: "onDeveloperSignal",
    call: (supplied) => providerSignalReporter(supplied)(providerSignals.unwritableGateRegistry()),
  },
];

const providerEntry = { QadiProvider: { option: "onDeveloperSignal", resolved: "OnEveryReport" } };

/**
 * A second, independent statement of the table, so a row changed without review fails here.
 *
 * It is a change detector, and `resolved` shows its limit: no code reads that field, so
 * this compares it and proves nothing about when a reporter is resolved. That timing is
 * pinned by the "when each reporter is resolved" tests in `DeveloperSignalReporters.test.tsx`.
 */
const writtenOutTable: Record<
  SignalTag,
  {
    readonly speaks: string;
    readonly often: string;
    readonly entries: Record<string, { readonly option: string; readonly resolved: string }>;
  }
> = {
  SeedSuperseded: {
    speaks: "Development",
    often: "PerEvent",
    entries: { makeQadiAtoms: { option: "onHydrationMismatch", resolved: "OncePerAtomSet" } },
  },
  GateIdCollision: {
    speaks: "Development",
    often: "PerEvent",
    entries: {
      makeQadiAtoms: { option: "onGateIdCollision", resolved: "OncePerAtomSet" },
      makeGateRegistry: { option: "onIdCollision", resolved: "OncePerRegistry" },
    },
  },
  DehydrationDropped: {
    speaks: "Development",
    often: "PerEvent",
    entries: { dehydrateDecisions: { option: "onDropped", resolved: "OncePerCall" } },
  },
  HydrationDropped: {
    speaks: "Development",
    often: "PerEvent",
    entries: { hydrateDecisions: { option: "onDropped", resolved: "OncePerCall" } },
  },
  ReporterThrew: { speaks: "Everywhere", often: "PerEvent", entries: {} },
  InstrumentedInProduction: {
    speaks: "Production",
    often: "OncePerProcess",
    entries: providerEntry,
  },
  AtomsReplaced: { speaks: "Development", often: "PerEvent", entries: providerEntry },
  UnwritableGateRegistry: { speaks: "Development", often: "PerEvent", entries: providerEntry },
};

describe("DeveloperSignals", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("the sentence each signal says by default", () => {
    it("SeedSuperseded", () => {
      expect(
        said(() =>
          reporterFor(SIGNALS.SeedSuperseded, "makeQadiAtoms", undefined)?.({
            policy: hasRole("admin"),
            resource: undefined,
            seeded,
            decided,
          }),
        ),
      ).toEqual([
        "[qadi] hydration mismatch for HasRole: the server allowed, this client denied — " +
          "subject lacks role 'admin'. This client's answer is the one in effect.",
      ]);
    });

    it("GateIdCollision", () => {
      expect(
        said(() => reporterFor(SIGNALS.GateIdCollision, "makeQadiAtoms", undefined)?.(":r1:")),
      ).toEqual([
        '[qadi] two React roots minted the gate id ":r1:" for one gate registry. ' +
          "Both guards are kept, the second under a disambiguated panel id. Give each " +
          "root a distinct `identifierPrefix` in its hydrateRoot/createRoot options " +
          "to fix the cause.",
      ]);
    });

    it("DehydrationDropped", () => {
      expect(
        said(() =>
          reporterFor(SIGNALS.DehydrationDropped, "dehydrateDecisions", undefined)?.({
            reason: "ForeignSubject",
            entries: [1, 2],
            wholePayload: false,
          }),
        ),
      ).toEqual([
        "[qadi] dehydrateDecisions dropped 2 decision(s): a payload mixing subjects has no " +
          "safe reading, so the others were discarded — check what fed this call.",
      ]);
    });

    it("HydrationDropped, entry by entry", () => {
      expect(
        said(() =>
          reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", undefined)?.({
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
          reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", undefined)?.({
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
      expect(
        said(() => providerSignalReporter(undefined)(providerSignals.atomsReplaced())),
      ).toEqual([
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
        expect(reporterFor(SIGNALS.SeedSuperseded, "makeQadiAtoms", undefined)).toBeUndefined();
        expect(reporterFor(SIGNALS.GateIdCollision, "makeQadiAtoms", undefined)).toBeUndefined();
        expect(reporterFor(SIGNALS.GateIdCollision, "makeGateRegistry", undefined)).toBeUndefined();
        expect(
          reporterFor(SIGNALS.DehydrationDropped, "dehydrateDecisions", undefined),
        ).toBeUndefined();
        expect(
          reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", undefined),
        ).toBeUndefined();

        // Contained, so not the same function: what it is handed still reaches it.
        const heard: Array<unknown> = [];
        const mine = (value: unknown) => {
          heard.push(value);
        };
        const mismatch = { policy: hasRole("admin"), resource: undefined, seeded, decided };
        const drop = { reason: "MalformedEntry" as const, entries: [1], wholePayload: false };
        const leftOut = { reason: "ForeignSubject" as const, entries: [1, 2], wholePayload: false };
        expect(
          said(() => {
            reporterFor(SIGNALS.SeedSuperseded, "makeQadiAtoms", mine)?.(mismatch);
            reporterFor(SIGNALS.GateIdCollision, "makeQadiAtoms", mine)?.(":r1:");
            reporterFor(SIGNALS.DehydrationDropped, "dehydrateDecisions", mine)?.(leftOut);
            reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", mine)?.(drop);
          }),
        ).toEqual([]);
        expect(heard).toEqual([mismatch, ":r1:", leftOut, drop]);
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

    it("InstrumentedInProduction's default is silent in development, whoever asks", () => {
      withEnvironment("development", () => {
        expect(
          reporterFor(SIGNALS.InstrumentedInProduction, "QadiProvider", undefined),
        ).toBeUndefined();
        expect(
          said(() => providerSignalReporter(undefined)(providerSignals.instrumentedInProduction())),
        ).toEqual([]);
      });
    });

    it("a row's condition holds in the environment it names and in no other", () => {
      const holds = (speaks: "Development" | "Production", environment: Environment) =>
        withEnvironment(environment, () => holdsHere({ speaks }));
      expect(holds("Development", "development")).toBe(true);
      expect(holds("Development", "production")).toBe(false);
      expect(holds("Production", "development")).toBe(false);
      expect(holds("Production", "production")).toBe(true);
      // `InstrumentedInProduction` is the one row that names production, and the provider
      // raises the signal when its row's condition holds.
      const instrumented = (environment: Environment) =>
        withEnvironment(environment, () => holdsHere(SIGNALS.InstrumentedInProduction));
      expect(instrumented("production")).toBe(true);
      expect(instrumented("development")).toBe(false);
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

  describe("the developer-signal table", () => {
    it("agrees with a written-out statement of it, row by row", () => {
      const stated = Object.fromEntries(
        Object.entries(SIGNALS).map(([tag, { speaks, often, entries }]) => [
          tag,
          { speaks, often, entries },
        ]),
      );
      expect(stated).toEqual(writtenOutTable);
    });

    it("contains a supplied reporter under its entry point's option, for every entry point of every row", () => {
      const written = Object.entries(writtenOutTable).flatMap(([row, { entries }]) =>
        Object.entries(entries).map(([entry, { option }]) => `${row}.${entry}.${option}`),
      );
      expect(
        entryPoints.map(({ row, entry, option }) => `${row}.${entry}.${option}`).toSorted(),
      ).toEqual(written.toSorted());

      for (const environment of environments) {
        for (const point of entryPoints) {
          expect(withEnvironment(environment, () => said(() => point.call(boom)))).toEqual([
            threw(point.option, "TypeError: host boom"),
          ]);
        }
      }
    });
  });
});

describe("a supplied reporter that throws (ReporterThrew, INT-04)", () => {
  afterEach(() => vi.restoreAllMocks());

  /** What each reporter case reads: the lines said when the reporter throws `thrown`. */
  const sayingFor = (thrown: unknown): ReadonlyArray<string> =>
    said(() =>
      reporterFor(SIGNALS.GateIdCollision, "makeQadiAtoms", () => {
        throw thrown;
      })?.(":r1:"),
    );

  for (const environment of ["development", "production"] as const) {
    describe(`in ${environment}`, () => {
      const inEnvironment = <A,>(act: () => A): A => withEnvironment(environment, act);

      for (const { row, entry, option, call } of entryPoints) {
        const title =
          `${row} through ${entry}'s ${option}: the throw does not propagate and ` +
          "ReporterThrew names the hook and the error only";
        it(title, () => {
          const lines = inEnvironment(() => said(() => call(boom)));
          expect(lines).toEqual([threw(option, "TypeError: host boom")]);
          for (const line of lines) {
            expect(line).not.toContain("secret-u2");
            expect(line).not.toContain("HasRole");
          }
        });
      }

      it("a thrown non-Error is named by its string form", () => {
        const lines = inEnvironment(() =>
          said(() =>
            reporterFor(SIGNALS.GateIdCollision, "makeQadiAtoms", () => {
              throw "plain string";
            })?.(":r1:"),
          ),
        );
        expect(lines).toEqual([threw("onGateIdCollision", "plain string")]);
      });

      it("a thrown value whose toString and message cannot be read is named by the placeholder", () => {
        expect(inEnvironment(() => sayingFor(hostile))).toEqual([
          threw("onGateIdCollision", "a value that could not be described"),
        ]);
      });

      it("a thrown Error whose message cannot be read is named by the placeholder alone", () => {
        expect(inEnvironment(() => sayingFor(hostileError))).toEqual([
          threw("onGateIdCollision", "a value that could not be described"),
        ]);
      });

      it("a thrown Error whose message is not a string is named by its string form alone", () => {
        const thrown = Object.assign(
          Object.defineProperty(new Error("x"), "message", { value: 42 }),
          { toString: () => "described" },
        );
        expect(inEnvironment(() => sayingFor(thrown))).toEqual([
          threw("onGateIdCollision", "described"),
        ]);
      });

      it("a thrown object that is not an Error is named by its string form, whatever its message field", () => {
        expect(inEnvironment(() => sayingFor({ message: "looks like an error" }))).toEqual([
          threw("onGateIdCollision", "[object Object]"),
        ]);
      });

      it("a thrown Error whose message is the number 42 is named once, as Error: 42", () => {
        const thrown = Object.defineProperty(new Error("x"), "message", { value: 42 });
        expect(inEnvironment(() => sayingFor(thrown))).toEqual([
          threw("onGateIdCollision", "Error: 42"),
        ]);
      });
    });
  }
});
