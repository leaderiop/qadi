/**
 * JOB 2 ledger — E2.1 … E2.8.
 *
 * The load-bearing case is E2.1, **INV-QD-043**: a snapshot must answer what
 * the live layer answered. That is an agreement property in the family of
 * INV-QD-018 and INV-QD-038 — two paths answering one question — and it drifts
 * the same way, silently, which is why it is asserted by diffing two real
 * traces rather than by checking the map.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  AttributeResolveError,
  AttributeResolver,
  attributeResolverFromRecord,
  CustomPredicate,
  customPredicateFromRecord,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistory,
  decisionHistoryFromEvents,
  DecisionHistoryUnknown,
  DecisionHistoryUnavailable,
  diffTraces,
  gte,
  hasActed,
  hasAttribute,
  hasCustom,
  hasNotActed,
  hasRelationship,
  makeResourceId,
  makeSubjectId,
  relationshipResolverFromEdges,
  RelationshipResolveError,
  RelationshipResolver,
  RelationshipResolverNever,
  SignatureHistory,
} from "@qadi/core";
import type { ActedResult, Decision, DecisionOutcome, RelatedResult } from "@qadi/core";

const unknownRelated: RelatedResult = "Unknown";
const unknownActed: ActedResult = "Unknown";
import {
  answerCount,
  attributeKey,
  capturing,
  customPredicateKey,
  emptyAnswers,
  historyKey,
  relationshipKey,
  replayLayer,
} from "../../src/model/Capture.ts";
import { simulate } from "../../src/model/Simulation.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { live, snapshot } from "../../src/model/Sources.ts";

const decisionOf = (outcome: DecisionOutcome): Decision => {
  if (outcome._tag !== "Decided") throw new Error("expected a decision");
  return outcome.decision;
};

/** A stand-in for a real deployment's ports. */
const realPorts = Layer.mergeAll(
  attributeResolverFromRecord({ clearance: 4, dept: "eng" }),
  relationshipResolverFromEdges([{ subjectId: "alice", relation: "owner", resourceId: "doc-1" }]),
  decisionHistoryFromEvents([{ subjectId: "alice", event: "raised", resourceId: "doc-1" }]),
  CustomPredicateNone,
  SignatureHistoryNone,
);

const alice: SimulationInput = { subject: { id: "alice" }, resource: { id: "doc-1" } };

const everything = allOf([
  hasAttribute("clearance", gte(2)),
  hasRelationship("owner"),
  hasActed("raised"),
]);

