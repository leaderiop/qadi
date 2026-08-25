import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "effect/testing/FastCheck";
import {
  intersectFields,
  project,
  unionFields,
  Allow,
  Deny,
} from "../src/Decision.ts";
import { makeSubjectId } from "../src/Identity.ts";
import * as M from "../src/Matcher.ts";
import {
  compareLabels,
  isSecurityLabel,
  join,
  labelDominates,
  meet,
  type SecurityLabel,
} from "../src/SecurityLabel.ts";

const ctx: M.MatcherContext = {
  subject: { dept: "eng", nested: { deep: 7 } },
  subjectId: makeSubjectId("u1"),
  resource: { owner: "eng", tags: ["a", "b"] },
  action: "write",
};

const run = (matcher: M.Matcher, value: unknown) => M.evaluateMatcher(matcher, value, ctx);

describe("matchers", () => {
  it("eq compares against a literal", () => {
    assert.isTrue(run(M.eq(M.literal(1)), 1));
    assert.isFalse(run(M.eq(M.literal(1)), 2));
  });

  it("eq resolves a subject reference", () => {
    assert.isTrue(run(M.eq(M.subject("dept")), "eng"));
  });

  it("eq resolves a resource reference", () => {
    assert.isTrue(run(M.eq(M.resource("owner")), "eng"));
  });

  it("eq resolves the action reference", () => {
    assert.isTrue(run(M.eq(M.action()), "write"));
    assert.isFalse(run(M.eq(M.action()), "read"));
  });

  it("neq inverts eq", () => {
    assert.isTrue(run(M.neq(M.literal(1)), 2));
    assert.isFalse(run(M.neq(M.literal(1)), 1));
  });

  it("in tests membership", () => {
    assert.isTrue(run(M.inArray([1, 2]), 2));
    assert.isFalse(run(M.inArray([1, 2]), 3));
  });

  it("exists rejects null and undefined but accepts falsy values", () => {
    assert.isTrue(run(M.exists(), 0));
    assert.isTrue(run(M.exists(), ""));
    assert.isFalse(run(M.exists(), null));
    assert.isFalse(run(M.exists(), undefined));
  });

  it("gte and lt require numbers", () => {
    assert.isTrue(run(M.gte(3), 3));
    assert.isFalse(run(M.gte(3), 2));
    assert.isFalse(run(M.gte(3), "5"));
    assert.isTrue(run(M.lt(3), 2));
    assert.isFalse(run(M.lt(3), 3));
  });

  it("contains works on arrays and strings only", () => {
    assert.isTrue(run(M.contains("a"), ["a", "b"]));
    assert.isTrue(run(M.contains("ell"), "hello"));
    assert.isFalse(run(M.contains("a"), 42));
    assert.isFalse(run(M.contains(1), "1"));
  });

  it("fieldMatch descends into an object", () => {
    assert.isTrue(run(M.fieldMatch("deep", M.gte(7)), { deep: 7 }));
    assert.isFalse(run(M.fieldMatch("deep", M.gte(7)), "not an object"));
  });

  it("fieldMatch refuses a NON-OBJECT whose property would have matched", () => {
    // A mutation survivor found this. Every existing case used a non-object whose
    // property was `undefined`, so `isObject(v) && …` and `isObject(v) || …` agreed
    // by accident — both false. A string has a real `length`, so the two disagree:
    // the guard denies, and dropping it would read the property off a primitive.
    //
    // `"hello".length` is 5, which satisfies `gte(3)`. The answer must still be
    // false, because a string is not an object with a `length` field the policy
    // author meant to address.
    assert.isFalse(run(M.fieldMatch("length", M.gte(3)), "hello"));
    // An array IS an object, so this one legitimately matches — which is the
    // contrast that makes the string case meaningful rather than incidental.
    assert.isTrue(run(M.fieldMatch("length", M.gte(3)), [1, 2, 3]));
  });

  it("someMatch and everyMatch quantify over arrays", () => {
    assert.isTrue(run(M.someMatch(M.gte(3)), [1, 5]));
    assert.isFalse(run(M.someMatch(M.gte(3)), [1, 2]));
    assert.isTrue(run(M.everyMatch(M.gte(1)), [1, 5]));
    assert.isFalse(run(M.everyMatch(M.gte(3)), [1, 5]));
    assert.isFalse(run(M.everyMatch(M.gte(1)), "not an array"));
  });

  it("size applies a matcher to a length", () => {
    assert.isTrue(run(M.size(M.gte(2)), ["a", "b"]));
    assert.isTrue(run(M.size(M.gte(2)), "ab"));
    assert.isFalse(run(M.size(M.gte(2)), 42));
  });

  it("size denies rather than throwing against null or undefined", () => {
    // `lengthOf` reads `.length` off arrays and strings only; `null`/`undefined`
    // have neither, and unlike `42` (which merely has no `.length`, so reading
    // it is `undefined` without throwing) they throw on property access if the
    // `Array.isArray`/`typeof ... === "string"` guards are ever bypassed.
    assert.isFalse(run(M.size(M.gte(2)), null));
    assert.isFalse(run(M.size(M.gte(2)), undefined));
  });

  it("size short-circuits on an unmeasurable value rather than running the child matcher against `undefined`", () => {
    // `M.eq(M.literal(undefined))` is a child matcher that is TRUE against
    // `undefined` — the one value `Size` must never hand it. `gte`/`lt` can't
    // demonstrate this: every number comparison against `undefined` is false
    // regardless of whether the short-circuit runs, which is exactly why this
    // survived as a mutant on `length !== undefined && …`.
    const trueOnUndefined = M.eq(M.literal(undefined));
    assert.isTrue(run(trueOnUndefined, undefined));
    assert.isFalse(run(M.size(trueOnUndefined), 42));
  });
});

