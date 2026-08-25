/**
 * JOB 2 ledger — E2.1 … E2.6.
 *
 * Every row here comes out of a **real evaluation**. The whole claim of this
 * module is that the spans the evaluator emits carry enough to answer "was my
 * store asked, and about what" — and a hand-built span would prove only that the
 * decoder agrees with whatever this file assumed the evaluator writes.
 *
 * The load-bearing case is the first: a collector that shadowed the host's
 * tracer would silently turn off an application's tracing for as long as the
 * dock was mounted, and nothing else in the suite would notice.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Tracer from "effect/Tracer";
import {
  anyOf,
  AttributeResolveError,
  AttributeResolver,
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicate,
  customPredicateFromRecord,
  CustomPredicateNone,
  decisionHistoryFromEvents,
  DecisionHistory,
  DecisionHistoryUnknown,
  evaluate,
  evaluationIdSequential,
  gte,
  hasActed,
  hasAttribute,
  hasCustom,
  hasRelationship,
  hasRole,
  makeSubject,
  RelationshipResolver,
  RelationshipResolverNever,
  relationshipResolverFromEdges,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { collectPortCalls, DEFAULT_PORT_CALL_CAPACITY } from "../../src/index.ts";
import type {
  ActedCall,
  AttributeCall,
  CustomPredicateCall,
  PortCall,
  RelationshipCall,
} from "../../src/index.ts";

const alice = makeSubject({ id: "alice", roles: ["editor"], permissions: [], attributes: {} });

interface Overrides {
  readonly attributes?: Layer.Layer<AttributeResolver>;
  readonly relationships?: Layer.Layer<RelationshipResolver>;
  readonly history?: Layer.Layer<DecisionHistory>;
  readonly customPredicate?: Layer.Layer<CustomPredicate>;
}

const services = (overrides?: Overrides) =>
  Layer.mergeAll(
    currentSubjectLayer(alice),
    overrides?.attributes ?? AttributeResolverNone,
    overrides?.relationships ?? RelationshipResolverNever,
    overrides?.history ?? DecisionHistoryUnknown,
    evaluationIdSequential("ev"),
    overrides?.customPredicate ?? CustomPredicateNone,
  );

const resolverOf = (record: Readonly<Record<string, unknown>>) =>
  Layer.succeed(AttributeResolver, {
    name: "record",
    resolve: (_subjectId: string, attribute: string) => Effect.succeed(record[attribute]),
  });

/** Runs one evaluation under a collector and hands back what it recorded. */
const watch = (
  policy: Policy,
  options?: {
    readonly resource?: Record<string, unknown>;
    readonly layers?: Overrides;
    readonly capacity?: number;
  },
) =>
  Effect.gen(function* () {
    const collector = collectPortCalls(
      options?.capacity === undefined ? undefined : { capacity: options.capacity },
    );

    yield* Effect.result(
      evaluate(policy, options?.resource === undefined ? {} : { resource: options.resource }).pipe(
        Effect.provide(services(options?.layers)),
        Effect.provide(collector.layer),
      ),
    );

    return yield* collector.snapshot;
  });

const only = <A extends PortCall["_tag"]>(
  calls: ReadonlyArray<PortCall>,
  tag: A,
): Extract<PortCall, { _tag: A }> => {
  const found = calls.filter((call): call is Extract<PortCall, { _tag: A }> => call._tag === tag);
  const first = found[0];
  if (first === undefined) throw new Error(`no ${tag} call among ${calls.length}`);
  return first;
};

describe("the collector wraps rather than replaces", () => {
  /**
   * E2.1's other half, and the one that would be a defect: a host that wired
   * its own tracer keeps it. Asserted by wiring one *outside* the collector and
   * checking it still saw every span, port and otherwise.
   */
  it.effect("the host's tracer still sees every span", () =>
    Effect.gen(function* () {
      const hostSaw: Array<string> = [];
      const hostTracer = Layer.succeed(
        Tracer.Tracer,
        Tracer.make({
          span: (options) => {
            hostSaw.push(options.name);
            return new Tracer.NativeSpan(options);
          },
        }),
      );
      const collector = collectPortCalls();

      yield* evaluate(hasAttribute("tier", gte(3))).pipe(
        Effect.provide(services({ attributes: resolverOf({ tier: 5 }) })),
        // The collector is inside, so it is the tracer the evaluation sees —
        // and it must hand every span on to the one outside it.
        Effect.provide(collector.layer),
        Effect.provide(hostTracer),
      );

      assert.include(hostSaw, "qadi.evaluate");
      assert.include(hostSaw, "qadi.attribute");
      assert.strictEqual((yield* collector.snapshot).calls.length, 1);
    }));
});

