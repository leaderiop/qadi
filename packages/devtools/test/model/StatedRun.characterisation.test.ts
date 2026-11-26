/**
 * The status sequences the timeline feed, the diagnostics feed and the simulation session keep, pinned through their interfaces.
 *
 * Each of the three runs a scoped effect that a newer run supersedes and each states what
 * stopped it, and the code that does so is about to move into one module. The rows below say what
 * a store publishes and what it reads while its run starts, ends, dies, restarts and is
 * superseded from inside a listener, so a move that changes one of them fails here first.
 *
 * They were written before the move, against the public store interfaces only, and the file is
 * held byte for byte from the commit that adds it: a later row goes in another file.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import type * as Tracer from "effect/Tracer";
import * as TestClock from "effect/testing/TestClock";
import { AttributeResolver, gte, hasAttribute, portsLayer } from "@qadi/core";
import type { StoredRecord } from "@qadi/core";
import { collectingTracer } from "@qadi/testing";
import type { PortCallLog } from "../../src/model/PortCalls.ts";
import { diagnosticsOff, makeDiagnosticsFeed } from "../../src/model/DiagnosticsFeed.ts";
import type { DiagnosticsFeed } from "../../src/model/DiagnosticsFeed.ts";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import type { SimulationSession } from "../../src/model/SimulationSession.ts";
import type { Source, SourceRead } from "../../src/model/Source.ts";
import { makeTimelineFeed } from "../../src/model/TimelineFeed.ts";
import type { TimelineFeed } from "../../src/model/TimelineFeed.ts";
import { diagnosticsFeedOf, gatesFeedOf, timelineFeedOf } from "../builtFeeds.ts";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import { decisionRecord, guard, readPolicy, settleTurns, thrownBy } from "../helpers.ts";
import { sighting, slow } from "../simulationFixtures.ts";

const flush = Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"));

const record = (evaluationId: string, at: number): StoredRecord => decisionRecord({ evaluationId, at });

const idsOf = (feed: TimelineFeed): ReadonlyArray<string> =>
  feed.timeline.getSnapshot().entries.map((entry) => entry.evaluationId);

/** The tag of every status a timeline feed publishes from now on, in order. */
const heardStatus = (feed: TimelineFeed): Array<string> => {
  const heard: Array<string> = [];
  feed.status.subscribe(() => {
    heard.push(feed.status.getSnapshot()._tag);
  });
  return heard;
};

/** The tag of every status a diagnostics feed publishes from now on, in order. */
const heardDiagnostics = (feed: DiagnosticsFeed): Array<string> => {
  const heard: Array<string> = [];
  feed.subscribe(() => {
    heard.push(feed.getSnapshot().status._tag);
  });
  return heard;
};

/** The tag of every run state a session publishes from now on, in order. */
const heardRuns = (session: SimulationSession): Array<string> => {
  const heard: Array<string> = [];
  session.subscribe(() => {
    heard.push(session.getSnapshot().run._tag);
  });
  return heard;
};

/** A source that counts its reads: the first hands over `first`, every later one `later`. */
const scripted = (first: SourceRead, later: SourceRead) => {
  const tally = { reads: 0 };
  const source: Source = {
    read: Effect.sync(() => {
      tally.reads += 1;
      return tally.reads === 1 ? first : later;
    }),
  };
  return { source, tally };
};

/** A source whose first read stops after `x` and whose later reads hand over `x` and `y` and end. */
const flaky = () =>
  scripted(
    { backlog: [record("x", 100)], live: Stream.die(new Error("live boom")) },
    { backlog: [record("x", 100), record("y", 200)], live: Stream.empty },
  );

/** A source whose first read stops at once and whose later reads stay open on `later`. */
const stopsThen = (later: ReadonlyArray<StoredRecord>) =>
  scripted({ backlog: [], live: Stream.die(new Error("first read stopped")) }, { backlog: later, live: Stream.never });

/** A log that has dropped `n` calls, so two of them differ when `n` does. */
const logOf = (n: number): PortCallLog => ({ calls: [], dropped: n, capacity: 10 });

/** Settles every fiber, steps the clock, settles again. */
const step = (duration: Parameters<typeof TestClock.adjust>[0]) =>
  Effect.gen(function* () {
    yield* settleTurns;
    yield* TestClock.adjust(duration);
    yield* settleTurns;
  });

const clearance = hasAttribute("clearance", gte(5));

/** What a fixture answers: enough that `clearance` allows, so a run that lands would show. */
const withClearance: SimulationInput = {
  subject: { id: "alice" },
  attributes: { clearance: 9 },
};

