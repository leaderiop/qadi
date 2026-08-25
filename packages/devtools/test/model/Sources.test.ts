/**
 * JOB 3 ledger — E3.1 … E3.5.
 *
 * Three ways to answer a simulated evaluation, and one property that must hold
 * across all of them: none can reach `CurrentSubject`, `DecisionSink` or
 * `DecisionCache`, because the seal lives in `simulationLayer` rather than in
 * any one source. `Live` is the interesting case — it is the only mode where a
 * panel can cause I/O — and it is still sealed against the three that matter.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  attributeResolverFromRecord,
  CustomPredicateNone,
  decisionSinkRing,
  DecisionHistoryUnknown,
  gte,
  hasActed,
  hasAttribute,
  hasRelationship,
  hasPermission,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import type { Decision, DecisionOutcome } from "@qadi/core";
import { emptyAnswers } from "../../src/model/Capture.ts";
import { simulate } from "../../src/model/Simulation.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { causesIO, fixtures, live, portsOf, snapshot } from "../../src/model/Sources.ts";

const read = permission("doc", "read");

const decisionOf = (outcome: DecisionOutcome): Decision => {
  if (outcome._tag !== "Decided") throw new Error("expected a decision");
  return outcome.decision;
};

const realPorts = Layer.mergeAll(
  attributeResolverFromRecord({ clearance: 7 }),
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  CustomPredicateNone,
);

const alice: SimulationInput = { subject: { id: "alice", permissions: ["doc:read"] } };

describe("causesIO", () => {
  /**
   * The panel warns before a sweep that performs I/O and counts the
   * evaluations it is about to run. A reviewer clicking "what if" should not
   * discover afterwards that they issued forty lookups against production.
   */
  it("is true only for Live", () => {
    assert.isFalse(causesIO(fixtures));
    // Captured once, replayed from memory — which is the whole reason to
    // prefer it for a sweep.
    assert.isFalse(causesIO(snapshot(emptyAnswers)));
    assert.isTrue(causesIO(live(realPorts)));
  });
});

describe("portsOf", () => {
  it.effect("defaults to fixtures when no source is given", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasAttribute("clearance", gte(5)), {
        subject: { id: "alice" },
        attributes: { clearance: 9 },
      });

      assert.strictEqual(decisionOf(outcome)._tag, "Allow");
    }));

  it.effect("an explicit Fixtures source is the same thing", () =>
    Effect.gen(function* () {
      const input: SimulationInput = {
        subject: { id: "alice" },
        attributes: { clearance: 9 },
      };
      const policy = hasAttribute("clearance", gte(5));

      const implicit = decisionOf(yield* simulate(policy, input));
      const explicit = decisionOf(yield* simulate(policy, input, { source: fixtures }));

      assert.strictEqual(implicit._tag, explicit._tag);
    }));

  it.effect("a Live source answers from the layer it was given", () =>
    Effect.gen(function* () {
      // The fixture says 1; the live layer says 7. Whichever answers decides.
      const outcome = yield* simulate(
        hasAttribute("clearance", gte(5)),
        { subject: { id: "alice" }, attributes: { clearance: 1 } },
        { source: live(realPorts) },
      );

      assert.strictEqual(decisionOf(outcome)._tag, "Allow");
    }));

  it.effect("a Snapshot source answers from its capture, not from the fixtures", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(
        hasAttribute("clearance", gte(5)),
        { subject: { id: "alice" }, attributes: { clearance: 9 } },
        { source: snapshot(emptyAnswers) },
      );

      // The fixture would have allowed; an empty capture answers as an unwired
      // port does, and denies.
      assert.strictEqual(decisionOf(outcome)._tag, "Deny");
    }));

  // Each fixture kind has to actually answer — an untested one silently falls
  // back to its fail-closed default and every policy of that kind denies.
  it.effect("fixture history answers a history policy", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasActed("raised"), {
        subject: { id: "alice" },
        resource: { id: "doc-1" },
        history: [{ subjectId: "alice", event: "raised", resourceId: "doc-1" }],
      });

      assert.strictEqual(decisionOf(outcome)._tag, "Allow");
    }));

  it.effect("fixture relationships answer a relationship policy", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasRelationship("owner"), {
        subject: { id: "alice" },
        resource: { id: "doc-1" },
        relationships: [{ subjectId: "alice", relation: "owner", resourceId: "doc-1" }],
      });

      assert.strictEqual(decisionOf(outcome)._tag, "Allow");
    }));

  it.effect("each fixture kind falls back to its fail-closed default when absent", () =>
    Effect.gen(function* () {
      const bare: SimulationInput = { subject: { id: "alice" }, resource: { id: "doc-1" } };

      assert.strictEqual(decisionOf(yield* simulate(hasActed("raised"), bare))._tag, "Deny");
      assert.strictEqual(decisionOf(yield* simulate(hasRelationship("owner"), bare))._tag, "Deny");
      assert.strictEqual(
        decisionOf(yield* simulate(hasAttribute("clearance", gte(1)), bare))._tag,
        "Deny",
      );
    }));

  it("builds a layer for every source without running one", () => {
    const input: SimulationInput = { subject: { id: "alice" } };
    for (const source of [undefined, fixtures, snapshot(emptyAnswers), live(realPorts)]) {
      assert.isDefined(portsOf(source, input));
    }
  });
});

