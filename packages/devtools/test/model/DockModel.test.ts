/**
 * The dock's cross-store rules, tested with no DOM (ARCH-74, DMOD-02).
 *
 * The dock owns stores, which BEH-QD-700 lists, and the rules that connect them. The
 * store-list test below lists the built model's own and fails when one is added or
 * removed; review keeps its list equal to BEH-QD-700's.
 *
 * The rules: a new timeline reaches every screen, a replay commands the simulation,
 * a new head does not move a held choice, an unchanged input dispatches nothing, and
 * no screen reads another timeline than the one the dock shows. Those rules once
 * lived in layout effects and were proved only by rendering the whole dock. They are
 * stated here against `makeDockModel` and nothing is rendered.
 *
 * The model is built in a scope (ADR-QD-137): `it.effect` provides one, and a
 * test that needs to end it mid-test makes its own. A test title carries a stable
 * case label (`M1`, `M5`, ...), so a failing run names the rule and not a line in
 * another file.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Queue from "effect/Queue";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import * as FastCheck from "fast-check";
import {
  Decided,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  PortReply,
  permission,
  portsLayer,
  role,
  scriptedPort,
  attributeResolverPort,
} from "@qadi/core";
import type { Policy, Resource, StoredRecord } from "@qadi/core";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { catalogueOf, policyLabel } from "../../src/model/Catalogue.ts";
import type { Catalogue } from "../../src/model/Catalogue.ts";
import { DiagnosticsStatus, diagnosticsOff } from "../../src/model/DiagnosticsFeed.ts";
import { WiringRead, noDiagnostics } from "../../src/model/DiagnosticsStore.ts";
import type { DiagnosticsReading } from "../../src/model/DiagnosticsStore.ts";
import { makeDockModel } from "../../src/model/DockModel.ts";
import type { DockModel } from "../../src/model/DockModel.ts";
import type { TabId } from "../../src/model/DockSession.ts";
import { noFilters } from "../../src/model/Filters.ts";
import type { AskedQuestionLike, GateInstanceLike, QuestionsSnapshot } from "../../src/model/Gates.ts";
import type { Source } from "../../src/model/Source.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { countsOf } from "../../src/model/Verdict.ts";
import {
  allow,
  decisionRecord,
  deny,
  failedRecord,
  guard,
  heardOn,
  obligationRecord,
  read,
  readPolicy,
  settleTurns,
  thrownBy,
  tick,
} from "../helpers.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import {
  activityOf,
  askingIds,
  heardOf,
  logOf,
  oneReading,
  rowOf,
  suppliedActivity,
  suppliedHydration,
  wiringNamed,
} from "../dockModelFixtures.ts";
import { slow } from "../simulationFixtures.ts";

const write = permission("doc", "write");
const writePolicy: Policy = hasPermission(write);
const clearance = hasAttribute("clearance", gte(5));
const editor = role({ name: "editor", permissions: [read] });
const viewer = role({ name: "viewer", permissions: [write] });

const decided = (evaluationId: string, at: number, policy: Policy, action: string): StoredRecord =>
  decisionRecord({ evaluationId, at, policy, action });

/** The timeline's entry for `evaluationId`, which the test has already accepted. */
const entryOf = (model: DockModel, evaluationId: string): TimelineEntry => {
  const found = model.timeline.getSnapshot().entries.find((entry) => entry.evaluationId === evaluationId);
  if (found === undefined) throw new Error(`no entry ${evaluationId}`);
  return found;
};

/** Counts every notification of every store, so "dispatches nothing" is an observation. */
const listen = (model: DockModel) => {
  const seen = { calls: 0 };
  const hear = () => {
    seen.calls += 1;
  };
  model.timeline.subscribe(hear);
  model.dock.subscribe(hear);
  model.explorer.subscribe(hear);
  model.roles.subscribe(hear);
  model.simulation.subscribe(hear);
  return seen;
};

/**
 * A key field and the number of notifications a fresh model's store heard when the
 * field moved or was left alone.
 */
interface KeyRow {
  readonly field: string;
  readonly heard: Effect.Effect<number, never, Scope.Scope>;
}

/** What the simulator's policy dropdown shows, as the text a reviewer reads. */
const shownLabel = (model: DockModel): string | undefined => {
  const { policyMenu } = model.simulation.getSnapshot();
  return policyMenu.options.find((option) => option.value === policyMenu.selected)?.label;
};

/** The policy the explorer shows. */
const explorerPolicy = (model: DockModel): Policy | undefined => {
  const snapshot = model.explorer.getSnapshot();
  return snapshot._tag === "Showing" ? snapshot.policy : undefined;
};

const sameAs = (actual: Policy | undefined, expected: Policy): boolean =>
  actual !== undefined && Equal.equals(actual, expected);

/** Lets forked fibers (a source read, a run) reach their next suspension. */
const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));

// The helpers below start a simulation run and wait for it, as `SimulationSession.test.ts` does.

/** Resumes once no run is in flight: at once when none is, else on the notification that ends it. */
const settled = (model: DockModel) =>
  Effect.callback<void>((resume) => {
    const idle = () => model.simulation.getSnapshot().run._tag !== "Running";
    if (idle()) {
      resume(Effect.void);
      return;
    }
    const off = model.simulation.subscribe(() => {
      if (!idle()) return;
      off();
      resume(Effect.void);
    });
    return Effect.sync(off);
  });

/** One simulator run, waited for. */
const ran = (model: DockModel) =>
  Effect.suspend(() => {
    model.simulation.run("Run");
    return settled(model);
  });

const brokenPorts = portsLayer({
  AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("the store is down"), "broken")
    .layer,
});

const otherBrokenPorts = portsLayer({
  AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("also down"), "broken").layer,
});

/** A source that counts its reads and the releases of what each read acquired. */
const watched = (backlog: ReadonlyArray<StoredRecord>, live: Stream.Stream<StoredRecord>) => {
  const tally = { started: 0, finalized: 0 };
  const source: Source = {
    read: Effect.gen(function* () {
      tally.started += 1;
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          tally.finalized += 1;
        }),
      );
      return { backlog, live };
    }),
  };
  return { source, tally };
};

describe("a timeline reaches every screen (M1, M2, M3)", () => {
  it.effect("M1: records alone fill both rails, one sighting per policy with its tally", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      model.timeline.accept(decided("b", 200, readPolicy, "read"));

      for (const rail of [model.explorer.getSnapshot().sightings, model.simulation.getSnapshot().sightings]) {
        assert.strictEqual(rail.length, 1);
        assert.strictEqual(rail[0]?.count, 2);
        assert.isTrue(sameAs(rail[0]?.policy, readPolicy));
      }
      assert.deepStrictEqual(model.sightings(), model.explorer.getSnapshot().sightings);
      assert.deepStrictEqual(model.sightings(), model.simulation.getSnapshot().sightings);
    }));

  it.effect("M2: a declared catalogue adds names and unrun policies to both rails", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      model.configure({ catalogue: { policies: { canRead: readPolicy, canWrite: writePolicy } } });

      for (const rail of [model.explorer.getSnapshot().sightings, model.simulation.getSnapshot().sightings]) {
        assert.strictEqual(rail.length, 2);
        assert.strictEqual(rail[0]?.label, "canRead");
        assert.strictEqual(rail[0]?.count, 1);
        assert.strictEqual(rail[1]?.label, "canWrite");
        assert.strictEqual(rail[1]?.count, 0);
      }
    }));

  it.effect("M3: roles come only from the catalogue, never from records", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      assert.deepStrictEqual(model.roles.getSnapshot().list, []);
      assert.strictEqual(model.roles.getSnapshot().choice._tag, "Empty");

      model.configure({ catalogue: { roles: [editor] } });
      const snapshot = model.roles.getSnapshot();
      assert.deepStrictEqual(snapshot.list, [editor]);
      assert.strictEqual(snapshot.choice._tag, "Listed");
      assert.strictEqual(snapshot.choice._tag === "Listed" && snapshot.choice.index, 0);
    }));
});

