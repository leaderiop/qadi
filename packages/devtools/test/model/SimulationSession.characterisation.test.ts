/**
 * The policy a simulation session holds and where it came from, pinned through the
 * session.
 *
 * Which policy `makeSimulationSession` holds, whether it came from the rail, a
 * choice or a replayed row, the menu a view lists for it, the draft and resource text
 * that travel with it, and the run and staleness that follow a change are read as the
 * session reports them: `getSnapshot` and `subscribe`, never its internals. Every row
 * compares the whole `view` projection and the exact notification count. Its inputs,
 * titles and expected values are fixed; an edit to this file may touch its header or
 * its imports only.
 *
 * The helpers it uses are `sighting`, `entryOf`, `slow`, `counted`, `startRun` and
 * `ran` from `../simulationFixtures.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as TestClock from "effect/testing/TestClock";
import { gte, hasAttribute, hasPermission, hasRole } from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import type { SimulationField } from "../../src/model/SimulationFields.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import type {
  PolicyChoice,
  PolicyMenu,
  ResourceText,
  RunState,
  SimulationSessionInit,
} from "../../src/model/SimulationSession.ts";
import type { SimulationSession } from "../../src/model/SimulationSession.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { decisionRecord, obligationRecord, read } from "../helpers.ts";
import {
  counted,
  entryOf,
  ran,
  sighting,
  slow,
  startRun,
} from "../simulationFixtures.ts";

const roleA = hasRole("a");
const roleB = hasRole("b");
const roleC = hasRole("c");
const roleZ = hasRole("z");
const clearance = hasAttribute("clearance", gte(5));

const sA = sighting(roleA);
const sB = sighting(roleB);
const sC = sighting(roleC);
const sClear = sighting(clearance);

const withClearance: SimulationInput = {
  subject: { id: "alice" },
  attributes: { clearance: 9 },
};
const blank: SimulationInput = { subject: { id: "someone" } };

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

const rowRead = entryOf(
  decisionRecord({
    evaluationId: "ev-read",
    policy: hasPermission(read),
    subjectId: "carol",
    action: "read",
    resource: { id: "doc-1" },
  }),
);
const rowA = entryOf(decisionRecord({ evaluationId: "ev-a", policy: roleA }));
const rowX = entryOf(
  decisionRecord({
    evaluationId: "ev-x",
    policy: hasRole("x"),
    resource: { id: "doc-2" },
  }),
);
const orphan = entryOf(obligationRecord({ evaluationId: "ev-orphan" }));

/** The form a replay of `rowRead` fills in. */
const carolDraft: SimulationInput = {
  subject: { id: "carol" },
  action: "read",
  resource: { id: "doc-1" },
};

/** A session built in the test's scope. */
const build = (init?: SimulationSessionInit) => makeSimulationSession(init);

type PolicyView =
  | Exclude<PolicyChoice, { readonly _tag: "Seeded" }>
  | {
      readonly _tag: "Seeded";
      readonly entry: TimelineEntry;
      readonly policy: Policy;
      readonly unseeded: ReadonlyArray<string>;
    };

type RunView =
  | { readonly _tag: "Idle" }
  | {
      readonly _tag: "Running" | "Ran" | "Broke" | "Refused";
      readonly policy: Policy;
      readonly seed: TimelineEntry | undefined;
    };

interface View {
  readonly policy: PolicyView;
  readonly policyMenu: PolicyMenu;
  readonly sightings: ReadonlyArray<PolicySighting>;
  readonly draft: SimulationInput;
  readonly resourceText: ResourceText;
  readonly run: RunView;
  readonly stale: boolean;
  readonly baseline: string | undefined;
}

const policyView = (choice: PolicyChoice): PolicyView =>
  choice._tag === "Seeded"
    ? {
        _tag: "Seeded",
        entry: choice.entry,
        policy: choice.policy,
        unseeded: choice.unseeded.map((u) => u.key),
      }
    : choice;

