/**
 * What every developer-signal reporter says, and under what name, through each entry
 * point that resolves one.
 *
 * Pins every reporter through its public entry point (`makeQadiAtoms`, `makeGateRegistry`,
 * `dehydrateDecisions`, `hydrateDecisions`, `QadiProvider`), reading the console and the
 * supplied hook and never a resolver, so its expected values do not depend on how the
 * resolvers are built: a change to what is said, to the option a throw is named by, or to
 * when a reporter is chosen fails here whichever way they are. Its rows are unchanged by
 * ARCH-118, which moved the resolvers to one table (ADR-QD-184). Every console line is
 * compared whole, because consumers grep these messages.
 *
 * The rows these files already pin are not repeated here: `QadiProvider.signals.test.tsx`
 * (a supplied `onDeveloperSignal` for each provider signal, and an inline reporter),
 * `QadiProvider.production.test.tsx` (the once-per-process latch),
 * `GateRegistry.store.test.ts` (a returning `onIdCollision`, production silence for
 * `makeGateRegistry`, and a throwing collision reporter named by the option it was passed
 * through) and `GateRegistry.test.tsx` (a returning `onGateIdCollision` through hydrated
 * roots).
 */
import {
  Allow,
  Deny,
  EvaluationServicesNone,
  hasPermission,
  hasRole,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
  makeSubject,
  makeSubjectId,
  permission,
} from "@qadi/core";
import type { AuthSubject, HydrationDropReason } from "@qadi/core";
import { cleanup, render } from "@testing-library/react";
import * as Context from "effect/Context";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Can,
  QadiProvider,
  currentDecision,
  dehydrateDecisions,
  hydrateDecisions,
  makeGateRegistry,
  makeQadiAtoms,
} from "../src/index.ts";
import type {
  DehydratedDecisions,
  DehydratedEntry,
  HydrationDropReporter,
  ProviderSignal,
  QadiProviderProps,
} from "../src/index.ts";
import { gateWriterFor } from "../src/GateWriter.ts";
import type { GateInstance, GateRenderState } from "../src/GateRegistry.ts";
import { environments, inEnvironment, said } from "./support/environment.ts";
import type { Environment } from "./support/environment.ts";
import { threw } from "./support/reporterThrew.ts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const boom = (): never => {
  throw new Error("boom");
};

/** The line a throwing `boom` is announced with, named by the option it was passed through. */
const threwBoom = (option: string): string => threw(option, "Error: boom");

const seedSuperseded =
  "[qadi] hydration mismatch for HasRole: the server allowed, this client denied — " +
  "subject lacks role 'admin'. This client's answer is the one in effect.";

const gateIdCollision = (id: string): string =>
  `[qadi] two React roots minted the gate id "${id}" for one gate registry. ` +
  "Both guards are kept, the second under a disambiguated panel id. Give each " +
  "root a distinct `identifierPrefix` in its hydrateRoot/createRoot options " +
  "to fix the cause.";

const dehydrationDropped =
  "[qadi] dehydrateDecisions dropped 1 decision(s): a payload mixing subjects has no " +
  "safe reading, so the others were discarded — check what fed this call.";

const hydrationDroppedMalformed =
  "[qadi] hydrateDecisions did not seed 1 decision(s): an entry's shape didn't match " +
  "what this client expects — a field other than the policy was missing, of the wrong " +
  "type, or shaped wrong. The usual cause is version skew, same as an undecodable " +
  "policy; a hand-built payload that skips required fields is the other. " +
  "Those questions will be asked again from scratch.";

const hydrationDroppedWrongSubject =
  "[qadi] hydrateDecisions refused the payload (1 decision(s) in it): the payload names a " +
  "different subject than this client's. Nothing was seeded, and nothing should have been — " +
  "check that the page and its payload were rendered for the same user, and that no cache is " +
  "serving one user's page to another. Those questions will be asked again from scratch.";

const atomsReplaced =
  "[qadi] <QadiProvider>'s `atoms` prop changed identity after mount. " +
  "makeQadiAtoms() must be called once per context, at module scope " +
  "(or memoised) — this provider's registry is not rebuilt for a new " +
  "atom set, so the new atoms' initial values are silently ignored and " +
  "decisions from the previous atom set keep answering until this " +
  "provider unmounts.";

const unwritableGateRegistry =
  "[qadi] <QadiProvider>'s `gates` was not built by makeGateRegistry(); " +
  "guards under this provider will not register.";

const canRead = hasPermission(permission("doc", "read"));
const canWrite = hasPermission(permission("doc", "write"));
const isAdmin = hasRole("admin");
const alice: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });

