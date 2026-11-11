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
  Decided,
  Failed,
  gte,
  hasAction,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  hasSignature,
  MissingAction,
  MissingResource,
  obligation,
  obliged,
  PortReply,
  portsLayer,
  scriptedPort,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { collectingTracer } from "@qadi/testing";
import { answerCount } from "../../src/model/Capture.ts";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import { readOutcome } from "../../src/model/Inspect.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import type { SimulationSession } from "../../src/model/SimulationSession.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { allow, decisionRecord, failedRecord, obligationRecord, read } from "../helpers.ts";

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

/** A session over one policy, built in the test's scope, with `input` as its form. */
const sessionWith = (policy: Policy, input: SimulationInput = withClearance) =>
  Effect.gen(function* () {
    const session = yield* makeSimulationSession({ sightings: [sighting(policy)] });
    session.edit(input);
    return session;
  });

const counted = (session: SimulationSession) => {
  const seen = { notified: 0 };
  session.subscribe(() => {
    seen.notified += 1;
  });
  return seen;
};

// The helpers below drive the scoped interface (ARCH-73, ADR-QD-137): `run` is a
// command that forks into the session's own handle, so a test starts one and then
// waits on the snapshot rather than joining a fiber it was handed.

/** Starts a run, and lets its program reach the sleeping port. */
const startRun = (session: SimulationSession, kind: "Run" | "Sweep" = "Run") =>
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
      const session = yield* sessionWith(clearance);
      // Sanity: the fixture would have allowed.
      yield* ran(session);
      const fixture = session.getSnapshot().run;
      assert.strictEqual(fixture._tag === "Ran" && fixture.outcome._tag === "Decided", true);

      session.chooseSource("Live");
      yield* ran(session);

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
      const session = yield* sessionWith(clearance);
      session.chooseSource("Snapshot");
      yield* ran(session, "Sweep");

      const run = session.getSnapshot().run;
      assert.strictEqual(run._tag === "Refused" && run.refusal._tag, "SnapshotWithoutCapture");
    }));

  it.effect("honours the choice again once the host supplies ports", () =>
    Effect.gen(function* () {
      const session = yield* sessionWith(clearance);
      session.chooseSource("Live");
      assert.strictEqual(session.getSnapshot().refusal?._tag, "LiveWithoutPorts");

      session.setPorts(brokenPorts);
      assert.isUndefined(session.getSnapshot().refusal);
      assert.strictEqual(session.getSnapshot().sourceChoice, "Live");
      yield* ran(session);
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
    }));

  it.effect("a refusal does not leave an earlier run's fiber behind", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = yield* sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");
      yield* startRun(session);
      session.chooseSource("Snapshot");
      yield* ran(session);

      assert.strictEqual(session.getSnapshot().run._tag, "Refused");
      assert.strictEqual(tally.interrupted, 1);
      assert.strictEqual(tally.finished, 0);
    }));
});

describe("a Live run captures — C3", () => {
  it.effect("stores the answers, offers Snapshot, replays the outage, and drops them with the ports", () =>
    Effect.gen(function* () {
      const session = yield* sessionWith(clearance);
      session.setPorts(brokenPorts);
      assert.isUndefined(session.getSnapshot().capture);
      assert.isFalse(session.getSnapshot().options[1]?.enabled);

      session.chooseSource("Live");
      yield* ran(session);
      const live = session.getSnapshot();
      assert.strictEqual(live.run._tag, "Ran");
      assert.isDefined(live.capture);
      assert.isTrue(live.options[1]?.enabled);
      assert.strictEqual(live.run._tag === "Ran" && live.run.outcome._tag, "Failed");

      session.chooseSource("Snapshot");
      yield* ran(session);
      const replay = session.getSnapshot().run;
      assert.strictEqual(replay._tag === "Ran" && replay.outcome._tag, "Failed");
      assert.strictEqual(replay._tag === "Ran" && replay.question.source, "Snapshot");

      session.setPorts(otherBrokenPorts);
      assert.isUndefined(session.getSnapshot().capture);
      assert.isFalse(session.getSnapshot().options[1]?.enabled);
      yield* ran(session);
      assert.strictEqual(
        session.getSnapshot().run._tag === "Refused" && session.getSnapshot().refusal?._tag,
        "SnapshotWithoutCapture",
      );
    }));

  it.effect("keeps the capture across edits and a re-seed", () =>
    Effect.gen(function* () {
      const session = yield* sessionWith(clearance);
      session.setPorts(brokenPorts);
      session.chooseSource("Live");
      yield* ran(session);
      session.edit({ ...withClearance, action: "read" });
      session.seed(entryOf(decisionRecord({ evaluationId: "ev-1", policy: clearance })));
      assert.isDefined(session.getSnapshot().capture);
    }));

  it.effect("does not capture on Fixtures, and keeps the same ports without dropping the capture", () =>
    Effect.gen(function* () {
      const session = yield* sessionWith(clearance);
      session.setPorts(brokenPorts);
      yield* ran(session);
      assert.isUndefined(session.getSnapshot().capture);
      session.chooseSource("Live");
      yield* ran(session);
      session.setPorts(brokenPorts);
      assert.isDefined(session.getSnapshot().capture);
    }));
});

describe("each Live run captures with its own recorder (ARCH-72)", () => {
  it.effect("a second Live run's capture holds only what that run asked", () =>
    Effect.gen(function* () {
      const a = hasAttribute("a", gte(1));
      const b = hasAttribute("b", gte(1));
      const session = yield* makeSimulationSession({
        sightings: [sighting(a), sighting(b)],
        ports: portsLayer({ AttributeResolver: attributeResolverFromRecord({ a: 1, b: 1 }) }),
      });
      session.edit(withClearance);
      session.chooseSource("Live");

      session.choosePolicy(a);
      yield* ran(session);
      const first = session.getSnapshot().capture;
      if (first === undefined) throw new Error("expected a capture after the first Live run");
      assert.strictEqual(answerCount(first), 1);

      session.choosePolicy(b);
      yield* ran(session);
      const second = session.getSnapshot().capture;
      if (second === undefined) throw new Error("expected a capture after the second Live run");
      assert.strictEqual(answerCount(second), 1);
    }));
});

