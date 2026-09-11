import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as FastCheck from "fast-check";
import * as M from "../src/Matcher.ts";
import { Obligation, obligation, unionObligations } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";

describe("Policy combinators", () => {
  it("allOf defaults to Intersection — least privilege for a conjunction", () => {
    const policy = P.allOf([P.hasRole("a"), P.hasRole("b")]);
    assert.strictEqual(policy._tag, "AllOf");
    if (policy._tag !== "AllOf") return;
    assert.strictEqual(policy.fieldStrategy, "Intersection");
  });

  it("anyOf defaults to First — short-circuiting", () => {
    const policy = P.anyOf([P.hasRole("a")]);
    assert.strictEqual(policy._tag, "AnyOf");
    if (policy._tag !== "AnyOf") return;
    assert.strictEqual(policy.fieldStrategy, "First");
  });

  it("explicit fieldStrategy overrides the default", () => {
    const policy = P.anyOf([P.hasRole("a")], { fieldStrategy: "Union" });
    assert.strictEqual(policy._tag, "AnyOf");
    if (policy._tag !== "AnyOf") return;
    assert.strictEqual(policy.fieldStrategy, "Union");
  });

  it("anyOfRoles builds an AnyOf of HasRole", () => {
    const policy = P.anyOfRoles(["admin", "editor"]);
    assert.strictEqual(policy._tag, "AnyOf");
    if (policy._tag !== "AnyOf") return;
    assert.strictEqual(policy.policies.length, 2);
    assert.deepStrictEqual(
      policy.policies.map((p) => (p._tag === "HasRole" ? p.role : "?")),
      ["admin", "editor"],
    );
  });

  it("labeled wraps a policy with a name", () => {
    const policy = P.labeled("four-eyes", P.hasRole("approver"));
    assert.strictEqual(policy._tag, "Labeled");
    if (policy._tag !== "Labeled") return;
    assert.strictEqual(policy.label, "four-eyes");
  });

  it("not wraps a policy", () => {
    const policy = P.not(P.hasRole("suspended"));
    assert.strictEqual(policy._tag, "Not");
  });

  it("hasAction carries the verb and fields", () => {
    const policy = P.hasAction("write", { fields: ["body"] });
    assert.strictEqual(policy._tag, "HasAction");
    if (policy._tag !== "HasAction") return;
    assert.strictEqual(policy.action, "write");
    assert.deepStrictEqual(policy.fields, ["body"]);
  });

  it("obliged wraps a policy with a duty", () => {
    const policy = P.obliged(obligation("log-access", { level: "audit" }), P.hasRole("a"));
    assert.strictEqual(policy._tag, "Obliged");
    if (policy._tag !== "Obliged") return;
    assert.strictEqual(policy.obligation.id, "log-access");
    assert.deepStrictEqual(policy.obligation.attributes, { level: "audit" });
    assert.isFalse(policy.obligation.advisory);
  });

  it("an obligation defaults to binding with no attributes", () => {
    // The safe default: a duty binds unless its author says it may be ignored.
    const o = obligation("notify");
    assert.deepStrictEqual(o, { id: "notify", attributes: {}, advisory: false });
    assert.isTrue(obligation("hint", {}, { advisory: true }).advisory);
  });

  it("history policies default to Resource scope", () => {
    const acted = P.hasActed("raised");
    const notActed = P.hasNotActed("raised", { scope: "Any" });
    assert.strictEqual(acted._tag, "HasActed");
    assert.strictEqual(notActed._tag, "HasNotActed");
    if (acted._tag !== "HasActed" || notActed._tag !== "HasNotActed") return;
    assert.strictEqual(acted.scope, "Resource");
    assert.strictEqual(notActed.scope, "Any");
  });

  it("hasNotActed is a distinct variant, not a Not wrapper", () => {
    // If this ever becomes `not(hasActed(...))`, an unwired history port starts
    // granting — ADR-QD-020. The schema is what holds the distinction.
    assert.strictEqual(P.hasNotActed("raised")._tag, "HasNotActed");
    assert.notStrictEqual(P.hasNotActed("raised")._tag, "Not");
  });

  it("hasRelationship carries depth and fields", () => {
    const policy = P.hasRelationship("owner", { depth: 3, fields: ["title"] });
    assert.strictEqual(policy._tag, "HasRelationship");
    if (policy._tag !== "HasRelationship") return;
    assert.strictEqual(policy.depth, 3);
    assert.deepStrictEqual(policy.fields, ["title"]);
  });

  it("hasCustom carries its name, params and fields", () => {
    const policy = P.hasCustom("isOwner", { threshold: 5 }, { fields: ["id"] });
    assert.strictEqual(policy._tag, "HasCustom");
    if (policy._tag !== "HasCustom") return;
    assert.strictEqual(policy.name, "isOwner");
    assert.deepStrictEqual(policy.params, { threshold: 5 });
    assert.deepStrictEqual(policy.fields, ["id"]);
  });

  it("hasCustom omits params rather than setting it to undefined", () => {
    // `fieldsKey`'s own reasoning applies here too: an omitted optional key
    // keeps encode/decode an exact identity, so a hand-built policy and one
    // that round-tripped through JSON are `deepStrictEqual`.
    const policy = P.hasCustom("isOwner");
    assert.isFalse(Object.hasOwn(policy, "params"));
  });
});