const serverAllow = (subject: string, evaluationId: string): Allow =>
  new Allow({
    evaluationId,
    subjectId: makeSubjectId(subject),
    durationMillis: 3,
    trace: {
      policyTag: "HasPermission",
      allowed: true,
      children: [],
      visibleFields: undefined,
      obligations: [],
    },
  });

const instance = (id: string, state: GateRenderState): GateInstance => ({
  id,
  kind: "Can",
  policy: canRead,
  resource: undefined,
  state,
  element: undefined,
});

const writerOf = (registry: object) => {
  const writer = gateWriterFor(registry);
  if (writer === undefined) throw new Error("registry has no writer");
  return writer;
};

/** Registers one id three times: the second and third collide with the first. */
const registerThrice = (registry: object): void => {
  const writer = writerOf(registry);
  writer.register(instance("x", "Allowed"));
  writer.register(instance("x", "Denied"));
  writer.register(instance("x", "Pending"));
};

/** Registers one id twice: the second collides with the first. */
const registerTwice = (registry: object): void => {
  const writer = writerOf(registry);
  writer.register(instance("x", "Allowed"));
  writer.register(instance("x", "Denied"));
};

// The default registry, which a test cannot scope: every count read is a delta.
const metrics = Context.empty();
const dropCount = (reason: HydrationDropReason): number =>
  hydrationDroppedTotal.valueUnsafe(metrics).occurrences.get(reason) ?? 0;
const seededCount = (): number => hydrationSeededTotal.valueUnsafe(metrics).count;
const recheckCount = (): number => hydrationRechecksTotal.valueUnsafe(metrics).count;
const mismatchCount = (): number => hydrationMismatchesTotal.valueUnsafe(metrics).count;

/** The server allowed `isAdmin` for `u1`; this client holds no role, so it denies. */
const supersededPayload = (): DehydratedDecisions =>
  dehydrateDecisions([{ policy: isAdmin, decision: serverAllow("u1", "e1") }]);

/**
 * Builds an atom set in `environment`, seeds it with the disagreeing payload and reads the
 * decision it settles on.
 */
const settleSuperseded = (
  environment: Environment,
  options: Parameters<typeof makeQadiAtoms>[1],
) => {
  const atoms = inEnvironment(environment, () =>
    makeQadiAtoms(EvaluationServicesNone, options),
  );
  const rechecks = recheckCount();
  const mismatches = mismatchCount();
  const subjectValue: readonly [typeof atoms.subject, AuthSubject] = [
    atoms.subject,
    alice,
  ];
  const settled: Array<ReturnType<typeof currentDecision>> = [];
  const lines = inEnvironment(environment, () =>
    said(() => {
      const store = AtomRegistry.make({
        initialValues: [
          subjectValue,
          ...hydrateDecisions(atoms, supersededPayload(), alice),
        ],
      });
      settled.push(currentDecision(store.get(atoms.decision(isAdmin))));
      store.dispose();
    }),
  );
  return {
    lines,
    settled: settled[0],
    rechecks: recheckCount() - rechecks,
    mismatches: mismatchCount() - mismatches,
  };
};

