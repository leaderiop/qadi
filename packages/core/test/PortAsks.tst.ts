/**
 * Pins that each port's description states, once, the request every policy
 * leaf puts to it, and that the serving facet keeps no second map of leaf to
 * name (ARCH-70, SCOPE-04, ADR-QD-134).
 *
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`. The correlation pins (an `asks` entry's result is
 * assignable to its port's `serving.asked` parameter) index a member that does
 * not exist yet, which would be a compile error, so they arrive with the member
 * (22-03). The five descriptions are written out rather than looped, so a sixth
 * port is a visible omission.
 */
import { expect, test } from "tstyche";
import type { ActedQuery } from "../src/DecisionHistory.ts";
import type { PortServingFacet } from "../src/PortServing.ts";
import type { DescriptionOf } from "../src/Ports.ts";

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
