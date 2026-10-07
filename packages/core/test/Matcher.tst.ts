/**
 * Type-level tests for `foldMatcherCases`: a wrapper matcher's one child is a
 * value of the result type, not an array, and a missing arm does not compile
 * (ARCH-17).
 */
import { expect, test } from "tstyche";
import type { LeafMatcher, Matcher, MatcherCases } from "../src/Matcher.ts";
import { exists, foldMatcherCases, leafMatcherCases } from "../src/Matcher.ts";

test("foldMatcherCases infers its result type from the arms", () => {
  const cases: MatcherCases<number> = {
    ...leafMatcherCases(() => 0),
    FieldMatch: (_n, child) => child,
    SomeMatch: (_n, child) => child,
    EveryMatch: (_n, child) => child,
    Size: (_n, child) => child,
  };
  expect(foldMatcherCases(exists(), cases)).type.toBe<number>();
});

test("a wrapper arm receives its one child as R", () => {
  expect<Parameters<MatcherCases<number>["FieldMatch"]>[1]>().type.toBe<number>();
  expect<Parameters<MatcherCases<number>["SomeMatch"]>[1]>().type.toBe<number>();
  expect<Parameters<MatcherCases<number>["EveryMatch"]>[1]>().type.toBe<number>();
  expect<Parameters<MatcherCases<number>["Size"]>[1]>().type.toBe<number>();
});

test("leafMatcherCases returns exactly the leaf arms", () => {
  expect<keyof ReturnType<typeof leafMatcherCases<number>>>().type.toBe<LeafMatcher["_tag"]>();
});

test("a cases object missing an arm is a compile error", () => {
  expect(foldMatcherCases).type.not.toBeCallableWith(exists(), {
    ...leafMatcherCases(() => 0),
    FieldMatch: () => 0,
    SomeMatch: () => 0,
    EveryMatch: () => 0,
  });
});

test("a wrapper arm that treats its child as an array is a compile error", () => {
  expect(foldMatcherCases).type.not.toBeCallableWith(exists(), {
    ...leafMatcherCases(() => 0),
    FieldMatch: () => 0,
    SomeMatch: () => 0,
    EveryMatch: () => 0,
    Size: (_n: Matcher, child: ReadonlyArray<number>) => child.length,
  });
});