describe("a superseded run never lands — C4", () => {
  it.effect("a second run interrupts the first, and only the second reports", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = yield* sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");

      yield* startRun(session);
      assert.strictEqual(session.getSnapshot().run._tag, "Running");
      yield* startRun(session);
      assert.strictEqual(tally.interrupted, 1);

      yield* TestClock.adjust("1 second");
      yield* settled(session);

      assert.strictEqual(tally.finished, 1);
      assert.strictEqual(tally.started, 2);
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
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

        yield* startRun(session, "Run");
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
  stopsAtOnce("a re-seed", (session) =>
    session.seed(entryOf(decisionRecord({ evaluationId: "ev-5", policy: hasRole("x") }))),
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
      yield* startRun(session, "Run");
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
      yield* ran(session);

      const run = spans.find((s) => s.name === "qadi.devtools.simulationSession.run");
      assert.isDefined(run);
      assert.isTrue(run !== undefined && Option.isNone(run.parent));
      assert.isDefined(spans.find((s) => s.name === "qadi.devtools.makeSimulationSession"));
      const names = spans.map((s) => s.name);
      assert.notInclude(names, "qadi.devtools.simulationSession.reap");
      assert.notInclude(names, "qadi.devtools.simulationSession.dispose");
    }));
});

/** The run that finished, narrowed by an `if` rather than asserted. */
const finishedRun = (session: SimulationSession) => {
  const run = session.getSnapshot().run;
  if (run._tag !== "Ran") throw new Error("expected a finished run");
  return run;
};

describe("the view's commands are the session's (ARCH-73)", () => {
  it.effect("setAction commits the text as the action, and an empty text removes it", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      const seen = counted(session);

      session.setAction("read");
      assert.strictEqual(session.getSnapshot().draft.action, "read");
      assert.strictEqual(seen.notified, 1);

      session.setAction("");
      // Removed, not set to "": `hasAction` fails with `MissingAction` when none was supplied.
      assert.isFalse("action" in session.getSnapshot().draft);
      assert.strictEqual(seen.notified, 2);
    }));

  it.effect("setAction with the text the draft already has notifies no one", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      const seen = counted(session);

      session.setAction("");
      assert.strictEqual(seen.notified, 0);

      session.setAction("read");
      session.setAction("read");
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect("choosePolicyAt(position) chooses the sighting listed at that position", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({
        sightings: [sighting(clearance), sighting(hasRole("x"))],
      });
      const seen = counted(session);

      session.choosePolicyAt(1);
      const policy = session.getSnapshot().policy;
      assert.strictEqual(policy._tag, "Chosen");
      assert.strictEqual(policy._tag === "Chosen" && policy.index, 1);
      assert.isTrue(policy._tag === "Chosen" && Equal.equals(policy.policy, hasRole("x")));
      assert.strictEqual(seen.notified, 1);
    }));

  it.effect("choosePolicyAt names a position of the menu, which a seeded or evicted entry shifts by one", () =>
    Effect.gen(function* () {
      const seeded = yield* makeSimulationSession({
        sightings: [sighting(hasRole("a"))],
        seed: entryOf(decisionRecord({ evaluationId: "ev-s", policy: hasRole("s") })),
      });
      const seededSeen = counted(seeded);
      // Position 0 is "from the replayed row": choosing it is not choosing a policy.
      seeded.choosePolicyAt(0);
      assert.strictEqual(seeded.getSnapshot().policy._tag, "Seeded");
      assert.strictEqual(seededSeen.notified, 0);
      seeded.choosePolicyAt(1);
      const left = seeded.getSnapshot().policy;
      assert.isTrue(left._tag === "Chosen" && left.index === 0 && Equal.equals(left.policy, hasRole("a")));

      const evicted = yield* makeSimulationSession({
        sightings: [sighting(hasRole("a")), sighting(hasRole("b"))],
      });
      evicted.choosePolicy(hasRole("b"));
      evicted.setSightings([sighting(hasRole("a"))]);
      const evictedSeen = counted(evicted);
      evicted.choosePolicyAt(0);
      assert.strictEqual(evicted.getSnapshot().policy._tag, "Evicted");
      assert.strictEqual(evictedSeen.notified, 0);
      evicted.choosePolicyAt(1);
      const back = evicted.getSnapshot().policy;
      assert.isTrue(back._tag === "Chosen" && Equal.equals(back.policy, hasRole("a")));
    }));

  it.effect("choosePolicyAt a position that lists nothing, or not a whole position, changes nothing", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({
        sightings: [sighting(clearance), sighting(hasRole("x"))],
      });
      const before = session.getSnapshot();
      const seen = counted(session);
      for (const position of [2, 5, -1, 0.5, Number.NaN]) session.choosePolicyAt(position);
      assert.strictEqual(seen.notified, 0);
      assert.strictEqual(session.getSnapshot(), before);
    }));

  describe("policyMenu is what the dropdown lists, in order, with the option it shows selected", () => {
    const named: PolicySighting = { ...sighting(hasRole("a")), label: "canArchive" };
    const other = sighting(hasRole("b"));

    it.effect("is empty and selects nothing while there is no policy", () =>
      Effect.gen(function* () {
        const session = yield* makeSimulationSession();
        assert.deepStrictEqual(session.getSnapshot().policyMenu, { options: [], selected: "" });
      }));

    it.effect("lists each sighting by its label and value `String(index)`, and selects the chosen one", () =>
      Effect.gen(function* () {
        const session = yield* makeSimulationSession({ sightings: [named, other] });
        const options = [
          { value: "0", label: "canArchive" },
          { value: "1", label: other.label },
        ];
        assert.deepStrictEqual(session.getSnapshot().policyMenu, { options, selected: "0" });

        session.choosePolicy(hasRole("b"));
        assert.deepStrictEqual(session.getSnapshot().policyMenu, { options, selected: "1" });
      }));

    it.effect("leads with the evicted choice, labelled as no longer in the log", () =>
      Effect.gen(function* () {
        const session = yield* makeSimulationSession({ sightings: [named, other] });
        session.choosePolicy(hasRole("b"));
        session.setSightings([named]);
        assert.deepStrictEqual(session.getSnapshot().policyMenu, {
          options: [
            { value: "evicted", label: `${other.label} — no longer in the log` },
            { value: "0", label: "canArchive" },
          ],
          selected: "evicted",
        });
      }));

    it.effect("leads with the replayed row while seeded", () =>
      Effect.gen(function* () {
        const session = yield* makeSimulationSession({
          sightings: [named],
          seed: entryOf(decisionRecord({ evaluationId: "ev-s", policy: hasRole("s") })),
        });
        assert.deepStrictEqual(session.getSnapshot().policyMenu, {
          options: [
            { value: "seeded", label: "from the replayed row" },
            { value: "0", label: "canArchive" },
          ],
          selected: "seeded",
        });
      }));
  });
});