describe("a replay commands the simulation (M4, M5, M6, M7)", () => {
  /** Two logged rows, `a` reading and `b` writing, in a model that has shown neither screen. */
  const twoRows = () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      model.timeline.accept(decided("b", 200, writePolicy, "write"));
      return model;
    });

  const seededFrom = (model: DockModel, policy: Policy, action: string) => {
    const snapshot = model.simulation.getSnapshot();
    assert.isTrue(snapshot.policy._tag === "Seeded" && sameAs(snapshot.policy.policy, policy));
    assert.strictEqual(snapshot.draft.action, action);
  };

  it.effect("M4: replaying a row moves to the simulator and seeds it", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));

      model.dock.replay(entryOf(model, "a"));

      assert.strictEqual(model.dock.getSnapshot().tab, "simulator");
      seededFrom(model, readPolicy, "read");
    }));

  it.effect("M5: replaying the same row again after another policy was chosen re-seeds", () =>
    Effect.gen(function* () {
      const model = yield* twoRows();
      model.dock.replay(entryOf(model, "a"));
      model.simulation.choosePolicy(writePolicy);
      assert.notStrictEqual(model.simulation.getSnapshot().policy._tag, "Seeded");

      model.dock.replay(entryOf(model, "a"));

      seededFrom(model, readPolicy, "read");
    }));

  it.effect("M6: replaying the same row again after the action was edited restores it", () =>
    Effect.gen(function* () {
      const model = yield* twoRows();
      model.dock.replay(entryOf(model, "a"));
      model.simulation.setAction("write");
      assert.strictEqual(model.simulation.getSnapshot().draft.action, "write");

      model.dock.replay(entryOf(model, "a"));

      assert.strictEqual(model.simulation.getSnapshot().draft.action, "read");
    }));

  it.effect("M7: a new record after a replay keeps the replayed form and reaches the rail", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      model.dock.replay(entryOf(model, "a"));
      model.simulation.setAction("write");

      model.timeline.accept(decided("b", 200, writePolicy, "write"));

      seededFrom(model, readPolicy, "write");
      assert.isTrue(
        model.simulation.getSnapshot().sightings.some((sighting) => Equal.equals(sighting.policy, writePolicy)),
        "the new row reached the simulator's rail",
      );
    }));
});

describe("a held choice does not follow the head (M8)", () => {
  it.effect("M8: a new head leaves both the explorer and the simulation on what they showed", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      assert.isTrue(sameAs(explorerPolicy(model), readPolicy));
      assert.strictEqual(shownLabel(model), policyLabel(readPolicy));

      model.timeline.accept(decided("b", 200, writePolicy, "write"));

      // The head moved: it is `b` that decided last.
      assert.strictEqual(model.explorer.getSnapshot().sightings[0]?.label, policyLabel(writePolicy));
      assert.isTrue(sameAs(explorerPolicy(model), readPolicy));
      assert.strictEqual(shownLabel(model), policyLabel(readPolicy));
    }));
});

describe("a tab change touches nothing else (M9)", () => {
  it.effect("M9: visiting every tab and returning leaves every other store's snapshot as it was", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      model.timeline.accept(decided("b", 200, writePolicy, "write"));
      model.configure({ catalogue: { roles: [editor, viewer] } });
      const timeline = model.timeline.getSnapshot();
      const explorer = model.explorer.getSnapshot();
      const roles = model.roles.getSnapshot();
      const simulation = model.simulation.getSnapshot();
      const dock = model.dock.getSnapshot();

      const tabs: ReadonlyArray<TabId> = [
        "inspector",
        "policies",
        "roles",
        "services",
        "simulator",
        "questions",
        "log",
      ];
      for (const tab of tabs) {
        model.dock.setTab(tab);
        assert.strictEqual(model.dock.getSnapshot().tab, tab);
      }

      assert.strictEqual(model.timeline.getSnapshot(), timeline);
      assert.strictEqual(model.explorer.getSnapshot(), explorer);
      assert.strictEqual(model.roles.getSnapshot(), roles);
      assert.strictEqual(model.simulation.getSnapshot(), simulation);
      assert.notStrictEqual(model.dock.getSnapshot(), dock);
    }));
});

describe("configure dispatches only what changed (M10)", () => {
  /** A model whose simulator has taken a Live run against `ports`, so it holds a capture. */
  const withCapture = () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decisionRecord({ evaluationId: "a", at: 100, policy: clearance, action: "read" }));
      model.configure({ ports: brokenPorts });
      model.simulation.chooseSource("Live");
      yield* ran(model);
      assert.strictEqual(model.simulation.getSnapshot().run._tag, "Ran");
      assert.isDefined(model.simulation.getSnapshot().capture);
      return model;
    });

  it.effect("M10 (a): the same ports with a new catalogue keep the simulation's capture", () =>
    Effect.gen(function* () {
      const model = yield* withCapture();

      model.configure({ ports: brokenPorts, catalogue: { policies: { canClear: clearance } } });

      assert.isDefined(model.simulation.getSnapshot().capture);
      assert.strictEqual(model.simulation.getSnapshot().sightings[0]?.label, "canClear");
    }));

  it.effect("M10 (b): new ports drop the capture taken from the old ones", () =>
    Effect.gen(function* () {
      const model = yield* withCapture();

      model.configure({ ports: otherBrokenPorts });

      assert.isUndefined(model.simulation.getSnapshot().capture);
    }));

  it.effect("M10 (c): configuring with every field identical notifies no store", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      const catalogue: Catalogue = { policies: { canRead: readPolicy }, roles: [editor] };
      model.configure({ capacity: 50, catalogue, ports: brokenPorts });
      const seen = listen(model);

      model.configure({ capacity: 50, catalogue, ports: brokenPorts });

      assert.strictEqual(seen.calls, 0);
    }));
});

describe("a capacity change empties the timeline and keeps the dock's choices (M11)", () => {
  it.effect("M11: the bound reaches the timeline", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ capacity: 5 });
      for (let i = 1; i <= 6; i++) {
        model.timeline.accept(decided(`e${i}`, i * 100, i % 2 === 0 ? writePolicy : readPolicy, "read"));
      }
      assert.strictEqual(model.dock.getSnapshot().rows.length, 5);
    }));

  it.effect("M11: a new bound empties the timeline, keeps the tab, filters and choices, and bounds the new buffer", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ capacity: 5, catalogue: { roles: [editor, viewer] } });
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      model.timeline.accept(decided("b", 200, writePolicy, "write"));
      const timeline = model.timeline;
      model.dock.setTab("policies");
      model.dock.setFilters({ ...noFilters, text: "write" });
      model.explorer.choose(writePolicy);
      model.roles.choose(viewer);

      model.configure({ capacity: 10, catalogue: { roles: [editor, viewer] } });

      assert.strictEqual(model.timeline, timeline);
      assert.strictEqual(model.timeline.getSnapshot().entries.length, 0);
      assert.strictEqual(model.dock.getSnapshot().tab, "policies");
      assert.strictEqual(model.dock.getSnapshot().filters.text, "write");
      assert.isTrue(sameAs(explorerPolicy(model), writePolicy));
      const choice = model.roles.getSnapshot().choice;
      assert.isTrue(choice._tag === "Listed" && Equal.equals(choice.value, viewer));

      for (let i = 1; i <= 6; i++) model.timeline.accept(decided(`n${i}`, i * 100, readPolicy, "read"));
      assert.strictEqual(model.timeline.getSnapshot().entries.length, 6);
    }));
});

describe("a capacity the timeline refuses or a listener interrupts is taken whole or not at all (M55, M56)", () => {
  it.effect("M55: a capacity the timeline refuses throws and changes nothing in the dock, so a later configure compares with the inputs the dock held", () =>
    Effect.gen(function* () {
      const held: Catalogue = { policies: { canRead: readPolicy }, roles: [editor] };
      const other: Catalogue = { policies: { canWrite: writePolicy }, roles: [viewer] };
      const model = yield* makeDockModel({ capacity: 5, catalogue: held });
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      const seen = listen(model);

      const refused = thrownBy(() =>
        model.configure({ capacity: -1, catalogue: other, ports: brokenPorts }),
      );

      assert.isTrue(refused.threw);
      assert.instanceOf(refused.thrown, Error);
      assert.strictEqual(
        refused.thrown instanceof Error ? refused.thrown.message : "",
        "emptyTimeline: capacity must be a non-negative integer, got -1",
      );
      assert.strictEqual(seen.calls, 0);

      model.configure({ capacity: 5, catalogue: held });

      assert.strictEqual(seen.calls, 0);
      assert.strictEqual(model.timeline.getSnapshot().entries.length, 1);
    }));

  it.effect("M56: a timeline listener that throws on a capacity change is rethrown once the dock has applied the rest of the configure", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ capacity: 5 });
      const boom = new Error("a timeline listener threw");
      model.timeline.subscribe(() => {
        throw boom;
      });
      const catalogue: Catalogue = { policies: { canRead: readPolicy }, roles: [editor] };

      const run = thrownBy(() =>
        model.configure({ capacity: 3, catalogue, diagnostics: {} }),
      );

      assert.isTrue(run.threw);
      assert.strictEqual(run.thrown, boom);
      assert.strictEqual(model.timeline.getSnapshot().capacity, 3);
      assert.deepStrictEqual(
        model.roles.getSnapshot().list.map((held) => held.name),
        ["editor"],
      );
      const { status } = model.diagnostics.getSnapshot();
      assert.isFalse(DiagnosticsStatus.$is("Off")(status));
    }));
});

