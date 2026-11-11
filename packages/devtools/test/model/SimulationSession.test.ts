/**
 * The simulator's session, tested without a DOM.
 *
 * Which source is honoured, what a Live run captures, which run is current,
 * and what a result belongs to are properties of a closure and an Effect, so
 * they are proved here — under `TestClock` with a sleeping port where time
 * matters, never with a real timer.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Scope from "effect/Scope";
import * as Tracer from "effect/Tracer";
import * as TestClock from "effect/testing/TestClock";
import {
  allOf,
  AttributeResolver,
  attributeResolverFromRecord,
  attributeResolverPort,
  gte,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  hasSignature,
  PortReply,
  portsLayer,
  scriptedPort,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { collectingTracer } from "@qadi/testing";
import { answerCount } from "../../src/model/Capture.ts";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import type { SimulationSession } from "../../src/model/SimulationSession.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { decisionRecord, obligationRecord, read } from "../helpers.ts";

const sighting = (policy: Policy): PolicySighting => ({
  policy,
  label: policyLabel(policy),
  count: 1,
  allows: 1,
  denies: 0,
  errors: 0,
  lastAt: 100,
});

const entryOf = (record: Parameters<typeof ingestAll>[1][number]): TimelineEntry => {
  const [entry] = ingestAll(emptyTimeline(), [record]).entries;
  if (entry === undefined) throw new Error("expected an entry");
  return entry;
};

const clearance = hasAttribute("clearance", gte(5));
/** What a fixture answers: enough that `clearance` allows, so a wrong source would show. */
const withClearance: SimulationInput = {
  subject: { id: "alice" },
  attributes: { clearance: 9 },
};

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

const sessionWith = (policy: Policy, input: SimulationInput = withClearance) => {
  const session = makeSimulationSession({ sightings: [sighting(policy)] });
  session.edit(input);
  return session;
};

const counted = (session: SimulationSession) => {
  const seen = { notified: 0 };
  session.subscribe(() => {
    seen.notified += 1;
  });
  return seen;
};

/** Starts a run and lets its program reach the sleeping port. */
const startRun = (session: SimulationSession, kind: "Run" | "Sweep" = "Run") =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(session.run(kind), { startImmediately: true });
    yield* TestClock.adjust("10 millis");
    return fiber;
  });

// The helpers below drive the scoped interface (ARCH-73, ADR-QD-137): `run` is a
// command that forks into the session's own handle, so a test starts one and then
// waits on the snapshot rather than joining a fiber it was handed.

/** Starts a run, and lets its program reach the sleeping port. */
const begin = (session: SimulationSession, kind: "Run" | "Sweep" = "Run") =>
  Effect.gen(function* () {
    session.run(kind);
    yield* TestClock.adjust("10 millis");
  });

/** Resumes once no run is in flight: at once when none is, else on the notification that ends it. */
const settled = (session: SimulationSession) =>
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
const ran = (session: SimulationSession, kind: "Run" | "Sweep" = "Run") =>
  Effect.suspend(() => {
    session.run(kind);
    return settled(session);
  });

describe("choosing a source that cannot be honoured — C2", () => {
  it.effect("refuses Live without ports, and evaluates nothing", () =>
    Effect.gen(function* () {
      const session = sessionWith(clearance);
      // Sanity: the fixture would have allowed.
      yield* session.run("Run");
      const fixture = session.getSnapshot().run;
      assert.strictEqual(fixture._tag === "Ran" && fixture.outcome._tag === "Decided", true);

      session.chooseSource("Live");
      yield* session.run("Run");

      const run = session.getSnapshot().run;
      assert.strictEqual(run._tag, "Refused");
      if (run._tag !== "Refused") return;
      assert.strictEqual(run.refusal._tag, "LiveWithoutPorts");
      assert.strictEqual(run.question.source, "Live");
      assert.strictEqual(session.getSnapshot().sourceChoice, "Live");
      assert.strictEqual(session.getSnapshot().refusal?._tag, "LiveWithoutPorts");
    }));

  it.effect("refuses Snapshot without a capture", () =>
    Effect.gen(function* () {
      const session = sessionWith(clearance);
      session.chooseSource("Snapshot");
      yield* session.run("Sweep");

      const run = session.getSnapshot().run;
      assert.strictEqual(run._tag === "Refused" && run.refusal._tag, "SnapshotWithoutCapture");
    }));

  it.effect("honours the choice again once the host supplies ports", () =>
    Effect.gen(function* () {
      const session = sessionWith(clearance);
      session.chooseSource("Live");
      assert.strictEqual(session.getSnapshot().refusal?._tag, "LiveWithoutPorts");

      session.setPorts(brokenPorts);
      assert.isUndefined(session.getSnapshot().refusal);
      assert.strictEqual(session.getSnapshot().sourceChoice, "Live");
      yield* session.run("Run");
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
    }));

  it.effect("a refusal does not leave an earlier run's fiber behind", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");
      const first = yield* startRun(session);
      session.chooseSource("Snapshot");
      yield* session.run("Run");
      yield* Fiber.join(first);

      assert.strictEqual(session.getSnapshot().run._tag, "Refused");
      assert.strictEqual(tally.interrupted, 1);
      assert.strictEqual(tally.finished, 0);
    }));
});