describe("isObject / getByPath against null", () => {
  it("getByPath denies rather than throwing when the root is null", () => {
    // `isObject`'s guard is `typeof v === "object" && v !== null` — `typeof
    // null` is itself `"object"`, so the `v !== null` half is the only thing
    // standing between this and indexing into `null`.
    assert.isUndefined(M.getByPath(null, "a"));
    assert.isUndefined(M.getByPath(null, "a.b"));
  });

  it("fieldMatch denies rather than throwing when the value is null", () => {
    assert.isFalse(run(M.fieldMatch("x", M.gte(1)), null));
  });
});

describe("security labels", () => {
  const label = (level: number, ...compartments: ReadonlyArray<string>): SecurityLabel => ({
    level,
    compartments,
  });

  it("a total order behaves like one", () => {
    assert.strictEqual(compareLabels(label(2), label(1)), "Dominates");
    assert.strictEqual(compareLabels(label(1), label(2)), "DominatedBy");
    assert.strictEqual(compareLabels(label(1), label(1)), "Equal");
  });

  it("compartments make the order PARTIAL — the whole reason E4 exists", () => {
    // (Secret, {CRYPTO}) and (Secret, {BIO}) are incomparable: neither may read
    // the other. Read as scalars both are level 2 and each reads the other,
    // which allows exactly where dominance denies.
    const crypto = label(2, "CRYPTO");
    const bio = label(2, "BIO");
    assert.strictEqual(compareLabels(crypto, bio), "Incomparable");
    assert.strictEqual(compareLabels(bio, crypto), "Incomparable");
    assert.isFalse(labelDominates(crypto, bio));
    assert.isFalse(labelDominates(bio, crypto));
  });

  it("breadth is required as well as height", () => {
    // Higher level, narrower compartments: still not dominant.
    assert.strictEqual(compareLabels(label(3), label(1, "CRYPTO")), "Incomparable");
    assert.strictEqual(compareLabels(label(3, "CRYPTO", "BIO"), label(1, "CRYPTO")), "Dominates");
  });

  it("Equal is distinguishable from Dominates, which is why there are four values", () => {
    assert.strictEqual(compareLabels(label(2, "A"), label(2, "A")), "Equal");
    assert.strictEqual(compareLabels(label(2, "A", "B"), label(2, "A")), "Dominates");
    // Both are `labelDominates`; only `compareLabels` tells them apart.
    assert.isTrue(labelDominates(label(2, "A"), label(2, "A")));
  });

  it("compartment order is irrelevant", () => {
    assert.strictEqual(compareLabels(label(1, "A", "B"), label(1, "B", "A")), "Equal");
  });

  it("the empty compartment set is dominated by every label at or below its level", () => {
    assert.strictEqual(compareLabels(label(1, "A"), label(1)), "Dominates");
    assert.strictEqual(compareLabels(label(0), label(0)), "Equal");
  });

  it("recognises labels in untrusted data and rejects everything else", () => {
    assert.isTrue(isSecurityLabel({ level: 1, compartments: [] }));
    assert.isFalse(isSecurityLabel({ level: "1", compartments: [] }));
    assert.isFalse(isSecurityLabel({ level: 1, compartments: [2] }));
    assert.isFalse(isSecurityLabel({ level: 1 }));
    assert.isFalse(isSecurityLabel(null));
    assert.isFalse(isSecurityLabel(2));
    assert.isFalse(isSecurityLabel(undefined));
  });

  it("OVERLAPPING compartment sets are incomparable, not merely disjoint ones", () => {
    // The shape of incomparability the suite did not have. Every other case here
    // is either disjoint singletons (`{CRYPTO}` vs `{BIO}`) or a strict superset;
    // this is the canonical partial-order case, where the sets SHARE a
    // compartment and still neither contains the other.
    //
    // It is coverage of a case a reviewer would expect rather than a mutant
    // nothing else catches — `length <=` and `some` in place of `every` are both
    // killed by the tests above as well.
    assert.strictEqual(compareLabels(label(2, "A", "B"), label(2, "A", "C")), "Incomparable");
    assert.strictEqual(compareLabels(label(2, "A", "C"), label(2, "A", "B")), "Incomparable");
    assert.strictEqual(compareLabels(label(3, "A", "B"), label(1, "A", "C")), "Incomparable");
  });

  // -------------------------------------------------------------------------
  // The order laws (INV-QD-019)
  //
  // Both MOD-QD-027 and MOD-QD-029 asked for these and neither got them; the
  // laws were stated in prose and asserted only by example. They matter because
  // the guarantee the star-property exists to give — that no sequence of
  // permitted reads and writes moves information downwards — is TRANSITIVITY,
  // and nothing tested that dominance composes.
  //
  // Honest about what they are: with `>=` on levels and containment on
  // compartments the laws hold STRUCTURALLY, and no mutation tried against
  // `covers` or `compareLabels` broke one of them without also breaking an
  // example test. So these are regression protection, not bug-finders — and the
  // change they protect against is a named one. MOD-QD-029 asks for `join`, and
  // a configurable lattice or a compartment hierarchy is exactly where a
  // structurally-emergent transitivity stops being emergent.
  // -------------------------------------------------------------------------

  // Three compartments over four levels. Deliberately small: a wide alphabet
  // makes overlapping-incomparable pairs vanishingly rare in a sample, and
  // those are the pairs where these laws can fail.
  const labels: FastCheck.Arbitrary<SecurityLabel> = FastCheck.record({
    level: FastCheck.integer({ min: 0, max: 3 }),
    compartments: FastCheck.subarray(["A", "B", "C"]),
  });

  const sameSet = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) =>
    a.length === b.length && a.every((c) => b.includes(c));

  it("PROPERTY: dominance is reflexive and antisymmetric", () => {
    for (const a of FastCheck.sample(labels, { numRuns: 200, seed: 1029 })) {
      assert.strictEqual(compareLabels(a, a), "Equal", `reflexivity: ${JSON.stringify(a)}`);
      assert.isTrue(labelDominates(a, a));
    }

    for (const [a, b] of FastCheck.sample(FastCheck.tuple(labels, labels), { numRuns: 400, seed: 1029 })) {
      // Antisymmetry as the IMPLICATION, not as an example: mutual dominance
      // must force equality. Asserting `Equal` on a pair built to be equal
      // proves nothing about the pairs that are not.
      if (labelDominates(a, b) && labelDominates(b, a)) {
        assert.strictEqual(a.level, b.level);
        assert.isTrue(sameSet(a.compartments, b.compartments));
      }
    }
  });

  it("PROPERTY: dominance is transitive", () => {
    let witnesses = 0;
    for (const [a, b, c] of FastCheck.sample(FastCheck.tuple(labels, labels, labels), { numRuns: 2000, seed: 1029 })) {
      if (labelDominates(a, b) && labelDominates(b, c)) {
        witnesses += 1;
        assert.isTrue(
          labelDominates(a, c),
          `transitivity: ${JSON.stringify([a, b, c])}`,
        );
      }
    }
    // A vacuous property passes. Assert the antecedent actually fired, or a
    // `labelDominates` that always returned false would satisfy this test.
    // Only about one triple in sixteen forms a chain, so the sample has to be
    // large for the guard to mean anything — measured, not guessed.
    assert.isAbove(witnesses, 80);
  });

  it("PROPERTY: no permitted read-then-write moves information downwards", () => {
    // The composite property MOD-QD-027 named, in the terms it named it: a
    // subject may READ `source` when it dominates it, and WRITE `sink` when the
    // sink dominates the subject. Information then flows source -> sink, and
    // confidentiality requires the sink to dominate the source.
    //
    // It reduces to transitivity above, which is the point worth recording: the
    // star-property's guarantee is not an extra rule the evaluator enforces, it
    // is a consequence of the order being an order.
    let flows = 0;
    for (const [source, subject, sink] of FastCheck.sample(
      FastCheck.tuple(labels, labels, labels),
      { numRuns: 2000, seed: 1029 },
    )) {
      const mayRead = labelDominates(subject, source);
      const mayWrite = labelDominates(sink, subject);
      if (mayRead && mayWrite) {
        flows += 1;
        assert.isTrue(
          labelDominates(sink, source),
          `leak: ${JSON.stringify({ source, subject, sink })}`,
        );
      }
    }
    assert.isAbove(flows, 80);
  });

  it("join is the label of something derived from both", () => {
    // The worked case from ADR-QD-029: max of the levels, UNION of the
    // compartments.
    assert.deepStrictEqual(join(label(3, "CRYPTO"), label(1, "BIO")), {
      level: 3,
      compartments: ["CRYPTO", "BIO"],
    });
    // Idempotent, commutative on content, and duplicate-free.
    assert.deepStrictEqual(join(label(2, "A"), label(2, "A")), { level: 2, compartments: ["A"] });
  });

  it("THE MISTAKE join exists to prevent under-classifies", () => {
    // Taking the higher level and carrying ITS compartments is the natural error.
    const wrong = { level: 3, compartments: ["CRYPTO"] };
    const right = join(label(3, "CRYPTO"), label(1, "BIO"));

    // The correct label strictly dominates the mistaken one, which is what makes
    // the mistake dangerous rather than merely wrong: the derived document is
    // labelled LOWER than its contents.
    assert.strictEqual(compareLabels(right, wrong), "Dominates");

    // And here is the consequence, spelled out. A reader cleared for
    // (3, {CRYPTO}) may read the mistakenly-labelled document, and may not read
    // the correctly-labelled one — while every comparison behaves correctly.
    const reader = label(3, "CRYPTO");
    assert.isTrue(labelDominates(reader, wrong));
    assert.isFalse(labelDominates(reader, right));
  });

  it("meet is the most that two labels both admit", () => {
    assert.deepStrictEqual(meet(label(3, "CRYPTO", "BIO"), label(1, "BIO")), {
      level: 1,
      compartments: ["BIO"],
    });
    assert.deepStrictEqual(meet(label(2, "A"), label(2, "B")), { level: 2, compartments: [] });
  });

  it("PROPERTY: join is the LEAST upper bound", () => {
    // MOD-QD-029's Verification rows 4 and 5, unstatable until now.
    for (const [a, b, c] of FastCheck.sample(
      FastCheck.tuple(labels, labels, labels),
      { numRuns: 600, seed: 1029 },
    )) {
      const j = join(a, b);
      assert.isTrue(labelDominates(j, a), `not an upper bound of a: ${JSON.stringify([a, b])}`);
      assert.isTrue(labelDominates(j, b), `not an upper bound of b: ${JSON.stringify([a, b])}`);

      // Least: anything above both is above the join.
      if (labelDominates(c, a) && labelDominates(c, b)) {
        assert.isTrue(labelDominates(c, j), `not least: ${JSON.stringify([a, b, c])}`);
      }
    }
  });

  it("PROPERTY: meet is the GREATEST lower bound", () => {
    for (const [a, b, c] of FastCheck.sample(
      FastCheck.tuple(labels, labels, labels),
      { numRuns: 600, seed: 1029 },
    )) {
      const m = meet(a, b);
      assert.isTrue(labelDominates(a, m), `not a lower bound of a: ${JSON.stringify([a, b])}`);
      assert.isTrue(labelDominates(b, m), `not a lower bound of b: ${JSON.stringify([a, b])}`);

      if (labelDominates(a, c) && labelDominates(b, c)) {
        assert.isTrue(labelDominates(m, c), `not greatest: ${JSON.stringify([a, b, c])}`);
      }
    }
  });

  it("PROPERTY: the absorption laws hold, so this is a lattice and not two functions", () => {
    // join(a, meet(a, b)) = a and meet(a, join(a, b)) = a. The pair of laws that
    // distinguishes a lattice from any two operators that happen to produce
    // bounds — and the ones a future compartment hierarchy would break first.
    for (const [a, b] of FastCheck.sample(FastCheck.tuple(labels, labels), { numRuns: 400, seed: 1029 })) {
      assert.strictEqual(
        compareLabels(join(a, meet(a, b)), a),
        "Equal",
        `absorption failed: ${JSON.stringify([a, b])}`,
      );
      assert.strictEqual(
        compareLabels(meet(a, join(a, b)), a),
        "Equal",
        `absorption failed: ${JSON.stringify([a, b])}`,
      );
    }
  });

  it("PROPERTY: compareLabels is total, and its two strict values mirror", () => {
    for (const [a, b] of FastCheck.sample(FastCheck.tuple(labels, labels), { numRuns: 400, seed: 1029 })) {
      const forward = compareLabels(a, b);
      assert.include(["Equal", "Dominates", "DominatedBy", "Incomparable"], forward);

      // Swapping the operands must swap the answer, never change its kind. Both
      // rules of every label model are asked by swapping operands, so an
      // asymmetry here would make one direction of the rule silently wrong.
      const reverse = compareLabels(b, a);
      const mirrored =
        forward === "Dominates"
          ? "DominatedBy"
          : forward === "DominatedBy"
            ? "Dominates"
            : forward;
      assert.strictEqual(reverse, mirrored, `mirror: ${JSON.stringify([a, b])}`);
    }
  });
});