/** A Live session over one sighting and the given ports, ready to run. */
const liveSession = (ports: ReturnType<typeof portsLayer>) =>
  Effect.gen(function* () {
    const session = yield* makeSimulationSession({ sightings: [sighting(clearance)], ports });
    session.chooseSource("Live");
    session.edit(withClearance);
    return session;
  });

describe("the stated runs the three stores keep", () => {
  it.effect("SC1 a timeline read that ends by itself stays Reading and publishes nothing after its start", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      const heard = heardStatus(feed);

      feed.configure({
        source: { read: Effect.succeed({ backlog: [record("a", 100)], live: Stream.make(record("b", 200)) }) },
      });
      yield* flush;

      assert.deepStrictEqual(idsOf(feed), ["a", "b"]);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.deepStrictEqual(heard, []);

      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.deepStrictEqual(heard, []);
    }));

  it.effect("SC2 a timeline read that dies publishes Stopped once with the cause text and keeps the entries it delivered", () =>
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed();
      const heard = heardStatus(feed);

      feed.configure({
        source: {
          read: Effect.succeed({ backlog: [record("x", 100)], live: Stream.die(new Error("live boom")) }),
        },
      });
      yield* flush;

      const status = feed.status.getSnapshot();
      assert.strictEqual(status._tag, "Stopped");
      assert.strictEqual(status._tag === "Stopped" ? status.reason.split("\n")[0] : "", "Error: live boom");
      assert.deepStrictEqual(heard, ["Stopped"]);
      assert.deepStrictEqual(idsOf(feed), ["x"]);

      yield* flush;
      assert.deepStrictEqual(heard, ["Stopped"]);
      assert.deepStrictEqual(idsOf(feed), ["x"]);
    }));

  it.effect("SC3 a restart over a Stopped timeline publishes Reading and replays the source into the same timeline, each entry once", () =>
    Effect.gen(function* () {
      const { source, tally } = flaky();
      const feed = yield* timelineFeedOf({ source });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      assert.deepStrictEqual(idsOf(feed), ["x"]);
      const store = feed.timeline;
      const heard = heardStatus(feed);

      feed.status.restart();
      yield* flush;

      assert.strictEqual(feed.timeline, store);
      assert.strictEqual(tally.reads, 2);
      assert.deepStrictEqual(heard, ["Reading"]);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.deepStrictEqual(idsOf(feed), ["x", "y"]);

      yield* flush;
      assert.deepStrictEqual(idsOf(feed), ["x", "y"]);
      assert.strictEqual(tally.reads, 2);
    }));

  it.effect("SC4 a restart on a bare timeline feed reads the empty source: one read span, Reading kept, nothing published", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const feed = yield* makeTimelineFeed().pipe(Effect.provide(collectingTracer(spans)));
      const heard = heardStatus(feed);
      const reads = () => spans.filter((span) => span.name === "qadi.devtools.runSource").length;
      assert.strictEqual(reads(), 0);

      feed.status.restart();
      yield* flush;

      assert.strictEqual(reads(), 1);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");
      assert.deepStrictEqual(heard, []);
      assert.deepStrictEqual(idsOf(feed), []);

      yield* flush;
      assert.strictEqual(reads(), 1);
    }));

  it.effect("SC5 the diagnostics feed goes Off, Starting, Live and Off again as options come and go", () =>
    Effect.gen(function* () {
      const a = makeCollectorDouble();
      const feed = yield* makeDiagnosticsFeed();
      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);
      const heard = heardDiagnostics(feed);

      feed.configure({ collector: a.collector });
      yield* step("4 seconds");
      assert.strictEqual(feed.getSnapshot().status._tag, "Live");

      feed.configure(undefined);
      yield* step("4 seconds");

      assert.deepStrictEqual(heard, ["Starting", "Live", "Off"]);
      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);
      const calls = a.state.calls;
      yield* step("4 seconds");
      assert.strictEqual(a.state.calls, calls);
      assert.strictEqual(feed.getSnapshot(), diagnosticsOff);
    }));

  it.effect("SC6 a diagnostics collector that dies is Stopped and not sampled before a sample, and Stopped and sampled after one", () =>
    Effect.gen(function* () {
      const before = makeCollectorDouble(() => {
        throw new Error("died before a sample");
      });
      const early = yield* makeDiagnosticsFeed();
      const earlyHeard = heardDiagnostics(early);
      early.configure({ collector: before.collector });
      yield* step("4 seconds");

      const earlyStatus = early.getSnapshot().status;
      assert.strictEqual(earlyStatus._tag, "Stopped");
      assert.isTrue(earlyStatus._tag === "Stopped" && !earlyStatus.sampled);
      assert.strictEqual(earlyStatus._tag === "Stopped" ? earlyStatus.reason.split("\n")[0] : "", "Error: died before a sample");
      assert.deepStrictEqual(earlyHeard, ["Starting", "Stopped"]);

      const after = makeCollectorDouble((call) => {
        if (call > 1) throw new Error("died after a sample");
        return logOf(1);
      });
      const late = yield* makeDiagnosticsFeed();
      const lateHeard = heardDiagnostics(late);
      late.configure({ collector: after.collector });
      yield* step("4 seconds");

      const { status, reading } = late.getSnapshot();
      assert.strictEqual(status._tag, "Stopped");
      assert.isTrue(status._tag === "Stopped" && status.sampled);
      assert.strictEqual(status._tag === "Stopped" ? status.reason.split("\n")[0] : "", "Error: died after a sample");
      assert.deepStrictEqual(reading.portCalls, logOf(1));
      assert.deepStrictEqual(lateHeard, ["Starting", "Live", "Stopped"]);

      yield* step("4 seconds");
      assert.strictEqual(after.state.calls, 2);
      assert.strictEqual(late.getSnapshot().status._tag, "Stopped");
      assert.strictEqual(before.state.calls, 1);
    }));

  it.effect("SC7 a timeline listener that throws on the Reading of a restart and reconfigures from the same call is rethrown once by identity, and only the newer read reads", () =>
    Effect.gen(function* () {
      const a = stopsThen([record("from-a", 100)]);
      const b = scripted({ backlog: [record("from-b", 200)], live: Stream.never }, { backlog: [], live: Stream.never });
      const feed = yield* timelineFeedOf({ source: a.source });
      yield* flush;
      assert.strictEqual(feed.status.getSnapshot()._tag, "Stopped");
      const boom = new Error("boom");
      let armed = true;
      let throws = 0;
      feed.status.subscribe(() => {
        if (!armed || feed.status.getSnapshot()._tag !== "Reading") return;
        armed = false;
        feed.configure({ source: b.source });
        throws += 1;
        throw boom;
      });

      const outcome = thrownBy(() => feed.status.restart());
      yield* flush;

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.strictEqual(throws, 1);
      assert.strictEqual(a.tally.reads, 1);
      assert.strictEqual(b.tally.reads, 1);
      assert.deepStrictEqual(idsOf(feed), ["from-b"]);
      assert.strictEqual(feed.status.getSnapshot()._tag, "Reading");

      yield* flush;
      assert.strictEqual(a.tally.reads, 1);
      assert.strictEqual(b.tally.reads, 1);
    }));

  it.effect("SC8 a diagnostics listener that throws on the Starting of a restart and reconfigures from the same call is rethrown once by identity, and the newer poll is the live one", () =>
    Effect.gen(function* () {
      const a = makeCollectorDouble(() => {
        throw new Error("first poll died");
      });
      const b = makeCollectorDouble(logOf);
      const feed = yield* diagnosticsFeedOf({ collector: a.collector });
      yield* step("4 seconds");
      assert.strictEqual(feed.getSnapshot().status._tag, "Stopped");
      assert.strictEqual(a.state.calls, 1);
      const boom = new Error("boom");
      let armed = true;
      let throws = 0;
      feed.subscribe(() => {
        if (!armed || feed.getSnapshot().status._tag !== "Starting") return;
        armed = false;
        feed.configure({ collector: b.collector });
        throws += 1;
        throw boom;
      });

      const outcome = thrownBy(() => feed.restart());
      yield* step("4 seconds");

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.strictEqual(throws, 1);
      assert.strictEqual(a.state.calls, 1);
      assert.isAtLeast(b.state.calls, 1);
      assert.strictEqual(feed.getSnapshot().status._tag, "Live");

      const calls = a.state.calls;
      yield* step("4 seconds");
      assert.strictEqual(a.state.calls, calls);
      assert.strictEqual(feed.getSnapshot().status._tag, "Live");
    }));

  it.effect("SC9 a session listener that throws on the Running of a run and runs again from the same call is rethrown once by identity, and the newer run is the one that lands", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = yield* liveSession(ports);
      const heard = heardRuns(session);
      const boom = new Error("boom");
      let armed = true;
      let throws = 0;
      session.subscribe(() => {
        if (!armed || session.getSnapshot().run._tag !== "Running") return;
        armed = false;
        session.run("Run");
        throws += 1;
        throw boom;
      });

      const outcome = thrownBy(() => session.run("Run"));
      yield* settleTurns;
      yield* TestClock.adjust("2 seconds");
      yield* settleTurns;

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.strictEqual(throws, 1);
      assert.strictEqual(tally.started, 1);
      assert.strictEqual(tally.finished, 1);
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
      assert.deepStrictEqual(heard, ["Running", "Running", "Ran"]);

      yield* TestClock.adjust("2 seconds");
      yield* settleTurns;
      assert.strictEqual(tally.started, 1);
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
    }));

  it.effect("SC10 a session listener that throws on the Ran publish leaves Ran shown", () =>
    Effect.gen(function* () {
      const { ports } = slow();
      const session = yield* liveSession(ports);
      const heard = heardRuns(session);
      session.subscribe(() => {
        if (session.getSnapshot().run._tag === "Ran") throw new Error("listener threw on Ran");
      });

      session.run("Run");
      yield* settleTurns;
      yield* TestClock.adjust("2 seconds");
      yield* settleTurns;

      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
      assert.deepStrictEqual(heard, ["Running", "Ran"]);

      yield* TestClock.adjust("2 seconds");
      yield* settleTurns;
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
      assert.deepStrictEqual(heard, ["Running", "Ran"]);
    }));

  it.effect("SC11 a session run whose ports layer dies publishes Running and then Broke, once each", () =>
    Effect.gen(function* () {
      const session = yield* liveSession(
        portsLayer({ AttributeResolver: Layer.effect(AttributeResolver, Effect.die(new Error("the layer exploded"))) }),
      );
      const heard = heardRuns(session);

      session.run("Run");
      yield* settleTurns;

      assert.deepStrictEqual(heard, ["Running", "Broke"]);
      assert.strictEqual(session.getSnapshot().run._tag, "Broke");

      yield* settleTurns;
      assert.deepStrictEqual(heard, ["Running", "Broke"]);
      assert.strictEqual(session.getSnapshot().run._tag, "Broke");
    }));

  it.effect("SC12 a configure after a feed scope closed reads and publishes nothing, a capacity the timeline refuses included", () =>
    Effect.gen(function* () {
      const scope = yield* Scope.make();
      const timelineSource = scripted({ backlog: [record("a", 100)], live: Stream.never }, { backlog: [], live: Stream.never });
      const laterSource = scripted({ backlog: [record("late", 300)], live: Stream.never }, { backlog: [], live: Stream.never });
      const timeline = yield* Scope.provide(timelineFeedOf({ source: timelineSource.source }), scope);
      const poll = makeCollectorDouble();
      const laterPoll = makeCollectorDouble();
      const diagnostics = yield* Scope.provide(diagnosticsFeedOf({ collector: poll.collector }), scope);
      const held = makeGateRegistryDouble([guard("a", readPolicy)]);
      const later = makeGateRegistryDouble([guard("b", readPolicy)]);
      const gates = yield* Scope.provide(gatesFeedOf({ gates: held.registry }), scope);
      yield* step("4 seconds");
      const timelineHeard = heardStatus(timeline);
      let entriesHeard = 0;
      timeline.timeline.subscribe(() => {
        entriesHeard += 1;
      });
      const diagnosticsHeard = heardDiagnostics(diagnostics);
      let gatesHeard = 0;
      gates.subscribe(() => {
        gatesHeard += 1;
      });
      const timelineBefore = timeline.timeline.getSnapshot();
      const diagnosticsBefore = diagnostics.getSnapshot();
      const gatesBefore = gates.getSnapshot();
      const sampled = poll.state.calls;
      yield* Scope.close(scope, Exit.void);
      yield* settleTurns;

      const refused = thrownBy(() => timeline.configure({ capacity: -1, source: laterSource.source }));
      const resized = thrownBy(() => timeline.configure({ capacity: 5, source: laterSource.source }));
      const off = thrownBy(() => diagnostics.configure(undefined));
      const moved = thrownBy(() => diagnostics.configure({ collector: laterPoll.collector }));
      const regated = thrownBy(() => gates.configure({ gates: later.registry }));
      yield* step("4 seconds");

      assert.isFalse(refused.threw);
      assert.isFalse(resized.threw);
      assert.isFalse(off.threw);
      assert.isFalse(moved.threw);
      assert.isFalse(regated.threw);
      assert.strictEqual(laterSource.tally.reads, 0);
      assert.deepStrictEqual(timelineHeard, []);
      assert.strictEqual(entriesHeard, 0);
      assert.strictEqual(timeline.timeline.getSnapshot(), timelineBefore);
      assert.strictEqual(laterPoll.state.calls, 0);
      assert.strictEqual(poll.state.calls, sampled);
      assert.deepStrictEqual(diagnosticsHeard, []);
      assert.strictEqual(diagnostics.getSnapshot(), diagnosticsBefore);
      assert.strictEqual(later.reads(), 0);
      assert.strictEqual(later.subscriptions(), 0);
      assert.strictEqual(gatesHeard, 0);
      assert.strictEqual(gates.getSnapshot(), gatesBefore);
    }));
});
