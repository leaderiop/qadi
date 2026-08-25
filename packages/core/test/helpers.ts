import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import { AttributeResolver, AttributeResolverNone } from "../src/AttributeResolver.ts";
import type { AuthSubject } from "../src/AuthSubject.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { CurrentSubject, currentSubjectLayer } from "../src/CurrentSubject.ts";
import { CustomPredicate, CustomPredicateNone } from "../src/CustomPredicate.ts";
import { DecisionHistory, DecisionHistoryUnknown } from "../src/DecisionHistory.ts";
import { EvaluationId, evaluationIdSequential } from "../src/EvaluationId.ts";
import {
  RelationshipResolver,
  RelationshipResolverNever,
} from "../src/RelationshipResolver.ts";

export type QadiServices =
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | DecisionHistory
  | EvaluationId
  | CustomPredicate;

/**
 * A fully-wired evaluation environment with deterministic identifiers.
 *
 * Defaults fail closed: no attribute resolution, no relationships.
 */
export const testLayer = (
  subject: AuthSubject,
  overrides?: {
    readonly attributes?: Layer.Layer<AttributeResolver>;
    readonly relationships?: Layer.Layer<RelationshipResolver>;
    readonly history?: Layer.Layer<DecisionHistory>;
    readonly customPredicate?: Layer.Layer<CustomPredicate>;
  },
): Layer.Layer<QadiServices> =>
  Layer.mergeAll(
    currentSubjectLayer(subject),
    overrides?.attributes ?? AttributeResolverNone,
    overrides?.relationships ?? RelationshipResolverNever,
    overrides?.history ?? DecisionHistoryUnknown,
    evaluationIdSequential(),
    overrides?.customPredicate ?? CustomPredicateNone,
  );

/**
 * The same environment with **no** current subject.
 *
 * Subject-set evaluation supplies its own per element, so requiring one here
 * would let a test pass while the public signature asked for a value that could
 * not affect any answer (ADR-QD-022).
 */
export const subjectSetLayer = (overrides?: {
  readonly attributes?: Layer.Layer<AttributeResolver>;
  readonly relationships?: Layer.Layer<RelationshipResolver>;
  readonly history?: Layer.Layer<DecisionHistory>;
  readonly customPredicate?: Layer.Layer<CustomPredicate>;
}): Layer.Layer<Exclude<QadiServices, CurrentSubject>> =>
  Layer.mergeAll(
    overrides?.attributes ?? AttributeResolverNone,
    overrides?.relationships ?? RelationshipResolverNever,
    overrides?.history ?? DecisionHistoryUnknown,
    evaluationIdSequential(),
    overrides?.customPredicate ?? CustomPredicateNone,
  );

export const subjectWith = (config: {
  readonly id?: string;
  readonly roles?: ReadonlyArray<string>;
  readonly permissions?: ReadonlyArray<`${string}:${string}`>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}): AuthSubject =>
  makeSubject({
    id: config.id ?? "u1",
    roles: config.roles ?? [],
    permissions: config.permissions ?? [],
    attributes: config.attributes ?? {},
  });

/**
 * Gives an effect its own `MetricRegistry` for the duration of a test.
 *
 * The `CurrentMetricAttributes` override alongside it is not optional:
 * `effect/Metric`'s `hook` caches an untagged metric's resolved hooks on the
 * metric object itself, for the process's lifetime, the first time it is
 * touched with no ambient `CurrentMetricAttributes` set — the fast path a
 * real deployment (one registry, one process) wants. Every metric this test
 * suite touches is "untagged" by that check even where it carries its own
 * fixed attributes (`Metric.withAttributes`), since the check looks at the
 * ambient context, not at the metric's own attributes. Left unset, the first
 * test to touch a given metric would pin it to that test's registry for
 * every test after.
 */
export const isolatedMetrics = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provideService(Metric.MetricRegistry, new Map()),
    Effect.provideService(Metric.CurrentMetricAttributes, { test: "isolated" }),
  );
