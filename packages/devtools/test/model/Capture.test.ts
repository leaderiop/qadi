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
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import {
  allOf,
  AttributeResolver,
  attributeResolverFromRecord,
  CustomPredicate,
  customPredicateFromRecord,
  describeKeyRefusal,
  DecisionHistory,
  decisionHistoryFromEvents,
  diffTraces,
  gte,
  hasActed,
  hasAttribute,
  hasCustom,
  hasNotActed,
  hasRelationship,
  hasSignature,
  not,
  attributeResolverPort,
  customPredicatePort,
  makeResourceId,
  makeSubject,
  makeSubjectId,
  relationshipResolverFromEdges,
  RelationshipResolver,
  scriptedPort,
  PortReply,
  relationshipResolverPort,
  decisionHistoryPort,
  signatureHistoryFromSignatures,
  signatureHistoryPort,
  portsLayer,
  forEveryPort,
  mergePorts,
  tabulatePorts,
} from "@qadi/core";
import type { Decision, DecisionOutcome, KeyRefusal } from "@qadi/core";
import {
  answerCount,
  capturing,
  emptyAnswers,
  replayLayer,
} from "../../src/model/Capture.ts";
import { simulate } from "../../src/model/Simulation.ts";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { live, snapshot } from "../../src/model/SimulationSource.ts";

/** A request key's text; a refusal fails the test, since these requests are all keyable. */
const keyText = (key: Result.Result<string, KeyRefusal>): string => {
  if (Result.isFailure(key)) return assert.fail(`refused: ${describeKeyRefusal(key.failure)}`);
  return key.success;
};

const decisionOf = (outcome: DecisionOutcome): Decision => {
  if (outcome._tag !== "Decided") throw new Error("expected a decision");
  return outcome.decision;
};