describe("a clear empties every screen's reading (M12)", () => {
  it.effect("M12: clearing the timeline empties the rows, counts and rails and keeps the tab", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      model.timeline.accept(decided("b", 200, writePolicy, "write"));
      model.dock.setTab("roles");
      assert.strictEqual(model.dock.getSnapshot().rows.length, 2);

      model.timeline.clear();

      const dock = model.dock.getSnapshot();
      assert.deepStrictEqual(dock.rows, []);
      assert.deepStrictEqual(dock.counts, { decisions: 0, allows: 0, denies: 0, errors: 0, orphans: 0 });
      assert.deepStrictEqual(model.explorer.getSnapshot().sightings, []);
      assert.deepStrictEqual(model.simulation.getSnapshot().sightings, []);
      assert.strictEqual(dock.tab, "roles");
    }));
});

describe("the model's scope ends what the model started (M13, M15, M16)", () => {
  it.effect("M13: closing the model's scope interrupts a simulation run in flight, which never lands", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const scope = yield* Scope.make();
      const model = yield* Scope.provide(makeDockModel({ ports }), scope);
      model.timeline.accept(decisionRecord({ evaluationId: "a", at: 100, policy: clearance, action: "read" }));
      model.dock.replay(entryOf(model, "a"));
      model.simulation.chooseSource("Live");
      model.simulation.run("Run");
      yield* TestClock.adjust("10 millis");
      assert.strictEqual(model.simulation.getSnapshot().run._tag, "Running");

      yield* Scope.close(scope, Exit.void);
      assert.strictEqual(tally.interrupted, 1);

      yield* TestClock.adjust("1 second");
      assert.strictEqual(tally.finished, 0);
      assert.notStrictEqual(model.simulation.getSnapshot().run._tag, "Ran");
    }));

  it.effect("M15 (D-14): a new source releases the previous read and feeds the timeline from the new one", () =>
    Effect.gen(function* () {
      const a = watched([], Stream.never);
      const b = watched([decided("from-b", 100, readPolicy, "read")], Stream.never);
      const model = yield* makeDockModel({ source: a.source });
      yield* flush;
      assert.strictEqual(a.tally.started, 1);
      assert.strictEqual(a.tally.finalized, 0);

      model.configure({ source: b.source });
      yield* flush;

      assert.strictEqual(a.tally.finalized, 1);
      assert.strictEqual(b.tally.started, 1);
      assert.deepStrictEqual(
        model.timeline.getSnapshot().entries.map((entry) => entry.evaluationId),
        ["from-b"],
      );
    }));

  it.effect("M16 (D-14): closing the model's scope releases the source, and nothing it offers afterwards lands", () =>
    Effect.gen(function* () {
      const queue = yield* Queue.unbounded<StoredRecord>();
      const a = watched([], Stream.fromQueue(queue));
      const scope = yield* Scope.make();
      const model = yield* Scope.provide(makeDockModel({ source: a.source }), scope);
      yield* flush;
      assert.strictEqual(a.tally.started, 1);
      Queue.offerUnsafe(queue, decided("before", 100, readPolicy, "read"));
      yield* flush;
      assert.strictEqual(model.timeline.getSnapshot().entries.length, 1);

      yield* Scope.close(scope, Exit.void);
      assert.strictEqual(a.tally.finalized, 1);

      Queue.offerUnsafe(queue, decided("after", 200, writePolicy, "write"));
      yield* flush;
      assert.deepStrictEqual(
        model.timeline.getSnapshot().entries.map((entry) => entry.evaluationId),
        ["before"],
      );
    }));
});

describe("what configure and the stores hold back (M2 b, M10 d, M15 b-d, M17)", () => {
  it.effect("M2 (b): a catalogue given at construction fills both rails and the role list at once", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ catalogue: { policies: { canRead: readPolicy }, roles: [editor] } });

      for (const rail of [model.explorer.getSnapshot().sightings, model.simulation.getSnapshot().sightings]) {
        assert.strictEqual(rail.length, 1);
        assert.strictEqual(rail[0]?.label, "canRead");
        assert.strictEqual(rail[0]?.count, 0);
      }
      assert.deepStrictEqual(model.roles.getSnapshot().list, [editor]);
    }));

  it.effect("M10 (d): configuring with no catalogue empties the declared policies and the roles", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.configure({ catalogue: { policies: { canWrite: writePolicy }, roles: [editor] } });
      assert.strictEqual(model.explorer.getSnapshot().sightings.length, 1);

      model.configure({});

      assert.deepStrictEqual(model.explorer.getSnapshot().sightings, []);
      assert.deepStrictEqual(model.simulation.getSnapshot().sightings, []);
      assert.deepStrictEqual(model.roles.getSnapshot().list, []);
    }));

  it.effect("M17: pausing freezes what the timeline shows and tells its listeners, and moves no other store", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));
      const heard = { timeline: 0, others: 0 };
      model.timeline.subscribe(() => {
        heard.timeline += 1;
      });
      for (const store of [model.dock, model.explorer, model.simulation]) {
        store.subscribe(() => {
          heard.others += 1;
        });
      }

      model.timeline.setPaused(true);

      assert.isTrue(model.timeline.isPaused());
      assert.deepStrictEqual(heard, { timeline: 1, others: 0 });
      const frozen = model.timeline.getSnapshot();

      model.timeline.accept(decided("b", 200, writePolicy, "write"));
      assert.strictEqual(model.timeline.getSnapshot(), frozen);
      assert.strictEqual(model.dock.getSnapshot().rows.length, 1);

      model.timeline.setPaused(false);
      assert.isFalse(model.timeline.isPaused());
      assert.strictEqual(model.timeline.getSnapshot().entries.length, 2);
      assert.strictEqual(model.dock.getSnapshot().rows.length, 2);
      assert.strictEqual(model.explorer.getSnapshot().sightings.length, 2);
    }));

  it.effect("M15 (b): a configure that leaves the source alone does not read it again", () =>
    Effect.gen(function* () {
      const a = watched([], Stream.never);
      const model = yield* makeDockModel({ source: a.source });
      yield* flush;

      model.configure({ source: a.source, catalogue: { policies: { canRead: readPolicy } } });
      yield* flush;

      assert.deepStrictEqual(a.tally, { started: 1, finalized: 0 });
    }));

  it.effect("M15 (c): a new bound reads the same source again, into the new buffer", () =>
    Effect.gen(function* () {
      const a = watched([decided("x", 100, readPolicy, "read")], Stream.never);
      const model = yield* makeDockModel({ source: a.source, capacity: 5 });
      yield* flush;
      assert.strictEqual(model.timeline.getSnapshot().entries.length, 1);

      model.configure({ source: a.source, capacity: 10 });
      yield* flush;

      assert.deepStrictEqual(a.tally, { started: 2, finalized: 1 });
      assert.deepStrictEqual(
        model.timeline.getSnapshot().entries.map((entry) => entry.evaluationId),
        ["x"],
      );
    }));

  it.effect("M15 (d): configuring with no source releases the read and keeps what it delivered", () =>
    Effect.gen(function* () {
      const a = watched([decided("x", 100, readPolicy, "read")], Stream.never);
      const model = yield* makeDockModel({ source: a.source });
      yield* flush;

      model.configure({});
      yield* flush;

      assert.deepStrictEqual(a.tally, { started: 1, finalized: 1 });
      assert.strictEqual(model.timeline.getSnapshot().entries.length, 1);
    }));
});