describe("makeQadiAtoms: onHydrationMismatch and onGateIdCollision", () => {
  it("a superseded seed with no reporter warns once in development, and the decision settles", () => {
    const run = settleSuperseded("development", undefined);
    expect(run.lines).toEqual([seedSuperseded]);
    expect(run.settled).toBeInstanceOf(Deny);
  });

  it("a superseded seed with no reporter says nothing in production", () => {
    const run = settleSuperseded("production", undefined);
    expect(run.lines).toEqual([]);
    expect(run.settled).toBeInstanceOf(Deny);
  });

  it("a returning onHydrationMismatch is told the mismatch once in production, and nothing is written to the console", () => {
    const told: Array<unknown> = [];
    const run = settleSuperseded("production", {
      onHydrationMismatch: (mismatch) => told.push(mismatch),
    });
    expect(told).toHaveLength(1);
    expect(run.lines).toEqual([]);
  });

  it("a throwing onHydrationMismatch is named in development, and the re-check and the mismatch are counted", () => {
    const run = settleSuperseded("development", { onHydrationMismatch: boom });
    expect(run.lines).toEqual([threwBoom("onHydrationMismatch")]);
    expect(run.settled).toBeInstanceOf(Deny);
    expect(run.rechecks).toBe(1);
    expect(run.mismatches).toBe(1);
  });

  it("a throwing onHydrationMismatch is named in production, and the re-check and the mismatch are counted", () => {
    const run = settleSuperseded("production", { onHydrationMismatch: boom });
    expect(run.lines).toEqual([threwBoom("onHydrationMismatch")]);
    expect(run.settled).toBeInstanceOf(Deny);
    expect(run.rechecks).toBe(1);
    expect(run.mismatches).toBe(1);
  });

  it("three registrations of one gate id with no reporter warn once in development", () => {
    const atoms = inEnvironment("development", () =>
      makeQadiAtoms(EvaluationServicesNone),
    );
    const lines = inEnvironment("development", () =>
      said(() => registerThrice(atoms.gates)),
    );
    expect(lines).toEqual([gateIdCollision("x")]);
    expect(atoms.gates.instances().map((one) => one.id)).toEqual(["x", "x~1", "x~2"]);
  });

  it("three registrations of one gate id with no reporter say nothing in production", () => {
    const atoms = inEnvironment("production", () =>
      makeQadiAtoms(EvaluationServicesNone),
    );
    const lines = inEnvironment("production", () =>
      said(() => registerThrice(atoms.gates)),
    );
    expect(lines).toEqual([]);
    expect(atoms.gates.instances().map((one) => one.id)).toEqual(["x", "x~1", "x~2"]);
  });

  it("a returning onGateIdCollision is told the id once in production, and nothing is written to the console", () => {
    const told: Array<string> = [];
    const atoms = inEnvironment("production", () =>
      makeQadiAtoms(EvaluationServicesNone, { onGateIdCollision: (id) => told.push(id) }),
    );
    const lines = inEnvironment("production", () =>
      said(() => registerThrice(atoms.gates)),
    );
    expect(told).toEqual(["x"]);
    expect(lines).toEqual([]);
  });
});

describe("makeGateRegistry: onIdCollision", () => {
  it("three registrations of one id with no reporter warn once in development, in the exact words", () => {
    const registry = inEnvironment("development", () => makeGateRegistry());
    const lines = inEnvironment("development", () =>
      said(() => registerThrice(registry)),
    );
    expect(lines).toEqual([gateIdCollision("x")]);
  });
});

const own = { policy: canRead, decision: serverAllow("u1", "e1") };
const foreign = { policy: canRead, decision: serverAllow("u2", "e2") };

describe("dehydrateDecisions: onDropped", () => {
  it("an entry for another subject with no reporter warns once in development", () => {
    const lines = inEnvironment("development", () =>
      said(() => void dehydrateDecisions([own, foreign])),
    );
    expect(lines).toEqual([dehydrationDropped]);
  });

  it("an entry for another subject with no reporter says nothing in production", () => {
    const lines = inEnvironment("production", () =>
      said(() => void dehydrateDecisions([own, foreign])),
    );
    expect(lines).toEqual([]);
  });

  it("a returning onDropped is told the left-out entry once in production, and nothing is written to the console", () => {
    const told: Array<{
      readonly reason: string;
      readonly entries: ReadonlyArray<unknown>;
      readonly wholePayload: boolean;
    }> = [];
    const lines = inEnvironment("production", () =>
      said(
        () =>
          void dehydrateDecisions([own, foreign], {
            onDropped: (drop) => told.push(drop),
          }),
      ),
    );
    expect(told).toHaveLength(1);
    expect(told[0]?.reason).toBe("ForeignSubject");
    expect(told[0]?.wholePayload).toBe(false);
    expect(told[0]?.entries).toHaveLength(1);
    expect(told[0]?.entries[0]).toBe(foreign);
    expect(lines).toEqual([]);
  });

  for (const environment of environments) {
    it(`a throwing onDropped is named in ${environment}, and the payload is written without the entry and the drop counted`, () => {
      const before = dropCount("ForeignSubject");
      const written: Array<DehydratedDecisions> = [];
      const lines = inEnvironment(environment, () =>
        said(() => {
          written.push(dehydrateDecisions([own, foreign], { onDropped: boom }));
        }),
      );
      expect(lines).toEqual([threwBoom("onDropped")]);
      expect(written[0]?.entries.map((entry) => entry.decision.evaluationId)).toEqual([
        "e1",
      ]);
      expect(dropCount("ForeignSubject") - before).toBe(1);
    });
  }
});