describe("what a row says", () => {
  it.effect("an attribute call names the attribute and whether a value came back", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasAttribute("tier", gte(3)), {
        layers: { attributes: resolverOf({ tier: 5 }) },
      });

      const call: AttributeCall = only(log.calls, "AttributeResolver");
      assert.strictEqual(call.span, "qadi.attribute");
      assert.strictEqual(call.attribute, "tier");
      assert.strictEqual(call.subjectId, "alice");
      assert.strictEqual(call.resolved, true);
      // The value itself is never on the row — INV-QD-044.
      assert.notProperty(call, "value");
    }));

  it.effect("an attribute the resolver did not have says so", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasAttribute("tier", gte(3)), {
        layers: { attributes: resolverOf({}) },
      });

      assert.strictEqual(only(log.calls, "AttributeResolver").resolved, false);
    }));

  it.effect("a history call names the event, the scope and the answer", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasActed("raised"), {
        resource: { id: "doc-1" },
        layers: {
          history: decisionHistoryFromEvents([
            { subjectId: "alice", event: "raised", resourceId: "doc-1" },
          ]),
        },
      });

      const call: ActedCall = only(log.calls, "DecisionHistory");
      assert.strictEqual(call.event, "raised");
      assert.strictEqual(call.scope, "Resource");
      assert.strictEqual(call.resourceId, "doc-1");
      assert.strictEqual(call.answer, "Acted");
    }));

  it.effect("a relationship call names the relation, the resource and the answer", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasRelationship("owner"), {
        resource: { id: "doc-1" },
        layers: {
          relationships: relationshipResolverFromEdges([
            { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
          ]),
        },
      });

      const call: RelationshipCall = only(log.calls, "RelationshipResolver");
      assert.strictEqual(call.relation, "owner");
      assert.strictEqual(call.resourceId, "doc-1");
      assert.strictEqual(call.answer, "Related");
      // E2.5 — the policy set no depth, so the field reads as not recorded
      // rather than as a fabricated default.
      assert.isUndefined(call.depth);
    }));

  it.effect("a custom predicate call names the check and the answer", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasCustom("isOwner"), {
        layers: {
          customPredicate: customPredicateFromRecord({
            isOwner: () => Effect.succeed(true),
          }),
        },
      });

      const call: CustomPredicateCall = only(log.calls, "CustomPredicate");
      assert.strictEqual(call.span, "qadi.hasCustom");
      assert.strictEqual(call.name, "isOwner");
      assert.strictEqual(call.answer, true);
    }));

  it.effect("a depth the policy set is carried", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasRelationship("owner", { depth: 3 }), {
        resource: { id: "doc-1" },
      });

      assert.strictEqual(only(log.calls, "RelationshipResolver").depth, 3);
    }));

  /**
   * E2.5 — a call the evaluator abandoned before asking still produces a row.
   * The alternative is that a wiring error is invisible in the one table a
   * reader opens to find out whether their store was asked.
   */
  it.effect("a call that failed before it was made renders, with its blanks", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasRelationship("owner"), { resource: { name: "no id" } });

      const call: RelationshipCall = only(log.calls, "RelationshipResolver");
      assert.strictEqual(call.relation, "owner");
      assert.isUndefined(call.resourceId);
      assert.isUndefined(call.answer);
    }));

  it.effect("a broken resolver still leaves a row saying what was asked", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasAttribute("tier", gte(3)), {
        layers: {
          attributes: Layer.succeed(AttributeResolver, {
            name: "broken",
            resolve: (_subjectId: string, attribute: string) =>
              Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
          }),
        },
      });

      const call: AttributeCall = only(log.calls, "AttributeResolver");
      assert.strictEqual(call.attribute, "tier");
      assert.isUndefined(call.resolved);
    }));

  // E2.4 — a finished call reports a real duration; the in-flight case is below.
  it.effect("a finished call reports how long it took", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasAttribute("tier", gte(3)), {
        layers: { attributes: resolverOf({ tier: 5 }) },
      });

      const call = only(log.calls, "AttributeResolver");
      assert.isNumber(call.durationMillis);
      assert.isAtLeast(call.durationMillis ?? -1, 0);
      // Zero, and reproducibly so: `it.effect` supplies a `TestClock`, and `at`
      // follows the `Clock` for the reason `DecisionRecord.at` does.
      assert.strictEqual(call.at, 0);
    }));

  /**
   * `it.live`, because the thing that could actually be wrong here is the
   * conversion: a span's times are **nanoseconds** as a `bigint`, and a row
   * reports epoch millis. Off by a factor of a million, `at` would still be a
   * number and still sort correctly — and would place every call in 1970 or in
   * the year 33658.
   */
  it.live("reports a real epoch, converted from the span's nanoseconds", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasAttribute("tier", gte(3)), {
        layers: { attributes: resolverOf({ tier: 5 }) },
      });

      const at = only(log.calls, "AttributeResolver").at;
      assert.isAbove(at, 1_600_000_000_000);
      assert.isBelow(at, 4_000_000_000_000);
    }));
});