describe("the dominates matcher", () => {
  const ctxWith = (
    subject: Readonly<Record<string, unknown>>,
    resource: Readonly<Record<string, unknown>> | undefined,
  ): M.MatcherContext => ({ subject, subjectId: makeSubjectId("u1"), resource, action: undefined });

  const secret = { level: 2, compartments: ["CRYPTO"] };
  const internal = { level: 1, compartments: [] };
  const bio = { level: 2, compartments: ["BIO"] };

  it("allows a read down and refuses a read up", () => {
    const context = ctxWith({}, { label: internal });
    assert.isTrue(M.evaluateMatcher(M.dominates(M.resource("label")), secret, context));

    const up = ctxWith({}, { label: secret });
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("label")), internal, up));
  });

  it("refuses across incomparable compartments in both directions", () => {
    assert.isFalse(
      M.evaluateMatcher(M.dominates(M.resource("label")), secret, ctxWith({}, { label: bio })),
    );
    assert.isFalse(
      M.evaluateMatcher(M.dominates(M.resource("label")), bio, ctxWith({}, { label: secret })),
    );
  });

  it("denies rather than throwing when either side is not a label", () => {
    // The quiet failure mode: a policy written against the wrong attribute name
    // looks like a working least-privilege rule. `evaluateMatcher` is total, so
    // it cannot complain — these cases are pinned instead.
    const context = ctxWith({}, { label: internal, notALabel: 7 });
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("label")), 2, context));
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("label")), undefined, context));
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("notALabel")), secret, context));
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("missing")), secret, context));
  });

  it("dominance is reflexive, so acting at your own level is permitted", () => {
    assert.isTrue(
      M.evaluateMatcher(M.dominates(M.resource("label")), secret, ctxWith({}, { label: secret })),
    );
  });
});