describe("Obligation", () => {
  it.effect("the Obligation schema rejects a malformed payload via decode", () =>
    Effect.gen(function* () {
      // CONFIRMED (empirically, against this Effect version): the *real*
      // `Schema.Struct({ id, attributes, advisory })` correctly rejects
      // malformed input on every case below. The passthrough ticket 02
      // described is a property of the *mutant* — `Schema.Struct({})`, the
      // empty struct a Stryker mutation substitutes for it — which does
      // accept anything object-shaped; the real schema does not. See the
      // "Answer" section of issue 15 for the full empirical trace.
      const missingId = yield* Effect.result(
        Schema.decodeUnknownEffect(Obligation)({ attributes: {}, advisory: false }),
      );
      assert.strictEqual(missingId._tag, "Failure");

      const wrongTypes = yield* Effect.result(
        Schema.decodeUnknownEffect(Obligation)({
          id: 123,
          attributes: "not a record",
          advisory: "yes",
        }),
      );
      assert.strictEqual(wrongTypes._tag, "Failure");

      const empty = yield* Effect.result(Schema.decodeUnknownEffect(Obligation)({}));
      assert.strictEqual(empty._tag, "Failure");

      // The positive control: a well-formed payload still decodes.
      const ok = yield* Effect.result(
        Schema.decodeUnknownEffect(Obligation)({ id: "x", attributes: {}, advisory: false }),
      );
      assert.strictEqual(ok._tag, "Success");
    }));

  it("unionObligations dedups by value across multi-element sets, not just 0-or-1-element ones", () => {
    // `out.some(...)` vs `out.every(...)` only disagree once `out` holds more
    // than one element with mixed match results — every existing exercise of
    // this merge (directly or through `AllOf`) used sets of size <= 1, where
    // `some` and `every` coincide.
    const p = obligation("p");
    const q = obligation("q");
    const r = obligation("r");

    // `q` is reached through both sides — a diamond — and must appear once.
    assert.deepStrictEqual(unionObligations([p, q], [q, r]), [p, q, r]);

    // Order matters for the same reason: `a`'s elements come first, and only
    // genuinely new elements of `b` are appended, in `b`'s order.
    assert.deepStrictEqual(unionObligations([r, q], [p, q]), [r, q, p]);
  });
});

