/**
 * Effect, served by Next.
 *
 * This is the whole adapter. `HttpRouter.toWebHandler` hands back a function
 * from a Web `Request` to a Web `Response`, and a Next Route Handler is exactly
 * a function from a Web `Request` to a Web `Response` — so there is nothing
 * between them to get wrong. Everything the API does lives in `src/server/api.ts`
 * as ordinary Effect that would run unchanged behind `HttpServer.serve`.
 *
 * Two declarations are load-bearing:
 *
 * - `runtime = "nodejs"`, because `/__decisions` streams and the router builds
 *   its layer once per process. The edge runtime would give each invocation its
 *   own, which is topology 5 and is served separately under `/api/edge`.
 * - `dynamic = "force-dynamic"`, because every response here depends on a cookie
 *   and an SSE stream that Next must not try to collect and cache. Without it a
 *   build-time prerender attempt is the first thing that goes wrong.
 *
 * `dispose` is deliberately never called. The handler's layer lives as long as
 * the process, like the runtime in `src/server/runtime.ts` and for the same
 * reason: disposing it per request would rebuild the decision cache, the
 * registry and the sinks on every call.
 */
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import { ApiLayer } from "../../../src/server/api.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { handler } = HttpRouter.toWebHandler(ApiLayer);

/**
 * Strips the `/api` Next mounts this under.
 *
 * The router inside knows nothing about the prefix — `decisionStreamRoute`
 * mounts `/__decisions` at a fixed path — and a router that had to know where it
 * was mounted could not be lifted out and served directly. So the adapter
 * adapts, which is its job.
 */
const unprefixed = (request: Request): Request => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api")) return request;
  url.pathname = url.pathname.slice("/api".length) || "/";
  return new Request(url, request);
};

const serve = (request: Request): Promise<Response> => handler(unprefixed(request));

export {
  serve as DELETE,
  serve as GET,
  serve as PATCH,
  serve as POST,
  serve as PUT,
};
