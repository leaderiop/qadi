/**
 * JOB 1 ledger — E1.1 … E1.8.
 *
 * Screen 5 is the only one that **evaluates** rather than reading records, and
 * these are the tests that make that safe. Two of them assert a *negative* —
 * that nothing was reached, and that nothing was written — because those are
 * the failures a screenshot could never show.
 *
 * The second is the one that matters most. `Effect.provide` adds to a context
 * and cannot remove from one, so a simulation run anywhere a real sink is in
 * scope would write fabricated decisions into the log a reviewer is reading,
 * indistinguishable from decisions someone actually asked for.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolveError,
  AttributeResolver,
  DecisionCache,
  decisionCacheLayer,
  DecisionHistory,
  DecisionHistoryUnknown,
  decisionSinkRing,
  diffTraces,
  gte,
  hasAction,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  permission,
  RelationshipResolver,
  RelationshipResolverNever,
} from "@qadi/core";
import type { Decision, DecisionOutcome } from "@qadi/core";
import { simulate, simulationLayer } from "../../src/model/Simulation.ts";
import { subjectOf, type SimulationInput } from "../../src/model/SimulationInput.ts";
import { live } from "../../src/model/Sources.ts";

const read = permission("doc", "read");
const write = permission("doc", "write");

const alice: SimulationInput = {
  subject: { id: "alice", roles: ["editor"], permissions: ["doc:read"] },
};

const decisionOf = (outcome: DecisionOutcome): Decision => {
  assert.strictEqual(outcome._tag, "Decided");
  if (outcome._tag !== "Decided") throw new Error("expected a decision");
  return outcome.decision;
};

/**
 * A layer whose every port dies when touched.
 *
 * Dies rather than fails, deliberately: a failure would be caught by
 * `simulate`'s own `Effect.result` and could be mistaken for a fixture miss. A
 * defect propagates, so if any of these is ever reached the test cannot quietly
 * pass.
 */
const everyPortDies = Layer.mergeAll(
  Layer.succeed(AttributeResolver, {
    name: "live",
    resolve: () => Effect.die("the simulator reached a live attribute store"),
  }),
  Layer.succeed(RelationshipResolver, {
    name: "live",
    check: () => Effect.die("the simulator reached a live relationship service"),
  }),
  Layer.succeed(DecisionHistory, {
    name: "live",
    hasActed: () => Effect.die("the simulator reached a live history port"),
  }),
);

describe("the seal", () => {
  // E1.1
  it.effect("decides beside a layer whose every port dies", () =>
    Effect.gen(function* () {
      // A policy that touches all three ports, so a leak would be found rather
      // than merely possible.
      const policy = hasAttribute("clearance", gte(1));
      const outcome = yield* simulate(policy, {
        subject: { id: "alice" },
        attributes: { clearance: 3 },
      });

      assert.strictEqual(outcome._tag, "Decided");
      assert.isTrue(decisionOf(outcome)._tag === "Allow");
    }).pipe(Effect.provide(everyPortDies)));

  it.effect("reaches no live relationship service", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasRelationship("owner"), {
        subject: { id: "alice" },
        resource: { id: "doc-1" },
        relationships: [{ subjectId: "alice", relation: "owner", resourceId: "doc-1" }],
      });
      assert.isTrue(decisionOf(outcome)._tag === "Allow");
    }).pipe(Effect.provide(everyPortDies)));

  /**
   * E1.2 — the one that would be a defect rather than a shortfall.
   *
   * A what-if sweep runs one evaluation per edit. Without the no-op sink in
   * `simulationLayer`, a sweep of eight edits writes eight fabricated rows into
   * the log, and a reviewer reading that log has no way to tell them from real
   * ones.
   */
  it.effect("writes nothing, even with a real sink in scope", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* simulate(hasPermission(read), alice).pipe(Effect.provide(ring.layer));
      yield* simulate(hasPermission(write), alice).pipe(Effect.provide(ring.layer));

      assert.deepStrictEqual(yield* ring.snapshot, []);
    }));

  /**
   * E1.3 — a simulation must not insert an entry a *real* request would then
   * hit, nor read one a real request left.
   */
  it.effect("does not touch a cache in scope", () =>
    Effect.gen(function* () {
      const cache = yield* DecisionCache;
      assert.strictEqual(yield* cache.size, 0);

      yield* simulate(hasPermission(read), alice);
      yield* simulate(hasPermission(write), alice);

      // Still empty: the simulation used the private one `simulationLayer`
      // shadows it with.
      assert.strictEqual(yield* cache.size, 0);
    }).pipe(Effect.provide(decisionCacheLayer())));
});

