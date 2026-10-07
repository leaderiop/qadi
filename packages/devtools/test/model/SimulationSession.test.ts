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
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Tracer from "effect/Tracer";
import * as TestClock from "effect/testing/TestClock";
import {
  allOf,
  AttributeResolver,
  attributeResolverPort,
  gte,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  PortReply,
  portsLayer,
  scriptedPort,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { collectingTracer } from "@qadi/testing";
import { emptyAnswers } from "../../src/model/Capture.ts";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import {
  makeSimulationSession,
  resolveSource,
  sourceOptions,
} from "../../src/model/SimulationSession.ts";
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

describe("resolveSource and sourceOptions", () => {
  it("resolves each choice, or says why not", () => {
    assert.strictEqual(resolveSource("Fixtures", undefined, undefined)._tag, "Available");
    assert.strictEqual(resolveSource("Live", brokenPorts, undefined)._tag, "Available");
    assert.strictEqual(resolveSource("Live", undefined, undefined)._tag, "Unavailable");
    assert.strictEqual(resolveSource("Snapshot", undefined, undefined)._tag, "Unavailable");
  });

  it("offers all three, enabled only when usable, each with a reason", () => {
    const none = sourceOptions(undefined, undefined);
    assert.deepStrictEqual(
      none.map((option) => [option.id, option.enabled]),
      [
        ["Fixtures", true],
        ["Snapshot", false],
        ["Live", false],
      ],
    );
    assert.include(none[2]?.why ?? "", "did not pass a `ports` layer");
    assert.include(none[1]?.why ?? "", "run once against Live first");
    const all = sourceOptions(brokenPorts, emptyAnswers);
    assert.isTrue(all[1]?.enabled);
    assert.isTrue(all[2]?.enabled);
    assert.include(all[2]?.why ?? "", "every row is real I/O");
    assert.include(all[1]?.why ?? "", "one round of I/O");
  });
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

  supersededBy("choosing another policy", (session) => session.choosePolicy(1));
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

      session.choosePolicy(1);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      assert.isFalse(session.getSnapshot().stale);
    }));

  it.effect("is not stale when the host passes an equal policy as a new object", () =>
    Effect.gen(function* () {
      const session = makeSimulationSession({ sightings: [sighting(hasRole("a"))] });
      yield* session.run("Run");
      session.setSightings([sighting(hasRole("a"))]);
      assert.isFalse(session.getSnapshot().stale);
      session.setSightings([sighting(hasRole("b"))]);
      assert.isTrue(session.getSnapshot().stale);
      session.setSightings([]);
      assert.isTrue(session.getSnapshot().stale);
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
      session.choosePolicy(0);
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
    session.choosePolicy(0);
    assert.strictEqual(session.getSnapshot().policy._tag, "Chosen");
  });

  it("clamps a selection that outlives the rail shrinking", () => {
    const session = makeSimulationSession({
      sightings: [sighting(hasRole("a")), sighting(hasRole("b"))],
    });
    session.choosePolicy(1);
    session.setSightings([sighting(hasRole("a"))]);
    const policy = session.getSnapshot().policy;
    assert.strictEqual(policy._tag === "Chosen" && policy.index, 0);
    session.setSightings([]);
    assert.strictEqual(session.getSnapshot().policy._tag, "None");
  });

  it.effect("runs nothing when there is no policy", () =>
    Effect.gen(function* () {
      const session = makeSimulationSession();
      yield* session.run("Run");
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
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
    session.choosePolicy(0);
    session.seed(undefined);
    session.setPorts(undefined);
    session.chooseSource("Fixtures");
    session.setClock("live");
    session.setPairs(false);
    session.edit(before.draft);
    session.renameSubject(before.draft.subject.id);

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

  it("says what each option offers", () => {
    const options = makeSimulationSession({ ports: brokenPorts }).getSnapshot().options;
    assert.strictEqual(options[0]?.why, "answers you typed below");
    assert.strictEqual(options[1]?.why, "run once against Live first; this replays what that run learned");
    assert.strictEqual(
      options[2]?.why,
      "the application's own resolvers — every row is real I/O",
    );
    assert.strictEqual(
      sourceOptions(undefined, emptyAnswers)[1]?.why,
      "real answers, captured once and replayed — one round of I/O for a whole sweep",
    );
    const snapshot = resolveSource("Snapshot", undefined, emptyAnswers);
    assert.strictEqual(snapshot._tag === "Available" && snapshot.source._tag, "Snapshot");
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
      session.choosePolicy(0);
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
