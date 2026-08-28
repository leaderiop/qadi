"use client";
/**
 * The browser's three ports, answered by the server.
 *
 * This is the half of hydration that is easy to forget. A seeded decision covers
 * the first frames; the client then **re-checks**, and a re-check is a real
 * evaluation that needs real answers. Faking them in the browser would make
 * every re-check agree with the seed by construction, which is the one outcome
 * that proves nothing.
 *
 * So the ports are remote, and the endpoints answer **only for the session's own
 * subject** — the `subjectId` in the request is sent for the server's logs and
 * is never read as identity. A port endpoint that answered for whoever it was
 * asked about would be a subject-enumeration API with extra steps.
 *
 * Each call is one round trip. That is the honest cost of a client that can
 * re-check, and it is visible: the Services screen's Port calls list is fed by
 * the same `collectPortCalls` tracer on this side as on the server's.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  AttributeResolveError,
  CustomPredicateNone,
  DecisionHistory,
  DecisionHistoryUnavailable,
  RelationshipResolver,
  RelationshipResolveError,
  SignatureHistoryNone,
} from "@qadi/core";
import type {
  ActedResult,
  AttributeResolverShape,
  DecisionHistoryShape,
  RelatedResult,
  RelationshipResolverShape,
} from "@qadi/core";
import type { EvaluationPortsLayer } from "@qadi/devtools";

/**
 * Asks the server, and refuses to guess when there is no server to ask *from*.
 *
 * A `"use client"` module still executes during the server render — that is what
 * puts a settled control into the HTML — so these resolvers run in Node too,
 * where a relative `fetch` throws `TypeError: Failed to parse URL`. Letting that
 * become an `AttributeResolveError` would render *could not decide* on the
 * server for every attribute question, which is a lie: the question was never
 * asked.
 *
 * So on the server it does not settle. An atom whose effect never completes
 * stays `Initial`, the guard renders **pending**, and the seed is what covers
 * that gap — which is exactly the division of labour
 * [BEH-QD-067](../../../../spec/behaviors/09-react.md) describes. A question
 * this page seeded is correct in the first byte; one it did not is pending until
 * the browser can ask.
 */
const ask = (path: string, query: Record<string, string>): Effect.Effect<unknown, unknown> =>
  typeof window === "undefined"
    ? Effect.never
    : Effect.tryPromise(async () => {
      const url = `${path}?${new URLSearchParams(query).toString()}`;
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`${url} answered ${response.status}`);
      return response.json();
    });

/** Reads one property off an unknown JSON body without an `as`. */
const field = (body: unknown, key: string): unknown =>
  typeof body === "object" && body !== null && key in body
    ? Object.entries(body).find(([name]) => name === key)?.[1]
    : undefined;

const attributes: Layer.Layer<AttributeResolver> = Layer.succeed(AttributeResolver, {
  name: "newsroom directory (over HTTP)",
  resolve: (subjectId, attribute) =>
    ask("/api/ports/attribute", { subjectId, attribute }).pipe(
      Effect.map((body) => field(body, "value")),
      // Fails with the port's own error, never a raw one. An attribute store
      // that is down must read as *the question could not be answered* — which
      // denies — and never as *the answer was no*.
      Effect.mapError((cause) => new AttributeResolveError({ attribute, cause })),
    ),
} satisfies AttributeResolverShape);

const isRelated = (value: unknown): value is RelatedResult =>
  value === "Related" || value === "Unrelated" || value === "Unknown";

const relationships: Layer.Layer<RelationshipResolver> = Layer.succeed(RelationshipResolver, {
  name: "authorship graph (over HTTP)",
  check: (request) =>
    ask("/api/ports/relationship", {
      subjectId: request.subjectId,
      relation: request.relation,
      resourceId: request.resourceId,
      ...(request.depth === undefined ? {} : { depth: String(request.depth) }),
    }).pipe(
      // An unrecognised answer is `Unknown`, not `Unrelated`. The port is
      // three-valued precisely so a broken far end cannot be read as a denial
      // that someone might then trust.
      Effect.map((body): RelatedResult => {
        const answer = field(body, "related");
        return isRelated(answer) ? answer : "Unknown";
      }),
      Effect.mapError((cause) =>
        new RelationshipResolveError({
          relation: request.relation,
          resourceId: request.resourceId,
          cause,
        })
      ),
    ),
} satisfies RelationshipResolverShape);

const isActed = (value: unknown): value is ActedResult =>
  value === "Acted" || value === "NotActed" || value === "Unknown";

const history: Layer.Layer<DecisionHistory> = Layer.succeed(DecisionHistory, {
  name: "newsroom audit log (over HTTP)",
  hasActed: (query) =>
    ask("/api/ports/history", {
      subjectId: query.subjectId,
      event: query.event,
      ...(query.resourceId === undefined ? {} : { resourceId: query.resourceId }),
    }).pipe(
      Effect.map((body): ActedResult => {
        const answer = field(body, "answer");
        return isActed(answer) ? answer : "Unknown";
      }),
      Effect.mapError((cause) => new DecisionHistoryUnavailable({ event: query.event, cause })),
    ),
} satisfies DecisionHistoryShape);

/** The ports, and the layer the devtools simulator's `Live` source is offered. */
export const browserPorts: EvaluationPortsLayer = Layer.mergeAll(
  attributes,
  relationships,
  history,
  // No browser endpoint answers a `hasCustom` question in this example — every
  // policy it authorizes uses only the built-in matchers — so the client's
  // registry is the same fail-closed default a real deployment gets from an
  // unwired one.
  CustomPredicateNone,
  // Same reasoning as CustomPredicateNone above: no policy here reaches for
  // hasSignature either.
  SignatureHistoryNone,
);