// These readings are asserted here, at the session, and not only through the DOM:
// the session is under the devtools mutation gate (`stryker.devtools.mjs` mutates
// `src/model/**`) and the view is not, so a sentence that moves into the model is
// held by this suite or by nothing.
describe("what the view shows is read by the session (ARCH-73)", () => {
  describe("a finished run carries its reading", () => {
    it.effect("Allowed, with the fields and duties readOutcome gives, when the grant is there", () =>
      Effect.gen(function* () {
        const session = yield* sessionWith(
          hasPermission(read, { fields: ["title"] }),
          { subject: { id: "alice" } },
        );
        session.addChip("permissions", "doc:read");
        yield* ran(session);

        const run = finishedRun(session);
        assert.deepStrictEqual(run.reading, readOutcome(run.question.policy, run.outcome, undefined));
        assert.strictEqual(run.reading._tag, "Allowed");
        assert.deepStrictEqual(run.reading._tag === "Allowed" && run.reading.fields, ["title"]);
      }));

    it.effect("Allowed with the duty owed and unreported: a simulation discharges nothing", () =>
      Effect.gen(function* () {
        const session = yield* sessionWith(
          obliged(obligation("audit"), hasPermission(read)),
          { subject: { id: "alice" } },
        );
        session.addChip("permissions", "doc:read");
        yield* ran(session);

        const { reading } = finishedRun(session);
        assert.strictEqual(reading._tag === "Allowed" && reading.duties.length, 1);
        assert.strictEqual(reading._tag === "Allowed" && reading.obligation._tag, "Unreported");
      }));

    it.effect("Denied without the grant", () =>
      Effect.gen(function* () {
        const session = yield* sessionWith(hasPermission(read), { subject: { id: "alice" } });
        yield* ran(session);
        assert.strictEqual(finishedRun(session).reading._tag, "Denied");
      }));

    it.effect("Failed, with the error, when a resolver was down", () =>
      Effect.gen(function* () {
        const session = yield* makeSimulationSession({
          sightings: [sighting(clearance)],
          ports: brokenPorts,
        });
        session.edit(withClearance);
        session.chooseSource("Live");
        yield* ran(session);

        const { reading } = finishedRun(session);
        assert.strictEqual(reading._tag, "Failed");
        assert.strictEqual(reading._tag === "Failed" && reading.error._tag, "AttributeResolveError");
      }));
  });

  describe("cost is the sentence above the buttons, and warns exactly when the plan does I/O", () => {
    const holdsBoth: SimulationInput = { subject: { id: "alice", roles: ["a", "b"] } };
    const costOf = (session: SimulationSession) => {
      const snapshot = session.getSnapshot();
      assert.strictEqual(snapshot.cost.warns, snapshot.plan?.causesIO === true);
      return snapshot.cost;
    };

    it.effect("is empty while there is no policy", () =>
      Effect.gen(function* () {
        const session = yield* makeSimulationSession();
        assert.deepStrictEqual(costOf(session), { sentence: "", warns: false });
      }));

    it.effect("states the evaluations a sweep runs, all in this process, with pairs off and on", () =>
      Effect.gen(function* () {
        const session = yield* sessionWith(allOf([hasRole("a"), hasRole("b")]), holdsBoth);
        for (const pairs of [false, true]) {
          session.setPairs(pairs);
          const stated = session.getSnapshot().plan?.evaluations;
          assert.isDefined(stated);
          assert.deepStrictEqual(costOf(session), {
            sentence: `a sweep runs ${stated} evaluations, all in this process`,
            warns: false,
          });
        }
      }));

    it.effect("warns before a sweep that reaches the host's live resolvers", () =>
      Effect.gen(function* () {
        const session = yield* sessionWith(allOf([hasRole("a"), hasRole("b")]), holdsBoth);
        session.setPorts(brokenPorts);
        session.chooseSource("Live");
        const stated = session.getSnapshot().plan?.evaluations;
        assert.deepStrictEqual(costOf(session), {
          sentence: `a sweep runs ${stated} evaluations against your live resolvers`,
          warns: true,
        });
      }));

    it.effect("says a run would be refused, and does not warn, once Live loses its ports", () =>
      Effect.gen(function* () {
        const session = yield* sessionWith(hasRole("a"), holdsBoth);
        session.setPorts(brokenPorts);
        session.chooseSource("Live");
        session.setPorts(undefined);
        assert.isDefined(session.getSnapshot().plan);
        assert.deepStrictEqual(costOf(session), {
          sentence:
            "a run would be refused: the host did not pass a `ports` layer, so this panel cannot reach any resolver",
          warns: false,
        });
      }));
  });

  describe("baselineReading is whether the reconstruction reproduces the replayed row, in one line", () => {
    const seededWith = (record: Parameters<typeof entryOf>[0]) =>
      makeSimulationSession({ sightings: [], seed: entryOf(record) });

    const reading = (session: SimulationSession) => session.getSnapshot().baselineReading;

    it.effect("a match claims it, and only a match", () =>
      Effect.gen(function* () {
        const session = yield* seededWith(
          decisionRecord({ evaluationId: "ev-91", policy: hasPermission(read), action: "read" }),
        );
        session.addChip("permissions", "doc:read");
        yield* ran(session);
        assert.deepStrictEqual(reading(session), {
          matches: true,
          sentence: "matches — this reconstruction reproduces the logged decision",
        });
      }));

    it.effect("a flipped verdict names the node that turned", () =>
      Effect.gen(function* () {
        const session = yield* seededWith(
          decisionRecord({ evaluationId: "ev-91", policy: hasPermission(read), action: "read" }),
        );
        yield* ran(session);
        assert.deepStrictEqual(reading(session), {
          matches: false,
          sentence: "differs — HasPermission at the root was allowed and is now denied",
        });
      }));

    it.effect("a difference that leaves the verdict alone counts its differences, one or more", () =>
      Effect.gen(function* () {
        const narrowed = yield* seededWith(
          decisionRecord({
            evaluationId: "ev-12",
            policy: hasPermission(read),
            outcome: new Decided({ decision: allow({ evaluationId: "ev-12", visibleFields: ["title"] }) }),
          }),
        );
        narrowed.addChip("permissions", "doc:read");
        yield* ran(narrowed);
        assert.deepStrictEqual(reading(narrowed), {
          matches: false,
          sentence: "differs at 1 node, with the same verdict",
        });

        const owed = yield* seededWith(
          decisionRecord({
            evaluationId: "ev-13",
            policy: hasPermission(read),
            outcome: new Decided({
              decision: allow({
                evaluationId: "ev-13",
                visibleFields: ["title"],
                obligations: [obligation("audit")],
              }),
            }),
          }),
        );
        owed.addChip("permissions", "doc:read");
        yield* ran(owed);
        assert.deepStrictEqual(reading(owed), {
          matches: false,
          sentence: "differs at 2 nodes, with the same verdict",
        });
      }));

    it.effect("a logged failure the reconstruction decided is said so, and claims no match", () =>
      Effect.gen(function* () {
        const session = yield* seededWith(failedRecord({ evaluationId: "ev-7" }));
        yield* ran(session);
        assert.deepStrictEqual(reading(session), {
          matches: false,
          sentence: "this reconstruction decided where the logged one failed",
        });
      }));

    it.effect("the same failure twice is not a match", () =>
      Effect.gen(function* () {
        const session = yield* seededWith(
          decisionRecord({
            evaluationId: "ev-7",
            policy: hasAction("publish"),
            outcome: new Failed({ error: new MissingAction({ expected: "publish" }) }),
          }),
        );
        yield* ran(session);
        assert.deepStrictEqual(reading(session), {
          matches: false,
          sentence: "the same failure, MissingAction",
        });
      }));

    it.effect("a different failure names both", () =>
      Effect.gen(function* () {
        const session = yield* seededWith(
          decisionRecord({
            evaluationId: "ev-14",
            policy: hasAction("publish"),
            outcome: new Failed({ error: new MissingResource({ attribute: "x" }) }),
          }),
        );
        yield* ran(session);
        assert.deepStrictEqual(reading(session), {
          matches: false,
          sentence: "a different failure: MissingResource then, MissingAction now",
        });
      }));

    it.effect("a reconstruction that broke where the logged row decided names the failure", () =>
      Effect.gen(function* () {
        const session = yield* makeSimulationSession({
          sightings: [sighting(clearance)],
          seed: entryOf(decisionRecord({ evaluationId: "ev-91", policy: clearance })),
          ports: brokenPorts,
        });
        session.chooseSource("Live");
        yield* ran(session);
        assert.deepStrictEqual(reading(session), {
          matches: false,
          sentence: "this reconstruction failed with AttributeResolveError where the logged one decided",
        });
      }));

    it.effect("is absent for an orphan, for a stale result, and before any run", () =>
      Effect.gen(function* () {
        const orphan = yield* makeSimulationSession({
          sightings: [sighting(hasRole("a"))],
          seed: entryOf(obligationRecord({ evaluationId: "ev-9" })),
        });
        assert.isUndefined(reading(orphan));
        yield* ran(orphan);
        assert.strictEqual(orphan.getSnapshot().baseline?._tag, "Unavailable");
        assert.isUndefined(reading(orphan));

        const decided = yield* seededWith(
          decisionRecord({ evaluationId: "ev-91", policy: hasPermission(read), action: "read" }),
        );
        assert.isUndefined(reading(decided));
        decided.addChip("permissions", "doc:read");
        yield* ran(decided);
        assert.isDefined(reading(decided));
        decided.setAction("write");
        assert.isTrue(decided.getSnapshot().stale);
        assert.isUndefined(reading(decided));
      }));
  });
});

