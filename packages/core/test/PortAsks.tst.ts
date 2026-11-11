/**
 * Pins that each port's description states, once, the request every policy
 * leaf puts to it, that the request is one the port's serving facet reads a
 * name from, and that the facet keeps no second map of leaf to name (ARCH-70,
 * SCOPE-04, ADR-QD-134).
 *
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`. The five descriptions and each tag they read are
 * written out rather than looped, so a sixth port or a seventh tag is a
 * visible omission.
 */
import { expect, test } from "tstyche";
import type { ActedQuery } from "../src/DecisionHistory.ts";
import type { PortServingFacet } from "../src/PortServing.ts";
import type { ArgsOf, DescriptionOf, PortTypes } from "../src/Ports.ts";

/** What a facet's `asked` takes: a complete request, or one as far as a site supplies it. */
type AskedParameter<K extends keyof PortTypes> = Parameters<DescriptionOf<K>["serving"]["asked"]>[0];

test("every port's description has an asks member", () => {
  expect<DescriptionOf<"AttributeResolver">>().type.toHaveProperty("asks");
  expect<DescriptionOf<"DecisionHistory">>().type.toHaveProperty("asks");
  expect<DescriptionOf<"RelationshipResolver">>().type.toHaveProperty("asks");
  expect<DescriptionOf<"CustomPredicate">>().type.toHaveProperty("asks");
  expect<DescriptionOf<"SignatureHistory">>().type.toHaveProperty("asks");
});

test("the serving facet keeps no leaf map", () => {
  expect<PortServingFacet<"DecisionHistory", [query: ActedQuery]>>().type.not.toHaveProperty("leaves");
});

test("what each leaf asks is a request its port's serving facet reads a name from", () => {
  expect<ReturnType<NonNullable<DescriptionOf<"AttributeResolver">["asks"]["HasAttribute"]>>>().type.toBeAssignableTo<
    AskedParameter<"AttributeResolver">
  >();
  expect<ReturnType<NonNullable<DescriptionOf<"DecisionHistory">["asks"]["HasActed"]>>>().type.toBeAssignableTo<
    AskedParameter<"DecisionHistory">
  >();
  expect<ReturnType<NonNullable<DescriptionOf<"DecisionHistory">["asks"]["HasNotActed"]>>>().type.toBeAssignableTo<
    AskedParameter<"DecisionHistory">
  >();
  expect<ReturnType<NonNullable<DescriptionOf<"RelationshipResolver">["asks"]["HasRelationship"]>>>().type.toBeAssignableTo<
    AskedParameter<"RelationshipResolver">
  >();
  expect<ReturnType<NonNullable<DescriptionOf<"CustomPredicate">["asks"]["HasCustom"]>>>().type.toBeAssignableTo<
    AskedParameter<"CustomPredicate">
  >();
  expect<ReturnType<NonNullable<DescriptionOf<"SignatureHistory">["asks"]["HasSignature"]>>>().type.toBeAssignableTo<
    AskedParameter<"SignatureHistory">
  >();
});

test("a complete request is one the facet reads a name from too, which is how a host admits it", () => {
  expect<ArgsOf<PortTypes["AttributeResolver"]>>().type.toBeAssignableTo<AskedParameter<"AttributeResolver">>();
  expect<ArgsOf<PortTypes["DecisionHistory"]>>().type.toBeAssignableTo<AskedParameter<"DecisionHistory">>();
  expect<ArgsOf<PortTypes["RelationshipResolver"]>>().type.toBeAssignableTo<AskedParameter<"RelationshipResolver">>();
  expect<ArgsOf<PortTypes["CustomPredicate"]>>().type.toBeAssignableTo<AskedParameter<"CustomPredicate">>();
  expect<ArgsOf<PortTypes["SignatureHistory"]>>().type.toBeAssignableTo<AskedParameter<"SignatureHistory">>();
});