describe("referencesAction", () => {
  // The evaluator asks this before running a matcher, because the matcher
  // itself cannot fail: an absent action would resolve to undefined, match
  // nothing, and be reported as a denial rather than as the caller's mistake.
  it("sees a bare action reference under eq and neq", () => {
    assert.isTrue(M.referencesAction(M.eq(M.action())));
    assert.isTrue(M.referencesAction(M.neq(M.action())));
    assert.isTrue(M.referencesAction(M.dominates(M.action())));
  });

  it("sees one nested at any depth", () => {
    assert.isTrue(M.referencesAction(M.fieldMatch("op", M.eq(M.action()))));
    assert.isTrue(M.referencesAction(M.someMatch(M.eq(M.action()))));
    assert.isTrue(M.referencesAction(M.everyMatch(M.neq(M.action()))));
    assert.isTrue(M.referencesAction(M.size(M.eq(M.action()))));
  });

  it("is false for every matcher that cannot name it", () => {
    const withoutAction: ReadonlyArray<M.Matcher> = [
      M.eq(M.subjectId()),
      M.neq(M.resource("owner")),
      M.dominates(M.resource("label")),
      M.inArray([1]),
      M.exists(),
      M.gte(1),
      M.lt(1),
      M.contains("a"),
      M.fieldMatch("x", M.exists()),
      M.someMatch(M.gte(1)),
      M.everyMatch(M.lt(1)),
      M.size(M.gte(1)),
    ];
    for (const matcher of withoutAction) {
      assert.isFalse(M.referencesAction(matcher), matcher._tag);
    }
  });
});

