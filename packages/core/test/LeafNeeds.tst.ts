/**
 * Pins the compile-time half of the leaf-needs table (ADR-QD-163, INV-QD-345).
 *
 * A row's `own` and `resourceId` are its tag's classifications, from closed tag
 * lists in which an unlisted tag gets `never`, and its `matcher` is read from the
 * variant's shape. So
 * a row that disagrees with its leaf does not compile, and neither does any row for
 * a leaf no list names yet. `absenceOf`'s guards trust the table; without this a
 * wrong row compiled and failed open. The verdict rows are pinned the same way.
 */
import { expect, test } from "tstyche";
import type { ActedResult } from "../src/DecisionHistory.ts";
import { LEAF_NEEDS, LEAF_VERDICTS } from "../src/LeafNeeds.ts";
import type {
  ActedOutcome,
  LeafNeedOf,
  LeafNeedOfVariant,
  LeafVerdictOf,
  LeafVerdicts,
} from "../src/LeafNeeds.ts";
import type { Matcher } from "../src/Matcher.ts";

test("own is the classification of the variant's tag", () => {
  expect<LeafNeedOf<"HasAction">["own"]>().type.toBe<"Action">();
  expect<LeafNeedOf<"HasResourceAttribute">["own"]>().type.toBe<"Resource">();
  expect<LeafNeedOf<"HasAttribute">["own"]>().type.toBe<"Nothing">();
  expect<LeafNeedOf<"HasRelationship">["own"]>().type.toBe<"Nothing">();
});

test("matcher is true exactly for a variant that carries one", () => {
  expect<LeafNeedOf<"HasAttribute">["matcher"]>().type.toBe<true>();
  expect<LeafNeedOf<"HasResourceAttribute">["matcher"]>().type.toBe<true>();
  expect<LeafNeedOf<"HasAction">["matcher"]>().type.toBe<false>();
  expect<LeafNeedOf<"HasRole">["matcher"]>().type.toBe<false>();
});

test("resourceId is the classification of the variant's tag", () => {
  expect<LeafNeedOf<"HasRelationship">["resourceId"]>().type.toBe<"Always">();
  expect<LeafNeedOf<"HasActed">["resourceId"]>().type.toBe<"ByScope">();
  expect<LeafNeedOf<"HasSignature">["resourceId"]>().type.toBe<"ByScope">();
  expect<LeafNeedOf<"HasCustom">["resourceId"]>().type.toBe<"Never">();
});

test("a row that disagrees with its leaf is refused", () => {
  // A leaf that reads the resource itself but is never asked about its matcher.
  expect<LeafNeedOf<"HasResourceAttribute">>().type.not.toBeAssignableFrom({
    own: "Resource",
    matcher: false,
    resourceId: "Never",
  } as const);
  // A leaf with no matcher claiming one.
  expect<LeafNeedOf<"HasRole">>().type.not.toBeAssignableFrom({
    own: "Nothing",
    matcher: true,
    resourceId: "Never",
  } as const);
  // A leaf that names no action claiming to read it.
  expect<LeafNeedOf<"HasRelationship">>().type.not.toBeAssignableFrom({
    own: "Action",
    matcher: false,
    resourceId: "Always",
  } as const);
  // A scoped port leaf claiming it never asks about one resource.
  expect<LeafNeedOf<"HasActed">>().type.not.toBeAssignableFrom({
    own: "Nothing",
    matcher: false,
    resourceId: "Never",
  } as const);
  // A leaf that reads the resource not saying so.
  expect<LeafNeedOf<"HasResourceAttribute">>().type.not.toBeAssignableFrom({
    own: "Nothing",
    matcher: true,
    resourceId: "Never",
  } as const);
});

test("every row of the table is its leaf's", () => {
  expect(LEAF_NEEDS).type.toBeAssignableTo<{
    readonly [K in keyof typeof LEAF_NEEDS]: LeafNeedOf<K>;
  }>();
});

test("a leaf no classification names has no row", () => {
  // Leaves the policy does not have: one that reads the action itself, one that
  // reads the resource itself through a matcher.
  type HasActionIn = { readonly _tag: "HasActionIn"; readonly actions: ReadonlyArray<string> };
  type HasResourceField = {
    readonly _tag: "HasResourceField";
    readonly attribute: string;
    readonly matcher: Matcher;
  };
  expect<LeafNeedOfVariant<HasActionIn>["own"]>().type.toBe<never>();
  expect<LeafNeedOfVariant<HasActionIn>["resourceId"]>().type.toBe<never>();
  expect<LeafNeedOfVariant<HasResourceField>["own"]>().type.toBe<never>();
  // So no row fits it, the fail-open "reads nothing" row included.
  expect<LeafNeedOfVariant<HasActionIn>>().type.not.toBeAssignableFrom({
    own: "Nothing",
    matcher: false,
    resourceId: "Never",
  } as const);
  expect<LeafNeedOfVariant<HasActionIn>>().type.not.toBeAssignableFrom({
    own: "Action",
    matcher: false,
    resourceId: "Never",
  } as const);
  expect<LeafNeedOfVariant<HasResourceField>>().type.not.toBeAssignableFrom({
    own: "Nothing",
    matcher: true,
    resourceId: "Never",
  } as const);
});

test("the two acted rows have one type, and an acted row cannot answer NotHeld", () => {
  expect<LeafVerdictOf<"HasActed">>().type.toBe<(answer: ActedResult) => ActedOutcome>();
  expect<LeafVerdictOf<"HasNotActed">>().type.toBe<LeafVerdictOf<"HasActed">>();
  expect<LeafVerdictOf<"HasActed">>().type.not.toBeAssignableFrom(
    (_answer: ActedResult) => "NotHeld" as const,
  );
});

test("an attribute row returns a verdict, not a boolean", () => {
  expect<LeafVerdictOf<"HasAttribute">>().type.not.toBeAssignableFrom(
    (_leaf: unknown, _value: unknown, _context: unknown) => true,
  );
});

test("a tag that is not a leaf has no row", () => {
  expect<LeafVerdictOf<"NotALeaf">>().type.toBe<never>();
});

test("a record missing a row is refused, and the record is one", () => {
  expect<LeafVerdicts>().type.not.toBeAssignableFrom<Omit<LeafVerdicts, "HasCustom">>();
  expect<typeof LEAF_VERDICTS>().type.toBeAssignableTo<LeafVerdicts>();
});