describe("capture fidelity — INV-QD-043", () => {
  /**
   * E2.1 — the whole reason snapshots are trustworthy.
   *
   * Asserted by running twice and diffing the **traces**, not by inspecting
   * the captured map: a capture that recorded the right pairs but replayed
   * them under a different key would pass a map check and fail here.
   */
  it.effect("a snapshot replays to the trace the live run produced", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);

      const liveRun = decisionOf(
        yield* simulate(everything, alice, { source: live(capture.layer) }),
      );
      const answers = yield* capture.answers;

      const replayed = decisionOf(
        yield* simulate(everything, alice, { source: snapshot(answers) }),
      );

      assert.deepStrictEqual(diffTraces(liveRun.trace, replayed.trace), []);
      assert.strictEqual(liveRun._tag, replayed._tag);
    }));

  it.effect("holds for a denial as well as an allow", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      const policy = hasAttribute("clearance", gte(99));

      const liveRun = decisionOf(yield* simulate(policy, alice, { source: live(capture.layer) }));
      const answers = yield* capture.answers;
      const replayed = decisionOf(yield* simulate(policy, alice, { source: snapshot(answers) }));

      assert.strictEqual(liveRun._tag, "Deny");
      assert.deepStrictEqual(diffTraces(liveRun.trace, replayed.trace), []);
    }));

  // E2.3 — an outage replays as an outage, never as a miss.
  it.effect("a port that failed during capture fails the same way on replay", () =>
    Effect.gen(function* () {
      const broken = Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          name: "broken",
          resolve: (_subjectId, attribute) =>
            Effect.fail(new AttributeResolveError({ attribute, cause: "store down" })),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);
      const policy = hasAttribute("clearance", gte(1));

      const liveRun = yield* simulate(policy, alice, { source: live(capture.layer) });
      const answers = yield* capture.answers;
      const replayed = yield* simulate(policy, alice, { source: snapshot(answers) });

      // Turning a captured failure into a miss would make the snapshot say the
      // attribute was absent — a denial — where the live run said the lookup
      // broke, which is not a denial at all (INV-QD-006).
      assert.strictEqual(liveRun._tag, "Failed");
      assert.strictEqual(replayed._tag, "Failed");

      // Recorded as a failure with its message, not as an absent value.
      const recorded = answers.attributes.get(attributeKey(makeSubjectId("alice"), "clearance"));
      assert.strictEqual(recorded?._tag, "Broke");
      assert.include(recorded?._tag === "Broke" ? recorded.message : "", "store down");
    }));

  it.effect("a relationship outage replays as an outage", () =>
    Effect.gen(function* () {
      const broken = Layer.mergeAll(
        attributeResolverFromRecord({}),
        Layer.succeed(RelationshipResolver, {
          name: "broken",
          check: (request) =>
            Effect.fail(
              new RelationshipResolveError({
                relation: request.relation,
                resourceId: request.resourceId,
                cause: "graph down",
              }),
            ),
        }),
        DecisionHistoryUnknown,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);

      const liveRun = yield* simulate(hasRelationship("owner"), alice, {
        source: live(capture.layer),
      });
      const replayed = yield* simulate(hasRelationship("owner"), alice, {
        source: snapshot(yield* capture.answers),
      });

      assert.strictEqual(liveRun._tag, "Failed");
      assert.strictEqual(replayed._tag, "Failed");
    }));

  it.effect("a history outage replays as an outage", () =>
    Effect.gen(function* () {
      const broken = Layer.mergeAll(
        attributeResolverFromRecord({}),
        RelationshipResolverNever,
        Layer.succeed(DecisionHistory, {
          name: "broken",
          hasActed: (query) =>
            Effect.fail(
              new DecisionHistoryUnavailable({ event: query.event, cause: "journal down" }),
            ),
        }),
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);

      const liveRun = yield* simulate(hasActed("raised"), alice, {
        source: live(capture.layer),
      });
      const replayed = yield* simulate(hasActed("raised"), alice, {
        source: snapshot(yield* capture.answers),
      });

      assert.strictEqual(liveRun._tag, "Failed");
      assert.strictEqual(replayed._tag, "Failed");
    }));
});

