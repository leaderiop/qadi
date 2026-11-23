import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as References from "effect/References";
import * as Stream from "effect/Stream";
import type * as Tracer from "effect/Tracer";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { decisionCacheLayer } from "../src/DecisionCache.ts";
import { evaluate } from "../src/Evaluate.ts";
import { createGuardHealthCheck } from "../src/GuardHealthCheck.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import { toPredicate } from "../src/Predicate.ts";
import { decideSubjects, decideSubjectsStream } from "../src/SubjectSet.ts";
import {
  allAttributesOf,
  attributesOf,
  collectingLogger,
  collectingTracer,
  subjectSetLayer,
  subjectWith,
  testLayer,
} from "./helpers.ts";

/**
 * Pins what a tracer sees on the spans of the evaluate family and on the denial log
 * line.
 *
 * `qadi.evaluate` is opened by `evaluate`, `qadi.toPredicate` by `toPredicate`,
 * `qadi.guardHealthCheck` by `createGuardHealthCheck`, and `qadi.decideSubjects` and
 * `qadi.decideSubjectsStream` by `decideSubjects` and `decideSubjectsStream`.
 *
 * Every key is written as a literal on purpose. The file reads no key through the
 * source's own declaration, so it pins the keys a tracer receives whatever the source
 * declares (ADR-QD-188).
 */

const read = permission("doc", "read");
const write = permission("doc", "write");
const canRead = P.hasPermission(read);
const reader = (id: string) => subjectWith({ id, permissions: ["doc:read"] });
const nobody = (id: string) => subjectWith({ id });

const outage = scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer;

const u1 = subjectWith({ id: "u1", roles: ["editor"] });
const u2 = subjectWith({ id: "u2" });
const u3 = subjectWith({ id: "u3" });
const u4 = subjectWith({ id: "u4", roles: ["auditor"] });
const u5 = subjectWith({ id: "u5" });
const u9 = subjectWith({ id: "u9", roles: ["editor"] });

const owes = P.allOf([
  P.obliged(obligation("log-access"), P.hasRole("auditor")),
  P.obliged(obligation("notify-dpo"), P.hasRole("auditor")),
]);
const clearance = P.hasAttribute("clearance", M.gte(1));
const plan = P.hasAttribute("plan", M.eq(M.literal("pro")));

