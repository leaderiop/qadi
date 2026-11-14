/**
 * Pins the compile-time half of the hydration drop-reason table.
 *
 * `hydrationDropMeaning` takes the closed `HydrationDropReason` union, so a
 * removed reason (`UnregisteredAtoms`) or a free string is not a call that
 * compiles. Each reason is a row of one table with its kind, the three kinds
 * partition the reasons, and a row without a kind or with a fourth kind is
 * refused where the table is declared; the negatives below pin the same refusal
 * through the exported row type, each as a `@ts-expect-error` directive whose
 * message fragment tstyche checks. Every expected type is written by hand
 * (ADR-QD-152).
 */
import { expect, test } from "tstyche";
import { hydrationDropMeaning, isHydrationDropReason } from "../src/HydrationMetrics.ts";
import type { HydrationDropReasonOf, HydrationDropRow } from "../src/index.ts";
import type {
  ClientHydrationDropReason,
  DehydrationDropReason,
  HydrationDropMeaning,
  HydrationDropReason,
} from "../src/HydrationMetrics.ts";

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

test("each reason union, written out", () => {
  expect<HydrationDropReason>().type.toBe<
    | "ForeignSubject"
    | "UnencodablePolicy"
    | "PayloadSubjectMismatch"
    | "MalformedEntry"
    | "UndecodablePolicy"
    | "EntryTooDeep"
    | "UnsupportedPayloadVersion"
    | "MalformedPayload"
    | "PayloadTooDeep"
  >();
  expect<DehydrationDropReason>().type.toBe<"ForeignSubject" | "UnencodablePolicy">();
  expect<ClientHydrationDropReason>().type.toBe<
    | "PayloadSubjectMismatch"
    | "MalformedEntry"
    | "UndecodablePolicy"
    | "EntryTooDeep"
    | "UnsupportedPayloadVersion"
    | "MalformedPayload"
    | "PayloadTooDeep"
  >();
});

test("the three kinds partition the reasons, pairwise disjoint", () => {
  expect<
    | HydrationDropReasonOf<"dehydration">
    | HydrationDropReasonOf<"payload">
    | HydrationDropReasonOf<"entry">
  >().type.toBe<HydrationDropReason>();
  expect<
    Extract<HydrationDropReasonOf<"dehydration">, HydrationDropReasonOf<"payload">>
  >().type.toBe<never>();
  expect<
    Extract<HydrationDropReasonOf<"dehydration">, HydrationDropReasonOf<"entry">>
  >().type.toBe<never>();
  expect<
    Extract<HydrationDropReasonOf<"payload">, HydrationDropReasonOf<"entry">>
  >().type.toBe<never>();
});

test("each kind holds exactly its reasons, written out", () => {
  expect<HydrationDropReasonOf<"dehydration">>().type.toBe<
    "ForeignSubject" | "UnencodablePolicy"
  >();
  expect<HydrationDropReasonOf<"payload">>().type.toBe<
    | "PayloadSubjectMismatch"
    | "UnsupportedPayloadVersion"
    | "MalformedPayload"
    | "PayloadTooDeep"
  >();
  expect<HydrationDropReasonOf<"entry">>().type.toBe<
    "MalformedEntry" | "UndecodablePolicy" | "EntryTooDeep"
  >();
});

test("the named unions are the kind subsets", () => {
  expect<DehydrationDropReason>().type.toBe<HydrationDropReasonOf<"dehydration">>();
  expect<ClientHydrationDropReason>().type.toBe<HydrationDropReasonOf<"payload" | "entry">>();
});

test("a row kind is one of three words, and an unknown kind is refused", () => {
  expect<HydrationDropRow["kind"]>().type.toBe<"dehydration" | "payload" | "entry">();
  // @ts-expect-error does not satisfy the constraint
  expect<HydrationDropReasonOf<"other">>().type.toBe<never>();
  // @ts-expect-error is not assignable to type
  const other: HydrationDropRow = { kind: "other", summary: "s", remedy: "r" };
  expect(other).type.toBe<HydrationDropRow>();
});

test("a row without a kind is refused", () => {
  // @ts-expect-error is missing in type
  const row: HydrationDropRow = { summary: "s", remedy: "r" };
  expect(row).type.toBe<HydrationDropRow>();
});