describe("the seal holds in every mode — E3.3", () => {
  /**
   * `Live` is the only mode where a panel can cause I/O, so it is the one worth
   * checking against the three ports it must still never reach. A live layer
   * cannot supply `CurrentSubject` — the type excludes it, because the subject
   * is the thing being simulated — and the sink and cache are shadowed for
   * every source alike.
   */
  it.effect("a Live simulation still writes no record", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* simulate(hasPermission(read), alice, { source: live(realPorts) }).pipe(
        Effect.provide(ring.layer),
      );

      assert.deepStrictEqual(yield* ring.snapshot, []);
    }));

  it.effect("a Snapshot simulation still writes no record", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* simulate(hasPermission(read), alice, { source: snapshot(emptyAnswers) }).pipe(
        Effect.provide(ring.layer),
      );

      assert.deepStrictEqual(yield* ring.snapshot, []);
    }));

  it.effect("the subject is the panel's in every mode", () =>
    Effect.gen(function* () {
      for (const source of [fixtures, snapshot(emptyAnswers), live(realPorts)]) {
        const outcome = yield* simulate(hasPermission(read), alice, { source });
        assert.strictEqual(decisionOf(outcome).subjectId, "alice", source._tag);
      }
    }));

  // E3.4
  it.effect("switching source leaves the input alone", () =>
    Effect.gen(function* () {
      const policy = hasPermission(read);

      const onFixtures = decisionOf(yield* simulate(policy, alice, { source: fixtures }));
      const onLive = decisionOf(yield* simulate(policy, alice, { source: live(realPorts) }));

      // A permission check reads the subject the panel supplied, so the answer
      // is the same whoever holds the resolvers — only the *answers* change,
      // never the question.
      assert.strictEqual(onFixtures._tag, "Allow");
      assert.strictEqual(onLive._tag, "Allow");
    }));
});

describe("the constructors", () => {
  it("tag each source, so a fourth is a compile error rather than a default", () => {
    assert.strictEqual(fixtures._tag, "Fixtures");
    assert.strictEqual(snapshot(emptyAnswers)._tag, "Snapshot");
    assert.strictEqual(live(realPorts)._tag, "Live");
  });

  it("carry what they were given", () => {
    const answers = emptyAnswers;
    assert.strictEqual(snapshot(answers).answers, answers);
    assert.strictEqual(live(realPorts).ports, realPorts);
  });
});
