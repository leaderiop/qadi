import { assert, describe, it } from "@effect/vitest";
import {
  AttributeResolver,
  CustomPredicate,
  DecisionHistory,
  PortReply,
  RelationshipResolver,
  SignatureHistory,
  anyOf,
  attributeResolverFromRecord,
  attributeResolverPort,
  customPredicateFromRecord,
  customPredicatePort,
  decisionHistoryFromEvents,
  decisionHistoryPort,
  makeResourceId,
  makeSubjectId,
  recordingPort,
  relationshipResolverPort,
  scriptedPort,
  signatureHistoryFromSignatures,
  signatureHistoryPort,
  evaluate,
  gte,
  hasActed,
  hasAttribute,
  hasCustom,
  hasNotActed,
  hasRelationship,
  hasRole,
  hasSignature,
  isAllowed,
  filterSubjects,
} from "@qadi/core";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import {
  administrator,
  qadiReviewLayer,
  qadiTestLayer,
  nobody,
  policies,
  subjectWith,
  viewer,
} from "../src/index.ts";

describe("fixtures", () => {
  it("the administrator inherits the whole role chain", () => {
    assert.deepStrictEqual([...administrator.roles].sort(), ["admin", "editor", "viewer"]);
    assert.deepStrictEqual([...administrator.permissions].sort(), [
      "doc:delete",
      "doc:read",
      "doc:write",
    ]);
  });

  it("the viewer holds only read", () => {
    assert.deepStrictEqual([...viewer.permissions], ["doc:read"]);
  });

  it("nobody holds nothing", () => {
    assert.strictEqual(nobody.permissions.size, 0);
  });

  it("subjectWith defaults its id when none is given", () => {
    assert.strictEqual(subjectWith({}).id, "test-subject");
  });
});

describe("qadiTestLayer", () => {
  it.effect("wires a complete environment with deterministic ids", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(policies.canRead);
      assert.isTrue(isAllowed(d));
      assert.strictEqual(d.evaluationId, "eval-1");
    }).pipe(Effect.provide(qadiTestLayer(administrator))));

  it.effect("honours a custom id prefix", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(policies.canRead);
      assert.strictEqual(d.evaluationId, "run-1");
    }).pipe(Effect.provide(qadiTestLayer(administrator, { idPrefix: "run" }))));

  it.effect("defaults fail closed", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasRelationship("owner"), { resource: { id: "d" } });
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(qadiTestLayer(nobody))));

  it.effect("hasCustom denies when no registry is wired", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasCustom("isOwner"));
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(qadiTestLayer(nobody))));

  it.effect("resolves configured attributes", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasAttribute("tier", gte(3)));
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(qadiTestLayer(nobody, { attributes: { tier: 5 } }))));

  it.effect("resolves configured relationships", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasRelationship("owner"), { resource: { id: "d1" } });
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(
        qadiTestLayer(subjectWith({ id: "u1" }), {
          relationships: [{ subjectId: "u1", relation: "owner", resourceId: "d1" }],
        }),
      ),
    ));

  it.effect("resolves configured signatures", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasSignature("approved"), { resource: { id: "d1" } });
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(
        qadiTestLayer(subjectWith({ id: "u1" }), {
          signatures: [{ subjectId: "u1", resourceId: "d1", meaning: "approved" }],
        }),
      ),
    ));

  it.effect("hasSignature denies when no signature history is wired", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasSignature("approved"), { resource: { id: "d1" } });
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(qadiTestLayer(nobody))));
});

/**
 * CCR-QD-069's gap, closed.
 *
 * Revision 0.1 of the devtools overview claimed "clock and evaluation ids
 * reproducible". Only the ids were — `evaluationIdSequential` is wired here and
 * nothing was. **One half of a determinism claim is worse than neither**,
 * because it is believed.
 *
 * Every case below runs under `it.live` rather than `it.effect`, and that is the
 * whole reason the gap survived: `@effect/vitest` supplies a `TestClock` to
 * `it.effect`, so a test suite already had one and never noticed the fixtures
 * did not. Anything without that ambient help — a simulator in a browser, a
 * script — did.
 */
