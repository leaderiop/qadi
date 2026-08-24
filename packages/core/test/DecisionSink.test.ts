import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as TestClock from "effect/testing/TestClock";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { isAllowed } from "../src/Decision.ts";
import { DecisionCache, decisionCacheLayer } from "../src/DecisionCache.ts";
import type {
  DecisionRecord,
  ObligationRecord,
  SinkRecord,
} from "../src/DecisionRecord.ts";
import { DecisionSink } from "../src/DecisionSink.ts";
import { DEFAULT_RING_CAPACITY, decisionSinkRing } from "../src/DecisionSinkRing.ts";
import { AttributeResolveError } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import { obligation } from "../src/Obligation.ts";
import { decide, enforce } from "../src/Qadi.ts";
import { explain, renderExplanation } from "../src/Explanation.ts";
import * as M from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { isolatedMetrics, subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");

/** Collects into a plain array, so a test can assert on order and arity. */
const collecting = (): {
  readonly layer: Layer.Layer<DecisionSink>;
  readonly all: ReadonlyArray<SinkRecord>;
  readonly seen: ReadonlyArray<DecisionRecord>;
} => {
  const records: Array<SinkRecord> = [];
  return {
    get all() {
      return records;
    },
    /** Decisions only — most assertions here are about those. */
    get seen() {
      return records.filter((r): r is DecisionRecord => r._tag === "Decision");
    },
    layer: Layer.succeed(DecisionSink, {
      record: (record) =>
        Effect.sync(() => {
          records.push(record);
        }),
    }),
  };
};

/** An attribute store that is broken, so evaluation raises instead of deciding. */
const brokenAttributes = Layer.succeed(AttributeResolver, {
  resolve: (_subjectId, attribute) =>
    Effect.fail(new AttributeResolveError({ attribute, cause: "store offline" })),
});

const allowed = subjectWith({ permissions: ["doc:read"] });

describe("DecisionSink — what a record carries", () => {
  it.effect("an allow is recorded with its policy, resource, action and id", () =>
    Effect.gen(function* () {
      const sink = collecting();
      const policy = P.hasPermission(read);

      const d = yield* evaluate(policy, {
        resource: { id: "doc-1", owner: "u1" },
        action: "read",
      }).pipe(Effect.provide(sink.layer));

      assert.strictEqual(sink.seen.length, 1);
      const record = sink.seen[0];
      assert.strictEqual(record?.outcome._tag, "Decided");
      assert.strictEqual(record?.evaluationId, d.evaluationId);
      assert.strictEqual(record?.action, "read");
      assert.deepStrictEqual(record?.resource, { id: "doc-1", owner: "u1" });
      // The association `Decision` could not express: the record names the
      // policy itself, not just `trace.policyTag`.
      assert.deepStrictEqual(record?.policy, policy);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a denial is a Decided record, not a Failed one", () =>
    Effect.gen(function* () {
      const sink = collecting();

      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(sink.layer));

      const outcome = sink.seen[0]?.outcome;
      assert.strictEqual(outcome?._tag, "Decided");
      // The distinction the whole two-tag union exists for: a denial is an
      // answer, and only a broken dependency is a failure (INV-QD-006).
      if (outcome?._tag === "Decided") {
        assert.isFalse(isAllowed(outcome.decision));
      }
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("absent resource and action are absent on the record, not stringified", () =>
    Effect.gen(function* () {
      const sink = collecting();

      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(sink.layer));

      assert.isUndefined(sink.seen[0]?.resource);
      assert.isUndefined(sink.seen[0]?.action);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("the recorded policy round-trips into explain()", () =>
    Effect.gen(function* () {
      const sink = collecting();
      const policy = P.allOf([P.hasPermission(read), P.hasRole("editor")]);

      yield* evaluate(policy).pipe(Effect.provide(sink.layer));

      // The end-to-end point of putting `policy` on the record: a consumer
      // holding only a record can explain the decision. Holding only a
      // `Decision` it could not, because `explain` needs a `Policy` and a
      // `Decision` carries a tag string.
      const recorded = sink.seen[0]?.policy;
      assert.isDefined(recorded);
      if (recorded !== undefined) {
        assert.strictEqual(
          renderExplanation(explain(recorded)),
          renderExplanation(explain(policy)),
        );
      }
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("`at` is the clock's start time, and records are ordered by it", () =>
    Effect.gen(function* () {
      const sink = collecting();

      yield* TestClock.adjust("1 second");
      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(sink.layer));
      yield* TestClock.adjust("5 seconds");
      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(sink.layer));

      // Reproducible under TestClock, which is the whole reason `at` comes from
      // `Clock` rather than `Date.now()`.
      assert.strictEqual(sink.seen[0]?.at, 1000);
      assert.strictEqual(sink.seen[1]?.at, 6000);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("DecisionSink — failures are observable", () => {
  it.effect("a failed evaluation produces a Failed record and re-raises unchanged", () =>
    Effect.gen(function* () {
      const sink = collecting();

      const result = yield* Effect.result(
        evaluate(P.hasAttribute("clearance", M.gte(3))).pipe(Effect.provide(sink.layer)),
      );

      // Before this, an EvaluationError reached no observer at all.
      assert.strictEqual(sink.seen.length, 1);
      const outcome = sink.seen[0]?.outcome;
      assert.strictEqual(outcome?._tag, "Failed");
      if (outcome?._tag === "Failed") {
        assert.strictEqual(outcome.error._tag, "AttributeResolveError");
      }

      // And the caller still sees the error, untouched.
      assert.isTrue(result._tag === "Failure");
    }).pipe(
      Effect.provide(testLayer(subjectWith({}), { attributes: brokenAttributes })),
    ));

  const frequencyOf = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>, id: string) =>
    snapshots.find(
      (s): s is Extract<Metric.Metric.Snapshot, { type: "Frequency" }> =>
        s.type === "Frequency" && s.id === id,
    );

  it.effect("a failure increments qadi_evaluation_errors_total by tag", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.result(evaluate(P.hasAttribute("clearance", M.gte(3))))
          .pipe(
            Effect.provide(
              testLayer(subjectWith({}), { attributes: brokenAttributes }),
            ),
          )
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      const errors = frequencyOf(snapshots, "qadi_evaluation_errors_total");
      assert.isDefined(errors);
      assert.strictEqual(errors?.state.occurrences.get("AttributeResolveError"), 1);
    }));

  it.effect("a successful evaluation adds nothing to the error frequency", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        evaluate(P.hasPermission(read))
          .pipe(Effect.provide(testLayer(allowed)))
          .pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      assert.isUndefined(frequencyOf(snapshots, "qadi_evaluation_errors_total"));
    }));
});

describe("DecisionSink — a sink cannot change a decision", () => {
  /** The verdict reached with no sink at all: the baseline every case must match. */
  const baseline = evaluate(P.hasPermission(read));

  // A sink that *fails* has no test here because it cannot be written: the
  // `never` error channel makes `Effect.fail` un-assignable to
  // `DecisionSinkShape["record"]`, which `DecisionSink.tst.ts` pins. Only a
  // defect can still reach the call site, which is what the next two cases are.

  it.effect("a sink that THROWS leaves the allow intact", () =>
    Effect.gen(function* () {
      // The realistic version: an implementation whose body raises — a
      // serializer meeting a circular resource, say. `Effect.sync` turns that
      // into a defect, so it slips past the `never` channel.
      const throwing = Layer.succeed(DecisionSink, {
        record: () =>
          Effect.sync(() => {
            throw new Error("sink blew up");
          }),
      });

      const expected = yield* baseline;
      const actual = yield* baseline.pipe(Effect.provide(throwing));

      assert.isTrue(isAllowed(actual));
      assert.deepStrictEqual(actual.trace, expected.trace);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a sink that DIES leaves the allow intact", () =>
    Effect.gen(function* () {
      // The `never` error channel alone is not enough, and this is the case that
      // proves it: BEH-QD-175 recorded `Effect.die` as exactly how a `never`
      // channel gets subverted. Without the `catchCause` guard at the call site
      // this defect would take the decision with it.
      const dying = Layer.succeed(DecisionSink, {
        record: () => Effect.die(new Error("sink defect")),
      });

      const expected = yield* baseline;
      const actual = yield* baseline.pipe(Effect.provide(dying));

      assert.isTrue(isAllowed(actual));
      assert.deepStrictEqual(actual.trace, expected.trace);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a sink that dies on the FAILURE path leaves the error intact", () =>
    Effect.gen(function* () {
      const dying = Layer.succeed(DecisionSink, {
        record: () => Effect.die(new Error("sink defect")),
      });

      const result = yield* Effect.result(
        evaluate(P.hasAttribute("clearance", M.gte(3))).pipe(Effect.provide(dying)),
      );

      // The original AttributeResolveError must survive, not be replaced by the
      // sink's defect — otherwise an observer could rewrite why a request failed.
      assert.isTrue(result._tag === "Failure");
      if (result._tag === "Failure") {
        assert.include(JSON.stringify(result.failure), "AttributeResolveError");
      }
    }).pipe(
      Effect.provide(testLayer(subjectWith({}), { attributes: brokenAttributes })),
    ));

  it.effect("no sink provided changes nothing and records nothing", () =>
    Effect.gen(function* () {
      const sink = collecting();

      const withoutSink = yield* baseline;
      const withSink = yield* baseline.pipe(Effect.provide(sink.layer));

      assert.deepStrictEqual(withoutSink.trace, withSink.trace);
      assert.strictEqual(sink.seen.length, 1);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("EvaluateOptions.evaluationId", () => {
  it.effect("a supplied id is used, so a re-check can pair with its origin", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.hasPermission(read), {
        evaluationId: "srv-42",
      });

      assert.strictEqual(d.evaluationId, "srv-42");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("the record carries the supplied id too", () =>
    Effect.gen(function* () {
      const sink = collecting();

      yield* evaluate(P.hasPermission(read), { evaluationId: "srv-42" }).pipe(
        Effect.provide(sink.layer),
      );

      assert.strictEqual(sink.seen[0]?.evaluationId, "srv-42");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("absent, the default is unchanged: a fresh id per call", () =>
    Effect.gen(function* () {
      const first = yield* evaluate(P.hasPermission(read));
      const second = yield* evaluate(P.hasPermission(read));

      assert.strictEqual(first.evaluationId, "eval-1");
      assert.strictEqual(second.evaluationId, "eval-2");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("supplying one does not disturb the generator's sequence", () =>
    Effect.gen(function* () {
      // `EvaluationId.next` is read whether or not the option is present, so a
      // correlated call in the middle cannot shift what the calls around it get.
      yield* evaluate(P.hasPermission(read));
      yield* evaluate(P.hasPermission(read), { evaluationId: "srv-42" });
      const third = yield* evaluate(P.hasPermission(read));

      assert.strictEqual(third.evaluationId, "eval-3");
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("decisionSinkRing", () => {
  it.effect("stores records and stamps the environment", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(ring.layer));

      const stored = yield* ring.snapshot;
      assert.strictEqual(stored.length, 1);
      const first = stored[0];
      assert.strictEqual(first?.environment, "Server");
      // Narrowed on `_tag` — a stored record is now a decision OR an obligation
      // event, and a reader must say which it expects.
      assert.strictEqual(first?._tag, "Decision");
      if (first?._tag === "Decision") assert.strictEqual(first.outcome._tag, "Decided");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("drops the oldest once capacity is reached", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Client", capacity: 2 });

      yield* evaluate(P.hasPermission(read), { evaluationId: "a" }).pipe(
        Effect.provide(ring.layer),
      );
      yield* evaluate(P.hasPermission(read), { evaluationId: "b" }).pipe(
        Effect.provide(ring.layer),
      );
      yield* evaluate(P.hasPermission(read), { evaluationId: "c" }).pipe(
        Effect.provide(ring.layer),
      );

      const stored = yield* ring.snapshot;
      assert.deepStrictEqual(
        stored.map((r) => r.evaluationId),
        ["b", "c"],
      );
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("holds exactly `capacity` records, not one more", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server", capacity: 1 });

      yield* evaluate(P.hasPermission(read), { evaluationId: "a" }).pipe(
        Effect.provide(ring.layer),
      );
      yield* evaluate(P.hasPermission(read), { evaluationId: "b" }).pipe(
        Effect.provide(ring.layer),
      );

      const stored = yield* ring.snapshot;
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0]?.evaluationId, "b");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("capacity 0 stores nothing but still evaluates", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server", capacity: 0 });

      const d = yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(ring.layer));

      assert.isTrue(isAllowed(d));
      assert.deepStrictEqual(yield* ring.snapshot, []);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("clear empties the log", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(ring.layer));
      yield* ring.clear;

      assert.deepStrictEqual(yield* ring.snapshot, []);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("records failures as well as decisions", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* Effect.result(
        evaluate(P.hasAttribute("clearance", M.gte(3))).pipe(Effect.provide(ring.layer)),
      );

      const stored = yield* ring.snapshot;
      const first = stored[0];
      assert.strictEqual(first?._tag, "Decision");
      if (first?._tag === "Decision") assert.strictEqual(first.outcome._tag, "Failed");
    }).pipe(
      Effect.provide(testLayer(subjectWith({}), { attributes: brokenAttributes })),
    ));

  it("defaults to a bounded capacity, unlike the cache", () => {
    // Bounded by default because a record log is long-lived by nature, where a
    // cache is normally scoped to one request.
    assert.strictEqual(DEFAULT_RING_CAPACITY, 500);
  });

  it("rejects a capacity that is not a non-negative integer", () => {
    assert.throws(
      () => decisionSinkRing({ environment: "Server", capacity: -1 }),
      /non-negative integer/,
    );
    assert.throws(
      () => decisionSinkRing({ environment: "Server", capacity: 1.5 }),
      /non-negative integer/,
    );
    assert.throws(
      () => decisionSinkRing({ environment: "Server", capacity: Number.NaN }),
      /non-negative integer/,
    );
  });

  it.effect("a snapshot is a copy, not a live view", () =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(ring.layer));
      const before = yield* ring.snapshot;
      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(ring.layer));

      assert.strictEqual(before.length, 1);
      assert.strictEqual((yield* ring.snapshot).length, 2);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("the cache is visible per decision, and flushable", () => {
  it.effect("a record says whether the cache answered", () =>
    Effect.gen(function* () {
      const sink = collecting();
      const policy = P.hasPermission(read);

      yield* Effect.gen(function* () {
        yield* evaluate(policy);
        yield* evaluate(policy);
      }).pipe(Effect.provide(Layer.merge(sink.layer, decisionCacheLayer())));

      // Answerable per decision for the first time. It was previously a
      // process-global frequency, so an operator could see a hit *rate* across
      // every cache in the process and never learn about the one decision in
      // front of them.
      assert.strictEqual(sink.seen[0]?.cache, "miss");
      assert.strictEqual(sink.seen[1]?.cache, "hit");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("no cache wired is absent, which is not the same as a miss", () =>
    Effect.gen(function* () {
      const sink = collecting();

      yield* evaluate(P.hasPermission(read)).pipe(Effect.provide(sink.layer));

      // "miss" says the cache was consulted and did not have it; absence says
      // there was nothing to consult.
      assert.isUndefined(sink.seen[0]?.cache);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a hit still decides identically to a miss (INV-QD-025)", () =>
    Effect.gen(function* () {
      const sink = collecting();
      const policy = P.allOf([P.hasPermission(read), P.hasRole("editor")]);

      yield* Effect.gen(function* () {
        yield* evaluate(policy);
        yield* evaluate(policy);
      }).pipe(Effect.provide(Layer.merge(sink.layer, decisionCacheLayer())));

      const first = sink.seen[0]?.outcome;
      const second = sink.seen[1]?.outcome;
      assert.strictEqual(first?._tag, "Decided");
      assert.strictEqual(second?._tag, "Decided");
      if (first?._tag === "Decided" && second?._tag === "Decided") {
        // Reporting HOW the answer was reached must not change WHAT it was.
        assert.deepStrictEqual(first.decision.trace, second.decision.trace);
      }
    }).pipe(
      Effect.provide(
        testLayer(subjectWith({ permissions: ["doc:read"], roles: ["editor"] })),
      ),
    ));

  it.effect("clear empties the cache, so the next ask recomputes", () =>
    Effect.gen(function* () {
      const sink = collecting();
      const policy = P.hasPermission(read);

      yield* Effect.gen(function* () {
        const cache = yield* DecisionCache;
        yield* evaluate(policy);
        yield* evaluate(policy);
        assert.strictEqual(yield* cache.size, 1);

        yield* cache.clear;
        assert.strictEqual(yield* cache.size, 0);

        yield* evaluate(policy);
      }).pipe(Effect.provide(Layer.merge(sink.layer, decisionCacheLayer())));

      // There was no way to empty a cache short of discarding its layer scope,
      // which a tool running inside that scope cannot do.
      assert.deepStrictEqual(
        sink.seen.map((r) => r.cache),
        ["miss", "hit", "miss"],
      );
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("the obligation gate is recorded", () => {
  const audited = P.obliged(obligation("audit.log"), P.hasPermission(read));
  const advised = P.obliged(
    obligation("notify.owner", {}, { advisory: true }),
    P.hasPermission(read),
  );

  const obligationsOf = (records: ReadonlyArray<SinkRecord>): ReadonlyArray<ObligationRecord> =>
    records.filter((r): r is ObligationRecord => r._tag === "Obligations");

  it.effect("a discharged obligation is recorded as Discharged", () =>
    Effect.gen(function* () {
      const sink = collecting();

      yield* enforce(audited, { onObligations: () => Effect.void })(Effect.succeed(1)).pipe(
        Effect.provide(sink.layer),
      );

      const events = obligationsOf(sink.all);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0]?.outcome, "Discharged");
      // Paired with the decision it came from — the two rows are one story.
      assert.strictEqual(events[0]?.evaluationId, sink.seen[0]?.evaluationId);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("an undischarged binding obligation is recorded as Refused", () =>
    Effect.gen(function* () {
      const sink = collecting();

      const result = yield* Effect.result(
        enforce(audited)(Effect.succeed(1)).pipe(Effect.provide(sink.layer)),
      );

      // The gap this closes: the decision was an ALLOW and the caller got an
      // error, so a log showing only decisions reported the request as permitted.
      assert.strictEqual(result._tag, "Failure");
      assert.strictEqual(sink.seen[0]?.outcome._tag, "Decided");

      const events = obligationsOf(sink.all);
      assert.strictEqual(events[0]?.outcome, "Refused");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("an advisory-only obligation with no handler is NotRequired", () =>
    Effect.gen(function* () {
      const sink = collecting();

      yield* enforce(advised)(Effect.succeed(1)).pipe(Effect.provide(sink.layer));

      const events = obligationsOf(sink.all);
      assert.strictEqual(
        events[0]?.outcome,
        "NotRequired",
      );
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a handler that fails is HandlerFailed, and its error survives", () =>
    Effect.gen(function* () {
      const sink = collecting();

      const result = yield* Effect.result(
        enforce(audited, { onObligations: () => Effect.fail("logger down" as const) })(
          Effect.succeed(1),
        ).pipe(Effect.provide(sink.layer)),
      );

      const events = obligationsOf(sink.all);
      assert.strictEqual(
        events[0]?.outcome,
        "HandlerFailed",
      );
      // Reporting must not convert the caller's failure into anything else.
      assert.strictEqual(result._tag, "Failure");
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("an allow carrying no obligations emits no obligation record", () =>
    Effect.gen(function* () {
      const sink = collecting();

      yield* enforce(P.hasPermission(read))(Effect.succeed(1)).pipe(
        Effect.provide(sink.layer),
      );

      // The common case costs exactly what it did before this existed.
      assert.deepStrictEqual(obligationsOf(sink.all), []);
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a decision that only reports never reaches the gate", () =>
    Effect.gen(function* () {
      const sink = collecting();

      // `decide` reports; obligations are the caller's to read off the decision,
      // and nothing here discharges them.
      yield* decide(audited).pipe(Effect.provide(sink.layer));

      assert.deepStrictEqual(obligationsOf(sink.all), []);
    }).pipe(Effect.provide(testLayer(allowed))));
});

describe("the obligation emit cannot change enforcement either", () => {
  it.effect("a sink that dies at the obligation gate leaves the refusal intact", () =>
    Effect.gen(function* () {
      // INV-QD-035 covers the decision path; the obligation emit is a second
      // place a sink is called, and it needs the same guarantee.
      const dying = Layer.succeed(DecisionSink, {
        record: () => Effect.die(new Error("sink defect")),
      });

      const result = yield* Effect.result(
        enforce(P.obliged(obligation("audit.log"), P.hasPermission(read)))(
          Effect.succeed(1),
        ).pipe(Effect.provide(dying)),
      );

      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.include(JSON.stringify(result.failure), "UndischargedObligation");
      }
    }).pipe(Effect.provide(testLayer(allowed))));

  it.effect("a sink that dies does not stop a discharged allow proceeding", () =>
    Effect.gen(function* () {
      const dying = Layer.succeed(DecisionSink, {
        record: () => Effect.die(new Error("sink defect")),
      });

      const out = yield* enforce(P.obliged(obligation("audit.log"), P.hasPermission(read)), {
        onObligations: () => Effect.void,
      })(Effect.succeed("ran")).pipe(Effect.provide(dying));

      assert.strictEqual(out, "ran");
    }).pipe(Effect.provide(testLayer(allowed))));
});