describe("Policy serialization", () => {
  const roundTrip = (policy: P.Policy) =>
    Effect.flatMap(P.toJson(policy), (json) => P.fromJson(json));

  it.effect("REGRESSION: anyOf Union fieldStrategy survives a round trip", () =>
    Effect.gen(function* () {
      // The predecessor dropped fieldStrategy when serializing, so a policy
      // stored and reloaded silently narrowed visibility from ["title",
      // "author"] to ["title"]. This is the defect the schema-derived codec
      // exists to prevent.
      const policy = P.anyOf(
        [
          P.hasPermission(permission("doc", "read"), { fields: ["title"] }),
          P.hasPermission(permission("doc", "meta"), { fields: ["author"] }),
        ],
        { fieldStrategy: "Union" },
      );

      const restored = yield* roundTrip(policy);
      assert.deepStrictEqual(restored, policy);
      if (restored._tag !== "AnyOf") return;
      assert.strictEqual(restored.fieldStrategy, "Union");
    }));

  it.effect("round-trips a deeply nested tree", () =>
    Effect.gen(function* () {
      const policy = P.allOf(
        [
          P.labeled(
            "outer",
            P.not(
              P.anyOf([
                P.hasRole("admin"),
                P.hasAttribute("level", M.gte(3), { fields: ["a", "b"] }),
                P.hasResourceAttribute("state", M.eq(M.literal("open"))),
                P.hasRelationship("owner", { depth: 2 }),
                P.hasAction("write", { fields: ["body"] }),
                P.obliged(obligation("log", { who: "x" }), P.hasRole("auditor")),
                P.hasActed("raised", { scope: "Any" }),
                P.hasNotActed("approved", { fields: ["id"] }),
              ]),
            ),
          ),
          P.hasPermission(permission("doc", "write")),
        ],
        { fieldStrategy: "Union" },
      );

      assert.deepStrictEqual(yield* roundTrip(policy), policy);
    }));

  it.effect("round-trips an empty allOf/anyOf/rules — the property generator's minLength:1 never exercises these", () =>
    Effect.gen(function* () {
      const emptyAllOf = P.allOf([]);
      const restoredAllOf = yield* roundTrip(emptyAllOf);
      assert.deepStrictEqual(restoredAllOf, emptyAllOf);
      assert.strictEqual(restoredAllOf._tag, "AllOf");
      if (restoredAllOf._tag === "AllOf") {
        assert.deepStrictEqual(restoredAllOf.policies, []);
      }

      const emptyAnyOf = P.anyOf([]);
      const restoredAnyOf = yield* roundTrip(emptyAnyOf);
      assert.deepStrictEqual(restoredAnyOf, emptyAnyOf);
      assert.strictEqual(restoredAnyOf._tag, "AnyOf");
      if (restoredAnyOf._tag === "AnyOf") {
        assert.deepStrictEqual(restoredAnyOf.policies, []);
      }

      const emptyRules = P.rules([]);
      const restoredRules = yield* roundTrip(emptyRules);
      assert.deepStrictEqual(restoredRules, emptyRules);
      assert.strictEqual(restoredRules._tag, "Rules");
      if (restoredRules._tag === "Rules") {
        assert.deepStrictEqual(restoredRules.rules, []);
      }
    }));

  it.effect("round-trips a Rules table, including each row's condition and effect", () =>
    Effect.gen(function* () {
      // `RuleStruct` is the codec's one untagged struct (a `Rule` is a row, not
      // a policy variant), and unlike every other node's fields it had no
      // direct round-trip test — only the property generator reached it, by
      // chance rather than by name.
      const policy = P.rules(
        [
          P.denyWhen(P.hasRole("suspended")),
          P.permitWhen(P.hasPermission(permission("doc", "read"))),
        ],
        { combining: "DenyOverrides" },
      );

      const restored = yield* roundTrip(policy);
      assert.deepStrictEqual(restored, policy);
      if (restored._tag !== "Rules") return;
      assert.strictEqual(restored.rules.length, 2);
      assert.strictEqual(restored.rules[0]?.effect, "Deny");
      assert.deepStrictEqual(restored.rules[0]?.condition, P.hasRole("suspended"));
      assert.strictEqual(restored.rules[1]?.effect, "Permit");
      assert.deepStrictEqual(
        restored.rules[1]?.condition,
        P.hasPermission(permission("doc", "read")),
      );
    }));

  it.effect("hasRelationship omits depth — not `depth: undefined` — when none is given, and it survives either way through JSON", () =>
    Effect.gen(function* () {
      // The `fieldsKey` case (below, via `hasAction("write", { fields:
      // ["body"] })` elsewhere in this file) already gets a round trip; the
      // analogous `depthKey` omission never did. `depthKey`'s ternary
      // condition, mutated to always take the "else" branch, would spread
      // `{ depth: undefined }` into every `HasRelationship` unconditionally —
      // an own property present with value `undefined`, not an absent key.
      const withoutDepth = P.hasRelationship("owner");
      if (withoutDepth._tag !== "HasRelationship") return;
      assert.isFalse(Object.hasOwn(withoutDepth, "depth"));
      assert.deepStrictEqual(yield* roundTrip(withoutDepth), withoutDepth);

      const withDepth = P.hasRelationship("owner", { depth: 2 });
      if (withDepth._tag !== "HasRelationship") return;
      assert.isTrue(Object.hasOwn(withDepth, "depth"));
      assert.strictEqual(withDepth.depth, 2);
      assert.deepStrictEqual(yield* roundTrip(withDepth), withDepth);
    }));

  it.effect("round-trips HasSignature, with and without signerRole", () =>
    Effect.gen(function* () {
      // HasSignature had zero codec round-trip coverage anywhere in this
      // suite: the property generator's leaf cases omitted it entirely, so
      // neither a hand-written nor a generated test ever exercised
      // encode -> decode -> equals for this tag. `signerRole`'s omission
      // mirrors `hasRelationship`'s `depth` and `hasCustom`'s `params`: an
      // absent key, not a key set to `undefined`, is what must survive.
      const withoutSignerRole = P.hasSignature("approved");
      if (withoutSignerRole._tag !== "HasSignature") return;
      assert.isFalse(Object.hasOwn(withoutSignerRole, "signerRole"));
      assert.strictEqual(withoutSignerRole.scope, "Resource");
      assert.deepStrictEqual(yield* roundTrip(withoutSignerRole), withoutSignerRole);

      const withSignerRole = P.hasSignature("witnessed", {
        scope: "Any",
        signerRole: "quality-reviewer",
        fields: ["signedAt"],
      });
      if (withSignerRole._tag !== "HasSignature") return;
      assert.isTrue(Object.hasOwn(withSignerRole, "signerRole"));
      assert.strictEqual(withSignerRole.signerRole, "quality-reviewer");
      assert.strictEqual(withSignerRole.scope, "Any");
      assert.deepStrictEqual(yield* roundTrip(withSignerRole), withSignerRole);
    }));

  it.effect("round-trips every matcher variant", () =>
    Effect.gen(function* () {
      const matchers: ReadonlyArray<M.Matcher> = [
        M.eq(M.literal(1)),
        M.eq(M.subject("dept")),
        M.eq(M.subjectId()),
        M.eq(M.resource("owner")),
        M.eq(M.action()),
        M.dominates(M.subject("clearance")),
        M.neq(M.literal("x")),
        M.inArray([1, 2, 3]),
        M.exists(),
        M.gte(5),
        M.lt(10),
        M.contains("needle"),
        M.fieldMatch("nested", M.exists()),
        M.someMatch(M.gte(1)),
        M.everyMatch(M.lt(9)),
        M.size(M.gte(2)),
      ];

      for (const matcher of matchers) {
        const policy = P.hasAttribute("x", matcher);
        assert.deepStrictEqual(yield* roundTrip(policy), policy);
      }
    }));

  it.effect("rejects an unknown policy tag", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(P.fromJson(`{"_tag":"DropTables"}`));
      assert.strictEqual(result._tag, "Failure");
    }));

  describe("excess-property rejection — a typo'd field inside a known tag is a decode failure, not a silent drop", () => {
    // Effect v4 defaults `onExcessProperty` to `"ignore"`: without
    // `UNTRUSTED_DECODE_OPTIONS` (Policy.ts), a persisted policy carrying a
    // misspelled key — `{"_tag":"HasRole","rle":"admin"}` — would decode by
    // silently dropping the typo, not by rejecting it. `HasRole` still needs
    // its own required `role`, so that particular typo also fails on a
    // missing-field ground; the case below instead adds an unrecognized *extra*
    // key alongside every required field already present, which the v4 default
    // would decode successfully by stripping the extra key.

    it.effect("fromJson rejects an extra unrecognized key on an otherwise well-formed tag", () =>
      Effect.gen(function* () {
        const result = yield* Effect.result(
          P.fromJson(`{"_tag":"HasRole","role":"admin","rloe":"admin"}`),
        );
        assert.strictEqual(result._tag, "Failure");
      }));

    it.effect("fromJsonValue rejects the same excess key on an already-parsed value", () =>
      Effect.gen(function* () {
        const result = yield* Effect.result(
          P.fromJsonValue({ _tag: "HasRole", role: "admin", rloe: "admin" }),
        );
        assert.strictEqual(result._tag, "Failure");
      }));

    it.effect("rejects an excess key nested inside a composite policy's child", () =>
      Effect.gen(function* () {
        // The stance has to hold at every recursive position, not just the
        // top-level tag — `ParseOptions` propagating through `PolicyRef` is
        // exactly what makes that true rather than incidental.
        const result = yield* Effect.result(
          P.fromJson(
            `{"_tag":"AllOf","fieldStrategy":"Intersection","policies":[{"_tag":"HasRole","role":"admin","rloe":"admin"}]}`,
          ),
        );
        assert.strictEqual(result._tag, "Failure");
      }));

    it.effect("the positive control: the same tag with no excess key still decodes", () =>
      Effect.gen(function* () {
        const result = yield* Effect.result(P.fromJson(`{"_tag":"HasRole","role":"admin"}`));
        assert.strictEqual(result._tag, "Success");
      }));
  });

  it.effect("rejects a permission segment containing the key separator", () =>
    Effect.gen(function* () {
      // "a:b" as a resource would collide with resource "a", action "b:c".
      const result = yield* Effect.result(
        P.fromJson(`{"_tag":"HasPermission","permission":{"resource":"a:b","action":"c"}}`),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("rejects an empty permission segment", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        P.fromJson(`{"_tag":"HasPermission","permission":{"resource":"","action":"c"}}`),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("rejects malformed JSON", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(P.fromJson("{not json"));
      assert.strictEqual(result._tag, "Failure");
    }));

  describe("decode depth bound — stack-exhaustion refusal, not a defect", () => {
    const deeplyNestedNot = (n: number): string => {
      let json = "";
      for (let i = 0; i < n; i++) json += '{"_tag":"Not","policy":';
      json += '{"_tag":"HasRole","role":"x"}';
      json += "}".repeat(n);
      return json;
    };

    it.effect("fromJson refuses a policy nested past MAX_DECODE_DEPTH, naming the bound", () =>
      Effect.gen(function* () {
        const json = deeplyNestedNot(P.MAX_DECODE_DEPTH + 10);
        const result = yield* Effect.result(P.fromJson(json));
        assert.strictEqual(result._tag, "Failure");
        if (result._tag === "Failure") {
          assert.strictEqual(result.failure._tag, "PolicyDecodeTooDeep");
          if (result.failure._tag === "PolicyDecodeTooDeep") {
            assert.strictEqual(result.failure.maxDepth, P.MAX_DECODE_DEPTH);
          }
        }
      }));

    it.effect("fromJsonValue refuses an already-parsed policy nested past MAX_DECODE_DEPTH, naming the bound", () =>
      Effect.gen(function* () {
        const value: unknown = JSON.parse(deeplyNestedNot(P.MAX_DECODE_DEPTH + 10));
        const result = yield* Effect.result(P.fromJsonValue(value));
        assert.strictEqual(result._tag, "Failure");
        if (result._tag === "Failure") {
          assert.strictEqual(result.failure._tag, "PolicyDecodeTooDeep");
          if (result.failure._tag === "PolicyDecodeTooDeep") {
            assert.strictEqual(result.failure.maxDepth, P.MAX_DECODE_DEPTH);
          }
        }
      }));

    it.effect("fromJson accepts a policy nested well within MAX_DECODE_DEPTH", () =>
      Effect.gen(function* () {
        const json = deeplyNestedNot(4);
        const result = yield* Effect.result(P.fromJson(json));
        assert.strictEqual(result._tag, "Success");
      }));

    it.effect("a policy nested exactly to MAX_DECODE_DEPTH is not refused — the bound is inclusive", () =>
      Effect.gen(function* () {
        // deeplyNestedNot(n) reaches structural depth n + 1 (the leaf's own
        // fields sit one level past the last `Not`), so n = MAX_DECODE_DEPTH - 1
        // is the deepest input the `> maxDepth` check must still accept.
        const json = deeplyNestedNot(P.MAX_DECODE_DEPTH - 1);
        const result = yield* Effect.result(P.fromJson(json));
        assert.strictEqual(result._tag, "Success");
      }));

    it.effect("depth accumulates through array-valued nodes too, not only single-child ones", () =>
      Effect.gen(function* () {
        // `Not` nests through a plain object field; this nests through a
        // single-element array instead (the shape `AllOf`/`AnyOf` use), so a
        // depth-counting bug specific to the array-traversal branch would
        // slip past every other test here.
        let node: unknown = { leaf: true };
        for (let i = 0; i < P.MAX_DECODE_DEPTH; i++) node = { policies: [node] };
        const result = yield* Effect.result(P.fromJsonValue(node));
        assert.strictEqual(result._tag, "Failure");
        // Specifically the depth refusal, not some unrelated schema failure —
        // this shape isn't a valid `Policy` either, so a weaker "any failure"
        // assertion here would pass even if array depth were never counted.
        if (result._tag === "Failure") {
          assert.strictEqual(result.failure._tag, "PolicyDecodeTooDeep");
        }
      }));

    it.effect("a null nested inside the structure is walked without throwing", () =>
      Effect.gen(function* () {
        // `isPlainObject` excludes `null` on purpose — `typeof null` is
        // itself `"object"`. Without that exclusion, `Object.keys(null)`
        // throws a raw `TypeError` synchronously out of `fromJsonValue`,
        // which has no `try`/`catch` around the depth check the way
        // `fromJson` does around its own `JSON.parse`.
        let effect: Effect.Effect<P.Policy, unknown> | undefined;
        assert.doesNotThrow(() => {
          effect = P.fromJsonValue({ _tag: "Not", policy: null });
        });
        assert.isDefined(effect);
        if (effect === undefined) return;
        const result = yield* Effect.result(effect);
        assert.strictEqual(result._tag, "Failure");
      }));

    // The regression this guards: 60,000 levels of `Not` nesting previously
    // threw a raw `RangeError` out of `Schema.decodeUnknownEffect` — an
    // uncaught defect, not an `Effect` failure — before this depth check ran
    // ahead of it.
    it.effect("an extreme depth (60,000) fails through the Effect channel, never throws", () =>
      Effect.gen(function* () {
        const json = deeplyNestedNot(60_000);
        const result = yield* Effect.result(P.fromJson(json));
        assert.strictEqual(result._tag, "Failure");
      }));
  });

  describe("branded ADT strings — role/event/relation/action/label", () => {
    // Every one of these five fields shares Permission's SEGMENT_PATTERN: not
    // empty, no `:`. One malformed-each-way pair per field is enough to prove
    // decode actually enforces the brand, not just tags the type.
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['{"_tag":"HasRole","role":""}', "empty role"],
      ['{"_tag":"HasRole","role":"a:b"}', "role containing ':'"],
      ['{"_tag":"HasAction","action":""}', "empty action"],
      ['{"_tag":"HasAction","action":"a:b"}', "action containing ':'"],
      ['{"_tag":"HasRelationship","relation":""}', "empty relation"],
      [
        '{"_tag":"HasRelationship","relation":"a:b"}',
        "relation containing ':'",
      ],
      ['{"_tag":"HasActed","event":"","scope":"Resource"}', "empty event"],
      [
        '{"_tag":"HasActed","event":"a:b","scope":"Resource"}',
        "event containing ':'",
      ],
      [
        '{"_tag":"Labeled","label":"","policy":{"_tag":"HasRole","role":"x"}}',
        "empty label",
      ],
      [
        '{"_tag":"Labeled","label":"a:b","policy":{"_tag":"HasRole","role":"x"}}',
        "label containing ':'",
      ],
    ];

    for (const [json, description] of cases) {
      it.effect(`rejects ${description}`, () =>
        Effect.gen(function* () {
          const result = yield* Effect.result(P.fromJson(json));
          assert.strictEqual(result._tag, "Failure");
        }));
    }
  });

  it.effect("round-trips through a plain JSON value", () =>
    Effect.gen(function* () {
      const policy = P.hasRole("admin");
      const value = yield* P.toJsonValue(policy);
      assert.deepStrictEqual(yield* P.fromJsonValue(value), policy);
    }));

  it.effect("PROPERTY: any generated policy survives a round trip", () =>
    Effect.gen(function* () {
      // Generates arbitrary trees rather than the shapes we happened to think
      // of. This is the standing guard against codec drift.
      //
      // `segment` matches Policy.ts's own `SEGMENT_PATTERN` (via Permission.ts):
      // non-empty, no `:`. `role`/`event`/`relation`/`action`/`label` are now
      // branded and validated against exactly that pattern, so a generator
      // feeding one of them an arbitrary, unconstrained string would fail the
      // round trip on the shape the brand is *supposed* to reject — same
      // sanitization `permission`'s own generator below already needed.
      const segment = (s: string) => s.replace(/:/g, "") || "x";

      const leaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
        FastCheck.record({ r: FastCheck.string(), a: FastCheck.string() }).map(({ r, a }) =>
          P.hasPermission(permission(segment(r), segment(a))),
        ),
        FastCheck.string().map((s) => P.hasRole(segment(s))),
        // A dot-path/wildcard field spec is still just a `string` to the
        // codec (`FieldPath.ts` interprets it, `Fields` doesn't validate
        // it) — this leaf exists so the round-trip property says something
        // about that shape too, not only about flat field names.
        FastCheck.record({
          r: FastCheck.string(),
          a: FastCheck.string(),
          field: FastCheck.constantFrom("id", "address.street", "contact.*", "contact.**"),
        }).map(({ r, a, field }) =>
          P.hasPermission(permission(segment(r), segment(a)), { fields: [field] }),
        ),
        FastCheck.integer().map((n) => P.hasAttribute("lvl", M.gte(n))),
        // `HasResourceAttribute` was the one remaining leaf tag exercised only
        // by the single hand-written "round-trips a deeply nested tree" test,
        // never by this property (issue #67).
        FastCheck.integer().map((n) => P.hasResourceAttribute("lvl", M.gte(n))),
        FastCheck.string().map((s) => P.hasAction(segment(s))),
        // A matcher carrying an ActionRef: the variant lives in ValueRef rather
        // than in Policy, so a leaf that never nests one would leave it out of
        // the round-trip property entirely.
        FastCheck.constant(P.hasAttribute("op", M.eq(M.action()))),
        FastCheck.string().map((path) =>
          P.hasAttribute("clearance", M.dominates(M.resource(path))),
        ),
        // `Obligation` is a struct with a `Record(String, Unknown)` inside it,
        // so the generator has to reach nested arbitrary JSON for the property
        // to say anything about the obligation codec.
        FastCheck.tuple(FastCheck.string(), FastCheck.boolean()).map(([id, advisory]) =>
          P.obliged(
            obligation(id, { n: 1, deep: { s: "x" } }, { advisory }),
            P.hasRole(segment(id)),
          ),
        ),
        FastCheck.tuple(
          FastCheck.string(),
          FastCheck.constantFrom("Resource" as const, "Any" as const),
          FastCheck.boolean(),
        ).map(([event, scope, negated]) =>
          negated
            ? P.hasNotActed(segment(event), { scope })
            : P.hasActed(segment(event), { scope }),
        ),
        // `depthKey`'s omission is the same shape of invariant as
        // `fieldsKey`'s: generating both "no depth given" and "depth given"
        // sends the property through both branches of the ternary.
        FastCheck.tuple(FastCheck.string(), FastCheck.option(FastCheck.integer())).map(
          ([relation, depth]) =>
            P.hasRelationship(segment(relation), depth === null ? undefined : { depth }),
        ),
        // `params` is `Schema.Unknown`, so both branches of its own omission
        // ternary need a generator turn — the same reasoning `depth`'s
        // `FastCheck.option` above already needed.
        FastCheck.tuple(FastCheck.string(), FastCheck.option(FastCheck.string())).map(
          ([name, params]) => P.hasCustom(segment(name), params === null ? undefined : params),
        ),
        // `HasSignature` had zero codec round-trip coverage anywhere in this
        // suite before this case. `signerRole`'s omission is the same shape of
        // invariant as `depth`'s and `params`'s above — both branches of the
        // ternary need a generator turn — and `meaning` is deliberately left
        // an unconstrained `Schema.String` at the wire level (see `Policy.ts`'s
        // `HasSignature` comment), so it gets no `segment()` sanitization.
        FastCheck.tuple(
          FastCheck.string(),
          FastCheck.constantFrom("Resource" as const, "Any" as const),
          FastCheck.option(FastCheck.string()),
        ).map(([meaning, scope, signerRole]) =>
          P.hasSignature(meaning, signerRole === null ? { scope } : { scope, signerRole }),
        ),
      );

      const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec<{ node: P.Policy }>((tie) => ({
        node: FastCheck.oneof(
          { maxDepth: 4, withCrossShrink: true },
          leaf,
          FastCheck.tuple(
            FastCheck.array(tie("node"), {
              minLength: 1,
              maxLength: 3,
            }),
            FastCheck.constantFrom("Intersection" as const, "Union" as const, "First" as const),
          ).map(([ps, strategy]) => P.allOf(ps, { fieldStrategy: strategy })),
          FastCheck.tuple(
            FastCheck.array(tie("node"), {
              minLength: 1,
              maxLength: 3,
            }),
            FastCheck.constantFrom("Intersection" as const, "Union" as const, "First" as const),
          ).map(([ps, strategy]) => P.anyOf(ps, { fieldStrategy: strategy })),
          // A rule's condition is a full policy tree, and `Rule` is the only
          // untagged struct in the codec — INV-QD-003 is what makes this branch
          // mandatory in the same change that added the variant.
          FastCheck.tuple(
            FastCheck.array(
              FastCheck.tuple(tie("node"), FastCheck.boolean()).map(([condition, permits]) =>
                permits ? P.permitWhen(condition) : P.denyWhen(condition),
              ),
              { minLength: 1, maxLength: 3 },
            ),
            FastCheck.constantFrom(
              "FirstApplicable" as const,
              "DenyOverrides" as const,
              "PermitOverrides" as const,
            ),
          ).map(([rs, combining]) => P.rules(rs, { combining })),
          tie("node").map(P.not),
          // `Labeled` was reached only by the hand-written "round-trips a
          // deeply nested tree" test above, never by this generator — the
          // same standing-guard gap `HasSignature` had, just one level up
          // the tree rather than at a leaf.
          FastCheck.tuple(FastCheck.string(), tie("node")).map(([label, node]) =>
            P.labeled(segment(label), node),
          ),
        ),
      })).node;

      const samples = FastCheck.sample(tree, { numRuns: 60, seed: 1002 });
      for (const policy of samples) {
        const restored = yield* Effect.flatMap(P.toJson(policy), P.fromJson);
        assert.deepStrictEqual(restored, policy);
      }
    }));
});
