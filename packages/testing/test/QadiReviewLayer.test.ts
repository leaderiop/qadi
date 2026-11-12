/**
 * The review layer does not shadow the decision sink or the decision cache, and
 * mints its ids and keeps its clock as it always has.
 *
 * A test that wraps the review layer in a recording sink or a cache must see
 * every record and every lookup, because a layer that silently swallowed them
 * would let an audit assertion pass vacuously. These cases were written before
 * the layer was rebuilt on a shared builder and are kept unchanged through it.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  DecisionCache,
  currentSubjectLayer,
  decisionCacheLayer,
  evaluate,
  makeDecisionLog,
} from "@qadi/core";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { administrator, policies, qadiReviewLayer } from "../src/index.ts";

describe("qadiReviewLayer", () => {
  it.effect("an outer sink receives every record an evaluation under it makes", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      const review = Layer.mergeAll(currentSubjectLayer(administrator), qadiReviewLayer());

      const underReview = Effect.gen(function* () {
        yield* evaluate(policies.canRead);
        yield* evaluate(policies.canRead);
      }).pipe(Effect.provide(review));
      yield* underReview.pipe(Effect.provide(log.layer));

      assert.strictEqual((yield* log.snapshot).length, 2);
    }));

  it.effect("an outer decision cache is the one an evaluation under it fills and answers from", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      const review = Layer.mergeAll(currentSubjectLayer(administrator), qadiReviewLayer());

      const underReview = Effect.gen(function* () {
        const cache = yield* DecisionCache;
        assert.strictEqual(yield* cache.size, 0);

        yield* evaluate(policies.canRead);
        yield* evaluate(policies.canRead);

        assert.strictEqual(yield* cache.size, 1);
      }).pipe(Effect.provide(review));
      yield* underReview.pipe(Effect.provide(Layer.merge(log.layer, decisionCacheLayer())));

      const answers = (yield* log.snapshot).map((record) =>
        record._tag === "Decision" ? record.cache : undefined,
      );
      assert.deepStrictEqual(answers, ["miss", "hit"]);
    }));

  it.effect("mints eval-1, eval-2 by default, and idPrefix replaces the prefix", () =>
    Effect.gen(function* () {
      const byDefault = Layer.mergeAll(currentSubjectLayer(administrator), qadiReviewLayer());
      const ids = yield* Effect.gen(function* () {
        const first = yield* evaluate(policies.canRead);
        const second = yield* evaluate(policies.canRead);
        return [first.evaluationId, second.evaluationId];
      }).pipe(Effect.provide(byDefault));
      assert.deepStrictEqual(ids, ["eval-1", "eval-2"]);

      const prefixed = Layer.mergeAll(
        currentSubjectLayer(administrator),
        qadiReviewLayer({ idPrefix: "review" }),
      );
      const first = yield* evaluate(policies.canRead).pipe(Effect.provide(prefixed));
      assert.strictEqual(first.evaluationId, "review-1");
    }));

  // `it.live` buys nothing here: a built `Layer.empty` context has no `Clock` entry, so the real
  // default answers whichever clock the test fiber runs under.
  it.live("leaves the runtime's own clock alone by default", () =>
    Effect.gen(function* () {
      const context = yield* Layer.build(qadiReviewLayer());

      assert.isAbove(Context.get(context, Clock.Clock).currentTimeMillisUnsafe(), 0);
    }).pipe(Effect.scoped));
});