describe("two docks share nothing (M14)", () => {
  it.effect("M14: a record accepted by one model is absent from the other", () =>
    Effect.gen(function* () {
      const one = yield* makeDockModel();
      const other = yield* makeDockModel();

      one.timeline.accept(decided("a", 100, readPolicy, "read"));

      assert.strictEqual(one.dock.getSnapshot().rows.length, 1);
      assert.strictEqual(other.timeline.getSnapshot().entries.length, 0);
      assert.deepStrictEqual(other.dock.getSnapshot().rows, []);
      assert.deepStrictEqual(other.explorer.getSnapshot().sightings, []);
      assert.deepStrictEqual(other.simulation.getSnapshot().sightings, []);
    }));
});

describe("the stores never disagree about the timeline (P1, INV-QD-296)", () => {
  const records: ReadonlyArray<StoredRecord> = [
    decided("p0", 100, readPolicy, "read"),
    decided("p1", 200, writePolicy, "write"),
    decisionRecord({
      evaluationId: "p2",
      at: 300,
      environment: "Client",
      policy: readPolicy,
      outcome: new Decided({ decision: deny({ evaluationId: "p2" }) }),
    }),
    failedRecord({ evaluationId: "p3", at: 400 }),
    decisionRecord({
      evaluationId: "p4",
      at: 500,
      policy: hasRole("admin"),
      outcome: new Decided({ decision: allow({ evaluationId: "p4" }) }),
    }),
    obligationRecord({ evaluationId: "p0", at: 101 }),
  ];
  const catalogues: ReadonlyArray<Catalogue> = [
    {},
    { policies: { canRead: readPolicy } },
    { policies: { canWrite: writePolicy, canAdmin: hasRole("admin") }, roles: [editor] },
  ];

  type Command =
    | { readonly kind: "accept"; readonly record: number }
    | { readonly kind: "clear" }
    | { readonly kind: "setPaused"; readonly paused: boolean }
    | { readonly kind: "configure"; readonly catalogue: number };

  const commands = FastCheck.oneof(
    FastCheck.integer({ min: 0, max: records.length - 1 }).map((record): Command => ({ kind: "accept", record })),
    FastCheck.constant<Command>({ kind: "clear" }),
    FastCheck.boolean().map((paused): Command => ({ kind: "setPaused", paused })),
    FastCheck.integer({ min: 0, max: catalogues.length - 1 }).map(
      (catalogue): Command => ({ kind: "configure", catalogue }),
    ),
  );

  it("P1: after any sequence of accept, clear, setPaused and configure, counts and both rails read the timeline the dock shows", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.array(commands, { maxLength: 30 }), (sequence) => {
        Effect.runSync(
          Effect.scoped(
            Effect.gen(function* () {
              const model = yield* makeDockModel();
              let catalogue: Catalogue | undefined;

              const agree = () => {
                const shown = model.timeline.getSnapshot();
                const expected = catalogueOf(shown, catalogue);
                assert.deepStrictEqual(model.dock.getSnapshot().counts, countsOf(shown.entries));
                assert.deepStrictEqual(model.explorer.getSnapshot().sightings, expected);
                assert.deepStrictEqual(model.simulation.getSnapshot().sightings, expected);
              };

              agree();
              for (const command of sequence) {
                if (command.kind === "accept") {
                  const record = records[command.record];
                  if (record === undefined) throw new Error("no such record");
                  model.timeline.accept(record);
                } else if (command.kind === "clear") {
                  model.timeline.clear();
                } else if (command.kind === "setPaused") {
                  model.timeline.setPaused(command.paused);
                } else {
                  catalogue = catalogues[command.catalogue];
                  model.configure({ catalogue });
                }
                agree();
              }
            }),
          ),
        );
      }),
    );
  });
});

