/**
 * The review layer and a simulation agree on ids, fail-closed ports and clocks.
 *
 * Both are the same evaluation environment, one with a subject supplied per
 * call and a prefix of its own. A disagreement here would mean one of them
 * decides something the other does not, and a reviewer comparing a simulated
 * decision with a test's would be misled. Written before both layers were rebuilt
 * on one builder and kept through it. Devtools reaches `@qadi/testing` only from
 * its tests, where it is a devDependency.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  currentSubjectLayer,
  evaluate,
  gte,
  hasActed,
  hasAttribute,
  hasCustom,
  hasRelationship,
  hasSignature,
} from "@qadi/core";
import type { Decision, DecisionOutcome, Policy } from "@qadi/core";
import { qadiReviewLayer } from "@qadi/testing";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { simulate, simulationLayer } from "../../src/model/Simulation.ts";
import {
  evaluationOptionsOf,
  subjectOf,
  type SimulationInput,
} from "../../src/model/SimulationInput.ts";

const decisionOf = (outcome: DecisionOutcome): Decision => {
  assert.strictEqual(outcome._tag, "Decided");
  if (outcome._tag !== "Decided") throw new Error("expected a decision");
  return outcome.decision;
};

const alice: SimulationInput = {
  subject: { id: "alice" },
  attributes: { clearance: 3 },
};

const withResource: SimulationInput = { subject: { id: "alice" }, resource: { id: "doc-1" } };

/** The environment a review of `input`'s subject runs in, asked the way a simulation asks. */
const reviewEnvironment = (input: SimulationInput, review: ReturnType<typeof qadiReviewLayer>) =>
  Layer.mergeAll(currentSubjectLayer(subjectOf(input.subject)), review);

describe("the review layer and a simulation agree", () => {
  it.effect("both mint sequential ids, each with its own prefix", () =>
    Effect.gen(function* () {
      const policy = hasAttribute("clearance", gte(1));
      const evaluateTwice = Effect.gen(function* () {
        const first = yield* evaluate(policy);
        const second = yield* evaluate(policy);
        return [first, second];
      });

      const review = yield* evaluateTwice.pipe(
        Effect.provide(
          Layer.mergeAll(
            currentSubjectLayer(subjectOf(alice.subject)),
            qadiReviewLayer({ ports: { AttributeResolver: { answers: { clearance: 3 } } } }),
          ),
        ),
      );
      const simulated = yield* evaluateTwice.pipe(Effect.provide(simulationLayer(alice)));

      assert.deepStrictEqual(
        review.map((d) => [d._tag, d.evaluationId]),
        [
          ["Allow", "eval-1"],
          ["Allow", "eval-2"],
        ],
      );
      assert.deepStrictEqual(
        simulated.map((d) => [d._tag, d.evaluationId]),
        [
          ["Allow", "sim-1"],
          ["Allow", "sim-2"],
        ],
      );
    }));

  it.effect("an unfed port fails closed with the same denial in both, for every port", () =>
    Effect.gen(function* () {
      const policies: ReadonlyArray<Policy> = [
        hasAttribute("clearance", gte(1)),
        hasRelationship("owner"),
        hasActed("raised"),
        hasSignature("approved"),
        hasCustom("isOwner"),
      ];

      for (const policy of policies) {
        const reviewed = yield* evaluate(policy, evaluationOptionsOf(withResource)).pipe(
          Effect.provide(reviewEnvironment(withResource, qadiReviewLayer())),
        );
        const simulated = decisionOf(yield* simulate(policy, withResource));

        if (reviewed._tag !== "Deny" || simulated._tag !== "Deny") {
          assert.fail(`${policy._tag}: ${reviewed._tag} in review, ${simulated._tag} in simulation`);
        }
        assert.strictEqual(reviewed.reason, simulated.reason, `${policy._tag}: same reason`);
      }
    }));

  // `it.live`: `it.effect`'s ambient `TestClock` would make a live clock read zero too.
  it.live("both leave the runtime's own clock alone under a live clock", () =>
    Effect.gen(function* () {
      const review = yield* Layer.build(qadiReviewLayer({ clock: "live" }));
      const simulation = yield* Layer.build(simulationLayer(alice, { clock: "live" }));

      assert.isAbove(Context.get(review, Clock.Clock).currentTimeMillisUnsafe(), 0);
      assert.isAbove(Context.get(simulation, Clock.Clock).currentTimeMillisUnsafe(), 0);
    }).pipe(Effect.scoped));

  it.live("both make durations reproducibly zero under a deterministic clock", () =>
    Effect.gen(function* () {
      const policy = hasAttribute("clearance", gte(1));
      const review = qadiReviewLayer({
        clock: "test",
        ports: { AttributeResolver: { answers: { clearance: 3 } } },
      });
      const simulation = simulationLayer(alice, { clock: "deterministic" });

      const reviewContext = yield* Layer.build(review);
      const simulationContext = yield* Layer.build(simulation);
      assert.strictEqual(Context.get(reviewContext, Clock.Clock).currentTimeMillisUnsafe(), 0);
      assert.strictEqual(Context.get(simulationContext, Clock.Clock).currentTimeMillisUnsafe(), 0);

      const reviewed = yield* evaluate(policy).pipe(
        Effect.provide(reviewEnvironment(alice, review)),
      );
      const simulated = yield* evaluate(policy).pipe(Effect.provide(simulation));

      assert.strictEqual(reviewed.durationMillis, 0);
      assert.strictEqual(simulated.durationMillis, 0);
    }).pipe(Effect.scoped));
});