const runView = (run: RunState): RunView =>
  run._tag === "Idle"
    ? { _tag: "Idle" }
    : { _tag: run._tag, policy: run.question.policy, seed: run.question.seed };

/** What a session reports, as the rows compare it. */
const view = (session: SimulationSession): View => {
  const snapshot = session.getSnapshot();
  return {
    policy: policyView(snapshot.policy),
    policyMenu: snapshot.policyMenu,
    sightings: snapshot.sightings,
    draft: snapshot.draft,
    resourceText: snapshot.resourceText,
    run: runView(snapshot.run),
    stale: snapshot.stale,
    baseline: snapshot.baseline?._tag,
  };
};

const listed = (value: PolicySighting, index: number): PolicyView => ({
  _tag: "Listed",
  value,
  index,
});
const evictedOf = (value: PolicySighting): PolicyView => ({ _tag: "Evicted", value });
const seededOf = (row: TimelineEntry, policy: Policy): PolicyView => ({
  _tag: "Seeded",
  entry: row,
  policy,
  unseeded: KEYS,
});
const zero = (policy: Policy): PolicySighting => ({
  policy,
  label: policyLabel(policy),
  count: 0,
  allows: 0,
  denies: 0,
  errors: 0,
  lastAt: undefined,
});
const ranOf = (policy: Policy, seed: TimelineEntry | undefined): RunView => ({
  _tag: "Ran",
  policy,
  seed,
});

const menu = (
  options: ReadonlyArray<readonly [string, string]>,
  selected: string,
): PolicyMenu => ({
  options: options.map(([value, label]) => ({ value, label })),
  selected,
});
const seededEntry: readonly [string, string] = ["seeded", "from the replayed row"];
const evictedEntry = (sighting: PolicySighting): readonly [string, string] => [
  "evicted",
  `${sighting.label} — no longer in the log`,
];
const text = (typed: string): ResourceText => ({ text: typed, error: undefined });

/** The view a session reports unless a row says otherwise. */
const expected = (
  over: Pick<View, "policy" | "policyMenu" | "sightings"> & Partial<View>,
): View => ({
  draft: blank,
  resourceText: text(""),
  run: { _tag: "Idle" },
  stale: false,
  baseline: undefined,
  ...over,
});

describe("seeding", () => {
  it.effect("built with no seed, a session holds the head of the rail and keeps it", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB] });
      const seen = counted(session);
      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sA, 0),
          policyMenu: menu([["0", sA.label], ["1", sB.label]], "0"),
          sightings: [sA, sB],
        }),
      );

      session.setSightings([sB, sA]);
      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sA, 1),
          policyMenu: menu([["0", sB.label], ["1", sA.label]], "1"),
          sightings: [sB, sA],
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect("built with a replayable row, a session holds its policy unpinned", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA], seed: rowRead });
      const seen = counted(session);
      assert.deepStrictEqual(
        view(session),
        expected({
          policy: seededOf(rowRead, hasPermission(read)),
          policyMenu: menu([seededEntry, ["0", sA.label]], "seeded"),
          sightings: [sA],
          draft: carolDraft,
          resourceText: text('{"id":"doc-1"}'),
        }),
      );

      session.setSightings([sB, sA]);
      session.seed(undefined);
      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sB, 0),
          policyMenu: menu([["0", sB.label], ["1", sA.label]], "0"),
          sightings: [sB, sA],
          draft: carolDraft,
          resourceText: text('{"id":"doc-1"}'),
        }),
      );
      assert.strictEqual(seen.notified, 2);
    }));

  it.effect(
    "built with an orphan row, a session holds the head and keeps the row as seed",
    () =>
      Effect.gen(function* () {
        const session = yield* build({ sightings: [sA], seed: orphan });
        const seen = counted(session);
        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sA, 0),
            policyMenu: menu([["0", sA.label]], "0"),
            sightings: [sA],
          }),
        );

        yield* ran(session);
        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sA, 0),
            policyMenu: menu([["0", sA.label]], "0"),
            sightings: [sA],
            run: ranOf(roleA, orphan),
            baseline: "Unavailable",
          }),
        );
        assert.strictEqual(seen.notified, 2);
      }),
  );

  it.effect("seeding the row it already holds changes nothing and notifies no one", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA], seed: rowRead });
      session.edit({ ...session.getSnapshot().draft, action: "write" });
      const seen = counted(session);
      const before = session.getSnapshot();

      session.seed(rowRead);

      assert.strictEqual(seen.notified, 0);
      assert.strictEqual(session.getSnapshot(), before);
      assert.strictEqual(session.getSnapshot().draft.action, "write");
    }));

  it.effect(
    "seeding another row replaces the policy, the draft and the resource text",
    () =>
      Effect.gen(function* () {
        const session = yield* build({ sightings: [sA] });
        session.editResourceText("[1]");
        const seen = counted(session);

        session.seed(rowX);

        assert.deepStrictEqual(
          view(session),
          expected({
            policy: seededOf(rowX, hasRole("x")),
            policyMenu: menu([seededEntry, ["0", sA.label]], "seeded"),
            sightings: [sA],
            draft: { subject: { id: "alice" }, resource: { id: "doc-2" } },
            resourceText: text('{"id":"doc-2"}'),
          }),
        );
        assert.strictEqual(seen.notified, 1);
      }),
  );
});