describe("referencesResource", () => {
  // The mirror image, asked by the predicate translator rather than the
  // evaluator: a matcher reading the resource compares against a *column*, and
  // folding it against the absent resource would build a filter out of
  // `undefined` with no error to announce it (ADR-QD-024).
  it("sees a bare resource reference under every comparison", () => {
    assert.isTrue(M.referencesResource(M.eq(M.resource("owner"))));
    assert.isTrue(M.referencesResource(M.neq(M.resource("owner"))));
    assert.isTrue(M.referencesResource(M.dominates(M.resource("label"))));
  });

  it("sees one nested at any depth", () => {
    assert.isTrue(M.referencesResource(M.fieldMatch("a", M.eq(M.resource("x")))));
    assert.isTrue(M.referencesResource(M.someMatch(M.neq(M.resource("x")))));
    assert.isTrue(M.referencesResource(M.everyMatch(M.eq(M.resource("x")))));
    assert.isTrue(M.referencesResource(M.size(M.eq(M.resource("x")))));
  });

  it("is false for every matcher that cannot name it", () => {
    // Every arm, not a sample: `Match.tagsExhaustive` makes each arm its own
    // function, so an unexercised one is visible as a coverage gap rather than
    // hidden inside a single switch.
    const withoutResource: ReadonlyArray<M.Matcher> = [
      M.eq(M.subjectId()),
      M.neq(M.subject("tenantId")),
      M.dominates(M.subject("clearance")),
      M.inArray([1]),
      M.exists(),
      M.gte(1),
      M.lt(1),
      M.contains("a"),
      M.fieldMatch("x", M.exists()),
      M.someMatch(M.gte(1)),
      M.everyMatch(M.lt(1)),
      M.size(M.contains("a")),
    ];
    for (const matcher of withoutResource) {
      assert.isFalse(M.referencesResource(matcher), matcher._tag);
    }
  });
});

