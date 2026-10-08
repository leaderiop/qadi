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
 * So the ports are remote, and `remotePortsLayer` (`@qadi/http`) is the whole
 * client half: each port's question and answer cross the wire as its
 * description states them, every non-answer — an outage, a refusal, a reply this
 * client cannot read — is the port's **own typed error**, and `"Unknown"` is only
 * ever an answer the server's port gave. The server half is `portRoutesUnguarded`
 * in `src/server/api.ts`; it answers **only for the session's own subject**, and a
 * question about anyone else is refused (403), never answered about the cookie's
 * subject under the asked one's name.
 *
 * Each call is one round trip. That is the honest cost of a client that can
 * re-check, and it is visible: the Services screen's Port calls list is fed by
 * the same `collectPortCalls` tracer on this side as on the server's.
 */
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  attributeResolverPort,
  DecisionHistory,
  decisionHistoryPort,
  portsLayer,
  RelationshipResolver,
  relationshipResolverPort,
} from "@qadi/core";
import { remotePortsLayer } from "@qadi/http";
import type { EvaluationPortsLayer } from "@qadi/devtools";

/**
 * The ports as a server render sees them: a question that never settles.
 *
 * A `"use client"` module still executes during the server render — that is what
 * puts a settled control into the HTML — so these ports exist in Node too, where
 * a relative `fetch` throws `TypeError: Failed to parse URL`. Letting that become
 * a port error would render *could not decide* on the server for every
 * attribute question, which is a lie: the question was never asked.
 *
 * So on the server it does not settle. An atom whose effect never completes
 * stays `Initial`, the guard renders **pending**, and the seed is what covers
 * that gap — which is exactly the division of labour
 * [BEH-QD-067](../../../../spec/behaviors/09-react.md) describes. A question
 * this page seeded is correct in the first byte; one it did not is pending until
 * the browser can ask. Whether a render may ask is the host's knowledge, which is
 * why the library offers no API for this and the host keeps the switch.
 */
const serverRenderPorts: EvaluationPortsLayer = portsLayer({
  AttributeResolver: Layer.succeed(
    AttributeResolver,
    attributeResolverPort.make("newsroom directory (server render)", () => Effect.never),
  ),
  RelationshipResolver: Layer.succeed(
    RelationshipResolver,
    relationshipResolverPort.make("authorship graph (server render)", () => Effect.never),
  ),
  DecisionHistory: Layer.succeed(
    DecisionHistory,
    decisionHistoryPort.make("newsroom audit log (server render)", () => Effect.never),
  ),
});

/**
 * Where the browser asks. `window.location.origin` rather than a bare `/api`,
 * because `HttpClient` builds an absolute URL from the request's.
 */
const remote = (): EvaluationPortsLayer =>
  remotePortsLayer({
    baseUrl: `${window.location.origin}/api`,
    prefix: "/ports",
    ports: ["AttributeResolver", "RelationshipResolver", "DecisionHistory"],
  }).pipe(
    Layer.provide(FetchHttpClient.layer),
    // The session is a cookie, so the browser must send it.
    Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { credentials: "same-origin" })),
  );

/**
 * The ports, and the layer the devtools simulator's `Live` source is offered.
 *
 * Only the three ports a browser endpoint answers are named. No policy here
 * reaches for `hasCustom` or `hasSignature`, so those two sit at the same
 * fail-closed defaults a real deployment gets from an unwired port.
 */
export const browserPorts: EvaluationPortsLayer = Layer.unwrap(
  // Decided when the layer is built, not when this module is evaluated: the same
  // module executes on the server render and in the browser.
  Effect.sync(() => (typeof window === "undefined" ? serverRenderPorts : remote())),
);