describe("replaying a row", () => {
  it.effect("replaying the held row re-seeds the edited form and clears the run", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [], seed: rowA });
      yield* ran(session);
      session.edit({ ...session.getSnapshot().draft, action: "write" });
      const seen = counted(session);

      session.replay(rowA);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: seededOf(rowA, roleA),
          policyMenu: menu([seededEntry], "seeded"),
          sightings: [],
          draft: { subject: { id: "alice" } },
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect(
    "replaying an orphan after a replayable row holds the head, keeping the draft",
    () =>
      Effect.gen(function* () {
        const session = yield* build({ sightings: [sB], seed: rowRead });
        session.editResourceText("[1]");
        const seen = counted(session);

        session.replay(orphan);

        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sB, 0),
            policyMenu: menu([["0", sB.label]], "0"),
            sightings: [sB],
            draft: carolDraft,
            resourceText: text('{"id":"doc-1"}'),
          }),
        );
        assert.strictEqual(seen.notified, 1);
      }),
  );

  it.effect("replaying the row after a rail choice holds its policy again", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sB] });
      session.seed(rowA);
      session.choosePolicy(roleB);
      const seen = counted(session);

      session.replay(rowA);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: seededOf(rowA, roleA),
          policyMenu: menu([seededEntry, ["0", sB.label]], "seeded"),
          sightings: [sB],
          draft: { subject: { id: "alice" } },
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));
});

