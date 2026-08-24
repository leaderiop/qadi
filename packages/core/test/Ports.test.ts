import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Schedule from "effect/Schedule";
import {
  AttributeResolver,
  AttributeResolverNone,
  attributeResolverBounded,
  attributeResolverFromRecord,
  attributeResolverRetrying,
} from "../src/AttributeResolver.ts";
import {
  DecisionHistory,
  DecisionHistoryUnknown,
  decisionHistoryFromEvents,
} from "../src/DecisionHistory.ts";
import { AttributeResolveError, RelationshipResolveError } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import { makeResourceId } from "../src/Identity.ts";
import {
  EvaluationId,
  EvaluationIdLive,
  evaluationIdSequential,
} from "../src/EvaluationId.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import {
  RelationshipResolver,
  RelationshipResolverNever,
  relationshipResolverBounded,
  relationshipResolverFromEdges,
  relationshipResolverRetrying,
} from "../src/RelationshipResolver.ts";
import { isolatedMetrics, subjectWith, testLayer } from "./helpers.ts";

describe("a port says which implementation it is", () => {
  // Before this, a service value was an anonymous object literal, so the only
  // way to distinguish a fail-closed default from a real store was to call it
  // and infer from the answer. An operator seeing "everything denies" could not
  // see that `AttributeResolverNone` was wired.

  it.effect("the fail-closed defaults name themselves", () =>
    Effect.gen(function* () {
      const attribute = yield* AttributeResolver;
      const relationship = yield* RelationshipResolver;
      const history = yield* DecisionHistory;

      assert.strictEqual(attribute.name, "AttributeResolverNone");
      assert.strictEqual(relationship.name, "RelationshipResolverNever");
      assert.strictEqual(history.name, "DecisionHistoryUnknown");
    }).pipe(
      Effect.provide(
        Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever, DecisionHistoryUnknown),
      ),
    ));

  it.effect("EvaluationId names both of its implementations", () =>
    Effect.gen(function* () {
      const live = yield* EvaluationId;
      assert.strictEqual(live.name, "EvaluationIdLive");
    }).pipe(Effect.provide(EvaluationIdLive)));

  it.effect("a wrapper names itself around what it wrapped", () =>
    Effect.gen(function* () {
      // The whole stack, not just the outermost layer — otherwise wrapping a
      // real store in a retry would lose the identity a panel most needs.
      const resolver = yield* AttributeResolver;
      assert.strictEqual(resolver.name, "attributeResolverFromRecord (retrying)");
    }).pipe(
      Effect.provide(
        attributeResolverRetrying(Schedule.recurs(1))(attributeResolverFromRecord({})),
      ),
    ));

  it.effect("a bounded wrapper names its permit count", () =>
    Effect.gen(function* () {
      const resolver = yield* AttributeResolver;
      assert.strictEqual(resolver.name, "AttributeResolverNone (bounded 2)");
    }).pipe(Effect.provide(attributeResolverBounded(2)(AttributeResolverNone))));

  it.effect("the other implementations name themselves too", () =>
    Effect.gen(function* () {
      const relationship = yield* RelationshipResolver;
      assert.strictEqual(relationship.name, "relationshipResolverFromEdges");
    }).pipe(Effect.provide(relationshipResolverFromEdges([]))));

  it.effect("decisionHistoryFromEvents names itself", () =>
    Effect.gen(function* () {
      const history = yield* DecisionHistory;
      assert.strictEqual(history.name, "decisionHistoryFromEvents");
    }).pipe(Effect.provide(decisionHistoryFromEvents([]))));

  it.effect("evaluationIdSequential names itself, with its prefix", () =>
    Effect.gen(function* () {
      const ids = yield* EvaluationId;
      assert.strictEqual(ids.name, "evaluationIdSequential(req)");
    }).pipe(Effect.provide(evaluationIdSequential("req"))));

  it.effect("the relationship wrappers compose their names too", () =>
    Effect.gen(function* () {
      const resolver = yield* RelationshipResolver;
      assert.strictEqual(resolver.name, "RelationshipResolverNever (retrying)");
    }).pipe(
      Effect.provide(relationshipResolverRetrying(Schedule.recurs(1))(RelationshipResolverNever)),
    ));

  it.effect("a bounded relationship wrapper names its permit count", () =>
    Effect.gen(function* () {
      const resolver = yield* RelationshipResolver;
      assert.strictEqual(resolver.name, "RelationshipResolverNever (bounded 3)");
    }).pipe(Effect.provide(relationshipResolverBounded(3)(RelationshipResolverNever))));

  it.effect("wrapping an UNNAMED resolver falls back rather than reading undefined", () =>
    Effect.gen(function* () {
      // The `?? "?"` branch, which every other wrapper test skips by wrapping
      // something already named. Without it the composed name would read
      // "undefined (retrying)".
      const resolver = yield* AttributeResolver;
      assert.strictEqual(resolver.name, "? (retrying)");
    }).pipe(
      Effect.provide(
        attributeResolverRetrying(Schedule.recurs(1))(
          Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(undefined) }),
        ),
      ),
    ));

  it.effect("an unnamed BOUNDED attribute resolver falls back too", () =>
    Effect.gen(function* () {
      const resolver = yield* AttributeResolver;
      assert.strictEqual(resolver.name, "? (bounded 4)");
    }).pipe(
      Effect.provide(
        attributeResolverBounded(4)(
          Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(undefined) }),
        ),
      ),
    ));

  it.effect("an unnamed RETRYING relationship resolver falls back too", () =>
    Effect.gen(function* () {
      const resolver = yield* RelationshipResolver;
      assert.strictEqual(resolver.name, "? (retrying)");
    }).pipe(
      Effect.provide(
        relationshipResolverRetrying(Schedule.recurs(1))(
          Layer.succeed(RelationshipResolver, { check: () => Effect.succeed("Unknown") }),
        ),
      ),
    ));

  it.effect("wrapping an UNNAMED relationship resolver falls back too", () =>
    Effect.gen(function* () {
      const resolver = yield* RelationshipResolver;
      assert.strictEqual(resolver.name, "? (bounded 1)");
    }).pipe(
      Effect.provide(
        relationshipResolverBounded(1)(
          Layer.succeed(RelationshipResolver, { check: () => Effect.succeed("Unknown") }),
        ),
      ),
    ));

  it.effect("a caller's own resolver may say nothing", () =>
    Effect.gen(function* () {
      // `name` is optional, so no existing implementation breaks.
      const resolver = yield* AttributeResolver;
      assert.isUndefined(resolver.name);
    }).pipe(
      Effect.provide(
        Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(undefined) }),
      ),
    ));
});