describe("a Live run captures — C3", () => {
  it.effect("stores the answers, offers Snapshot, replays the outage, and drops them with the ports", () =>
    Effect.gen(function* () {
      const session = sessionWith(clearance);
      session.setPorts(brokenPorts);
      assert.isUndefined(session.getSnapshot().capture);
      assert.isFalse(session.getSnapshot().options[1]?.enabled);

      session.chooseSource("Live");
      yield* session.run("Run");
      const live = session.getSnapshot();
      assert.strictEqual(live.run._tag, "Ran");
      assert.isDefined(live.capture);
      assert.isTrue(live.options[1]?.enabled);
      assert.strictEqual(live.run._tag === "Ran" && live.run.outcome._tag, "Failed");

      session.chooseSource("Snapshot");
      yield* session.run("Run");
      const replay = session.getSnapshot().run;
      assert.strictEqual(replay._tag === "Ran" && replay.outcome._tag, "Failed");
      assert.strictEqual(replay._tag === "Ran" && replay.question.source, "Snapshot");

      session.setPorts(otherBrokenPorts);
      assert.isUndefined(session.getSnapshot().capture);
      assert.isFalse(session.getSnapshot().options[1]?.enabled);
      yield* session.run("Run");
      assert.strictEqual(
        session.getSnapshot().run._tag === "Refused" && session.getSnapshot().refusal?._tag,
        "SnapshotWithoutCapture",
      );
    }));

  it.effect("keeps the capture across edits and a re-seed", () =>
    Effect.gen(function* () {
      const session = sessionWith(clearance);
      session.setPorts(brokenPorts);
      session.chooseSource("Live");
      yield* session.run("Run");
      session.edit({ ...withClearance, action: "read" });
      session.seed(entryOf(decisionRecord({ evaluationId: "ev-1", policy: clearance })));
      assert.isDefined(session.getSnapshot().capture);
    }));

  it.effect("does not capture on Fixtures, and keeps the same ports without dropping the capture", () =>
    Effect.gen(function* () {
      const session = sessionWith(clearance);
      session.setPorts(brokenPorts);
      yield* session.run("Run");
      assert.isUndefined(session.getSnapshot().capture);
      session.chooseSource("Live");
      yield* session.run("Run");
      session.setPorts(brokenPorts);
      assert.isDefined(session.getSnapshot().capture);
    }));
});

describe("each Live run captures with its own recorder (ARCH-72)", () => {
  it.effect("a second Live run's capture holds only what that run asked", () =>
    Effect.gen(function* () {
      const a = hasAttribute("a", gte(1));
      const b = hasAttribute("b", gte(1));
      const session = makeSimulationSession({
        sightings: [sighting(a), sighting(b)],
        ports: portsLayer({ AttributeResolver: attributeResolverFromRecord({ a: 1, b: 1 }) }),
      });
      session.edit(withClearance);
      session.chooseSource("Live");

      session.choosePolicy(a);
      yield* session.run("Run");
      const first = session.getSnapshot().capture;
      if (first === undefined) throw new Error("expected a capture after the first Live run");
      assert.strictEqual(answerCount(first), 1);

      session.choosePolicy(b);
      yield* session.run("Run");
      const second = session.getSnapshot().capture;
      if (second === undefined) throw new Error("expected a capture after the second Live run");
      assert.strictEqual(answerCount(second), 1);
    }));
});

describe("a superseded run never lands — C4", () => {
  it.effect("a second run interrupts the first, and only the second reports", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");

      const first = yield* startRun(session);
      assert.strictEqual(session.getSnapshot().run._tag, "Running");
      const second = yield* startRun(session);
      assert.strictEqual(tally.interrupted, 1);

      yield* TestClock.adjust("1 second");
      yield* Fiber.join(second);
      yield* Fiber.join(first);

      assert.strictEqual(tally.finished, 1);
      assert.strictEqual(tally.started, 2);
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
    }));

  const supersededBy = (name: string, supersede: (session: SimulationSession) => void) =>
    it.effect(`${name} drops the run in flight, and it never reaches the snapshot`, () =>
      Effect.gen(function* () {
        const { ports, tally } = slow();
        const session = makeSimulationSession({
          sightings: [sighting(clearance), sighting(hasRole("x"))],
          ports,
        });
        session.edit(withClearance);
        session.chooseSource("Live");

        const fiber = yield* startRun(session);
        assert.strictEqual(session.getSnapshot().run._tag, "Running");

        supersede(session);
        // Correct before anything is interrupted: the generation moved.
        assert.strictEqual(session.getSnapshot().run._tag, "Idle");
        assert.isTrue(session.hasRetired());

        yield* session.reap;
        assert.isFalse(session.hasRetired());
        assert.strictEqual(tally.interrupted, 1);

        yield* TestClock.adjust("1 second");
        yield* Fiber.join(fiber);
        assert.strictEqual(tally.finished, 0);
        assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      }));

  supersededBy("choosing another policy", (session) => session.choosePolicy(hasRole("x")));
  supersededBy("a re-seed", (session) =>
    session.seed(entryOf(decisionRecord({ evaluationId: "ev-5", policy: hasRole("x") }))),
  );
  supersededBy("changing the ports", (session) => session.setPorts(otherBrokenPorts));

  it.effect("dispose interrupts the run, and the session stays usable", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");
      const fiber = yield* startRun(session);

      yield* session.dispose;
      assert.strictEqual(tally.interrupted, 1);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      yield* TestClock.adjust("1 second");
      yield* Fiber.join(fiber);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");

      session.chooseSource("Fixtures");
      yield* session.run("Run");
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
    }));

  it.effect("dispose with nothing running changes nothing", () =>
    Effect.gen(function* () {
      const session = sessionWith(clearance);
      const seen = counted(session);
      yield* session.dispose;
      assert.strictEqual(seen.notified, 0);
    }));

  it.effect("interrupting the run itself interrupts the evaluation", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");
      const fiber = yield* startRun(session);
      yield* Fiber.interrupt(fiber);
      assert.strictEqual(tally.interrupted, 1);
    }));
});

describe("a superseded run stops at once (ARCH-73)", () => {
  /**
   * The same three commands as C4's `supersededBy`, against the scoped interface:
   * the run is interrupted inside the command, through the session's own handle.
   * Nothing is reaped, because nothing waits for a reap.
   */
  const stopsAtOnce = (name: string, supersede: (session: SimulationSession) => void) =>
    it.effect(`${name} interrupts the run in flight before the next step`, () =>
      Effect.gen(function* () {
        const { ports, tally } = slow();
        const session = yield* makeSimulationSession({
          sightings: [sighting(clearance), sighting(hasRole("x"))],
          ports,
        });
        session.chooseSource("Live");
        session.edit(withClearance);

        yield* begin(session, "Run");
        assert.strictEqual(session.getSnapshot().run._tag, "Running");
        assert.strictEqual(tally.started, 1);

        supersede(session);
        yield* Effect.yieldNow;
        assert.strictEqual(tally.interrupted, 1);
        assert.strictEqual(session.getSnapshot().run._tag, "Idle");

        yield* TestClock.adjust("1 second");
        assert.strictEqual(tally.finished, 0);
        assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      }));

  stopsAtOnce("choosing another policy", (session) => session.choosePolicy(hasRole("x")));
  stopsAtOnce("a replay", (session) =>
    session.replay(entryOf(decisionRecord({ evaluationId: "ev-5", policy: hasRole("x") }))),
  );
  stopsAtOnce("changing the ports", (session) => session.setPorts(otherBrokenPorts));
});