/**
 * The decoder's own edges, reached through real spans rather than hand-built
 * ones — `Effect.withSpan` plus `annotateCurrentSpan` is all it takes, and it is
 * exactly what a *different* producer writing into the `qadi.` span namespace
 * would look like from here.
 */
describe("decoding a span this evaluator did not write", () => {
  // E2.5 — a wrong-typed attribute reads the same as an absent one. Coercing it
  // would put a number's `String()` where a name belongs.
  it.effect("ignores an attribute whose type is not the one the field expects", () =>
    Effect.gen(function* () {
      const collector = collectPortCalls();

      yield* Effect.annotateCurrentSpan({
        "qadi.attribute": 42,
        "qadi.subject_id": true,
        "qadi.resolved": "yes",
      }).pipe(Effect.withSpan("qadi.attribute"), Effect.provide(collector.layer));

      const call: AttributeCall = only((yield* collector.snapshot).calls, "AttributeResolver");
      assert.isUndefined(call.attribute);
      assert.isUndefined(call.subjectId);
      assert.isUndefined(call.resolved);
    }));

  it.effect("ignores a depth that is not a number", () =>
    Effect.gen(function* () {
      const collector = collectPortCalls();

      yield* Effect.annotateCurrentSpan({ "qadi.depth": "three" }).pipe(
        Effect.withSpan("qadi.hasRelationship"),
        Effect.provide(collector.layer),
      );

      assert.isUndefined(only((yield* collector.snapshot).calls, "RelationshipResolver").depth);
    }));

  /**
   * E2.4 — a call still in flight has no duration, and must not be given one.
   * Reached by reading the log from **inside** the resolver, at which point the
   * `qadi.attribute` span around it is open.
   */
  it.effect("reports a call still in flight as having no duration", () =>
    Effect.gen(function* () {
      const collector = collectPortCalls();
      let midFlight: PortCall | undefined;

      yield* evaluate(hasAttribute("tier", gte(3))).pipe(
        Effect.provide(
          services({
            attributes: Layer.succeed(AttributeResolver, {
              name: "observing",
              resolve: () =>
                Effect.gen(function* () {
                  midFlight = (yield* collector.snapshot).calls[0];
                  return 5;
                }),
            }),
          }),
        ),
        Effect.provide(collector.layer),
      );

      assert.isDefined(midFlight);
      assert.strictEqual(midFlight?.span, "qadi.attribute");
      // Not zero. A zero is a call that finished instantly, and this one has
      // not finished at all.
      assert.isUndefined(midFlight?.durationMillis);

      // And once it has, the same row reports a real one.
      assert.isNumber(only((yield* collector.snapshot).calls, "AttributeResolver").durationMillis);
    }));

  /**
   * The conversion, bounded from both sides. A span's times are nanoseconds as
   * a `bigint`; a row reports milliseconds. Multiplied instead of divided, an
   * in-process call would report hours, and adding the two timestamps instead
   * of subtracting them would report about forty thousand years.
   */
  it.live("converts a duration from nanoseconds, not to them", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasAttribute("tier", gte(3)), {
        layers: { attributes: resolverOf({ tier: 5 }) },
      });

      const duration = only(log.calls, "AttributeResolver").durationMillis ?? -1;
      assert.isAtLeast(duration, 0);
      assert.isBelow(duration, 1_000);
    }));
});