describe("what a capture records", () => {
  it.effect("records the answer, not merely that a call happened", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      yield* simulate(hasAttribute("clearance", gte(2)), alice, { source: live(capture.layer) });

      const answers = yield* capture.answers;
      const recorded = answers.attributes.get(attributeKey(makeSubjectId("alice"), "clearance"));

      assert.deepStrictEqual(recorded, { _tag: "Answered", value: 4 });
    }));

  // E2.4
  it.effect("keeps two different queries to one port apart", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      yield* simulate(
        allOf([hasAttribute("clearance", gte(2)), hasAttribute("dept", gte(0))]),
        alice,
        { source: live(capture.layer) },
      );

      const answers = yield* capture.answers;
      assert.strictEqual(answers.attributes.size, 2);
    }));

  // E2.5
  it.effect("the same query twice is captured once", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      yield* simulate(
        allOf([hasAttribute("clearance", gte(2)), hasAttribute("clearance", gte(1))]),
        alice,
        { source: live(capture.layer) },
      );

      assert.strictEqual((yield* capture.answers).attributes.size, 1);
    }));

  // E2.6 — a relationship keyed by relation alone would answer the wrong
  // resource's question after an edit changed the resource.
  it("keys a relationship by subject, relation and resource together", () => {
    const first = relationshipKey({
      subjectId: makeSubjectId("alice"),
      relation: "owner",
      resourceId: makeResourceId("doc-1"),
      depth: undefined,
    });
    const other = relationshipKey({
      subjectId: makeSubjectId("alice"),
      relation: "owner",
      resourceId: makeResourceId("doc-2"),
      depth: undefined,
    });

    assert.notStrictEqual(first, other);
  });

  // E2.7 — "ever, at all" is a different question from "to this resource".
  it("keys an anywhere-history query apart from a resource-scoped one", () => {
    const scoped = historyKey({
      subjectId: makeSubjectId("alice"),
      event: "raised",
      resourceId: makeResourceId("doc-1"),
    });
    const anywhere = historyKey({
      subjectId: makeSubjectId("alice"),
      event: "raised",
      resourceId: undefined,
    });

    assert.notStrictEqual(scoped, anywhere);
  });

  it("keys an attribute by subject, so a sweep cannot borrow another's answer", () => {
    assert.notStrictEqual(
      attributeKey(makeSubjectId("alice"), "clearance"),
      attributeKey(makeSubjectId("bob"), "clearance"),
    );
  });

  it("keys a custom predicate by subject, name and params, all three", () => {
    const alice = makeSubjectId("alice");
    const bob = makeSubjectId("bob");
    assert.notStrictEqual(
      customPredicateKey(alice, "isOwner", undefined),
      customPredicateKey(bob, "isOwner", undefined),
    );
    assert.notStrictEqual(
      customPredicateKey(alice, "isOwner", undefined),
      customPredicateKey(alice, "isEditor", undefined),
    );
    assert.notStrictEqual(
      customPredicateKey(alice, "isOwner", "doc-1"),
      customPredicateKey(alice, "isOwner", "doc-2"),
    );
  });

  it.effect("names itself around whatever it wrapped", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      const context = yield* Layer.build(capture.layer);

      // A wiring panel should report the whole stack rather than losing the
      // base implementation's identity — the same composition the retrying
      // wrapper performs.
      assert.strictEqual(
        Context.get(context, AttributeResolver).name,
        "attributeResolverFromRecord (capturing)",
      );
      assert.strictEqual(
        Context.get(context, RelationshipResolver).name,
        "relationshipResolverFromEdges (capturing)",
      );
      assert.strictEqual(
        Context.get(context, DecisionHistory).name,
        "decisionHistoryFromEvents (capturing)",
      );
      assert.strictEqual(
        Context.get(context, CustomPredicate).name,
        "CustomPredicateNone (capturing)",
      );
    }).pipe(Effect.scoped));

  it.effect("wrapping something unnamed says so rather than dropping the stack", () =>
    Effect.gen(function* () {
      const anonymous = Layer.mergeAll(
        Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(undefined) }),
        Layer.succeed(RelationshipResolver, { check: () => Effect.succeed(unknownRelated) }),
        Layer.succeed(DecisionHistory, { hasActed: () => Effect.succeed(unknownActed) }),
        Layer.succeed(CustomPredicate, { evaluate: () => Effect.succeed(false) }),
        Layer.succeed(SignatureHistory, { signaturesFor: () => Effect.succeed([]) }),
      );
      const context = yield* Layer.build(capturing(anonymous).layer);

      // `?` rather than nothing: a panel showing "(capturing)" alone would
      // suggest the base implementation had no identity, when in fact it
      // declined to give one.
      assert.strictEqual(Context.get(context, AttributeResolver).name, "? (capturing)");
      assert.strictEqual(Context.get(context, RelationshipResolver).name, "? (capturing)");
      assert.strictEqual(Context.get(context, DecisionHistory).name, "? (capturing)");
      assert.strictEqual(Context.get(context, CustomPredicate).name, "? (capturing)");
    }).pipe(Effect.scoped));

  it.effect("a replay layer names itself a snapshot", () =>
    Effect.gen(function* () {
      const context = yield* Layer.build(replayLayer(emptyAnswers));

      // The wiring panel must be able to say a simulation was answered from a
      // capture rather than from the store it was captured from.
      assert.strictEqual(Context.get(context, AttributeResolver).name, "snapshot");
      assert.strictEqual(Context.get(context, RelationshipResolver).name, "snapshot");
      assert.strictEqual(Context.get(context, DecisionHistory).name, "snapshot");
      assert.strictEqual(Context.get(context, CustomPredicate).name, "snapshot");
    }).pipe(Effect.scoped));

  it.effect("a fresh capture holds nothing", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      assert.strictEqual(answerCount(yield* capture.answers), 0);
    }));

  it("an empty capture is empty", () => {
    assert.strictEqual(answerCount(emptyAnswers), 0);
  });

  it.effect("counts every port's answers", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      yield* simulate(everything, alice, { source: live(capture.layer) });

      const answers = yield* capture.answers;
      assert.strictEqual(answerCount(answers), 3);
      assert.strictEqual(answers.attributes.size, 1);
      assert.strictEqual(answers.relationships.size, 1);
      assert.strictEqual(answers.history.size, 1);
    }));

  it.effect("counts a custom predicate's answer alongside the other three ports", () =>
    Effect.gen(function* () {
      const withCustom = Layer.mergeAll(
        attributeResolverFromRecord({ clearance: 4 }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        customPredicateFromRecord({ isOwner: () => Effect.succeed(true) }),
        SignatureHistoryNone,
      );
      const capture = capturing(withCustom);
      yield* simulate(
        allOf([hasAttribute("clearance", gte(2)), hasCustom("isOwner")]),
        alice,
        { source: live(capture.layer) },
      );

      // `-` in place of `+` would answer the same 1 here as it would answer
      // 3 above — this is the case that tells the two apart.
      assert.strictEqual(answerCount(yield* capture.answers), 2);
    }));

  it.effect("hands back a copy, so a later capture does not mutate an earlier snapshot", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      yield* simulate(hasAttribute("clearance", gte(2)), alice, { source: live(capture.layer) });
      const first = yield* capture.answers;

      yield* simulate(hasAttribute("dept", gte(0)), alice, { source: live(capture.layer) });

      assert.strictEqual(first.attributes.size, 1);
      assert.strictEqual((yield* capture.answers).attributes.size, 2);
    }));
});