describe("a result belongs to the question it answered", () => {
  it.effect("is stale once the form moves, and the policy or seed leaving clears it", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({
        sightings: [sighting(clearance), sighting(hasPermission(read))],
      });
      session.edit(withClearance);
      yield* ran(session);
      assert.isFalse(session.getSnapshot().stale);

      session.edit({ ...withClearance, action: "read" });
      assert.isTrue(session.getSnapshot().stale);

      session.choosePolicy(hasPermission(read));
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      assert.isFalse(session.getSnapshot().stale);
    }));

  it.effect("is not stale when the host passes an equal policy as a new object", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      yield* ran(session);
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
      const session = yield* makeSimulationSession({ sightings: [], seed: a });
      assert.isUndefined(session.getSnapshot().baseline);

      yield* ran(session);
      const first = session.getSnapshot();
      assert.strictEqual(first.baseline?._tag === "Checked" && first.baseline.evaluationId, "ev-A");

      session.edit({ ...first.draft, action: "x" });
      assert.isUndefined(session.getSnapshot().baseline);

      session.seed(b);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      assert.isUndefined(session.getSnapshot().baseline);
      yield* ran(session);
      const second = session.getSnapshot();
      assert.strictEqual(second.baseline?._tag === "Checked" && second.baseline.evaluationId, "ev-B");
    }));

  it.effect("drops the baseline when the reviewer leaves a replayed row for the rail", () =>
    Effect.gen(function* () {
      const a = entryOf(decisionRecord({ evaluationId: "ev-A", policy: hasRole("a") }));
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed: a });
      assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
      session.choosePolicy(hasRole("a"));
      assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
      yield* ran(session);
      assert.isUndefined(session.getSnapshot().baseline);
    }));

  it.effect("says an orphan carries no decision to compare against", () =>
    Effect.gen(function* () {
      const orphan = entryOf(obligationRecord({ evaluationId: "ev-9" }));
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed: orphan });
      yield* ran(session);
      assert.strictEqual(session.getSnapshot().baseline?._tag, "Unavailable");
    }));

  it.effect("never shows a result as answering a row replayed while that run was starting", () =>
    Effect.gen(function* () {
      // A live resolver whose cancellation takes time, as an aborted request's does:
      // the second run is in flight, and the reviewer replays an orphan meanwhile.
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
      const session = yield* sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");
      yield* startRun(session);
      yield* startRun(session);
      session.replay(orphan);

      yield* TestClock.adjust("1 second");
      const after = session.getSnapshot();
      // The replay superseded the run while it was in flight, so it never lands.
      assert.strictEqual(after.run._tag, "Idle");
      assert.isUndefined(after.baseline);
    }));

  it.effect("keeps no capture from an environment that was replaced while a run was starting", () =>
    Effect.gen(function* () {
      // Same slow-to-cancel resolver: the first run is still tearing down while the
      // second is in flight, and the host swaps the ports layer meanwhile.
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
      const session = yield* sessionWith(clearance);
      session.setPorts(ports);
      session.chooseSource("Live");
      yield* startRun(session);
      yield* startRun(session);

      session.setPorts(brokenPorts);

      yield* TestClock.adjust("2 seconds");
      const after = session.getSnapshot();
      assert.isUndefined(after.capture);
      assert.strictEqual(after.run._tag, "Idle");
      assert.isFalse(after.options.find((option) => option.id === "Snapshot")?.enabled);
    }));

  it.effect("labels the clock the run measured under", () =>
    Effect.gen(function* () {
      const session = yield* sessionWith(hasRole("a"));
      session.setClock("deterministic");
      yield* ran(session);
      const run = session.getSnapshot().run;
      assert.strictEqual(run._tag === "Ran" && run.clock, "deterministic");
    }));
});