describe("qadi.evaluate", () => {
  it.effect("an evaluation with no action carries no qadi.action key", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u1), collectingTracer(spans))),
      );
      assert.notProperty(attributesOf(spans, "qadi.evaluate"), "qadi.action");
    }));

  it.effect("an allow carries its subject, evaluation id and policy tag", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u1), collectingTracer(spans))),
      );
      const attributes = attributesOf(spans, "qadi.evaluate");
      assert.strictEqual(attributes["qadi.subject_id"], "u1");
      assert.strictEqual(attributes["qadi.evaluation_id"], "eval-1");
      assert.strictEqual(attributes["qadi.policy_tag"], "HasRole");
    }));

  it.effect("an allow owing obligations carries their ids, comma-joined", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* evaluate(owes).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u4), collectingTracer(spans))),
      );
      assert.strictEqual(
        attributesOf(spans, "qadi.evaluate")["qadi.obligations"],
        "log-access,notify-dpo",
      );
    }));

  it.effect("an allow owing nothing carries no qadi.obligations key", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u1), collectingTracer(spans))),
      );
      assert.notProperty(attributesOf(spans, "qadi.evaluate"), "qadi.obligations");
    }));

  it.effect("a failed evaluation carries outcome Failed and its error tag", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* Effect.result(evaluate(clearance)).pipe(
        Effect.provide(
          Layer.mergeAll(
            testLayer(u3, { AttributeResolver: outage }),
            collectingTracer(spans),
          ),
        ),
      );
      const attributes = attributesOf(spans, "qadi.evaluate");
      assert.strictEqual(attributes["qadi.outcome"], "Failed");
      assert.strictEqual(attributes["qadi.error_tag"], "AttributeResolveError");
    }));

  it.effect("a cache hit carries the id of its own evaluation", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* Effect.gen(function* () {
        yield* evaluate(P.hasRole("editor"));
        yield* evaluate(P.hasRole("editor"));
      }).pipe(
        Effect.provide(
          Layer.mergeAll(testLayer(u1), decisionCacheLayer(), collectingTracer(spans)),
        ),
      );
      const second = allAttributesOf(spans, "qadi.evaluate")[1];
      assert.strictEqual(second?.["qadi.evaluation_id"], "eval-2");
    }));

  it.effect("an allow carries exactly its question and outcome Allow", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u1), collectingTracer(spans))),
      );
      assert.deepStrictEqual(attributesOf(spans, "qadi.evaluate"), {
        "qadi.subject_id": "u1",
        "qadi.evaluation_id": "eval-1",
        "qadi.policy_tag": "HasRole",
        "qadi.outcome": "Allow",
      });
    }));

  it.effect("a denial carries exactly its question and outcome Deny", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* evaluate(P.hasPermission(write)).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u2), collectingTracer(spans))),
      );
      assert.deepStrictEqual(attributesOf(spans, "qadi.evaluate"), {
        "qadi.subject_id": "u2",
        "qadi.evaluation_id": "eval-1",
        "qadi.policy_tag": "HasPermission",
        "qadi.outcome": "Deny",
      });
    }));

  it.effect(
    "a failed evaluation carries exactly its question, outcome Failed and error tag",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* Effect.result(evaluate(clearance)).pipe(
          Effect.provide(
            Layer.mergeAll(
              testLayer(u3, { AttributeResolver: outage }),
              collectingTracer(spans),
            ),
          ),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.evaluate"), {
          "qadi.subject_id": "u3",
          "qadi.evaluation_id": "eval-1",
          "qadi.policy_tag": "HasAttribute",
          "qadi.outcome": "Failed",
          "qadi.error_tag": "AttributeResolveError",
        });
      }));

  it.effect(
    "a failed evaluation with an action carries exactly its question and error tag",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* Effect.result(evaluate(clearance, { action: "write" })).pipe(
          Effect.provide(
            Layer.mergeAll(
              testLayer(u3, { AttributeResolver: outage }),
              collectingTracer(spans),
            ),
          ),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.evaluate"), {
          "qadi.subject_id": "u3",
          "qadi.evaluation_id": "eval-1",
          "qadi.policy_tag": "HasAttribute",
          "qadi.action": "write",
          "qadi.outcome": "Failed",
          "qadi.error_tag": "AttributeResolveError",
        });
      }));

  it.effect("an allow with an action carries exactly its question and outcome", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* evaluate(P.hasAction("write"), { action: "write" }).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u1), collectingTracer(spans))),
      );
      assert.deepStrictEqual(attributesOf(spans, "qadi.evaluate"), {
        "qadi.subject_id": "u1",
        "qadi.evaluation_id": "eval-1",
        "qadi.policy_tag": "HasAction",
        "qadi.action": "write",
        "qadi.outcome": "Allow",
      });
    }));

  it.effect(
    "an allow owing obligations carries exactly its question, outcome and ids",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* evaluate(owes).pipe(
          Effect.provide(Layer.mergeAll(testLayer(u4), collectingTracer(spans))),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.evaluate"), {
          "qadi.subject_id": "u4",
          "qadi.evaluation_id": "eval-1",
          "qadi.policy_tag": "AllOf",
          "qadi.outcome": "Allow",
          "qadi.obligations": "log-access,notify-dpo",
        });
      }));

  it.effect("a cache hit carries exactly its question and outcome", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* Effect.gen(function* () {
        yield* evaluate(P.hasRole("editor"));
        yield* evaluate(P.hasRole("editor"));
      }).pipe(
        Effect.provide(
          Layer.mergeAll(testLayer(u1), decisionCacheLayer(), collectingTracer(spans)),
        ),
      );
      assert.deepStrictEqual(allAttributesOf(spans, "qadi.evaluate")[1], {
        "qadi.subject_id": "u1",
        "qadi.evaluation_id": "eval-2",
        "qadi.policy_tag": "HasRole",
        "qadi.outcome": "Allow",
      });
    }));
});

