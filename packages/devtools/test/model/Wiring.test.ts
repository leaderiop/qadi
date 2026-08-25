/**
 * JOB 4 ledger — E4.1 … E4.11 (the model half).
 *
 * The wording rule is the point of this module. Five of the seven services are
 * in `EvaluationServices`, so a program that has not provided them does not
 * run — "unwired" is a category error for those, and what a reader can
 * truthfully be told is that one is *defaulted to a fail-closed
 * implementation*. Only `DecisionCache` and `DecisionSink` are genuinely
 * optional.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Schedule from "effect/Schedule";
import {
  AttributeResolver,
  attributeResolverRetrying,
  currentSubjectLayer,
  decisionCacheLayer,
  decisionSinkRing,
  evaluate,
  gte,
  hasAttribute,
  hasPermission,
  permission,
  portCallsTotal,
  portRetriesTotal,
} from "@qadi/core";
import { qadiTestLayer, subjectWith } from "@qadi/testing";
import { portActivity, wiringReport } from "../../src/model/Wiring.ts";

const read = permission("doc", "read");

describe("wiringReport", () => {
  // E4.6 — a panel that could only run inside a fully-wired program would be
  // unavailable exactly when a wiring question arises.
  it.effect("runs with no layer at all and reports what it found", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;

      assert.strictEqual(report.ports.length, 7);
      assert.isTrue(report.ports.every((port) => !port.present));
      assert.isFalse(report.cache.present);
      assert.isUndefined(report.cache.size);
    }));

  // E4.3 — the wording that keeps five of seven honest.
  it.effect("names the five required services as required", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const required = report.ports.filter((port) => port.required).map((port) => port.port);

      assert.deepStrictEqual(required, [
        "AttributeResolver",
        "RelationshipResolver",
        "DecisionHistory",
        "EvaluationId",
        "CurrentSubject",
      ]);
    }));

  it.effect("names the two optional ones as optional", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const optional = report.ports.filter((port) => !port.required).map((port) => port.port);

      assert.deepStrictEqual(optional, ["DecisionCache", "DecisionSink"]);
    }));

  it.effect("every port carries the consequence of being defaulted or absent", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      assert.isTrue(report.ports.every((port) => port.consequence.length > 0));

      const history = report.ports.find((port) => port.port === "DecisionHistory");
      // ADR-QD-020's three-valued default, stated where a reader will look.
      assert.include(history?.consequence ?? "", "denies hasActed and hasNotActed alike");
    }));

  // E4.1
  it.effect("reports a named implementation by its name", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const attribute = report.ports.find((port) => port.port === "AttributeResolver");

      assert.isTrue(attribute?.present);
      assert.isDefined(attribute?.name);
    }).pipe(Effect.provide(qadiTestLayer(subjectWith({})))));

  // E4.2 — "unnamed" is a different fact from "unwired".
  it.effect("an unnamed implementation is present with no name", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const attribute = report.ports.find((port) => port.port === "AttributeResolver");

      assert.isTrue(attribute?.present);
      assert.isUndefined(attribute?.name);
    }).pipe(
      Effect.provide(
        Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(undefined) }),
      ),
    ));

  // E4.8
  it.effect("a wrapper composes its name onto the one it wraps", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const attribute = report.ports.find((port) => port.port === "AttributeResolver");

      assert.include(attribute?.name ?? "", "retrying");
    }).pipe(
      Effect.provide(
        attributeResolverRetrying(Schedule.recurs(1))(
          Layer.succeed(AttributeResolver, {
            name: "fromRecord",
            resolve: () => Effect.succeed(undefined),
          }),
        ),
      ),
    ));

  // E4.4 and E4.9
  it.effect("a wired cache reports its size", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;

      assert.isTrue(report.cache.present);
      assert.strictEqual(report.cache.size, 0);
    }).pipe(Effect.provide(decisionCacheLayer())));

  it.effect("an absent cache reports absent, with the consequence", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const card = report.ports.find((port) => port.port === "DecisionCache");

      assert.isFalse(report.cache.present);
      assert.include(card?.consequence ?? "", "every evaluation is computed");
    }));

  // E4.5
  it.effect("an absent sink says this panel has no log to read", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const card = report.ports.find((port) => port.port === "DecisionSink");

      assert.isFalse(card?.present);
      assert.include(card?.consequence ?? "", "no log to read");
    }));

  it.effect("a wired sink is present", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const card = report.ports.find((port) => port.port === "DecisionSink");
      assert.isTrue(card?.present);
    }).pipe(Effect.provide(decisionSinkRing({ environment: "Server" }).layer)));

  it.effect("CurrentSubject's absence says nothing about the application", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const card = report.ports.find((port) => port.port === "CurrentSubject");

      // It is supplied per request, so a reader must not read its absence here
      // as a misconfiguration.
      assert.include(card?.consequence ?? "", "per request");
    }));

  it.effect("a provided subject is present", () =>
    Effect.gen(function* () {
      const report = yield* wiringReport;
      const card = report.ports.find((port) => port.port === "CurrentSubject");
      assert.isTrue(card?.present);
    }).pipe(Effect.provide(currentSubjectLayer(subjectWith({})))));
});

describe("portActivity", () => {
  /**
   * Read with **zero wiring**, which is the whole reason `PortMetrics` counts
   * aggregates rather than emitting a record per call.
   *
   * The registry is process-global, so each case here isolates its own —
   * otherwise one test's counts would leak into the next, and the assertion
   * would depend on file order.
   */
  const isolated = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.provideService(Metric.MetricRegistry, new Map()),
      Effect.provideService(Metric.CurrentMetricAttributes, { test: "isolated" }),
    );

  // E4.7 — wired but never called is not the same as absent.
  it.effect("reports nothing when no port has been reached", () =>
    isolated(
      Effect.gen(function* () {
        assert.deepStrictEqual(yield* portActivity, []);
      }),
    ));

  it.effect("counts the calls an evaluation made, by port", () =>
    isolated(
      Effect.gen(function* () {
        // The attribute is on the *layer*, not on the subject: a subject that
        // already carries it is answered without the resolver ever being
        // reached, which is the behaviour, not a gap.
        yield* evaluate(hasAttribute("clearance", gte(1))).pipe(
          Effect.provide(qadiTestLayer(subjectWith({}), { attributes: { clearance: 3 } })),
        );

        const activity = yield* portActivity;
        const attribute = activity.find((entry) => entry.port === "AttributeResolver");
        assert.strictEqual(attribute?.calls, 1);
        assert.strictEqual(attribute?.retries, 0);
      }),
    ));

  it.effect("a policy touching no port counts nothing", () =>
    isolated(
      Effect.gen(function* () {
        yield* evaluate(hasPermission(read)).pipe(
          Effect.provide(qadiTestLayer(subjectWith({ permissions: ["doc:read"] }))),
        );

        // A permission check reads the subject it was handed; it reaches no
        // port at all.
        assert.deepStrictEqual(yield* portActivity, []);
      }),
    ));

  it.effect("both frequencies are read, even when only one has been touched", () =>
    isolated(
      Effect.gen(function* () {
        yield* Metric.update(portCallsTotal, "AttributeResolver");

        const activity = yield* portActivity;
        assert.deepStrictEqual(activity, [
          { port: "AttributeResolver", calls: 1, retries: 0 },
        ]);
      }),
    ));

  it.effect("a port that only ever retried still appears", () =>
    isolated(
      Effect.gen(function* () {
        yield* Metric.update(portRetriesTotal, "RelationshipResolver");

        assert.deepStrictEqual(yield* portActivity, [
          { port: "RelationshipResolver", calls: 0, retries: 1 },
        ]);
      }),
    ));
});