describe("the cost line is the cost — C7", () => {
  const twoRoles: SimulationInput = { subject: { id: "alice", roles: ["a", "b"] } };

  it.effect("a sweep runs exactly the evaluations the plan stated, pairs off and on", () =>
    Effect.gen(function* () {
      const session = yield* sessionWith(allOf([hasRole("a"), hasRole("b")]), twoRoles);
      for (const pairs of [false, true]) {
        session.setPairs(pairs);
        const stated = session.getSnapshot().plan?.evaluations;
        yield* ran(session, "Sweep");
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
      const session = yield* sessionWith(hasRole("a"), twoRoles);
      assert.isFalse(session.getSnapshot().plan?.causesIO);
      session.setPorts(brokenPorts);
      session.chooseSource("Live");
      assert.isTrue(session.getSnapshot().plan?.causesIO);
      session.setPorts(undefined);
      assert.isFalse(session.getSnapshot().plan?.causesIO);
    }));

  it.effect("a single run keeps no report", () =>
    Effect.gen(function* () {
      const session = yield* sessionWith(hasRole("a"), twoRoles);
      yield* ran(session);
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

  it.effect("fills the policy, action and resource, and names every field it could not seed", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [], seed });
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
    }));

  it.effect("an orphan seeds nothing and leaves no policy", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({
        sightings: [],
        seed: entryOf(obligationRecord({ evaluationId: "ev-9" })),
      });
      assert.strictEqual(session.getSnapshot().policy._tag, "None");
    }));

  it.effect("resets the resource field and any unparsed text on a re-seed", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [], seed });
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
    }));

  it.effect("choosing from the rail leaves the replayed row behind", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed });
      assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
      session.choosePolicy(hasRole("a"));
      assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
    }));

  it.effect("keeps an evicted choice, marks it, and still runs it", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({
        sightings: [sighting(hasRole("a")), sighting(clearance)],
      });
      session.edit(withClearance);
      session.choosePolicy(clearance);
      session.setSightings([sighting(hasRole("a"))]);
      const policy = session.getSnapshot().policy;
      assert.strictEqual(policy._tag, "Evicted");
      assert.isTrue(policy._tag === "Evicted" && Equal.equals(policy.policy, clearance));
      assert.strictEqual(policy._tag === "Evicted" && policy.label, policyLabel(clearance));

      yield* ran(session);
      const finished = session.getSnapshot().run;
      assert.isTrue(finished._tag === "Ran" && Equal.equals(finished.question.policy, clearance));

      // An evicted choice outlives an empty rail.
      session.setSightings([]);
      assert.strictEqual(session.getSnapshot().policy._tag, "Evicted");
    }));

  it.effect("pins the head before any choice, and a new head does not move it", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession();
      assert.strictEqual(session.getSnapshot().policy._tag, "None");
      session.setSightings([sighting(hasRole("a"))]);
      session.setSightings([sighting(hasRole("b")), sighting(hasRole("a"))]);
      const policy = session.getSnapshot().policy;
      assert.strictEqual(policy._tag, "Chosen");
      if (policy._tag !== "Chosen") return;
      assert.isTrue(Equal.equals(policy.policy, hasRole("a")));
      assert.strictEqual(policy.index, 1);
    }));

  it.effect("does not pin while a replayed row is seeded, and pins when it is left", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ seed });
      session.setSightings([sighting(hasRole("a"))]);
      assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
      session.seed(undefined);
      session.setSightings([sighting(hasRole("b")), sighting(hasRole("a"))]);
      const policy = session.getSnapshot().policy;
      assert.isTrue(policy._tag === "Chosen" && Equal.equals(policy.policy, hasRole("a")));
    }));

  it.effect("pins the head at the moment a replayed row is left, not before", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed });
      session.setSightings([sighting(hasRole("a"))]);
      session.setSightings([sighting(hasRole("c")), sighting(hasRole("a"))]);
      session.seed(undefined);
      const policy = session.getSnapshot().policy;
      assert.isTrue(policy._tag === "Chosen" && Equal.equals(policy.policy, hasRole("c")));
    }));

  it.effect("choosing the held policy while a replayed row is seeded still leaves the row", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      session.seed(seed);
      assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
      session.choosePolicy(hasRole("a"));
      assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
    }));

  it.effect("remembers the rail's label for a chosen policy once it leaves the rail", () =>
    Effect.gen(function* () {
      const named: PolicySighting = { ...sighting(hasRole("a")), label: "canArchive" };
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("b")), named] });
      session.choosePolicy(hasRole("a"));
      session.setSightings([]);
      const policy = session.getSnapshot().policy;
      assert.strictEqual(policy._tag === "Evicted" && policy.label, "canArchive");
    }));

  it.effect("holds a policy chosen before the rail has any", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession();
      session.choosePolicy(hasRole("a"));
      session.setSightings([sighting(hasRole("b")), sighting(hasRole("a"))]);
      const policy = session.getSnapshot().policy;
      assert.isTrue(policy._tag === "Chosen" && Equal.equals(policy.policy, hasRole("a")));
    }));

  it.effect("refuses nothing: choosing an unlisted policy holds it as evicted", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      session.choosePolicy(hasRole("zzz"));
      const policy = session.getSnapshot().policy;
      assert.isTrue(policy._tag === "Evicted" && Equal.equals(policy.policy, hasRole("zzz")));
      assert.strictEqual(policy._tag === "Evicted" && policy.label, policyLabel(hasRole("zzz")));
    }));

  it.effect("runs nothing when there is no policy", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession();
      yield* ran(session);
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

  it.effect("re-seeds from the row it was last seeded from after another policy was chosen", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("b"))] });
      session.seed(a);
      session.choosePolicy(hasRole("b"));
      assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
      session.replay(a);
      seededFromA(session);
    }));

  it.effect("re-seeds the form after an edit, and drops the run in flight", () =>
    Effect.gen(function* () {
      const { ports, tally } = slow();
      const session = yield* makeSimulationSession({ sightings: [], ports, seed: a });
      session.edit({ ...session.getSnapshot().draft, action: "write", attributes: { clearance: 9 } });
      session.editResourceText("{oops");
      session.chooseSource("Live");
      yield* startRun(session);
      assert.strictEqual(session.getSnapshot().run._tag, "Running");

      const seen = counted(session);
      session.replay(a);
      assert.strictEqual(seen.notified, 1);
      seededFromA(session);
      assert.isUndefined(session.getSnapshot().draft.attributes);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");

      yield* Effect.yieldNow;
      assert.strictEqual(tally.interrupted, 1);
      yield* TestClock.adjust("1 second");
      assert.strictEqual(tally.finished, 0);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
    }));

  it.effect("seed with the entry it holds is a no-op, so an effect re-run keeps the edited form", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [] });
      session.seed(a);
      session.edit({ ...session.getSnapshot().draft, action: "write" });
      const seen = counted(session);
      session.seed(a);
      assert.strictEqual(seen.notified, 0);
      assert.strictEqual(session.getSnapshot().draft.action, "write");
    }));

  it.effect("seed after a replay of the same entry keeps the replay's edited form", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [] });
      session.replay(a);
      seededFromA(session);
      session.edit({ ...session.getSnapshot().draft, action: "write" });
      session.seed(a);
      assert.strictEqual(session.getSnapshot().draft.action, "write");
      assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
    }));

  it.effect("replaying a row that cannot be replayed leaves the seed as seed does", () =>
    Effect.gen(function* () {
      const orphan = entryOf(obligationRecord({ evaluationId: "ev-orphan" }));
      const replayed = yield* makeSimulationSession({ sightings: [sighting(hasRole("b"))], seed: a });
      const seeded = yield* makeSimulationSession({ sightings: [sighting(hasRole("b"))], seed: a });
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
    }));
});

