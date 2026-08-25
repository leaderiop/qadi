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
 * Module scope, and deliberately so: this is one process's observability, and
 * building it per request would give every page an empty log. The consequence is
 * that the ring and the counters are **process-wide** — every user's decisions,
 * every request's — which is what the dock's hydration panel already says of
 * itself and what `/edge/double-count` exists to make concrete.
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
import { ports } from "./ports.ts";

/** Where this process's decisions are, for a reader arriving after the fact. */
export const ring = decisionSinkRing({ environment: "Server", capacity: 500 });

/**
 * Where this process's decisions go, for a reader watching.
 *
 * `replay: 32` so a devtools page opened mid-session sees the last few rather
 * than an empty table until the next click. `runSync` is safe here because
 * `decisionSinkFeed` only allocates — it performs no I/O and cannot suspend.
 */
export const feed = Effect.runSync(decisionSinkFeed({ capacity: 256, replay: 32 }));

/**
 * The tracer that records what each port was asked.
 *
 * Wraps whatever tracer is already in scope rather than replacing it
 * ([ADR-QD-051](../../../../spec/decisions/051-what-the-ports-were-asked.md)),
 * so an application already exporting spans keeps exporting them.
 */
export const portCalls = collectPortCalls({ capacity: 200 });

/** What `evaluate` needs, minus the subject — which travels per request. */
export const AppLayer = Layer.mergeAll(
  ports,
  EvaluationIdLive,
  decisionCacheLayer({ capacity: 512 }),
  decisionSinkAll([ring.layer, feed.layer]),
  portCalls.layer,
);
