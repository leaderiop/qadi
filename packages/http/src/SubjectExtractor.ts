/**
 * Resolves the `AuthSubject` for an incoming HTTP request.
 *
 * Subject resolution is inherently pluggable — a bearer token, a session
 * cookie, mTLS, whatever a deployment actually uses — so this ships one
 * interface and one default implementation rather than assuming a scheme.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Headers from "effect/unstable/http/Headers";
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import type { AuthSubject } from "@qadi/core";
import { anonymous } from "@qadi/core";

export interface SubjectExtractorShape {
  readonly extract: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<AuthSubject>;
}

export class SubjectExtractor extends Context.Service<SubjectExtractor, SubjectExtractorShape>()(
  "qadi/http/SubjectExtractor",
) {
  static readonly extract = (request: HttpServerRequest.HttpServerRequest) =>
    SubjectExtractor.use((s) => s.extract(request));
}

const BEARER_PREFIX = "Bearer ";

/**
 * Resolves a Bearer token via `lookup`, falling back to Qadi's own
 * `anonymous` subject when no `Authorization` header is present or it isn't
 * a Bearer scheme. Never fails — an unauthenticated request holds no roles
 * or permissions, the same fail-closed default `CurrentSubjectAnonymous`
 * already establishes for a graph missing its real subject layer.
 */
export const subjectExtractorBearer = (
  lookup: (token: string) => Effect.Effect<AuthSubject>,
): Layer.Layer<SubjectExtractor> =>
  Layer.succeed(SubjectExtractor, {
    extract: (request) =>
      Headers.get(request.headers, "authorization").pipe(
        Option.filter((header) => header.startsWith(BEARER_PREFIX)),
        Option.match({
          onNone: () => Effect.succeed(anonymous),
          onSome: (header) => lookup(header.slice(BEARER_PREFIX.length)),
        }),
      ),
  });
