/**
 * Pins a port's identity, stated once in `PortName.ts` (ARCH-77, D-02).
 *
 * `PortSpanOf<N>` is what keeps a description from naming another port's span:
 * the last test is the one that fails if `PortDescription.span` goes back to
 * the whole `PortSpanName` union. No deliberate compile error lives here,
 * because `tsconfig.test.json` also compiles every `*.tst.ts`.
 */
import { expect, test } from "tstyche";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import type { PortDescription, PortShape } from "../src/PortDescription.ts";
import type { PortName, PortSpanName, PortSpanOf } from "../src/PortName.ts";

test("PortName is exactly the five ports", () => {
  expect<PortName>().type.toBe<
    | "AttributeResolver"
    | "DecisionHistory"
    | "RelationshipResolver"
    | "CustomPredicate"
    | "SignatureHistory"
  >();
});

test("each port has its own span, and PortSpanName is the five of them", () => {
  expect<PortSpanOf<"AttributeResolver">>().type.toBe<"qadi.attribute">();
  expect<PortSpanOf<"DecisionHistory">>().type.toBe<"qadi.acted">();
  expect<PortSpanName>().type.toBe<
    "qadi.attribute" | "qadi.acted" | "qadi.hasRelationship" | "qadi.hasCustom" | "qadi.hasSignature"
  >();
});

test("a description's span is its own port's, and no other", () => {
  expect<
    PortDescription<"AttributeResolver", unknown, PortShape, [], unknown, unknown>["span"]
  >().type.toBe<"qadi.attribute">();
  expect<{ span: "qadi.acted" }>().type.not.toBeAssignableTo<
    Pick<typeof attributeResolverPort, "span">
  >();
});