describe("qadi.toPredicate", () => {
  it.effect(
    "a translation carries its subject, policy tag and predicate tag, exactly",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* toPredicate(P.hasRole("editor")).pipe(
          Effect.provide(Layer.mergeAll(testLayer(u9), collectingTracer(spans))),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.toPredicate"), {
          "qadi.subject_id": "u9",
          "qadi.policy_tag": "HasRole",
          "qadi.predicate_tag": "True",
        });
      }));

  it.effect("a failed translation carries no qadi.predicate_tag key", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* Effect.result(
        toPredicate(P.not(P.not(P.hasRole("editor"))), { maxDepth: 1 }),
      ).pipe(Effect.provide(Layer.mergeAll(testLayer(u9), collectingTracer(spans))));
      assert.notProperty(attributesOf(spans, "qadi.toPredicate"), "qadi.predicate_tag");
    }));

  it.effect(
    "a translation with an action carries exactly its question and predicate tag",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* toPredicate(P.hasRole("editor"), { action: "read" }).pipe(
          Effect.provide(Layer.mergeAll(testLayer(u9), collectingTracer(spans))),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.toPredicate"), {
          "qadi.subject_id": "u9",
          "qadi.policy_tag": "HasRole",
          "qadi.action": "read",
          "qadi.predicate_tag": "True",
        });
      }));

  it.effect(
    "a policy too deep to translate carries exactly its question and PolicyTooDeep",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* Effect.result(
          toPredicate(P.not(P.not(P.hasRole("editor"))), { maxDepth: 1 }),
        ).pipe(Effect.provide(Layer.mergeAll(testLayer(u9), collectingTracer(spans))));
        assert.deepStrictEqual(attributesOf(spans, "qadi.toPredicate"), {
          "qadi.subject_id": "u9",
          "qadi.policy_tag": "Not",
          "qadi.error_tag": "PolicyTooDeep",
        });
      }));

  it.effect(
    "a fields restriction carries exactly its question and PolicyNotTranslatable",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* Effect.result(
          toPredicate(P.hasPermission(permission("doc", "read"), { fields: ["id"] })),
        ).pipe(Effect.provide(Layer.mergeAll(testLayer(u9), collectingTracer(spans))));
        assert.deepStrictEqual(attributesOf(spans, "qadi.toPredicate"), {
          "qadi.subject_id": "u9",
          "qadi.policy_tag": "HasPermission",
          "qadi.error_tag": "PolicyNotTranslatable",
        });
      }));

  it.effect(
    "an untranslatable node carries exactly its question and PolicyNotTranslatable",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* Effect.result(toPredicate(P.hasRelationship("owner"))).pipe(
          Effect.provide(Layer.mergeAll(testLayer(u9), collectingTracer(spans))),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.toPredicate"), {
          "qadi.subject_id": "u9",
          "qadi.policy_tag": "HasRelationship",
          "qadi.error_tag": "PolicyNotTranslatable",
        });
      }));

  it.effect(
    "a port failure in translation carries exactly its question and error tag",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* Effect.result(toPredicate(P.hasAttribute("riskScore", M.lt(50)))).pipe(
          Effect.provide(
            Layer.mergeAll(
              testLayer(u9, { AttributeResolver: outage }),
              collectingTracer(spans),
            ),
          ),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.toPredicate"), {
          "qadi.subject_id": "u9",
          "qadi.policy_tag": "HasAttribute",
          "qadi.error_tag": "AttributeResolveError",
        });
      }));
});

describe("qadi.guardHealthCheck", () => {
  it.effect("a healthy probe carries qadi.healthy true", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* createGuardHealthCheck(P.hasRole("canary")).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u5), collectingTracer(spans))),
      );
      const attributes = attributesOf(spans, "qadi.guardHealthCheck");
      assert.strictEqual(attributes["qadi.healthy"], true);
    }));

  it.effect("an unhealthy probe carries qadi.healthy false and its error tag", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* createGuardHealthCheck(plan).pipe(
        Effect.provide(
          Layer.mergeAll(
            testLayer(u5, { AttributeResolver: outage }),
            collectingTracer(spans),
          ),
        ),
      );
      const attributes = attributesOf(spans, "qadi.guardHealthCheck");
      assert.strictEqual(attributes["qadi.healthy"], false);
      assert.strictEqual(attributes["qadi.error_tag"], "AttributeResolveError");
    }));

  it.effect("a healthy probe carries exactly its question and qadi.healthy true", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* createGuardHealthCheck(P.hasRole("canary")).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u5), collectingTracer(spans))),
      );
      assert.deepStrictEqual(attributesOf(spans, "qadi.guardHealthCheck"), {
        "qadi.subject_id": "u5",
        "qadi.policy_tag": "HasRole",
        "qadi.healthy": true,
      });
    }));

  it.effect(
    "an unhealthy probe carries exactly its question, healthy false and error tag",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* createGuardHealthCheck(plan).pipe(
          Effect.provide(
            Layer.mergeAll(
              testLayer(u5, { AttributeResolver: outage }),
              collectingTracer(spans),
            ),
          ),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.guardHealthCheck"), {
          "qadi.subject_id": "u5",
          "qadi.policy_tag": "HasAttribute",
          "qadi.healthy": false,
          "qadi.error_tag": "AttributeResolveError",
        });
      }));

  it.effect("a probe with an action carries exactly its question and qadi.healthy", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* createGuardHealthCheck(P.hasRole("canary"), { action: "read" }).pipe(
        Effect.provide(Layer.mergeAll(testLayer(u5), collectingTracer(spans))),
      );
      assert.deepStrictEqual(attributesOf(spans, "qadi.guardHealthCheck"), {
        "qadi.subject_id": "u5",
        "qadi.policy_tag": "HasRole",
        "qadi.action": "read",
        "qadi.healthy": true,
      });
    }));
});

