import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import { AttributeResolver, attributeResolverPort } from "../src/AttributeResolver.ts";
import { decisionCacheLayer } from "../src/DecisionCache.ts";
import { evaluate } from "../src/Evaluate.ts";
import {
  decisionCacheLookupsTotal,
  decisionsTotal,
  denialsByPolicyTagTotal,
  evaluationDurationMillis,
  evaluationErrorsTotal,
  predicatesTranslatedTotal,
} from "../src/EvaluationMetrics.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import { toPredicate } from "../src/Predicate.ts";
import { isolatedMetrics, subjectWith, testLayer } from "./helpers.ts";


/**
 * The registry key an exporter sees (ADR-QD-052, ADR-QD-123).
 *
 * This block matches on the snapshot, not on imported values, on purpose: the
 * attributes of a `withAttributes` series are visible only there, and the
 * `[type, id, description, attributes]` projection is exactly what an OTLP or
 * Prometheus exporter reads. It is the oracle that moving a declaration changed
 * nothing: a reworded description is a new registry key.
 */
describe("the registry key an exporter sees (ADR-QD-052)", () => {
  const resolving = Layer.succeed(AttributeResolver, {
    resolve: () => Effect.succeed(5),
  });
  const brokenAttributes = scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer;

  it.effect("the seven series, byte for byte", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const needsLookup = P.hasAttribute("clearance", M.gte(1));
          // An allow and a deny: the two outcome series, the histogram, the denial frequency.
          yield* evaluate(P.hasRole("editor")).pipe(
            Effect.provide(testLayer(subjectWith({ id: "u1", roles: ["editor"] }))),
          );
          yield* evaluate(P.hasRole("editor")).pipe(Effect.provide(testLayer(subjectWith({ id: "u2" }))));
          // A failed evaluation: the error frequency.
          yield* Effect.result(evaluate(needsLookup)).pipe(
            Effect.provide(testLayer(subjectWith({}), { AttributeResolver: brokenAttributes })),
          );
          // Twice through a cache: a miss, then a hit.
          yield* Effect.gen(function* () {
            yield* evaluate(needsLookup);
            yield* evaluate(needsLookup);
          }).pipe(
            Effect.provide(
              Layer.mergeAll(
                testLayer(subjectWith({ id: "u3" }), { AttributeResolver: resolving }),
                decisionCacheLayer(),
              ),
            ),
          );
          // One translation.
          yield* toPredicate(P.hasRole("editor")).pipe(
            Effect.provide(testLayer(subjectWith({ id: "u1" }))),
          );
          return yield* Metric.snapshot;
        }),
      );

      // The port metrics are written by the same evaluations; they are not this block's six.
      const projected = snapshots
        .filter((s) => !s.id.startsWith("qadi_port_"))
        .map((s) => ({
          type: s.type,
          id: s.id,
          description: s.description,
          attributes: s.attributes ?? null,
        }))
        .sort((a, b) => {
          const key = (x: { id: string; attributes: unknown }) => `${x.id}|${JSON.stringify(x.attributes)}`;
          return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
        });

      assert.deepStrictEqual(projected, [
        {
          type: "Frequency",
          id: "qadi_decision_cache_lookups_total",
          description: "DecisionCache.getOrCompute lookups, by outcome (hit / coalesced / miss).",
          attributes: null,
        },
        {
          type: "Counter",
          id: "qadi_decisions_total",
          description: "Authorization decisions reached by `evaluate`, tagged by outcome.",
          attributes: { outcome: "allow" },
        },
        {
          type: "Counter",
          id: "qadi_decisions_total",
          description: "Authorization decisions reached by `evaluate`, tagged by outcome.",
          attributes: { outcome: "deny" },
        },
        {
          type: "Frequency",
          id: "qadi_denials_by_policy_tag_total",
          description: "Denials, keyed by the top-level policy tag evaluate was asked to decide.",
          attributes: null,
        },
        {
          type: "Histogram",
          id: "qadi_evaluation_duration_millis",
          description: "Distribution of evaluate's wall-clock duration, in milliseconds.",
          attributes: null,
        },
        {
          type: "Frequency",
          id: "qadi_evaluation_errors_total",
          description: "Evaluations that failed instead of deciding, keyed by error tag.",
          attributes: null,
        },
        {
          type: "Counter",
          id: "qadi_predicates_translated_total",
          description: "Policies successfully compiled to a Predicate by `toPredicate`.",
          attributes: null,
        },
      ]);
    }));
});