describe("the diagnostics store (M18..M27)", () => {
  it.effect("M18: a throwing collector stops the diagnostics store visibly, keeps the last reading, and restart() resumes it", () =>
    Effect.gen(function* () {
      let fail = false;
      const { collector } = makeCollectorDouble(() => {
        if (fail) throw new Error("the collector blew up");
        return { calls: [], dropped: 0, capacity: 10 };
      });
      const model = yield* makeDockModel({ diagnostics: { collector } });
      const live = model.diagnostics.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(live.status));
      assert.deepStrictEqual(live.reading.portCalls, { calls: [], dropped: 0, capacity: 10 });
      const kept = live.reading;

      fail = true;
      yield* TestClock.adjust("2 seconds");

      const stopped = model.diagnostics.getSnapshot();
      if (!DiagnosticsStatus.$is("Stopped")(stopped.status)) return assert.fail("expected Stopped");
      assert.isTrue(stopped.status.sampled);
      assert.include(stopped.status.reason, "the collector blew up");
      assert.strictEqual(stopped.reading, kept);

      fail = false;
      model.diagnostics.restart();
      assert.isTrue(DiagnosticsStatus.$is("Live")(model.diagnostics.getSnapshot().status));
    }));

  /** A layer that counts its builds and releases, taking `acquire` to build. */
  const countedLayer = (acquire: Effect.Effect<void> = Effect.void) => {
    const counts = { builds: 0, releases: 0 };
    const layer = Layer.effectDiscard(
      Effect.acquireRelease(
        Effect.andThen(
          acquire,
          Effect.sync(() => {
            counts.builds += 1;
          }),
        ),
        () =>
          Effect.sync(() => {
            counts.releases += 1;
          }),
      ),
    );
    return { counts, layer };
  };

  /** Settles every fiber, then steps the clock. */
  const step = (duration: Duration.Input) =>
    Effect.gen(function* () {
      yield* settleTurns;
      yield* TestClock.adjust(duration);
      yield* settleTurns;
    });

  /** The status tag and the activity list of every notification of the seventh store, in order. */
  const recordingOf = (model: DockModel) => {
    const seen: Array<{ readonly tag: string; readonly activity: ReadonlyArray<unknown> }> = [];
    model.diagnostics.subscribe(() => {
      const { status, reading } = model.diagnostics.getSnapshot();
      seen.push({ tag: status._tag, activity: reading.activity });
    });
    return seen;
  };

  it.effect("M19: an empty options object is Live at once with hydration read, and no options is Off", () =>
    Effect.gen(function* () {
      const live = yield* makeDockModel({ diagnostics: {} });
      const { status, reading } = live.diagnostics.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(status));
      assert.isDefined(reading.hydration);

      const off = yield* makeDockModel();
      assert.isTrue(DiagnosticsStatus.$is("Off")(off.diagnostics.getSnapshot().status));
      assert.strictEqual(off.diagnostics.getSnapshot().reading, noDiagnostics);
    }));

  it.effect("M20: an asynchronous layer leaves the store Starting after the build, then Live with the wiring read", () =>
    Effect.gen(function* () {
      const { layer } = countedLayer(Effect.sleep("1 second"));
      const model = yield* makeDockModel({ diagnostics: { layer } });
      const early = model.diagnostics.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Starting")(early.status));
      assert.strictEqual(early.reading, noDiagnostics);

      yield* step("1 second");

      const late = model.diagnostics.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(late.status));
      assert.strictEqual(late.reading.wiring._tag, "Read");
    }));

  it.effect("M21: with no reading supplied the store keeps one snapshot, and a sample that changed nothing notifies nothing", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ diagnostics: {} });
      const first = model.diagnostics.getSnapshot();
      assert.strictEqual(model.diagnostics.getSnapshot(), first);
      const heard = { calls: 0 };
      model.diagnostics.subscribe(() => {
        heard.calls += 1;
      });

      yield* step("10 seconds");

      assert.strictEqual(heard.calls, 0);
      assert.strictEqual(model.diagnostics.getSnapshot(), first);
    }));

  it.effect("M22: a supplied field wins over the sampled one, the rest are sampled, and the merge is one reference", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ diagnostics: {}, reading: { activity: suppliedActivity } });

      const { reading } = model.diagnostics.getSnapshot();
      assert.strictEqual(reading.activity, suppliedActivity);
      assert.isDefined(reading.hydration);
      assert.strictEqual(model.diagnostics.getSnapshot(), model.diagnostics.getSnapshot());
    }));

  it.effect("M23: a reading-only configure notifies once and never restarts the poll", () =>
    Effect.gen(function* () {
      const { counts, layer } = countedLayer();
      const diagnostics = { layer };
      const reading = { activity: suppliedActivity };
      const model = yield* makeDockModel({ diagnostics });
      const heard = { calls: 0 };
      model.diagnostics.subscribe(() => {
        heard.calls += 1;
      });

      model.configure({ diagnostics, reading });
      assert.strictEqual(heard.calls, 1);
      assert.strictEqual(counts.builds, 1);

      model.configure({ diagnostics, reading });
      assert.strictEqual(heard.calls, 1);
      assert.strictEqual(counts.builds, 1);
      assert.strictEqual(counts.releases, 0);
    }));

  it.effect("M24: a fresh diagnostics literal holding the same field references notifies no store and builds nothing", () =>
    Effect.gen(function* () {
      const { counts, layer } = countedLayer();
      const questions = () => [];
      const { collector } = makeCollectorDouble();
      const model = yield* makeDockModel({ diagnostics: { layer, collector, intervalMillis: 5_000 }, questions });
      const seen = listen(model);
      model.diagnostics.subscribe(() => {
        seen.calls += 1;
      });

      model.configure({ diagnostics: { layer, collector, intervalMillis: 5_000 }, questions });
      yield* step("1 second");

      assert.strictEqual(seen.calls, 0);
      assert.strictEqual(counts.builds, 1);
    }));

  it.effect("M25: configuring diagnostics away reads Off and releases the layer, and defined again goes Starting then Live", () =>
    Effect.gen(function* () {
      const { counts, layer } = countedLayer();
      const model = yield* makeDockModel({ diagnostics: { layer } });

      model.configure({});

      const off = model.diagnostics.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Off")(off.status));
      assert.strictEqual(off.reading, noDiagnostics);
      assert.strictEqual(counts.releases, 1);

      const seen = recordingOf(model);
      model.configure({ diagnostics: { layer } });

      assert.deepStrictEqual(
        seen.map((one) => one.tag),
        ["Starting", "Live"],
      );
    }));

  it.effect("M26: closing the scope records no Stopped and releases the layer, and a rebuilt model starts at Starting", () =>
    Effect.gen(function* () {
      const first = countedLayer();
      const scope = yield* Scope.make();
      const model = yield* Scope.provide(makeDockModel({ diagnostics: { layer: first.layer } }), scope);
      const seen = recordingOf(model);

      yield* Scope.close(scope, Exit.void);

      assert.deepStrictEqual(seen, []);
      assert.strictEqual(first.counts.releases, 1);

      const slow = countedLayer(Effect.sleep("1 second"));
      const rebuilt = yield* makeDockModel({ diagnostics: { layer: slow.layer } });
      const early = rebuilt.diagnostics.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Starting")(early.status));
      assert.strictEqual(early.reading, noDiagnostics);

      yield* step("1 second");
      assert.isTrue(DiagnosticsStatus.$is("Live")(rebuilt.diagnostics.getSnapshot().status));
    }));

  it.effect("M27: replacing a poll field and the reading together never pairs the new reading with the old run's status", () =>
    Effect.gen(function* () {
      const first = makeCollectorDouble().collector;
      const answer = { calls: [], dropped: 3, capacity: 10 };
      const second = makeCollectorDouble(() => answer).collector;
      const model = yield* makeDockModel({ diagnostics: { collector: first } });
      const seen = recordingOf(model);

      model.configure({ diagnostics: { collector: second }, reading: { activity: suppliedActivity } });

      const { status, reading } = model.diagnostics.getSnapshot();
      assert.isTrue(DiagnosticsStatus.$is("Live")(status));
      assert.strictEqual(reading.activity, suppliedActivity);
      assert.deepStrictEqual(reading.portCalls, answer);
      assert.deepStrictEqual(
        seen.map((one) => one.tag),
        ["Starting", "Live"],
      );
      for (const one of seen) assert.strictEqual(one.activity, suppliedActivity);
    }));

  it.effect("M28: with no reading supplied the store's snapshot is the feed's own, even after one was supplied", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ reading: { activity: suppliedActivity } });
      assert.notStrictEqual(model.diagnostics.getSnapshot(), diagnosticsOff);

      model.configure({});

      assert.strictEqual(model.diagnostics.getSnapshot(), diagnosticsOff);
    }));

  it.effect(
    "a model whose scope closed merges no reading a later configure hands it",
    () =>
      Effect.gen(function* () {
        const scope = yield* Scope.make();
        const model = yield* Scope.provide(
          makeDockModel({ reading: { activity: suppliedActivity } }),
          scope,
        );
        yield* Scope.close(scope, Exit.void);
        const before = model.diagnostics.getSnapshot();
        let heard = 0;
        model.diagnostics.subscribe(() => {
          heard += 1;
        });

        model.configure({ reading: { activity: activityOf(7) } });

        assert.strictEqual(model.diagnostics.getSnapshot(), before);
        assert.strictEqual(heard, 0);
      }),
  );

  const diagnosticsMoves: ReadonlyArray<KeyRow> = [
    {
      field: "the feed's snapshot",
      heard: Effect.gen(function* () {
        const { collector } = makeCollectorDouble((call) => ({
          calls: [],
          dropped: call,
          capacity: 10,
        }));
        const model = yield* makeDockModel({ diagnostics: { collector } });
        yield* settleTurns;
        const heard = heardOn(model.diagnostics);

        yield* tick;

        return heard.calls;
      }),
    },
    {
      field: "the supplied reading",
      heard: Effect.gen(function* () {
        const diagnostics = {};
        const model = yield* makeDockModel({
          diagnostics,
          reading: { activity: activityOf(1) },
        });
        const heard = heardOn(model.diagnostics);
        const told: Array<unknown> = [];
        model.diagnostics.subscribe(() => {
          told.push(model.diagnostics.getSnapshot().reading.activity);
        });

        model.configure({ diagnostics, reading: { activity: activityOf(2) } });

        assert.deepStrictEqual(told, [activityOf(2)]);
        return heard.calls;
      }),
    },
  ];

  const diagnosticsQuiet: ReadonlyArray<KeyRow> = [
    {
      field: "a guard added to the registry",
      heard: Effect.gen(function* () {
        const double = makeGateRegistryDouble();
        const model = yield* makeDockModel({ diagnostics: {}, gates: double.registry });
        yield* settleTurns;
        const heard = heardOn(model.diagnostics);

        double.add(guard("a", readPolicy));
        yield* settleTurns;

        return heard.calls;
      }),
    },
    {
      field: "a new questions input",
      heard: Effect.gen(function* () {
        const diagnostics = {};
        const reading = { activity: activityOf(1) };
        const model = yield* makeDockModel({ diagnostics, reading });
        const heard = heardOn(model.diagnostics);

        const questions = () => [{ policy: readPolicy }];
        model.configure({ diagnostics, questions, reading });
        yield* settleTurns;

        return heard.calls;
      }),
    },
  ];

  it.effect(
    "the diagnostics store moves once per key field and not for gates or questions",
    () =>
      Effect.gen(function* () {
        for (const row of diagnosticsMoves) {
          assert.strictEqual(yield* row.heard, 1, row.field);
        }
        for (const row of diagnosticsQuiet) {
          assert.strictEqual(yield* row.heard, 0, row.field);
        }
      }),
  );
});

describe("the timeline's status (M29)", () => {
  it.effect(
    "M29: timelineStatus follows the timeline feed: a dying source reads Stopped and restart returns it to Reading",
    () =>
      Effect.gen(function* () {
        const at = (evaluationId: string, when: number): StoredRecord =>
          decisionRecord({ evaluationId, at: when });
        const tally = { reads: 0 };
        const source: Source = {
          read: Effect.sync(() => {
            tally.reads += 1;
            return tally.reads === 1
              ? { backlog: [at("x", 100)], live: Stream.die(new Error("live boom")) }
              : { backlog: [at("x", 100), at("y", 200)], live: Stream.empty };
          }),
        };
        const model = yield* makeDockModel({ source });
        yield* flush;
        assert.strictEqual(model.timelineStatus.getSnapshot()._tag, "Stopped");

        model.timelineStatus.restart();
        yield* flush;

        assert.strictEqual(model.timelineStatus.getSnapshot()._tag, "Reading");
        assert.deepStrictEqual(
          model.timeline.getSnapshot().entries.map((entry) => entry.evaluationId),
          ["x", "y"],
        );
      }),
  );

  it.effect(
    "M30: a model with no source, configured with nothing three times, starts no read until a source is given",
    () =>
      Effect.gen(function* () {
        const { source, tally } = watched([], Stream.empty);
        const model = yield* makeDockModel();
        const before = model.timeline.getSnapshot();

        for (let i = 0; i < 3; i += 1) {
          model.configure({});
          yield* flush;
          assert.strictEqual(model.timeline.getSnapshot(), before);
        }
        assert.strictEqual(tally.started, 0);

        model.configure({ source });
        yield* flush;

        assert.strictEqual(tally.started, 1);
      }),
  );
});

