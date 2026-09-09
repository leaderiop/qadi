/**
 * The forwarding sink, and the non-2xx it must not treat as delivered.
 *
 * `decisionSinkForwarding`'s contract — a `send` that fails or dies cannot
 * change the decision, and a failure is reported — is proven in `@qadi/core`
 * against a `send` the test controls directly. What that suite cannot prove
 * is whether *this app's* `send` can tell a real delivery from a request that
 * merely returned: `fetch` only rejects on a network error, so a `send` built
 * on a raw `Effect.tryPromise(() => fetch(...))` treats an aggregator's 500
 * exactly like its 204. No page or `Request` scope is exercised here — same
 * reasoning as `hydration.test.ts`.
 *
 * `FetchHttpClient.Fetch` is provided per test rather than reassigning
 * `globalThis.fetch`: it is a `Context.Reference`, and its default value is
 * memoized on first read — the module-level fetch client reads it lazily, but
 * only ever resolves the default once for the life of the process, so a
 * second `globalThis.fetch = ...` after that first read would silently keep
 * serving the first mock.
 */
import { describe, expect, it, vi } from "vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import {
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  decide,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  SignatureHistoryNone,
  relationshipResolverFromEdges,
} from "@qadi/core";
import { forwardingSink } from "../src/server/forwarding.ts";
import { canReadArticle } from "../src/domain/policies.ts";
import { articles } from "../src/domain/articles.ts";
import { policyResource } from "../src/domain/resource.ts";
import { users } from "../src/domain/subjects.ts";

const yasmine = users.find((user) => user.id === "yasmine")?.subject;
if (yasmine === undefined) throw new Error("no demo user named yasmine");

const published = articles.find((article) => article.status === "published");
if (published === undefined) throw new Error("no published fixture article");
const resource = policyResource(published, 0);

/** The server's layer, minus the sink under test — mirrors `hydration.test.ts`. */
const ports = Layer.mergeAll(
  AttributeResolverNone,
  relationshipResolverFromEdges(
    articles.map((article) => ({
      subjectId: article.authorId,
      relation: "author-of",
      resourceId: article.id,
    })),
  ),
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

const decideAndForward = (fetchStub: typeof fetch, onFailure: (error: unknown) => void) =>
  Effect.runPromise(
    decide(canReadArticle, { resource }).pipe(
      Effect.provide(
        Layer.mergeAll(
          ports,
          forwardingSink({ origin: "http://aggregator.test", onFailure }),
          currentSubjectLayer(yasmine),
          Layer.succeed(FetchHttpClient.Fetch, fetchStub),
        ),
      ),
    ),
  );

describe("the aggregator ingest forward", () => {
  it("reports a failure when the aggregator answers with a non-2xx status", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(JSON.stringify({ error: "db down" }), { status: 500 })
    ) as unknown as typeof fetch;

    const failures: Array<string> = [];
    await decideAndForward(fetchStub, (error) => {
      failures.push(String(error));
    });

    // The bug this closes: a raw `fetch` wrapped in `Effect.tryPromise` only
    // rejects on a network error, so a 500 here used to leave `failures`
    // empty — indistinguishable from a successful delivery.
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/500/);
  });

  it("reports nothing when the aggregator answers 2xx", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(null, { status: 204 })
    ) as unknown as typeof fetch;

    const failures: Array<string> = [];
    await decideAndForward(fetchStub, (error) => {
      failures.push(String(error));
    });

    expect(failures).toHaveLength(0);
  });
});