describe("the clock", () => {
  it.live("defaults to the runtime's own, which nothing here shadows", () =>
    Effect.gen(function* () {
      const decision = yield* evaluate(policies.canRead);

      assert.isTrue(isAllowed(decision));
      assert.isAbove(yield* Clock.currentTimeMillis, 0);
    }).pipe(Effect.provide(qadiTestLayer(administrator))));

  it.live("makes durations reproducible when asked for", () =>
    Effect.gen(function* () {
      const decision = yield* evaluate(policies.canRead);

      assert.isTrue(isAllowed(decision));
      assert.strictEqual(yield* Clock.currentTimeMillis, 0);
      // The point of the option: two decisions compared field by field agree on
      // this one, where under a live clock they agree only by luck.
      assert.strictEqual(decision.durationMillis, 0);
    }).pipe(Effect.provide(qadiTestLayer(administrator, { clock: "test" }))));

  it.live("is the same option on the review layer, which has no subject", () =>
    Effect.gen(function* () {
      const test = yield* Layer.build(qadiReviewLayer({ clock: "test" }));
      const live = yield* Layer.build(qadiReviewLayer());

      assert.strictEqual(Context.get(test, Clock.Clock).currentTimeMillisUnsafe(), 0);
      assert.isAbove(Context.get(live, Clock.Clock).currentTimeMillisUnsafe(), 0);
    }).pipe(Effect.scoped));

  it.live("leaves the ids deterministic either way", () =>
    Effect.gen(function* () {
      const decision = yield* evaluate(policies.canRead);

      assert.strictEqual(decision.evaluationId, "eval-1");
    }).pipe(Effect.provide(qadiTestLayer(administrator, { clock: "test" }))));

  /**
   * `QadiReviewLayer.ts`'s `clock` option previously documented that driving
   * this inner clock forward — not just observing its frozen zero — was not
   * possible without an unsafe cast, and told a caller to fall back to
   * `it.live` and read time only. That claim was wrong: `TestClock.adjust`
   * reads whichever `Clock` is current via the same fiber ref
   * `Clock.currentTimeMillis` above already reads correctly, so calling it
   * from *inside* the same effect this layer is provided to reaches the inner
   * clock, not `it.effect`'s ambient one — no handle, no cast, and `it.effect`
   * rather than `it.live`.
   */
  it.effect("can be driven forward via TestClock.adjust from inside the provided effect", () =>
    Effect.gen(function* () {
      yield* TestClock.adjust("2 hours");
      const decision = yield* evaluate(policies.canRead);

      assert.isTrue(isAllowed(decision));
      assert.strictEqual(yield* Clock.currentTimeMillis, 2 * 60 * 60 * 1000);
      assert.strictEqual(decision.durationMillis, 0);
    }).pipe(Effect.provide(qadiTestLayer(administrator, { clock: "test" }))));
});

