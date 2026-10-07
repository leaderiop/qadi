/**
 * Pins the compile-time half of the hydration drop-reason meaning table.
 *
 * `hydrationDropMeaning` takes the closed `HydrationDropReason` union, so a
 * removed reason (`UnregisteredAtoms`) or a free string is not a call that
 * compiles. The table itself is a mapped type over that union, so a reason
 * added without a row is a compile error at the declaration.
 */
import { expect, test } from "tstyche";
import { hydrationDropMeaning, isHydrationDropReason } from "../src/HydrationMetrics.ts";
import type { HydrationDropMeaning, HydrationDropReason } from "../src/HydrationMetrics.ts";

test("hydrationDropMeaning takes exactly the closed reason union", () => {
  expect<Parameters<typeof hydrationDropMeaning>[0]>().type.toBe<HydrationDropReason>();
  expect(hydrationDropMeaning).type.toBeCallableWith("MalformedPayload");
  expect(hydrationDropMeaning).type.not.toBeCallableWith("UnregisteredAtoms");
  expect(hydrationDropMeaning).type.not.toBeCallableWith("anything");
});

test("hydrationDropMeaning returns the two-sentence meaning", () => {
  expect(hydrationDropMeaning("MalformedPayload")).type.toBe<HydrationDropMeaning>();
});

test("isHydrationDropReason narrows a string to the union", () => {
  expect(isHydrationDropReason).type.toBe<(word: string) => word is HydrationDropReason>();
});