describe("closing the session's scope stops its run (ARCH-73)", () => {
  it.effect("interrupts the run in flight, which never lands, and leaves the session inert", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const scope = yield* Scope.make();
      const session = yield* Scope.provide(
        makeSimulationSession({ sightings: [sighting(clearance)], ports }),
        scope,
      );
      session.chooseSource("Live");
      session.edit(withClearance);
      yield* begin(session, "Run");
      assert.strictEqual(session.getSnapshot().run._tag, "Running");

      yield* Scope.close(scope, Exit.void);
      assert.strictEqual(tally.interrupted, 1);

      yield* TestClock.adjust("1 second");
      assert.strictEqual(tally.finished, 0);
      assert.notStrictEqual(session.getSnapshot().run._tag, "Ran");

      // A closed session answers no command: the snapshot is the very one it had.
      const before = session.getSnapshot();
      const started = tally.started;
      session.run("Run");
      yield* TestClock.adjust("1 second");
      assert.strictEqual(session.getSnapshot(), before);
      assert.strictEqual(tally.started, started);
    }));
});

describe("the interface keeps the lifecycle to itself (ARCH-73)", () => {
  it.effect("a session has no reap, hasRetired or dispose: its scope is how a host ends it", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession();
      assert.isFalse("reap" in session);
      assert.isFalse("hasRetired" in session);
      assert.isFalse("dispose" in session);
    }));
});

describe("a run is its own trace (ARCH-73)", () => {
  it.effect("is a root span, under the services the session was built with, and nothing reaps or disposes", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] }).pipe(
        Effect.provide(collectingTracer(spans)),
      );
      yield* ran(session, "Run");

      const run = spans.find((s) => s.name === "qadi.devtools.simulationSession.run");
      assert.isDefined(run);
      assert.isTrue(run !== undefined && Option.isNone(run.parent));
      assert.isDefined(spans.find((s) => s.name === "qadi.devtools.makeSimulationSession"));
      const names = spans.map((s) => s.name);
      assert.notInclude(names, "qadi.devtools.simulationSession.reap");
      assert.notInclude(names, "qadi.devtools.simulationSession.dispose");
    }));
});

describe("a result belongs to the question it answered", () => {
  it.effect("is stale once the form moves, and the policy or seed leaving clears it", () =>
    Effect.gen(function* () {
      const session = makeSimulationSession({
        sightings: [sighting(clearance), sighting(hasPermission(read))],
      });
      session.edit(withClearance);
      yield* session.run("Run");
      assert.isFalse(session.getSnapshot().stale);

      session.edit({ ...withClearance, action: "read" });
      assert.isTrue(session.getSnapshot().stale);

      session.choosePolicy(hasPermission(read));
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      assert.isFalse(session.getSnapshot().stale);
    }));

  it.effect("is not stale when the host passes an equal policy as a new object", () =>
    Effect.gen(function* () {
      const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      yield* session.run("Run");
      session.setSightings([sighting(hasRole("a"))]);
      assert.isFalse(session.getSnapshot().stale);
      // The rail changing is not the reviewer changing the question: the chosen
      // policy is held, evicted or not, so the result still answers it.
      session.setSightings([sighting(hasRole("b"))]);
      assert.isFalse(session.getSnapshot().stale);
      session.setSightings([]);
      assert.isFalse(session.getSnapshot().stale);
    }));

  it.effect("shows a baseline only for a result that ran against the current seed — C4b", () =>
    Effect.gen(function* () {
      const a = entryOf(decisionRecord({ evaluationId: "ev-A", policy: hasRole("a") }));
      const b = entryOf(decisionRecord({ evaluationId: "ev-B", policy: hasRole("b") }));
      const session = makeSimulationSession({ sightings: [], seed: a });
      assert.isUndefined(session.getSnapshot().baseline);

      yield* session.run("Run");
      const first = session.getSnapshot();
      assert.strictEqual(first.baseline?._tag === "Checked" && first.baseline.evaluationId, "ev-A");

      session.edit({ ...first.draft, action: "x" });
      assert.isUndefined(session.getSnapshot().baseline);

      session.seed(b);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      assert.isUndefined(session.getSnapshot().baseline);
      yield* session.run("Run");
      const second = session.getSnapshot();
      assert.strictEqual(second.baseline?._tag === "Checked" && second.baseline.evaluationId, "ev-B");
    }));

  it.effect("drops the baseline when the reviewer leaves a replayed row for the rail", () =>
    Effect.gen(function* () {
      const a = entryOf(decisionRecord({ evaluationId: "ev-A", policy: hasRole("a") }));
      const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed: a });
      assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
      session.choosePolicy(hasRole("a"));
      assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
      yield* session.run("Run");
      assert.isUndefined(session.getSnapshot().baseline);
    }));

  it.effect("says an orphan carries no decision to compare against", () =>
    Effect.gen(function* () {
      const orphan = entryOf(obligationRecord({ evaluationId: "ev-9" }));
      const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed: orphan });
      yield* session.run("Run");
      assert.strictEqual(session.getSnapshot().baseline?._tag, "Unavailable");
    }));

  it.effect("never shows a result as answering a row replayed while that run was starting", () =>
    Effect.gen(function* () {
      // A live resolver whose cancellation takes time, as an aborted request's does:
      // the second run waits on it, and the reviewer replays an orphan meanwhile.
      const ports = portsLayer({
        AttributeResolver: Layer.succeed(AttributeResolver, {
          name: "slow to cancel",
          resolve: () =>
            Effect.sleep("1 second").pipe(
              Effect.onInterrupt(() => Effect.sleep("100 millis")),
              Effect.as(9),
            ),
        }),
      });
      const orphan = entryOf(obligationRecord({ evaluationId: "ev-late" }));
      const session = sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");
      const first = yield* startRun(session);

      session.chooseSource("Fixtures");
      const second = yield* startRun(session);
      session.replay(orphan);

      yield* TestClock.adjust("1 second");
      yield* Fiber.join(second);
      yield* Fiber.join(first);
      const after = session.getSnapshot();
      // The replay moved the generation before the waiting run read it, so the run never started.
      assert.strictEqual(after.run._tag, "Idle");
      assert.isUndefined(after.baseline);
    }));

  it.effect("keeps no capture from an environment that was replaced while a run was starting", () =>
    Effect.gen(function* () {
      // Same slow-to-cancel resolver: the second Live run waits on the first one's
      // teardown, and the host swaps the ports layer during that wait.
      const ports = portsLayer({
        AttributeResolver: Layer.succeed(AttributeResolver, {
          name: "slow to cancel",
          resolve: () =>
            Effect.sleep("1 second").pipe(
              Effect.onInterrupt(() => Effect.sleep("100 millis")),
              Effect.as(9),
            ),
        }),
      });
      const session = sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");
      const first = yield* startRun(session);
      const second = yield* startRun(session);

      session.setPorts(brokenPorts);

      yield* TestClock.adjust("2 seconds");
      yield* Fiber.join(second);
      yield* Fiber.join(first);
      const after = session.getSnapshot();
      assert.isUndefined(after.capture);
      assert.strictEqual(after.run._tag, "Idle");
      assert.isFalse(after.options.find((option) => option.id === "Snapshot")?.enabled);
    }));

  it.effect("labels the clock the run measured under", () =>
    Effect.gen(function* () {
      const session = sessionWith(hasRole("a"));
      session.setClock("deterministic");
      yield* session.run("Run");
      const run = session.getSnapshot().run;
      assert.strictEqual(run._tag === "Ran" && run.clock, "deterministic");
    }));
});

