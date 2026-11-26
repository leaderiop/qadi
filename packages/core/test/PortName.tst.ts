/**
 * Pins a port's identity: its names, stated once in `PortName.ts` (ARCH-77), and
 * the span each description states for itself.
 *
 * `PortSpanOf<N>` is read from the registry, so a description names only its own
 * port's span, and `DistinctSpanNames` (`PortDerivation.ts`) refuses two ports
 * that share one: the last test is the one that fails if a description's `span`
 * goes back to the whole `PortSpanName` union. No deliberate compile error lives
 * here, because `tsconfig.test.json` also compiles every `*.tst.ts`.
 */
import { expect, test } from "tstyche";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import type { PortName } from "../src/PortName.ts";
import type { PortSpanName, PortSpanOf } from "../src/Ports.ts";

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

test("a description's span is its own port's", () => {
  expect<{ span: "qadi.acted" }>().type.not.toBeAssignableTo<
    Pick<typeof attributeResolverPort, "span">
  >();
});