/** A payload dehydrated for `u1` from two own entries, as a page would carry it. */
const ownPayload: DehydratedDecisions = JSON.parse(
  JSON.stringify(
    dehydrateDecisions([own, { policy: canWrite, decision: serverAllow("u1", "e3") }]),
  ),
);
const entryAt = (index: number): DehydratedEntry => {
  const entry = ownPayload.entries[index];
  if (entry === undefined) throw new Error("the payload has no such entry");
  return entry;
};
/** A good entry plus a key the entry shape does not have. */
const malformedEntry = (): DehydratedEntry => {
  const withExtra = { ...entryAt(1), extra: true };
  return withExtra;
};
const withEntries = (entries: ReadonlyArray<DehydratedEntry>): DehydratedDecisions => ({
  ...ownPayload,
  entries,
});

/**
 * Builds an atom set in `environment` and hydrates `payload` into it for `u1`, returning
 * the lines said and the count seeded.
 */
const hydrateIn = (
  environment: Environment,
  payload: DehydratedDecisions,
  onDropped?: HydrationDropReporter<unknown>,
) => {
  const atoms = inEnvironment(environment, () => makeQadiAtoms(EvaluationServicesNone));
  const seeded = seededCount();
  const lines = inEnvironment(environment, () =>
    said(() => {
      hydrateDecisions(
        atoms,
        payload,
        alice,
        onDropped === undefined ? undefined : { onDropped },
      );
    }),
  );
  return { lines, seeded: seededCount() - seeded };
};

describe("hydrateDecisions: onDropped", () => {
  it("a malformed entry with no reporter warns once in development", () => {
    expect(hydrateIn("development", withEntries([malformedEntry()])).lines).toEqual([
      hydrationDroppedMalformed,
    ]);
  });

  it("a payload for another subject with no reporter warns once in development, naming the payload whole", () => {
    expect(
      hydrateIn("development", { ...withEntries([entryAt(0)]), subjectId: "u2" }).lines,
    ).toEqual([hydrationDroppedWrongSubject]);
  });

  it("a malformed entry with no reporter says nothing in production", () => {
    expect(hydrateIn("production", withEntries([malformedEntry()])).lines).toEqual([]);
  });

  it("a returning onDropped is told the entry once in production, and nothing is written to the console", () => {
    const told: Array<{
      readonly reason: string;
      readonly entries: ReadonlyArray<unknown>;
      readonly wholePayload: boolean;
    }> = [];
    const entry = malformedEntry();
    const run = hydrateIn("production", withEntries([entry]), (drop) => told.push(drop));
    expect(told).toHaveLength(1);
    expect(told[0]?.reason).toBe("MalformedEntry");
    expect(told[0]?.wholePayload).toBe(false);
    expect(run.lines).toEqual([]);
  });

  for (const environment of environments) {
    it(`a throwing onDropped is named in ${environment}, and the good entry is still seeded and the drop counted`, () => {
      const before = dropCount("MalformedEntry");
      const run = hydrateIn(
        environment,
        withEntries([entryAt(0), malformedEntry()]),
        boom,
      );
      expect(run.lines).toEqual([threwBoom("onDropped")]);
      expect(run.seeded).toBe(1);
      expect(dropCount("MalformedEntry") - before).toBe(1);
    });
  }
});

/** The props a row sets beside the atom set, the subject and the one guard each renders. */
type Extra = Omit<QadiProviderProps, "atoms" | "subject" | "children">;

/** Renders a provider in `environment` and returns the lines it said. */
const mount = (environment: Environment, extra: Extra): ReadonlyArray<string> => {
  const atoms = makeQadiAtoms(EvaluationServicesNone);
  return inEnvironment(environment, () =>
    said(() => {
      render(
        <QadiProvider atoms={atoms} subject={alice} {...extra}>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>,
      );
    }),
  );
};

/** Renders a provider, rerenders it over another atom set, and returns what that said. */
const replaceAtoms = (environment: Environment, extra: Extra): ReadonlyArray<string> => {
  const first = makeQadiAtoms(EvaluationServicesNone);
  const second = makeQadiAtoms(EvaluationServicesNone);
  const tree = (atoms: typeof first) => (
    <QadiProvider atoms={atoms} subject={alice} {...extra}>
      <Can policy={canRead}>allowed</Can>
    </QadiProvider>
  );
  return inEnvironment(environment, () => {
    const view = render(tree(first));
    return said(() => view.rerender(tree(second)));
  });
};

const unwritable = {
  instances: (): ReadonlyArray<GateInstance> => [],
  subscribe: () => () => {},
};

