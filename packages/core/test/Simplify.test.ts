import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "fast-check";
import { isAllowed } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import { explain, renderExplanation } from "../src/Explanation.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { simplify } from "../src/Simplify.ts";
import { subjectWith, testLayer } from "./helpers.ts";

describe("simplify", () => {
  it("REFUSES to remove a double negation, because it is not one", () => {
    // `not(not(p))` is not `p` here. A negation carries `visibleFields: undefined`
    // — all fields — and no obligations, because knowing a policy did NOT hold says
    // nothing about which fields are safe (ADR-QD-019). The property below found
    // this; it is the rewrite every textbook lists as trivially safe.
    const doubled = P.not(P.not(P.hasRole("a")));
    assert.deepStrictEqual(simplify(doubled), doubled);
  });

  it.effect("the double negation it refuses to remove really does differ", () =>
    Effect.gen(function* () {
      // The counterexample, spelled out. Same verdict, different field set.
      const inner = P.hasPermission(permission("doc", "meta"), { fields: ["author"] });
      const subject = subjectWith({ id: "u-1", permissions: ["doc:meta"] });
      const run = (p: P.Policy) => evaluate(p).pipe(Effect.provide(testLayer(subject)));

      const direct = yield* run(inner);
      const doubled = yield* run(P.not(P.not(inner)));

      assert.isTrue(isAllowed(direct));
      assert.isTrue(isAllowed(doubled));
      if (!isAllowed(direct) || !isAllowed(doubled)) return;
      assert.deepStrictEqual(direct.visibleFields, ["author"]);
      // All fields, not `["author"]` — so eliminating the negation would have
      // narrowed what the caller may read.
      assert.isUndefined(doubled.visibleFields);
    }));

  it.effect("the double-negation guard holds identically for a path-shaped field", () =>
    Effect.gen(function* () {
      // Same counterexample as above, with a dot-path field spec instead of
      // a flat name — the guard keys off Not always setting
      // `visibleFields: undefined`, never off what the field strings
      // inside a restriction mean, so this must hold identically.
      const inner = P.hasPermission(permission("doc", "meta"), {
        fields: ["contact.email"],
      });
      const subject = subjectWith({ id: "u-1", permissions: ["doc:meta"] });
      const run = (p: P.Policy) => evaluate(p).pipe(Effect.provide(testLayer(subject)));

      const direct = yield* run(inner);
      const doubled = yield* run(P.not(P.not(inner)));

      assert.isTrue(isAllowed(direct));
      assert.isTrue(isAllowed(doubled));
      if (!isAllowed(direct) || !isAllowed(doubled)) return;
      assert.deepStrictEqual(direct.visibleFields, ["contact.email"]);
      assert.isUndefined(doubled.visibleFields);
    }));

  it("leaves every leaf variant exactly as it found it", () => {
    // All ten leaf variants have an arm, so all ten need exercising — an
    // unexercised leaf arm would be a variant `simplify` silently mishandles, and
    // the arms are one-liners precisely because nothing should happen in them.
    const leaves: ReadonlyArray<P.Policy> = [
      P.hasPermission(permission("doc", "read")),
      P.hasRole("a"),
      P.hasAttribute("x", M.gte(1)),
      P.hasResourceAttribute("y", M.exists()),
      P.hasRelationship("owner"),
      P.hasAction("read"),
      P.hasActed("raised"),
      P.hasNotActed("approved", { scope: "Any" }),
      P.hasCustom("weird-check", { threshold: 1 }),
      P.hasSignature("approved"),
    ];

    for (const leaf of leaves) {
      assert.deepStrictEqual(simplify(leaf), leaf, `changed ${leaf._tag}`);
    }
  });

  it("unwraps a single-child composite", () => {
    assert.deepStrictEqual(simplify(P.allOf([P.hasRole("a")])), P.hasRole("a"));
    assert.deepStrictEqual(simplify(P.anyOf([P.hasRole("a")])), P.hasRole("a"));
  });

  it("flattens a composite nested in the same composite", () => {
    assert.deepStrictEqual(
      simplify(P.allOf([P.hasRole("a"), P.allOf([P.hasRole("b"), P.hasRole("c")])])),
      P.allOf([P.hasRole("a"), P.hasRole("b"), P.hasRole("c")]),
    );
  });

  it("flattens a composite nested in the same composite — AnyOf", () => {
    // The `AllOf` case above and this one share the same `flatten` helper and
    // the same `absorbable` condition, but `AnyOf` had no direct unit test of
    // its own — only ever exercised incidentally via property tests.
    assert.deepStrictEqual(
      simplify(P.anyOf([P.hasRole("a"), P.anyOf([P.hasRole("b"), P.hasRole("c")])])),
      P.anyOf([P.hasRole("a"), P.hasRole("b"), P.hasRole("c")]),
    );
  });

  it("REFUSES to flatten across different field strategies", () => {
    // The correctness argument in one assertion. Both trees reach the same verdict
    // and expose DIFFERENT fields, so flattening unconditionally would be
    // verdict-preserving and disclosure-changing — it would widen or narrow what a
    // caller may read while every allow-or-deny test still passed.
    const nested = P.allOf(
      [
        P.hasRole("a"),
        P.allOf([P.hasRole("b"), P.hasRole("c")], { fieldStrategy: "Union" }),
      ],
      { fieldStrategy: "Intersection" },
    );
    assert.deepStrictEqual(simplify(nested), nested);
  });

  it("leaves an empty composite alone", () => {
    // Not redundant: one always allows and the other never does, so "simplifying"
    // either would be replacing it.
    assert.deepStrictEqual(simplify(P.allOf([])), P.allOf([]));
    assert.deepStrictEqual(simplify(P.anyOf([])), P.anyOf([]));
  });

  it("never removes a label, so attribution survives", () => {
    // A label is the only thing a denial can be attributed to. Dropping one would
    // silently change what a trace can say.
    const labelled = P.allOf([P.labeled("sod.role", P.allOf([P.hasRole("a")]))]);
    const result = simplify(labelled);
    assert.strictEqual(result._tag, "Labeled");
    assert.include(renderExplanation(explain(result)), "sod.role");
  });

  it("never reorders, merges or drops a rule table's rows", () => {
    // Row order is semantic and the deciding row is chosen by index, so a
    // simplifier that touched the list would change which duties are owed.
    const table = P.rules(
      [P.denyWhen(P.allOf([P.hasRole("a")])), P.permitWhen(P.hasRole("b"))],
      { combining: "DenyOverrides" },
    );
    const result = simplify(table);
    assert.strictEqual(result._tag, "Rules");
    if (result._tag !== "Rules") return;
    assert.strictEqual(result.rules.length, 2);
    const [rule] = result.rules;
    assert.isDefined(rule);
    if (rule === undefined) return;
    assert.strictEqual(rule.effect, "Deny");
    // The row's condition was simplified in place.
    assert.deepStrictEqual(rule.condition, P.hasRole("a"));
  });

  it("is idempotent", () => {
    const nested = P.allOf([P.allOf([P.allOf([P.hasRole("a")])])]);
    const once = simplify(nested);
    assert.deepStrictEqual(simplify(once), once);
    assert.deepStrictEqual(once, P.hasRole("a"));
  });

  it.effect("survives a round trip through JSON, because it produces ordinary policies", () =>
    Effect.gen(function* () {
      const simplified = simplify(
        P.allOf([P.hasRole("a"), P.allOf([P.hasPermission(permission("doc", "read"))])]),
      );
      const restored = yield* Effect.flatMap(P.toJson(simplified), P.fromJson);
      assert.deepStrictEqual(restored, simplified);
    }));

  // -------------------------------------------------------------------------
  // INV-QD-024
  // -------------------------------------------------------------------------

  const leaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
    FastCheck.constantFrom("editor", "legal", "suspended").map((r) => P.hasRole(r)),
    FastCheck.constant(P.hasPermission(permission("doc", "read"))),
    FastCheck.constant(P.hasPermission(permission("doc", "read"), { fields: ["id"] })),
    FastCheck.constant(P.hasPermission(permission("doc", "meta"), { fields: ["author"] })),
    FastCheck.constantFrom("seniority", "absent").map((a) => P.hasAttribute(a, M.gte(1))),
    FastCheck.constant(P.hasResourceAttribute("ownerId", M.eq(M.subjectId()))),
    FastCheck.constant(P.hasRelationship("owner")),
  );

  const strategies = FastCheck.constantFrom(
    "First" as const,
    "Union" as const,
    "Intersection" as const,
  );

  const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec<{ node: P.Policy }>((tie) => ({
    node: FastCheck.oneof(
      { maxDepth: 4, withCrossShrink: true },
      leaf,
      FastCheck.tuple(
        FastCheck.array(tie("node"), { maxLength: 3 }),
        strategies,
      ).map(([ps, fieldStrategy]) => P.allOf(ps, { fieldStrategy })),
      FastCheck.tuple(
        FastCheck.array(tie("node"), { maxLength: 3 }),
        strategies,
      ).map(([ps, fieldStrategy]) => P.anyOf(ps, { fieldStrategy })),
      tie("node").map(P.not),
      tie("node").map((p) => P.labeled("l", p)),
      tie("node").map((p) => P.obliged(obligation("audit.log"), p)),
      FastCheck.array(
        FastCheck.tuple(tie("node"), FastCheck.boolean()).map(([c, permits]) =>
          permits ? P.permitWhen(c) : P.denyWhen(c),
        ),
        { maxLength: 3 },
      ).map((rs) => P.rules(rs)),
    ),
  })).node;

  /** Four subjects, because a rewrite sound for one may not be sound for another. */
  const subjects = [
    subjectWith({ id: "u-1" }),
    subjectWith({ id: "u-1", roles: ["editor"] }),
    subjectWith({ id: "u-1", roles: ["editor", "suspended"], permissions: ["doc:read"] }),
    subjectWith({
      id: "u-1",
      roles: ["legal"],
      permissions: ["doc:read", "doc:meta"],
      attributes: { seniority: 5 },
    }),
  ];

  it.effect("PROPERTY: the verdict, the fields and the duties are unchanged", () =>
    Effect.gen(function* () {
      // Over policies AND subjects. A rewrite that preserved the verdict only for
      // the subjects a test happened to pick would be no guarantee at all — the
      // field-strategy trap in particular is invisible unless two branches allow
      // with different field sets.
      let shrunk = 0;
      const resource = { id: "doc-1", ownerId: "u-1" };

      for (const policy of FastCheck.sample(tree, { numRuns: 120, seed: 1030 })) {
        const simplified = simplify(policy);
        if (JSON.stringify(simplified) !== JSON.stringify(policy)) shrunk += 1;

        for (const subject of subjects) {
          const run = (p: P.Policy) =>
            evaluate(p, { resource }).pipe(Effect.provide(testLayer(subject)));

          const before = yield* run(policy);
          const after = yield* run(simplified);

          const where = `${JSON.stringify(policy)} for ${subject.id}`;
          assert.strictEqual(isAllowed(after), isAllowed(before), `verdict: ${where}`);

          if (isAllowed(before) && isAllowed(after)) {
            assert.deepStrictEqual(
              after.visibleFields,
              before.visibleFields,
              `fields: ${where}`,
            );
            assert.deepStrictEqual(
              after.obligations.map((o) => o.id).sort(),
              before.obligations.map((o) => o.id).sort(),
              `duties: ${where}`,
            );
          }
        }
      }

      // Vacuity guard. If nothing ever shrank, the property above would hold for a
      // `simplify` that returned its argument.
      //
      // The threshold is set below the MEASURED value (17 of 120 trees under
      // seed 1030, numRuns 120 — see the `FastCheck.sample` call above)
      // rather than at a round number, because the sample is seeded: a guard
      // tuned to a lucky run is how a property test becomes flaky, which is worse
      // than a weak one. Widening the generator is the way to raise this, not
      // raising the number. (JH-06: recorded here, next to the threshold,
      // specifically so changing `tree`'s shape or either of the two numbers
      // above is a visible prompt to re-measure and re-justify `10`, rather
      // than a silently stale margin.)
      assert.isAbove(shrunk, 10, `only ${shrunk} of 120 trees shrank`);
    }));

  it.effect("PROPERTY: simplifying is idempotent on every generated tree", () =>
    Effect.gen(function* () {
      for (const policy of FastCheck.sample(tree, { numRuns: 200, seed: 1030 })) {
        const once = simplify(policy);
        assert.deepStrictEqual(
          simplify(once),
          once,
          `not idempotent: ${JSON.stringify(policy)}`,
        );
      }
    }));

  it(
    "a deep, programmatically-built tree (100k nested Not) does not overflow the call " +
      "stack (RP-01)",
    () => {
      // The same hazard `policyDepth` was fixed for (RolesAndDepth.test.ts's
      // matching regression test): nothing bounds recursion depth for a
      // policy assembled directly rather than decoded from JSON — the smart
      // constructors do not depth-check, so a loop of `not()` builds a tree
      // exactly as deep as the loop runs, and `simplify` is reachable
      // directly on a caller-held `Policy` with no prior decode step at all.
      // `simplify` now walks an explicit array-backed stack (via `Policy.ts`'s
      // `childrenOf`, the same one `policyDepth` uses) instead of native
      // recursion, so this must both return without throwing and produce the
      // correctly-simplified result — a single leaf under 100k `Not` wrappers
      // has no sibling structure for `simplify` to remove, so the shape is
      // unchanged; only the identity of the (already-simplified) leaf differs.
      const n = 100_000;
      let policy: P.Policy = P.hasPermission(permission("doc", "read"));
      for (let i = 0; i < n; i += 1) policy = P.not(policy);

      let result: P.Policy | undefined;
      assert.doesNotThrow(() => {
        result = simplify(policy);
      });
      assert.isDefined(result);
      if (result === undefined) return;
      assert.strictEqual(P.policyDepth(result), n);
    },
  );

  it("a wide tree (250k direct children) does not overflow the argument list", () => {
    // `simplify`'s width twin of the depth regression above — `flatten`
    // itself is `Array.prototype.flatMap`, already stack-safe regardless of
    // width, but the walk that feeds it children must not re-introduce a
    // per-child JS stack frame either.
    const children: ReadonlyArray<P.Policy> = Array.from({ length: 250_000 }, () =>
      P.hasPermission(permission("doc", "read")),
    );
    const wide = P.anyOf(children);
    let result: P.Policy | undefined;
    assert.doesNotThrow(() => {
      result = simplify(wide);
    });
    assert.isDefined(result);
    if (result === undefined) return;
    assert.strictEqual(result._tag, "AnyOf");
    if (result._tag !== "AnyOf") return;
    assert.strictEqual(result.policies.length, 250_000);
  });
});
