/**
 * The frontend — a typed client generated from the *same* `HttpApi` value the
 * server implements (`api.ts`), the way a React/Next.js app would consume a
 * qadi-guarded API.
 *
 * What qadi's HTTP annotations give the client:
 *
 *  - **Typed calls.** `client.documents.me()` returns
 *    `Effect<{ subjectId: string }, …>` — identifiers, paths, payloads, and
 *    success shapes all come from the shared schemas, so a server change that
 *    renames an endpoint or reshapes a payload breaks the frontend's build,
 *    not its runtime.
 *  - **Typed enforcement outcomes, on every guarded endpoint automatically.**
 *    `RequirePermission` declares `requiredForClient: true` and a
 *    `clientError` derived from its own schemas (ADR-QD-075), so
 *    `HttpApiClient` includes every enforcement outcome it can produce in
 *    each guarded call's static error type — no endpoint declares its own
 *    subset. What arrives client-side depends on what the middleware puts on
 *    the wire:
 *      - Denials (403) are **empty-bodied by design** — a trace names every
 *        node and why it refused, which is not for the caller — so a denial
 *        surfaces as the typed `HttpClientError` carrying `status: 403`.
 *      - Outages (502) carry real bodies encoded through the declared
 *        schemas, so they decode into *named* errors: `AttributeResolveError`
 *        means the attribute store broke, never "you may not" (INV-QD-006, at
 *        the consumer side).
 *  - **No client-side enforcement, but a required passthrough layer.**
 *    `RequiredPermission` and `PublicEndpoint` are annotations, not runtime
 *    code — the client sends a credential and the server decides. But because
 *    `RequirePermission` is `requiredForClient`, building this client needs
 *    `Effect.provide(passthroughClientLayer(RequirePermission))` in its layer
 *    graph regardless — a one-line forwarding implementation, since the
 *    credential itself is attached by decorating the underlying `HttpClient`
 *    below (a real app reads its session store here), not by that layer.
 *
 * What does not transfer: `/__decisions` and the other bare-`HttpRouter`
 * routes are enforced by `addGuardedRoute`, not annotations on this `HttpApi`,
 * so they are not client methods — a browser consumes the SSE feed with
 * `EventSource` and passes its credential the way it already does.
 *
 * Run while `server.ts` is listening:
 *
 * ```sh
 * bun examples/http-advanced/client.ts
 * RESOLVER_DOWN=1 bun examples/http-advanced/client.ts   # outage demo
 * ```
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientError from "effect/unstable/http/HttpClientError";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";
import { RequirePermission, passthroughClientLayer } from "@qadi/http";
import { Api } from "./api.ts";

// A real frontend resolves this from its session store (cookie, memory token,
// OIDC client) at call time. `transformClient` is the one place every
// generated call flows through, so the credential is attached in exactly one
// spot — no per-call header plumbing.
let currentToken: string | undefined;

const Client = HttpApiClient.make(Api, {
  baseUrl: "http://localhost:3000",
  transformClient: HttpClient.mapRequest((request) =>
    currentToken === undefined ? request : HttpClientRequest.bearerToken(request, currentToken),
  ),
});

// Required once `RequirePermission` sets `requiredForClient: true`
// (ADR-QD-075) — a one-line forwarding implementation, since the credential
// is already attached above via `transformClient`, not through this layer.
const RequirePermissionClient = passthroughClientLayer(RequirePermission);

// A denial is `HttpClientError` carrying the response — read the status once,
// and the rest of the frontend just sees "denied".
const denialStatus = (error: HttpClientError.HttpClientError): number | undefined =>
  error.reason._tag === "StatusCodeError" ? error.reason.response.status : undefined;

const program = Effect.gen(function* () {
  const client = yield* Client;

  // 1. Public endpoint — no credential, no enforcement, typed result.
  yield* client.documents.health();
  console.log("health: ok");

  if (process.env["RESOLVER_DOWN"] !== "1") {
    // 2. Guarded endpoint with a valid credential — the success type is the
    //    endpoint's declared `success` schema.
    currentToken = "alice-token";
    const me = yield* client.documents.me();
    console.log(`me as alice: subjectId=${me.subjectId}`);

    // 3. Guarded endpoint, anonymous — 403, empty body, typed error.
    currentToken = undefined;
    yield* client.documents.me().pipe(
      Effect.catchTag("HttpClientError", (error) =>
        Effect.sync(() => console.log(`me anonymous: DENIED (HttpClientError, HTTP ${denialStatus(error)})`))),
    );

    // 4. Unknown token — `lookupSubject` answers `anonymous`, so this is the
    //    same denial: an unrecognized credential fails closed, it does not
    //    become an outage.
    currentToken = "nope";
    yield* client.documents.me().pipe(
      Effect.catchTag("HttpClientError", (error) =>
        Effect.sync(() => console.log(`me unknown token: DENIED (HttpClientError, HTTP ${denialStatus(error)})`))),
    );
    return;
  }

  // 5. Outage demo (run the server with RESOLVER_DOWN=1): the middleware's
  //    evaluation needs the attribute store, which failed. The middleware
  //    propagates the typed failure, the declared `AttributeResolveErrorResponse`
  //    schema encodes a real 502 body, and the client decodes it back into a
  //    named `AttributeResolveError` — statically present because `api.ts`
  //    declares the same exported schema on the endpoint. The UI can show
  //    "temporarily unavailable" instead of locking the user out.
  currentToken = "alice-token";
  yield* client.documents.me().pipe(
    Effect.catchTag(["AttributeResolveError", "HttpClientError"], (error) => {
      if (error._tag === "AttributeResolveError") {
        return Effect.sync(() =>
          console.log(`me as alice: OUTAGE (typed ${error._tag}) — attribute store down`),
        );
      }
      const status = denialStatus(error);
      return Effect.sync(() =>
        console.log(`me as alice: outage reached the client as HTTP ${status} (undecoded)`),
      );
    }),
  );
});

Effect.runPromise(
  program.pipe(Effect.provide(Layer.mergeAll(FetchHttpClient.layer, RequirePermissionClient))),
).catch(console.error);
