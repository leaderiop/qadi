/**
 * The field-visibility lattice and what each `FieldStrategy` means over it,
 * tested at `FieldLattice.ts`'s interface (ARCH-12).
 *
 * The examples and laws for `intersectFields`/`unionFields` moved here from
 * `Decision.test.ts` with their assertions unchanged; `mergeFields` and the
 * strategy law table are new. Every row of the law table is asserted exactly,
 * because its literals are evaluated at module load and Stryker does not mutate
 * them (ADR-QD-076) — the same discipline `ShortCircuit.test.ts` states for its
 * own table — and every law is also checked against the merge it describes, so a
 * flag that lied would fail a property rather than only an example.
 */
import { assert, describe, it, vi } from "@effect/vitest";
import * as FastCheck from "fast-check";
import { Allow, project } from "../src/Decision.ts";
import type { VisibleFields } from "../src/FieldLattice.ts";
import {
  fieldStrategyLaws,
  isFieldStrategy,
  intersectFields,
  mergeFields,
  unionFields,
} from "../src/FieldLattice.ts";
import * as FieldPath from "../src/FieldPath.ts";
import { makeSubjectId } from "../src/Identity.ts";
import type { FieldStrategy } from "../src/Policy.ts";

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

  it("PERFORMANCE: computes each spec's shape once, not once per pair", () => {
    // The defect this pins: `compareFieldPaths` alone computes `shapeOf` on
    // BOTH operands — `split(".")` plus two array allocations — every single
    // call, and `intersectFields`'s comparison is O(|a|·|b|), so a naive
    // implementation calling `compareFieldPaths` in the nested loop would call
    // `shapeOf` `2·|a|·|b|` times. Hoisted, it is called exactly `|a|+|b|`
    // times — once per spec, however many pairs that spec is compared across.
    const spy = vi.spyOn(FieldPath, "shapeOf");
    try {
      const a = ["a", "b", "c", "d"];
      const b = ["w", "x", "y"];
      intersectFields(a, b);
      assert.strictEqual(spy.mock.calls.length, a.length + b.length);
    } finally {
      spy.mockRestore();
    }
  });

  // ---------------------------------------------------------------------------
  // The lattice laws (EK-01, RBJ-01): Simplify.ts's flatten and ADR-QD-030 both
  // lean on `intersectFields`/`unionFields` being associative, and ADR-QD-034
  // names visibility-widening as the one direction a field-strategy bug must
  // never take — CCR-QD-039's silent-widening incident happened to exactly
  // this algebra. The examples above pin specific inputs; these pin the laws
  // those examples were standing in for, the same way `Matcher.test.ts`
  // property-tests `SecurityLabel`'s join/meet as a genuine lattice rather than
  // by example alone.
  //
  // A small, three-segment alphabet, deliberately: a wide one makes two specs
  // sharing a path (where the interesting `*`/`**`/literal interactions live)
  // vanishingly rare in a sample.
  // -------------------------------------------------------------------------

  const segment = FastCheck.constantFrom("a", "b", "c");
  const literalPath = FastCheck.array(segment, { minLength: 1, maxLength: 3 }).map((s) =>
    s.join("."),
  );
  const wildcardPath = FastCheck.tuple(
    FastCheck.array(segment, { minLength: 0, maxLength: 2 }),
    FastCheck.constantFrom("*", "**"),
  ).map(([prefix, terminal]) => [...prefix, terminal].join("."));
  // Also exercises the malformed shapes FieldPath.ts documents as silently
  // degrading rather than throwing: an empty segment (`"a."`), and a
  // non-terminal wildcard (`"a.*.b"`), which `shapeOf` treats as a literal.
  const malformedPath = FastCheck.constantFrom("a.", ".b", "a.*.b", "**.a");
  const fieldSpec = FastCheck.oneof(literalPath, wildcardPath, malformedPath);
  const fieldSet = FastCheck.array(fieldSpec, { minLength: 0, maxLength: 4 });
  const visibleFields: FastCheck.Arbitrary<VisibleFields> = FastCheck.oneof(
    FastCheck.constant(undefined),
    fieldSet,
  );
  const normalize = (fields: VisibleFields): VisibleFields =>
    fields === undefined ? undefined : [...new Set(fields)].sort();

  const dataValue = FastCheck.oneof(FastCheck.string(), FastCheck.integer());
  const dataArb = FastCheck.dictionary(
    FastCheck.constantFrom("a", "b", "c"),
    FastCheck.oneof(
      dataValue,
      FastCheck.dictionary(FastCheck.constantFrom("a", "b", "c"), dataValue, { maxKeys: 3 }),
    ),
    { maxKeys: 3 },
  );

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  /** Every key `sub` discloses, `sup` discloses too, with the identical value. */
  const isProjectionSubset = (
    sub: Record<string, unknown>,
    sup: Record<string, unknown>,
  ): boolean =>
    Object.keys(sub).every((key) => {
      if (!Object.hasOwn(sup, key)) return false;
      const subValue = sub[key];
      const supValue = sup[key];
      if (isRecord(subValue)) {
        return isRecord(supValue) && isProjectionSubset(subValue, supValue);
      }
      return Object.is(subValue, supValue);
    });

  const allowWith = (fields: VisibleFields) =>
    new Allow({
      evaluationId: "e",
      subjectId: makeSubjectId("u"),
      durationMillis: 0,
      trace: { policyTag: "HasRole", allowed: true, children: [], obligations: [] },
      visibleFields: fields,
      obligations: [],
    });

  /** What `fields` actually discloses of `data`, independent of which of two shape-equal spec strings represents it. */
  const disclosureOf = (fields: VisibleFields, data: Record<string, unknown>) =>
    project(allowWith(fields), data);

  it("PROPERTY: intersectFields is idempotent — a set intersected with itself is itself, deduped and sorted", () => {
    for (const a of FastCheck.sample(visibleFields, { numRuns: 300, seed: 2026 })) {
      assert.deepStrictEqual(intersectFields(a, a), normalize(a), `idempotence: ${JSON.stringify(a)}`);
    }
  });

  it("PROPERTY: [] is intersectFields's absorbing element", () => {
    for (const a of FastCheck.sample(visibleFields, { numRuns: 300, seed: 2026 })) {
      assert.deepStrictEqual(intersectFields(a, []), [], `absorber: ${JSON.stringify(a)}`);
    }
  });

  // Commutativity and associativity are asserted through `project` (semantic
  // equivalence), not `deepStrictEqual` on `intersectFields`'s own return
  // array (syntactic equivalence) — and this distinction is itself a finding,
  // not a style choice. Two DIFFERENT spec strings can have the identical
  // `shapeOf` shape ("a" and "a.**" both denote {path: ["a"], reach:
  // Infinity} — see `FieldPath.ts`'s own comment on bare literals). When
  // `intersectFields` meets two such specs, `CONTAINMENT_KEEP`'s "Equal" arm
  // used to keep the second (`B`) operand's literal text, so which of the two
  // interchangeable strings survived depended on argument *position*, not on
  // the algebra: `intersectFields(["b.a.b","a","b.b.c"], ["a.**"])` and its
  // argument-swapped form returned `["a.**"]` and `["a"]` respectively —
  // different arrays, and `assert.deepStrictEqual` on the raw return
  // correctly called that a difference. Both arrays denote the identical disclosure, though: neither
  // spec's `shapeOf` differs, so `project` reads them identically for any
  // data. The laws ADR-QD-030/ADR-QD-034 actually need — a merge is safe to
  // reorder or nest differently because *what a subject can see* does not
  // change — are exactly the semantic ones below, and are what
  // `Simplify.ts`'s flattening actually leans on.
  //
  // ARCH-12 C5 (CCR-QD-174) since made the raw output order-independent too:
  // on `"Equal"` the lexicographically smaller text is kept, whichever side it
  // is on, and the byte-level properties further down pin that. The two
  // properties here stay semantic: disclosure is what they were written to
  // protect.
  it("PROPERTY: intersectFields is commutative in what it discloses", () => {
    for (const [a, b, data] of FastCheck.sample(
      FastCheck.tuple(visibleFields, visibleFields, dataArb),
      { numRuns: 300, seed: 2026 },
    )) {
      assert.deepStrictEqual(
        disclosureOf(intersectFields(a, b), data),
        disclosureOf(intersectFields(b, a), data),
        `commutativity: ${JSON.stringify({ a, b, data })}`,
      );
    }
  });

  it("PROPERTY: intersectFields is associative in what it discloses", () => {
    for (const [a, b, c, data] of FastCheck.sample(
      FastCheck.tuple(visibleFields, visibleFields, visibleFields, dataArb),
      { numRuns: 300, seed: 2026 },
    )) {
      assert.deepStrictEqual(
        disclosureOf(intersectFields(intersectFields(a, b), c), data),
        disclosureOf(intersectFields(a, intersectFields(b, c)), data),
        `associativity: ${JSON.stringify({ a, b, c, data })}`,
      );
    }
  });

  it("PROPERTY: unionFields is commutative, associative and idempotent", () => {
    // `unionFields` has no analogous tie to break — it is an exact string-set
    // union with no `compareShapes` call in it (see its own doc comment: "no
    // path-aware algorithm change needed here") — so these hold as raw,
    // syntactic array equality.
    for (const [a, b, c] of FastCheck.sample(
      FastCheck.tuple(visibleFields, visibleFields, visibleFields),
      { numRuns: 300, seed: 2026 },
    )) {
      assert.deepStrictEqual(unionFields(a, b), unionFields(b, a), "commutativity");
      assert.deepStrictEqual(
        unionFields(unionFields(a, b), c),
        unionFields(a, unionFields(b, c)),
        "associativity",
      );
    }
    for (const a of FastCheck.sample(visibleFields, { numRuns: 300, seed: 2026 })) {
      assert.deepStrictEqual(unionFields(a, a), normalize(a), "idempotence");
    }
  });

  // Byte-level order independence (ARCH-12 C5, D-12-c(ii)). Two specs with the
  // identical shape (`"a"` and `"a.**"`) meet as `"Equal"`, and the meet keeps
  // the lexicographically smaller text rather than whichever operand sits on
  // the right — so which representative survives no longer depends on argument
  // position, and `Allow.visibleFields` bytes no longer depend on child order.
  it("an Equal pair keeps the lexicographically smaller spec, whichever side it is on", () => {
    assert.deepStrictEqual(intersectFields(["title"], ["title.**"]), ["title"]);
    assert.deepStrictEqual(intersectFields(["title.**"], ["title"]), ["title"]);
  });

  it("PROPERTY: intersectFields is byte-for-byte commutative", () => {
    for (const [a, b] of FastCheck.sample(FastCheck.tuple(visibleFields, visibleFields), {
      numRuns: 300,
      seed: 2026,
    })) {
      assert.deepStrictEqual(intersectFields(a, b), intersectFields(b, a), JSON.stringify({ a, b }));
    }
  });

  it("PROPERTY: an n-ary Intersection fold is byte-for-byte independent of input order", () => {
    const setsAndPermutation = FastCheck.array(visibleFields, { minLength: 1, maxLength: 5 }).chain(
      (sets) =>
        FastCheck.shuffledSubarray(sets, { minLength: sets.length, maxLength: sets.length }).map(
          (permuted) => [sets, permuted] as const,
        ),
    );
    const fold = (sets: ReadonlyArray<VisibleFields>) =>
      sets.reduce<VisibleFields>((acc, cur) => intersectFields(acc, cur), undefined);
    for (const [sets, permuted] of FastCheck.sample(setsAndPermutation, {
      numRuns: 300,
      seed: 2026,
    })) {
      assert.deepStrictEqual(fold(permuted), fold(sets), JSON.stringify({ sets, permuted }));
    }
  });

  // The differential property EK-01 asked for: checked through `project`, the
  // actual consumer of the lattice, rather than through `intersectFields`'s
  // own internal `Containment` labels — a bug in the meet operation and a bug
  // in how `project` reads its result would otherwise be free to cancel out.
  it("PROPERTY: intersectFields never widens what project discloses relative to either operand", () => {
    for (const [a, b, data] of FastCheck.sample(
      FastCheck.tuple(visibleFields, visibleFields, dataArb),
      { numRuns: 300, seed: 2026 },
    )) {
      const meetProjection = disclosureOf(intersectFields(a, b), data);
      const aProjection = disclosureOf(a, data);
      const bProjection = disclosureOf(b, data);
      assert.isTrue(
        isProjectionSubset(meetProjection, aProjection),
        `disclosed more than a: ${JSON.stringify({ a, b, data })}`,
      );
      assert.isTrue(
        isProjectionSubset(meetProjection, bProjection),
        `disclosed more than b: ${JSON.stringify({ a, b, data })}`,
      );
    }
  });

  // ---------------------------------------------------------------------------
  // `mergeFields` and the strategy laws (ARCH-12, ADR-QD-092)
  // ---------------------------------------------------------------------------

  const KNOWN: ReadonlyArray<FieldStrategy> = ["Intersection", "Union", "First"];
  /** Values outside the union, built in process via `JSON.parse` (no `as`, AGENTS.md §6). */
  const BOGUS: ReadonlyArray<FieldStrategy> = [
    "Xor",
    "toString",
    "constructor",
    "__proto__",
    "hasOwnProperty",
    "",
  ].map((raw): FieldStrategy => JSON.parse(JSON.stringify(raw)));

  const setList = FastCheck.array(visibleFields, { minLength: 0, maxLength: 5 });
  const nonEmptySetList = FastCheck.array(visibleFields, { minLength: 1, maxLength: 5 });
  const withPermutation = nonEmptySetList.chain((sets) =>
    FastCheck.shuffledSubarray(sets, { minLength: sets.length, maxLength: sets.length }).map(
      (permuted): readonly [ReadonlyArray<VisibleFields>, ReadonlyArray<VisibleFields>] => [
        sets,
        permuted,
      ],
    ),
  );
  /** Whether two field sets disclose the same thing of every sampled record. */
  const sameDisclosure = (a: VisibleFields, b: VisibleFields, where: string) => {
    for (const data of FastCheck.sample(dataArb, { numRuns: 20, seed: 7 })) {
      assert.deepStrictEqual(disclosureOf(a, data), disclosureOf(b, data), where);
    }
  };

  it("Intersection's laws: not decided by its first input, top is its unit, one input is itself", () => {
    const laws = fieldStrategyLaws("Intersection");
    assert.strictEqual(laws.decidedByFirst, false);
    assert.strictEqual(laws.emptyIsUnit, true);
    assert.strictEqual(laws.singletonIsIdentity, true);
  });

  it("Union's laws: not decided by its first input, top absorbs it, one input is itself", () => {
    const laws = fieldStrategyLaws("Union");
    assert.strictEqual(laws.decidedByFirst, false);
    assert.strictEqual(laws.emptyIsUnit, false);
    assert.strictEqual(laws.singletonIsIdentity, true);
  });

  it("First's laws: decided by its first input, no unit, one input is itself", () => {
    const laws = fieldStrategyLaws("First");
    assert.strictEqual(laws.decidedByFirst, true);
    assert.strictEqual(laws.emptyIsUnit, false);
    assert.strictEqual(laws.singletonIsIdentity, true);
  });

  it("a strategy outside the union — prototype keys included — grants no fields and no law holds", () => {
    for (const bogus of BOGUS) {
      const laws = fieldStrategyLaws(bogus);
      assert.strictEqual(laws.decidedByFirst, false, bogus);
      assert.strictEqual(laws.emptyIsUnit, false, bogus);
      assert.strictEqual(laws.singletonIsIdentity, false, bogus);
      assert.deepStrictEqual(mergeFields(bogus, [undefined]), [], bogus);
      assert.deepStrictEqual(mergeFields(bogus, [["a"]]), [], bogus);
      assert.deepStrictEqual(mergeFields(bogus, []), [], bogus);
    }
  });

  it("isFieldStrategy admits exactly the three strategies — not a prototype key, not a non-string", () => {
    // The membership test `fieldStrategyLaws` and `Explanation.ts` share
    // (ADR-QD-092 amendment, CCR-QD-183), so the sentence and the evaluator
    // cannot disagree about which values are outside the union.
    for (const strategy of KNOWN) assert.isTrue(isFieldStrategy(strategy), strategy);
    for (const bogus of BOGUS) assert.isFalse(isFieldStrategy(bogus), bogus);
    for (const other of [42, true, null, undefined, {}, Symbol("Union")]) {
      assert.isFalse(isFieldStrategy(other), String(other));
    }
    // An object whose property key is a strategy's name: `Object.hasOwn`
    // coerces its key argument, so only the string check keeps this out.
    assert.isFalse(isFieldStrategy({ toString: () => "Union" }));
  });

  it("merging no inputs is top under every known strategy", () => {
    for (const strategy of KNOWN) assert.isUndefined(mergeFields(strategy, []), strategy);
  });

  it("PROPERTY: Union's single-pass merge equals the pairwise unionFields fold, byte for byte", () => {
    // What licenses keeping the fast path at all.
    for (const sets of FastCheck.sample(nonEmptySetList, { numRuns: 300, seed: 2027 })) {
      const [first, ...rest] = sets;
      assert.deepStrictEqual(
        mergeFields("Union", sets),
        rest.reduce<VisibleFields>((acc, cur) => unionFields(acc, cur), normalize(first)),
        JSON.stringify(sets),
      );
    }
  });

  it("PROPERTY: Intersection's merge equals the pairwise intersectFields fold from top, byte for byte", () => {
    for (const sets of FastCheck.sample(setList, { numRuns: 300, seed: 2027 })) {
      assert.deepStrictEqual(
        mergeFields("Intersection", sets),
        sets.reduce<VisibleFields>((acc, cur) => intersectFields(acc, cur), undefined),
        JSON.stringify(sets),
      );
    }
  });

  it("PROPERTY: Intersection and Union are byte-for-byte independent of input order", () => {
    for (const [sets, permuted] of FastCheck.sample(withPermutation, { numRuns: 300, seed: 2027 })) {
      for (const strategy of ["Intersection", "Union"] as const) {
        assert.deepStrictEqual(
          mergeFields(strategy, permuted),
          mergeFields(strategy, sets),
          `${strategy}: ${JSON.stringify({ sets, permuted })}`,
        );
      }
    }
  });

  it("First is the one strategy order matters to: its merge is its first input, by reference", () => {
    const a = ["a"];
    const b = ["b"];
    assert.strictEqual(mergeFields("First", [a, b]), a);
    assert.strictEqual(mergeFields("First", [b, a]), b);
    assert.notDeepEqual(mergeFields("First", [a, b]), mergeFields("First", [b, a]));
  });

  it("PROPERTY: merging a set with itself discloses that set, under every known strategy", () => {
    for (const x of FastCheck.sample(visibleFields, { numRuns: 100, seed: 2027 })) {
      for (const strategy of KNOWN) {
        sameDisclosure(mergeFields(strategy, [x, x]), x, `${strategy}: ${JSON.stringify(x)}`);
      }
    }
  });

  it("PROPERTY: a merge never discloses more than its inputs' union (ADR-QD-034)", () => {
    for (const [sets, data] of FastCheck.sample(FastCheck.tuple(nonEmptySetList, dataArb), {
      numRuns: 300,
      seed: 2027,
    })) {
      const ceiling = disclosureOf(
        sets.reduce<VisibleFields>((acc, cur) => unionFields(acc, cur), []),
        data,
      );
      for (const strategy of KNOWN) {
        assert.isTrue(
          isProjectionSubset(disclosureOf(mergeFields(strategy, sets), data), ceiling),
          `${strategy} disclosed more than its inputs: ${JSON.stringify({ sets, data })}`,
        );
      }
    }
  });

  it("PROPERTY: every law flag is true of the merge it describes", () => {
    for (const [before, after] of FastCheck.sample(FastCheck.tuple(setList, setList), {
      numRuns: 200,
      seed: 2027,
    })) {
      for (const strategy of KNOWN) {
        const laws = fieldStrategyLaws(strategy);
        const where = `${strategy}: ${JSON.stringify({ before, after })}`;
        if (laws.emptyIsUnit) {
          sameDisclosure(
            mergeFields(strategy, [...before, mergeFields(strategy, []), ...after]),
            mergeFields(strategy, [...before, ...after]),
            where,
          );
        }
        const sets = [...before, ...after];
        const [first] = sets;
        if (laws.decidedByFirst && sets.length > 0) {
          assert.strictEqual(mergeFields(strategy, sets), first, where);
        }
        if (laws.singletonIsIdentity) {
          sameDisclosure(mergeFields(strategy, [first]), first, where);
        }
      }
    }
  }, 60_000);

  it("where emptyIsUnit is false, a counterexample shows the empty merge is not a unit", () => {
    // Union: top absorbs, so an empty merge beside `["a"]` widens it to everything.
    assert.deepStrictEqual(mergeFields("Union", [["a"]]), ["a"]);
    assert.isUndefined(mergeFields("Union", [["a"], mergeFields("Union", [])]));
    // First: an empty merge ahead of `["a"]` becomes the first input and wins.
    assert.deepStrictEqual(mergeFields("First", [["a"]]), ["a"]);
    assert.isUndefined(mergeFields("First", [mergeFields("First", []), ["a"]]));
  });
});
