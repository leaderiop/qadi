/**
 * The subject-less half of the test environment.
 *
 * Every default fails closed, so a test that forgets to grant something sees a
 * denial rather than an accidental allow.
 */
import {
  AttributeResolver,
  AttributeResolverNone,
  DecisionHistory,
  DecisionHistoryUnknown,
  EvaluationId,
  RelationshipResolver,
  RelationshipResolverNever,
  evaluationIdSequential,
} from "@qadi/core";
import type { CurrentSubject } from "@qadi/core";
import * as Layer from "effect/Layer";
import { edgeRelationshipResolver } from "./EdgeRelationshipResolver.ts";
import { recordingAttributeResolver } from "./RecordingAttributeResolver.ts";
import { eventDecisionHistory } from "./EventDecisionHistory.ts";

/** Everything an evaluation needs. */
export type QadiTestServices =
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | DecisionHistory
  | EvaluationId;

export interface TestLayerOptions {
  /** Attributes resolved on a subject miss. */
  readonly attributes?: Readonly<Record<string, unknown>>;
  /** Relationship edges as `[subjectId, relation, resourceId]`. */
  readonly relationships?: ReadonlyArray<readonly [string, string, string]>;
  /** Past events as `[subjectId, event, resourceId]`. */
  readonly history?: ReadonlyArray<readonly [string, string, string]>;
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
  /** Supplies the history port directly, taking precedence over `history`. */
  readonly decisionHistory?: Layer.Layer<DecisionHistory>;
}

/**
 * The same environment `qadiTestLayer` builds, with no current subject.
 *
 * For `decideSubjects` and `filterSubjects`, which supply their own subject per
 * element and so must not require an ambient one (ADR-QD-022). A review query is
 * asked by nobody, and a fixture that made one up would be the first thing later
 * mistaken for a real requester.
 *
 * `qadiTestLayer` is this plus a subject rather than a parallel copy: two
 * bodies resolving the same options would eventually disagree about a default,
 * and a fixture that fails *open* in one of them is not a failure anyone reads.
 */
export const qadiReviewLayer = (
  options?: TestLayerOptions,
): Layer.Layer<Exclude<QadiTestServices, CurrentSubject>> =>
  Layer.mergeAll(
    options?.attributeResolver ??
      (options?.attributes === undefined
        ? AttributeResolverNone
        : recordingAttributeResolver(options.attributes).layer),
    options?.relationshipResolver ??
      (options?.relationships === undefined
        ? RelationshipResolverNever
        : edgeRelationshipResolver(options.relationships).layer),
    options?.decisionHistory ??
      (options?.history === undefined
        ? DecisionHistoryUnknown
        : eventDecisionHistory(options.history).layer),
    evaluationIdSequential(options?.idPrefix ?? "eval"),
  );