describe("choosing a policy", () => {
  it.effect("keeps the chosen policy when a decision reorders the rail", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({
        sightings: [sighting(hasRole("a")), sighting(hasRole("b"))],
      });
      session.choosePolicy(hasRole("b"));
      session.setSightings([sighting(hasRole("b")), sighting(hasRole("a"))]);
      const policy = session.getSnapshot().policy;
      assert.strictEqual(policy._tag, "Chosen");
      if (policy._tag !== "Chosen") return;
      assert.isTrue(Equal.equals(policy.policy, hasRole("b")));
      assert.strictEqual(policy.index, 0);
    }));

  it.effect("keeps the chosen policy when a new policy decides first", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({
        sightings: [sighting(hasRole("a")), sighting(hasRole("b"))],
      });
      session.choosePolicy(hasRole("b"));
      session.setSightings([sighting(hasRole("c")), sighting(hasRole("a")), sighting(hasRole("b"))]);
      const policy = session.getSnapshot().policy;
      assert.strictEqual(policy._tag, "Chosen");
      if (policy._tag !== "Chosen") return;
      assert.isTrue(Equal.equals(policy.policy, hasRole("b")));
      assert.strictEqual(policy.index, 2);
    }));

  it.effect("runs the chosen policy after the rail moved", () =>
    Effect.gen(function* () {
      const admin = hasRole("admin");
      const session = yield* makeSimulationSession({ sightings: [sighting(admin), sighting(clearance)] });
      session.edit(withClearance);
      session.choosePolicy(clearance);
      yield* ran(session);
      const first = session.getSnapshot().run;
      assert.strictEqual(first._tag, "Ran");
      assert.isTrue(first._tag === "Ran" && Equal.equals(first.question.policy, clearance));

      session.setSightings([sighting(clearance), sighting(admin)]);
      yield* ran(session);
      const second = session.getSnapshot().run;
      assert.strictEqual(second._tag, "Ran");
      assert.isTrue(second._tag === "Ran" && Equal.equals(second.question.policy, clearance));
    }));
});

