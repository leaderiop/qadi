import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import { AttributeResolver, attributeResolverPort } from "../src/AttributeResolver.ts";
import { decisionCacheLayer } from "../src/DecisionCache.ts";
import { evaluate } from "../src/Evaluate.ts";
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