describe("the questions store (M32, M32 b, M34, M36, M47, P2)", () => {
  it.effect("M32: the gates view says absent, empty or listed, and the questions view says unsampled, absent, empty or rows", () =>
    Effect.gen(function* () {
      const asked = { diagnostics: {}, questions: () => [{ policy: readPolicy }] };

      const none = yield* makeDockModel(asked);
      yield* settleTurns;
      assert.strictEqual(none.questions.getSnapshot().gates._tag, "Absent");
      assert.deepStrictEqual(askingIds(none.questions.getSnapshot()), [[]]);

      const empty = yield* makeDockModel({ ...asked, gates: makeGateRegistryDouble().registry });
      yield* settleTurns;
      assert.strictEqual(empty.questions.getSnapshot().gates._tag, "Empty");

      const one = makeGateRegistryDouble([guard("a", readPolicy)]);
      const listed = yield* makeDockModel({ ...asked, gates: one.registry });
      yield* settleTurns;
      const view = listed.questions.getSnapshot();
      assert.strictEqual(view.gates._tag, "Listed");
      assert.strictEqual(view.instances, one.registry.instances());

      const off = yield* makeDockModel();
      assert.strictEqual(off.questions.getSnapshot().questions._tag, "Absent");
      assert.strictEqual(off.questions.getSnapshot().gates._tag, "Absent");

      const supplied = yield* makeDockModel({ reading: { questions: [] } });
      assert.strictEqual(supplied.questions.getSnapshot().questions._tag, "Empty");
    }));

  it.effect("M32 b: a poll that has not sampled reads Unsampled, and Absent once it has with no questions to read", () =>
    Effect.gen(function* () {
      const layer = Layer.effectDiscard(Effect.sleep("1 second"));
      const model = yield* makeDockModel({ diagnostics: { layer } });
      assert.isTrue(DiagnosticsStatus.$is("Starting")(model.diagnostics.getSnapshot().status));
      assert.strictEqual(model.questions.getSnapshot().questions._tag, "Unsampled");

      yield* settleTurns;
      yield* TestClock.adjust("1 second");
      yield* settleTurns;

      assert.isTrue(DiagnosticsStatus.$is("Live")(model.diagnostics.getSnapshot().status));
      assert.strictEqual(model.questions.getSnapshot().questions._tag, "Absent");
    }));

  it.effect("M34: a supplied question list keeps one snapshot while the poll goes from Starting to Live", () =>
    Effect.gen(function* () {
      const layer = Layer.effectDiscard(Effect.sleep("1 second"));
      const model = yield* makeDockModel({ diagnostics: { layer }, reading: { questions: [] } });
      assert.isTrue(DiagnosticsStatus.$is("Starting")(model.diagnostics.getSnapshot().status));
      const first = model.questions.getSnapshot();
      assert.strictEqual(first.questions._tag, "Empty");
      const heard = { calls: 0 };
      model.questions.subscribe(() => {
        heard.calls += 1;
      });

      yield* settleTurns;
      yield* TestClock.adjust("1 second");
      yield* settleTurns;

      assert.isTrue(DiagnosticsStatus.$is("Live")(model.diagnostics.getSnapshot().status));
      assert.strictEqual(model.questions.getSnapshot(), first);
      assert.strictEqual(heard.calls, 0);
    }));

  it.effect("M36: a model whose scope closed reads no registry a later configure hands it, and none it held", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b", readPolicy)]);
      const scope = yield* Scope.make();
      const model = yield* Scope.provide(makeDockModel({ gates: a.registry, reading: { questions: [] } }), scope);
      yield* Scope.close(scope, Exit.void);
      const readByA = a.reads();

      // A changed gate list and a changed reading, both handed over after the scope
      // closed.
      model.configure({ gates: b.registry, reading: { questions: [{ policy: readPolicy }] } });
      model.configure({ gates: a.registry, reading: { questions: [{ policy: writePolicy }] } });

      assert.strictEqual(b.reads(), 0);
      assert.strictEqual(a.reads(), readByA);
    }));

  it.effect("M47: one configure publishes one snapshot and reads no registry the host has handed away", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b", readPolicy)]);
      const model = yield* makeDockModel({ gates: a.registry, reading: { questions: [{ policy: readPolicy }] } });
      const seen: Array<ReadonlyArray<ReadonlyArray<string>>> = [];
      model.questions.subscribe(() => {
        seen.push(askingIds(model.questions.getSnapshot()));
      });
      const readByA = a.reads();

      model.configure({ gates: b.registry, reading: { questions: [{ policy: readPolicy }, { policy: writePolicy }] } });

      assert.deepStrictEqual(seen, [[["b"], []]]);
      assert.strictEqual(a.reads(), readByA);
    }));

  type Command =
    | { readonly kind: "add"; readonly id: number; readonly policy: number; readonly resource: number; readonly state: number }
    | { readonly kind: "remove"; readonly id: number }
    | { readonly kind: "update"; readonly id: number; readonly state: number }
    | { readonly kind: "ask"; readonly questions: ReadonlyArray<number> }
    | { readonly kind: "tick" };

  const policies: ReadonlyArray<Policy> = [readPolicy, writePolicy, hasRole("admin")];
  // One state outside the vocabulary, so the unknown path runs through the join.
  const states: ReadonlyArray<string> = ["Allowed", "Denied", "Failed", "Pending", "Rechecking", "Suspended"];
  const GUARDS = 4;
  const RESOURCES = 3;

  const nth = <A>(pool: ReadonlyArray<A>, index: number): A => {
    const one = pool[index];
    if (one === undefined) throw new Error(`no pool entry ${index}`);
    return one;
  };
  const resourceOf = (index: number): Resource | undefined => (index === 0 ? undefined : { id: `r${index}` });
  const questionOf = (index: number): AskedQuestionLike => ({
    policy: nth(policies, index % policies.length),
    resource: resourceOf(Math.floor(index / policies.length)),
  });

  const pick = (size: number) => FastCheck.integer({ min: 0, max: size - 1 });
  const commands = FastCheck.oneof(
    FastCheck.record({
      id: pick(GUARDS),
      policy: pick(policies.length),
      resource: pick(RESOURCES),
      state: pick(states.length),
    }).map((fields): Command => ({ kind: "add", ...fields })),
    pick(GUARDS).map((id): Command => ({ kind: "remove", id })),
    FastCheck.record({ id: pick(GUARDS), state: pick(states.length) }).map(
      (fields): Command => ({ kind: "update", ...fields }),
    ),
    FastCheck.array(pick(policies.length * RESOURCES), { maxLength: 3 }).map(
      (questions): Command => ({ kind: "ask", questions }),
    ),
    FastCheck.constant<Command>({ kind: "tick" }),
  );

  it.effect("P2: whatever the registry and the poll do, each snapshot's rows are the questions and guards of one moment", () =>
    Effect.gen(function* () {
      const sequences = FastCheck.sample(FastCheck.array(commands, { maxLength: 25 }), { numRuns: 60, seed: 49 });

      for (const sequence of sequences) {
        const where = JSON.stringify(sequence);
        let asked: ReadonlyArray<AskedQuestionLike> = [];
        // What the thunk answered when it was last read, recorded before the feed publishes it.
        let answered: ReadonlyArray<AskedQuestionLike> = [];
        const double = makeGateRegistryDouble();
        const scope = yield* Scope.make();
        const model = yield* Scope.provide(
          makeDockModel({
            diagnostics: {},
            questions: () => {
              answered = asked;
              return asked;
            },
            gates: double.registry,
          }),
          scope,
        );

        // Independent of `joinQuestions`: `Equal.equals` over policy and resource, in registry order.
        const oracle = (
          questions: ReadonlyArray<AskedQuestionLike>,
          guards: ReadonlyArray<GateInstanceLike>,
        ): ReadonlyArray<ReadonlyArray<string>> =>
          questions.map((question) =>
            guards
              .filter((one) => Equal.equals(one.policy, question.policy) && Equal.equals(one.resource, question.resource))
              .map((one) => one.id),
          );

        /** What is wrong with the snapshot now, read against both sources at this very moment. */
        const disagreements = (moment: string): ReadonlyArray<string> => {
          const snapshot = model.questions.getSnapshot();
          const guards = double.registry.instances();
          const problems: Array<string> = [];
          if (snapshot.instances !== guards) problems.push(`${moment}: instances is not the registry's own array`);
          const rows = JSON.stringify(askingIds(snapshot));
          const expected = JSON.stringify(oracle(answered, guards));
          if (rows !== expected) problems.push(`${moment}: rows ${rows}, oracle ${expected}`);
          const gatesTag = guards.length === 0 ? "Empty" : "Listed";
          if (snapshot.gates._tag !== gatesTag) problems.push(`${moment}: gates view ${snapshot.gates._tag}, wanted ${gatesTag}`);
          return problems;
        };

        const heard: Array<string> = [];
        model.questions.subscribe(() => {
          heard.push(...disagreements("on notify"));
        });
        const agrees = (moment: string) => {
          assert.deepStrictEqual(disagreements(moment), [], where);
          assert.deepStrictEqual(heard, [], where);
        };

        yield* settleTurns;
        agrees("start");
        for (const command of sequence) {
          const before = model.questions.getSnapshot();
          if (command.kind === "add") {
            double.add(
              guard(`g${command.id}`, nth(policies, command.policy), {
                state: nth(states, command.state),
                resource: resourceOf(command.resource),
              }),
            );
            yield* settleTurns;
          } else if (command.kind === "remove") {
            double.remove(`g${command.id}`);
            yield* settleTurns;
          } else if (command.kind === "update") {
            double.update(`g${command.id}`, nth(states, command.state));
            yield* settleTurns;
          } else if (command.kind === "ask") {
            asked = command.questions.map(questionOf);
            yield* tick;
          } else {
            yield* tick;
            assert.strictEqual(model.questions.getSnapshot(), before, `a tick that changed nothing keeps the reference: ${where}`);
          }
          agrees(command.kind);
        }

        yield* Scope.close(scope, Exit.void);
        assert.strictEqual(double.listeners(), 0, `closing the scope released the registry subscription: ${where}`);
      }
    }));

  const questionsMoves: ReadonlyArray<KeyRow> = [
    {
      field: "the gates feed's snapshot",
      heard: Effect.gen(function* () {
        const double = makeGateRegistryDouble();
        const model = yield* makeDockModel({
          gates: double.registry,
          reading: { questions: [{ policy: readPolicy }] },
        });
        const heard = heardOn(model.questions);

        double.add(guard("a", readPolicy));

        return heard.calls;
      }),
    },
    {
      field: "the supplied questions",
      heard: Effect.gen(function* () {
        const model = yield* makeDockModel({ reading: { questions: [] } });
        const heard = heardOn(model.questions);
        const told: Array<string> = [];
        model.diagnostics.subscribe(() => {
          told.push(model.questions.getSnapshot().questions._tag);
        });

        model.configure({ reading: { questions: [{ policy: readPolicy }] } });

        assert.deepStrictEqual(told, ["Rows"]);
        return heard.calls;
      }),
    },
    {
      field: "the unsampled flag",
      heard: Effect.gen(function* () {
        const layer = Layer.effectDiscard(Effect.sleep("1 second"));
        const model = yield* makeDockModel({ diagnostics: { layer } });
        const heard = heardOn(model.questions);

        yield* settleTurns;
        yield* TestClock.adjust("1 second");
        yield* settleTurns;

        return heard.calls;
      }),
    },
  ];

  const questionsQuiet: ReadonlyArray<KeyRow> = [
    {
      field: "the wiring",
      heard: Effect.gen(function* () {
        const diagnostics = {};
        const model = yield* makeDockModel({
          diagnostics,
          reading: { wiring: wiringNamed("one") },
        });
        const heard = heardOn(model.questions);

        model.configure({ diagnostics, reading: { wiring: wiringNamed("two") } });

        return heard.calls;
      }),
    },
  ];

  it.effect(
    "the questions store moves once per key field",
    () =>
      Effect.gen(function* () {
        for (const row of questionsMoves) {
          assert.strictEqual(yield* row.heard, 1, row.field);
        }
        for (const row of questionsQuiet) {
          assert.strictEqual(yield* row.heard, 0, row.field);
        }
      }),
  );
});