describe("what a replayed failure carries", () => {
  /**
   * The error a replay reconstructs has to name the same thing the live one
   * did. Asserting only that it failed would let a replay report a failure
   * about the wrong attribute, relation or event — which is worse than no
   * replay, because it sends a reviewer to the wrong port.
   */
  it.effect("names the attribute, and carries the captured cause", () =>
    Effect.gen(function* () {
      const broken = Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          name: "broken",
          resolve: (_subjectId, attribute) =>
            Effect.fail(new AttributeResolveError({ attribute, cause: "store down" })),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);
      yield* simulate(hasAttribute("clearance", gte(1)), alice, { source: live(capture.layer) });

      const replayed = yield* simulate(hasAttribute("clearance", gte(1)), alice, {
        source: snapshot(yield* capture.answers),
      });

      assert.strictEqual(replayed._tag, "Failed");
      if (replayed._tag !== "Failed") return;
      assert.strictEqual(replayed.error._tag, "AttributeResolveError");
      assert.strictEqual(
        replayed.error._tag === "AttributeResolveError" ? replayed.error.attribute : "",
        "clearance",
      );
      assert.include(
        String(replayed.error._tag === "AttributeResolveError" ? replayed.error.cause : ""),
        "store down",
      );
    }));

  it.effect("names the relation and the resource", () =>
    Effect.gen(function* () {
      const broken = Layer.mergeAll(
        attributeResolverFromRecord({}),
        Layer.succeed(RelationshipResolver, {
          name: "broken",
          check: (request) =>
            Effect.fail(
              new RelationshipResolveError({
                relation: request.relation,
                resourceId: request.resourceId,
                cause: "graph down",
              }),
            ),
        }),
        DecisionHistoryUnknown,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);
      yield* simulate(hasRelationship("owner"), alice, { source: live(capture.layer) });

      const replayed = yield* simulate(hasRelationship("owner"), alice, {
        source: snapshot(yield* capture.answers),
      });

      assert.strictEqual(replayed._tag, "Failed");
      if (replayed._tag !== "Failed") return;
      assert.strictEqual(
        replayed.error._tag === "RelationshipResolveError" ? replayed.error.relation : "",
        "owner",
      );
    }));

  it.effect("names the event", () =>
    Effect.gen(function* () {
      const broken = Layer.mergeAll(
        attributeResolverFromRecord({}),
        RelationshipResolverNever,
        Layer.succeed(DecisionHistory, {
          name: "broken",
          hasActed: (query) =>
            Effect.fail(
              new DecisionHistoryUnavailable({ event: query.event, cause: "journal down" }),
            ),
        }),
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);
      yield* simulate(hasActed("raised"), alice, { source: live(capture.layer) });

      const replayed = yield* simulate(hasActed("raised"), alice, {
        source: snapshot(yield* capture.answers),
      });

      assert.strictEqual(replayed._tag, "Failed");
      if (replayed._tag !== "Failed") return;
      assert.strictEqual(
        replayed.error._tag === "DecisionHistoryUnavailable" ? replayed.error.event : "",
        "raised",
      );
    }));

  it.effect("a failure with no cause falls back to the error itself", () =>
    Effect.gen(function* () {
      // `cause` is typed `unknown`, so a resolver is free to give none. The
      // capture must still record *that* it broke, rather than storing the
      // string "undefined".
      const broken = Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          name: "broken",
          resolve: (_subjectId, attribute) =>
            Effect.fail(new AttributeResolveError({ attribute, cause: undefined })),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);
      yield* simulate(hasAttribute("clearance", gte(1)), alice, { source: live(capture.layer) });

      const recorded = (yield* capture.answers).attributes.get(
        attributeKey(makeSubjectId("alice"), "clearance"),
      );
      assert.strictEqual(recorded?._tag, "Broke");
      assert.include(
        recorded?._tag === "Broke" ? recorded.message : "",
        "AttributeResolveError",
      );
    }));

  it.effect("a port that was never reached captures nothing", () =>
    Effect.gen(function* () {
      const capture = capturing(
        Layer.mergeAll(
          attributeResolverFromRecord({}),
          RelationshipResolverNever,
          DecisionHistoryUnknown,
          CustomPredicateNone,
          SignatureHistoryNone,
        ),
      );
      // No resource, so `hasRelationship` fails with `MissingResourceId`
      // before the port is consulted at all.
      yield* simulate(hasRelationship("owner"), { subject: { id: "alice" } }, {
        source: live(capture.layer),
      });

      assert.strictEqual((yield* capture.answers).relationships.size, 0);
    }));

  it.effect("a cause that is an Error keeps its message", () =>
    Effect.gen(function* () {
      const broken = Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          name: "broken",
          resolve: (_subjectId, attribute) =>
            Effect.fail(
              new AttributeResolveError({ attribute, cause: new Error("connection refused") }),
            ),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);
      yield* simulate(hasAttribute("clearance", gte(1)), alice, { source: live(capture.layer) });

      const recorded = (yield* capture.answers).attributes.get(
        attributeKey(makeSubjectId("alice"), "clearance"),
      );
      // The message, not `[object Error]` — it is the part a reviewer reads.
      assert.strictEqual(recorded?._tag === "Broke" ? recorded.message : "", "connection refused");
    }));

  it.effect("a cause that cannot be stringified does not take the capture down", () =>
    Effect.gen(function* () {
      const hostile = { toString: () => { throw new Error("no"); } };
      const broken = Layer.mergeAll(
        Layer.succeed(AttributeResolver, {
          name: "broken",
          resolve: (_subjectId, attribute) =>
            Effect.fail(new AttributeResolveError({ attribute, cause: hostile })),
        }),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        CustomPredicateNone,
        SignatureHistoryNone,
      );
      const capture = capturing(broken);
      yield* simulate(hasAttribute("clearance", gte(1)), alice, { source: live(capture.layer) });

      const recorded = (yield* capture.answers).attributes.get(
        attributeKey(makeSubjectId("alice"), "clearance"),
      );
      assert.strictEqual(
        recorded?._tag === "Broke" ? recorded.message : "",
        "<unrenderable cause>",
      );
    }));
});

