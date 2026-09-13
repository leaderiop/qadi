/**
 * The shared API contract — the single `HttpApi` value both the server
 * (`server.ts`) and the frontend (`client.ts`) import.
 *
 * Everything the frontend gets from qadi's HTTP bindings is typed here:
 * endpoint identifiers, path params, success payloads, and — through the
 * `RequirePermission` middleware's own `requiredForClient`/`clientError`
 * declaration (ADR-QD-075) — the enforcement statuses (403 denial / 502
 * outage / 500 wiring mistake) that the generated client decodes into typed
 * errors, on every guarded endpoint automatically, with no per-endpoint
 * `error:` array to write or keep in sync.
 */
import * as Schema from "effect/Schema";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import { allOf, gte, hasAttribute, hasPermission, permission } from "@qadi/core";
import { PublicEndpoint, RequiredPermission, RequirePermission, publicEndpoint, requiresPermission } from "@qadi/http";

export const readPermission = permission("document", "read");

export const readPolicy = hasPermission(readPermission);

// Consults an attribute as well as the permission, so the middleware
// exercises the attribute store on every `/me` call — and its outage
// surfaces as a typed 502 instead of a denial.
const mePolicy = allOf([hasPermission(readPermission), hasAttribute("clearance", gte(1))]);

export const DocumentsGroup = HttpApiGroup.make("documents")
  .add(
    HttpApiEndpoint.get("read", "/documents").pipe((endpoint) =>
      endpoint.annotate(
        RequiredPermission,
        requiresPermission(endpoint, { permission: readPermission, policy: readPolicy }),
      ),
    ),
  )
  .add(
    // The middleware provides `CurrentSubject`, so the handler reads the
    // resolved subject directly; the declared `success` schema is what the
    // generated client types the call's result as.
    //
    // No `error:` array here — `RequirePermission` itself now declares
    // `requiredForClient: true` and a `clientError` derived from its own
    // schemas (ADR-QD-075), so every enforcement outcome it can produce is
    // already in this call's static error channel automatically, the same
    // way `documents.read()`/`documents.health()` get it below with nothing
    // endpoint-specific to write. The 403 denial tags are empty-bodied on
    // the wire by design (a trace names every node and why it refused —
    // that is not for the caller), so a denial arrives client-side as
    // `HttpClientError` with status 403; the outage tags carry real bodies
    // and decode into typed errors.
    HttpApiEndpoint.get("me", "/me", {
      success: Schema.Struct({ subjectId: Schema.String }),
    }).pipe((endpoint) =>
      endpoint.annotate(
        RequiredPermission,
        requiresPermission(endpoint, { permission: readPermission, policy: mePolicy }),
      ),
    ),
  )
  .add(
    HttpApiEndpoint.get("health", "/health").pipe((endpoint) =>
      endpoint.annotate(PublicEndpoint, publicEndpoint("liveness probe — no subject exists yet")),
    ),
  );

export const Api = HttpApi.make("documents-api").add(DocumentsGroup).middleware(RequirePermission);
