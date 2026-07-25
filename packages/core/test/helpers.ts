import * as Layer from "effect/Layer";
import { AttributeResolver, AttributeResolverNone } from "../src/AttributeResolver.ts";
import type { AuthSubject } from "../src/AuthSubject.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { CurrentSubject, currentSubjectLayer } from "../src/CurrentSubject.ts";
import { EvaluationId, evaluationIdSequential } from "../src/EvaluationId.ts";
import {
  RelationshipResolver,
  RelationshipResolverNever,
} from "../src/RelationshipResolver.ts";

export type GuardServices =
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
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
  },
): Layer.Layer<GuardServices> =>
  Layer.mergeAll(
    currentSubjectLayer(subject),
    overrides?.attributes ?? AttributeResolverNone,
    overrides?.relationships ?? RelationshipResolverNever,
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