describe("getByPath", () => {
  it("returns the input for an empty path", () => {
    assert.deepStrictEqual(M.getByPath({ a: 1 }, ""), { a: 1 });
  });

  it("walks a dot path", () => {
    assert.strictEqual(M.getByPath({ a: { b: { c: 3 } } }, "a.b.c"), 3);
  });

  it("returns undefined at any missing step", () => {
    assert.isUndefined(M.getByPath({ a: 1 }, "a.b.c"));
    assert.isUndefined(M.getByPath(undefined, "a"));
  });
});

describe("field lattice", () => {
  it("undefined is the top: intersecting with it is identity", () => {
    assert.deepStrictEqual(intersectFields(undefined, ["a"]), ["a"]);
    assert.deepStrictEqual(intersectFields(["a"], undefined), ["a"]);
    assert.isUndefined(intersectFields(undefined, undefined));
  });

  it("intersection keeps the overlap", () => {
    assert.deepStrictEqual(intersectFields(["a", "b"], ["b", "c"]), ["b"]);
  });

  it("union absorbs to all-fields when either side is unrestricted", () => {
    assert.isUndefined(unionFields(undefined, ["a"]));
    assert.deepStrictEqual([...(unionFields(["a"], ["b"]) ?? [])].sort(), ["a", "b"]);
  });

  it("intersection is path-aware: an unbounded spec doesn't lose to an exact-string miss", () => {
    // A naive exact-string filter would return [] here, wrongly denying
    // address.street even though "address.**" already grants it.
    assert.deepStrictEqual(intersectFields(["address.**"], ["address.street"]), [
      "address.street",
    ]);
  });

  it("intersection stays conservative at the '*' depth boundary", () => {
    assert.deepStrictEqual(intersectFields(["address.*"], ["address.street.zip"]), []);
  });
});

