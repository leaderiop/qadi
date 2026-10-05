import { assert, describe, it } from "@effect/vitest";
import {
  atLeastVerdict,
  belowVerdict,
  compareVerdict,
  differsVerdict,
  dominatesVerdict,
  equalsVerdict,
  holds,
  isFiniteNumber,
  memberVerdict,
} from "../src/Compare.ts";
import type { CompareOp, Verdict } from "../src/Compare.ts";
import { makeSubjectId } from "../src/Identity.ts";
import * as M from "../src/Matcher.ts";
import { evaluatePredicate } from "../src/Predicate.ts";
import type { Predicate } from "../src/Predicate.ts";

/**
 * The operand universe: one value of every class a comparison can be handed —
 * absent, null, finite numbers of each sign, a numeric string, a boolean, the
 * three non-finite numbers, an object, an array, a bigint and a security label.
 * The interface is the test surface (ADR-QD-091): every verdict function is
 * checked against every pair, so a rule cannot hold for the classes someone
 * thought of and lapse for the rest.
 */
const LOW = { level: 1, compartments: ["a"] };
const HIGH = { level: 3, compartments: ["a", "b"] };
const OTHER = { level: 5, compartments: ["z"] };

const UNIVERSE: ReadonlyArray<unknown> = [
  undefined,
  null,
  0,
  3,
  -2.5,
  "3",
  true,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  Number.NaN,
  {},
  [],
  10n,
  LOW,
];

const show = (u: unknown): string =>
  Array.isArray(u)
    ? `[${u.map(show).join(", ")}]`
    : typeof u === "bigint"
      ? `${u}n`
      : typeof u === "number"
        ? String(u)
        : (JSON.stringify(u) ?? "undefined");

/** The ordering every verdict function shares, ahead of its own comparison. */
const absentFirst = (value: unknown, reference: unknown): Verdict | undefined =>
  value === undefined ? "ValueAbsent" : reference === undefined ? "ReferenceAbsent" : undefined;

const verdictOf = (condition: boolean): Verdict => (condition ? "Held" : "NotHeld");

const everyPair = (
  name: string,
  actual: (value: unknown, reference: unknown) => Verdict,
  expected: (value: unknown, reference: unknown) => Verdict,
): number => {
  let pairs = 0;
  for (const value of UNIVERSE) {
    for (const reference of UNIVERSE) {
      assert.strictEqual(
        actual(value, reference),
        expected(value, reference),
        `${name}(${show(value)}, ${show(reference)})`,
      );
      pairs += 1;
    }
  }
  return pairs;
};

describe("Compare.ts: one owner of comparison semantics (BEH-QD-305)", () => {
  it("holds is true for Held and nothing else", () => {
    const verdicts: ReadonlyArray<Verdict> = ["Held", "NotHeld", "ValueAbsent", "ReferenceAbsent", "Incomparable"];
    assert.deepStrictEqual(
      verdicts.filter(holds),
      ["Held"],
    );
  });

  it("isFiniteNumber accepts finite numbers only, without coercion", () => {
    assert.deepStrictEqual(
      UNIVERSE.filter(isFiniteNumber),
      [0, 3, -2.5],
    );
  });

  it("equalsVerdict: absent value, then absent reference, then strict equality (NaN never equal)", () => {
    const pairs = everyPair("equalsVerdict", equalsVerdict, (value, reference) =>
      absentFirst(value, reference) ?? verdictOf(value === reference),
    );
    assert.strictEqual(pairs, UNIVERSE.length * UNIVERSE.length);
    assert.strictEqual(equalsVerdict(undefined, undefined), "ValueAbsent");
    assert.strictEqual(equalsVerdict(3, undefined), "ReferenceAbsent");
    assert.strictEqual(equalsVerdict(Number.NaN, Number.NaN), "NotHeld");
    assert.strictEqual(equalsVerdict(null, null), "Held");
    assert.strictEqual(equalsVerdict("3", 3), "NotHeld");
  });

  it("differsVerdict: an absent operand denies rather than differing (CCR-QD-112)", () => {
    everyPair("differsVerdict", differsVerdict, (value, reference) =>
      absentFirst(value, reference) ?? verdictOf(value !== reference),
    );
    assert.strictEqual(differsVerdict(undefined, "x"), "ValueAbsent");
    assert.strictEqual(differsVerdict("x", undefined), "ReferenceAbsent");
    assert.strictEqual(differsVerdict(Number.NaN, Number.NaN), "Held");
  });

  it("atLeastVerdict and belowVerdict: both operands must be finite numbers, else Incomparable", () => {
    const finiteBoth = (value: unknown, reference: unknown): reference is number =>
      typeof value === "number" &&
      Number.isFinite(value) &&
      typeof reference === "number" &&
      Number.isFinite(reference);
    everyPair("atLeastVerdict", atLeastVerdict, (value, reference) =>
      absentFirst(value, reference) ??
      (typeof value === "number" && finiteBoth(value, reference)
        ? verdictOf(value >= reference)
        : "Incomparable"),
    );
    everyPair("belowVerdict", belowVerdict, (value, reference) =>
      absentFirst(value, reference) ??
      (typeof value === "number" && finiteBoth(value, reference)
        ? verdictOf(value < reference)
        : "Incomparable"),
    );
    // The load-bearing non-finite value for each direction (CCR-QD-116, CCR-QD-172).
    assert.strictEqual(atLeastVerdict(Number.POSITIVE_INFINITY, 3), "Incomparable");
    assert.strictEqual(belowVerdict(Number.NEGATIVE_INFINITY, 3), "Incomparable");
    // And the bound side (CCR-QD-120).
    assert.strictEqual(atLeastVerdict(3, Number.NEGATIVE_INFINITY), "Incomparable");
    assert.strictEqual(belowVerdict(3, Number.POSITIVE_INFINITY), "Incomparable");
    assert.strictEqual(atLeastVerdict("5", 3), "Incomparable");
    assert.strictEqual(atLeastVerdict(3, 3), "Held");
    assert.strictEqual(belowVerdict(3, 3), "NotHeld");
  });

  it("memberVerdict: SameValueZero membership; an absent value that is not a member is ValueAbsent", () => {
    const lists: ReadonlyArray<ReadonlyArray<unknown>> = [[], [3], [Number.NaN], [null, "3"], [undefined], UNIVERSE];
    for (const values of lists) {
      for (const value of UNIVERSE) {
        const expected: Verdict = values.includes(value)
          ? "Held"
          : value === undefined
            ? "ValueAbsent"
            : "NotHeld";
        assert.strictEqual(memberVerdict(value, values), expected, `${show(value)} in ${show(values)}`);
      }
    }
    assert.strictEqual(memberVerdict(Number.NaN, [Number.NaN]), "Held");
  });

  it("dominatesVerdict: labels only; disjoint compartments are NotHeld, not Incomparable", () => {
    everyPair("dominatesVerdict", dominatesVerdict, (value, reference) => {
      const absent = absentFirst(value, reference);
      if (absent !== undefined) return absent;
      return value === LOW && reference === LOW ? "Held" : "Incomparable";
    });
    assert.strictEqual(dominatesVerdict(HIGH, LOW), "Held");
    assert.strictEqual(dominatesVerdict(LOW, HIGH), "NotHeld");
    assert.strictEqual(dominatesVerdict(OTHER, LOW), "NotHeld");
    assert.strictEqual(dominatesVerdict({ level: Number.POSITIVE_INFINITY, compartments: [] }, LOW), "Incomparable");
  });

  it("compareVerdict dispatches each CompareOp to its named function", () => {
    const named: ReadonlyArray<readonly [CompareOp, (value: unknown, reference: unknown) => Verdict]> = [
      ["Eq", equalsVerdict],
      ["Neq", differsVerdict],
      ["Gte", atLeastVerdict],
      ["Lt", belowVerdict],
    ];
    for (const [op, verdict] of named) {
      everyPair(`compareVerdict(${op})`, (value, reference) => compareVerdict(op, value, reference), verdict);
    }
  });
});