describe("qadi.decideSubjects and qadi.decideSubjectsStream", () => {
  it.effect("a batch carries its subject count and policy tag, exactly", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* decideSubjects(canRead, [reader("a"), nobody("b")]).pipe(
        Effect.provide(Layer.mergeAll(subjectSetLayer(), collectingTracer(spans))),
      );
      assert.deepStrictEqual(attributesOf(spans, "qadi.decideSubjects"), {
        "qadi.subject_count": 2,
        "qadi.policy_tag": "HasPermission",
      });
    }));

  it.effect("a streamed batch carries its policy tag, exactly", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* Stream.runDrain(
        decideSubjectsStream(canRead, Stream.fromIterable([reader("a"), nobody("b")])),
      ).pipe(Effect.provide(Layer.mergeAll(subjectSetLayer(), collectingTracer(spans))));
      assert.deepStrictEqual(attributesOf(spans, "qadi.decideSubjectsStream"), {
        "qadi.policy_tag": "HasPermission",
      });
    }));

  it.effect(
    "each subject in a batch gets a qadi.evaluate span with its own subject id",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* decideSubjects(canRead, [reader("a"), nobody("b")]).pipe(
          Effect.provide(Layer.mergeAll(subjectSetLayer(), collectingTracer(spans))),
        );
        assert.deepStrictEqual(
          allAttributesOf(spans, "qadi.evaluate").map((a) => a["qadi.subject_id"]),
          ["a", "b"],
        );
      }));

  it.effect(
    "a batch with an action carries exactly its count, policy tag and action",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* decideSubjects(canRead, [reader("a"), nobody("b")], {
          action: "read",
        }).pipe(
          Effect.provide(Layer.mergeAll(subjectSetLayer(), collectingTracer(spans))),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.decideSubjects"), {
          "qadi.subject_count": 2,
          "qadi.policy_tag": "HasPermission",
          "qadi.action": "read",
        });
      }));

  it.effect(
    "a streamed batch with an action carries exactly its policy tag and action",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* Stream.runDrain(
          decideSubjectsStream(canRead, Stream.fromIterable([reader("a"), nobody("b")]), {
            action: "read",
          }),
        ).pipe(
          Effect.provide(Layer.mergeAll(subjectSetLayer(), collectingTracer(spans))),
        );
        assert.deepStrictEqual(attributesOf(spans, "qadi.decideSubjectsStream"), {
          "qadi.policy_tag": "HasPermission",
          "qadi.action": "read",
        });
      }));

  it.effect(
    "each qadi.evaluate span in a batch carries exactly its question and outcome",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* decideSubjects(canRead, [reader("a"), nobody("b")]).pipe(
          Effect.provide(Layer.mergeAll(subjectSetLayer(), collectingTracer(spans))),
        );
        assert.deepStrictEqual(allAttributesOf(spans, "qadi.evaluate"), [
          {
            "qadi.subject_id": "a",
            "qadi.evaluation_id": "eval-1",
            "qadi.policy_tag": "HasPermission",
            "qadi.outcome": "Allow",
          },
          {
            "qadi.subject_id": "b",
            "qadi.evaluation_id": "eval-2",
            "qadi.policy_tag": "HasPermission",
            "qadi.outcome": "Deny",
          },
        ]);
      }));
});

describe("the denial log line", () => {
  it.effect(
    "a denial logs policy denied with exactly its policy tag, subject and reason",
    () =>
      Effect.gen(function* () {
        const { lines, layer: logger } = collectingLogger();
        yield* evaluate(P.hasPermission(write)).pipe(
          Effect.provide(testLayer(u2)),
          Effect.provideService(References.MinimumLogLevel, "Debug"),
          Effect.provide(logger),
        );
        assert.strictEqual(lines.length, 1);
        assert.deepStrictEqual(lines[0]?.message, ["qadi: policy denied"]);
        assert.deepStrictEqual(lines[0]?.annotations, {
          "qadi.policy_tag": "HasPermission",
          "qadi.subject_id": "u2",
          "qadi.reason": "subject lacks permission 'doc:write'",
        });
      }));

  it.effect("an allow logs no line", () =>
    Effect.gen(function* () {
      const { lines, layer: logger } = collectingLogger();
      yield* evaluate(P.hasRole("editor")).pipe(
        Effect.provide(testLayer(u1)),
        Effect.provideService(References.MinimumLogLevel, "Debug"),
        Effect.provide(logger),
      );
      assert.strictEqual(lines.length, 0);
    }));
});