describe("port activity is counted", () => {
  const frequencyOf = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>, id: string) =>
    snapshots.find(
      (s): s is Extract<Metric.Metric.Snapshot, { type: "Frequency" }> =>
        s.type === "Frequency" && s.id === id,
    );

  it.effect("an attribute lookup counts against AttributeResolver", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasAttribute("clearance", M.gte(1)))
          .pipe(
            Effect.provide(
              testLayer(subjectWith({}), {
                attributes: attributeResolverFromRecord({ clearance: 5 }),
              }),
            ),
          )
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      const calls = frequencyOf(snapshots, "qadi_port_calls_total");
      assert.strictEqual(calls?.state.occurrences.get("AttributeResolver"), 1);
    }));

  it.effect("an attribute already on the subject counts nothing", () =>
    Effect.gen(function* () {
      // The short-circuit property, visible as an absence: the evaluator
      // consults the subject first and only calls the port on a miss
      // (INV-QD-005). A counter that fired regardless would make a resolver look
      // busy when it was never reached.
      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasAttribute("clearance", M.gte(1)))
          .pipe(Effect.provide(testLayer(subjectWith({ attributes: { clearance: 5 } }))))
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      assert.isUndefined(frequencyOf(snapshots, "qadi_port_calls_total"));
    }));

  it.effect("a relationship check counts against RelationshipResolver", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasRelationship("owner"), { resource: { id: "doc-1" } })
          .pipe(Effect.provide(testLayer(subjectWith({}))))
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      const calls = frequencyOf(snapshots, "qadi_port_calls_total");
      assert.strictEqual(calls?.state.occurrences.get("RelationshipResolver"), 1);
    }));

  it.effect("a history query counts against DecisionHistory", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasActed("approved", { scope: "Resource" }), {
          resource: { id: "doc-1" },
        })
          .pipe(Effect.provide(testLayer(subjectWith({}))))
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      const calls = frequencyOf(snapshots, "qadi_port_calls_total");
      assert.strictEqual(calls?.state.occurrences.get("DecisionHistory"), 1);
    }));

  it.effect("a retried relationship check counts under its own port key", () =>
    Effect.gen(function* () {
      // Keyed per port, so a degrading relationship store is not read as a
      // degrading attribute store.
      let attempts = 0;
      const flaky = Layer.succeed(RelationshipResolver, {
        name: "flaky",
        check: () =>
          Effect.suspend(() => {
            attempts += 1;
            return attempts < 2
              ? Effect.fail(
                  new RelationshipResolveError({
                    relation: "owner",
                    resourceId: makeResourceId("doc-1"),
                    cause: "flaky",
                  }),
                )
              : Effect.succeed("Related" as const);
          }),
      });

      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasRelationship("owner"), { resource: { id: "doc-1" } })
          .pipe(
            Effect.provide(
              testLayer(subjectWith({}), {
                relationships: relationshipResolverRetrying(Schedule.recurs(3))(flaky),
              }),
            ),
          )
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      const retries = frequencyOf(snapshots, "qadi_port_retries_total");
      assert.strictEqual(retries?.state.occurrences.get("RelationshipResolver"), 1);
      assert.isUndefined(retries?.state.occurrences.get("AttributeResolver"));
    }));

  it.effect("a retried attempt counts against the retry frequency", () =>
    Effect.gen(function* () {
      let attempts = 0;
      const flaky = Layer.succeed(AttributeResolver, {
        name: "flaky",
        // `Effect.suspend`, so each retry re-evaluates the body. Returning an
        // already-constructed `Effect.fail` would have `retry` re-run the same
        // failed value forever, and the fixture — not the code — would be what
        // the test proved.
        resolve: (_subjectId, attribute) =>
          Effect.suspend(() => {
            attempts += 1;
            return attempts < 3
              ? Effect.fail(new AttributeResolveError({ attribute, cause: "flaky" }))
              : Effect.succeed(5);
          }),
      });

      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasAttribute("clearance", M.gte(1)))
          .pipe(
            Effect.provide(
              testLayer(subjectWith({}), {
                attributes: attributeResolverRetrying(Schedule.recurs(3))(flaky),
              }),
            ),
          )
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      // Two attempts failed before the third succeeded. Paired with one entry in
      // `qadi_port_calls_total`, that is a store degrading rather than failing —
      // the reading neither number gives alone.
      const retries = frequencyOf(snapshots, "qadi_port_retries_total");
      assert.strictEqual(retries?.state.occurrences.get("AttributeResolver"), 2);
      const calls = frequencyOf(snapshots, "qadi_port_calls_total");
      assert.strictEqual(calls?.state.occurrences.get("AttributeResolver"), 1);
    }));
});