// INV-QD-091: a primitive matcher and its predicate leaf are one function. The
// leaves of `judgeMatcher` and `evaluatePredicate` both read `Compare.ts`, so
// they agree by construction; this property is what says so, over every
// operand class on both sides, non-finite bounds included. The pair count is
// asserted so a shrunken universe fails rather than passing vacuously.
describe("INV-QD-091: a primitive matcher and its predicate leaf agree on every operand class", () => {
  const ctx: M.MatcherContext = {
    subject: {},
    subjectId: makeSubjectId("u-1"),
    resource: undefined,
    action: undefined,
  };

  const NUMBERS: ReadonlyArray<number> = UNIVERSE.filter((u): u is number => typeof u === "number");
  const LISTS: ReadonlyArray<ReadonlyArray<unknown>> = [[], [3], [Number.NaN], [null, "3"], [undefined], UNIVERSE];

  /** Each primitive matcher, beside the predicate leaf `toPredicate`'s `columnPredicate` maps it to. */
  const pairs: ReadonlyArray<readonly [M.Matcher, Predicate]> = [
    ...UNIVERSE.map((v) => [M.eq(M.literal(v)), { _tag: "Compare", column: "c", op: "Eq", value: v }] as const),
    ...UNIVERSE.map((v) => [M.neq(M.literal(v)), { _tag: "Compare", column: "c", op: "Neq", value: v }] as const),
    ...NUMBERS.map((n) => [M.gte(n), { _tag: "Compare", column: "c", op: "Gte", value: n }] as const),
    ...NUMBERS.map((n) => [M.lt(n), { _tag: "Compare", column: "c", op: "Lt", value: n }] as const),
    ...LISTS.map((vs) => [M.inArray(vs), { _tag: "MemberOf", column: "c", values: vs }] as const),
  ];

  it("PROPERTY: every primitive matcher and its predicate leaf agree on every operand class", () => {
    let checked = 0;
    for (const [matcher, leaf] of pairs) {
      for (const x of UNIVERSE) {
        assert.strictEqual(
          holds(M.judgeMatcher(matcher, x, ctx)),
          evaluatePredicate(leaf, { c: x }),
          `${JSON.stringify(leaf, (_k, v: unknown) => (typeof v === "bigint" ? `${v}n` : v))} on ${show(x)}`,
        );
        checked += 1;
      }
    }
    // 14 Eq + 14 Neq + 6 Gte + 6 Lt + 6 In matchers, over 14 values.
    assert.strictEqual(NUMBERS.length, 6);
    assert.strictEqual(checked, (14 + 14 + 6 + 6 + 6) * 14);
  });
});