describe("the join of the three feeds (J1..J8)", () => {
  /** What each row claims about who is asking; `undefined` is no claim at all. */
  const claims = (snapshot: QuestionsSnapshot): ReadonlyArray<ReadonlyArray<GateInstanceLike> | undefined> =>
    snapshot.questions._tag === "Rows" ? snapshot.questions.rows.map((row) => row.asking) : [];

  /** The reason a `Failed` questions view carries, or `undefined` when the view is any other. */
  const failedReason = (snapshot: QuestionsSnapshot): string | undefined =>
    snapshot.questions._tag === "Failed" ? snapshot.questions.reason : undefined;

  const down = (): ReadonlyArray<AskedQuestionLike> => {
    throw new Error("questions down");
  };

  it.effect("J1: the join moves first on either side, so a host listener reads a joined snapshot", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble();
      const model = yield* makeDockModel({ gates: double.registry, reading: { questions: [{ policy: readPolicy }] } });

      const onRegistry: Array<ReadonlyArray<ReadonlyArray<string>>> = [];
      double.registry.subscribe(() => {
        onRegistry.push(askingIds(model.questions.getSnapshot()));
      });
      double.add(guard("a", readPolicy));
      assert.deepStrictEqual(onRegistry, [[["a"]]]);

      const onDiagnostics: Array<ReadonlyArray<ReadonlyArray<string>>> = [];
      model.diagnostics.subscribe(() => {
        onDiagnostics.push(askingIds(model.questions.getSnapshot()));
      });
      model.configure({
        gates: double.registry,
        reading: { questions: [{ policy: readPolicy }, { policy: writePolicy }] },
      });
      assert.deepStrictEqual(onDiagnostics, [[["a"], []]]);
    }));

  it.effect("J2: a questions input that throws is stated as Failed, and the poll stays Live and keeps sampling", () =>
    Effect.gen(function* () {
      const probe = makeCollectorDouble();
      const model = yield* makeDockModel({ diagnostics: { collector: probe.collector }, questions: down });
      yield* settleTurns;

      assert.include(failedReason(model.questions.getSnapshot()) ?? "", "questions down");

      yield* tick;
      yield* tick;

      assert.isTrue(DiagnosticsStatus.$is("Live")(model.diagnostics.getSnapshot().status));
      assert.strictEqual(probe.state.calls, 3);
      assert.include(failedReason(model.questions.getSnapshot()) ?? "", "questions down");
    }));

  it.effect("J3: a questions input with no diagnostics is read at once", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ questions: () => [{ policy: readPolicy }] });

      assert.isTrue(DiagnosticsStatus.$is("Off")(model.diagnostics.getSnapshot().status));
      assert.deepStrictEqual(askingIds(model.questions.getSnapshot()), [[]]);
    }));

  it.effect("J4: a Starting poll withholds the thunk's rows but states its failure", () =>
    Effect.gen(function* () {
      const layer = Layer.effectDiscard(Effect.sleep("1 second"));

      const answering = yield* makeDockModel({ diagnostics: { layer }, questions: () => [{ policy: readPolicy }] });
      assert.isTrue(DiagnosticsStatus.$is("Starting")(answering.diagnostics.getSnapshot().status));
      assert.strictEqual(answering.questions.getSnapshot().questions._tag, "Unsampled");

      const throwing = yield* makeDockModel({ diagnostics: { layer }, questions: down });
      assert.isTrue(DiagnosticsStatus.$is("Starting")(throwing.diagnostics.getSnapshot().status));
      assert.strictEqual(throwing.questions.getSnapshot().questions._tag, "Failed");
    }));

  it.effect("J5: a supplied list wins over the thunk, whose failure is then not stated", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel({ questions: down, reading: { questions: [{ policy: writePolicy }] } });

      const view = model.questions.getSnapshot().questions;
      assert.strictEqual(view._tag, "Rows");
      if (view._tag === "Rows") {
        assert.strictEqual(view.rows.length, 1);
        assert.isTrue(Equal.equals(view.rows[0]?.question.policy, writePolicy));
      }
    }));

  it.effect("J6: diagnostics.intervalMillis paces the questions input", () =>
    Effect.gen(function* () {
      const read = { calls: 0 };
      yield* makeDockModel({
        diagnostics: { intervalMillis: 500 },
        questions: () => {
          read.calls += 1;
          return [];
        },
      });
      yield* settleTurns;
      assert.strictEqual(read.calls, 1);

      yield* TestClock.adjust("499 millis");
      yield* settleTurns;
      assert.strictEqual(read.calls, 1);

      yield* TestClock.adjust("1 millis");
      yield* settleTurns;
      assert.strictEqual(read.calls, 2);
    }));

  it.effect("J7: a failed registry still reaches the rows, as no claim", () =>
    Effect.gen(function* () {
      const double = makeGateRegistryDouble([guard("a", readPolicy)]);
      double.failReads(new Error("registry down"));

      const model = yield* makeDockModel({ gates: double.registry, questions: () => [{ policy: readPolicy }] });
      yield* settleTurns;

      const snapshot = model.questions.getSnapshot();
      assert.strictEqual(snapshot.gates._tag, "Failed");
      assert.deepStrictEqual(claims(snapshot), [undefined]);
    }));

  it.effect("J8: one configure that moves the registry, the thunk and the reading publishes one join", () =>
    Effect.gen(function* () {
      const a = makeGateRegistryDouble([guard("a", readPolicy)]);
      const b = makeGateRegistryDouble([guard("b", readPolicy)]);
      const diagnostics = {};
      const model = yield* makeDockModel({ diagnostics, gates: a.registry, questions: () => [{ policy: readPolicy }] });
      yield* settleTurns;
      const seen: Array<ReadonlyArray<ReadonlyArray<string>>> = [];
      model.questions.subscribe(() => {
        seen.push(askingIds(model.questions.getSnapshot()));
      });

      model.configure({
        diagnostics,
        gates: b.registry,
        questions: () => [{ policy: readPolicy }, { policy: writePolicy }],
        reading: { activity: [{ port: "AttributeResolver", calls: 1, retries: 0, timeouts: 0, translationCalls: 0 }] },
      });

      assert.deepStrictEqual(seen, [[["b"], []]]);
    }));
});