describe("choosing a policy", () => {
  it.effect("choosing a listed policy holds it and notifies once", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB] });
      const seen = counted(session);

      session.choosePolicy(roleB);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sB, 1),
          policyMenu: menu([["0", sA.label], ["1", sB.label]], "1"),
          sightings: [sA, sB],
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect("choosing a policy the rail does not list holds it as evicted", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      const seen = counted(session);

      session.choosePolicy(roleZ);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: evictedOf(zero(roleZ)),
          policyMenu: menu([evictedEntry(zero(roleZ)), ["0", sA.label]], "evicted"),
          sightings: [sA],
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect("choosing an equal copy of the held policy while idle changes nothing", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      const seen = counted(session);
      const before = session.getSnapshot();

      session.choosePolicy(hasRole("a"));

      assert.strictEqual(seen.notified, 0);
      assert.strictEqual(session.getSnapshot(), before);
    }));

  it.effect("choosing the held policy after a run clears the run, notifying once", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      yield* ran(session);
      const seen = counted(session);

      session.choosePolicy(roleA);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sA, 0),
          policyMenu: menu([["0", sA.label]], "0"),
          sightings: [sA],
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect(
    "choosing the held policy while seeded leaves the row, keeping the draft",
    () =>
      Effect.gen(function* () {
        const session = yield* build({ sightings: [sA] });
        session.seed(rowRead);
        const seen = counted(session);

        session.choosePolicy(roleA);

        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sA, 0),
            policyMenu: menu([["0", sA.label]], "0"),
            sightings: [sA],
            draft: carolDraft,
            resourceText: text('{"id":"doc-1"}'),
          }),
        );
        assert.strictEqual(seen.notified, 1);

        yield* ran(session);
        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sA, 0),
            policyMenu: menu([["0", sA.label]], "0"),
            sightings: [sA],
            draft: carolDraft,
            resourceText: text('{"id":"doc-1"}'),
            run: ranOf(roleA, undefined),
            baseline: undefined,
          }),
        );
      }),
  );

  it.effect("choosing from the rail while an orphan is the seed keeps the orphan", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB], seed: orphan });

      session.choosePolicy(roleB);
      yield* ran(session);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sB, 1),
          policyMenu: menu([["0", sA.label], ["1", sB.label]], "1"),
          sightings: [sA, sB],
          run: ranOf(roleB, orphan),
          baseline: "Unavailable",
        }),
      );
    }));
});

describe("the policy menu", () => {
  it.effect("the menu of an empty session is empty and selects nothing", () =>
    Effect.gen(function* () {
      const session = yield* build(undefined);

      assert.deepStrictEqual(
        view(session),
        expected({ policy: { _tag: "Empty" }, policyMenu: menu([], ""), sightings: [] }),
      );
    }));

  it.effect(
    "position 0 of a seeded menu names the replayed row and changes nothing",
    () =>
      Effect.gen(function* () {
        const session = yield* build({ sightings: [sA], seed: rowRead });
        const seen = counted(session);
        const before = session.getSnapshot();

        session.choosePolicyAt(0);

        assert.strictEqual(seen.notified, 0);
        assert.strictEqual(session.getSnapshot(), before);

        session.choosePolicyAt(1);

        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sA, 0),
            policyMenu: menu([["0", sA.label]], "0"),
            sightings: [sA],
            draft: carolDraft,
            resourceText: text('{"id":"doc-1"}'),
          }),
        );
        assert.strictEqual(seen.notified, 1);
      }),
  );

  it.effect("position 0 of a menu led by an evicted choice changes nothing", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB] });
      session.choosePolicy(roleB);
      session.setSightings([sA]);
      assert.deepStrictEqual(
        view(session),
        expected({
          policy: evictedOf(sB),
          policyMenu: menu([evictedEntry(sB), ["0", sA.label]], "evicted"),
          sightings: [sA],
        }),
      );
      const seen = counted(session);
      const before = session.getSnapshot();

      session.choosePolicyAt(0);

      assert.strictEqual(seen.notified, 0);
      assert.strictEqual(session.getSnapshot(), before);

      session.choosePolicyAt(1);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sA, 0),
          policyMenu: menu([["0", sA.label]], "0"),
          sightings: [sA],
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect(
    "a position past the list, negative, fractional or NaN changes nothing",
    () =>
      Effect.gen(function* () {
        const session = yield* build({ sightings: [sA, sB] });
        const seen = counted(session);
        const before = session.getSnapshot();

        for (const position of [2, 5, -1, 0.5, Number.NaN]) {
          session.choosePolicyAt(position);
        }

        assert.strictEqual(seen.notified, 0);
        assert.strictEqual(session.getSnapshot(), before);
      }),
  );

  it.effect("a listed position chooses the sighting at that position", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB] });
      const seen = counted(session);

      session.choosePolicyAt(1);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sB, 1),
          policyMenu: menu([["0", sA.label], ["1", sB.label]], "1"),
          sightings: [sA, sB],
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect("position 2 of a seeded menu chooses the second sighting of the rail", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB], seed: rowRead });
      const seen = counted(session);

      session.choosePolicyAt(2);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sB, 1),
          policyMenu: menu([["0", sA.label], ["1", sB.label]], "1"),
          sightings: [sA, sB],
          draft: carolDraft,
          resourceText: text('{"id":"doc-1"}'),
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));
});

