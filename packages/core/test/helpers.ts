import * as Layer from "effect/Layer";
import { AttributeResolver, AttributeResolverNone } from "../src/AttributeResolver.ts";
import type { AuthSubject } from "../src/AuthSubject.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { CurrentSubject, currentSubjectLayer } from "../src/CurrentSubject.ts";
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
  | EvaluationId;

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
  },
): Layer.Layer<QadiServices> =>
  Layer.mergeAll(
    currentSubjectLayer(subject),
    overrides?.attributes ?? AttributeResolverNone,
    overrides?.relationships ?? RelationshipResolverNever,
    overrides?.history ?? DecisionHistoryUnknown,
    evaluationIdSequential(),
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
}): Layer.Layer<Exclude<QadiServices, CurrentSubject>> =>
  Layer.mergeAll(
    overrides?.attributes ?? AttributeResolverNone,
    overrides?.relationships ?? RelationshipResolverNever,
    overrides?.history ?? DecisionHistoryUnknown,
    evaluationIdSequential(),
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