describe("ports and data options", () => {
  it.effect("an explicit port wins over the matching data option", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasAttribute("tier", gte(3)));
      assert.isFalse(isAllowed(d));
    }).pipe(
      Effect.provide(
        qadiTestLayer(nobody, {
          attributes: { tier: 5 },
          ports: {
            AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.answer(1)).layer,
          },
        }),
      ),
    ));

  it.effect("a port left out of `ports` keeps its data option", () =>
    Effect.gen(function* () {
      assert.isTrue(isAllowed(yield* evaluate(hasAttribute("tier", gte(3)))));
    }).pipe(
      Effect.provide(
        qadiTestLayer(nobody, {
          attributes: { tier: 5 },
          ports: { CustomPredicate: customPredicateFromRecord({}) },
        }),
      ),
    ));

  it.effect("a recording port records what an evaluation asked, in order", () =>
    Effect.gen(function* () {
      const resolver = recordingPort(attributeResolverPort, attributeResolverFromRecord({ tier: 5 }));
      // anyOf/First short-circuits, so only the first attribute is fetched.
      const policy = anyOf([hasAttribute("tier", gte(1)), hasAttribute("other", gte(1))]);

      yield* evaluate(policy).pipe(
        Effect.provide(qadiTestLayer(nobody, { ports: { AttributeResolver: resolver.layer } })),
      );

      assert.deepStrictEqual(resolver.calls, [[nobody.id, "tier"]]);
    }));

  it.effect("the relationships option ANSWERS Unrelated for an edge it does not hold, never Unknown", () =>
    Effect.gen(function* () {
      // A fixture edge list is the store, so a miss is a closed-world "no" and
      // the denial should name the missing edge. `"Unknown"` is reserved for a
      // resolver that was never wired (INV-QD-029), which this one plainly was.
      const d = yield* evaluate(hasRelationship("owner"), { resource: { id: "d2" } });
      assert.strictEqual(d._tag, "Deny");
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject 'u1' has no 'owner' relation to 'd2'");
    }).pipe(
      Effect.provide(
        qadiTestLayer(subjectWith({ id: "u1" }), {
          relationships: [{ subjectId: "u1", relation: "owner", resourceId: "d1" }],
        }),
      ),
    ));

  it.effect("a failing port surfaces an error, not a denial, for every port", () =>
    Effect.gen(function* () {
      const failing = { resource: { id: "d1" } };
      const cases = [
        {
          policy: hasAttribute("x", gte(1)),
          ports: { AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer },
          tag: "AttributeResolveError",
        },
        {
          policy: hasRelationship("owner"),
          ports: {
            RelationshipResolver: scriptedPort(relationshipResolverPort, () => PortReply.fail("down")).layer,
          },
          tag: "RelationshipResolveError",
        },
        {
          policy: hasActed("raised"),
          ports: { DecisionHistory: scriptedPort(decisionHistoryPort, () => PortReply.fail("down")).layer },
          tag: "DecisionHistoryUnavailable",
        },
        {
          policy: hasCustom("isOwner"),
          ports: { CustomPredicate: scriptedPort(customPredicatePort, () => PortReply.fail("down")).layer },
          tag: "CustomPredicateError",
        },
        {
          policy: hasSignature("approved"),
          ports: { SignatureHistory: scriptedPort(signatureHistoryPort, () => PortReply.fail("down")).layer },
          tag: "SignatureHistoryUnavailable",
        },
      ];
      for (const { policy, ports, tag } of cases) {
        const r = yield* Effect.result(
          evaluate(policy, failing).pipe(Effect.provide(qadiTestLayer(subjectWith({ id: "u1" }), { ports }))),
        );
        assert.strictEqual(r._tag, "Failure", tag);
        if (r._tag === "Failure") assert.strictEqual(r.failure._tag, tag);
      }
    }));

  it.effect("a registry wired through `ports` fails on an unlisted name rather than denying", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(evaluate(hasCustom("isOwner")));
      assert.strictEqual(r._tag, "Failure");
    }).pipe(
      Effect.provide(qadiTestLayer(nobody, { ports: { CustomPredicate: customPredicateFromRecord({}) } })),
    ));

  it.effect("each data option is that port's core fixture, and says so", () =>
    Effect.gen(function* () {
      // Diagnostics read these names (`@qadi/devtools`' wiring panel, the
      // wrappers' composed names), so the fixture a data option builds is named.
      assert.strictEqual((yield* AttributeResolver).name, "attributeResolverFromRecord");
      assert.strictEqual((yield* RelationshipResolver).name, "relationshipResolverFromEdges");
      assert.strictEqual((yield* DecisionHistory).name, "decisionHistoryFromEvents");
      assert.strictEqual((yield* SignatureHistory).name, "signatureHistoryFromSignatures");
      assert.strictEqual((yield* CustomPredicate).name, "CustomPredicateNone");
    }).pipe(
      Effect.provide(
        qadiTestLayer(nobody, { attributes: {}, relationships: [], history: [], signatures: [] }),
      ),
    ));
});

describe("the history option", () => {
  const clerk = subjectWith({ id: "u1" });
  const clerkId = makeSubjectId("u1");

  it.effect("answers a keyed question, and a recording port shows what was asked", () =>
    Effect.gen(function* () {
      const history = recordingPort(
        decisionHistoryPort,
        decisionHistoryFromEvents([{ subjectId: "u1", event: "raised", resourceId: "inv-1" }]),
      );
      const layer = qadiTestLayer(clerk, { ports: { DecisionHistory: history.layer } });

      const own = yield* evaluate(hasNotActed("raised"), { resource: { id: "inv-1" } }).pipe(
        Effect.provide(layer),
      );
      const other = yield* evaluate(hasNotActed("raised"), { resource: { id: "inv-2" } }).pipe(
        Effect.provide(layer),
      );

      assert.isFalse(isAllowed(own));
      assert.isTrue(isAllowed(other));
      assert.deepStrictEqual(history.calls, [
        [{ subjectId: clerkId, event: "raised", resourceId: makeResourceId("inv-1") }],
        [{ subjectId: clerkId, event: "raised", resourceId: makeResourceId("inv-2") }],
      ]);
    }));

  it.effect("answers 'ever, at all' when the query carries no resource", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasActed("raised", { scope: "Any" }));
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(
        qadiTestLayer(clerk, {
          history: [{ subjectId: "u1", event: "raised", resourceId: "inv-9" }],
        }),
      ),
    ));

  it.effect("the `history` shorthand wires the same layer", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(hasActed("raised"), { resource: { id: "inv-1" } });
      assert.isTrue(isAllowed(d));
    }).pipe(
      Effect.provide(
        qadiTestLayer(clerk, {
          history: [{ subjectId: "u1", event: "raised", resourceId: "inv-1" }],
        }),
      ),
    ));

  it.effect("the default port knows nothing, so both polarities deny", () =>
    Effect.gen(function* () {
      // A closed event list says "NotActed"; the *default* says "Unknown", and
      // the two are different answers — ADR-QD-020.
      const resource = { resource: { id: "inv-1" } };
      assert.isFalse(isAllowed(yield* evaluate(hasActed("raised"), resource)));
      assert.isFalse(isAllowed(yield* evaluate(hasNotActed("raised"), resource)));
    }).pipe(Effect.provide(qadiTestLayer(clerk))));
});