describe("what the collector keeps", () => {
  // E2.2 — every other span is delegated and not recorded, or the table would
  // fill with rows whose every field is blank.
  it.effect("records only the three port spans", () =>
    Effect.gen(function* () {
      const log = yield* watch(anyOf([hasRole("nobody"), hasAttribute("tier", gte(3))]), {
        layers: { attributes: resolverOf({ tier: 5 }) },
      });

      assert.deepStrictEqual(
        log.calls.map((call) => call.span),
        ["qadi.attribute"],
      );
    }));

  it.effect("records nothing when no port was touched", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasRole("editor"));

      assert.deepStrictEqual(log.calls, []);
      assert.strictEqual(log.dropped, 0);
    }));

  // E2.6 — start order, which never reorders a row already on screen.
  it.effect("keeps calls in the order they started", () =>
    Effect.gen(function* () {
      const log = yield* watch(
        anyOf([
          hasAttribute("first", gte(99)),
          hasAttribute("second", gte(99)),
          hasAttribute("third", gte(99)),
        ]),
        { layers: { attributes: resolverOf({}) } },
      );

      assert.deepStrictEqual(
        log.calls.map((call) => (call._tag === "AttributeResolver" ? call.attribute : undefined)),
        ["first", "second", "third"],
      );
    }));

  // E2.3 — a full ring looks exactly like a quiet one unless it says otherwise.
  it.effect("drops the oldest past its capacity, and says how many", () =>
    Effect.gen(function* () {
      const log = yield* watch(
        anyOf([
          hasAttribute("first", gte(99)),
          hasAttribute("second", gte(99)),
          hasAttribute("third", gte(99)),
        ]),
        { layers: { attributes: resolverOf({}) }, capacity: 2 },
      );

      assert.strictEqual(log.calls.length, 2);
      assert.strictEqual(log.dropped, 1);
      assert.strictEqual(log.capacity, 2);
      assert.deepStrictEqual(
        log.calls.map((call) => (call._tag === "AttributeResolver" ? call.attribute : undefined)),
        ["second", "third"],
      );
    }));

  it.effect("a capacity of zero keeps nothing and counts everything", () =>
    Effect.gen(function* () {
      const log = yield* watch(hasAttribute("tier", gte(3)), {
        layers: { attributes: resolverOf({ tier: 5 }) },
        capacity: 0,
      });

      assert.deepStrictEqual(log.calls, []);
      assert.strictEqual(log.dropped, 1);
    }));

  it("refuses a capacity that is not a count", () => {
    assert.throws(() => collectPortCalls({ capacity: -1 }), /non-negative integer/);
    assert.throws(() => collectPortCalls({ capacity: 1.5 }), /non-negative integer/);
  });

  it("defaults to the documented capacity", () => {
    assert.strictEqual(DEFAULT_PORT_CALL_CAPACITY, 200);
  });

  it.effect("one collector provided twice shares one log", () =>
    Effect.gen(function* () {
      const collector = collectPortCalls();
      const run = evaluate(hasAttribute("tier", gte(3))).pipe(
        Effect.provide(services({ attributes: resolverOf({ tier: 5 }) })),
        Effect.provide(collector.layer),
      );

      yield* run;
      yield* run;

      assert.strictEqual((yield* collector.snapshot).calls.length, 2);
    }));
});