describe("project", () => {
  const data = { id: "1", title: "T", secret: "S" };
  const allow = (fields: ReadonlyArray<string> | undefined) =>
    new Allow({
      evaluationId: "e",
      subjectId: makeSubjectId("u"),
      durationMillis: 0,
      trace: { policyTag: "HasRole", allowed: true, children: [], obligations: [] },
      visibleFields: fields,
      obligations: [],
    });

  it("a denial exposes nothing", () => {
    const deny = new Deny({
      evaluationId: "e",
      subjectId: makeSubjectId("u"),
      durationMillis: 0,
      trace: { policyTag: "HasRole", allowed: false, children: [], obligations: [] },
      reason: "no",
    });
    assert.deepStrictEqual(project(deny, data), {});
  });

  it("an unrestricted allow exposes everything", () => {
    assert.deepStrictEqual(project(allow(undefined), data), data);
  });

  it("a restricted allow exposes only the listed fields", () => {
    assert.deepStrictEqual(project(allow(["id"]), data), { id: "1" });
  });

  it("a path-aware restricted allow projects nested data through the public API", () => {
    // `contact` is typed as a bag rather than an exact shape: `Partial<A>` is
    // shallow, so a nested field is either the WHOLE original sub-object or
    // absent — never itself partial at the type level — which would make an
    // expected literal missing a sibling key fail to type-check otherwise.
    const nested: { id: string; contact: Record<string, unknown> } = {
      id: "1",
      contact: { email: "a@b.com", phone: "555" },
    };
    assert.deepStrictEqual(project(allow(["id", "contact.email"]), nested), {
      id: "1",
      contact: { email: "a@b.com" },
    });
  });
});