describe("staleness", () => {
  it.effect("a finished run goes stale when the form moves", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sClear] });
      session.edit(withClearance);
      yield* ran(session);
      const finished = expected({
        policy: listed(sClear, 0),
        policyMenu: menu([["0", sClear.label]], "0"),
        sightings: [sClear],
        draft: withClearance,
        run: ranOf(clearance, undefined),
      });
      assert.deepStrictEqual(view(session), finished);

      session.edit({ ...withClearance, action: "read" });

      assert.deepStrictEqual(view(session), {
        ...finished,
        draft: { ...withClearance, action: "read" },
        stale: true,
      });
    }));

  it.effect("a finished run stays current when the rail moves", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      yield* ran(session);

      session.setSightings([sB]);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: evictedOf(sA),
          policyMenu: menu([evictedEntry(sA), ["0", sB.label]], "evicted"),
          sightings: [sB],
          run: ranOf(roleA, undefined),
        }),
      );
    }));

  it.effect("choosing another policy after a run clears it, so nothing is stale", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB] });
      yield* ran(session);

      session.choosePolicy(roleB);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sB, 1),
          policyMenu: menu([["0", sA.label], ["1", sB.label]], "1"),
          sightings: [sA, sB],
        }),
      );
    }));

  it.effect("seeding a row after a run clears it, and a new run checks the row", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      yield* ran(session);

      session.seed(rowA);

      const seeded = expected({
        policy: seededOf(rowA, roleA),
        policyMenu: menu([seededEntry, ["0", sA.label]], "seeded"),
        sightings: [sA],
        draft: { subject: { id: "alice" } },
      });
      assert.deepStrictEqual(view(session), seeded);

      yield* ran(session);

      assert.deepStrictEqual(view(session), {
        ...seeded,
        run: ranOf(roleA, rowA),
        baseline: "Checked",
      });
    }));
});

describe("the rail", () => {
  it.effect("a rail of the same elements in a new array changes nothing", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB] });
      const seen = counted(session);
      const before = session.getSnapshot();

      session.setSightings([sA, sB]);

      assert.strictEqual(seen.notified, 0);
      assert.strictEqual(session.getSnapshot(), before);
    }));

  it.effect("the held policy follows the rail to its new position", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA, sB] });
      session.choosePolicy(roleB);
      const seen = counted(session);

      session.setSightings([sC, sA, sB]);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sB, 2),
          policyMenu: menu([["0", sC.label], ["1", sA.label], ["2", sB.label]], "2"),
          sightings: [sC, sA, sB],
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect("an empty session pins the first head the rail gives it", () =>
    Effect.gen(function* () {
      const session = yield* build(undefined);
      const seen = counted(session);

      session.setSightings([sA]);
      session.setSightings([sB, sA]);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sA, 1),
          policyMenu: menu([["0", sB.label], ["1", sA.label]], "1"),
          sightings: [sB, sA],
        }),
      );
      assert.strictEqual(seen.notified, 2);
    }));

  it.effect(
    "a policy chosen before the rail has any is held once the rail lists it",
    () =>
      Effect.gen(function* () {
        const session = yield* build(undefined);
        session.choosePolicy(roleA);
        assert.deepStrictEqual(
          view(session),
          expected({
            policy: evictedOf(zero(roleA)),
            policyMenu: menu([evictedEntry(zero(roleA))], "evicted"),
            sightings: [],
          }),
        );

        session.setSightings([sB, sA]);

        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sA, 1),
            policyMenu: menu([["0", sB.label], ["1", sA.label]], "1"),
            sightings: [sB, sA],
          }),
        );
      }),
  );
});

