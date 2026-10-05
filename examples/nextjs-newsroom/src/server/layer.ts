import "server-only";
/**
 * Everything the server's evaluations run in, and everything the dock reads.
 *
 * **One decision log is the sink, the backlog and the feed.** Evaluations record
 * into `log.layer`; `/__decisions` serves the log — what it already holds, then
 * what it decides next — and `/__decisions/backlog` serves the past as JSON.
 * The environment is stated once, here: every record the dock receives from
 * this process arrives labelled `Server` because this line says so, not because
 * the dock does.
 *
 * Pinned to `globalThis` rather than to module scope, and that is not belt and
 * braces. A Route Handler and a Server Component are **different module graphs**
 * in Next 16: two pages share a module-scope value and `app/api/…/route.ts` does
 * not, so a log declared here plainly would become two — the pages filling one
 * and `/__decisions` streaming the other. See `processGlobal.ts`.
 *
 * One per process, and deliberately so: building it per request would give every
 * page an empty log. The consequence is that the log and the counters are
 * **process-wide** — every user's decisions, every request's — which is what the
 * dock's hydration panel already says of itself and what `/edge/double-count`
 * exists to make concrete.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { decisionCacheLayer, EvaluationIdLive, makeDecisionLog } from "@qadi/core";
import { collectPortCalls } from "@qadi/devtools";
import { logOnce, portCallsOnce } from "./processGlobal.ts";
import { ports } from "./ports.ts";

/**
 * This process's decisions: where they go, and where a reader finds them.
 *
 * A dock opened mid-session receives every retained record before the live
 * ones, not a replay window's worth. `runSync` is safe here because
 * `makeDecisionLog` only reads the clock and allocates — it performs no I/O and
 * cannot suspend.
 */
export const log = logOnce(() => Effect.runSync(makeDecisionLog({ environment: "Server", capacity: 500 })));

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
  log.layer,
  portCalls.layer,
);
