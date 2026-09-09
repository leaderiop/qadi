/**
 * The forwarding sink this app hands to `decisionSinkForwarding`.
 *
 * Pulled out of the edge route so it can be exercised without a `Request`
 * scope — the same reason `decide.ts` exists apart from a page.
 *
 * `send` must turn a non-2xx response into a real failure. A raw
 * `fetch(...)` wrapped in `Effect.tryPromise` does not: `fetch` only rejects
 * on a network failure, so an aggregator answering 500 looks identical to one
 * that answered 204. `HttpClient.filterStatusOk` is what closes that gap — it
 * turns a non-2xx response into a typed `HttpClientError`, which flows
 * straight into `send`'s `(encoded: unknown) => Effect.Effect<void, unknown>`
 * without any change to that seam (ADR-QD-064: `@qadi/core` stays
 * transport-agnostic).
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import { decisionSinkForwarding, DecisionSink } from "@qadi/core";

/** Where the aggregator's ingest endpoint lives, relative to nothing else. */
const INGEST_PATH = "/api/aggregator/ingest";

/**
 * A `DecisionSink` that POSTs each encoded record to this app's own
 * `/api/aggregator/ingest` route.
 *
 * `origin` rather than a relative path: this runs inside a route handler,
 * which has no base URL of its own to resolve one against.
 */
export const forwardingSink = (options: {
  readonly origin: string;
  /** Called when a record could not be delivered, or was rejected. */
  readonly onFailure?: (error: unknown) => void;
}): Layer.Layer<DecisionSink> =>
  decisionSinkForwarding({
    send: (encoded) =>
      Effect.gen(function* () {
        const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
        const request = yield* HttpClientRequest.bodyJson(
          HttpClientRequest.post(`${options.origin}${INGEST_PATH}`),
          encoded,
        );
        yield* client.execute(request);
      }).pipe(Effect.provide(FetchHttpClient.layer), Effect.asVoid),
    ...(options.onFailure === undefined ? {} : { onFailure: options.onFailure }),
  });
