import { assert, describe, it } from "@effect/vitest";
import { makeCallRecorder } from "../src/CallRecorder.ts";
import {
  anyOf,
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
import {
  administrator,
  edgeRelationshipResolver,
  qadiReviewLayer,
  eventDecisionHistory,
  failingAttributeResolver,
  failingCustomPredicate,
  qadiTestLayer,
  nobody,
  policies,
  recordingAttributeResolver,
  recordingCustomPredicate,
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
});

describe("recording resolvers", () => {
  it.effect("records which attributes were asked for", () =>
    Effect.gen(function* () {
      const resolver = recordingAttributeResolver({ tier: 5 });
      // anyOf/First short-circuits, so only the first attribute is fetched.
      const policy = anyOf([hasAttribute("tier", gte(1)), hasAttribute("other", gte(1))]);

      yield* evaluate(policy).pipe(
        Effect.provide(qadiTestLayer(nobody, { attributeResolver: resolver.layer })),
      );

      assert.deepStrictEqual([...resolver.calls], ["tier"]);
    }));

  it.effect("records relationship queries", () =>
    Effect.gen(function* () {
      const resolver = edgeRelationshipResolver([
        { subjectId: "u1", relation: "owner", resourceId: "d1" },
      ]);
      yield* evaluate(hasRelationship("owner"), { resource: { id: "d1" } }).pipe(
        Effect.provide(
          qadiTestLayer(subjectWith({ id: "u1" }), {
            relationshipResolver: resolver.layer,
          }),
        ),
      );
      assert.deepStrictEqual([...resolver.calls], ["u1 owner d1"]);
    }));

  it.effect("ANSWERS Unrelated for an edge it does not hold, never Unknown", () =>
    Effect.gen(function* () {
      // A fixture edge list is the store, so a miss is a closed-world "no" and
      // the denial should name the missing edge. `"Unknown"` is reserved for a
      // resolver that was never wired (INV-QD-029), which this one plainly was.
      const resolver = edgeRelationshipResolver([
        { subjectId: "u1", relation: "owner", resourceId: "d1" },
      ]);
      const d = yield* evaluate(hasRelationship("owner"), {
        resource: { id: "d2" },
      }).pipe(
        Effect.provide(
          qadiTestLayer(subjectWith({ id: "u1" }), {
            relationshipResolver: resolver.layer,
          }),
        ),
      );
      assert.strictEqual(d._tag, "Deny");
      if (d._tag !== "Deny") return;
      assert.strictEqual(d.reason, "subject 'u1' has no 'owner' relation to 'd2'");
    }));

  it.effect("failingAttributeResolver surfaces an error, not a denial", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        evaluate(hasAttribute("x", gte(1))).pipe(
          Effect.provide(
            qadiTestLayer(nobody, { attributeResolver: failingAttributeResolver() }),
          ),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
    }));

  it.effect("recordingCustomPredicate records the name and answers from its table", () =>
    Effect.gen(function* () {
      const registry = recordingCustomPredicate({ isOwner: true });

      const d = yield* evaluate(hasCustom("isOwner")).pipe(
        Effect.provide(qadiTestLayer(nobody, { customPredicate: registry.layer })),
      );

      assert.isTrue(isAllowed(d));
      assert.deepStrictEqual([...registry.calls], ["isOwner"]);
    }));

  it.effect("recordingCustomPredicate denies an unlisted name rather than erroring", () =>
    Effect.gen(function* () {
      const registry = recordingCustomPredicate({});

      const d = yield* evaluate(hasCustom("isOwner")).pipe(
        Effect.provide(qadiTestLayer(nobody, { customPredicate: registry.layer })),
      );

      assert.isFalse(isAllowed(d));
    }));

  it.effect("failingCustomPredicate surfaces an error, not a denial", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        evaluate(hasCustom("isOwner")).pipe(
          Effect.provide(
            qadiTestLayer(nobody, { customPredicate: failingCustomPredicate() }),
          ),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
    }));
});

describe("eventDecisionHistory", () => {
  const clerk = subjectWith({ id: "u1" });

  it.effect("records its queries and answers a keyed question", () =>
    Effect.gen(function* () {
      const history = eventDecisionHistory([
        { subjectId: "u1", event: "raised", resourceId: "inv-1" },
      ]);

      const own = yield* evaluate(hasNotActed("raised"), {
        resource: { id: "inv-1" },
      }).pipe(Effect.provide(qadiTestLayer(clerk, { decisionHistory: history.layer })));
      const other = yield* evaluate(hasNotActed("raised"), {
        resource: { id: "inv-2" },
      }).pipe(Effect.provide(qadiTestLayer(clerk, { decisionHistory: history.layer })));

      assert.isFalse(isAllowed(own));
      assert.isTrue(isAllowed(other));
      assert.deepStrictEqual(
        [...history.calls],
        ["u1 raised inv-1", "u1 raised inv-2"],
      );
    }));

  it.effect("answers 'ever, at all' when the query carries no resource", () =>
    Effect.gen(function* () {
      const history = eventDecisionHistory([
        { subjectId: "u1", event: "raised", resourceId: "inv-9" },
      ]);
      const d = yield* evaluate(hasActed("raised", { scope: "Any" })).pipe(
        Effect.provide(qadiTestLayer(clerk, { decisionHistory: history.layer })),
      );
      assert.isTrue(isAllowed(d));
      assert.deepStrictEqual([...history.calls], ["u1 raised"]);
    }));

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
      const allowed = yield* filterSubjects(policies.canRead, [viewer, nobody]);
      assert.deepStrictEqual(allowed.map((s) => s.id), [viewer.id]);
    }).pipe(Effect.provide(qadiReviewLayer())));

  it.effect("carries the same fixtures as the full layer", () =>
    Effect.gen(function* () {
      // One element, deliberately: `recordingAttributeResolver` answers every
      // subject from one table, so a longer list here would demonstrate the
      // leak INV-QD-016 names rather than the option pass-through.
      const allowed = yield* filterSubjects(hasAttribute("tier", gte(3)), [nobody]);
      assert.deepStrictEqual(allowed.map((s) => s.id), [nobody.id]);
    }).pipe(Effect.provide(qadiReviewLayer({ attributes: { tier: 5 } }))));
});

describe("CallRecorder", () => {
  it("starts empty", () => {
    const recorder = makeCallRecorder();
    assert.deepStrictEqual([...recorder.calls], []);
  });

  it("calls is live — it reflects records made after the property was first read", () => {
    const recorder = makeCallRecorder();
    const before = recorder.calls;
    recorder.record("a");
    recorder.record("b");
    assert.deepStrictEqual([...before], []);
    assert.deepStrictEqual([...recorder.calls], ["a", "b"]);
  });

  it("preserves record order, including a repeated entry", () => {
    const recorder = makeCallRecorder();
    recorder.record("x");
    recorder.record("y");
    recorder.record("x");
    assert.deepStrictEqual([...recorder.calls], ["x", "y", "x"]);
  });

  it("two recorders never share state", () => {
    const a = makeCallRecorder();
    const b = makeCallRecorder();
    a.record("only a");
    assert.deepStrictEqual([...a.calls], ["only a"]);
    assert.deepStrictEqual([...b.calls], []);
  });
});