describe("the cost line is the cost — C7", () => {
  const twoRoles: SimulationInput = { subject: { id: "alice", roles: ["a", "b"] } };

  it.effect("a sweep runs exactly the evaluations the plan stated, pairs off and on", () =>
    Effect.gen(function* () {
      const session = sessionWith(allOf([hasRole("a"), hasRole("b")]), twoRoles);
      for (const pairs of [false, true]) {
        session.setPairs(pairs);
        const stated = session.getSnapshot().plan?.evaluations;
        yield* session.run("Sweep");
        const run = session.getSnapshot().run;
        if (run._tag !== "Ran" || run.report === undefined) throw new Error("expected a sweep");
        assert.strictEqual(run.report.evaluations, stated);
        assert.strictEqual(run.report.rows.length + 1, stated);
      }
      // The two positions differ, so the toggle is not decorative.
      session.setPairs(false);
      const off = session.getSnapshot().plan?.evaluations ?? 0;
      session.setPairs(true);
      assert.isAbove(session.getSnapshot().plan?.evaluations ?? 0, off);
    }));

  it.effect("warns about I/O only for Live with ports", () =>
    Effect.gen(function* () {
      const session = sessionWith(hasRole("a"), twoRoles);
      assert.isFalse(session.getSnapshot().plan?.causesIO);
      session.setPorts(brokenPorts);
      session.chooseSource("Live");
      assert.isTrue(session.getSnapshot().plan?.causesIO);
      session.setPorts(undefined);
      assert.isFalse(session.getSnapshot().plan?.causesIO);
    }));

  it.effect("a single run keeps no report", () =>
    Effect.gen(function* () {
      const session = sessionWith(hasRole("a"), twoRoles);
      yield* session.run("Run");
      const run = session.getSnapshot().run;
      assert.isTrue(run._tag === "Ran" && run.report === undefined);
    }));
});

