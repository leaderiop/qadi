/**
 * Topology 5 — a decision taken in a process that is about to end.
 *
 * A serverless invocation cannot keep a ring: the process goes away and takes
 * the records with it, and nothing fires on the way out that could flush them.
 * So the sink **forwards** — `decisionSinkForwarding` hands each record to a
 * `send` the moment it is made, and the invocation does not return until that
 * has happened.
 *
 * Three properties of that sink are load-bearing and all three are tested in
 * `@qadi/core` rather than assumed here
 * ([BEH-QD-187](../../../../../spec/behaviors/24-decision-sink.md)):
 *
 * - a `send` that **fails or dies MUST NOT change the decision**. An aggregator
 *   being down is an observability outage, and an observability outage that
 *   turned into a denial would be the worst possible trade.
 * - `send` **must not block**, so the request is not held open by a slow reader.
 * - the failure is **reported**, because a forwarder silently dropping every
 *   record while looking healthy is the defect, not the drop.
 *
 * `runtime = "nodejs"` rather than `"edge"`, and that is a deliberate limitation
 * said out loud: the Edge runtime has no `process`, and `@qadi/core`'s metric
 * and clock plumbing has not been audited against it. The *topology* being
 * demonstrated is one-process-per-invocation, which this route reproduces by
 * building its layer per request; the runtime it happens to run on is not the
 * point. A real edge deployment should verify the bundle before assuming it.
 */
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import {
  currentSubjectLayer,
  decide,
  Decided,
  decisionSinkForwarding,
  EvaluationIdLive,
  isAllowed,
  toWire,
} from "@qadi/core";
import { canReadArticle } from "../../../../src/domain/policies.ts";
import { articleById } from "../../../../src/domain/articles.ts";
import { policyResource } from "../../../../src/domain/resource.ts";
import { ports } from "../../../../src/server/ports.ts";
import { userFromCookieHeader } from "../../../../src/server/session.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const article = articleById(url.searchParams.get("article") ?? "");
  if (article === undefined) {
    return Response.json({ error: "no such article" }, { status: 404 });
  }

  const user = userFromCookieHeader(request.headers.get("cookie"));
  const origin = url.origin;
  const failures: Array<string> = [];

  // Built here, per invocation, which is the whole shape being demonstrated.
  const forwarding = decisionSinkForwarding({
    send: (encoded) =>
      Effect.tryPromise(() =>
        fetch(`${origin}/api/aggregator/ingest`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(encoded),
        })
      ),
    onFailure: (error) => {
      failures.push(String(error));
    },
  });

  const layer = Layer.mergeAll(
    ports,
    EvaluationIdLive,
    forwarding,
    currentSubjectLayer(user.subject),
  );

  const outcome = await Effect.runPromise(
    Effect.gen(function* () {
      // The clock is the evaluator's. `Date.now()` here would be the one place
      // in this app where an evaluation could not be reproduced.
      const now = yield* Clock.currentTimeMillis;
      return yield* decide(canReadArticle, { resource: policyResource(article, now) });
    }).pipe(Effect.provide(layer), Effect.result),
  );

  // A decision, or the reason there wasn't one. Never a boolean, which would
  // conflate "denied" with "could not be decided".
  if (Result.isFailure(outcome)) {
    return Response.json({
      article: article.id,
      subject: user.subject.id,
      verdict: "Error",
      error: outcome.failure._tag,
      forwardFailures: failures,
    }, { status: 503 });
  }

  const decision = outcome.success;
  return Response.json({
    article: article.id,
    subject: user.subject.id,
    verdict: isAllowed(decision) ? "Allow" : "Deny",
    // Forwarded before this returned, which is the property the topology needs.
    forwardFailures: failures,
    wire: toWire({
      _tag: "Decision",
      evaluationId: decision.evaluationId,
      at: decision.durationMillis,
      policy: canReadArticle,
      outcome: new Decided({ decision }),
    }),
  });
};
