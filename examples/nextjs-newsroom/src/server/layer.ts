import "server-only";
/**
 * Everything the server's evaluations run in, and everything the dock reads.
 *
 * The sink is `decisionSinkAll([ring, feed])` rather than two merged layers, and
 * that is not a style choice: merging two `Layer`s for one service makes the
 * later simply win and the first silently see nothing
 * ([BEH-QD-187](../../../../spec/behaviors/24-decision-sink.md)). Both are
 * wanted — the ring answers `/api/backlog` for the past, the feed answers
 * `/__decisions` for what happens next.
 *
 * Pinned to `globalThis` rather than to module scope, and that is not belt and
 * braces. A Route Handler and a Server Component are **different module graphs**
 * in Next 16: two pages share a module-scope value and `app/api/…/route.ts` does
 * not, so a ring declared here plainly would become two — the pages filling one
 * and `/__decisions` streaming the other. See `processGlobal.ts`.
 *
 * One per process, and deliberately so: building it per request would give every
 * page an empty log. The consequence is that the ring and the counters are
 * **process-wide** — every user's decisions, every request's — which is what the
 * dock's hydration panel already says of itself and what `/edge/double-count`
 * exists to make concrete.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  decisionCacheLayer,
  decisionSinkAll,
  decisionSinkFeed,
  decisionSinkRing,
  EvaluationIdLive,
} from "@qadi/core";
import { collectPortCalls } from "@qadi/devtools";
import { feedOnce, portCallsOnce, ringOnce } from "./processGlobal.ts";
import { ports } from "./ports.ts";

/** Where this process's decisions are, for a reader arriving after the fact. */
export const ring = ringOnce(() => decisionSinkRing({ environment: "Server", capacity: 500 }));

/**
 * Where this process's decisions go, for a reader watching.
 *
 * `replay: 32` so a devtools page opened mid-session sees the last few rather
 * than an empty table until the next click. `runSync` is safe here because
 * `decisionSinkFeed` only allocates — it performs no I/O and cannot suspend.
 */
export const feed = feedOnce(() => Effect.runSync(decisionSinkFeed({ capacity: 256, replay: 32 })));

/**
 * The tracer that records what each port was asked.
 *
 * Wraps whatever tracer is already in scope rather than replacing it
 * ([ADR-QD-051](../../../../spec/decisions/051-what-the-ports-were-asked.md)),
 * so an application already exporting spans keeps exporting them.
 */
export const portCalls = portCallsOnce(() => collectPortCalls({ capacity: 200 }));

/** What `evaluate` needs, minus the subject — which travels per request. */
export const AppLayer = Layer.mergeAll(
  ports,
  EvaluationIdLive,
  decisionCacheLayer({ capacity: 512 }),
  decisionSinkAll([ring.layer, feed.layer]),
  portCalls.layer,
);