describe("the ports", () => {
  it.effect("new ports during a run clear it and stop it", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = yield* build({ sightings: [sClear], ports });
      session.edit(withClearance);
      session.chooseSource("Live");
      yield* startRun(session);
      const seen = counted(session);

      session.setPorts(slow().ports);

      const cleared = expected({
        policy: listed(sClear, 0),
        policyMenu: menu([["0", sClear.label]], "0"),
        sightings: [sClear],
        draft: withClearance,
      });
      assert.deepStrictEqual(view(session), cleared);
      assert.strictEqual(seen.notified, 1);

      yield* Effect.yieldNow;
      assert.strictEqual(tally.interrupted, 1);

      yield* TestClock.adjust("1 second");
      assert.strictEqual(tally.finished, 0);
      assert.deepStrictEqual(view(session), cleared);
    }));

  it.effect("new ports after a finished run keep the result", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      yield* ran(session);
      const seen = counted(session);

      session.setPorts(slow().ports);

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sA, 0),
          policyMenu: menu([["0", sA.label]], "0"),
          sightings: [sA],
          run: ranOf(roleA, undefined),
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));
});

describe("the draft", () => {
  it.effect("editing to the draft it holds changes nothing", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      const seen = counted(session);
      const before = session.getSnapshot();

      session.edit(before.draft);

      assert.strictEqual(seen.notified, 0);
      assert.strictEqual(session.getSnapshot(), before);
    }));

  it.effect("an edit that changes the resource re-encodes the resource text", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      const seen = counted(session);

      session.edit({ subject: { id: "alice" }, resource: { id: "r" } });

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sA, 0),
          policyMenu: menu([["0", sA.label]], "0"),
          sightings: [sA],
          draft: { subject: { id: "alice" }, resource: { id: "r" } },
          resourceText: text('{"id":"r"}'),
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect("an edit that keeps the resource keeps the typed resource text", () =>
    Effect.gen(function* () {
      const session = yield* build({ sightings: [sA] });
      session.editResourceText('{ "id": "x" }');
      const seen = counted(session);

      session.edit({ ...session.getSnapshot().draft, action: "read" });

      assert.deepStrictEqual(
        view(session),
        expected({
          policy: listed(sA, 0),
          policyMenu: menu([["0", sA.label]], "0"),
          sightings: [sA],
          draft: { subject: { id: "someone" }, resource: { id: "x" }, action: "read" },
          resourceText: text('{ "id": "x" }'),
        }),
      );
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect(
    "resource text publishes on every call, an unchanged parse and a refusal too",
    () =>
      Effect.gen(function* () {
        const session = yield* build({ sightings: [sA] });
        const seen = counted(session);

        session.editResourceText('{"id":"x"}');
        session.editResourceText('{"id":"x"}');
        session.editResourceText("[1]");

        assert.strictEqual(seen.notified, 3);
        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sA, 0),
            policyMenu: menu([["0", sA.label]], "0"),
            sightings: [sA],
            draft: { subject: { id: "someone" }, resource: { id: "x" } },
            resourceText: { text: "[1]", error: "expected a JSON object" },
          }),
        );
      }),
  );

  it.effect(
    "renaming to the current id changes nothing, and a rename keeps the text",
    () =>
      Effect.gen(function* () {
        const session = yield* build({ sightings: [sA] });
        session.editResourceText('{ "id": "x" }');
        const seen = counted(session);
        const before = session.getSnapshot();

        session.renameSubject("someone");

        assert.strictEqual(seen.notified, 0);
        assert.strictEqual(session.getSnapshot(), before);

        session.renameSubject("bob");

        assert.deepStrictEqual(
          view(session),
          expected({
            policy: listed(sA, 0),
            policyMenu: menu([["0", sA.label]], "0"),
            sightings: [sA],
            draft: { subject: { id: "bob" }, resource: { id: "x" } },
            resourceText: text('{ "id": "x" }'),
          }),
        );
        assert.strictEqual(seen.notified, 1);
      }),
  );
});