describe("seeding", () => {
  const seed = entryOf(
    decisionRecord({
      evaluationId: "ev-3",
      policy: hasPermission(read),
      subjectId: "carol",
      action: "read",
      resource: { id: "doc-1" },
    }),
  );

  it("fills the policy, action and resource, and names every field it could not seed", () => {
    const session = makeSimulationSession({ sightings: [], seed });
    const snapshot = session.getSnapshot();
    if (snapshot.policy._tag !== "Seeded") throw new Error("expected a seeded policy");
    assert.deepStrictEqual(snapshot.policy.policy, hasPermission(read));
    assert.strictEqual(snapshot.draft.subject.id, "carol");
    assert.strictEqual(snapshot.draft.action, "read");
    assert.deepStrictEqual(snapshot.draft.resource, { id: "doc-1" });
    assert.deepStrictEqual(snapshot.resourceText, { text: '{"id":"doc-1"}', error: undefined });
    assert.include(
      snapshot.policy.unseeded.map((field) => field.field),
      "signatures",
    );
  });

  it("an orphan seeds nothing and leaves no policy", () => {
    const session = makeSimulationSession({
      sightings: [],
      seed: entryOf(obligationRecord({ evaluationId: "ev-9" })),
    });
    assert.strictEqual(session.getSnapshot().policy._tag, "None");
  });

  it("resets the resource field and any unparsed text on a re-seed", () => {
    const session = makeSimulationSession({ sightings: [], seed });
    session.editResourceText("{oops");
    assert.isDefined(session.getSnapshot().resourceText.error);
    session.seed(
      entryOf(
        decisionRecord({ evaluationId: "ev-4", policy: hasRole("x"), resource: { id: "doc-2" } }),
      ),
    );
    assert.deepStrictEqual(session.getSnapshot().resourceText, {
      text: '{"id":"doc-2"}',
      error: undefined,
    });
  });

  it("choosing from the rail leaves the replayed row behind", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed });
    assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
    session.choosePolicy(hasRole("a"));
    assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
  });

  it.effect("keeps an evicted choice, marks it, and still runs it", () =>
    Effect.gen(function* () {
      const session = makeSimulationSession({
        sightings: [sighting(hasRole("a")), sighting(clearance)],
      });
      session.edit(withClearance);
      session.choosePolicy(clearance);
      session.setSightings([sighting(hasRole("a"))]);
      const policy = session.getSnapshot().policy;
      assert.strictEqual(policy._tag, "Evicted");
      assert.isTrue(policy._tag === "Evicted" && Equal.equals(policy.policy, clearance));
      assert.strictEqual(policy._tag === "Evicted" && policy.label, policyLabel(clearance));

      yield* session.run("Run");
      const ran = session.getSnapshot().run;
      assert.isTrue(ran._tag === "Ran" && Equal.equals(ran.question.policy, clearance));

      // An evicted choice outlives an empty rail.
      session.setSightings([]);
      assert.strictEqual(session.getSnapshot().policy._tag, "Evicted");
    }));

  it("pins the head before any choice, and a new head does not move it", () => {
    const session = makeSimulationSession();
    assert.strictEqual(session.getSnapshot().policy._tag, "None");
    session.setSightings([sighting(hasRole("a"))]);
    session.setSightings([sighting(hasRole("b")), sighting(hasRole("a"))]);
    const policy = session.getSnapshot().policy;
    assert.strictEqual(policy._tag, "Chosen");
    if (policy._tag !== "Chosen") return;
    assert.isTrue(Equal.equals(policy.policy, hasRole("a")));
    assert.strictEqual(policy.index, 1);
  });

  it("does not pin while a replayed row is seeded, and pins when it is left", () => {
    const session = makeSimulationSession({ seed });
    session.setSightings([sighting(hasRole("a"))]);
    assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
    session.seed(undefined);
    session.setSightings([sighting(hasRole("b")), sighting(hasRole("a"))]);
    const policy = session.getSnapshot().policy;
    assert.isTrue(policy._tag === "Chosen" && Equal.equals(policy.policy, hasRole("a")));
  });

  it("pins the head at the moment a replayed row is left, not before", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed });
    session.setSightings([sighting(hasRole("a"))]);
    session.setSightings([sighting(hasRole("c")), sighting(hasRole("a"))]);
    session.seed(undefined);
    const policy = session.getSnapshot().policy;
    assert.isTrue(policy._tag === "Chosen" && Equal.equals(policy.policy, hasRole("c")));
  });

  it("choosing the held policy while a replayed row is seeded still leaves the row", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
    session.seed(seed);
    assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
    session.choosePolicy(hasRole("a"));
    assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
  });

  it("remembers the rail's label for a chosen policy once it leaves the rail", () => {
    const named: PolicySighting = { ...sighting(hasRole("a")), label: "canArchive" };
    const session = makeSimulationSession({ sightings: [sighting(hasRole("b")), named] });
    session.choosePolicy(hasRole("a"));
    session.setSightings([]);
    const policy = session.getSnapshot().policy;
    assert.strictEqual(policy._tag === "Evicted" && policy.label, "canArchive");
  });

  it("holds a policy chosen before the rail has any", () => {
    const session = makeSimulationSession();
    session.choosePolicy(hasRole("a"));
    session.setSightings([sighting(hasRole("b")), sighting(hasRole("a"))]);
    const policy = session.getSnapshot().policy;
    assert.isTrue(policy._tag === "Chosen" && Equal.equals(policy.policy, hasRole("a")));
  });

  it("refuses nothing: choosing an unlisted policy holds it as evicted", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
    session.choosePolicy(hasRole("zzz"));
    const policy = session.getSnapshot().policy;
    assert.isTrue(policy._tag === "Evicted" && Equal.equals(policy.policy, hasRole("zzz")));
    assert.strictEqual(policy._tag === "Evicted" && policy.label, policyLabel(hasRole("zzz")));
  });

  it.effect("runs nothing when there is no policy", () =>
    Effect.gen(function* () {
      const session = makeSimulationSession();
      yield* session.run("Run");
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
    }));
});

/**
 * DOCK-04 — `replay` is the reviewer's act and always re-seeds; `seed` is a host
 * keeping a prop in step, and an unchanged one must not wipe a half-filled form.
 */
