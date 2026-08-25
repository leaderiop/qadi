import "server-only";
/**
 * The three ports, wired the way a real deployment wires them.
 *
 * Kept apart from `layer.ts` because `EvaluationPortsLayer` is a type the
 * devtools simulator's `Live` source wants on its own: it is *exactly* the ports
 * an evaluation may reach, with `CurrentSubject` and `EvaluationId` excluded by
 * the type rather than by convention, so a panel cannot reach the subject a
 * request would use.
 *
 * `attributeResolverRetrying` and `attributeResolverBounded` are here rather
 * than omitted for realism: the Services screen reads retry counts off
 * `qadi_port_retries_total`, and a resolver that can never retry makes that
 * column permanently zero and permanently uninformative.
 */
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import {
  attributeResolverBounded,
  attributeResolverRetrying,
  AttributeResolver,
  decisionHistoryFromEvents,
  relationshipResolverFromEdges,
} from "@qadi/core";
import type { AttributeResolverShape, SubjectId } from "@qadi/core";
import * as Effect from "effect/Effect";
import type { EvaluationPortsLayer } from "@qadi/devtools";
import { articles } from "../domain/articles.ts";
import { userById } from "../domain/subjects.ts";
import { standingOf } from "./revocations.ts";

/**
 * Subject attributes, from the "identity provider".
 *
 * Named, because an unnamed port makes the Services screen say *wired* and
 * nothing else — and the whole reason `AttributeResolverShape.name` exists is
 * that "wired" is not an answer to "wired to what".
 */
const attributes: Layer.Layer<AttributeResolver> = Layer.succeed(AttributeResolver, {
  name: "newsroom directory",
  resolve: (subjectId: SubjectId, attribute: string) =>
    Effect.sync(() =>
      // `standing` is the one attribute this directory does not hold statically:
      // it is what `/edge/divergent` revokes between a render and a re-check, so
      // it has to be read at the moment of the question rather than baked into
      // the subject.
      attribute === "standing"
        ? standingOf(subjectId)
        : userById(subjectId).subject.attributes[attribute]
    ),
} satisfies AttributeResolverShape);

/**
 * Who wrote what.
 *
 * Edges rather than a database, because the point is the *shape* of a
 * relationship question — subject, relation, resource id, optional depth — and a
 * query builder in the way would only obscure it.
 */
const relationships = relationshipResolverFromEdges(
  articles.map((article) => ({
    subjectId: article.authorId,
    relation: "author-of",
    resourceId: article.id,
  })),
);

/**
 * What has already happened.
 *
 * Exactly one article has been through legal, which is what makes the publish
 * rule table interesting: `the-harbour-contract` fails only the embargo row, and
 * `the-tender` fails both.
 */
const history = decisionHistoryFromEvents([
  { subjectId: "leila", event: "legal-review", resourceId: "the-harbour-contract" },
  { subjectId: "hakim", event: "legal-review", resourceId: "the-harbour-contract" },
]);

/**
 * The ports, retrying and bounded.
 *
 * `Schedule.recurs(2)` on a resolver that cannot fail looks like theatre and is
 * not: `attributeResolverRetrying` wraps every call whether or not it retries,
 * and it is the wrapper that reports to `qadi_port_retries_total`. Wiring it
 * here is what makes the Services screen's retry column mean "none happened"
 * rather than "nothing counts them".
 */
export const ports: EvaluationPortsLayer = Layer.mergeAll(
  attributes.pipe(
    attributeResolverRetrying(Schedule.recurs(2)),
    attributeResolverBounded(8),
  ),
  relationships,
  history,
);