/** A stand-in for a real deployment's ports. */
const realPorts = portsLayer({
  AttributeResolver: attributeResolverFromRecord({ clearance: 4, dept: "eng" }),
  RelationshipResolver: relationshipResolverFromEdges([{ subjectId: "alice", relation: "owner", resourceId: "doc-1" }]),
  DecisionHistory: decisionHistoryFromEvents([{ subjectId: "alice", event: "raised", resourceId: "doc-1" }]),
});

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
      const broken = portsLayer({
        AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("store down"), "broken").layer,
      });
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
      const recorded = answers.AttributeResolver.get(keyText(attributeResolverPort.key([makeSubjectId("alice"), "clearance"])));
      assert.strictEqual(recorded?._tag, "Broke");
      assert.include(recorded?._tag === "Broke" ? recorded.message : "", "store down");
    }));

  it.effect("a relationship outage replays as an outage", () =>
    Effect.gen(function* () {
      const broken = portsLayer({
        AttributeResolver: attributeResolverFromRecord({}),
        RelationshipResolver: scriptedPort(relationshipResolverPort, () => PortReply.fail("graph down"), "broken").layer,
      });
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
      const broken = portsLayer({
        AttributeResolver: attributeResolverFromRecord({}),
        DecisionHistory: scriptedPort(decisionHistoryPort, () => PortReply.fail("journal down"), "broken").layer,
      });
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

describe("capture fidelity — a key covers every argument the port received (ARCH-45 I1)", () => {
  const tagOf = (outcome: DecisionOutcome): string =>
    outcome._tag === "Decided" ? outcome.decision._tag : outcome._tag;

  it.effect("a policy asking one relation at two depths replays as it ran", () =>
    Effect.gen(function* () {
      // A traversing resolver: related only when the hop budget is at least 2.
      const traversing = Layer.succeed(RelationshipResolver, {
        name: "traversing",
        check: (request) => Effect.succeed((request.depth ?? 64) >= 2 ? "Related" : "Unrelated"),
      });
      const ports = portsLayer({ RelationshipResolver: traversing });
      // "a member, but not a direct one"
      const indirect = allOf([
        not(hasRelationship("member", { depth: 1 })),
        hasRelationship("member", { depth: 3 }),
      ]);
      const capture = capturing(ports);
      const liveRun = decisionOf(yield* simulate(indirect, alice, { source: live(capture.layer) }));
      const replayed = decisionOf(
        yield* simulate(indirect, alice, { source: snapshot(yield* capture.answers) }),
      );
      assert.strictEqual(liveRun._tag, "Allow");
      assert.strictEqual(replayed._tag, liveRun._tag);
      assert.deepStrictEqual(diffTraces(liveRun.trace, replayed.trace), []);
    }));

  it.effect("a capture for one resource does not answer another", () =>
    Effect.gen(function* () {
      const owns = Layer.succeed(CustomPredicate, {
        name: "owns",
        evaluate: (_name, _subject, resource) => Effect.succeed(resource?.id === "doc-1"),
      });
      const ports = portsLayer({ CustomPredicate: owns });
      const policy = hasCustom("owns");
      const capture = capturing(ports);
      yield* simulate(policy, alice, { source: live(capture.layer) });
      const answers = yield* capture.answers;

      const other: SimulationInput = { subject: { id: "alice" }, resource: { id: "doc-2" } };
      const liveRun = yield* simulate(policy, other, { source: live(ports) });
      const replayed = yield* simulate(policy, other, { source: snapshot(answers) });
      assert.strictEqual(tagOf(liveRun), "Deny");
      assert.strictEqual(tagOf(replayed), tagOf(liveRun));
    }));

  it.effect("a capture does not answer a what-if that changed the subject's roles", () =>
    Effect.gen(function* () {
      const byRole = Layer.succeed(CustomPredicate, {
        name: "byRole",
        evaluate: (_name, subject) => Effect.succeed(Array.from(subject.roles, String).includes("editor")),
      });
      const ports = portsLayer({ CustomPredicate: byRole });
      const policy = hasCustom("isEditor");
      const capture = capturing(ports);
      const asEditor: SimulationInput = {
        subject: { id: "alice", roles: ["editor"] },
        resource: { id: "doc-1" },
      };
      assert.strictEqual(
        tagOf(yield* simulate(policy, asEditor, { source: live(capture.layer) })),
        "Allow",
      );
      const answers = yield* capture.answers;

      const dropped: SimulationInput = {
        subject: { id: "alice", roles: [] },
        resource: { id: "doc-1" },
      };
      const liveRun = yield* simulate(policy, dropped, { source: live(ports) });
      const replayed = yield* simulate(policy, dropped, { source: snapshot(answers) });
      assert.strictEqual(tagOf(liveRun), "Deny");
      assert.strictEqual(tagOf(replayed), "Deny");
    }));
});

describe("what a capture records", () => {
  it.effect("records the answer, not merely that a call happened", () =>
    Effect.gen(function* () {
      const capture = capturing(realPorts);
      yield* simulate(hasAttribute("clearance", gte(2)), alice, { source: live(capture.layer) });

      const answers = yield* capture.answers;
      const recorded = answers.AttributeResolver.get(keyText(attributeResolverPort.key([makeSubjectId("alice"), "clearance"])));

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
      assert.strictEqual(answers.AttributeResolver.size, 2);
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

      assert.strictEqual((yield* capture.answers).AttributeResolver.size, 1);
    }));

  // E2.6/E2.7 and the subject axis — how each port's request is keyed — are
  // now each port's description's `key`, pinned exactly and for distinctness
  // in `@qadi/core`'s `PortConformance.test.ts` ("request keys").

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

  it.effect("builds the wrapped ports exactly once, no matter how many of the ports a run reaches", () =>
    Effect.gen(function* () {
      let builds = 0;
      const counted = Layer.unwrap(
        Effect.sync(() => {
          builds += 1;
          return portsLayer();
        }),
      );

      const context = yield* Layer.build(capturing(counted).layer);
      // Reaching every wrapped service is what one `Layer.build(ports)` per
      // wrapper used to do independently.
      forEveryPort((d) => Context.get(context, d.service));

      assert.strictEqual(builds, 1);
    }).pipe(Effect.scoped));

  it.effect("wrapping something unnamed says so rather than dropping the stack", () =>
    Effect.gen(function* () {
      // Every port, each with no name at all.
      const anonymous = mergePorts(
        tabulatePorts((d) =>
          Layer.succeed(d.service, {
            ...d.make("x", () => Effect.succeed(d.none.answer)),
            name: undefined,
          }),
        ),
      );
      const context = yield* Layer.build(capturing(anonymous).layer);

      // `?` rather than nothing: a panel showing "(capturing)" alone would
      // suggest the base implementation had no identity, when in fact it
      // declined to give one.
      assert.deepStrictEqual(
        forEveryPort((d) => Context.get(context, d.service).name),
        forEveryPort(() => "? (capturing)"),
      );
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
      assert.strictEqual(answers.AttributeResolver.size, 1);
      assert.strictEqual(answers.RelationshipResolver.size, 1);
      assert.strictEqual(answers.DecisionHistory.size, 1);
    }));

  it.effect("counts a custom predicate's answer alongside the other three ports", () =>
    Effect.gen(function* () {
      const withCustom = portsLayer({
        AttributeResolver: attributeResolverFromRecord({ clearance: 4 }),
        CustomPredicate: customPredicateFromRecord({ isOwner: () => Effect.succeed(true) }),
      });
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

      assert.strictEqual(first.AttributeResolver.size, 1);
      assert.strictEqual((yield* capture.answers).AttributeResolver.size, 2);
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
      const broken = portsLayer({
        AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("store down"), "broken").layer,
      });
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
      const broken = portsLayer({
        AttributeResolver: attributeResolverFromRecord({}),
        RelationshipResolver: scriptedPort(relationshipResolverPort, () => PortReply.fail("graph down"), "broken").layer,
      });
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
      const broken = portsLayer({
        AttributeResolver: attributeResolverFromRecord({}),
        DecisionHistory: scriptedPort(decisionHistoryPort, () => PortReply.fail("journal down"), "broken").layer,
      });
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
      const broken = portsLayer({
        AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail(undefined), "broken").layer,
      });
      const capture = capturing(broken);
      yield* simulate(hasAttribute("clearance", gte(1)), alice, { source: live(capture.layer) });

      const recorded = (yield* capture.answers).AttributeResolver.get(
        keyText(attributeResolverPort.key([makeSubjectId("alice"), "clearance"])),
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
        portsLayer({ AttributeResolver: attributeResolverFromRecord({}) }),
      );
      // No resource, so `hasRelationship` fails with `MissingResourceId`
      // before the port is consulted at all.
      yield* simulate(hasRelationship("owner"), { subject: { id: "alice" } }, {
        source: live(capture.layer),
      });

      assert.strictEqual((yield* capture.answers).RelationshipResolver.size, 0);
    }));

  it.effect("a cause that is an Error keeps its message", () =>
    Effect.gen(function* () {
      const broken = portsLayer({
        AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail(new Error("connection refused")), "broken").layer,
      });
      const capture = capturing(broken);
      yield* simulate(hasAttribute("clearance", gte(1)), alice, { source: live(capture.layer) });

      const recorded = (yield* capture.answers).AttributeResolver.get(
        keyText(attributeResolverPort.key([makeSubjectId("alice"), "clearance"])),
      );
      // The message, not `[object Error]` — it is the part a reviewer reads.
      assert.strictEqual(recorded?._tag === "Broke" ? recorded.message : "", "connection refused");
    }));

  it.effect("a cause that cannot be stringified does not take the capture down", () =>
    Effect.gen(function* () {
      const hostile = { toString: () => { throw new Error("no"); } };
      const broken = portsLayer({
        AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail(hostile), "broken").layer,
      });
      const capture = capturing(broken);
      yield* simulate(hasAttribute("clearance", gte(1)), alice, { source: live(capture.layer) });

      const recorded = (yield* capture.answers).AttributeResolver.get(
        keyText(attributeResolverPort.key([makeSubjectId("alice"), "clearance"])),
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
  const withCustom = portsLayer({
    AttributeResolver: attributeResolverFromRecord({}),
    CustomPredicate: customPredicateFromRecord({
      isOwner: (subject) => Effect.succeed(subject.id === "alice"),
    }),
  });

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

  it.effect("records the custom predicate's answer, keyed by the whole request", () =>
    Effect.gen(function* () {
      const capture = capturing(withCustom);
      yield* simulate(hasCustom("isOwner"), alice, { source: live(capture.layer) });

      const answers = yield* capture.answers;
      assert.strictEqual(answers.CustomPredicate.size, 1);
      assert.deepStrictEqual(
        answers.CustomPredicate.get(keyText(customPredicatePort.key([
          "isOwner",
          makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} }),
          { id: "doc-1" },
          undefined,
        ]))),
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

/**
 * A Date and its ISO string are different questions to the evaluator (`Equal.equals`), and
 * were one question to the capture's key, so a replay handed one the other's captured answer.
 */
describe("a key does not collapse two questions the evaluator tells apart (ARCH-65)", () => {
  const withDated = portsLayer({
    AttributeResolver: attributeResolverFromRecord({}),
    CustomPredicate: customPredicateFromRecord({
      isDated: (_subject, _resource, params) => Effect.succeed(params instanceof Date),
    }),
  });

  it.effect("a Date param's captured allow does not answer its ISO string's question", () =>
    Effect.gen(function* () {
      const capture = capturing(withDated);
      const liveRun = decisionOf(
        yield* simulate(hasCustom("isDated", new Date(0)), alice, { source: live(capture.layer) }),
      );
      assert.strictEqual(liveRun._tag, "Allow");

      const answers = yield* capture.answers;
      const replayed = yield* simulate(hasCustom("isDated", "1970-01-01T00:00:00.000Z"), alice, {
        source: snapshot(answers),
      });
      // A miss may deny or fail, whichever the replay miss policy says; it may never allow.
      if (replayed._tag === "Decided") assert.notStrictEqual(replayed.decision._tag, "Allow");
      else assert.strictEqual(replayed._tag, "Failed");
    }));
});

/**
 * A request holding a value outside the key's domain (here a function param) has no key.
 * Capturing must not change what the live port answers, and a replay cannot know what was
 * answered, so it fails with the port's own error rather than answering `false`, which
 * `not(...)` would grant.
 */
describe("a request with no key (KEY-03)", () => {
  const withParams = portsLayer({
    AttributeResolver: attributeResolverFromRecord({}),
    CustomPredicate: customPredicateFromRecord({
      isCallable: (_subject, _resource, params) => Effect.succeed(typeof params === "function"),
    }),
  });
  const subject = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
  const params = () => true;
  const ask = CustomPredicate.evaluate("isCallable", subject, undefined, params);

  it.effect("is passed through to the live port unrecorded, answering as an uncaptured run does", () =>
    Effect.gen(function* () {
      const capture = capturing(withParams);
      const uncaptured = yield* Effect.exit(ask.pipe(Effect.provide(withParams)));
      const captured = yield* Effect.exit(ask.pipe(Effect.provide(capture.layer)));

      assert.deepStrictEqual(uncaptured, Exit.succeed(true));
      assert.deepStrictEqual(captured, uncaptured);
      assert.strictEqual((yield* capture.answers).CustomPredicate.size, 0);
    }));

  it.effect("fails on replay with the port's own error, naming why it has no key", () =>
    Effect.gen(function* () {
      const capture = capturing(withParams);
      yield* ask.pipe(Effect.provide(capture.layer));
      const refused = customPredicatePort.key(["isCallable", subject, undefined, params]);
      assert.isTrue(Result.isFailure(refused));
      if (Result.isSuccess(refused)) return;

      const replayed = yield* Effect.flip(ask.pipe(Effect.provide(replayLayer(yield* capture.answers))));
      assert.strictEqual(replayed._tag, "CustomPredicateError");
      assert.strictEqual(replayed.name, "isCallable");
      assert.strictEqual(
        replayed.reason,
        `this CustomPredicate request cannot be keyed: ${describeKeyRefusal(refused.failure)}`,
      );
    }));
});

describe("replaying a signature request the capture never saw (code review WR-04)", () => {
  /**
   * `SignatureHistory`'s key carries the asker's `meaning` and `signerRole`, which a
   * store receives and answers whatever they say. A what-if that edits either asks a
   * request the capture never saw, so the replay cannot know what the store would
   * have said. Answering the empty list would claim "no signatures on file", which
   * denies `hasSignature` and grants `not(hasSignature)`.
   */
  const withSignature = portsLayer({
    AttributeResolver: attributeResolverFromRecord({}),
    SignatureHistory: signatureHistoryFromSignatures([
      { subjectId: "alice", meaning: "approve", resourceId: "doc-1" },
    ]),
  });

  const capture = Effect.gen(function* () {
    const capturer = capturing(withSignature);
    const liveRun = decisionOf(
      yield* simulate(hasSignature("approve"), alice, { source: live(capturer.layer) }),
    );
    return { liveRun, answers: yield* capturer.answers };
  });

  it.effect("a captured signature answer still replays exactly", () =>
    Effect.gen(function* () {
      const { liveRun, answers } = yield* capture;
      const replayed = decisionOf(
        yield* simulate(hasSignature("approve"), alice, { source: snapshot(answers) }),
      );

      assert.strictEqual(liveRun._tag, "Allow");
      assert.strictEqual(replayed._tag, "Allow");
      assert.deepStrictEqual(diffTraces(liveRun.trace, replayed.trace), []);

      const recorded = answers.SignatureHistory.get(
        keyText(signatureHistoryPort.key([
          { subjectId: makeSubjectId("alice"), resourceId: makeResourceId("doc-1"), meaning: "approve" },
        ])),
      );
      assert.strictEqual(recorded?._tag, "Answered");
    }));

  it.effect("an edited meaning is an outage, under the node and under not(...)", () =>
    Effect.gen(function* () {
      const { answers } = yield* capture;
      const edited = hasSignature("review");

      // The real store answers every signature on file whatever the requirement
      // says, so it would have denied `hasSignature("review")` and granted its
      // negation. The replay must not guess either.
      for (const policy of [edited, not(edited)]) {
        const outcome = yield* simulate(policy, alice, { source: snapshot(answers) });
        assert.strictEqual(outcome._tag, "Failed");
        if (outcome._tag !== "Failed") return;
        assert.strictEqual(outcome.error._tag, "SignatureHistoryUnavailable");
        assert.include(String(outcome.error.cause), "not captured");
      }
    }));

  it.effect("an edited signer role is an outage too", () =>
    Effect.gen(function* () {
      const { answers } = yield* capture;
      const outcome = yield* simulate(
        not(hasSignature("approve", { signerRole: "manager" })),
        alice,
        { source: snapshot(answers) },
      );

      assert.strictEqual(outcome._tag, "Failed");
    }));

  it.effect("an empty capture fails a signature request instead of denying it", () =>
    Effect.gen(function* () {
      const outcome = yield* simulate(hasSignature("approve"), alice, {
        source: snapshot(emptyAnswers),
      });

      assert.strictEqual(outcome._tag, "Failed");
    }));

  it.effect("another port's unseen request still answers its own default", () =>
    Effect.gen(function* () {
      // Each decides (a denial), none fails: only SignatureHistory's miss is an outage.
      for (const policy of [
        hasAttribute("clearance", gte(1)),
        hasRelationship("owner"),
        hasActed("raised"),
        hasCustom("isOwner"),
      ]) {
        const outcome = yield* simulate(policy, alice, { source: snapshot(emptyAnswers) });
        assert.strictEqual(decisionOf(outcome)._tag, "Deny");
      }
    }));
});
