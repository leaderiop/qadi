import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import type * as Tracer from "effect/Tracer";
import * as TestClock from "effect/testing/TestClock";
import { AttributeResolver, attributeResolverPort } from "../src/AttributeResolver.ts";
import { currentSubjectLayer } from "../src/CurrentSubject.ts";
import { DecisionCache, decisionCacheLayer } from "../src/DecisionCache.ts";
import { createGuardHealthCheck } from "../src/GuardHealthCheck.ts";
import * as M from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import type { SinkRecord } from "../src/DecisionRecord.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { portsLayer } from "../src/Ports.ts";
import { collectingTracer, isolatedMetrics, subjectWith, testLayer } from "./helpers.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import { PortReply } from "../src/PortDescription.ts";

const canRead = P.hasPermission(permission("doc", "read"));

describe("createGuardHealthCheck", () => {
  it.effect("healthy when the canary policy evaluates cleanly, allow or deny alike", () =>
    Effect.gen(function* () {
      const result = yield* createGuardHealthCheck(canRead);
      assert.isTrue(result.healthy);
      assert.deepStrictEqual(result.errors, []);
      assert.isNumber(result.checkedAt);
      assert.isAtLeast(result.latencyMillis, 0);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("checkedAt is the simulated clock's time, not wall-clock time", () =>
    Effect.gen(function* () {
      // Mirrors DecisionSink.test.ts's "`at` is the clock's start time" test:
      // `checkedAt`'s doc comment says it comes from `Clock` specifically for
      // TestClock reproducibility, and `assert.isNumber` alone would pass
      // identically whether the field came from `Clock` or `Date.now()`.
      yield* TestClock.adjust("5 seconds");
      const result = yield* createGuardHealthCheck(canRead);
      assert.strictEqual(result.checkedAt, 5000);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("unhealthy when the probed evaluation fails with a typed EvaluationError", () =>
    Effect.gen(function* () {
      // A resource-scoped policy with no resource supplied fails with
      // MissingResource — a wiring problem, not a clean deny.
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const result = yield* createGuardHealthCheck(policy);
      assert.isFalse(result.healthy);
      assert.deepStrictEqual(result.errors, ["MissingResource"]);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("options.resource reaches the probed evaluation, same as a real call", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const result = yield* createGuardHealthCheck(policy, { resource: { state: "open" } });
      assert.isTrue(result.healthy);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect(
    "a resolver that dies outright is reported unhealthy, not left to crash the probe",
    () => {
      // Corrected alongside issue #100 (BEH-QD-261): this pinned the opposite
      // claim before — that a dying resolver was *not* caught here and
      // crashed the probe as a defect. `Evaluate.ts`'s five port calls now
      // convert a defect into that port's own typed `EvaluationError` before
      // it ever reaches this function, so a probe against a broken port now
      // reports `healthy: false` exactly as it does for a port that fails
      // cleanly — an operator polling this learns the resolver is broken
      // instead of the health check itself dying.
      const dying: Layer.Layer<AttributeResolver> = scriptedPort(attributeResolverPort, () => PortReply.die(new Error("resolver exploded"))).layer;
      const policy = P.hasAttribute("plan", M.eq(M.literal("pro")));

      return Effect.gen(function* () {
        const result = yield* createGuardHealthCheck(policy);

        assert.isFalse(result.healthy);
        assert.deepStrictEqual(result.errors, ["AttributeResolveError"]);
      }).pipe(Effect.provide(testLayer(subjectWith({}), { AttributeResolver: dying })));
    },
  );
  describe("with a decision cache wired", () => {
    // `getOrCompute` serves a completed success forever (ADR-QD-031 rejects a
    // TTL), so a probe that went through `decide` was a constant after the
    // first call. The probe now walks the policy and never consults the cache.
    const flakyPort = () => {
      let n = 0;
      return scriptedPort(attributeResolverPort, () =>
        n++ === 0 ? PortReply.answer("pro") : PortReply.fail("down"),
      );
    };
    const policy = P.hasAttribute("plan", M.eq(M.literal("pro")));

    it.effect("a probe after the store goes down reports unhealthy, not a cached allow", () => {
      const flaky = flakyPort();
      return Effect.gen(function* () {
        const first = yield* createGuardHealthCheck(policy);
        const second = yield* createGuardHealthCheck(policy);
        assert.isTrue(first.healthy);
        assert.isFalse(second.healthy);
        assert.deepStrictEqual(second.errors, ["AttributeResolveError"]);
        assert.strictEqual(flaky.calls.length, 2);
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            testLayer(subjectWith({}), { AttributeResolver: flaky.layer }),
            decisionCacheLayer(),
          ),
        ),
      );
    });

    it.effect("control: without a cache the second probe is unhealthy", () => {
      const flaky = flakyPort();
      return Effect.gen(function* () {
        yield* createGuardHealthCheck(policy);
        const second = yield* createGuardHealthCheck(policy);
        assert.isFalse(second.healthy);
        assert.strictEqual(flaky.calls.length, 2);
      }).pipe(
        Effect.provide(testLayer(subjectWith({}), { AttributeResolver: flaky.layer })),
      );
    });

    it.effect("a probe records nothing and fills no cache entry", () => {
      const records: Array<SinkRecord> = [];
      const sink = Layer.succeed(DecisionSink, {
        record: (record) => Effect.sync(() => void records.push(record)),
      });
      return Effect.gen(function* () {
        yield* createGuardHealthCheck(canRead);
        yield* createGuardHealthCheck(P.not(canRead));
        assert.strictEqual(records.length, 0);
        assert.strictEqual(yield* DecisionCache.use((c) => c.size), 0);
      }).pipe(
        Effect.provide(Layer.mergeAll(testLayer(subjectWith({})), decisionCacheLayer(), sink)),
      );
    });

    it.effect("a probe counts no decisions", () =>
      isolatedMetrics(
        Effect.gen(function* () {
          yield* createGuardHealthCheck(canRead);
          yield* createGuardHealthCheck(canRead);
          const snapshots = yield* Metric.snapshot;
          assert.isUndefined(snapshots.find((m) => m.id === "qadi_decisions_total"));
        }),
      ).pipe(Effect.provide(testLayer(subjectWith({})))));
  });

  it.effect("a probe needs no evaluation id", () =>
    Effect.gen(function* () {
      // No `evaluationIdSequential()`: the requirement is `CurrentSubject | PortServices`.
      const result = yield* createGuardHealthCheck(canRead);
      assert.isTrue(result.healthy);
    }).pipe(Effect.provide(Layer.mergeAll(currentSubjectLayer(subjectWith({})), portsLayer()))));

  it.effect("the probe span says whether it was healthy", () => {
    const spans: Array<Tracer.Span> = [];
    const down = scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer;
    return Effect.gen(function* () {
      yield* createGuardHealthCheck(P.hasAttribute("plan", M.eq(M.literal("pro"))));
      const probe = spans.find((s) => s.name === "qadi.guardHealthCheck");
      assert.strictEqual(probe?.attributes.get("qadi.healthy"), false);
      assert.strictEqual(probe?.attributes.get("qadi.error_tag"), "AttributeResolveError");
      assert.isUndefined(spans.find((s) => s.name === "qadi.evaluate"));
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          testLayer(subjectWith({}), { AttributeResolver: down }),
          collectingTracer(spans),
        ),
      ),
    );
  });
});