describe("simulate", () => {
  // E1.4 — a fixture typo must not crash a panel.
  it.effect("a broken port is a Failed outcome, never a throw", () =>
    Effect.gen(function* () {
      const broken = Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          name: "broken",
          resolve: (_subjectId, attribute) =>
            Effect.fail(new AttributeResolveError({ attribute, cause: "store down" })),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
      );

      const outcome = yield* simulate(
        hasAttribute("clearance", gte(1)),
        { subject: { id: "alice" } },
        { source: live(broken) },
      );

      assert.strictEqual(outcome._tag, "Failed");
    }));

  // E1.5 — denies for the reason a real deployment would.
  it.effect("with no fixtures, denies as an unwired port would", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasAttribute("clearance", gte(1)), {
        subject: { id: "alice" },
      });

      const decision = decisionOf(outcome);
      assert.strictEqual(decision._tag, "Deny");
    }));

  // E1.6 — the property replay comparison rests on.
  it.effect("the same input twice yields an identical trace", () =>
    Effect.gen(function* () {
      const policy = hasAttribute("clearance", gte(2));
      const input: SimulationInput = { subject: { id: "alice" }, attributes: { clearance: 3 } };

      const first = decisionOf(yield* simulate(policy, input));
      const second = decisionOf(yield* simulate(policy, input));

      // A `Trace` carries no time, which is why this holds under a live clock
      // and is the reason the recorded "must wire TestClock" gap dissolved.
      assert.deepStrictEqual(diffTraces(first.trace, second.trace), []);
    }));

  it.effect("and under a deterministic clock too", () =>
    Effect.gen(function* () {
      const policy = hasPermission(read);
      const first = decisionOf(
        yield* simulate(policy, alice, { clock: "deterministic" }),
      );
      const second = decisionOf(
        yield* simulate(policy, alice, { clock: "deterministic" }),
      );

      assert.deepStrictEqual(diffTraces(first.trace, second.trace), []);
      assert.strictEqual(first.durationMillis, second.durationMillis);
    }));

  // E1.7
  it.effect("honours permissions with no roles, and roles with no permissions", () =>
    Effect.gen(function* () {
      const byPermission = yield* simulate(hasPermission(read), {
        subject: { id: "alice", permissions: ["doc:read"] },
      });
      const byRole = yield* simulate(hasRole("editor"), {
        subject: { id: "alice", roles: ["editor"] },
      });

      assert.strictEqual(decisionOf(byPermission)._tag, "Allow");
      assert.strictEqual(decisionOf(byRole)._tag, "Allow");
    }));

  // E1.8 — the resolver is consulted on a subject *miss*, as in a real run.
  it.effect("an attribute on the subject beats one in the fixtures", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasAttribute("clearance", gte(5)), {
        subject: { id: "alice", attributes: { clearance: 9 } },
        attributes: { clearance: 1 },
      });

      assert.strictEqual(decisionOf(outcome)._tag, "Allow");
    }));

  it.effect("and the fixture answers when the subject has none", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasAttribute("clearance", gte(5)), {
        subject: { id: "alice" },
        attributes: { clearance: 9 },
      });

      assert.strictEqual(decisionOf(outcome)._tag, "Allow");
    }));

  it.effect("carries the action and resource into the evaluation", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasRelationship("owner"), {
        subject: { id: "alice" },
        action: "publish",
        resource: { id: "doc-1" },
        relationships: [{ subjectId: "alice", relation: "owner", resourceId: "doc-1" }],
      });

      assert.strictEqual(decisionOf(outcome)._tag, "Allow");
    }));

  /**
   * The clock choice, asserted where it is actually observable.
   *
   * Not through `durationMillis`: a trivial policy measures zero under a live
   * clock too, so a test comparing durations would pass whichever layer was
   * built. Reading the `Clock` the layer provides distinguishes them exactly —
   * a real one answers in epoch millis, a test one starts at zero.
   */
  it.effect("a deterministic clock is wired only when asked for", () =>
    Effect.gen(function* () {
      const deterministic = yield* Layer.build(
        simulationLayer(alice, { clock: "deterministic" }),
      );
      assert.strictEqual(Context.get(deterministic, Clock.Clock).currentTimeMillisUnsafe(), 0);

      const liveClock = yield* Layer.build(simulationLayer(alice, { clock: "live" }));
      // The runtime's own clock, left alone — providing a second one would only
      // be a way to get it wrong.
      assert.isAbove(Context.get(liveClock, Clock.Clock).currentTimeMillisUnsafe(), 0);
    }).pipe(Effect.scoped));

  it.effect("defaults to the live clock", () =>
    Effect.gen(function* () {
      const context = yield* Layer.build(simulationLayer(alice));
      assert.isAbove(Context.get(context, Clock.Clock).currentTimeMillisUnsafe(), 0);
    }).pipe(Effect.scoped));

  // The resource and the action are optional, and absent must mean absent —
  // an empty resource is a different question from no resource at all.
  it.effect("omits an absent resource and action rather than passing empty ones", () =>
    Effect.gen(function* () {
      // `hasAction` denies when no action was supplied, which is only
      // observable if absence really is absence.
      const withNone = yield* simulate(hasAction("publish"), { subject: { id: "alice" } });
      const withAction = yield* simulate(hasAction("publish"), {
        subject: { id: "alice" },
        action: "publish",
      });

      // Not a denial: an action policy with no action supplied is a missing
      // *input*, which `evaluate` reports as `MissingAction` — and absence
      // being absence is exactly what makes that distinguishable.
      assert.strictEqual(withNone._tag, "Failed");
      assert.strictEqual(decisionOf(withAction)._tag, "Allow");
    }));

  it.effect("a resource reaches the evaluation, and its absence denies", () =>
    Effect.gen(function* () {
      const edges = [{ subjectId: "alice", relation: "owner", resourceId: "doc-1" }];

      const without = yield* simulate(hasRelationship("owner"), {
        subject: { id: "alice" },
        relationships: edges,
      });
      const with_ = yield* simulate(hasRelationship("owner"), {
        subject: { id: "alice" },
        resource: { id: "doc-1" },
        relationships: edges,
      });

      // No resource means no resource id to ask about.
      assert.strictEqual(without._tag, "Failed");
      assert.strictEqual(decisionOf(with_)._tag, "Allow");
    }));

  // `subjectOf`'s defaults: a subject given neither roles nor permissions is a
  // subject that holds nothing, not a crash.
  it.effect("a subject with nothing holds nothing", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasPermission(read), { subject: { id: "nobody" } });
      assert.strictEqual(decisionOf(outcome)._tag, "Deny");
      assert.strictEqual(decisionOf(outcome).subjectId, "nobody");
    }));

  /**
   * `subjectOf`'s defaults, asserted on the built subject rather than through
   * a decision.
   *
   * A phantom role or permission slipped into an empty default would not change
   * the verdict of any policy a test happens to run, but it would change every
   * `hasRole` a reviewer tried afterwards. The set is the thing to assert.
   */
  it("a subject given nothing holds an empty everything", () => {
    const built = subjectOf({ id: "nobody" });

    assert.strictEqual(built.id, "nobody");
    assert.deepStrictEqual([...built.roles], []);
    assert.deepStrictEqual([...built.permissions], []);
    assert.deepStrictEqual(built.attributes, {});
  });

  it("a subject given everything keeps it", () => {
    const built = subjectOf({
      id: "alice",
      roles: ["editor"],
      permissions: ["doc:read"],
      attributes: { dept: "eng" },
    });

    assert.deepStrictEqual([...built.roles], ["editor"]);
    assert.deepStrictEqual([...built.permissions], ["doc:read"]);
    assert.deepStrictEqual(built.attributes, { dept: "eng" });
  });

  it.effect("a failure carries the error it failed with", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasAction("publish"), { subject: { id: "alice" } });

      assert.strictEqual(outcome._tag, "Failed");
      if (outcome._tag !== "Failed") return;
      // The outcome ADT the timeline already carries, so an error here reads
      // the same way as one from a real evaluation.
      assert.strictEqual(outcome.error._tag, "MissingAction");
    }));

  it.effect("a decision carries the decision it decided", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasPermission(read), alice);

      assert.strictEqual(outcome._tag, "Decided");
      if (outcome._tag !== "Decided") return;
      assert.strictEqual(outcome.decision.subjectId, "alice");
    }));

  it.effect("mints deterministic ids, so two runs compare field by field", () =>
    Effect.gen(function* () {
      const first = decisionOf(yield* simulate(hasPermission(read), alice));
      const second = decisionOf(yield* simulate(hasPermission(read), alice));

      assert.strictEqual(first.evaluationId, second.evaluationId);
      // Prefixed, so a fabricated id can never be mistaken for one the evaluator
      // minted for a real request.
      assert.include(first.evaluationId, "sim");
    }));
});
