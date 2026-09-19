/**
 * `intersectFields`/`unionFields`/`project`/`Allow`/`Deny` live in
 * `Decision.ts`, but their tests previously lived in `Matcher.test.ts` —
 * moved here so the `X.test.ts` ↔ `X.ts` naming convention this test
 * directory otherwise follows (`FieldPath.test.ts` for `FieldPath.ts`, etc.)
 * holds for `Decision.ts` too. A reader who cannot find `Decision.test.ts`
 * would otherwise wrongly conclude these exports were untested (issue #67).
 */
import { assert, describe, it, vi } from "@effect/vitest";
import * as FastCheck from "fast-check";
import { Allow, Deny, intersectFields, project, unionFields } from "../src/Decision.ts";
import type { VisibleFields } from "../src/Decision.ts";
import * as FieldPath from "../src/FieldPath.ts";
import { makeSubjectId } from "../src/Identity.ts";

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
  // always keeps the second (`B`) operand's literal text, so which of the two
  // interchangeable strings survives depends on argument *position*, not on
  // the algebra: built and run against this codebase's real `intersectFields`,
  // `intersectFields(["a"], ["b.a.b","a","b.b.c"])` and its argument-swapped
  // form return `["a.**"]` and `["a"]` respectively — different arrays, and
  // `assert.deepStrictEqual` on the raw return correctly calls that a
  // difference. Both arrays denote the identical disclosure, though: neither
  // spec's `shapeOf` differs, so `project` reads them identically for any
  // data. The laws ADR-QD-030/ADR-QD-034 actually need — a merge is safe to
  // reorder or nest differently because *what a subject can see* does not
  // change — are exactly the semantic ones below, and are what
  // `Simplify.ts`'s flattening actually leans on; nothing in this codebase
  // claims `intersectFields`'s raw output is representative-stable, and this
  // suite should not either.
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
