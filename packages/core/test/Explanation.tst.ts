/**
 * Type-level tests for `foldExplanationCases`: `Negated`/`Named`/`Owing` receive
 * their one part as the result type and `Table` one `RowResult` per row
 * (ARCH-17).
 */
import { expect, test } from "tstyche";
import type { Explanation, ExplanationCases, RowResult } from "../src/Explanation.ts";
import { explain, foldExplanationCases } from "../src/Explanation.ts";
import { hasRole } from "../src/Policy.ts";

test("foldExplanationCases infers its result type from the arms", () => {
  const cases: ExplanationCases<number> = {
    Requirement: () => 0,
    All: (_n, parts) => parts.length,
    Any: (_n, parts) => parts.length,
    Negated: (_n, part) => part,
    Named: (_n, part) => part,
    Owing: (_n, part) => part,
    Table: (_n, rows) => rows.length,
  };
  expect(foldExplanationCases(explain(hasRole("a")), cases)).type.toBe<number>();
});

test("a wrapper arm receives its one part as R, a Table arm one RowResult per row", () => {
  expect<Parameters<ExplanationCases<number>["Negated"]>[1]>().type.toBe<number>();
  expect<Parameters<ExplanationCases<number>["Named"]>[1]>().type.toBe<number>();
  expect<Parameters<ExplanationCases<number>["Owing"]>[1]>().type.toBe<number>();
  expect<Parameters<ExplanationCases<number>["All"]>[1]>().type.toBe<ReadonlyArray<number>>();
  expect<Parameters<ExplanationCases<number>["Table"]>[1]>().type.toBe<
    ReadonlyArray<RowResult<number>>
  >();
});

test("a cases object missing an arm is a compile error", () => {
  expect(foldExplanationCases).type.not.toBeCallableWith(explain(hasRole("a")), {
    Requirement: () => 0,
    All: () => 0,
    Any: () => 0,
    Negated: () => 0,
    Named: () => 0,
    Owing: () => 0,
  });
});

test("a wrapper arm that treats its part as an array is a compile error", () => {
  expect(foldExplanationCases).type.not.toBeCallableWith(explain(hasRole("a")), {
    Requirement: () => 0,
    All: () => 0,
    Any: () => 0,
    Negated: (_n: Explanation, part: ReadonlyArray<number>) => part.length,
    Named: () => 0,
    Owing: () => 0,
    Table: () => 0,
  });
});