describe("replaying outside the captured set", () => {
  /**
   * E2.2 — a what-if that wanders past what was captured must deny for the
   * reason a misconfigured deployment would, not for one peculiar to this
   * panel.
   */
  it.effect("an unseen attribute answers as an unwired port does", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(
        hasAttribute("clearance", gte(1)),
        { subject: { id: "alice" } },
        { source: snapshot(emptyAnswers) },
      );

      // `undefined`, which fails the matcher — a denial, not an error.
      assert.strictEqual(decisionOf(outcome)._tag, "Deny");
    }));

  it.effect("an unseen relationship is Unknown, which denies", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(
        hasRelationship("owner"),
        { subject: { id: "alice" }, resource: { id: "doc-1" } },
        { source: snapshot(emptyAnswers) },
      );

      assert.strictEqual(decisionOf(outcome)._tag, "Deny");
    }));

  it.effect("an unseen history query is Unknown, which denies both directions", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(
        hasActed("raised"),
        { subject: { id: "alice" }, resource: { id: "doc-1" } },
        { source: snapshot(emptyAnswers) },
      );

      // ADR-QD-020's three-valued default: `Unknown` denies `hasActed` and
      // `hasNotActed` alike, which is the property a two-valued default could
      // not have — so both directions are asserted.
      assert.strictEqual(decisionOf(outcome)._tag, "Deny");

      // The *reason* is what distinguishes `Unknown` from any other answer:
      // an unrecognised value denies too, but reads as "the subject has not
      // performed" — which would tell a reviewer the history was consulted and
      // came back empty, when in fact nothing answered at all.
      assert.include(decisionOf(outcome).trace.reason ?? "", "no history is available");

      const negated = yield* simulate(
        hasNotActed("raised"),
        { subject: { id: "alice" }, resource: { id: "doc-1" } },
        { source: snapshot(emptyAnswers) },
      );
      assert.strictEqual(decisionOf(negated)._tag, "Deny");
      assert.include(decisionOf(negated).trace.reason ?? "", "no history is available");
    }));
});

