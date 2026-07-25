/**
 * Ready-made layers for testing guarded code.
 *
 * Every default fails closed, so a test that forgets to grant something sees a
 * denial rather than an accidental allow.
 */
import {
  AttributeResolveError,
  AttributeResolver,
  AttributeResolverNone,
  CurrentSubject,
  EvaluationId,
  RelationshipResolver,
  RelationshipResolverNever,
  currentSubjectLayer,
  evaluationIdSequential,
} from "@guard/core";
import type { AuthSubject } from "@guard/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

/** Everything an evaluation needs. */
export type GuardTestServices =
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | EvaluationId;

export interface TestLayerOptions {
  /** Attributes resolved on a subject miss. */
  readonly attributes?: Readonly<Record<string, unknown>>;
  /** Relationship edges as `[subjectId, relation, resourceId]`. */
  readonly relationships?: ReadonlyArray<readonly [string, string, string]>;
  /** Prefix for the deterministic evaluation ids. Defaults to `eval`. */
  readonly idPrefix?: string;
  /**
   * Supplies the resolver layer directly, taking precedence over
   * `attributes`.
   *
   * Needed because this layer already satisfies the requirement — an outer
   * `Effect.provide` cannot override it, since the innermost provide wins.
   */
  readonly attributeResolver?: Layer.Layer<AttributeResolver>;
  /** Supplies the relationship layer directly, taking precedence over `relationships`. */
  readonly relationshipResolver?: Layer.Layer<RelationshipResolver>;
}

/**
 * A complete, deterministic evaluation environment.
 *
 * Evaluation ids are sequential rather than random, so decisions can be
 * asserted on exactly.
 */
export const guardTestLayer = (
  subject: AuthSubject,
  options?: TestLayerOptions,
): Layer.Layer<GuardTestServices> =>
  Layer.mergeAll(
    currentSubjectLayer(subject),
    options?.attributeResolver ??
      (options?.attributes === undefined
        ? AttributeResolverNone
        : recordingAttributeResolver(options.attributes).layer),
    options?.relationshipResolver ??
      (options?.relationships === undefined
        ? RelationshipResolverNever
        : edgeRelationshipResolver(options.relationships).layer),
    evaluationIdSequential(options?.idPrefix ?? "eval"),
  );

/**
 * An attribute resolver that records what it was asked for.
 *
 * Lets a test assert not just the decision but the work done to reach it —
 * which is how short-circuiting is verified.
 */
export const recordingAttributeResolver = (
  table: Readonly<Record<string, unknown>> = {},
): {
  readonly layer: Layer.Layer<AttributeResolver>;
  readonly calls: ReadonlyArray<string>;
} => {
  const calls: Array<string> = [];
  return {
    calls,
    layer: Layer.succeed(AttributeResolver, {
      resolve: (_subjectId, attribute) =>
        Effect.sync(() => {
          calls.push(attribute);
          return table[attribute];
        }),
    }),
  };
};

/** A relationship resolver over a static edge list, recording its queries. */
export const edgeRelationshipResolver = (
  edges: ReadonlyArray<readonly [string, string, string]>,
): {
  readonly layer: Layer.Layer<RelationshipResolver>;
  readonly calls: ReadonlyArray<string>;
} => {
  const index = new Set(edges.map(([s, rel, r]) => `${s} ${rel} ${r}`));
  const calls: Array<string> = [];
  return {
    calls,
    layer: Layer.succeed(RelationshipResolver, {
      check: (request) =>
        Effect.sync(() => {
          const key = `${request.subjectId} ${request.relation} ${request.resourceId}`;
          calls.push(key);
          return index.has(key);
        }),
    }),
  };
};

/**
 * An attribute resolver that always fails.
 *
 * For asserting that a broken lookup surfaces as an error rather than being
 * silently reported as a denial.
 */
export const failingAttributeResolver = (
  cause: unknown = "test failure",
): Layer.Layer<AttributeResolver> =>
  Layer.succeed(AttributeResolver, {
    resolve: (_subjectId, attribute) =>
      Effect.fail(new AttributeResolveError({ attribute, cause })),
  });
