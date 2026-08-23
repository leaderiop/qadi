/**
 * Resolves the `AuthSubject` for an incoming HTTP request.
 *
 * Subject resolution is inherently pluggable — a bearer token, a session
 * cookie, mTLS, whatever a deployment actually uses — so this ships one
 * interface and one default implementation rather than assuming a scheme.
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Headers from "effect/unstable/http/Headers";
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import type { AuthSubject } from "@qadi/core";
import { anonymous } from "@qadi/core";

/**
 * The credential store could not be reached, or answered unusably.
 *
 * **Not** "this request carries no credential" — that is `anonymous`, a
 * success, and a policy then denies it. This is the store being *broken*, and
 * the distinction is [INV-QD-006](../../../spec/invariants.md#inv-qd-006-failure-is-not-denial)
 * at the one boundary that had no way to express it.
 *
 * Without an error channel an implementor had two options and both were wrong:
 * `Effect.die`, which escapes the middleware's `catchTag` entirely and turns an
 * authorization path into a defect (AGENTS.md §4 forbids exactly that), or
 * falling back to `anonymous`, which renders an outage as a denial and sends an
 * operator to audit permissions during an incident.
 */
export class SubjectExtractionFailed extends Data.TaggedError("SubjectExtractionFailed")<{
  readonly reason: string;
}> {}

export interface SubjectExtractorShape {
  readonly extract: (
    request: HttpServerRequest.HttpServerRequest,
  ) => Effect.Effect<AuthSubject, SubjectExtractionFailed>;
}

export class SubjectExtractor extends Context.Service<SubjectExtractor, SubjectExtractorShape>()(
  "qadi/http/SubjectExtractor",
) {
  static readonly extract = (request: HttpServerRequest.HttpServerRequest) =>
    SubjectExtractor.use((s) => s.extract(request));
}

const BEARER_PREFIX = "bearer ";

/**
 * Resolves a Bearer token via `lookup`, falling back to Qadi's own
 * `anonymous` subject when no `Authorization` header is present or it isn't
 * a Bearer scheme. An unauthenticated request holds no roles or permissions,
 * the same fail-closed default `CurrentSubjectAnonymous` already establishes
 * for a graph missing its real subject layer.
 *
 * `lookup` **may fail** with {@link SubjectExtractionFailed}, and a store
 * backing a real deployment should: a token service that is down is an outage,
 * not an anonymous visitor.
 *
 * The scheme is matched **case-insensitively**, per RFC 7235 §2.1, which makes
 * `auth-scheme` a case-insensitive token. It was compared with `startsWith`
 * against `"Bearer "`, so `bearer abc` — legal, and emitted by real clients —
 * had its credential silently discarded and was served as anonymous.
 *
 * A present-but-non-Bearer credential (`Basic …`) is still treated as absent
 * rather than as a failure. That is deliberate but incomplete: the right answer
 * is `401` with a `WWW-Authenticate` challenge, and `AccessDenied` carries no
 * authentication state for `toResponse` to distinguish, so this package cannot
 * yet express one. Recorded rather than silently accepted.
 */
export const subjectExtractorBearer = (
  lookup: (token: string) => Effect.Effect<AuthSubject, SubjectExtractionFailed>,
): Layer.Layer<SubjectExtractor> =>
  Layer.succeed(SubjectExtractor, {
    extract: (request) =>
      Headers.get(request.headers, "authorization").pipe(
        Option.filter((header) => header.toLowerCase().startsWith(BEARER_PREFIX)),
        Option.match({
          onNone: () => Effect.succeed(anonymous),
          onSome: (header) => lookup(header.slice(BEARER_PREFIX.length)),
        }),
      ),
  });
