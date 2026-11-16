/**
 * Pins the compile-time half of the leaf-needs table: a row's `own` and `matcher`
 * are its leaf variant's, so a row that disagrees with its leaf does not compile
 * (ADR-QD-163, INV-QD-345).
 *
 * `absenceOf`'s guards trust the table; without this a wrong row compiled and
 * failed open.
 */
import { expect, test } from "tstyche";
import { LEAF_NEEDS } from "../src/LeafNeeds.ts";
import type { LeafNeedOf } from "../src/LeafNeeds.ts";

test("own is the input the variant reads itself", () => {
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