describe("replaying a row", () => {
  const a = entryOf(
    decisionRecord({
      evaluationId: "ev-a",
      // Reads an attribute, so a Live run of it waits on the slow resolver.
      policy: clearance,
      subjectId: "carol",
      action: "read",
      resource: { id: "doc-1" },
    }),
  );
  const seededFromA = (session: SimulationSession) => {
    const snapshot = session.getSnapshot();
    assert.isTrue(snapshot.policy._tag === "Seeded" && snapshot.policy.entry === a);
    assert.isTrue(snapshot.policy._tag === "Seeded" && Equal.equals(snapshot.policy.policy, clearance));
    assert.strictEqual(snapshot.draft.subject.id, "carol");
    assert.strictEqual(snapshot.draft.action, "read");
    assert.deepStrictEqual(snapshot.draft.resource, { id: "doc-1" });
    assert.deepStrictEqual(snapshot.resourceText, { text: '{"id":"doc-1"}', error: undefined });
  };

  it("re-seeds from the row it was last seeded from after another policy was chosen", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("b"))] });
    session.seed(a);
    session.choosePolicy(hasRole("b"));
    assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
    session.replay(a);
    seededFromA(session);
  });

  it.effect("re-seeds the form after an edit, and drops the run in flight", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = makeSimulationSession({ sightings: [], ports, seed: a });
      session.edit({ ...session.getSnapshot().draft, action: "write", attributes: { clearance: 9 } });
      session.editResourceText("{oops");
      session.chooseSource("Live");
      const fiber = yield* startRun(session);
      assert.strictEqual(session.getSnapshot().run._tag, "Running");

      const seen = counted(session);
      session.replay(a);
      assert.strictEqual(seen.notified, 1);
      seededFromA(session);
      assert.isUndefined(session.getSnapshot().draft.attributes);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      assert.isTrue(session.hasRetired());

      yield* session.reap;
      assert.strictEqual(tally.interrupted, 1);
      yield* TestClock.adjust("1 second");
      yield* Fiber.join(fiber);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
    }));

  it("seed with the entry it holds is a no-op, so an effect re-run keeps the edited form", () => {
    const session = makeSimulationSession({ sightings: [] });
    session.seed(a);
    session.edit({ ...session.getSnapshot().draft, action: "write" });
    const seen = counted(session);
    session.seed(a);
    assert.strictEqual(seen.notified, 0);
    assert.strictEqual(session.getSnapshot().draft.action, "write");
  });

  it("seed after a replay of the same entry keeps the replay's edited form", () => {
    const session = makeSimulationSession({ sightings: [] });
    session.replay(a);
    seededFromA(session);
    session.edit({ ...session.getSnapshot().draft, action: "write" });
    session.seed(a);
    assert.strictEqual(session.getSnapshot().draft.action, "write");
    assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
  });

  it("replaying a row that cannot be replayed leaves the seed as seed does", () => {
    const orphan = entryOf(obligationRecord({ evaluationId: "ev-orphan" }));
    const replayed = makeSimulationSession({ sightings: [sighting(hasRole("b"))], seed: a });
    const seeded = makeSimulationSession({ sightings: [sighting(hasRole("b"))], seed: a });
    replayed.replay(orphan);
    seeded.seed(orphan);
    const left = replayed.getSnapshot();
    assert.strictEqual(left.policy._tag, "Chosen");
    assert.deepStrictEqual(left.policy, seeded.getSnapshot().policy);
    assert.deepStrictEqual(left.draft, seeded.getSnapshot().draft);
    assert.isTrue(left.policy._tag === "Chosen" && Equal.equals(left.policy.policy, hasRole("b")));
    // The row it was seeded from is left behind: a replay of it seeds again.
    replayed.replay(a);
    seededFromA(replayed);
  });
});

describe("choosing a policy", () => {
  it("keeps the chosen policy when a decision reorders the rail", () => {
    const session = makeSimulationSession({
      sightings: [sighting(hasRole("a")), sighting(hasRole("b"))],
    });
    session.choosePolicy(hasRole("b"));
    session.setSightings([sighting(hasRole("b")), sighting(hasRole("a"))]);
    const policy = session.getSnapshot().policy;
    assert.strictEqual(policy._tag, "Chosen");
    if (policy._tag !== "Chosen") return;
    assert.isTrue(Equal.equals(policy.policy, hasRole("b")));
    assert.strictEqual(policy.index, 0);
  });

  it("keeps the chosen policy when a new policy decides first", () => {
    const session = makeSimulationSession({
      sightings: [sighting(hasRole("a")), sighting(hasRole("b"))],
    });
    session.choosePolicy(hasRole("b"));
    session.setSightings([sighting(hasRole("c")), sighting(hasRole("a")), sighting(hasRole("b"))]);
    const policy = session.getSnapshot().policy;
    assert.strictEqual(policy._tag, "Chosen");
    if (policy._tag !== "Chosen") return;
    assert.isTrue(Equal.equals(policy.policy, hasRole("b")));
    assert.strictEqual(policy.index, 2);
  });

  it.effect("runs the chosen policy after the rail moved", () =>
    Effect.gen(function* () {
      const admin = hasRole("admin");
      const session = makeSimulationSession({ sightings: [sighting(admin), sighting(clearance)] });
      session.edit(withClearance);
      session.choosePolicy(clearance);
      yield* session.run("Run");
      const first = session.getSnapshot().run;
      assert.strictEqual(first._tag, "Ran");
      assert.isTrue(first._tag === "Ran" && Equal.equals(first.question.policy, clearance));

      session.setSightings([sighting(clearance), sighting(admin)]);
      yield* session.run("Run");
      const second = session.getSnapshot().run;
      assert.strictEqual(second._tag, "Ran");
      assert.isTrue(second._tag === "Ran" && Equal.equals(second.question.policy, clearance));
    }));
});

describe("the sweep the session states", () => {
  // Through the session, not `singleEdits`: the review reproduced the gap here,
  // because this is the plan a reviewer reads before running a sweep.
  it("offers to drop a signature fixture, and counts that row", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasSignature("approved"))] });
    session.edit({
      subject: { id: "alice" },
      resource: { id: "doc-1" },
      signatures: [{ subjectId: "alice", meaning: "approved", resourceId: "doc-1" }],
    });

    const plan = session.getSnapshot().plan;
    assert.deepStrictEqual(plan?.edits.map((edit) => edit.kind), ["DropSignature"]);
    assert.strictEqual(plan?.evaluations, 2);
  });
});