describe("QadiProvider: onDeveloperSignal", () => {
  it("an instrumented provider in development with no reporter writes nothing to the console", () => {
    expect(mount("development", { instrument: true })).toEqual([]);
  });

  it("a throwing onDeveloperSignal told an instrumented provider rendered in production is named", () => {
    expect(mount("production", { instrument: true, onDeveloperSignal: boom })).toEqual([
      threwBoom("onDeveloperSignal"),
    ]);
  });

  it("replacing the atoms prop with no reporter warns once in development", () => {
    expect(replaceAtoms("development", {})).toEqual([atomsReplaced]);
  });

  it("replacing the atoms prop with no reporter says nothing in production", () => {
    expect(replaceAtoms("production", {})).toEqual([]);
  });

  it("a throwing onDeveloperSignal told the atoms prop was replaced is named in development", () => {
    expect(replaceAtoms("development", { onDeveloperSignal: boom })).toEqual([
      threwBoom("onDeveloperSignal"),
    ]);
  });

  it("a throwing onDeveloperSignal told the atoms prop was replaced is named in production", () => {
    expect(replaceAtoms("production", { onDeveloperSignal: boom })).toEqual([
      threwBoom("onDeveloperSignal"),
    ]);
  });

  it("an unwritable gate registry under instrument with no reporter warns once in development", () => {
    expect(mount("development", { instrument: true, gates: unwritable })).toEqual([
      unwritableGateRegistry,
    ]);
  });

  it("an unwritable gate registry under instrument with no reporter says nothing of the registry in production", () => {
    // The once-per-process latch may print its own line for the instrumentation itself;
    // it is not asserted here.
    expect(mount("production", { instrument: true, gates: unwritable })).not.toContain(
      unwritableGateRegistry,
    );
  });

  it("a throwing onDeveloperSignal told of an unwritable gate registry is named in development", () => {
    expect(
      mount("development", {
        instrument: true,
        gates: unwritable,
        onDeveloperSignal: boom,
      }),
    ).toEqual([threwBoom("onDeveloperSignal")]);
  });

  it("a throwing onDeveloperSignal under instrument in production is named once for each signal it is told", () => {
    const heard: Array<string> = [];
    const lines = mount("production", {
      instrument: true,
      gates: unwritable,
      onDeveloperSignal: (signal) => {
        heard.push(signal._tag);
        return boom();
      },
    });
    expect(lines).toEqual([threwBoom("onDeveloperSignal"), threwBoom("onDeveloperSignal")]);
    expect(heard).toEqual(["InstrumentedInProduction", "UnwritableGateRegistry"]);
  });
});

describe("when each reporter is resolved", () => {
  it("an atom set built in development keeps its console default after the environment turns to production", () => {
    const atoms = inEnvironment("development", () =>
      makeQadiAtoms(EvaluationServicesNone),
    );
    expect(
      inEnvironment("production", () => said(() => registerTwice(atoms.gates))),
    ).toEqual([gateIdCollision("x")]);
  });

  it("a registry built in development keeps its console default after the environment turns to production", () => {
    const registry = inEnvironment("development", () => makeGateRegistry());
    expect(
      inEnvironment("production", () => said(() => registerTwice(registry))),
    ).toEqual([gateIdCollision("x")]);
  });

  it("a registry built in production stays silent after the environment turns to development", () => {
    const registry = inEnvironment("production", () => makeGateRegistry());
    expect(
      inEnvironment("development", () => said(() => registerTwice(registry))),
    ).toEqual([]);
  });

  it("hydrateDecisions reads the environment at each call, not when its atom set was built", () => {
    const payload = withEntries([malformedEntry()]);
    const builtInProduction = inEnvironment("production", () =>
      makeQadiAtoms(EvaluationServicesNone),
    );
    const builtInDevelopment = inEnvironment("development", () =>
      makeQadiAtoms(EvaluationServicesNone),
    );
    expect(
      inEnvironment("development", () =>
        said(() => void hydrateDecisions(builtInProduction, payload, alice)),
      ),
    ).toEqual([hydrationDroppedMalformed]);
    expect(
      inEnvironment("production", () =>
        said(() => void hydrateDecisions(builtInDevelopment, payload, alice)),
      ),
    ).toEqual([]);
  });

  it("a reporter supplied on a later render is the one told the next signal", () => {
    const first: Array<ProviderSignal> = [];
    const second: Array<ProviderSignal> = [];
    const one = makeQadiAtoms(EvaluationServicesNone);
    const two = makeQadiAtoms(EvaluationServicesNone);
    const view = render(
      <QadiProvider
        atoms={one}
        subject={alice}
        onDeveloperSignal={(signal) => first.push(signal)}
      >
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    view.rerender(
      <QadiProvider
        atoms={two}
        subject={alice}
        onDeveloperSignal={(signal) => second.push(signal)}
      >
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(second.map((signal) => signal._tag)).toEqual(["AtomsReplaced"]);
    expect(first).toEqual([]);
  });
});