describe("the signatures option", () => {
  it.effect("asks subject-global and resource-scoped questions as different queries", () =>
    Effect.gen(function* () {
      const history = recordingPort(
        signatureHistoryPort,
        signatureHistoryFromSignatures([
          { subjectId: "subjectA", resourceId: "resourceX", meaning: "approved" },
        ]),
      );

      yield* evaluate(hasSignature("approved", { scope: "Any" })).pipe(
        Effect.provide(
          qadiTestLayer(subjectWith({ id: "subjectA" }), { ports: { SignatureHistory: history.layer } }),
        ),
      );
      yield* evaluate(hasSignature("approved"), { resource: { id: "resourceX" } }).pipe(
        Effect.provide(
          qadiTestLayer(subjectWith({ id: "subjectB" }), { ports: { SignatureHistory: history.layer } }),
        ),
      );

      assert.deepStrictEqual(history.calls, [
        [{ subjectId: makeSubjectId("subjectA"), resourceId: undefined }],
        [{ subjectId: makeSubjectId("subjectB"), resourceId: makeResourceId("resourceX") }],
      ]);
    }));
});

describe("fixture policies", () => {
  it.effect("canReadAndWrite requires both", () =>
    Effect.gen(function* () {
      assert.isFalse(isAllowed(yield* evaluate(policies.canReadAndWrite)));
    }).pipe(Effect.provide(qadiTestLayer(viewer))));

  it.effect("adminOrReader accepts either", () =>
    Effect.gen(function* () {
      assert.isTrue(isAllowed(yield* evaluate(policies.adminOrReader)));
    }).pipe(Effect.provide(qadiTestLayer(viewer))));

  it.effect("isAdmin matches the inherited role name", () =>
    Effect.gen(function* () {
      assert.isTrue(isAllowed(yield* evaluate(policies.isAdmin)));
      assert.isFalse(isAllowed(yield* evaluate(hasRole("nope"))));
    }).pipe(Effect.provide(qadiTestLayer(administrator))));

  it.effect("canWrite denies a viewer", () =>
    Effect.gen(function* () {
      assert.isFalse(isAllowed(yield* evaluate(policies.canWrite)));
    }).pipe(Effect.provide(qadiTestLayer(viewer))));
});

describe("qadiReviewLayer", () => {
  it.effect("evaluates a subject set without an ambient subject", () =>
    Effect.gen(function* () {
      // Nothing here names a current subject, and that is the point: an access
      // review has no requester to name (ADR-QD-022).
      const { subjects: allowed } = yield* filterSubjects(policies.canRead, [viewer, nobody]);
      assert.deepStrictEqual(allowed.map((s) => s.id), [viewer.id]);
    }).pipe(Effect.provide(qadiReviewLayer())));

  it.effect("carries the same fixtures as the full layer", () =>
    Effect.gen(function* () {
      // One element, deliberately: `attributeResolverFromRecord` answers every
      // subject from one table, so a longer list here would demonstrate the
      // leak INV-QD-016 names rather than the option pass-through.
      const { subjects: allowed } = yield* filterSubjects(hasAttribute("tier", gte(3)), [
        nobody,
      ]);
      assert.deepStrictEqual(allowed.map((s) => s.id), [nobody.id]);
    }).pipe(Effect.provide(qadiReviewLayer({ attributes: { tier: 5 } }))));
});