describe("the form's fields, through the session", () => {
  const session = () => makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
  const added = (s: SimulationSession, field: Parameters<SimulationSession["addChip"]>[0], text: string) =>
    s.addChip(field, text);

  it("attributes a short-form element to the current subject, and a rename moves it with the subject", () => {
    const s = session();
    s.edit({ subject: { id: "alice" } });
    assert.deepStrictEqual(added(s, "relationships", "owner:doc-1"), { _tag: "Ok" });
    s.renameSubject("bob");
    // An unrelated edit afterwards rewrites nothing: the first edge followed the rename.
    assert.deepStrictEqual(added(s, "relationships", "viewer:doc-9"), { _tag: "Ok" });

    assert.deepStrictEqual(s.getSnapshot().draft.relationships, [
      { subjectId: "bob", relation: "owner", resourceId: "doc-1" },
      { subjectId: "bob", relation: "viewer", resourceId: "doc-9" },
    ]);
  });

  it("refuses a structural duplicate with a reason, leaving the draft and the subscribers alone", () => {
    const s = session();
    added(s, "relationships", "owner:doc-1");
    const seen = counted(s);
    const before = s.getSnapshot();

    assert.deepStrictEqual(added(s, "relationships", "owner:doc-1"), {
      _tag: "Refused",
      reason: "already there",
    });
    assert.strictEqual(s.getSnapshot(), before);
    assert.strictEqual(seen.notified, 0);
  });

  it("keeps two edges that differ only by subject as two chips", () => {
    const s = session();
    added(s, "relationships", "owner:doc-1");
    added(s, "relationships", '{"subjectId":"bob","relation":"owner","resourceId":"doc-1"}');

    assert.strictEqual(s.getSnapshot().draft.relationships?.length, 2);
  });

  it("refuses empty text and text the field's codec refuses", () => {
    const s = session();

    assert.deepStrictEqual(added(s, "roles", "  "), { _tag: "Refused", reason: "nothing to add" });
    assert.deepStrictEqual(added(s, "permissions", "nocolon"), {
      _tag: "Refused",
      reason: "expected resource:action",
    });
    assert.deepStrictEqual(s.getSnapshot().draft, { subject: { id: "someone" } });
  });

  it("replaces a pair of the same name on a record field, and puts it last", () => {
    const s = session();
    added(s, "attributes", "a:1");
    added(s, "attributes", "b:2");
    assert.deepStrictEqual(added(s, "attributes", "a:3"), { _tag: "Ok" });

    assert.deepStrictEqual(Object.entries(s.getSnapshot().draft.attributes ?? {}), [["b", 2], ["a", 3]]);
  });

  it("removes exactly one chip, and an absent field is a no-op that does not notify", () => {
    const s = session();
    added(s, "roles", "a");
    added(s, "roles", "b");
    s.removeChip("roles", 0);
    assert.deepStrictEqual(s.getSnapshot().draft.subject.roles, ["b"]);

    const seen = counted(s);
    s.removeChip("history", 0);
    s.removeChip("roles", 5);
    assert.strictEqual(seen.notified, 0);
  });

  it("reads the form: seven rows in the form's order, a refused value as its refusal", () => {
    const s = session();
    added(s, "signatures", "approved:doc-1");
    s.edit({ ...s.getSnapshot().draft, subject: { id: "someone", roles: [" padded "] } });
    const { fields } = s.getSnapshot();

    assert.deepStrictEqual(
      fields.map((f) => f.key),
      ["roles", "permissions", "subjectAttributes", "attributes", "relationships", "history", "signatures"],
    );
    assert.deepStrictEqual(fields[0]?.chips, [
      { text: "(not representable in the form)", refused: true, removeLabel: "(not representable in the form)" },
    ]);
    assert.deepStrictEqual(fields[6]?.chips, [
      { text: "approved:doc-1", refused: false, removeLabel: "approved:doc-1" },
    ]);
  });

  it.effect("a result goes stale when a chip moves the draft", () =>
    Effect.gen(function* () {
      const s = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      yield* s.run("Run");
      assert.isFalse(s.getSnapshot().stale);

      s.addChip("roles", "a");

      assert.isTrue(s.getSnapshot().stale);
    }));
});

describe("the form's own commands", () => {
  it("keeps the last resource that parsed while the text does not", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
    session.editResourceText('{"id":"x"}');
    session.editResourceText('{"id":"x"');
    const snapshot = session.getSnapshot();
    assert.deepStrictEqual(snapshot.draft.resource, { id: "x" });
    assert.strictEqual(snapshot.resourceText.text, '{"id":"x"');
    assert.isDefined(snapshot.resourceText.error);

    session.editResourceText("");
    assert.isUndefined(session.getSnapshot().draft.resource);
    assert.isUndefined(session.getSnapshot().resourceText.error);
  });

  it("re-renders the resource text when an edit changes the resource, and not otherwise", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
    session.editResourceText("{oops");
    session.edit({ ...session.getSnapshot().draft, action: "read" });
    assert.strictEqual(session.getSnapshot().resourceText.text, "{oops");
    session.edit({ ...session.getSnapshot().draft, resource: { id: "y" } });
    assert.strictEqual(session.getSnapshot().resourceText.text, '{"id":"y"}');
    session.edit({ ...session.getSnapshot().draft, resource: { n: Number.NaN } });
    assert.deepStrictEqual(session.getSnapshot().resourceText.text, "");
    assert.isDefined(session.getSnapshot().resourceText.error);
  });

  it("renames the subject and moves the elements that named it — C5", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
    session.edit({
      subject: { id: "alice" },
      relationships: [
        { subjectId: "alice", relation: "owner", resourceId: "d" },
        { subjectId: "bob", relation: "owner", resourceId: "d" },
      ],
    });
    session.renameSubject("carol");
    const draft = session.getSnapshot().draft;
    assert.strictEqual(draft.subject.id, "carol");
    assert.deepStrictEqual(
      draft.relationships?.map((edge) => edge.subjectId),
      ["carol", "bob"],
    );
  });

  it.effect("a renamed subject's edge still allows, and an unrelated edit rewrites nothing — T4 (a)", () =>
    Effect.gen(function* () {
      const session = makeSimulationSession({ sightings: [sighting(hasRelationship("owner"))] });
      session.editResourceText('{"id":"doc-1"}');
      session.edit({
        ...session.getSnapshot().draft,
        relationships: [{ subjectId: "someone", relation: "owner", resourceId: "doc-1" }],
      });
      session.renameSubject("bob");
      yield* session.run("Run");
      const allowed = (): boolean => {
        const run = session.getSnapshot().run;
        return run._tag === "Ran" && run.outcome._tag === "Decided" && run.outcome.decision._tag === "Allow";
      };
      assert.isTrue(allowed());

      session.edit({
        ...session.getSnapshot().draft,
        relationships: [
          ...(session.getSnapshot().draft.relationships ?? []),
          { subjectId: "bob", relation: "viewer", resourceId: "doc-9" },
        ],
      });
      yield* session.run("Run");
      assert.isTrue(allowed());
      assert.strictEqual(session.getSnapshot().draft.relationships?.[0]?.subjectId, "bob");
    }));

  it("every no-op command leaves the snapshot and the subscribers alone", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
    const sightings = session.getSnapshot().sightings;
    const seen = counted(session);
    const before = session.getSnapshot();

    session.setSightings([...sightings]);
    session.choosePolicy(hasRole("a"));
    session.seed(undefined);
    session.setPorts(undefined);
    session.chooseSource("Fixtures");
    session.setClock("live");
    session.setPairs(false);
    session.edit(before.draft);
    session.renameSubject(before.draft.subject.id);
    session.removeChip("roles", 0);
    session.removeChip("signatures", 3);
    assert.deepStrictEqual(session.addChip("history", "  "), { _tag: "Refused", reason: "nothing to add" });

    assert.strictEqual(seen.notified, 0);
    assert.strictEqual(session.getSnapshot(), before);
  });

  it("every effective command notifies once and replaces the snapshot", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
    const seen = counted(session);
    const effective: ReadonlyArray<(s: SimulationSession) => void> = [
      (s) => s.setSightings([sighting(hasRole("b"))]),
      (s) => s.chooseSource("Snapshot"),
      (s) => s.setClock("deterministic"),
      (s) => s.setPairs(true),
      (s) => s.edit({ subject: { id: "x" } }),
      (s) => s.renameSubject("y"),
      (s) => s.addChip("roles", "editor"),
      (s) => s.removeChip("roles", 0),
      (s) => s.editResourceText('{"a":1}'),
      (s) => s.setPorts(brokenPorts),
      (s) => s.seed(entryOf(decisionRecord({ evaluationId: "ev-8", policy: hasRole("z") }))),
    ];
    let notified = 0;
    for (const command of effective) {
      const before = session.getSnapshot();
      command(session);
      notified += 1;
      assert.notStrictEqual(session.getSnapshot(), before);
      assert.strictEqual(seen.notified, notified);
    }
  });

  it("stops notifying an unsubscribed listener", () => {
    const session = makeSimulationSession();
    let count = 0;
    const off = session.subscribe(() => {
      count += 1;
    });
    session.setPairs(true);
    off();
    session.setPairs(false);
    assert.strictEqual(count, 1);
  });
});