/**
 * The declarations: id, type and description per export, in
 * `HydrationMetrics.test.ts`'s shape. Stryker never mutates a module-scope
 * declaration (`ignoreStatic`, ADR-QD-076), so this block is their only guard.
 * Each literal id below is a pin, the one place a test may restate one.
 */
describe("the declarations", () => {
  it.effect("decisionsTotal is one Counter series per Decision tag", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(Object.keys(decisionsTotal), ["Allow", "Deny"]);
      for (const series of [decisionsTotal.Allow, decisionsTotal.Deny]) {
        assert.strictEqual(series.id, "qadi_decisions_total");
        assert.strictEqual(series.type, "Counter");
        assert.strictEqual(
          series.description,
          "Authorization decisions reached by `evaluate`, tagged by outcome.",
        );
      }
    }),
  );

  it.effect("qadi_denials_by_policy_tag_total is a Frequency preregistering every Policy tag, in order", () =>
    Effect.gen(function* () {
      assert.strictEqual(denialsByPolicyTagTotal.id, "qadi_denials_by_policy_tag_total");
      assert.strictEqual(denialsByPolicyTagTotal.type, "Frequency");
      assert.strictEqual(
        denialsByPolicyTagTotal.description,
        "Denials, keyed by the top-level policy tag evaluate was asked to decide.",
      );
      const value = yield* isolatedMetrics(Metric.value(denialsByPolicyTagTotal));
      assert.deepStrictEqual([...value.occurrences.keys()], [...P.POLICY_TAGS]);
    }),
  );

  it.effect("qadi_evaluation_duration_millis is a Histogram with its description", () =>
    Effect.gen(function* () {
      assert.strictEqual(evaluationDurationMillis.id, "qadi_evaluation_duration_millis");
      assert.strictEqual(evaluationDurationMillis.type, "Histogram");
      assert.strictEqual(
        evaluationDurationMillis.description,
        "Distribution of evaluate's wall-clock duration, in milliseconds.",
      );
    }),
  );

  it.effect("qadi_evaluation_errors_total is a Frequency preregistering every EvaluationError tag", () =>
    Effect.gen(function* () {
      assert.strictEqual(evaluationErrorsTotal.id, "qadi_evaluation_errors_total");
      assert.strictEqual(evaluationErrorsTotal.type, "Frequency");
      assert.strictEqual(
        evaluationErrorsTotal.description,
        "Evaluations that failed instead of deciding, keyed by error tag.",
      );
      const value = yield* isolatedMetrics(Metric.value(evaluationErrorsTotal));
      const expected: ReadonlyArray<string> = [
        "AttributeResolveError",
        "RelationshipResolveError",
        "DecisionHistoryUnavailable",
        "CustomPredicateError",
        "SignatureHistoryUnavailable",
        "MissingAction",
        "MissingResource",
        "MissingResourceId",
        "PolicyTooDeep",
      ];
      assert.deepStrictEqual([...value.occurrences.keys()], expected);
    }),
  );

  it.effect("qadi_decision_cache_lookups_total is a Frequency preregistering the three outcomes", () =>
    Effect.gen(function* () {
      assert.strictEqual(decisionCacheLookupsTotal.id, "qadi_decision_cache_lookups_total");
      assert.strictEqual(decisionCacheLookupsTotal.type, "Frequency");
      assert.strictEqual(
        decisionCacheLookupsTotal.description,
        "DecisionCache.getOrCompute lookups, by outcome (hit / coalesced / miss).",
      );
      const value = yield* isolatedMetrics(Metric.value(decisionCacheLookupsTotal));
      assert.deepStrictEqual([...value.occurrences.keys()], ["hit", "coalesced", "miss"]);
    }),
  );

  it.effect("qadi_predicates_translated_total is a Counter with its description", () =>
    Effect.gen(function* () {
      assert.strictEqual(predicatesTranslatedTotal.id, "qadi_predicates_translated_total");
      assert.strictEqual(predicatesTranslatedTotal.type, "Counter");
      assert.strictEqual(
        predicatesTranslatedTotal.description,
        "Policies successfully compiled to a Predicate by `toPredicate`.",
      );
    }),
  );
});