describe("the services store", () => {
  it.effect("M48: the services store holds the port cards of the shown reading from the first snapshot", () =>
    Effect.gen(function* () {
      const supplied = yield* makeDockModel({
        reading: {
          wiring: WiringRead.Read({
            report: {
              ports: [
                {
                  port: "AttributeResolver",
                  name: "attributeResolverFromRecord",
                  required: true,
                  present: true,
                  defaulted: false,
                  consequence: "an attribute policy denies",
                },
              ],
              cache: { present: true, size: 2 },
            },
          }),
          activity: [{ port: "AttributeResolver", calls: 4, retries: 0, timeouts: 0, translationCalls: 0 }],
        },
      });
      const view = supplied.services.getSnapshot();
      assert.strictEqual(view._tag, "Read");
      if (view._tag === "Read") {
        assert.strictEqual(view.rows[0]?.port, "AttributeResolver");
        assert.strictEqual(view.rows[0]?.activity, "4 calls");
        assert.strictEqual(view.cache, "2 completed entries");
      }

      const bare = yield* makeDockModel();
      assert.strictEqual(bare.services.getSnapshot()._tag, "NotHanded");

      const starting = yield* makeDockModel({ diagnostics: { layer: Layer.effectDiscard(Effect.never) } });
      assert.strictEqual(starting.services.getSnapshot()._tag, "Withheld");
    }));

  it.effect("M53: the Starting->Live flip recomputes the services view, with every input supplied", () =>
    Effect.gen(function* () {
      const layer = Layer.effectDiscard(Effect.sleep("1 second"));
      const reading = { wiring: wiringNamed("one"), activity: [], portCalls: logOf() };
      const model = yield* makeDockModel({ diagnostics: { layer }, reading });
      assert.isTrue(DiagnosticsStatus.$is("Starting")(model.diagnostics.getSnapshot().status));
      const before = model.services.getSnapshot();
      assert.strictEqual(rowOf(model).activity, "no activity reading");

      yield* settleTurns;
      yield* TestClock.adjust("1 second");
      yield* settleTurns;

      assert.isTrue(DiagnosticsStatus.$is("Live")(model.diagnostics.getSnapshot().status));
      assert.notStrictEqual(model.services.getSnapshot(), before);
      assert.strictEqual(rowOf(model).activity, "never called");
    }));

  it.effect("M54: a status change that leaves the sampled flag alone keeps the services view (Live to a Stopped that had sampled, and Off to Live)", () =>
    Effect.gen(function* () {
      let fail = false;
      const { collector } = makeCollectorDouble(() => {
        if (fail) throw new Error("the collector blew up");
        return { calls: [], dropped: 0, capacity: 10 };
      });
      const reading = oneReading();
      const model = yield* makeDockModel({ diagnostics: { collector }, reading });
      const before = model.services.getSnapshot();
      const heard = heardOf(model);

      fail = true;
      yield* TestClock.adjust("2 seconds");

      const { status } = model.diagnostics.getSnapshot();
      if (!DiagnosticsStatus.$is("Stopped")(status)) return assert.fail("expected Stopped");
      assert.isTrue(status.sampled);
      assert.strictEqual(model.services.getSnapshot(), before);
      assert.strictEqual(heard.calls, 0);

      // Off to Live passes through Starting, where the flag is set, so the reference moves; both ends read alike.
      const off = yield* makeDockModel({ reading });
      assert.isTrue(DiagnosticsStatus.$is("Off")(off.diagnostics.getSnapshot().status));
      const offView = off.services.getSnapshot();
      off.configure({ diagnostics: {}, reading });
      assert.isTrue(DiagnosticsStatus.$is("Live")(off.diagnostics.getSnapshot().status));
      assert.deepStrictEqual(off.services.getSnapshot(), offView);
    }));

  /**
   * A model reading one wiring, activity and call log, handed `change` laid over it by a
   * configure: how often the services store heard. A diagnostics listener reads the
   * wiring's state when `state` is given, and must read the new one.
   */
  const heardAfter = (change: DiagnosticsReading, state?: string) =>
    Effect.gen(function* () {
      const diagnostics = {};
      const reading = oneReading();
      const model = yield* makeDockModel({ diagnostics, reading });
      const heard = heardOf(model);
      const told: Array<string> = [];
      model.diagnostics.subscribe(() => {
        told.push(rowOf(model).state);
      });

      model.configure({ diagnostics, reading: { ...reading, ...change } });

      if (state !== undefined) assert.deepStrictEqual(told, [state]);
      return heard.calls;
    });

  const servicesMoves: ReadonlyArray<KeyRow> = [
    { field: "the wiring", heard: heardAfter({ wiring: wiringNamed("two") }, "two") },
    { field: "the activity", heard: heardAfter({ activity: activityOf(7) }) },
    { field: "the call log", heard: heardAfter({ portCalls: logOf("riskScore") }) },
    {
      field: "the unsampled flag",
      heard: Effect.gen(function* () {
        const layer = Layer.effectDiscard(Effect.sleep("1 second"));
        const reading = { wiring: wiringNamed("one"), activity: [], portCalls: logOf() };
        const model = yield* makeDockModel({ diagnostics: { layer }, reading });
        const heard = heardOf(model);

        yield* settleTurns;
        yield* TestClock.adjust("1 second");
        yield* settleTurns;

        return heard.calls;
      }),
    },
  ];

  const servicesQuiet: ReadonlyArray<KeyRow> = [
    { field: "the hydration", heard: heardAfter({ hydration: suppliedHydration }) },
    {
      field: "the supplied questions",
      heard: heardAfter({ questions: [{ policy: readPolicy }] }),
    },
  ];

  it.effect(
    "the services store moves once per key field",
    () =>
      Effect.gen(function* () {
        for (const row of servicesMoves) {
          assert.strictEqual(yield* row.heard, 1, row.field);
        }
        for (const row of servicesQuiet) {
          assert.strictEqual(yield* row.heard, 0, row.field);
        }
      }),
  );
});

describe("the stores of the model", () => {
  it.effect(
    "a built model's members with subscribe and getSnapshot are exactly this list",
    () =>
      Effect.gen(function* () {
        const model = yield* makeDockModel();
        const members: ReadonlyArray<readonly [string, unknown]> = Object.entries(model);

        const stores = members
          .filter(
            ([, member]) =>
              Predicate.hasProperty(member, "subscribe") &&
              Predicate.hasProperty(member, "getSnapshot"),
          )
          .map(([name]) => name);

        assert.sameMembers(stores, [
          "timeline",
          "dock",
          "explorer",
          "roles",
          "simulation",
          "diagnostics",
          "timelineStatus",
          "questions",
          "services",
        ]);
      }),
  );
});