describe("custom predicate capture", () => {
  const withCustom = Layer.mergeAll(
    attributeResolverFromRecord({}),
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    customPredicateFromRecord({
      isOwner: (subject) => Effect.succeed(subject.id === "alice"),
    }),
    SignatureHistoryNone,
  );

  it.effect("a snapshot replays a custom predicate's trace", () =>
    Effect.gen(function* () {
      const capture = capturing(withCustom);
      const policy = hasCustom("isOwner");

      const liveRun = decisionOf(
        yield* simulate(policy, alice, { source: live(capture.layer) }),
      );
      const answers = yield* capture.answers;
      const replayed = decisionOf(
        yield* simulate(policy, alice, { source: snapshot(answers) }),
      );

      assert.strictEqual(liveRun._tag, "Allow");
      assert.deepStrictEqual(diffTraces(liveRun.trace, replayed.trace), []);
    }));

  it.effect("records the custom predicate's answer, keyed by subject, name and params", () =>
    Effect.gen(function* () {
      const capture = capturing(withCustom);
      yield* simulate(hasCustom("isOwner"), alice, { source: live(capture.layer) });

      const answers = yield* capture.answers;
      assert.strictEqual(answers.custom.size, 1);
      assert.deepStrictEqual(
        answers.custom.get(customPredicateKey(makeSubjectId("alice"), "isOwner", undefined)),
        { _tag: "Answered", value: true },
      );
    }));

  // An unregistered name is a wiring mistake, not a legitimate denial — the
  // capture must reproduce it as a failure, never as a miss.
  it.effect("an unregistered custom predicate errors, and replays as the same error", () =>
    Effect.gen(function* () {
      const capture = capturing(withCustom);
      const policy = hasCustom("noSuchPredicate");

      const liveRun = yield* simulate(policy, alice, { source: live(capture.layer) });
      const replayed = yield* simulate(policy, alice, {
        source: snapshot(yield* capture.answers),
      });

      assert.strictEqual(liveRun._tag, "Failed");
      assert.strictEqual(replayed._tag, "Failed");
      if (replayed._tag !== "Failed") return;
      assert.strictEqual(replayed.error._tag, "CustomPredicateError");
      assert.strictEqual(
        replayed.error._tag === "CustomPredicateError" ? replayed.error.name : "",
        "noSuchPredicate",
      );
      assert.isAbove(
        (replayed.error._tag === "CustomPredicateError" ? replayed.error.reason : "").length,
        0,
      );
    }));

  it.effect("an unseen custom predicate answers false, which denies", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasCustom("isOwner"), alice, {
        source: snapshot(emptyAnswers),
      });
      assert.strictEqual(decisionOf(outcome)._tag, "Deny");
    }));
});
