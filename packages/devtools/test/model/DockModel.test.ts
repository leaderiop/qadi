/**
 * The dock's cross-store rules, tested with no DOM (ARCH-74, DMOD-02).
 *
 * The dock owns six stores (the timeline, the policy rail, the explorer, the
 * role viewer's held choice, the simulation session and the dock session) and
 * the rules that connect them: a new timeline reaches every screen, a replay
 * commands the simulation, a new head does not move a held choice, an unchanged
 * input dispatches nothing, and no screen reads another timeline than the one
 * the dock shows. Until now those rules lived in layout effects and were proved
 * only by rendering the whole dock. They are stated here against `makeDockModel`
 * and nothing is rendered.
 *
 * The model is built in a scope (ADR-QD-137): `it.effect` provides one, and a
 * test that needs to end it mid-test makes its own. A test title names the DOM
 * case it re-states (`was DevtoolsDock l.N`) so the dock test can drop that case
 * once this one is green (26-05).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import * as FastCheck from "fast-check";
import {
  AttributeResolver,
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
import type { Policy, StoredRecord } from "@qadi/core";
import { catalogueOf, policyLabel } from "../../src/model/Catalogue.ts";
import type { Catalogue } from "../../src/model/Catalogue.ts";
import { makeDockModel } from "../../src/model/DockModel.ts";
import type { DockModel } from "../../src/model/DockModel.ts";
import type { TabId } from "../../src/model/DockSession.ts";
import { noFilters } from "../../src/model/Filters.ts";
import type { Source } from "../../src/model/Source.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { countsOf } from "../../src/model/Verdict.ts";
import { allow, decisionRecord, deny, failedRecord, obligationRecord, read, readPolicy } from "../helpers.ts";

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

/** A resolver that takes a second, and counts how it ended. No error is constructed. */
const slow = () => {
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
  it.effect("M1 (was DevtoolsDock l.853): records alone fill both rails, one sighting per policy with its tally", () =>
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

  it.effect("M2 (was DevtoolsDock l.865): a declared catalogue adds names and unrun policies to both rails", () =>
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

  it.effect("M3 (was DevtoolsDock l.883): roles come only from the catalogue, never from records", () =>
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

  it.effect("M4 (the wiring stays at DevtoolsDock l.988): replaying a row moves to the simulator and seeds it", () =>
    Effect.gen(function* () {
      const model = yield* makeDockModel();
      model.timeline.accept(decided("a", 100, readPolicy, "read"));

      model.dock.replay(entryOf(model, "a"));

      assert.strictEqual(model.dock.getSnapshot().tab, "simulator");
      seededFrom(model, readPolicy, "read");
    }));

  it.effect("M5 (was DevtoolsDock l.1026): replaying the same row again after another policy was chosen re-seeds", () =>
    Effect.gen(function* () {
      const model = yield* twoRows();
      model.dock.replay(entryOf(model, "a"));
      model.simulation.choosePolicy(writePolicy);
      assert.notStrictEqual(model.simulation.getSnapshot().policy._tag, "Seeded");

      model.dock.replay(entryOf(model, "a"));

      seededFrom(model, readPolicy, "read");
    }));

  it.effect("M6 (was DevtoolsDock l.1045): replaying the same row again after the action was edited restores it", () =>
    Effect.gen(function* () {
      const model = yield* twoRows();
      model.dock.replay(entryOf(model, "a"));
      model.simulation.setAction("write");
      assert.strictEqual(model.simulation.getSnapshot().draft.action, "write");

      model.dock.replay(entryOf(model, "a"));

      assert.strictEqual(model.simulation.getSnapshot().draft.action, "read");
    }));

  it.effect("M7 (was DevtoolsDock l.1060): a new record after a replay keeps the replayed form and reaches the rail", () =>
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
  it.effect("M8 (was DevtoolsDock l.1152): a new head leaves both the explorer and the simulation on what they showed", () =>
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
  it.effect("M9 (was DevtoolsDock l.1197): visiting every tab and returning leaves every other store's snapshot as it was", () =>
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
  it.effect("M11 (was DevtoolsDock l.435): the bound reaches the timeline", () =>
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

describe("two docks share nothing (M14)", () => {
  it.effect("M14 (was DevtoolsDock l.162): a record accepted by one model is absent from the other", () =>
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