describe("the sweep the session states", () => {
  // Through the session, not `singleEdits`: the review reproduced the gap here,
  // because this is the plan a reviewer reads before running a sweep.
  it.effect("offers to drop a signature fixture, and counts that row", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasSignature("approved"))] });
      session.edit({
        subject: { id: "alice" },
        resource: { id: "doc-1" },
        signatures: [{ subjectId: "alice", meaning: "approved", resourceId: "doc-1" }],
      });

      const plan = session.getSnapshot().plan;
      assert.deepStrictEqual(plan?.edits.map((edit) => edit.kind), ["DropSignature"]);
      assert.strictEqual(plan?.evaluations, 2);
    }));
});

describe("the form's fields, through the session", () => {
  const session = () => makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
  const added = (s: SimulationSession, field: Parameters<SimulationSession["addChip"]>[0], text: string) =>
    s.addChip(field, text);

  it.effect("attributes a short-form element to the current subject, and a rename moves it with the subject", () =>
    Effect.gen(function* () {
      const s = yield* session();
      s.edit({ subject: { id: "alice" } });
      assert.deepStrictEqual(added(s, "relationships", "owner:doc-1"), { _tag: "Ok" });
      s.renameSubject("bob");
      // An unrelated edit afterwards rewrites nothing: the first edge followed the rename.
      assert.deepStrictEqual(added(s, "relationships", "viewer:doc-9"), { _tag: "Ok" });

      assert.deepStrictEqual(s.getSnapshot().draft.relationships, [
        { subjectId: "bob", relation: "owner", resourceId: "doc-1" },
        { subjectId: "bob", relation: "viewer", resourceId: "doc-9" },
      ]);
    }));

  it.effect("refuses a structural duplicate with a reason, leaving the draft and the subscribers alone", () =>
    Effect.gen(function* () {
      const s = yield* session();
      added(s, "relationships", "owner:doc-1");
      const seen = counted(s);
      const before = s.getSnapshot();

      assert.deepStrictEqual(added(s, "relationships", "owner:doc-1"), {
        _tag: "Refused",
        reason: "already there",
      });
      assert.strictEqual(s.getSnapshot(), before);
      assert.strictEqual(seen.notified, 0);
    }));

  it.effect("keeps two edges that differ only by subject as two chips", () =>
    Effect.gen(function* () {
      const s = yield* session();
      added(s, "relationships", "owner:doc-1");
      added(s, "relationships", '{"subjectId":"bob","relation":"owner","resourceId":"doc-1"}');

      assert.strictEqual(s.getSnapshot().draft.relationships?.length, 2);
    }));

  it.effect("refuses empty text and text the field's codec refuses", () =>
    Effect.gen(function* () {
      const s = yield* session();

      assert.deepStrictEqual(added(s, "roles", "  "), { _tag: "Refused", reason: "nothing to add" });
      assert.deepStrictEqual(added(s, "permissions", "nocolon"), {
        _tag: "Refused",
        reason: "expected resource:action",
      });
      assert.deepStrictEqual(s.getSnapshot().draft, { subject: { id: "someone" } });
    }));

  it.effect("replaces a pair of the same name on a record field, and puts it last", () =>
    Effect.gen(function* () {
      const s = yield* session();
      added(s, "attributes", "a:1");
      added(s, "attributes", "b:2");
      assert.deepStrictEqual(added(s, "attributes", "a:3"), { _tag: "Ok" });

      assert.deepStrictEqual(Object.entries(s.getSnapshot().draft.attributes ?? {}), [["b", 2], ["a", 3]]);
    }));

  it.effect("removes exactly one chip, and an absent field is a no-op that does not notify", () =>
    Effect.gen(function* () {
      const s = yield* session();
      added(s, "roles", "a");
      added(s, "roles", "b");
      s.removeChip("roles", 0);
      assert.deepStrictEqual(s.getSnapshot().draft.subject.roles, ["b"]);

      const seen = counted(s);
      s.removeChip("history", 0);
      s.removeChip("roles", 5);
      assert.strictEqual(seen.notified, 0);
    }));

  it.effect("reads the form: seven rows in the form's order, a refused value as its refusal", () =>
    Effect.gen(function* () {
      const s = yield* session();
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
    }));

  it.effect("a result goes stale when a chip moves the draft", () =>
    Effect.gen(function* () {
      const s = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      yield* ran(s, "Run");
      assert.isFalse(s.getSnapshot().stale);

      s.addChip("roles", "a");

      assert.isTrue(s.getSnapshot().stale);
    }));
});