describe("a defect in the layer the host supplied", () => {
  it.effect("is reported as a broken run rather than swallowed", () =>
    Effect.gen(function* () {
      const dying = portsLayer({
        AttributeResolver: Layer.effect(AttributeResolver, Effect.die(new Error("the layer exploded"))),
      });
      const session = sessionWith(clearance);
      session.setPorts(dying);
      session.chooseSource("Live");
      yield* session.run("Run");

      const run = session.getSnapshot().run;
      assert.strictEqual(run._tag, "Broke");
      assert.include(run._tag === "Broke" ? run.message : "", "the layer exploded");
    }));
});

describe("tracing", () => {
  it.effect("emits a qadi.devtools.simulationSession.run span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const session = sessionWith(hasRole("a"));
      yield* session.run("Run").pipe(Effect.provide(collectingTracer(spans)));
      assert.isDefined(spans.find((s) => s.name === "qadi.devtools.simulationSession.run"));
    }));
});

describe("what the session starts from, and what each command preserves", () => {
  it("starts empty, on fixtures, with no capture", () => {
    const snapshot = makeSimulationSession().getSnapshot();
    assert.deepStrictEqual(snapshot.sightings, []);
    assert.deepStrictEqual(snapshot.resourceText, { text: "", error: undefined });
    assert.strictEqual(snapshot.sourceChoice, "Fixtures");
    assert.isUndefined(snapshot.capture);
    assert.isUndefined(snapshot.plan);
    assert.strictEqual(snapshot.run._tag, "Idle");
  });

  it("treats a rail that differs in one element as a change, and an equal one as none", () => {
    const a = sighting(hasRole("a"));
    const b = sighting(hasRole("b"));
    const c = sighting(hasRole("c"));
    const session = makeSimulationSession({ sightings: [a, b] });
    const seen = counted(session);
    session.setSightings([a, c]);
    assert.strictEqual(seen.notified, 1);
    session.setSightings([a, c]);
    session.setSightings([a, c, b]);
    assert.strictEqual(seen.notified, 2);
  });

  it.effect("keeps the capture when a Fixtures run follows a Live one", () =>
    Effect.gen(function* () {
      const session = sessionWith(clearance);
      session.setPorts(brokenPorts);
      session.chooseSource("Live");
      yield* session.run("Run");
      session.chooseSource("Fixtures");
      yield* session.run("Run");
      assert.isDefined(session.getSnapshot().capture);
    }));

  it.effect("keeps a result when the ports change after it ran, and clears it on a new choice", () =>
    Effect.gen(function* () {
      const session = makeSimulationSession({
        sightings: [sighting(hasRole("a")), sighting(hasRole("b"))],
      });
      yield* session.run("Run");
      session.setPorts(brokenPorts);
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
      session.choosePolicy(hasRole("a"));
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
    }));

  it("leaving a seed with seed(undefined) clears the replayed policy", () => {
    const seed = entryOf(decisionRecord({ evaluationId: "ev-6", policy: hasRole("x") }));
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed });
    assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
    session.seed(undefined);
    assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
    const empty = makeSimulationSession({ sightings: [], seed });
    empty.seed(undefined);
    assert.strictEqual(empty.getSnapshot().policy._tag, "None");
  });

  it("reports an accepted resource text as typed, with no error", () => {
    const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
    session.editResourceText('{"id":"x"}');
    assert.deepStrictEqual(session.getSnapshot().resourceText, { text: '{"id":"x"}', error: undefined });
  });

  it.effect("emits spans for the run, the reap it makes and dispose", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const session = sessionWith(hasRole("a"));
      yield* Effect.gen(function* () {
        yield* session.run("Run");
        yield* session.dispose;
      }).pipe(Effect.provide(collectingTracer(spans)));
      const names = spans.map((s) => s.name);
      assert.include(names, "qadi.devtools.simulationSession.reap");
      assert.include(names, "qadi.devtools.simulationSession.dispose");
    }));
});
