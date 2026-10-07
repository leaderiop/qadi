/**
 * Pins what the span codec refuses to compile (ARCH-21, INV-QD-044's floor).
 *
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`; a refusal is asserted with `not.toBeCallableWith`.
 */
import { expect, test } from "tstyche";
import * as Schema from "effect/Schema";
import type { PortSpanRowOf, SpanType, SpanValue } from "../src/PortSpan.ts";
import type { PortName } from "../src/PortMetrics.ts";
import { spanStruct } from "../src/PortSpanEncode.ts";
import type { DescriptionOf, PortTypes } from "../src/Ports.ts";

test("every field needs a key", () => {
  expect(spanStruct).type.not.toBeCallableWith(
    { a: Schema.optionalKey(Schema.String), b: Schema.optionalKey(Schema.String) },
    { a: "qadi.a" },
  );
});

test("a key lives in the qadi namespace", () => {
  expect(spanStruct).type.not.toBeCallableWith(
    { a: Schema.optionalKey(Schema.String) },
    { a: "a" },
  );
  expect(spanStruct).type.toBeCallableWith(
    { a: Schema.optionalKey(Schema.String) },
    { a: "qadi.a" },
  );
});

test("a field that could hold arbitrary data does not compile (INV-QD-044)", () => {
  expect(spanStruct).type.not.toBeCallableWith(
    { value: Schema.optionalKey(Schema.Unknown) },
    { value: "qadi.value" },
  );
  expect(spanStruct).type.not.toBeCallableWith(
    { value: Schema.optionalKey(Schema.Struct({ x: Schema.String })) },
    { value: "qadi.value" },
  );
});

type AnswerType<K extends PortName> = SpanType<PortTypes[K]["attributes"]["answer"]>;

test("every port's answer holds only span values (INV-QD-044)", () => {
  expect<AnswerType<"AttributeResolver">[keyof AnswerType<"AttributeResolver">]>().type.toBeAssignableTo<
    SpanValue | undefined
  >();
  expect<AnswerType<"DecisionHistory">[keyof AnswerType<"DecisionHistory">]>().type.toBeAssignableTo<
    SpanValue | undefined
  >();
  expect<AnswerType<"RelationshipResolver">[keyof AnswerType<"RelationshipResolver">]>().type.toBeAssignableTo<
    SpanValue | undefined
  >();
  expect<AnswerType<"CustomPredicate">[keyof AnswerType<"CustomPredicate">]>().type.toBeAssignableTo<
    SpanValue | undefined
  >();
  expect<AnswerType<"SignatureHistory">[keyof AnswerType<"SignatureHistory">]>().type.toBeAssignableTo<
    SpanValue | undefined
  >();
});

test("the attribute port's row cannot carry a value", () => {
  expect<PortSpanRowOf<DescriptionOf<"AttributeResolver">>>().type.not.toHaveProperty("value");
  expect<PortSpanRowOf<DescriptionOf<"AttributeResolver">>["resolved"]>().type.toBe<
    boolean | undefined
  >();
});

test("a narrowed field reads as its union (D-21-i)", () => {
  expect<PortSpanRowOf<DescriptionOf<"DecisionHistory">>["scope"]>().type.toBe<
    "Any" | "Resource" | undefined
  >();
});
