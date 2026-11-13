/**
 * The evaluation environment states its shadowing, and each choice does what it says.
 *
 * `none` leaves an outer sink and an outer cache in effect, `sinkAndCache` puts a
 * discarding sink and a private cache in front of them. A seal only the simulator's
 * own tests observed was a seal one refactor away from gone, so the builder proves
 * both arms directly. The installed sink is called directly rather than through
 * `evaluate`, because `evaluate` swallows a sink's failure and a broken discarding
 * sink would otherwise be invisible.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as TestClock from "effect/testing/TestClock";
import { attributeResolverFromRecord } from "../src/AttributeResolver.ts";
import { currentSubjectLayer } from "../src/CurrentSubject.ts";
import { DecisionCache, decisionCacheLayer } from "../src/DecisionCache.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { makeDecisionLog } from "../src/DecisionLog.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { evaluate } from "../src/Evaluate.ts";
import { evaluationEnvironment } from "../src/EvaluationEnvironment.ts";
import type { EvaluationShadowing } from "../src/EvaluationEnvironment.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { portsLayer } from "../src/Ports.ts";
import { subjectWith } from "./helpers.ts";

const admin = subjectWith({ roles: ["admin"] });
const allowing = P.hasRole("admin");

/** An environment for `admin` under `shadow`, minting `x-N` ids on the runtime's own clock. */
const environmentOf = (shadow: EvaluationShadowing) =>
  Layer.merge(
    currentSubjectLayer(admin),
    evaluationEnvironment({ ports: portsLayer(), idPrefix: "x", clock: Layer.empty, shadow }),
  );

describe("evaluationEnvironment", () => {
  it.effect("none leaves an outer sink and an outer cache in effect", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      const outcome = yield* Effect.gen(function* () {
        const outerCache = yield* DecisionCache;
        const both = yield* Effect.gen(function* () {
          const first = yield* evaluate(allowing);
          const second = yield* evaluate(allowing);
          return [first, second];
        }).pipe(Effect.provide(environmentOf("none")));
        return { both, outerCacheSize: yield* outerCache.size };
      }).pipe(Effect.provide(Layer.merge(log.layer, decisionCacheLayer())));

      const records = yield* log.snapshot;
      assert.deepStrictEqual(
        records.map((record) => (record._tag === "Decision" ? record.cache : undefined)),
        ["miss", "hit"],
      );
      assert.strictEqual(outcome.outerCacheSize, 1);
    }));

  it.effect("sinkAndCache shadows the sink and the cache and still decides", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      const outcome = yield* Effect.gen(function* () {
        const outerCache = yield* DecisionCache;
        const both = yield* Effect.gen(function* () {
          const first = yield* evaluate(allowing);
          const second = yield* evaluate(allowing);
          return [first, second];
        }).pipe(Effect.provide(environmentOf("sinkAndCache")));
        return { both, outerCacheSize: yield* outerCache.size };
      }).pipe(Effect.provide(Layer.merge(log.layer, decisionCacheLayer())));

      assert.deepStrictEqual(
        outcome.both.map((decision) => decision._tag),
        ["Allow", "Allow"],
      );
      assert.deepStrictEqual(yield* log.snapshot, []);
      assert.strictEqual(outcome.outerCacheSize, 0);
    }));

  it.effect("the sink sinkAndCache installs discards what it is handed", () =>
    Effect.gen(function* () {
      const captured = yield* Ref.make<ReadonlyArray<SinkRecord>>([]);
      const capturing = Layer.succeed(DecisionSink, {
        record: (record) => Ref.update(captured, (records) => [...records, record]),
      });

      const underNone = evaluate(allowing).pipe(Effect.provide(environmentOf("none")));
      yield* underNone.pipe(Effect.provide(capturing));
      const [real] = yield* Ref.get(captured);
      assert.isDefined(real);
      if (real === undefined) return;
      const before = (yield* Ref.get(captured)).length;

      const record = Effect.gen(function* () {
        const sink = yield* DecisionSink;
        return yield* sink.record(real);
      }).pipe(Effect.provide(environmentOf("sinkAndCache")));
      const handed = yield* record.pipe(Effect.provide(capturing));

      assert.isUndefined(handed);
      assert.strictEqual((yield* Ref.get(captured)).length, before);
    }));

  it.effect("every build gets a private cache of its own", () =>
    Effect.gen(function* () {
      const shared = environmentOf("sinkAndCache");
      const sizeAfter = (policy: P.Policy) =>
        Effect.gen(function* () {
          yield* evaluate(policy);
          const cache = yield* DecisionCache;
          return yield* cache.size;
        }).pipe(Effect.provide(shared));

      yield* Effect.gen(function* () {
        const outerCache = yield* DecisionCache;
        const first = yield* sizeAfter(P.hasRole("admin"));
        const second = yield* sizeAfter(P.hasRole("auditor"));

        assert.deepStrictEqual([first, second], [1, 1]);
        assert.strictEqual(yield* outerCache.size, 0);
      }).pipe(Effect.provide(decisionCacheLayer()));
    }));

  it.effect("mints sequential ids from idPrefix, starting again on every build", () =>
    Effect.gen(function* () {
      const shared = environmentOf("none");
      const idsOf = Effect.gen(function* () {
        const first = yield* evaluate(allowing);
        const second = yield* evaluate(allowing);
        return [first.evaluationId, second.evaluationId];
      }).pipe(Effect.provide(shared));

      assert.deepStrictEqual(yield* idsOf, ["x-1", "x-2"]);
      assert.deepStrictEqual(yield* idsOf, ["x-1", "x-2"]);
    }));

  // `it.live` buys nothing for the `Context.get` reads: a built `Layer.empty` context has no `Clock`
  // entry, so the real default answers whichever clock the test fiber runs under. Those reads are
  // the layer's own contribution and carry the proof of determinism.
  it.live("the clock layer decides which clock an evaluation reads", () =>
    Effect.gen(function* () {
      const environment = (clock: Layer.Layer<never>) =>
        evaluationEnvironment({ ports: portsLayer(), idPrefix: "x", clock, shadow: "none" });

      const live = yield* Layer.build(environment(Layer.empty));
      assert.isAbove(Context.get(live, Clock.Clock).currentTimeMillisUnsafe(), 0);

      const deterministic = yield* Layer.build(environment(TestClock.layer()));
      assert.strictEqual(Context.get(deterministic, Clock.Clock).currentTimeMillisUnsafe(), 0);

      const decision = yield* evaluate(allowing).pipe(
        Effect.provide(
          Layer.merge(currentSubjectLayer(admin), environment(TestClock.layer())),
        ),
      );
      // A consequence of the clock asserted above, not a proof: a trivial in-memory evaluation also
      // measures 0 ms under a live clock, so this does not discriminate on its own.
      assert.strictEqual(decision.durationMillis, 0);
    }).pipe(Effect.scoped));

  it.effect("ports arrive built, and an unfed port fails closed", () =>
    Effect.gen(function* () {
      const policy = P.hasAttribute("seniority", M.gte(3));
      const under = (ports: ReturnType<typeof portsLayer>) =>
        evaluate(policy).pipe(
          Effect.provide(
            Layer.merge(
              currentSubjectLayer(admin),
              evaluationEnvironment({ ports, idPrefix: "x", clock: Layer.empty, shadow: "none" }),
            ),
          ),
        );

      assert.strictEqual((yield* under(portsLayer()))._tag, "Deny");
      const fed = portsLayer({ AttributeResolver: attributeResolverFromRecord({ seniority: 5 }) });
      assert.strictEqual((yield* under(fed))._tag, "Allow");
    }));
});