describe("the form's own commands", () => {
  it.effect("keeps the last resource that parsed while the text does not", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      session.editResourceText('{"id":"x"}');
      session.editResourceText('{"id":"x"');
      const snapshot = session.getSnapshot();
      assert.deepStrictEqual(snapshot.draft.resource, { id: "x" });
      assert.strictEqual(snapshot.resourceText.text, '{"id":"x"');
      assert.isDefined(snapshot.resourceText.error);

      session.editResourceText("");
      assert.isUndefined(session.getSnapshot().draft.resource);
      assert.isUndefined(session.getSnapshot().resourceText.error);
    }));

  it.effect("re-renders the resource text when an edit changes the resource, and not otherwise", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      session.editResourceText("{oops");
      session.edit({ ...session.getSnapshot().draft, action: "read" });
      assert.strictEqual(session.getSnapshot().resourceText.text, "{oops");
      session.edit({ ...session.getSnapshot().draft, resource: { id: "y" } });
      assert.strictEqual(session.getSnapshot().resourceText.text, '{"id":"y"}');
      session.edit({ ...session.getSnapshot().draft, resource: { n: Number.NaN } });
      assert.deepStrictEqual(session.getSnapshot().resourceText.text, "");
      assert.isDefined(session.getSnapshot().resourceText.error);
    }));

  it.effect("renames the subject and moves the elements that named it — C5", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
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
    }));

  it.effect("a renamed subject's edge still allows, and an unrelated edit rewrites nothing — T4 (a)", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRelationship("owner"))] });
      session.editResourceText('{"id":"doc-1"}');
      session.edit({
        ...session.getSnapshot().draft,
        relationships: [{ subjectId: "someone", relation: "owner", resourceId: "doc-1" }],
      });
      session.renameSubject("bob");
      yield* ran(session);
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
      yield* ran(session);
      assert.isTrue(allowed());
      assert.strictEqual(session.getSnapshot().draft.relationships?.[0]?.subjectId, "bob");
    }));

  it.effect("every no-op command leaves the snapshot and the subscribers alone", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
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
    }));

  it.effect("every effective command notifies once and replaces the snapshot", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
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
    }));

  it.effect("stops notifying an unsubscribed listener", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession();
      let count = 0;
      const off = session.subscribe(() => {
        count += 1;
      });
      session.setPairs(true);
      off();
      session.setPairs(false);
      assert.strictEqual(count, 1);
    }));
});

describe("a defect in the layer the host supplied", () => {
  it.effect("is reported as a broken run rather than swallowed", () =>
    Effect.gen(function* () {
      const dying = portsLayer({
        AttributeResolver: Layer.effect(AttributeResolver, Effect.die(new Error("the layer exploded"))),
      });
      const session = yield* sessionWith(clearance);
      session.setPorts(dying);
      session.chooseSource("Live");
      yield* ran(session);

      const run = session.getSnapshot().run;
      assert.strictEqual(run._tag, "Broke");
      assert.include(run._tag === "Broke" ? run.message : "", "the layer exploded");
    }));
});

describe("what the session starts from, and what each command preserves", () => {
  it.effect("starts empty, on fixtures, with no capture", () =>
    Effect.gen(function* () {
      const snapshot = (yield* makeSimulationSession()).getSnapshot();
      assert.deepStrictEqual(snapshot.sightings, []);
      assert.deepStrictEqual(snapshot.resourceText, { text: "", error: undefined });
      assert.strictEqual(snapshot.sourceChoice, "Fixtures");
      assert.isUndefined(snapshot.capture);
      assert.isUndefined(snapshot.plan);
      assert.strictEqual(snapshot.run._tag, "Idle");
    }));

  it.effect("treats a rail that differs in one element as a change, and an equal one as none", () =>
    Effect.gen(function* () {
      const a = sighting(hasRole("a"));
      const b = sighting(hasRole("b"));
      const c = sighting(hasRole("c"));
      const session = yield* makeSimulationSession({ sightings: [a, b] });
      const seen = counted(session);
      session.setSightings([a, c]);
      assert.strictEqual(seen.notified, 1);
      session.setSightings([a, c]);
      session.setSightings([a, c, b]);
      assert.strictEqual(seen.notified, 2);
    }));

  it.effect("keeps the capture when a Fixtures run follows a Live one", () =>
    Effect.gen(function* () {
      const session = yield* sessionWith(clearance);
      session.setPorts(brokenPorts);
      session.chooseSource("Live");
      yield* ran(session);
      session.chooseSource("Fixtures");
      yield* ran(session);
      assert.isDefined(session.getSnapshot().capture);
    }));

  it.effect("keeps a result when the ports change after it ran, and clears it on a new choice", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({
        sightings: [sighting(hasRole("a")), sighting(hasRole("b"))],
      });
      yield* ran(session);
      session.setPorts(brokenPorts);
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
      session.choosePolicy(hasRole("a"));
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
    }));

  it.effect("leaving a seed with seed(undefined) clears the replayed policy", () =>
    Effect.gen(function* () {
      const seed = entryOf(decisionRecord({ evaluationId: "ev-6", policy: hasRole("x") }));
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))], seed });
      assert.strictEqual(session.getSnapshot().policy._tag, "Seeded");
      session.seed(undefined);
      assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
      const empty = yield* makeSimulationSession({ sightings: [], seed });
      empty.seed(undefined);
      assert.strictEqual(empty.getSnapshot().policy._tag, "None");
    }));

  it.effect("reports an accepted resource text as typed, with no error", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      session.editResourceText('{"id":"x"}');
      assert.deepStrictEqual(session.getSnapshot().resourceText, { text: '{"id":"x"}', error: undefined });
    }));
});
